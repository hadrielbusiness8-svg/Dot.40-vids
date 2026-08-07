const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuid } = require('uuid');
const db = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { SHORT_MIN_SECONDS, SHORT_MAX_SECONDS, LONG_MIN_SECONDS } = require('../constants');

const router = express.Router();

const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');
const VIDEO_DIR = path.join(UPLOAD_ROOT, 'videos');
const THUMB_DIR = path.join(UPLOAD_ROOT, 'thumbnails');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'video') cb(null, VIDEO_DIR);
    else if (file.fieldname === 'thumbnail') cb(null, THUMB_DIR);
    else cb(new Error('Unexpected field'), null);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuid()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2GB cap for local disk storage
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'video' && !file.mimetype.startsWith('video/')) {
      return cb(new Error('video field must be a video file'));
    }
    if (file.fieldname === 'thumbnail' && !file.mimetype.startsWith('image/')) {
      return cb(new Error('thumbnail field must be an image file'));
    }
    cb(null, true);
  }
});

function toPublic(v, userId) {
  const owner = db.prepare('SELECT id, username, avatar_url FROM users WHERE id = ?').get(v.owner_id);
  const likeRow = db.prepare('SELECT COUNT(*) c FROM likes WHERE video_id = ? AND value = 1').get(v.id);
  const dislikeRow = db.prepare('SELECT COUNT(*) c FROM likes WHERE video_id = ? AND value = -1').get(v.id);
  let myReaction = null;
  if (userId) {
    const mine = db.prepare('SELECT value FROM likes WHERE video_id = ? AND user_id = ?').get(v.id, userId);
    if (mine) myReaction = mine.value;
  }
  return {
    id: v.id,
    title: v.title,
    description: v.description,
    thumbnailUrl: v.thumbnail_path ? `/uploads/thumbnails/${path.basename(v.thumbnail_path)}` : null,
    videoUrl: `/api/videos/${v.id}/stream`,
    durationSeconds: v.duration_seconds,
    isShort: !!v.is_short,
    views: v.views,
    visibility: v.visibility,
    createdAt: v.created_at,
    owner: owner ? { id: owner.id, username: owner.username, avatarUrl: owner.avatar_url } : null,
    likes: likeRow.c,
    dislikes: dislikeRow.c,
    myReaction
  };
}

// Upload a new video
router.post('/', requireAuth, upload.fields([{ name: 'video', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]), (req, res) => {
  const { title, description, durationSeconds, visibility } = req.body || {};
  const files = req.files || {};

  const cleanupFiles = () => {
    [files.video?.[0]?.path, files.thumbnail?.[0]?.path].filter(Boolean).forEach((p) => {
      fs.existsSync(p) && fs.unlinkSync(p);
    });
  };

  if (!title || !files.video || !files.video[0]) {
    cleanupFiles();
    return res.status(400).json({ error: 'title and a video file are required' });
  }

  const duration = durationSeconds ? Number(durationSeconds) : NaN;
  if (!duration || Number.isNaN(duration) || duration <= 0) {
    cleanupFiles();
    return res.status(400).json({ error: "Couldn't read the video's duration. Please try uploading again." });
  }
  if (duration < SHORT_MIN_SECONDS) {
    cleanupFiles();
    return res.status(400).json({ error: `Videos must be at least ${SHORT_MIN_SECONDS} seconds long.` });
  }
  if (duration > SHORT_MAX_SECONDS && duration < LONG_MIN_SECONDS) {
    cleanupFiles();
    return res.status(400).json({
      error: `Videos between ${Math.round(SHORT_MAX_SECONDS / 60)} and ${Math.round(LONG_MIN_SECONDS / 60)} minutes aren't supported. Trim it to ${Math.round(SHORT_MAX_SECONDS / 60)} minutes or under to publish as a Short, or extend it to ${Math.round(LONG_MIN_SECONDS / 60)} minutes or more for a full video.`
    });
  }
  const isShort = duration <= SHORT_MAX_SECONDS ? 1 : 0;

  const id = uuid();
  const created_at = Date.now();
  db.prepare(`INSERT INTO videos (id, owner_id, title, description, video_path, thumbnail_path, duration_seconds, views, visibility, created_at, is_short)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`).run(
    id,
    req.user.id,
    title,
    description || '',
    files.video[0].path,
    files.thumbnail && files.thumbnail[0] ? files.thumbnail[0].path : null,
    duration,
    visibility === 'unlisted' || visibility === 'private' ? visibility : 'public',
    created_at,
    isShort
  );
  const v = db.prepare('SELECT * FROM videos WHERE id = ?').get(id);

  if (v.visibility === 'public') {
    const subscribers = db.prepare('SELECT subscriber_id FROM subscriptions WHERE channel_id = ?').all(req.user.id);
    const insertNotif = db.prepare(`INSERT INTO notifications (id, user_id, channel_id, video_id, created_at, read)
      VALUES (?, ?, ?, ?, ?, 0)`);
    const now = Date.now();
    const insertMany = db.transaction((subs) => {
      for (const s of subs) insertNotif.run(uuid(), s.subscriber_id, req.user.id, v.id, now);
    });
    insertMany(subscribers);
  }

  res.status(201).json({ video: toPublic(v, req.user.id) });
});

// Home feed (long-form videos only — Shorts have their own feed)
router.get('/', optionalAuth, (req, res) => {
  const q = (req.query.q || '').trim();
  let rows;
  if (q) {
    rows = db.prepare(`SELECT * FROM videos WHERE visibility = 'public' AND is_short = 0 AND (title LIKE ? OR description LIKE ?) ORDER BY created_at DESC LIMIT 60`)
      .all(`%${q}%`, `%${q}%`);
  } else {
    rows = db.prepare(`SELECT * FROM videos WHERE visibility = 'public' AND is_short = 0 ORDER BY created_at DESC LIMIT 60`).all();
  }
  res.json({ videos: rows.map(v => toPublic(v, req.user && req.user.id)) });
});

// Shorts feed — must be defined before GET /:id so 'shorts' isn't captured as an id
router.get('/shorts/feed', optionalAuth, (req, res) => {
  const rows = db.prepare(`SELECT * FROM videos WHERE visibility = 'public' AND is_short = 1 ORDER BY created_at DESC LIMIT 60`).all();
  res.json({ videos: rows.map(v => toPublic(v, req.user && req.user.id)) });
});

// Single video metadata (also logs watch history for signed-in users).
// Views are NOT incremented here — see POST /:id/view, which only fires
// once the viewer has actually watched enough of the video.
router.get('/:id', optionalAuth, (req, res) => {
  const v = db.prepare('SELECT * FROM videos WHERE id = ?').get(req.params.id);
  if (!v) return res.status(404).json({ error: 'Video not found' });
  if (req.user) {
    db.prepare(`INSERT INTO watch_history (user_id, video_id, watched_at) VALUES (?, ?, ?)
      ON CONFLICT(user_id, video_id) DO UPDATE SET watched_at = excluded.watched_at`)
      .run(req.user.id, v.id, Date.now());
  }
  res.json({ video: toPublic(v, req.user && req.user.id) });
});

// Register a real view. Called by the frontend once the viewer has watched
// past the minimum threshold (30s for Shorts, 2min for long videos) —
// never just from loading the page. One increment per call; the frontend
// is responsible for only calling this once per watch session.
router.post('/:id/view', optionalAuth, (req, res) => {
  const v = db.prepare('SELECT id FROM videos WHERE id = ?').get(req.params.id);
  if (!v) return res.status(404).json({ error: 'Video not found' });
  db.prepare('UPDATE videos SET views = views + 1 WHERE id = ?').run(v.id);
  res.json({ ok: true });
});

// Stream video with HTTP range support (required for video scrubbing/seeking)
router.get('/:id/stream', (req, res) => {
  const v = db.prepare('SELECT * FROM videos WHERE id = ?').get(req.params.id);
  if (!v || !fs.existsSync(v.video_path)) return res.status(404).end();

  const stat = fs.statSync(v.video_path);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;
    const stream = fs.createReadStream(v.video_path, { start, end });
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'video/mp4'
    });
    stream.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4'
    });
    fs.createReadStream(v.video_path).pipe(res);
  }
});

// Like / dislike
router.post('/:id/react', requireAuth, (req, res) => {
  const { value } = req.body || {}; // 1, -1, or 0 to clear
  const v = db.prepare('SELECT * FROM videos WHERE id = ?').get(req.params.id);
  if (!v) return res.status(404).json({ error: 'Video not found' });
  if (value === 0) {
    db.prepare('DELETE FROM likes WHERE video_id = ? AND user_id = ?').run(v.id, req.user.id);
  } else if (value === 1 || value === -1) {
    db.prepare(`INSERT INTO likes (video_id, user_id, value) VALUES (?, ?, ?)
      ON CONFLICT(video_id, user_id) DO UPDATE SET value = excluded.value`).run(v.id, req.user.id, value);
  } else {
    return res.status(400).json({ error: 'value must be 1, -1, or 0' });
  }
  const fresh = db.prepare('SELECT * FROM videos WHERE id = ?').get(v.id);
  res.json({ video: toPublic(fresh, req.user.id) });
});

// Comments
router.get('/:id/comments', (req, res) => {
  const rows = db.prepare(`SELECT c.*, u.username, u.avatar_url FROM comments c
    JOIN users u ON u.id = c.user_id WHERE c.video_id = ? ORDER BY c.created_at DESC`).all(req.params.id);
  res.json({ comments: rows.map(r => ({
    id: r.id, body: r.body, createdAt: r.created_at,
    user: { id: r.user_id, username: r.username, avatarUrl: r.avatar_url }
  })) });
});

router.post('/:id/comments', requireAuth, (req, res) => {
  const { body } = req.body || {};
  if (!body || !body.trim()) return res.status(400).json({ error: 'Comment body is required' });
  const v = db.prepare('SELECT id FROM videos WHERE id = ?').get(req.params.id);
  if (!v) return res.status(404).json({ error: 'Video not found' });
  const id = uuid();
  const created_at = Date.now();
  db.prepare('INSERT INTO comments (id, video_id, user_id, body, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, req.params.id, req.user.id, body.trim(), created_at);
  const user = db.prepare('SELECT username, avatar_url FROM users WHERE id = ?').get(req.user.id);
  res.status(201).json({ comment: { id, body: body.trim(), createdAt: created_at, user: { id: req.user.id, username: user.username, avatarUrl: user.avatar_url } } });
});

router.delete('/:id', requireAuth, (req, res) => {
  const v = db.prepare('SELECT * FROM videos WHERE id = ?').get(req.params.id);
  if (!v) return res.status(404).json({ error: 'Video not found' });
  if (v.owner_id !== req.user.id) return res.status(403).json({ error: 'Not your video' });
  db.prepare('DELETE FROM videos WHERE id = ?').run(v.id);
  [v.video_path, v.thumbnail_path].filter(Boolean).forEach(p => {
    fs.existsSync(p) && fs.unlinkSync(p);
  });
  res.json({ ok: true });
});

module.exports = router;
