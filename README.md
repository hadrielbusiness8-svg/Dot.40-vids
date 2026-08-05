# Dot.40 vids

A YouTube-style video sharing app: accounts, video upload & streaming, likes,
comments, subscriptions, search, and channel pages.

- `backend/` — Node.js/Express API, SQLite database, JWT auth, video upload & streaming
- `frontend/` — React (Vite) single-page app

This is a real, working full stack app that runs on your machine. It uses
local disk storage and SQLite so it works out of the box with no cloud
accounts required. See **Going to production** below for what to swap in
before you put this in front of real users.

## 1. Run the backend

```bash
cd backend
npm install
cp .env.example .env      # then edit JWT_SECRET to a long random string
npm run dev
```

The API runs at `http://localhost:4000`. It creates `dot40vids.db`
(SQLite) and an `uploads/` folder automatically on first run.

## 2. Run the frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The dev server proxies `/api` and `/uploads`
requests to the backend on port 4000, so both must be running.

## 3. Try it out

1. Sign up for an account.
2. Click **Upload**, choose a short video file (and optionally a thumbnail
   image), give it a title, and publish.
3. It appears on the home feed and your channel page. Watch it, like it,
   comment on it, and try subscribing from a second account.

## What's included

- Email/username + password auth (bcrypt hashing, JWT sessions)
- Video upload with a title, description, thumbnail, and visibility
  (public / unlisted / private)
- Video streaming with HTTP range support (so seeking/scrubbing works)
- Home feed, search, per-video watch page, per-channel page
- Likes/dislikes, comments, subscribe/unsubscribe with subscriber counts
- **Subscriptions feed** (`/subscriptions`) — videos from channels you follow
- **Watch history** (`/history`) — auto-logged as you watch, removable per-video or in bulk
- **Playlists** (`/playlists`) — create custom playlists, plus an automatic
  "Watch Later" playlist; save videos to any playlist from the watch page
  (the "+ Save" button next to like/dislike)
- **Notifications** — the bell icon in the navbar shows an unread badge and
  a dropdown of new uploads from channels you're subscribed to; polls every
  30s while the app is open
- **Shorts** — vertical, swipeable short-form feed at `/shorts`, separate
  from the main home feed. Videos are auto-classified by duration at
  upload time:
  - **10 sec – 2 min** → publishes as a Short
  - **3 min or more** → publishes as a regular video
  - **2–3 min** → rejected at upload, with a message telling the uploader
    to trim or extend it (this range doesn't fit either category)
  These thresholds live in `backend/constants.js` if you want to change
  them.
- Responsive UI down to mobile widths

## What's *not* included (by design, for a first pass)

- Video transcoding / multiple resolutions (uploads are served as-is)
- Cloud file storage (videos are saved to local disk in `backend/uploads/`)
- Email verification / password reset
- Recommendation ranking (the "up next" list is just recent videos)
- Admin/moderation tools

## Going to production

Before putting this in front of real users, you'll want to:

1. **Storage**: swap local disk storage for an object store (e.g. S3 or
   Cloudflare R2) and serve videos through a CDN instead of Express. The
   upload code lives in `backend/routes/videos.js` — the `multer.diskStorage`
   config is the piece to replace.
2. **Database**: swap SQLite for Postgres/MySQL if you expect concurrent
   writes at scale. The schema in `backend/db.js` is plain SQL and ports
   over with minor syntax changes.
3. **Transcoding**: run uploads through something like ffmpeg (or a managed
   service) to produce adaptive-bitrate renditions (HLS/DASH) rather than
   serving the raw upload.
4. **Secrets**: set a strong, unique `JWT_SECRET` in `backend/.env` and
   never commit it.
5. **Hosting**: deploy the backend (e.g. Render, Fly.io, a VPS) and the
   frontend build (`npm run build` in `frontend/`, then serve `dist/` from
   a static host or CDN like Vercel/Netlify), pointing the frontend at your
   backend's real URL instead of the Vite dev proxy.

## Tech stack

Backend: Express, better-sqlite3, jsonwebtoken, bcryptjs, multer.
Frontend: React, React Router, Vite — no CSS framework, hand-written design
system in `frontend/src/styles.css`.
