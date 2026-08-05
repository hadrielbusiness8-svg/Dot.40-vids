import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { timeAgo } from '../lib/format';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(null);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);
  const navigate = useNavigate();

  const refreshCount = useCallback(() => {
    api.unreadCount().then(({ count }) => setUnread(count)).catch(() => {});
  }, []);

  useEffect(() => {
    refreshCount();
    const interval = setInterval(refreshCount, 30000);
    return () => clearInterval(interval);
  }, [refreshCount]);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const toggleOpen = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      const { notifications } = await api.notifications();
      setItems(notifications);
    }
  };

  const openNotification = async (n) => {
    setOpen(false);
    if (!n.read) {
      await api.markNotificationRead(n.id);
      setUnread((u) => Math.max(0, u - 1));
    }
    navigate(`/watch/${n.videoId}`);
  };

  const markAllRead = async () => {
    await api.markAllNotificationsRead();
    setItems((items) => items?.map((n) => ({ ...n, read: true })) || null);
    setUnread(0);
  };

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button className="btn btn-ghost" onClick={toggleOpen} style={{ position: 'relative', padding: '9px 12px' }}>
        🔔
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4, background: 'var(--accent)', color: 'var(--accent-ink)',
            fontSize: '0.65rem', fontWeight: 700, borderRadius: 999, minWidth: 16, height: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px'
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '110%', right: 0, zIndex: 30,
          background: 'var(--bg-surface)', border: '1px solid var(--border-soft)',
          borderRadius: 'var(--radius-md)', width: 320, maxHeight: 420, overflowY: 'auto',
          boxShadow: '0 12px 30px rgba(0,0,0,0.4)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid var(--border-soft)' }}>
            <strong style={{ fontSize: '0.85rem' }}>Notifications</strong>
            {items && items.length > 0 && (
              <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: 'var(--secondary)', fontSize: '0.75rem', fontWeight: 600 }}>
                Mark all read
              </button>
            )}
          </div>
          {!items ? (
            <div style={{ padding: 16, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading…</div>
          ) : items.length === 0 ? (
            <div style={{ padding: 16, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Nothing yet. New uploads from channels you follow will show up here.</div>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                onClick={() => openNotification(n)}
                style={{
                  display: 'flex', gap: 10, alignItems: 'center', width: '100%', textAlign: 'left',
                  padding: '10px 14px', background: n.read ? 'transparent' : 'var(--bg-surface-hover)', border: 'none',
                  borderBottom: '1px solid var(--border-soft)'
                }}
              >
                <span className="dot" style={{ background: n.read ? 'var(--text-faint)' : 'var(--accent)', flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                    <strong>{n.channelUsername}</strong> uploaded <span style={{ color: 'var(--text-muted)' }}>{n.videoTitle}</span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-faint)', marginTop: 2 }}>
                    {timeAgo(n.createdAt)}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
