import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { api, authApi, settingsApi } from '../api/client';

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
  const [ntfySaved, setNtfySaved]   = useState(false);
  const [ntfyTesting, setNtfyTesting] = useState(false);
  const [company, setCompany]   = useState({
    name: '', address: '', city: '', province: 'ON', postal: '',
    phone: '', email: '', website: '', hst_number: '',
    enable_hst: true, hst_rate: 13, currency: 'CAD', fiscal_year_start: '01',
  });
  const [companySaved, setCompanySaved]   = useState(false);
  const [companySaving, setCompanySaving] = useState(false);
  const [backupInfo, setBackupInfo]       = useState(null);
  const [backupDownloading, setBackupDownloading] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState('');
  const restoreFileRef = useRef(null);

  useEffect(() => {
    window.printflow.getTheme().then(t => setThemeLocal(t || 'dark'));
    setNewUrl(serverUrl);
    settingsApi.get('ntfy_config').then(r => { if (r.data?.value) setNtfy(r.data.value); }).catch(() => {});
    settingsApi.get('company_config').then(r => { if (r.data?.value) setCompany(c => ({ ...c, ...r.data.value })); }).catch(() => {});
    api.get('/api/backup/info').then(r => setBackupInfo(r.data)).catch(() => {});
  }, [serverUrl]);

  async function changeTheme(t) { setThemeLocal(t); onThemeChange(t); await window.printflow.setTheme(t); }
  async function saveServerUrl() { await setServerUrl(newUrl); alert('Server URL updated. Restart the app to reconnect.'); }
  async function changeServer() { await window.printflow.clearToken(); await setServerUrl(''); navigate('/setup', { replace: true }); }

  async function changePassword() {
    if (pwForm.next !== pwForm.confirm) { setPwErr('Passwords do not match'); return; }
    if (pwForm.next.length < 8) { setPwErr('Password must be at least 8 characters'); return; }
    setSaving(true); setPwErr(''); setPwMsg('');
    try { await authApi.changePassword(pwForm.cur, pwForm.next); setPwMsg('Password changed successfully'); setPwForm({ cur:'', next:'', confirm:'' }); }
    catch (e) { setPwErr(e.response?.data?.error || 'Failed to change password'); }
    finally { setSaving(false); }
  }

  async function saveNtfy() {
    await settingsApi.set('ntfy_config', ntfy);
    setNtfySaved(true); setTimeout(() => setNtfySaved(false), 2000);
  }
  async function testNtfy() {
    if (!ntfy.topic) return;
    setNtfyTesting(true);
    try {
      await fetch(`https://ntfy.sh/${ntfy.topic}`, { method:'POST', body:'PrintFlow test notification', headers:{ 'Title':'PrintFlow','Priority':'default','Tags':'printer' } });
      alert('Test notification sent! Check your ntfy app.');
    } catch { alert('Failed to send test notification'); }
    setNtfyTesting(false);
  }
  async function saveCompany() {
    setCompanySaving(true);
    try { await settingsApi.set('company_config', company); setCompanySaved(true); setTimeout(() => setCompanySaved(false), 2000); }
    catch { alert('Failed to save company settings'); }
    finally { setCompanySaving(false); }
  }

  async function downloadBackup() {
    setBackupDownloading(true);
    try {
      const token = await window.printflow.getToken();
      const { getServerUrl } = await import('../api/client');
      const res = await fetch(`${getServerUrl()}/api/backup/download`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const ts = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `printflow-backup-${ts}.db`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) { alert('Backup failed: ' + e.message); }
    setBackupDownloading(false);
  }

  async function restoreBackup(file) {
    if (!file) return;
    if (!window.confirm(`Restore from "${file.name}"?\n\nThis will REPLACE all current data. The current database will be backed up first.\n\nAre you sure?`)) return;
    setRestoreStatus('Uploading...');
    try {
      const token = await window.printflow.getToken();
      const { getServerUrl } = await import('../api/client');
      const formData = new FormData();
      formData.append('database', file);
      const res = await fetch(`${getServerUrl()}/api/backup/restore`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRestoreStatus('Restored successfully. Please restart the server from DSM to apply changes.');
      api.get('/api/backup/info').then(r => setBackupInfo(r.data)).catch(() => {});
    } catch (e) { setRestoreStatus('Restore failed: ' + e.message); }
    if (restoreFileRef.current) restoreFileRef.current.value = '';
  }

  const FC = k => ({ value: company[k] ?? '', onChange: e => setCompany(c => ({ ...c, [k]: e.target.value })) });
  const PROVINCES    = ['AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT'];
  const MONTHS_LABEL = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  return (
    <div style={{ height:'100%', overflowY:'auto', padding:24 }}>
      <div style={{ maxWidth:800, margin:'0 auto' }}>
        <div style={{ marginBottom:24 }}>
          <h1>Settings</h1>
          <p style={{ color:'var(--text-secondary)', fontSize:13, marginTop:4 }}>Configure PrintFlow for your business</p>
        </div>

        {/* ── Company Configuration ─────────────────────────────────── */}
        <div className="card" style={{ padding:20, marginBottom:14 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <h3>Company Configuration</h3>
            <button className="btn btn-primary btn-sm" onClick={saveCompany} disabled={companySaving}>
              {companySaved ? '✓ Saved' : companySaving ? 'Saving…' : 'Save Company'}
            </button>
          </div>

          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-tertiary)', marginBottom:10 }}>Business Info</div>
          <div className="form-row">
            <div className="form-group"><label className="label">Company Name</label><input className="input" {...FC('name')} placeholder="e.g. Alliston 3D Prints"/></div>
            <div className="form-group"><label className="label">Business Email</label><input className="input" type="email" {...FC('email')} placeholder="hello@yourbusiness.com"/></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="label">Phone</label><input className="input" {...FC('phone')} placeholder="(705) 555-0123"/></div>
            <div className="form-group"><label className="label">Website</label><input className="input" {...FC('website')} placeholder="https://yourbusiness.com"/></div>
          </div>
          <div className="form-group"><label className="label">Street Address</label><input className="input" {...FC('address')} placeholder="123 Main St"/></div>
          <div className="form-row">
            <div className="form-group"><label className="label">City</label><input className="input" {...FC('city')} placeholder="Alliston"/></div>
            <div className="form-group">
              <label className="label">Province</label>
              <select className="select" {...FC('province')}>{PROVINCES.map(p => <option key={p}>{p}</option>)}</select>
            </div>
            <div className="form-group"><label className="label">Postal Code</label><input className="input" {...FC('postal')} placeholder="L9R 0A1" style={{ fontFamily:'monospace' }}/></div>
          </div>

          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-tertiary)', marginTop:20, marginBottom:10 }}>Tax & Finance</div>
          <div className="form-row">
            <div className="form-group" style={{ display:'flex', alignItems:'center', gap:8, paddingTop:20 }}>
              <input type="checkbox" id="enable_hst" checked={!!company.enable_hst}
                onChange={e => setCompany(c => ({ ...c, enable_hst: e.target.checked }))} style={{ width:16, height:16 }}/>
              <label htmlFor="enable_hst" style={{ fontSize:13, cursor:'pointer', fontWeight:500 }}>Enable Tax (HST/GST)</label>
            </div>
            <div className="form-group">
              <label className="label">Tax Rate (%)</label>
              <input className="input" type="number" step="0.1" min="0" max="30"
                value={company.hst_rate} onChange={e => setCompany(c => ({ ...c, hst_rate: parseFloat(e.target.value) || 0 }))}
                style={{ opacity: company.enable_hst ? 1 : 0.4 }} disabled={!company.enable_hst}/>
            </div>
          </div>
          {company.enable_hst
            ? <div style={{ padding:'8px 12px', background:'var(--bg-hover)', borderRadius:'var(--r-sm)', fontSize:12, color:'var(--text-secondary)', marginBottom:10 }}>
                Tax calculated at {company.hst_rate}% on all sales. Shown as HST on quotes and invoices.
              </div>
            : <div style={{ padding:'8px 12px', background:'var(--amber-light)', borderRadius:'var(--r-sm)', fontSize:12, color:'var(--amber)', marginBottom:10 }}>
                Tax calculations disabled — no HST/GST will be added to orders or invoices.
              </div>
          }
          <div className="form-row">
            <div className="form-group">
              <label className="label">HST / GST Number</label>
              <input className="input" {...FC('hst_number')} placeholder="123456789 RT0001"
                style={{ fontFamily:'monospace', opacity: company.enable_hst ? 1 : 0.4 }} disabled={!company.enable_hst}/>
            </div>
            <div className="form-group">
              <label className="label">Fiscal Year Start</label>
              <select className="select" value={company.fiscal_year_start} onChange={e => setCompany(c => ({ ...c, fiscal_year_start: e.target.value }))}>
                {MONTHS_LABEL.map((m, i) => <option key={i+1} value={String(i+1).padStart(2,'0')}>{m}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ── Appearance ───────────────────────────────────────────── */}
        <div className="card" style={{ padding:20, marginBottom:14 }}>
          <h3 style={{ marginBottom:14 }}>Appearance</h3>
          <div style={{ display:'flex', gap:10 }}>
            {['dark','light'].map(t => (
              <button key={t} className={`btn ${theme === t ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => changeTheme(t)} style={{ minWidth:100, justifyContent:'center' }}>
                {t === 'dark' ? 'Dark' : 'Light'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Server Connection ─────────────────────────────────────── */}
        <div className="card" style={{ padding:20, marginBottom:14 }}>
          <h3 style={{ marginBottom:14 }}>Server Connection</h3>
          <div className="form-group">
            <label className="label">NAS Server URL</label>
            <div style={{ display:'flex', gap:8 }}>
              <input className="input" value={newUrl} onChange={e => setNewUrl(e.target.value)} style={{ fontFamily:'monospace' }}/>
              <button className="btn btn-primary" onClick={saveServerUrl}>Save</button>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ fontSize:12, color:'var(--text-secondary)' }}>
              Connected to: <code style={{ color:'var(--accent)' }}>{serverUrl || 'Not configured'}</code>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={changeServer} style={{ fontSize:12, color:'var(--text-tertiary)' }}>Change server</button>
          </div>
        </div>

        {/* ── Account ──────────────────────────────────────────────── */}
        <div className="card" style={{ padding:20, marginBottom:14 }}>
          <h3 style={{ marginBottom:14 }}>Account</h3>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16, padding:'12px 14px', background:'var(--bg-hover)', borderRadius:'var(--r-sm)' }}>
            <div style={{ width:40, height:40, borderRadius:'50%', background:'var(--accent-light)', color:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:700 }}>
              {user?.name?.slice(0,2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight:600 }}>{user?.name}</div>
              <div style={{ fontSize:12, color:'var(--text-secondary)' }}>{user?.email} · <span style={{ textTransform:'capitalize' }}>{user?.role}</span></div>
            </div>
          </div>
          <h3 style={{ fontSize:14, marginBottom:12 }}>Change Password</h3>
          <div className="form-group">
            <label className="label">Current Password</label>
            <input className="input" type="password" value={pwForm.cur} onChange={e => setPwForm(f => ({ ...f, cur: e.target.value }))}/>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="label">New Password</label><input className="input" type="password" value={pwForm.next} onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}/></div>
            <div className="form-group"><label className="label">Confirm</label><input className="input" type="password" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}/></div>
          </div>
          {pwErr && <div style={{ color:'var(--red)', fontSize:12, marginBottom:8 }}>{pwErr}</div>}
          {pwMsg && <div style={{ color:'var(--green)', fontSize:12, marginBottom:8 }}>{pwMsg}</div>}
          <button className="btn btn-primary btn-sm" onClick={changePassword} disabled={saving || !pwForm.cur || !pwForm.next}>
            {saving ? 'Saving…' : 'Change Password'}
          </button>
        </div>

        {/* ── Push Notifications ────────────────────────────────────── */}
        <div className="card" style={{ padding:20, marginBottom:14 }}>
          <h3 style={{ marginBottom:6 }}>Push Notifications</h3>
          <p style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:14, lineHeight:1.6 }}>
            Get notified on your phone when prints finish or fail. Uses <strong>ntfy.sh</strong> — free, no account needed.
            Install the <a href="#" onClick={() => window.printflow.openExternal('https://ntfy.sh')} style={{ color:'var(--accent)' }}>ntfy app</a> and subscribe to a topic.
          </p>
          <div className="form-group">
            <label className="label">ntfy Topic</label>
            <input className="input" value={ntfy.topic} onChange={e => setNtfy(n => ({ ...n, topic: e.target.value }))} placeholder="e.g. alliston3dprints-rob" style={{ fontFamily:'monospace' }}/>
            <div style={{ fontSize:11, color:'var(--text-tertiary)', marginTop:4 }}>Subscribe to this topic in the ntfy app on your phone</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
            <input type="checkbox" id="ntfy-enabled" checked={ntfy.enabled} onChange={e => setNtfy(n => ({ ...n, enabled: e.target.checked }))} style={{ width:16, height:16 }}/>
            <label htmlFor="ntfy-enabled" style={{ fontSize:13, cursor:'pointer' }}>Enable push notifications</label>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn btn-primary btn-sm" onClick={saveNtfy} disabled={!ntfy.topic}>{ntfySaved ? '✓ Saved' : 'Save'}</button>
            <button className="btn btn-secondary btn-sm" onClick={testNtfy} disabled={!ntfy.topic || ntfyTesting}>{ntfyTesting ? 'Sending...' : 'Send Test'}</button>
          </div>
        </div>

        {/* ── Integrations ──────────────────────────────────────────── */}
        <div className="card" style={{ padding:20, marginBottom:14 }}>
          <h3 style={{ marginBottom:6 }}>Integrations</h3>
          <p style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:14, lineHeight:1.6 }}>Connect PrintFlow to external platforms and services.</p>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {[
              { name:'Etsy',          desc:'Order sync and listing management' },
              { name:'Shopify',       desc:'Storefront order import' },
              { name:'Amazon Canada', desc:'Seller Central order sync' },
              { name:'Canada Post',   desc:'Label generation — configure via server .env file' },
              { name:'QuickBooks',    desc:'Accounting and expense sync' },
            ].map(i => (
              <div key={i.name} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', background:'var(--bg-hover)', borderRadius:'var(--r-sm)' }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:500 }}>{i.name}</div>
                  <div style={{ fontSize:11, color:'var(--text-secondary)' }}>{i.desc}</div>
                </div>
                <span style={{ fontSize:11, color:'var(--text-tertiary)', padding:'3px 8px', background:'var(--bg-card)', border:'0.5px solid var(--border)', borderRadius:6 }}>Coming soon</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Backup & Restore ──────────────────────────────────────── */}
        {user?.role === 'owner' && (
          <div className="card" style={{ padding:20, marginBottom:14 }}>
            <h3 style={{ marginBottom:6 }}>Backup & Restore</h3>
            <p style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:16, lineHeight:1.6 }}>
              Download a complete backup of your PrintFlow database, or restore from a previous backup file.
              The current database is automatically preserved before any restore.
            </p>

            {backupInfo?.exists && (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
                {[['Database Size', `${backupInfo.sizeMb} MB`], ['Total Orders', backupInfo.orders], ['Transactions', backupInfo.transactions]].map(([label, value]) => (
                  <div key={label} style={{ padding:'10px 12px', background:'var(--bg-hover)', borderRadius:8, border:'0.5px solid var(--border)' }}>
                    <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--text-tertiary)', marginBottom:4 }}>{label}</div>
                    <div style={{ fontSize:18, fontWeight:700 }}>{value}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
              <button className="btn btn-primary" onClick={downloadBackup} disabled={backupDownloading}>
                {backupDownloading ? 'Creating backup...' : '\u2b07 Download Backup'}
              </button>
              <div style={{ position:'relative' }}>
                <input ref={restoreFileRef} type="file" accept=".db"
                  style={{ position:'absolute', inset:0, opacity:0, cursor:'pointer', width:'100%' }}
                  onChange={e => restoreBackup(e.target.files?.[0])} />
                <button className="btn btn-secondary" style={{ pointerEvents:'none' }}>\u2191 Restore from File</button>
              </div>
            </div>

            {restoreStatus && (
              <div style={{ marginTop:12, padding:'10px 14px', borderRadius:8, fontSize:13, lineHeight:1.5,
                background: restoreStatus.includes('failed') ? 'var(--red-light)' : 'var(--green-light)',
                color: restoreStatus.includes('failed') ? 'var(--red)' : 'var(--green)',
                border: `0.5px solid ${restoreStatus.includes('failed') ? 'var(--red)' : 'var(--green)'}` }}>
                {restoreStatus}
              </div>
            )}

            <div style={{ marginTop:14, padding:'10px 14px', background:'var(--amber-light)', borderRadius:8, fontSize:12, color:'var(--amber)', border:'0.5px solid rgba(255,179,0,0.3)', lineHeight:1.5 }}>
              Restoring a backup replaces all data including orders, customers, transactions, and settings. This cannot be undone once the server is restarted.
            </div>
          </div>
        )}

        {/* ── Sign Out ──────────────────────────────────────────────── */}
        <div className="card" style={{ padding:20, border:'0.5px solid rgba(255,69,58,0.25)' }}>
          <h3 style={{ marginBottom:14, color:'var(--red)' }}>Sign Out</h3>
          <p style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:14 }}>Sign out of PrintFlow on this device. Your data remains on the server.</p>
          <button className="btn btn-danger" onClick={async () => { await logout(); navigate('/login', { replace:true }); }}>Sign Out</button>
        </div>
      </div>
    </div>
  );
}
