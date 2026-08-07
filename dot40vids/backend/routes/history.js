const express = require('express');
const path = require('path');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function toPublic(v) {
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

router.get('/', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT v.*, h.watched_at FROM watch_history h
    JOIN videos v ON v.id = h.video_id
    WHERE h.user_id = ?
    ORDER BY h.watched_at DESC
    LIMIT 200
  `).all(req.user.id);
  res.json({ history: rows.map(r => ({ ...toPublic(r), watchedAt: r.watched_at })) });
});

router.delete('/', requireAuth, (req, res) => {
  db.prepare('DELETE FROM watch_history WHERE user_id = ?').run(req.user.id);
  res.json({ ok: true });
});

router.delete('/:videoId', requireAuth, (req, res) => {
  db.prepare('DELETE FROM watch_history WHERE user_id = ? AND video_id = ?').run(req.user.id, req.params.videoId);
  res.json({ ok: true });
});

module.exports = router;
