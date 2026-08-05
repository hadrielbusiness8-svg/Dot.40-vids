const express = require('express');
const path = require('path');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT n.*, v.title as video_title, v.thumbnail_path, u.username as channel_username
    FROM notifications n
    JOIN videos v ON v.id = n.video_id
    JOIN users u ON u.id = n.channel_id
    WHERE n.user_id = ?
    ORDER BY n.created_at DESC
    LIMIT 50
  `).all(req.user.id);
  res.json({
    notifications: rows.map(r => ({
      id: r.id,
      read: !!r.read,
      createdAt: r.created_at,
      videoId: r.video_id,
      videoTitle: r.video_title,
      thumbnailUrl: r.thumbnail_path ? `/uploads/thumbnails/${path.basename(r.thumbnail_path)}` : null,
      channelUsername: r.channel_username
    }))
  });
});

router.get('/unread-count', requireAuth, (req, res) => {
  const { c } = db.prepare('SELECT COUNT(*) c FROM notifications WHERE user_id = ? AND read = 0').get(req.user.id);
  res.json({ count: c });
});

router.post('/:id/read', requireAuth, (req, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});

router.post('/read-all', requireAuth, (req, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ ok: true });
});

module.exports = router;
