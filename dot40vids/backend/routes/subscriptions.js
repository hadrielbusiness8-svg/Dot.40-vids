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

// Videos from channels the current user is subscribed to (long-form only — Shorts have their own feed)
router.get('/feed', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT v.* FROM videos v
    JOIN subscriptions s ON s.channel_id = v.owner_id
    WHERE s.subscriber_id = ? AND v.visibility = 'public' AND v.is_short = 0
    ORDER BY v.created_at DESC
    LIMIT 100
  `).all(req.user.id);
  res.json({ videos: rows.map(toPublic) });
});

// Channels the current user is subscribed to
router.get('/channels', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT u.id, u.username, u.avatar_url,
      (SELECT COUNT(*) FROM subscriptions s2 WHERE s2.channel_id = u.id) as subscriber_count
    FROM subscriptions s
    JOIN users u ON u.id = s.channel_id
    WHERE s.subscriber_id = ?
    ORDER BY s.created_at DESC
  `).all(req.user.id);
  res.json({ channels: rows.map(r => ({ id: r.id, username: r.username, avatarUrl: r.avatar_url, subscriberCount: r.subscriber_count })) });
});

module.exports = router;
