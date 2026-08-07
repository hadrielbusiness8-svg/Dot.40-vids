require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const videoRoutes = require('./routes/videos');
const userRoutes = require('./routes/users');
const subscriptionRoutes = require('./routes/subscriptions');
const historyRoutes = require('./routes/history');
const playlistRoutes = require('./routes/playlists');
const notificationRoutes = require('./routes/notifications');

const app = express();
const PORT = process.env.PORT || 4000;

// Make sure the upload directories exist before anything tries to write to
// them — empty folders don't survive git/GitHub uploads, so we can't rely
// on them already being there in a fresh deploy.
for (const dir of ['uploads/videos', 'uploads/thumbnails', 'uploads/avatars']) {
  fs.mkdirSync(path.join(__dirname, dir), { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API responses should never be cached — caching auth/session endpoints in
// particular can serve stale 304s that break login state.
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/users', userRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true, name: 'Dot.40 vids API' }));

// Basic error handler (e.g. multer file-size errors)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

app.listen(PORT, () => {
  console.log(`Dot.40 vids API listening on http://localhost:${PORT}`);
});
