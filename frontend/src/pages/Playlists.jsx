import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export default function Playlists() {
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState(null);
  const [error, setError] = useState('');
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const load = () => api.playlists().then(({ playlists }) => setPlaylists(playlists)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const createOne = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { playlist } = await api.createPlaylist(newName.trim());
      setNewName('');
      navigate(`/playlists/${playlist.id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  if (error) return <div className="empty-state">{error}</div>;
  if (!playlists) return <div className="skeleton" style={{ height: 200 }} />;

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: 18 }}>Library</h2>

      <form onSubmit={createOne} style={{ display: 'flex', gap: 10, marginBottom: 24, maxWidth: 420 }}>
        <input
          className="field"
          style={{ flex: 1, background: 'var(--bg-inset)', border: '1px solid var(--border-soft)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: 'var(--radius-md)', fontSize: '0.9rem' }}
          placeholder="New playlist name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button className="btn btn-accent" disabled={creating}>Create</button>
      </form>

      <div className="video-grid">
        {playlists.map((p) => (
          <Link key={p.id} to={`/playlists/${p.id}`} className="video-card">
            <div className="thumb-wrap">
              <div className="thumb-fallback">
                {p.isWatchLater ? '⏱' : <span className="dot" />}
              </div>
            </div>
            <div className="video-meta">
              <div>
                <div className="video-title">{p.name}</div>
                <div className="video-stats">{p.videoCount} video{p.videoCount === 1 ? '' : 's'}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
