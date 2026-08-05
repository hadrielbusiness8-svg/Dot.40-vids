const express = require('express');
const path = require('path');
const { v4: uuid } = require('uuid');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function toPublicVideo(v) {
  const owner = db.prepare('SELECT id, username, avatar_url FROM users WHERE id = ?').get(v.owner_id);
  return {
    id: v.id,
    title: v.title,
    thumbnailUrl: v.thumbnail_path ? `/uploads/thumbnails/${path.basename(v.thumbnail_path)}` : null,
    videoUrl: `/api/videos/${v.id}/stream`,
    durationSeconds: v.duration_seconds,
    isShort: !!v.is_short,
    views: v.views,
    createdAt: v.created_at,
    owner: owner ? { id: owner.id, username: owner.username, avatarUrl: owner.avatar_url } : null
  };
}

function getOrCreateWatchLater(userId) {
  let wl = db.prepare('SELECT * FROM playlists WHERE owner_id = ? AND is_watch_later = 1').get(userId);
  if (!wl) {
    const id = uuid();
    db.prepare('INSERT INTO playlists (id, owner_id, name, is_watch_later, created_at) VALUES (?, ?, ?, 1, ?)')
      .run(id, userId, 'Watch Later', Date.now());
    wl = db.prepare('SELECT * FROM playlists WHERE id = ?').get(id);
  }
  return wl;
}

function playlistSummary(p) {
  const count = db.prepare('SELECT COUNT(*) c FROM playlist_items WHERE playlist_id = ?').get(p.id).c;
  return { id: p.id, name: p.name, isWatchLater: !!p.is_watch_later, videoCount: count, createdAt: p.created_at };
}

// List my playlists (ensures Watch Later exists and appears first)
router.get('/', requireAuth, (req, res) => {
  getOrCreateWatchLater(req.user.id);
  const rows = db.prepare('SELECT * FROM playlists WHERE owner_id = ? ORDER BY is_watch_later DESC, created_at DESC').all(req.user.id);
  res.json({ playlists: rows.map(playlistSummary) });
});

router.post('/', requireAuth, (req, res) => {
  const { name } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: 'Playlist name is required' });
  const id = uuid();
  db.prepare('INSERT INTO playlists (id, owner_id, name, is_watch_later, created_at) VALUES (?, ?, ?, 0, ?)')
    .run(id, req.user.id, name.trim(), Date.now());
  const p = db.prepare('SELECT * FROM playlists WHERE id = ?').get(id);
  res.status(201).json({ playlist: playlistSummary(p) });
});

router.get('/:id', requireAuth, (req, res) => {
  const p = db.prepare('SELECT * FROM playlists WHERE id = ?').get(req.params.id);
  if (!p || p.owner_id !== req.user.id) return res.status(404).json({ error: 'Playlist not found' });
  const videos = db.prepare(`
    SELECT v.*, pi.added_at FROM playlist_items pi
    JOIN videos v ON v.id = pi.video_id
    WHERE pi.playlist_id = ?
    ORDER BY pi.added_at DESC
  `).all(p.id);
  res.json({ playlist: playlistSummary(p), videos: videos.map(v => ({ ...toPublicVideo(v), addedAt: v.added_at })) });
});

router.delete('/:id', requireAuth, (req, res) => {
  const p = db.prepare('SELECT * FROM playlists WHERE id = ?').get(req.params.id);
  if (!p || p.owner_id !== req.user.id) return res.status(404).json({ error: 'Playlist not found' });
  if (p.is_watch_later) return res.status(400).json({ error: "Watch Later can't be deleted" });
  db.prepare('DELETE FROM playlists WHERE id = ?').run(p.id);
  res.json({ ok: true });
});

router.post('/:id/items', requireAuth, (req, res) => {
  const { videoId } = req.body || {};
  const p = db.prepare('SELECT * FROM playlists WHERE id = ?').get(req.params.id);
  if (!p || p.owner_id !== req.user.id) return res.status(404).json({ error: 'Playlist not found' });
  const v = db.prepare('SELECT id FROM videos WHERE id = ?').get(videoId);
  if (!v) return res.status(404).json({ error: 'Video not found' });
  db.prepare('INSERT OR IGNORE INTO playlist_items (playlist_id, video_id, added_at) VALUES (?, ?, ?)')
    .run(p.id, videoId, Date.now());
  res.status(201).json({ ok: true });
});

router.delete('/:id/items/:videoId', requireAuth, (req, res) => {
  const p = db.prepare('SELECT * FROM playlists WHERE id = ?').get(req.params.id);
  if (!p || p.owner_id !== req.user.id) return res.status(404).json({ error: 'Playlist not found' });
  db.prepare('DELETE FROM playlist_items WHERE playlist_id = ? AND video_id = ?').run(p.id, req.params.videoId);
  res.json({ ok: true });
});

// Convenience: add/remove a video from Watch Later, and check whether it's saved there
router.post('/watch-later/toggle', requireAuth, (req, res) => {
  const { videoId } = req.body || {};
  const v = db.prepare('SELECT id FROM videos WHERE id = ?').get(videoId);
  if (!v) return res.status(404).json({ error: 'Video not found' });
  const wl = getOrCreateWatchLater(req.user.id);
  const existing = db.prepare('SELECT 1 FROM playlist_items WHERE playlist_id = ? AND video_id = ?').get(wl.id, videoId);
  if (existing) {
    db.prepare('DELETE FROM playlist_items WHERE playlist_id = ? AND video_id = ?').run(wl.id, videoId);
    return res.json({ saved: false });
  }
  db.prepare('INSERT INTO playlist_items (playlist_id, video_id, added_at) VALUES (?, ?, ?)').run(wl.id, videoId, Date.now());
  res.json({ saved: true });
});

module.exports = router;
