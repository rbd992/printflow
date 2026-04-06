import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { authApi, settingsApi } from '../api/client';

export default function SettingsPage({ onThemeChange }) {
  const { user, serverUrl, setServerUrl, logout } = useAuthStore();
  const navigate = useNavigate();
  const [theme, setThemeLocal]  = useState('dark');
  const [newUrl, setNewUrl]     = useState('');
  const [pwForm, setPwForm]     = useState({ cur: '', next: '', confirm: '' });
  const [pwMsg, setPwMsg]       = useState('');
  const [pwErr, setPwErr]       = useState('');
  const [saving, setSaving]     = useState(false);
  const [ntfy, setNtfy]         = useState({ topic: '', enabled: false });
  const [ntfySaved, setNtfySaved] = useState(false);
  const [ntfyTesting, setNtfyTesting] = useState(false);

  useEffect(() => {
    window.printflow.getTheme().then(t => setThemeLocal(t || 'dark'));
    setNewUrl(serverUrl);
    settingsApi.get('ntfy_config').then(r => { if (r.data?.value) setNtfy(r.data.value); }).catch(() => {});
  }, [serverUrl]);

  async function changeTheme(t) {
    setThemeLocal(t);
    onThemeChange(t);
    await window.printflow.setTheme(t);
  }

  async function saveServerUrl() {
    await setServerUrl(newUrl);
    alert('Server URL updated. Restart the app to reconnect.');
  }

  async function changeServer() {
    await window.printflow.clearToken();
    await setServerUrl('');
    navigate('/setup', { replace: true });
  }

  async function changePassword() {
    if (pwForm.next !== pwForm.confirm) { setPwErr('Passwords do not match'); return; }
    if (pwForm.next.length < 8) { setPwErr('Password must be at least 8 characters'); return; }
    setSaving(true); setPwErr(''); setPwMsg('');
    try {
      await authApi.changePassword(pwForm.cur, pwForm.next);
      setPwMsg('Password changed successfully');
      setPwForm({ cur: '', next: '', confirm: '' });
    } catch (e) {
      setPwErr(e.response?.data?.error || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  }

  async function saveNtfy() {
    await settingsApi.set('ntfy_config', ntfy);
    setNtfySaved(true);
    setTimeout(() => setNtfySaved(false), 2000);
  }

  async function testNtfy() {
    if (!ntfy.topic) return;
    setNtfyTesting(true);
    try {
      await fetch(`https://ntfy.sh/${ntfy.topic}`, {
        method: 'POST',
        body: 'PrintFlow test notification ✅',
        headers: { 'Title': 'PrintFlow', 'Priority': 'default', 'Tags': 'printer' },
      });
      alert('Test notification sent! Check your ntfy app.');
    } catch { alert('Failed to send test notification'); }
    setNtfyTesting(false);
  }

  const integrations = [
    { name: 'Etsy',          desc: 'Sync orders and listings',  status: 'Connect',   cls: 'btn-secondary' },
    { name: 'Amazon Canada', desc: 'Seller Central order sync',  status: 'Connect',   cls: 'btn-secondary' },
    { name: 'Canada Post',   desc: 'Label generation API',       status: 'Configure', cls: 'btn-secondary' },
    { name: 'QuickBooks',    desc: 'Accounting sync',            status: 'Connect',   cls: 'btn-secondary' },
    { name: 'Bambu Cloud',   desc: 'OTA firmware updates',       status: 'Connected', cls: 'btn-primary'   },
  ];

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 24 }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <h1>Settings</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            Configure PrintFlow for your business
          </p>
        </div>

        <div className="card" style={{ padding: 20, marginBottom: 14 }}>
          <h3 style={{ marginBottom: 14 }}>Appearance</h3>
          <div style={{ display: 'flex', gap: 10 }}>
            {['dark', 'light'].map(t => (
              <button key={t} className={`btn ${theme === t ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => changeTheme(t)} style={{ minWidth: 100, justifyContent: 'center' }}>
                {t === 'dark' ? '🌙 Dark' : '☀️ Light'}
              </button>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 20, marginBottom: 14 }}>
          <h3 style={{ marginBottom: 14 }}>Server Connection</h3>
          <div className="form-group">
            <label className="label">NAS Server URL</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
                style={{ fontFamily: 'monospace' }} />
              <button className="btn btn-primary" onClick={saveServerUrl}>Save</button>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Connected to: <code style={{ color: 'var(--accent)' }}>{serverUrl || 'Not configured'}</code>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={changeServer}
              style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              Change server
            </button>
          </div>
        </div>

        <div className="card" style={{ padding: 20, marginBottom: 14 }}>
          <h3 style={{ marginBottom: 14 }}>Account</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '12px 14px', background: 'var(--bg-hover)', borderRadius: 'var(--r-sm)' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700 }}>
              {user?.name?.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>{user?.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {user?.email} · <span style={{ textTransform: 'capitalize' }}>{user?.role}</span>
              </div>
            </div>
          </div>
          <h3 style={{ fontSize: 14, marginBottom: 12 }}>Change Password</h3>
          <div className="form-group">
            <label className="label">Current Password</label>
            <input className="input" type="password" value={pwForm.cur}
              onChange={e => setPwForm(f => ({ ...f, cur: e.target.value }))} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="label">New Password</label>
              <input className="input" type="password" value={pwForm.next}
                onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="label">Confirm</label>
              <input className="input" type="password" value={pwForm.confirm}
                onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} />
            </div>
          </div>
          {pwErr && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 8 }}>{pwErr}</div>}
          {pwMsg && <div style={{ color: 'var(--green)', fontSize: 12, marginBottom: 8 }}>{pwMsg}</div>}
          <button className="btn btn-primary btn-sm" onClick={changePassword}
            disabled={saving || !pwForm.cur || !pwForm.next}>
            {saving ? 'Saving…' : 'Change Password'}
          </button>
        </div>

        <div className="card" style={{ padding: 20, marginBottom: 14 }}>
          <h3 style={{ marginBottom: 6 }}>Push Notifications</h3>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.6 }}>
            Get notified on your phone when prints finish or fail. Uses <strong>ntfy.sh</strong> — free, no account needed.
            Install the <a href="#" onClick={() => window.printflow.openExternal('https://ntfy.sh')} style={{ color: 'var(--accent)' }}>ntfy app</a> and choose a unique topic name.
          </p>
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label className="label">ntfy Topic (your unique channel name)</label>
              <input className="input" value={ntfy.topic} onChange={e => setNtfy(n => ({ ...n, topic: e.target.value }))}
                placeholder="e.g. alliston3dprints-rob" style={{ fontFamily: 'monospace' }} />
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>Subscribe to this topic in the ntfy app on your phone</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <input type="checkbox" id="ntfy-enabled" checked={ntfy.enabled} onChange={e => setNtfy(n => ({ ...n, enabled: e.target.checked }))} style={{ width: 16, height: 16 }} />
            <label htmlFor="ntfy-enabled" style={{ fontSize: 13, cursor: 'pointer' }}>Enable push notifications</label>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={saveNtfy} disabled={!ntfy.topic}>
              {ntfySaved ? '✓ Saved' : 'Save'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={testNtfy} disabled={!ntfy.topic || ntfyTesting}>
              {ntfyTesting ? 'Sending...' : '🔔 Send Test'}
            </button>
          </div>
        </div>

        <div className="card" style={{ padding: 20, marginBottom: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {integrations.map(i => (
              <div key={i.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--bg-hover)', borderRadius: 'var(--r-sm)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{i.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{i.desc}</div>
                </div>
                <button className={`btn ${i.cls} btn-sm`}>{i.status}</button>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 20, border: '0.5px solid rgba(255,69,58,0.25)' }}>
          <h3 style={{ marginBottom: 14, color: 'var(--red)' }}>Sign Out</h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
            Sign out of PrintFlow on this device. Your data remains on the server.
          </p>
          <button className="btn btn-danger" onClick={async () => {
            await logout();
            navigate('/login', { replace: true });
          }}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
