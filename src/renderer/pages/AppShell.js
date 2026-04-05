import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { onSocketEvent } from '../api/socket';

const ROLES = { owner:3, manager:2, operator:1 };
function canAccess(userRole, minRole) { return (ROLES[userRole]||0) >= (ROLES[minRole]||0); }

// Inline 3D printer SVG for the nav
function PrinterNav() {
  return (
    <svg width="15" height="15" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink:0 }}>
      <rect x="8"  y="12" width="6"  height="40" rx="3" fill="currentColor" opacity="0.5" />
      <rect x="66" y="12" width="6"  height="40" rx="3" fill="currentColor" opacity="0.5" />
      <rect x="8"  y="10" width="64" height="8"  rx="4" fill="currentColor" opacity="0.65" />
      <rect x="31" y="12" width="18" height="11" rx="3" fill="currentColor" />
      <path d="M37 23 L40 30 L43 23 Z" fill="currentColor" />
      <rect x="27" y="48" width="26" height="5"  rx="2" fill="currentColor" opacity="0.7" />
      <rect x="29" y="43" width="22" height="6"  rx="2" fill="currentColor" opacity="0.55" />
      <rect x="31" y="39" width="18" height="5"  rx="2" fill="currentColor" opacity="0.4" />
      <rect x="16" y="53" width="48" height="4"  rx="2" fill="currentColor" opacity="0.4" />
      <rect x="10" y="57" width="60" height="8"  rx="3" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

function NavItem({ to, icon, label, badge, minRole, userRole, end }) {
  if (minRole && !canAccess(userRole, minRole)) return null;
  return (
    <NavLink to={to} end={end} className="no-drag" style={({ isActive })=>({
      display:'flex',alignItems:'center',gap:10,padding:'8px 12px',borderRadius:'var(--r-sm)',
      margin:'1px 8px',cursor:'pointer',textDecoration:'none',fontSize:13,fontWeight:500,
      transition:'all 0.15s',
      background:isActive?'var(--accent)':'transparent',
      color:isActive?'#fff':'var(--text-secondary)',
      boxShadow:isActive?'0 2px 12px var(--accent-glow)':'none',
    })}>
      <span style={{ width:18,height:18,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
        {typeof icon === 'string' ? <span style={{ fontSize:15 }}>{icon}</span> : icon}
      </span>
      <span style={{ flex:1 }}>{label}</span>
      {badge>0 && <span style={{ background:'var(--red)',color:'#fff',borderRadius:10,fontSize:10,fontWeight:700,padding:'1px 6px',minWidth:18,textAlign:'center' }}>{badge}</span>}
    </NavLink>
  );
}

function SidebarSection({ label, children }) {
  return (
    <div style={{ marginBottom:4 }}>
      <div style={{ fontSize:10,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'var(--text-tertiary)',padding:'8px 20px 3px' }}>{label}</div>
      {children}
    </div>
  );
}

export default function AppShell({ theme, onThemeChange }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [lowFilament, setLowFilament]   = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [updateInfo, setUpdateInfo]     = useState(null); // { latestVersion, macUrl, winUrl, releaseNotes }
  const [updateDismissed, setUpdateDismissed] = useState(false);
  const [checkingUpdate, setCheckingUpdate]   = useState(false);
  const isMac = window.printflow.platform === 'darwin';
  const role  = user?.role || 'operator';

  useEffect(() => {
    const u1 = onSocketEvent('filament:updated', s => { if(s.is_low) setLowFilament(n=>n+1); });
    const u2 = onSocketEvent('order:created', () => setPendingOrders(n=>n+1));
    return () => { u1(); u2(); };
  }, []);

  // Check for updates once on mount (silently)
  useEffect(() => {
    setTimeout(async () => {
      try {
        const result = await window.printflow.checkForUpdates();
        if (result.updateAvailable) setUpdateInfo(result);
      } catch {}
    }, 5000); // delay 5s so app loads first
  }, []);

  async function checkForUpdatesManual() {
    setCheckingUpdate(true);
    try {
      const result = await window.printflow.checkForUpdates();
      if (result.updateAvailable) {
        setUpdateInfo(result);
        setUpdateDismissed(false);
      } else if (result.error) {
        alert('Could not check for updates: ' + result.error);
      } else {
        alert(`PrintFlow is up to date (v${result.currentVersion})`);
      }
    } catch {
      alert('Could not check for updates. Make sure your server is reachable.');
    }
    setCheckingUpdate(false);
  }

  async function downloadUpdate() {
    if (!updateInfo) return;
    // Use remote URL if the update was found via Tailscale, otherwise LAN URL
    const onTailscale = updateInfo.serverUsed?.includes('100.68.105.76');
    const url = isMac
      ? (onTailscale ? updateInfo.macUrlRemote : updateInfo.macUrl) || updateInfo.macUrl
      : (onTailscale ? updateInfo.winUrlRemote : updateInfo.winUrl) || updateInfo.winUrl;
    if (url) await window.printflow.downloadUpdate(url);
    else alert('Download URL not available. Check that the release was published correctly.');
  }

  function toggleTheme() {
    const next = theme==='dark'?'light':'dark';
    onThemeChange(next); window.printflow.setTheme(next);
  }

  async function handleLogout() { await logout(); navigate('/login'); }

  return (
    <div style={{ display:'flex',height:'100vh',overflow:'hidden' }}>
      {/* Sidebar */}
      <aside style={{ width:220,flexShrink:0,display:'flex',flexDirection:'column',background:'var(--bg-sidebar)',backdropFilter:'blur(30px)',WebkitBackdropFilter:'blur(30px)',borderRight:'0.5px solid var(--border)',paddingTop:isMac?44:36,overflow:'hidden' }}>
        {/* Brand */}
        <div style={{ padding:'0 20px 14px',borderBottom:'0.5px solid var(--border)',display:'flex',alignItems:'center',gap:10 }}>
          <img src="/icon.png" alt="PrintFlow" style={{ width:32,height:32,borderRadius:9,flexShrink:0 }} onError={e=>{e.target.style.display='none';}} />
          <div>
            <div style={{ fontSize:13,fontWeight:700,letterSpacing:'-0.01em' }}>PrintFlow</div>
            <div style={{ fontSize:10,color:'var(--text-tertiary)',textTransform:'capitalize' }}>v1.0.5 · {role}</div>
          </div>
        </div>

        <nav style={{ flex:1,overflowY:'auto',paddingTop:8 }}>
          <SidebarSection label="Overview">
            <NavItem to="/" end icon="📊" label="Dashboard" userRole={role} />
          </SidebarSection>
          <SidebarSection label="Inventory">
            <NavItem to="/filament" icon="🧵" label="Filament"        badge={lowFilament} userRole={role} />
            <NavItem to="/parts"    icon="🔧" label="Parts & Supplies" userRole={role} />
          </SidebarSection>
          <SidebarSection label="Operations">
            <NavItem to="/orders"   icon="📦" label="Orders"    badge={pendingOrders} userRole={role} />
            <NavItem to="/printers" icon={<PrinterNav />} label="Printers"   userRole={role} />
            <NavItem to="/shipping" icon="🚚" label="Shipping"   minRole="manager" userRole={role} />
            <NavItem to="/vendors"  icon="🛒" label="Vendors"    userRole={role} />
          </SidebarSection>
          <SidebarSection label="Create">
            <NavItem to="/models" icon="🌐" label="Models"  userRole={role} />
            <NavItem to="/design" icon="✏️" label="Design"  userRole={role} />
          </SidebarSection>
          <SidebarSection label="Finance">
            <NavItem to="/finance"   icon="💰" label="Revenue & Expenses" minRole="manager" userRole={role} />
            <NavItem to="/tax"       icon="🧾" label="Tax Manager"         minRole="owner"   userRole={role} />
            <NavItem to="/marketing" icon="📣" label="Marketing"           minRole="manager" userRole={role} />
          </SidebarSection>
          <SidebarSection label="Admin">
            <NavItem to="/users"     icon="👥" label="Users"     minRole="owner" userRole={role} />
            <NavItem to="/changelog" icon="📋" label="Changelog" userRole={role} />
            <NavItem to="/settings"  icon="⚙️" label="Settings"  userRole={role} />
          </SidebarSection>
        </nav>

        {/* Update notification banner */}
        {updateInfo && !updateDismissed && (
          <div style={{ margin:'8px 8px 0',padding:'10px 12px',background:'linear-gradient(135deg,rgba(0,113,227,0.15),rgba(0,113,227,0.05))',borderRadius:'var(--r-sm)',border:'0.5px solid rgba(0,113,227,0.3)' }}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6 }}>
              <div style={{ fontSize:11,fontWeight:700,color:'var(--accent)' }}>Update Available</div>
              <button onClick={()=>setUpdateDismissed(true)} style={{ background:'none',border:'none',color:'var(--text-tertiary)',cursor:'pointer',fontSize:13,padding:0,lineHeight:1 }}>✕</button>
            </div>
            <div style={{ fontSize:11,color:'var(--text-secondary)',marginBottom:8 }}>v{updateInfo.latestVersion} is ready to download</div>
            <button className="btn btn-primary btn-sm" style={{ width:'100%',justifyContent:'center',fontSize:11 }} onClick={downloadUpdate}>
              ⬇ Download v{updateInfo.latestVersion}
            </button>
          </div>
        )}

        {/* Check for updates button */}
        <div style={{ padding:'6px 8px' }}>
          <button className="btn btn-ghost btn-sm no-drag" onClick={checkForUpdatesManual} disabled={checkingUpdate}
            style={{ width:'100%',justifyContent:'center',fontSize:11,color:'var(--text-tertiary)',gap:6 }}>
            {checkingUpdate
              ? <><span style={{ width:10,height:10,border:'1.5px solid rgba(255,255,255,0.2)',borderTopColor:'var(--text-tertiary)',borderRadius:'50%',animation:'spin 0.8s linear infinite',display:'inline-block' }} /> Checking…</>
              : '↻ Check for Updates'
            }
          </button>
        </div>

        {/* User footer */}
        <div style={{ padding:'10px 12px',borderTop:'0.5px solid var(--border)',display:'flex',alignItems:'center',gap:8 }}>
          <div style={{ width:30,height:30,borderRadius:'50%',flexShrink:0,background:'var(--accent-light)',color:'var(--accent)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700 }}>
            {user?.name?.slice(0,2).toUpperCase()}
          </div>
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ fontSize:12,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{user?.name}</div>
            <div style={{ fontSize:10,color:'var(--text-tertiary)',textTransform:'capitalize' }}>{role}</div>
          </div>
          <button className="btn btn-ghost btn-icon no-drag" onClick={handleLogout} title="Sign out" style={{ padding:5 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div style={{ flex:1,display:'flex',flexDirection:'column',overflow:'hidden' }}>
        {/* Titlebar */}
        <header className="drag-region" style={{ height:isMac?44:36,flexShrink:0,background:'var(--titlebar-bg)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',borderBottom:'0.5px solid var(--border)',display:'flex',alignItems:'center',paddingLeft:isMac?0:12,paddingRight:8,gap:8 }}>
          {!isMac && (
            <>
              <span style={{ fontSize:12,color:'var(--text-tertiary)',fontWeight:600,marginLeft:4 }}>PrintFlow</span>
              <div style={{ flex:1 }}/>
              <div className="no-drag" style={{ display:'flex',gap:0 }}>
                {[{l:'─',a:()=>window.printflow.minimizeWindow()},{l:'□',a:()=>window.printflow.maximizeWindow()},{l:'✕',a:()=>window.printflow.closeWindow(),d:true}].map(({l,a,d})=>(
                  <button key={l} onClick={a} style={{ width:46,height:36,border:'none',background:'transparent',color:d?'var(--red)':'var(--text-secondary)',fontSize:13,cursor:'pointer',fontFamily:'var(--font)',transition:'background 0.1s' }}
                    onMouseEnter={e=>e.target.style.background=d?'var(--red)':'var(--bg-hover)'}
                    onMouseLeave={e=>e.target.style.background='transparent'}>{l}</button>
                ))}
              </div>
            </>
          )}
          {isMac && <div style={{ flex:1 }}/>}
          <div className="no-drag" style={{ marginRight:isMac?8:0 }}>
            <button className="btn btn-ghost btn-sm" onClick={toggleTheme} style={{ gap:5 }}>
              {theme==='dark'?'☀️':'🌙'}
              <span style={{ fontSize:12 }}>{theme==='dark'?'Light':'Dark'}</span>
            </button>
          </div>
        </header>
        <main style={{ flex:1,overflow:'hidden' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
