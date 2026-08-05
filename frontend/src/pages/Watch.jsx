import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import { formatViews, timeAgo, initials } from '../lib/format';
import SaveMenu from '../components/SaveMenu';

export default function Watch() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [video, setVideo] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [recs, setRecs] = useState([]);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api.video(id).then(({ video }) => setVideo(video)).catch((e) => setError(e.message));
    api.comments(id).then(({ comments }) => setComments(comments)).catch(() => {});
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.feed().then(({ videos }) => setRecs(videos.filter((v) => v.id !== id))).catch(() => {}); }, [id]);

  const react = async (value) => {
    if (!user) return navigate('/login');
    const next = video.myReaction === value ? 0 : value;
    try {
      const { video: updated } = await api.react(id, next);
      setVideo(updated);
    } catch (e) { setError(e.message); }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!user) return navigate('/login');
    if (!commentText.trim()) return;
    try {
      const { comment } = await api.addComment(id, commentText.trim());
      setComments((c) => [comment, ...c]);
      setCommentText('');
    } catch (e) { setError(e.message); }
  };

  const removeVideo = async () => {
    if (!confirm('Delete this video? This cannot be undone.')) return;
    await api.deleteVideo(id);
    navigate('/');
  };

  if (error) return <div className="empty-state">{error}</div>;
  if (!video) return <div className="skeleton" style={{ aspectRatio: '16/9', maxWidth: 900 }} />;

  return (
    <div className="watch-layout">
      <div>
        <div className="player-wrap">
          <video src={video.videoUrl} controls autoPlay poster={video.thumbnailUrl || undefined} />
        </div>
        <h1 className="watch-title">{video.title}</h1>

        <div className="channel-row">
          <div className="avatar">{initials(video.owner?.username)}</div>
          <div className="grow">
            <div className="channel-name">
              <Link to={`/channel/${video.owner?.username}`}>{video.owner?.username}</Link>
            </div>
            <div className="channel-subs">{formatViews(video.views)} · {timeAgo(video.createdAt)}</div>
          </div>
          {user?.username === video.owner?.username && (
            <button className="btn btn-danger" onClick={removeVideo}>Delete</button>
          )}
        </div>

        <div className="reaction-row">
          <button className={`pill-toggle ${video.myReaction === 1 ? 'active' : ''}`} onClick={() => react(1)}>
            ▲ {video.likes}
          </button>
          <button className={`pill-toggle ${video.myReaction === -1 ? 'active' : ''}`} onClick={() => react(-1)}>
            ▼ {video.dislikes}
          </button>
          {user && <SaveMenu videoId={video.id} />}
        </div>

        {video.description && <div className="description-box">{video.description}</div>}

        <div className="comments">
          <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
            {comments.length} comment{comments.length === 1 ? '' : 's'}
          </h3>
          <form className="comment-form" onSubmit={submitComment}>
            <textarea
              rows={1}
              placeholder={user ? 'Add a comment' : 'Log in to comment'}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <button className="btn btn-accent" type="submit">Post</button>
          </form>
          {comments.map((c) => (
            <div key={c.id} className="comment">
              <div className="avatar">{initials(c.user.username)}</div>
              <div>
                <span className="comment-user">{c.user.username}</span>
                <span className="comment-time">{timeAgo(c.createdAt)}</span>
                <div className="comment-body">{c.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="recs">
        {recs.slice(0, 10).map((v) => (
          <Link key={v.id} to={`/watch/${v.id}`} className="rec-card">
            <div className="thumb-wrap">
              {v.thumbnailUrl ? <img src={v.thumbnailUrl} alt={v.title} /> : <div className="thumb-fallback"><span className="dot" /></div>}
              <span className="duration-badge">{Math.floor(v.durationSeconds / 60)}:{String(Math.floor(v.durationSeconds % 60)).padStart(2, '0')}</span>
            </div>
            <div>
              <div className="video-title">{v.title}</div>
              <div className="video-sub">{v.owner?.username}</div>
              <div className="video-stats">{formatViews(v.views)}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
