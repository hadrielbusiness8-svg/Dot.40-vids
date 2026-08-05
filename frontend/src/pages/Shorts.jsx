import { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import { formatViews, initials } from '../lib/format';

function ShortItem({ short, onReact }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    const video = videoRef.current;
    if (!el || !video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().then(() => setPlaying(true)).catch(() => {});
        } else {
          video.pause();
          setPlaying(false);
        }
      },
      { threshold: 0.6 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) { video.play(); setPlaying(true); } else { video.pause(); setPlaying(false); }
  };

  return (
    <div ref={containerRef} className="short-item">
      <video
        ref={videoRef}
        src={short.videoUrl}
        loop
        muted={muted}
        playsInline
        onClick={togglePlay}
        className="short-video"
      />
      <button className="short-mute-btn" onClick={() => setMuted((m) => !m)}>
        {muted ? '🔇' : '🔊'}
      </button>
      {!playing && (
        <div className="short-play-overlay" onClick={togglePlay}>▶</div>
      )}
      <div className="short-info">
        <Link to={`/channel/${short.owner?.username}`} className="short-channel">
          <span className="avatar" style={{ width: 30, height: 30 }}>{initials(short.owner?.username)}</span>
          {short.owner?.username}
        </Link>
        <div className="short-title">{short.title}</div>
        <div className="short-stats">{formatViews(short.views)}</div>
      </div>
      <div className="short-actions">
        <button
          className={`short-action-btn ${short.myReaction === 1 ? 'active' : ''}`}
          onClick={() => onReact(short.id, short.myReaction === 1 ? 0 : 1)}
        >
          ▲<span>{short.likes}</span>
        </button>
        <button
          className={`short-action-btn ${short.myReaction === -1 ? 'active' : ''}`}
          onClick={() => onReact(short.id, short.myReaction === -1 ? 0 : -1)}
        >
          ▼
        </button>
        <Link to={`/watch/${short.id}`} className="short-action-btn" title="Comments & full view">💬</Link>
      </div>
    </div>
  );
}

export default function Shorts() {
  const [shorts, setShorts] = useState(null);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.shortsFeed().then(({ videos }) => setShorts(videos)).catch((e) => setError(e.message));
  }, []);

  const onReact = useCallback(async (id, value) => {
    if (!user) return navigate('/login');
    setShorts((list) => list.map((s) => (s.id === id ? { ...s, myReaction: value } : s)));
    try {
      const { video } = await api.react(id, value);
      setShorts((list) => list.map((s) => (s.id === id ? video : s)));
    } catch { /* keep optimistic state on failure */ }
  }, [user, navigate]);

  if (error) return <div className="empty-state">{error}</div>;
  if (!shorts) return <div className="skeleton" style={{ height: 500, maxWidth: 400, margin: '0 auto' }} />;
  if (shorts.length === 0) {
    return (
      <div className="empty-state">
        <span className="dot dot-pulse" />
        <p>No Shorts yet. Upload a video under 2 minutes to publish one.</p>
      </div>
    );
  }

  return (
    <div className="shorts-container">
      {shorts.map((s) => <ShortItem key={s.id} short={s} onReact={onReact} />)}
    </div>
  );
}
