import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { onSocketEvent } from '../api/socket';
import { CHANGELOG } from '../data/changelog';

const ROLES = { owner:3, manager:2, operator:1 };
function canAccess(userRole, minRole) { return (ROLES[userRole]||0) >= (ROLES[minRole]||0); }

// ── Clean SVG icon set ────────────────────────────────────────────────────
const Icons = {
  dashboard: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  orders: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2"/>
      <path d="M12 12H3"/><path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
      <circle cx="18" cy="12" r="3"/><path d="m22 16-2-2"/>
    </svg>
  ),
  queue: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
    </svg>
  ),
  customers: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  quotes: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      <line x1="10" y1="9" x2="8" y2="9"/>
    </svg>
  ),
  printer: (
    <svg width="15" height="15" viewBox="0 0 80 80" fill="none">
      <rect x="8"  y="12" width="6"  height="40" rx="3" fill="currentColor" opacity="0.5"/>
      <rect x="66" y="12" width="6"  height="40" rx="3" fill="currentColor" opacity="0.5"/>
      <rect x="8"  y="10" width="64" height="8"  rx="4" fill="currentColor" opacity="0.65"/>
      <rect x="31" y="12" width="18" height="11" rx="3" fill="currentColor"/>
      <path d="M37 23 L40 30 L43 23 Z" fill="currentColor"/>
      <rect x="27" y="48" width="26" height="5"  rx="2" fill="currentColor" opacity="0.7"/>
      <rect x="29" y="43" width="22" height="6"  rx="2" fill="currentColor" opacity="0.55"/>
      <rect x="31" y="39" width="18" height="5"  rx="2" fill="currentColor" opacity="0.4"/>
      <rect x="16" y="53" width="48" height="4"  rx="2" fill="currentColor" opacity="0.4"/>
      <rect x="10" y="57" width="60" height="8"  rx="3" fill="currentColor" opacity="0.6"/>
    </svg>
  ),
  filament: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/>
      <path d="M12 3a9 9 0 0 1 9 9"/><path d="M12 3a9 9 0 0 0-9 9"/>
    </svg>
  ),
  parts: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  ),
  shipping: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" rx="1"/>
      <path d="M16 8h4l3 3v5h-7V8z"/>
      <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
    </svg>
  ),
  finance: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  marketing: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
    </svg>
  ),
  history: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  models: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
      <polyline points="2 17 12 22 22 17"/>
      <polyline points="2 12 12 17 22 12"/>
    </svg>
  ),
  help: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  settings: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  users: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  logout: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
};

// ── Release Notes Modal ──────────────────────────────────────────────────
function ReleaseNotesModal({ onClose, highlightVersion }) {
  const [selected, setSelected] = useState(highlightVersion || CHANGELOG[0]?.version);
  const entry = CHANGELOG.find(c => c.version === selected) || CHANGELOG[0];
  const typeColor = { new:'var(--green)', fix:'var(--accent)', improve:'var(--amber)', remove:'var(--red)' };
  const typeLabel = { new:'New', fix:'Fix', improve:'Improved', remove:'Removed' };

  return (
    <div style={{ position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.65)',backdropFilter:'blur(10px)',display:'flex',alignItems:'center',justifyContent:'center',padding:24 }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="card" style={{ width:700,maxHeight:'85vh',display:'flex',flexDirection:'column',animation:'fadeIn 0.2s ease' }}>
        {/* Header */}
        <div style={{ padding:'20px 24px',borderBottom:'0.5px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0 }}>
          <div>
            <h2 style={{ fontSize:18,marginBottom:2 }}>Release Notes</h2>
            <div style={{ fontSize:12,color:'var(--text-tertiary)' }}>PrintFlow changelog</div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        <div style={{ display:'flex',flex:1,overflow:'hidden' }}>
          {/* Version list */}
          <div style={{ width:160,borderRight:'0.5px solid var(--border)',overflowY:'auto',flexShrink:0 }}>
            {CHANGELOG.map(c => (
              <div key={c.version} onClick={()=>setSelected(c.version)}
                style={{ padding:'10px 16px',cursor:'pointer',borderLeft:`3px solid ${selected===c.version?'var(--accent)':'transparent'}`,background:selected===c.version?'var(--accent-light)':'transparent',transition:'all 0.1s' }}>
                <div style={{ fontSize:13,fontWeight:600,color:selected===c.version?'var(--accent)':'var(--text-primary)' }}>v{c.version}</div>
                <div style={{ fontSize:10,color:'var(--text-tertiary)',marginTop:2 }}>{c.date}</div>
                {c.version===CHANGELOG[0].version && <span style={{ fontSize:9,fontWeight:700,color:'var(--green)',textTransform:'uppercase',letterSpacing:'0.04em' }}>Latest</span>}
              </div>
            ))}
          </div>

          {/* Release detail */}
          <div style={{ flex:1,overflowY:'auto',padding:'20px 24px' }}>
            {entry && (
              <>
                <div style={{ marginBottom:16 }}>
                  <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:6 }}>
                    <h3 style={{ fontSize:16 }}>v{entry.version}</h3>
                    <span style={{ fontSize:11,color:'var(--text-tertiary)' }}>{entry.date}</span>
                  </div>
                  <div style={{ fontSize:14,fontWeight:600,color:'var(--text-secondary)',marginBottom:12 }}>{entry.title}</div>
                  {entry.highlights?.length > 0 && (
                    <div style={{ padding:'12px 14px',background:'var(--accent-light)',borderRadius:'var(--r-sm)',marginBottom:16,borderLeft:'3px solid var(--accent)' }}>
                      {entry.highlights.map((h,i)=>(
                        <div key={i} style={{ fontSize:12,color:'var(--accent)',lineHeight:1.7 }}>· {h}</div>
                      ))}
                    </div>
                  )}
                </div>
                {entry.changes?.length > 0 && (
                  <div>
                    <div style={{ fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-tertiary)',marginBottom:10 }}>All Changes</div>
                    {entry.changes.map((c,i)=>(
                      <div key={i} style={{ display:'flex',gap:10,padding:'7px 0',borderBottom:'0.5px solid var(--border)' }}>
                        <span style={{ fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:6,flexShrink:0,marginTop:1,background:`${typeColor[c.type]}22`,color:typeColor[c.type] }}>
                          {typeLabel[c.type]||c.type}
                        </span>
                        <span style={{ fontSize:12,color:'var(--text-secondary)',lineHeight:1.5 }}>{c.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Nav item ─────────────────────────────────────────────────────────────
function NavItem({ to, icon, label, badge, minRole, userRole, end }) {
  if (minRole && !canAccess(userRole, minRole)) return null;
  return (
    <NavLink to={to} end={end} className="no-drag" style={({ isActive }) => ({
      display: 'flex', alignItems: 'center', gap: 9,
      padding: '7px 10px', borderRadius: 7,
      margin: '1px 6px', cursor: 'pointer',
      textDecoration: 'none', fontSize: 13, fontWeight: 500,
      transition: 'all 0.12s',
      background: isActive ? 'var(--accent)' : 'transparent',
      color: isActive ? '#fff' : 'var(--text-secondary)',
      boxShadow: isActive ? '0 1px 8px var(--accent-glow)' : 'none',
    })}>
      <span style={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: 0.9 }}>
        {icon}
      </span>
      <span style={{ flex: 1, lineHeight: 1 }}>{label}</span>
      {badge > 0 && (
        <span style={{ background: 'var(--red)', color: '#fff', borderRadius: 10, fontSize: 10, fontWeight: 700, padding: '1px 5px', minWidth: 16, textAlign: 'center' }}>
          {badge}
        </span>
      )}
    </NavLink>
  );
}

// ── Section divider ───────────────────────────────────────────────────────
function NavSection({ label, children }) {
  return (
    <div style={{ marginBottom: 2 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-tertiary)', padding: '10px 16px 3px', opacity: 0.7 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

// ── Main AppShell ─────────────────────────────────────────────────────────
export default function AppShell({ theme, onThemeChange }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [lowFilament, setLowFilament]       = useState(0);
  const [pendingOrders, setPendingOrders]   = useState(0);
  const [updateInfo, setUpdateInfo]         = useState(null);
  const [updateDismissed, setUpdateDismissed] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [showReleaseNotes, setShowReleaseNotes] = useState(false);
  const [releaseNotesVersion, setReleaseNotesVersion] = useState(null);
  const isMac = window.printflow.platform === 'darwin';
  const role  = user?.role || 'operator';

  // Global keyboard shortcuts
  useEffect(() => {
    function handleKey(e) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      switch (e.key) {
        case '1': e.preventDefault(); navigate('/'); break;
        case '2': e.preventDefault(); navigate('/orders'); break;
        case '3': e.preventDefault(); navigate('/queue'); break;
        case '4': e.preventDefault(); navigate('/printers'); break;
        case '5': e.preventDefault(); navigate('/filament'); break;
        default: break;
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [navigate]);

  useEffect(() => {
    const u1 = onSocketEvent('filament:updated', s => { if (s.is_low) setLowFilament(n => n + 1); });
    const u2 = onSocketEvent('order:created', () => setPendingOrders(n => n + 1));
    return () => { u1(); u2(); };
  }, []);

  useEffect(() => {
    setTimeout(async () => {
      try {
        const result = await window.printflow.checkForUpdates();
        if (result.updateAvailable) setUpdateInfo(result);
      } catch {}
    }, 5000);
  }, []);

  async function checkForUpdatesManual() {
    setCheckingUpdate(true);
    try {
      const result = await window.printflow.checkForUpdates();
      if (result.updateAvailable) { setUpdateInfo(result); setUpdateDismissed(false); }
      else if (result.error) alert('Could not check for updates: ' + result.error);
      else alert(`PrintFlow is up to date (v${result.currentVersion})`);
    } catch { alert('Could not check for updates.'); }
    setCheckingUpdate(false);
  }

  async function downloadUpdate() {
    if (!updateInfo) return;
    const onTailscale = updateInfo.serverUsed?.includes('100.68.105.76');
    const url = isMac
      ? (onTailscale ? updateInfo.macUrlRemote : updateInfo.macUrl) || updateInfo.macUrl
      : (onTailscale ? updateInfo.winUrlRemote : updateInfo.winUrl) || updateInfo.winUrl;
    if (url) await window.printflow.downloadUpdate(url);
    else alert('Download URL not available.');
  }

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    onThemeChange(next); window.printflow.setTheme(next);
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <aside style={{
        width: 216, flexShrink: 0, display: 'flex', flexDirection: 'column',
        background: 'var(--bg-sidebar)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
        borderRight: '0.5px solid var(--border)', paddingTop: isMac ? 44 : 36, overflow: 'hidden',
      }}>

        {/* Brand */}
        <div style={{ padding: '0 16px 12px', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px var(--accent-glow)', overflow: 'hidden' }}>
            <img src="./icon.png" alt="" style={{ width: 30, height: 30, borderRadius: 8 }}
              onError={e => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <svg style={{ display: 'none', width: 20, height: 20 }} viewBox="0 0 80 80" fill="none">
              <rect x="8"  y="12" width="6"  height="40" rx="3" fill="white" opacity="0.6"/>
              <rect x="66" y="12" width="6"  height="40" rx="3" fill="white" opacity="0.6"/>
              <rect x="8"  y="10" width="64" height="8"  rx="4" fill="white" opacity="0.8"/>
              <rect x="31" y="12" width="18" height="11" rx="3" fill="white"/>
              <path d="M37 23 L40 30 L43 23 Z" fill="white"/>
              <rect x="27" y="48" width="26" height="5"  rx="2" fill="white" opacity="0.7"/>
              <rect x="29" y="43" width="22" height="6"  rx="2" fill="white" opacity="0.55"/>
              <rect x="10" y="57" width="60" height="8"  rx="3" fill="white" opacity="0.7"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.2 }}>PrintFlow</div>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'capitalize', lineHeight: 1.4 }}>v1.1.1 · {role}</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', paddingTop: 6, paddingBottom: 4 }}>

          {/* Main — always visible */}
          <div style={{ padding: '4px 6px' }}>
            <NavItem to="/" end icon={Icons.dashboard} label="Dashboard" userRole={role} />
          </div>

          <NavSection label="Work">
            <NavItem to="/orders"    icon={Icons.orders}    label="Orders"    badge={pendingOrders} userRole={role} />
            <NavItem to="/queue"     icon={Icons.queue}     label="Job Queue"  userRole={role} />
            <NavItem to="/history"   icon={Icons.history}   label="Print History" userRole={role} />
            <NavItem to="/customers" icon={Icons.customers} label="Customers"  userRole={role} />
            <NavItem to="/quotes"    icon={Icons.quotes}    label="Quotes & Invoices" minRole="manager" userRole={role} />
          </NavSection>

          <NavSection label="Production">
            <NavItem to="/printers"  icon={Icons.printer}   label="Printers"   userRole={role} />
            <NavItem to="/filament"  icon={Icons.filament}  label="Filament"   badge={lowFilament} userRole={role} />
            <NavItem to="/parts"     icon={Icons.parts}     label="Parts"      userRole={role} />
            <NavItem to="/models"    icon={Icons.models}    label="Models"     userRole={role} />
          </NavSection>

          <NavSection label="Business">
            <NavItem to="/finance"   icon={Icons.finance}   label="Finance"    minRole="manager" userRole={role} />
            <NavItem to="/shipping"  icon={Icons.shipping}  label="Shipping"   minRole="manager" userRole={role} />
            <NavItem to="/marketing" icon={Icons.marketing} label="Marketing"  minRole="manager" userRole={role} />
          </NavSection>

          <NavSection label="System">
            <NavItem to="/settings" icon={Icons.settings} label="Settings" userRole={role} />
            <NavItem to="/help"     icon={Icons.help}     label="Help & Support" userRole={role} />
            <NavItem to="/users"    icon={Icons.users}    label="Users"    minRole="owner" userRole={role} />
          </NavSection>
        </nav>

        {/* Update banner */}
        {updateInfo && !updateDismissed && (
          <div style={{ margin: '4px 8px', padding: '12px', background: 'linear-gradient(135deg,rgba(0,113,227,0.15),rgba(0,113,227,0.05))', borderRadius: 8, border: '0.5px solid rgba(0,113,227,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>Update Available</div>
              <button onClick={() => setUpdateDismissed(true)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 12, padding: 0 }}>✕</button>
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>v{updateInfo.latestVersion}</div>
            {CHANGELOG.find(c => c.version === updateInfo.latestVersion)?.title && (
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.4 }}>
                {CHANGELOG.find(c => c.version === updateInfo.latestVersion)?.title}
              </div>
            )}
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center', fontSize: 11 }} onClick={downloadUpdate}>
                ↓ Download
              </button>
              <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--accent)' }}
                onClick={() => { setReleaseNotesVersion(updateInfo.latestVersion); setShowReleaseNotes(true); }}>
                Notes
              </button>
            </div>
          </div>
        )}

        {/* User footer */}
        <div style={{ padding: '8px 10px', borderTop: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
            {user?.name?.slice(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>{user?.name}</div>
            <button className="btn btn-ghost no-drag" onClick={checkForUpdatesManual} disabled={checkingUpdate}
              style={{ fontSize: 10, color: 'var(--text-tertiary)', padding: 0, height: 'auto', gap: 3, lineHeight: 1.3 }}>
              {checkingUpdate ? 'Checking…' : '↻ Check for updates'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn btn-ghost btn-icon no-drag" onClick={toggleTheme} title="Toggle theme" style={{ padding: 4, fontSize: 13 }}>
              {theme === 'dark' ? '☀' : '☾'}
            </button>
            <button className="btn btn-ghost btn-icon no-drag" title="About & Release Notes"
              onClick={() => { setReleaseNotesVersion(null); setShowReleaseNotes(true); }}
              style={{ padding: 4, fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)' }}>i</button>
            <button className="btn btn-ghost btn-icon no-drag" onClick={async () => { await logout(); navigate('/login'); }} title="Sign out" style={{ padding: 4 }}>
              {Icons.logout}
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main area ──────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Titlebar */}
        <header className="drag-region" style={{
          height: isMac ? 44 : 36, flexShrink: 0,
          background: 'var(--titlebar-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center',
          paddingLeft: isMac ? 0 : 12, paddingRight: 8,
        }}>
          {!isMac && (
            <>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600, marginLeft: 4 }}>PrintFlow</span>
              <div style={{ flex: 1 }} />
              <div className="no-drag" style={{ display: 'flex' }}>
                {[{ l: '─', a: () => window.printflow.minimizeWindow() }, { l: '□', a: () => window.printflow.maximizeWindow() }, { l: '✕', a: () => window.printflow.closeWindow(), d: true }].map(({ l, a, d }) => (
                  <button key={l} onClick={a} style={{ width: 46, height: 36, border: 'none', background: 'transparent', color: d ? 'var(--red)' : 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.target.style.background = d ? 'var(--red)' : 'var(--bg-hover)'}
                    onMouseLeave={e => e.target.style.background = 'transparent'}>{l}</button>
                ))}
              </div>
            </>
          )}
          {isMac && <div style={{ flex: 1 }} />}
        </header>
        <main style={{ flex: 1, overflow: 'hidden' }}>
          <Outlet />
        </main>
      </div>

      {/* Release Notes Modal */}
      {showReleaseNotes && (
        <ReleaseNotesModal
          onClose={() => setShowReleaseNotes(false)}
          highlightVersion={releaseNotesVersion}
        />
      )}
    </div>
  );
}
