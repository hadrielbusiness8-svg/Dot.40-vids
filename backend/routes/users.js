const express = require('express');
const db = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const path = require('path');

const router = express.Router();

function toPublicVideo(v) {
  return {
    id: v.id,
    title: v.title,
    thumbnailUrl: v.thumbnail_path ? `/uploads/thumbnails/${path.basename(v.thumbnail_path)}` : null,
    videoUrl: `/api/videos/${v.id}/stream`,
    durationSeconds: v.duration_seconds,
    isShort: !!v.is_short,
    views: v.views,
    createdAt: v.created_at
  };
}

// Channel page: user info + their public videos (split into long-form and Shorts) + subscriber count
router.get('/:username', optionalAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(req.params.username);
  if (!user) return res.status(404).json({ error: 'Channel not found' });
  const allVideos = db.prepare(`SELECT * FROM videos WHERE owner_id = ? AND visibility = 'public' ORDER BY created_at DESC`).all(user.id);
  const videos = allVideos.filter((v) => !v.is_short).map(toPublicVideo);
  const shorts = allVideos.filter((v) => v.is_short).map(toPublicVideo);
  const subCount = db.prepare('SELECT COUNT(*) c FROM subscriptions WHERE channel_id = ?').get(user.id).c;
  let isSubscribed = false;
  if (req.user) {
    isSubscribed = !!db.prepare('SELECT 1 FROM subscriptions WHERE subscriber_id = ? AND channel_id = ?').get(req.user.id, user.id);
  }
  res.json({
    channel: {
      id: user.id, username: user.username, avatarUrl: user.avatar_url, bio: user.bio,
      createdAt: user.created_at, subscriberCount: subCount, isSubscribed
    },
    videos,
    shorts
  });
});

router.post('/:username/subscribe', requireAuth, (req, res) => {
  const channel = db.prepare('SELECT * FROM users WHERE username = ?').get(req.params.username);
  if (!channel) return res.status(404).json({ error: 'Channel not found' });
  if (channel.id === req.user.id) return res.status(400).json({ error: "You can't subscribe to yourself" });
  db.prepare('INSERT OR IGNORE INTO subscriptions (subscriber_id, channel_id, created_at) VALUES (?, ?, ?)')
    .run(req.user.id, channel.id, Date.now());
  const subCount = db.prepare('SELECT COUNT(*) c FROM subscriptions WHERE channel_id = ?').get(channel.id).c;
  res.json({ subscribed: true, subscriberCount: subCount });
});

router.delete('/:username/subscribe', requireAuth, (req, res) => {
  const channel = db.prepare('SELECT * FROM users WHERE username = ?').get(req.params.username);
  if (!channel) return res.status(404).json({ error: 'Channel not found' });
  db.prepare('DELETE FROM subscriptions WHERE subscriber_id = ? AND channel_id = ?').run(req.user.id, channel.id);
  const subCount = db.prepare('SELECT COUNT(*) c FROM subscriptions WHERE channel_id = ?').get(channel.id).c;
  res.json({ subscribed: false, subscriberCount: subCount });
});

module.exports = router;
