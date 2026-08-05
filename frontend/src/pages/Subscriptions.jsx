import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import VideoCard from '../components/VideoCard';

export default function Subscriptions() {
  const [videos, setVideos] = useState(null);
  const [channels, setChannels] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.subscriptionsFeed().then(({ videos }) => setVideos(videos)).catch((e) => setError(e.message));
    api.subscribedChannels().then(({ channels }) => setChannels(channels)).catch(() => {});
  }, []);

  if (error) return <div className="empty-state">{error}</div>;

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: 6 }}>Subscriptions</h2>
      {channels.length > 0 && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 20 }}>
          Following {channels.map((c) => c.username).join(', ')}
        </p>
      )}

      {!videos ? (
        <div className="video-grid">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" style={{ aspectRatio: '16/9' }} />)}
        </div>
      ) : videos.length === 0 ? (
        <div className="empty-state">
          <span className="dot" />
          <p>{channels.length === 0
            ? "You're not subscribed to any channels yet."
            : "No new videos from channels you follow yet."}</p>
        </div>
      ) : (
        <div className="video-grid">
          {videos.map((v) => <VideoCard key={v.id} video={v} />)}
        </div>
      )}
    </div>
  );
}
