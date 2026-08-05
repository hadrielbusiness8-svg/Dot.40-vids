const BASE = '/api';

function getToken() {
  return localStorage.getItem('dot40_token');
}

async function request(path, { method = 'GET', body, isForm = false, auth = true } = {}) {
  const headers = {};
  if (!isForm) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  signup: (payload) => request('/auth/signup', { method: 'POST', body: payload, auth: false }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload, auth: false }),
  me: () => request('/auth/me'),

  feed: (q) => request(`/videos${q ? `?q=${encodeURIComponent(q)}` : ''}`, { auth: false }),
  shortsFeed: () => request('/videos/shorts/feed', { auth: false }),
  video: (id) => request(`/videos/${id}`, { auth: false }),
  react: (id, value) => request(`/videos/${id}/react`, { method: 'POST', body: { value } }),
  comments: (id) => request(`/videos/${id}/comments`, { auth: false }),
  addComment: (id, body) => request(`/videos/${id}/comments`, { method: 'POST', body: { body } }),
  deleteVideo: (id) => request(`/videos/${id}`, { method: 'DELETE' }),
  upload: (formData) => request('/videos', { method: 'POST', body: formData, isForm: true }),

  channel: (username) => request(`/users/${username}`, { auth: false }),
  subscribe: (username) => request(`/users/${username}/subscribe`, { method: 'POST' }),
  unsubscribe: (username) => request(`/users/${username}/subscribe`, { method: 'DELETE' }),

  subscriptionsFeed: () => request('/subscriptions/feed'),
  subscribedChannels: () => request('/subscriptions/channels'),

  history: () => request('/history'),
  clearHistory: () => request('/history', { method: 'DELETE' }),
  removeHistoryItem: (videoId) => request(`/history/${videoId}`, { method: 'DELETE' }),

  playlists: () => request('/playlists'),
  createPlaylist: (name) => request('/playlists', { method: 'POST', body: { name } }),
  playlist: (id) => request(`/playlists/${id}`),
  deletePlaylist: (id) => request(`/playlists/${id}`, { method: 'DELETE' }),
  addToPlaylist: (id, videoId) => request(`/playlists/${id}/items`, { method: 'POST', body: { videoId } }),
  removeFromPlaylist: (id, videoId) => request(`/playlists/${id}/items/${videoId}`, { method: 'DELETE' }),
  toggleWatchLater: (videoId) => request('/playlists/watch-later/toggle', { method: 'POST', body: { videoId } }),

  notifications: () => request('/notifications'),
  unreadCount: () => request('/notifications/unread-count'),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'POST' }),
  markAllNotificationsRead: () => request('/notifications/read-all', { method: 'POST' })
};

export { getToken };
