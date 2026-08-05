import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import VideoCard from '../components/VideoCard';

export default function Home() {
  const [videos, setVideos] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.feed().then(({ videos }) => setVideos(videos)).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="empty-state">{error}</div>;
  if (!videos) {
    return (
      <div className="video-grid">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ aspectRatio: '16/9' }} />
        ))}
      </div>
    );
  }
  if (videos.length === 0) {
    return (
      <div className="empty-state">
        <span className="dot dot-pulse" />
        <p>Nothing's been posted yet. Be the first to upload a video.</p>
      </div>
    );
  }

  return (
    <div className="video-grid">
      {videos.map((v) => <VideoCard key={v.id} video={v} />)}
    </div>
  );
}
