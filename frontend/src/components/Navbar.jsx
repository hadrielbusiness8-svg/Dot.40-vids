import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { initials } from '../lib/format';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const onSearch = (e) => {
    e.preventDefault();
    navigate(q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : '/');
  };

  return (
    <header className="navbar">
      <Link to="/" className="brand">
        Dot<span className="brand-dot dot-pulse" />40 vids
      </Link>
      <form className="search-form" onSubmit={onSearch}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search videos"
          aria-label="Search videos"
        />
        <button type="submit" aria-label="Search">⌕</button>
      </form>
      <div className="nav-right">
        {user ? (
          <>
            <button className="btn btn-accent" onClick={() => navigate('/upload')}>Upload</button>
            <NotificationBell />
            <button className="avatar" title={user.username} onClick={() => navigate(`/channel/${user.username}`)}>
              {initials(user.username)}
            </button>
            <button className="btn btn-ghost" onClick={() => { logout(); navigate('/'); }}>Log out</button>
          </>
        ) : (
          <>
            <button className="btn btn-ghost" onClick={() => navigate('/login')}>Log in</button>
            <button className="btn btn-accent" onClick={() => navigate('/signup')}>Sign up</button>
          </>
        )}
      </div>
    </header>
  );
}
