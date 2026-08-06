import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { mediaUrl } from '../lib/api';
import { formatDuration, formatViews, timeAgo } from '../lib/format';

export default function History() {
  const [history, setHistory] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.history().then(({ history }) => setHistory(history)).catch((e) => setError(e.message));
  }, []);

  const removeOne = async (videoId) => {
    setHistory((h) => h.filter((v) => v.id !== videoId));
    try { await api.removeHistoryItem(videoId); } catch { /* leave it removed locally either way */ }
  };

  const clearAll = async () => {
    if (!confirm('Clear your entire watch history?')) return;
    setHistory([]);
    try { await api.clearHistory(); } catch { /* already cleared locally */ }
  };

  if (error) return <div className="empty-state">{error}</div>;
  if (!history) return <div className="skeleton" style={{ height: 200 }} />;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--font-display)' }}>Watch history</h2>
        {history.length > 0 && (
          <button className="btn btn-ghost" onClick={clearAll}>Clear all</button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="empty-state">
          <span className="dot" />
          <p>Videos you watch will show up here.</p>
        </div>
      ) : (
        <div>
          {history.map((v) => (
            <div key={v.id} className="comment" style={{ alignItems: 'flex-start' }}>
              <Link to={`/watch/${v.id}`} style={{ width: 200, flexShrink: 0 }}>
                <div className="thumb-wrap">
                  {v.thumbnailUrl ? <img src={mediaUrl(v.thumbnailUrl)} alt={v.title} /> : <div className="thumb-fallback"><span className="dot" /></div>}
                  <span className="duration-badge">{formatDuration(v.durationSeconds)}</span>
                </div>
              </Link>
              <div style={{ flex: 1 }}>
                <Link to={`/watch/${v.id}`} className="video-title" style={{ display: 'block' }}>{v.title}</Link>
                <div className="video-sub">{v.owner?.username}</div>
                <div className="video-stats">{formatViews(v.views)} · watched {timeAgo(v.watchedAt)}</div>
              </div>
              <button className="btn btn-ghost" onClick={() => removeOne(v.id)}>Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
