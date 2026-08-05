import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import { initials } from '../lib/format';
import VideoCard from '../components/VideoCard';

export default function Channel() {
  const { username } = useParams();
  const { user } = useAuth();
  const [channel, setChannel] = useState(null);
  const [videos, setVideos] = useState([]);
  const [shorts, setShorts] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.channel(username)
      .then(({ channel, videos, shorts }) => { setChannel(channel); setVideos(videos); setShorts(shorts || []); })
      .catch((e) => setError(e.message));
  }, [username]);

  useEffect(() => { load(); }, [load]);

  const toggleSubscribe = async () => {
    setBusy(true);
    try {
      const res = channel.isSubscribed ? await api.unsubscribe(username) : await api.subscribe(username);
      setChannel((c) => ({ ...c, isSubscribed: res.subscribed, subscriberCount: res.subscriberCount }));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (error) return <div className="empty-state">{error}</div>;
  if (!channel) return <div className="skeleton" style={{ height: 100 }} />;

  const isOwnChannel = user?.username === channel.username;

  return (
    <div>
      <div className="channel-header">
        <div className="avatar">{initials(channel.username)}</div>
        <div style={{ flex: 1 }}>
          <h1>{channel.username}</h1>
          <div className="channel-meta">{channel.subscriberCount} subscriber{channel.subscriberCount === 1 ? '' : 's'} · {videos.length + shorts.length} video{videos.length + shorts.length === 1 ? '' : 's'}</div>
          {channel.bio && <p style={{ color: 'var(--text-muted)', marginTop: 8, fontSize: '0.9rem' }}>{channel.bio}</p>}
        </div>
        {!isOwnChannel && user && (
          <button className={`btn ${channel.isSubscribed ? 'btn-ghost' : 'btn-accent'}`} onClick={toggleSubscribe} disabled={busy}>
            {channel.isSubscribed ? 'Subscribed' : 'Subscribe'}
          </button>
        )}
      </div>

      {shorts.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', marginBottom: 12 }}>Shorts</h3>
          <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 6 }}>
            {shorts.map((s) => (
              <Link key={s.id} to={`/watch/${s.id}`} style={{ flexShrink: 0, width: 140 }}>
                <div className="thumb-wrap" style={{ aspectRatio: '9/16' }}>
                  {s.thumbnailUrl ? <img src={s.thumbnailUrl} alt={s.title} /> : <div className="thumb-fallback"><span className="dot" /></div>}
                </div>
                <div className="video-title" style={{ fontSize: '0.8rem', marginTop: 6 }}>{s.title}</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {videos.length === 0 ? (
        <div className="empty-state">
          <span className="dot" />
          <p>{isOwnChannel ? "You haven't uploaded any full-length videos yet." : `${channel.username} hasn't posted any public videos yet.`}</p>
        </div>
      ) : (
        <div className="video-grid">
          {videos.map((v) => <VideoCard key={v.id} video={{ ...v, owner: channel }} size="compact" />)}
        </div>
      )}
    </div>
  );
}
