import React, { useEffect, useState, useCallback, useRef } from 'react';
import { api, getServerUrl } from '../api/client';
import { onSocketEvent } from '../api/socket';
import { useAuthStore } from '../stores/authStore';

function Modal({ title, onClose, children, width=480 }) {
  return (
    <div style={{ position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center' }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="card" style={{ width,maxHeight:'90vh',overflowY:'auto',padding:28,animation:'fadeIn 0.2s ease' }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20 }}>
          <h2 style={{ fontSize:18 }}>{title}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>x</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function StatusDot({ status }) {
  const c = status==='printing'?'var(--green)':status==='paused'?'var(--amber)':status==='error'?'var(--red)':status==='idle'?'var(--accent)':'var(--text-tertiary)';
  return <div style={{ width:10,height:10,borderRadius:'50%',background:c,boxShadow:`0 0 6px ${c}`,flexShrink:0 }}/>;
}

// ── Camera Feed Component ───────────────────────────────────────────
function CameraFeed({ printer, token }) {
  const [streaming, setStreaming] = useState(false);
  const [error, setError]         = useState(null);
  const [loading, setLoading]     = useState(false);
  const imgRef = useRef(null);

  const serverUrl = getServerUrl();
  const streamUrl = `${serverUrl}/api/camera/${printer.serial}/stream`;

  // Camera may use different IP/access code if configured separately
  const cameraIp = printer.camera_ip || printer.ip_address;
  const cameraCode = printer.camera_access_code || printer.access_code;
  const hasCamera = !!(cameraIp && cameraCode);

  function startStream() {
    setLoading(true);
    setError(null);
    setStreaming(true);
  }

  function stopStream() {
    setStreaming(false);
    setError(null);
    // Tell server to kill the ffmpeg process
    api.delete(`/api/camera/${printer.serial}/stream`).catch(()=>{});
  }

  function handleImgLoad() {
    setLoading(false);
  }

  function handleImgError() {
    setLoading(false);
    setError('Could not connect to camera. Make sure:\n• LAN Mode Liveview is enabled on the printer\n• The printer IP and access code are correct\n• ffmpeg is installed on the server');
    setStreaming(false);
  }

  // Clean up stream when component unmounts
  useEffect(() => {
    return () => {
      if (streaming) {
        api.delete(`/api/camera/${printer.serial}/stream`).catch(()=>{});
      }
    };
  }, [streaming, printer.serial]);

  return (
    <div style={{ marginTop: 12 }}>
      {!streaming ? (
        <button
          className="btn btn-ghost btn-sm"
          onClick={e => { e.stopPropagation(); startStream(); }}
          style={{ fontSize: 11, color: 'var(--accent)', gap: 5, width: '100%', justifyContent: 'center', border: '0.5px solid var(--accent)', borderRadius: 'var(--r-sm)', padding: '6px 0' }}
        >
          📹 View Camera
        </button>
      ) : (
        <div style={{ position: 'relative', borderRadius: 'var(--r-sm)', overflow: 'hidden', background: '#000' }}>
          {/* Loading overlay */}
          {loading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', zIndex: 1, gap: 8 }}>
              <div style={{ width: 24, height: 24, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Connecting to camera...</div>
            </div>
          )}

          {/* MJPEG stream — displayed as a regular img tag */}
          <img
            ref={imgRef}
            src={`${streamUrl}?token=${encodeURIComponent(token)}&t=${Date.now()}`}
            alt={`${printer.name} camera`}
            onLoad={handleImgLoad}
            onError={handleImgError}
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', display: 'block', maxHeight: 240, objectFit: 'cover' }}
          />

          {/* Controls overlay */}
          <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 4 }}>
            <button
              onClick={e => { e.stopPropagation(); window.printflow.openExternal(`${streamUrl}?token=${encodeURIComponent(token)}`); }}
              style={{ background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', borderRadius: 4, padding: '3px 7px', fontSize: 10, cursor: 'pointer' }}
              title="Open fullscreen"
            >
              ⛶
            </button>
            <button
              onClick={e => { e.stopPropagation(); stopStream(); }}
              style={{ background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', borderRadius: 4, padding: '3px 7px', fontSize: 10, cursor: 'pointer' }}
            >
              ✖ Stop
            </button>
          </div>

          {/* LIVE badge */}
          <div style={{ position: 'absolute', top: 6, left: 6, background: 'var(--red)', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, letterSpacing: '0.05em' }}>
            LIVE
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div style={{ marginTop: 6, padding: '8px 10px', background: 'var(--red-light)', borderRadius: 'var(--r-sm)', fontSize: 11, color: 'var(--red)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
          {error}
        </div>
      )}

      {/* Setup hint */}
      {!streaming && !error && (
        <div style={{ marginTop: 4, fontSize: 10, color: 'var(--text-tertiary)', textAlign: 'center', lineHeight: 1.5 }}>
          Enable “LAN Mode Liveview” in printer settings first
        </div>
      )}
    </div>
  );
}

// ── Cloud Login Modal ──────────────────────────────────────────────
function CloudLoginModal({ onClose, onSuccess }) {
  const [step, setStep]         = useState('login'); // 'login' | 'verify' | 'done'
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [err, setErr]           = useState('');
  const [msg, setMsg]           = useState('');

  async function doLogin() {
    setLoading(true); setErr('');
    try {
      const r = await api.post('/api/bambu/cloud/login', { email, password });
      if (r.data.noTfa) { setStep('done'); setMsg('Connected to Bambu Cloud!'); onSuccess(); }
      else { setStep('verify'); setMsg(`Check ${email} for your 6-digit code.`); }
    } catch(e) { setErr(e.response?.data?.error||'Login failed'); }
    finally { setLoading(false); }
  }

  async function doVerify() {
    setLoading(true); setErr('');
    try {
      await api.post('/api/bambu/cloud/verify', { code });
      setStep('done'); setMsg('Bambu Cloud connected!'); onSuccess();
    } catch(e) { setErr(e.response?.data?.error||'Invalid code'); }
    finally { setLoading(false); }
  }

  return (
    <Modal title="Connect Bambu Cloud" width={440} onClose={onClose}>
      {step==='done' ? (
        <div style={{ textAlign:'center',padding:'20px 0' }}>
          <div style={{ fontSize:48,marginBottom:12 }}>✅</div>
          <div style={{ fontSize:15,fontWeight:600,marginBottom:8 }}>Bambu Cloud Connected</div>
          <div style={{ fontSize:13,color:'var(--text-secondary)',marginBottom:20 }}>{msg}</div>
          <button className="btn btn-primary" style={{ width:'100%',justifyContent:'center' }} onClick={onClose}>Done</button>
        </div>
      ) : step==='verify' ? (
        <div>
          <div style={{ fontSize:13,color:'var(--text-secondary)',marginBottom:16,padding:'10px 14px',background:'var(--accent-light)',borderRadius:'var(--r-sm)' }}>
            {msg} Enter the 6-digit code below.
          </div>
          <div className="form-group">
            <label className="label">Verification Code</label>
            <input className="input" value={code} onChange={e=>setCode(e.target.value)} placeholder="123456" style={{ fontFamily:'monospace',fontSize:20,textAlign:'center',letterSpacing:'0.2em' }} autoFocus maxLength={6} />
          </div>
          {err && <div style={{ color:'var(--red)',fontSize:12,marginBottom:8 }}>{err}</div>}
          <div style={{ display:'flex',gap:8 }}>
            <button className="btn btn-secondary" onClick={()=>setStep('login')}>Back</button>
            <button className="btn btn-primary" style={{ flex:1,justifyContent:'center' }} onClick={doVerify} disabled={loading||code.length<6}>
              {loading?'Verifying...':'Verify'}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ fontSize:13,color:'var(--text-secondary)',marginBottom:16 }}>
            Sign in with your Bambu Lab account to enable Cloud Mode. A verification code will be sent to your email.
          </div>
          <div style={{ padding:'10px 14px',background:'var(--amber-light)',borderRadius:'var(--r-sm)',fontSize:12,color:'var(--amber)',marginBottom:16,lineHeight:1.5 }}>
            <strong>Note:</strong> Cloud Mode uses Bambu's unofficial API (reverse-engineered by the community). It may break with firmware updates. LAN Mode remains the most stable option for local use.
          </div>
          <div className="form-group"><label className="label">Bambu Account Email</label><input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} autoFocus /></div>
          <div className="form-group"><label className="label">Password</label><input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} /></div>
          {err && <div style={{ color:'var(--red)',fontSize:12,marginBottom:8 }}>{err}</div>}
          <div style={{ display:'flex',gap:8 }}>
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" style={{ flex:1,justifyContent:'center' }} onClick={doLogin} disabled={loading||!email||!password}>
              {loading?'Sending code...':'Send Verification Code'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

const BLANK = { name:'',model:'P1S',serial:'',ip_address:'',access_code:'',has_ams:true,ams_count:4,notes:'',camera_ip:'',camera_access_code:'' };

export default function PrintersPage() {
  const [printers,setPrinters] = useState([]);
  const [liveStates,setLiveStates] = useState({});
  const [loading,setLoading]   = useState(true);
  const [showAdd,setShowAdd]   = useState(false);
  const [form,setForm]         = useState(BLANK);
  const [saving,setSaving]     = useState(false);
  const [err,setErr]           = useState('');
  const [selected,setSelected] = useState(null);
  const { user } = useAuthStore();
  const isOwner = user?.role === 'owner';
  const token = useAuthStore(s => s.token);

  const load = useCallback(async()=>{
    try {
      const r = await api.get('/api/printers');
      setPrinters(r.data);
      // Load live states
      const ls = await api.get('/api/bambu/status').catch(()=>({data:{}}));
      setLiveStates(ls.data||{});
    } catch {}
    finally { setLoading(false); }
  },[]);

  useEffect(()=>{
    load();
    const u1=onSocketEvent('printer:status',s=>setLiveStates(p=>({...p,[s.serial]:s})));
    const u2=onSocketEvent('printer:registered',()=>load());
    const u3=onSocketEvent('printer:tray_updated',()=>load());
    return()=>{u1();u2();u3();};
  },[load]);

  async function addPrinter() {
    setSaving(true); setErr('');
    try {
      await api.post('/api/printers',{
        name:form.name, model:form.model, serial:form.serial.trim(),
        ip_address:form.ip_address.trim(), access_code:form.access_code.trim(),
        has_ams:form.has_ams, ams_count:parseInt(form.ams_count)||0, notes:form.notes,
        camera_ip: form.camera_ip?.trim() || null,
        camera_access_code: form.camera_access_code?.trim() || null,
      });
      // Connect via MQTT
      await api.post(`/api/bambu/connect/${form.serial.trim()}`).catch(()=>{});
      setShowAdd(false); setForm(BLANK); await load();
    } catch(e) { setErr(e.response?.data?.error||'Failed to add printer'); }
    finally { setSaving(false); }
  }

  async function removePrinter(printer) {
    if(!window.confirm(`Remove "${printer.name}" from PrintFlow?\n\nThe printer will be disconnected and removed from your dashboard. This does not affect the printer itself.`)) return;
    try {
      await api.delete(`/api/printers/${printer.id}`);
      setSelected(null); await load();
    } catch(e) { alert(e.response?.data?.error||'Failed to remove printer'); }
  }

  async function sendCommand(serial, cmd) {
    try { await api.post(`/api/bambu/${serial}/${cmd}`); }
    catch(e) { alert(`Command failed: ${e.response?.data?.error||e.message}`); }
  }

  const F = k => ({ value:form[k]??'', onChange:e=>setForm(f=>({...f,[k]:e.target.value})) });

  return (
    <div style={{ height:'100%',overflowY:'auto',padding:24 }}>
      <div style={{ maxWidth:1200,margin:'0 auto' }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20 }}>
          <div>
            <h1>Printers</h1>
            <p style={{ color:'var(--text-secondary)',fontSize:13,marginTop:4 }}>Live status for your Bambu Lab P1S and H2D</p>
          </div>
          {isOwner && <button className="btn btn-primary" onClick={()=>{setShowAdd(true);setForm(BLANK);setErr('');}}>
            <svg width="14" height="14" viewBox="0 0 80 80" fill="none" style={{ marginRight:6 }}>
              <rect x="8"  y="12" width="6"  height="40" rx="3" fill="currentColor" opacity="0.7" />
              <rect x="66" y="12" width="6"  height="40" rx="3" fill="currentColor" opacity="0.7" />
              <rect x="8"  y="10" width="64" height="8"  rx="4" fill="currentColor" />
              <rect x="31" y="12" width="18" height="11" rx="3" fill="currentColor" />
              <path d="M37 23 L40 30 L43 23 Z" fill="currentColor" />
              <rect x="27" y="46" width="26" height="5"  rx="2" fill="currentColor" opacity="0.75" />
              <rect x="29" y="41" width="22" height="6"  rx="2" fill="currentColor" opacity="0.6" />
              <rect x="16" y="53" width="48" height="4"  rx="2" fill="currentColor" opacity="0.5" />
              <rect x="10" y="57" width="60" height="8"  rx="3" fill="currentColor" opacity="0.75" />
            </svg>
            Add Printer
          </button>}
        </div>

        {/* Printer grid */}
        {loading ? <div style={{ color:'var(--text-secondary)',padding:32 }}>Loading...</div> : (
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:16,marginBottom:24 }}>
            {printers.map(p=>{
              const live = liveStates[p.serial] || {};
              const status = live.status || 'offline';
              const pct = live.print_pct || 0;
              const isActive = ['printing','paused','preparing'].includes(status);
              return (
                <div key={p.id} className="card" style={{ padding:20,cursor:'pointer' }} onClick={()=>setSelected(p)}>
                  <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:14 }}>
                    <StatusDot status={status} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:15,fontWeight:700 }}>{p.name}</div>
                      <div style={{ fontSize:12,color:'var(--text-secondary)' }}>{p.model} · {p.serial}</div>
                    </div>
                    <span className={`pill ${status==='printing'?'pill-green':status==='paused'?'pill-amber':status==='error'?'pill-red':status==='idle'?'pill-blue':'pill-grey'}`}>
                      {status}
                    </span>
                  </div>

                  {isActive && (
                    <div style={{ marginBottom:14 }}>
                      <div style={{ display:'flex',justifyContent:'space-between',fontSize:12,color:'var(--text-secondary)',marginBottom:4 }}>
                        <span style={{ overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'70%' }}>{live.filename||'Printing...'}</span>
                        <span style={{ fontWeight:600,color:'var(--accent)',flexShrink:0 }}>{pct}%</span>
                      </div>
                      <div className="progress"><div className="progress-fill" style={{ width:`${pct}%`,background:'var(--green)' }}/></div>
                      {live.eta_min>0 && <div style={{ fontSize:11,color:'var(--text-tertiary)',marginTop:4 }}>ETA: ~{Math.round(live.eta_min)} min · Layer {live.layer_num}/{live.total_layer_num}</div>}
                    </div>
                  )}

                  {/* Temperature row */}
                  <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:14 }}>
                    {[['Nozzle',live.nozzle_temp,live.nozzle_target,'var(--red)'],['Bed',live.bed_temp,live.bed_target,'var(--amber)'],['Chamber',live.chamber_temp,null,'var(--blue)']].map(([l,t,tgt,c])=>(
                      <div key={l} style={{ padding:'8px 10px',background:'var(--bg-hover)',borderRadius:'var(--r-sm)',textAlign:'center' }}>
                        <div style={{ fontSize:10,color:'var(--text-tertiary)',marginBottom:2 }}>{l}</div>
                        <div style={{ fontSize:14,fontWeight:700,color:t>0?c:'var(--text-tertiary)' }}>{t||0}°C</div>
                        {tgt>0 && <div style={{ fontSize:10,color:'var(--text-tertiary)' }}>/{tgt}°C</div>}
                      </div>
                    ))}
                  </div>

                  {/* Controls */}
                  {isOwner && isActive && (
                    <div style={{ display:'flex',gap:6 }}>
                      {status==='printing' && <button className="btn btn-secondary btn-sm" onClick={e=>{e.stopPropagation();sendCommand(p.serial,'pause');}}>Pause</button>}
                      {status==='paused'   && <button className="btn btn-primary btn-sm"   onClick={e=>{e.stopPropagation();sendCommand(p.serial,'resume');}}>Resume</button>}
                      <button className="btn btn-danger btn-sm" onClick={e=>{e.stopPropagation();if(window.confirm('Stop print?'))sendCommand(p.serial,'stop');}}>Stop</button>
                    </div>
                  )}

                  {/* AMS trays */}
                  {p.trays?.length>0 && (
                    <div style={{ marginTop:12 }}>
                      <div style={{ fontSize:11,color:'var(--text-tertiary)',marginBottom:6,fontWeight:600 }}>AMS</div>
                      <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
                        {p.trays.map(t=>(
                          <div key={`${t.ams_unit}-${t.tray_index}`} title={`${t.material||'Empty'} — ${t.color_name||t.color_hex||'No spool'}`}
                            style={{ width:22,height:22,borderRadius:'50%',background:t.spool_color||t.color_hex||'var(--bg-hover)',border:'1.5px solid rgba(255,255,255,0.2)',flexShrink:0 }}/>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Camera feed */}
                  <CameraFeed printer={p} token={token} />

                  {/* Remove button - small, bottom right */}
                  {isOwner && (
                    <div style={{ marginTop:12,display:'flex',justifyContent:'flex-end' }}>
                      <button className="btn btn-ghost btn-sm" style={{ fontSize:11,color:'var(--text-tertiary)' }}
                        onClick={e=>{e.stopPropagation();removePrinter(p);}}>
                        Remove printer
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {isOwner && (
              <div className="card interactive" onClick={()=>{setShowAdd(true);setForm(BLANK);setErr('');}}
                style={{ padding:24,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:10,border:'0.5px dashed var(--border-strong)',background:'transparent',minHeight:180 }}>
                <svg width="40" height="40" viewBox="0 0 80 80" fill="none" style={{ opacity:0.4 }}>
                  <rect x="8"  y="12" width="6"  height="40" rx="3" fill="currentColor" />
                  <rect x="66" y="12" width="6"  height="40" rx="3" fill="currentColor" />
                  <rect x="8"  y="10" width="64" height="8"  rx="4" fill="currentColor" />
                  <rect x="31" y="12" width="18" height="11" rx="3" fill="currentColor" />
                  <path d="M37 23 L40 30 L43 23 Z" fill="currentColor" />
                  <rect x="27" y="46" width="26" height="5"  rx="2" fill="currentColor" opacity="0.8" />
                  <rect x="29" y="41" width="22" height="6"  rx="2" fill="currentColor" opacity="0.65" />
                  <rect x="16" y="53" width="48" height="4"  rx="2" fill="currentColor" opacity="0.5" />
                  <rect x="10" y="57" width="60" height="8"  rx="3" fill="currentColor" />
                </svg>
                <span style={{ fontSize:13,color:'var(--text-tertiary)',fontWeight:500 }}>Add Printer</span>
                <span style={{ fontSize:11,color:'var(--text-tertiary)',textAlign:'center' }}>Connect a Bambu Lab P1S or H2D via LAN Mode</span>
              </div>
            )}
            {printers.length===0 && !isOwner && (
              <div style={{ gridColumn:'1/-1',textAlign:'center',padding:48,color:'var(--text-tertiary)' }}>No printers registered yet — ask your owner to add one.</div>
            )}
          </div>
        )}

        {/* LAN Mode help */}
        <div className="card" style={{ padding:16,marginBottom:14 }}>
          <div style={{ fontSize:13,fontWeight:600,marginBottom:8 }}>Connecting via LAN Mode</div>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12,fontSize:12,color:'var(--text-secondary)' }}>
            <div><strong style={{ color:'var(--text-primary)',display:'block',marginBottom:3 }}>1. Enable LAN Mode</strong>On the printer touchscreen: Settings → Network → LAN Mode → Enable</div>
            <div><strong style={{ color:'var(--text-primary)',display:'block',marginBottom:3 }}>2. Get the Access Code</strong>Settings → Network → LAN Mode → shows the 8-digit code</div>
            <div><strong style={{ color:'var(--text-primary)',display:'block',marginBottom:3 }}>3. Find the Serial Number</strong>Settings → Device → Serial Number (starts with P1P or X1C)</div>
            <div><strong style={{ color:'var(--text-primary)',display:'block',marginBottom:3 }}>4. Find the IP Address</strong>Settings → Network → IP Address — or check your router's DHCP list</div>
          </div>
        </div>
      </div>

      {/* Add Printer Modal */}
      {showAdd && (
        <Modal title="Add Printer" onClose={()=>setShowAdd(false)}>
          <div className="form-row">
            <div className="form-group"><label className="label">Printer Name</label><input className="input" {...F('name')} placeholder="e.g. P1S Left" autoFocus /></div>
            <div className="form-group"><label className="label">Model</label>
              <select className="select" {...F('model')}>
                <option>P1S</option><option>H2D</option><option>X1C</option><option>A1</option><option>A1 Mini</option>
              </select>
            </div>
          </div>
          <div className="form-group"><label className="label">Serial Number</label><input className="input" {...F('serial')} placeholder="e.g. 01P00A123456789" style={{ fontFamily:'monospace' }} /></div>
          <div className="form-row">
            <div className="form-group"><label className="label">IP Address</label><input className="input" {...F('ip_address')} placeholder="e.g. 10.0.0.150" style={{ fontFamily:'monospace' }} /></div>
            <div className="form-group"><label className="label">LAN Access Code</label><input className="input" {...F('access_code')} placeholder="8-digit code" style={{ fontFamily:'monospace' }} /></div>
          </div>
          <div className="form-row">
            <div className="form-group" style={{ display:'flex',alignItems:'center',gap:8,paddingTop:20 }}>
              <input type="checkbox" id="has_ams" checked={!!form.has_ams} onChange={e=>setForm(f=>({...f,has_ams:e.target.checked}))} style={{ width:16,height:16 }} />
              <label htmlFor="has_ams" style={{ fontSize:13,cursor:'pointer' }}>Has AMS unit</label>
            </div>
            {form.has_ams && (
              <div className="form-group"><label className="label">AMS Tray Count</label>
                <select className="select" {...F('ams_count')}><option value="4">4 trays (standard)</option><option value="8">8 trays (2x AMS)</option><option value="16">16 trays (4x AMS)</option></select>
              </div>
            )}
          </div>
          <div className="form-group"><label className="label">Notes (optional)</label><input className="input" {...F('notes')} placeholder="e.g. Located in workshop" /></div>
          <div style={{ fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-tertiary)',margin:'10px 0 6px',paddingTop:8,borderTop:'0.5px solid var(--border)' }}>Camera Settings (optional)</div>
          <div style={{ fontSize:12,color:'var(--text-secondary)',marginBottom:10,lineHeight:1.5 }}>
            Leave blank to use the same IP and access code as above. Only set these if your camera uses different credentials (e.g. H2C with separate camera IP).
          </div>
          <div className="form-row">
            <div className="form-group"><label className="label">Camera IP Address</label><input className="input" {...F('camera_ip')} placeholder="Same as printer IP" style={{ fontFamily:'monospace' }} /></div>
            <div className="form-group"><label className="label">Camera Access Code</label><input className="input" {...F('camera_access_code')} placeholder="Same as LAN code" style={{ fontFamily:'monospace' }} /></div>
          </div>
          {err && <div style={{ color:'var(--red)',fontSize:12,marginBottom:8 }}>{err}</div>}
          <div style={{ display:'flex',gap:8,justifyContent:'flex-end',marginTop:8 }}>
            <button className="btn btn-secondary" onClick={()=>setShowAdd(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={addPrinter} disabled={saving||!form.name||!form.serial||!form.ip_address||!form.access_code}>
              {saving?'Connecting...':'Add Printer'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
