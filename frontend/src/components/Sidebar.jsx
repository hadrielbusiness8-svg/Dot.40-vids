import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

export default function Sidebar() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <aside className="sidebar">
      <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
        <span className="dot" /> Home
      </NavLink>
      <NavLink to="/shorts" className={({ isActive }) => (isActive ? 'active' : '')}>
        Shorts
      </NavLink>

      {user ? (
        <>
          <NavLink to="/subscriptions" className={({ isActive }) => (isActive ? 'active' : '')}>
            Subscriptions
          </NavLink>
          <NavLink to={`/channel/${user.username}`} className={({ isActive }) => (isActive ? 'active' : '')}>
            Your channel
          </NavLink>

          <div className="sec-label">Library</div>
          <NavLink to="/history" className={({ isActive }) => (isActive ? 'active' : '')}>
            History
          </NavLink>
          <NavLink to="/playlists" className={({ isActive }) => (isActive ? 'active' : '')}>
            Playlists
          </NavLink>

          <div className="sec-label">Session</div>
          <NavLink to="/upload" className={({ isActive }) => (isActive ? 'active' : '')}>
            Upload a video
          </NavLink>
        </>
      ) : (
        <>
          <button className="sidelink" onClick={() => navigate('/login')}>Subscriptions</button>
          <button className="sidelink" onClick={() => navigate('/login')}>Your channel</button>
          <div className="sec-label">Session</div>
          <button className="sidelink" onClick={() => navigate('/signup')}>Sign up to upload</button>
        </>
      )}
    </aside>
  );
}
