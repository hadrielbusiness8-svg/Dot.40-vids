import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

export default function SaveMenu({ videoId }) {
  const [open, setOpen] = useState(false);
  const [playlists, setPlaylists] = useState(null);
  const [membership, setMembership] = useState({}); // playlistId -> bool
  const [newName, setNewName] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const loadPlaylists = async () => {
    const { playlists } = await api.playlists();
    setPlaylists(playlists);
    const checks = await Promise.all(playlists.map(async (p) => {
      try {
        const { videos } = await api.playlist(p.id);
        return [p.id, videos.some((v) => v.id === videoId)];
      } catch {
        return [p.id, false];
      }
    }));
    setMembership(Object.fromEntries(checks));
  };

  const toggleOpen = async () => {
    const next = !open;
    setOpen(next);
    if (next && !playlists) await loadPlaylists();
  };

  const toggleMembership = async (playlistId) => {
    const isMember = membership[playlistId];
    setMembership((m) => ({ ...m, [playlistId]: !isMember }));
    try {
      if (isMember) await api.removeFromPlaylist(playlistId, videoId);
      else await api.addToPlaylist(playlistId, videoId);
    } catch {
      setMembership((m) => ({ ...m, [playlistId]: isMember }));
    }
  };

  const createAndAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const { playlist } = await api.createPlaylist(newName.trim());
    await api.addToPlaylist(playlist.id, videoId);
    setNewName('');
    await loadPlaylists();
  };

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button className="pill-toggle" onClick={toggleOpen}>+ Save</button>
      {open && (
        <div style={{
          position: 'absolute', top: '110%', left: 0, zIndex: 30,
          background: 'var(--bg-surface)', border: '1px solid var(--border-soft)',
          borderRadius: 'var(--radius-md)', padding: 12, width: 240, boxShadow: '0 12px 30px rgba(0,0,0,0.4)'
        }}>
          {!playlists ? (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading…</div>
          ) : (
            <>
              {playlists.map((p) => (
                <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 2px', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!membership[p.id]} onChange={() => toggleMembership(p.id)} />
                  {p.name}
                </label>
              ))}
              <form onSubmit={createAndAdd} style={{ display: 'flex', gap: 6, marginTop: 8, borderTop: '1px solid var(--border-soft)', paddingTop: 8 }}>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="New playlist"
                  style={{ flex: 1, background: 'var(--bg-inset)', border: '1px solid var(--border-soft)', color: 'var(--text-primary)', borderRadius: 6, padding: '6px 8px', fontSize: '0.8rem' }}
                />
                <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: '0.75rem' }}>Add</button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
