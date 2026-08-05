import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { classifyDuration } from '../lib/videoRules';

export default function Upload() {
  const navigate = useNavigate();
  const [videoFile, setVideoFile] = useState(null);
  const [thumbFile, setThumbFile] = useState(null);
  const [thumbPreview, setThumbPreview] = useState(null);
  const [duration, setDuration] = useState(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [progressLabel, setProgressLabel] = useState('');
  const videoInputRef = useRef(null);
  const classification = videoFile ? classifyDuration(duration) : null;

  const onVideoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoFile(file);
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.src = url;
    v.onloadedmetadata = () => {
      setDuration(v.duration || 0);
      URL.revokeObjectURL(url);
    };
    if (!title) setTitle(file.name.replace(/\.[^.]+$/, ''));
  };

  const onThumbChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbFile(file);
    setThumbPreview(URL.createObjectURL(file));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!videoFile) return setError('Choose a video file to upload.');
    if (!title.trim()) return setError('Give your video a title.');
    if (classification?.kind === 'invalid') return setError(classification.message);
    setBusy(true);
    setProgressLabel('Uploading…');
    try {
      const fd = new FormData();
      fd.append('video', videoFile);
      if (thumbFile) fd.append('thumbnail', thumbFile);
      fd.append('title', title.trim());
      fd.append('description', description.trim());
      fd.append('durationSeconds', String(Math.round(duration)));
      fd.append('visibility', visibility);
      const { video } = await api.upload(fd);
      navigate(`/watch/${video.id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
      setProgressLabel('');
    }
  };

  return (
    <form className="upload-grid" onSubmit={submit}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: 18 }}>
          Upload <span className="dot dot-pulse" />
        </h1>
        {error && <div className="form-error">{error}</div>}

        <div
          className={`dropzone ${videoFile ? 'filled' : ''}`}
          onClick={() => videoInputRef.current?.click()}
          style={{ cursor: 'pointer', marginBottom: 18 }}
        >
          {videoFile ? (
            <div>
              <strong>{videoFile.name}</strong>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', marginTop: 6 }}>
                {(videoFile.size / (1024 * 1024)).toFixed(1)} MB
              </div>
            </div>
          ) : (
            <div>Click to choose a video file (MP4, WebM, MOV)</div>
          )}
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            onChange={onVideoChange}
            style={{ display: 'none' }}
          />
        </div>

        {classification && (
          <div style={{
            marginBottom: 18, fontSize: '0.82rem', padding: '10px 14px', borderRadius: 'var(--radius-md)',
            background: classification.kind === 'invalid' ? 'rgba(255,93,108,0.1)' : 'rgba(255,177,0,0.1)',
            border: `1px solid ${classification.kind === 'invalid' ? 'var(--danger)' : 'var(--accent-dim)'}`,
            color: classification.kind === 'invalid' ? 'var(--danger)' : 'var(--text-primary)'
          }}>
            {classification.kind === 'short' && '🔹 '}
            {classification.kind === 'long' && '▶ '}
            {classification.message}
          </div>
        )}

        <div className="field">
          <label>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} />
        </div>
        <div className="field">
          <label>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} />
        </div>
        <div className="field">
          <label>Visibility</label>
          <select value={visibility} onChange={(e) => setVisibility(e.target.value)}>
            <option value="public">Public</option>
            <option value="unlisted">Unlisted</option>
            <option value="private">Private</option>
          </select>
        </div>

        <button className="btn btn-accent" disabled={busy || classification?.kind === 'invalid'}>
          {busy ? (progressLabel || 'Uploading…') : 'Publish video'}
        </button>
      </div>

      <div>
        <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
          Thumbnail
        </label>
        <div className="thumb-preview" onClick={() => document.getElementById('thumb-input').click()} style={{ cursor: 'pointer' }}>
          {thumbPreview ? <img src={thumbPreview} alt="Thumbnail preview" /> : <span>Click to choose an image</span>}
        </div>
        <input id="thumb-input" type="file" accept="image/*" onChange={onThumbChange} style={{ display: 'none' }} />
      </div>
    </form>
  );
}
