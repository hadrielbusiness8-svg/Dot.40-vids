const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'dot40vids.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT DEFAULT '',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  video_path TEXT NOT NULL,
  thumbnail_path TEXT,
  duration_seconds REAL DEFAULT 0,
  views INTEGER DEFAULT 0,
  visibility TEXT DEFAULT 'public',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS likes (
  video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  value INTEGER NOT NULL, -- 1 = like, -1 = dislike
  PRIMARY KEY (video_id, user_id)
);

CREATE TABLE IF NOT EXISTS subscriptions (
  subscriber_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (subscriber_id, channel_id)
);

CREATE TABLE IF NOT EXISTS watch_history (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  watched_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, video_id)
);
CREATE INDEX IF NOT EXISTS idx_history_user ON watch_history(user_id, watched_at DESC);

CREATE TABLE IF NOT EXISTS playlists (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_watch_later INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS playlist_items (
  playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  added_at INTEGER NOT NULL,
  PRIMARY KEY (playlist_id, video_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  read INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, created_at DESC);
`);

// Migration: add is_short to videos if this db predates the Shorts feature
const videoCols = db.prepare("PRAGMA table_info(videos)").all().map((c) => c.name);
if (!videoCols.includes('is_short')) {
  db.exec('ALTER TABLE videos ADD COLUMN is_short INTEGER DEFAULT 0');
}

module.exports = db;
