import { Link } from 'react-router-dom';
import { formatDuration, formatViews, timeAgo, initials } from '../lib/format';
import { mediaUrl } from '../lib/api';

export default function VideoCard({ video, size = 'default' }) {
  return (
    <Link to={`/watch/${video.id}`} className="video-card">
      <div className="thumb-wrap">
        {video.thumbnailUrl ? (
          <img src={mediaUrl(video.thumbnailUrl)} alt={video.title} loading="lazy" />
        ) : (
          <div className="thumb-fallback"><span className="dot" /></div>
        )}
        <span className="duration-badge">{formatDuration(video.durationSeconds)}</span>
      </div>
      <div className="video-meta">
        {size === 'default' && (
          <div className="avatar">{initials(video.owner?.username)}</div>
        )}
        <div>
          <div className="video-title">{video.title}</div>
          <div className="video-sub">{video.owner?.username}</div>
          <div className="video-stats">{formatViews(video.views)} · {timeAgo(video.createdAt)}</div>
        </div>
      </div>
    </Link>
  );
}
