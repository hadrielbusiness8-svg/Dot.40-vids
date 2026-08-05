import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { formatDuration, formatViews } from '../lib/format';

export default function PlaylistDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState(null);
  const [videos, setVideos] = useState([]);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api.playlist(id).then(({ playlist, videos }) => { setPlaylist(playlist); setVideos(videos); }).catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const removeVideo = async (videoId) => {
    setVideos((v) => v.filter((x) => x.id !== videoId));
    try { await api.removeFromPlaylist(id, videoId); } catch { /* already removed locally */ }
  };

  const removePlaylist = async () => {
    if (!confirm(`Delete "${playlist.name}"? This can't be undone.`)) return;
    try {
      await api.deletePlaylist(id);
      navigate('/playlists');
    } catch (e) {
      setError(e.message);
    }
  };

  if (error) return <div className="empty-state">{error}</div>;
  if (!playlist) return <div className="skeleton" style={{ height: 200 }} />;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)' }}>{playlist.name}</h2>
          <div className="video-stats">{videos.length} video{videos.length === 1 ? '' : 's'}</div>
        </div>
        {!playlist.isWatchLater && (
          <button className="btn btn-danger" onClick={removePlaylist}>Delete playlist</button>
        )}
      </div>

      {videos.length === 0 ? (
        <div className="empty-state">
          <span className="dot" />
          <p>No videos here yet. Save videos to this playlist from their watch page.</p>
        </div>
      ) : (
        <div>
          {videos.map((v) => (
            <div key={v.id} className="comment" style={{ alignItems: 'flex-start' }}>
              <Link to={`/watch/${v.id}`} style={{ width: 200, flexShrink: 0 }}>
                <div className="thumb-wrap">
                  {v.thumbnailUrl ? <img src={v.thumbnailUrl} alt={v.title} /> : <div className="thumb-fallback"><span className="dot" /></div>}
                  <span className="duration-badge">{formatDuration(v.durationSeconds)}</span>
                </div>
              </Link>
              <div style={{ flex: 1 }}>
                <Link to={`/watch/${v.id}`} className="video-title" style={{ display: 'block' }}>{v.title}</Link>
                <div className="video-sub">{v.owner?.username}</div>
                <div className="video-stats">{formatViews(v.views)}</div>
              </div>
              <button className="btn btn-ghost" onClick={() => removeVideo(v.id)}>Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
