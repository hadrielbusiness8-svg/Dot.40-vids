import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import VideoCard from '../components/VideoCard';

export default function Search() {
  const [params] = useSearchParams();
  const q = params.get('q') || '';
  const [videos, setVideos] = useState(null);

  useEffect(() => {
    setVideos(null);
    api.feed(q).then(({ videos }) => setVideos(videos)).catch(() => setVideos([]));
  }, [q]);

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: 18 }}>
        Results for <span style={{ color: 'var(--accent)' }}>"{q}"</span>
      </h2>
      {!videos ? (
        <div className="video-grid">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" style={{ aspectRatio: '16/9' }} />)}
        </div>
      ) : videos.length === 0 ? (
        <div className="empty-state">No videos match that search.</div>
      ) : (
        <div className="video-grid">
          {videos.map((v) => <VideoCard key={v.id} video={v} />)}
        </div>
      )}
    </div>
  );
}
