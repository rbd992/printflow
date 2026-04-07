import React, { useEffect, useState, useCallback, useRef } from 'react';
import { api, getServerUrl } from '../api/client';
import { onSocketEvent } from '../api/socket';
import { useAuthStore } from '../stores/authStore';

// ── Helpers ──────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, width=480 }) {
  return (
    <div style={{ position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center' }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="card" style={{ width,maxHeight:'90vh',overflowY:'auto',padding:28,animation:'fadeIn 0.2s ease' }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20 }}>
          <h2 style={{ fontSize:18 }}>{title}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
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

// ── Printer form — defined OUTSIDE the page component to avoid remount bugs ——
function PrinterForm({ form, setForm, isEdit }) {
  const F = k => ({ value: form[k] ?? '', onChange: e => setForm(f => ({ ...f, [k]: e.target.value })) });
  const connType = form.connection_type || 'bambu_lan';
  const isBambu  = connType.startsWith('bambu');
  const isOcto   = connType === 'octoprint';
  const isKlipper = connType === 'klipper';
  const isGeneric = connType === 'generic';

  return (
    <>
      <div className="form-row">
        <div className="form-group">
          <label className="label">Printer Name</label>
          <input className="input" {...F('name')} placeholder="e.g. Ender 3 Pro" autoFocus />
        </div>
        <div className="form-group">
          <label className="label">Connection Type</label>
          <select className="select" value={connType}
            onChange={e => setForm(f => ({ ...f, connection_type: e.target.value }))}>
            <option value="bambu_lan">Bambu Lab (LAN Mode)</option>
            <option value="bambu_cloud">Bambu Lab (Cloud)</option>
            <option value="octoprint">OctoPrint</option>
            <option value="klipper">Klipper / Moonraker</option>
            <option value="generic">Generic / Other</option>
          </select>
        </div>
      </div>

      {isBambu && (
        <div className="form-group">
          <label className="label">Model</label>
          <select className="select" {...F('model')}>
            {['P1S','P1P','H2C','H2D','X1C','A1','A1 Mini'].map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
      )}
      {!isBambu && (
        <div className="form-group">
          <label className="label">Model / Description</label>
          <input className="input" {...F('model')} placeholder="e.g. Ender 3 Pro, Voron 2.4" />
        </div>
      )}

      {isEdit ? (
        <div className="form-group">
          <label className="label">Serial / ID</label>
          <div style={{ padding:'8px 12px',background:'var(--bg-hover)',borderRadius:'var(--r-sm)',fontFamily:'monospace',fontSize:13,color:'var(--text-tertiary)' }}>
            {form.serial}
          </div>
          <div style={{ fontSize:11,color:'var(--text-tertiary)',marginTop:3 }}>ID cannot be changed after registration</div>
        </div>
      ) : (
        <div className="form-group">
          <label className="label">{isBambu ? 'Serial Number' : 'Unique ID'}</label>
          <input className="input" {...F('serial')}
            placeholder={isBambu ? 'e.g. 01P00A123456789' : 'e.g. ender3-workshop'}
            style={{ fontFamily:'monospace' }} />
          {!isBambu && <div style={{ fontSize:11,color:'var(--text-tertiary)',marginTop:3 }}>Any unique identifier for this printer</div>}
        </div>
      )}

      <div className="form-row">
        <div className="form-group">
          <label className="label">IP Address</label>
          <input className="input" {...F('ip_address')} placeholder="e.g. 10.0.0.150" style={{ fontFamily:'monospace' }} />
        </div>
        <div className="form-group">
          <label className="label">
            {isBambu ? 'LAN Access Code' : isOcto ? 'OctoPrint API Key' : isKlipper ? 'API Key (optional)' : 'Access Code / Key'}
          </label>
          <input className="input" {...F('access_code')}
            placeholder={isBambu ? '8-digit code' : isOcto ? 'From OctoPrint Settings' : isKlipper ? 'Leave blank if none' : ''}
            style={{ fontFamily:'monospace' }} />
        </div>
      </div>

      {(isOcto || isKlipper) && (
        <div style={{ padding:'10px 12px',background:'var(--accent-light)',borderRadius:'var(--r-sm)',fontSize:12,color:'var(--accent)',marginBottom:10,lineHeight:1.6 }}>
          {isOcto && <><strong>OctoPrint:</strong> Find your API key in OctoPrint Settings → API. The IP address should be your OctoPrint host (no port needed — defaults to port 80).</>}
          {isKlipper && <><strong>Klipper/Moonraker:</strong> Enter your Moonraker host IP. API key is optional unless you have auth enabled in Moonraker.</>}
        </div>
      )}

      {isBambu && (
        <div className="form-row">
          <div className="form-group" style={{ display:'flex',alignItems:'center',gap:8,paddingTop:20 }}>
            <input type="checkbox" id="pf_has_ams" checked={!!form.has_ams}
              onChange={e => setForm(f => ({ ...f, has_ams: e.target.checked }))} style={{ width:16,height:16 }} />
            <label htmlFor="pf_has_ams" style={{ fontSize:13,cursor:'pointer' }}>Has AMS unit</label>
          </div>
          {form.has_ams && (
            <div className="form-group">
              <label className="label">AMS Tray Count</label>
              <select className="select" {...F('ams_count')}>
                <option value="4">4 trays</option>
                <option value="8">8 trays (2× AMS)</option>
                <option value="16">16 trays (4× AMS)</option>
              </select>
            </div>
          )}
        </div>
      )}

      <div className="form-group">
        <label className="label">Notes (optional)</label>
        <input className="input" {...F('notes')} placeholder="e.g. Located in workshop" />
      </div>

      {isBambu && (
        <>
          <div style={{ fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-tertiary)',margin:'14px 0 6px',paddingTop:12,borderTop:'0.5px solid var(--border)' }}>
            Camera Settings
          </div>
          <div style={{ padding:'8px 12px',background:'var(--bg-hover)',borderRadius:'var(--r-sm)',fontSize:12,color:'var(--text-secondary)',marginBottom:10,lineHeight:1.5 }}>
            Leave blank to use the printer IP and access code above.
            <br/><strong>H2C/H2D:</strong> Enable “LAN Mode Liveview” in printer Settings → Network first.
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="label">Camera IP Address</label>
              <input className="input" {...F('camera_ip')} placeholder="Same as printer IP" style={{ fontFamily:'monospace' }} />
            </div>
            <div className="form-group">
              <label className="label">Camera Access Code</label>
              <input className="input" {...F('camera_access_code')} placeholder="Same as LAN code" style={{ fontFamily:'monospace' }} />
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ── Camera Feed ───────────────────────────────────────────────────────────────
// State machine: idle → loading → streaming → idle (reconnects on stream end)
// Uses refs for control flags to avoid stale closure issues.
function CameraFeed({ printer, token }) {
  const [phase, setPhase]           = useState('idle');  // idle|loading|streaming|error
  const [errorMsg, setErrorMsg]     = useState('');
  const [frameCount, setFrameCount] = useState(0);

  const canvasRef     = useRef(null);
  const abortRef      = useRef(null);
  const activeRef     = useRef(false);   // true while we WANT the stream running
  const frameCountRef = useRef(0);       // avoid setState every frame

  const serverUrl = getServerUrl();
  const streamUrl = `${serverUrl}/api/camera/${printer.serial}/stream`;

  const CRLF2 = new Uint8Array([0x0d, 0x0a, 0x0d, 0x0a]);

  function appendBuf(a, b) {
    const n = new Uint8Array(a.length + b.length);
    n.set(a); n.set(b, a.length); return n;
  }

  function findSeq(hay, needle, from) {
    from = from || 0;
    outer: for (let i = from; i <= hay.length - needle.length; i++) {
      for (let j = 0; j < needle.length; j++) if (hay[i+j] !== needle[j]) continue outer;
      return i;
    }
    return -1;
  }

  function drawFrame(bytes) {
    frameCountRef.current++;
    // Throttle React re-renders — update every 5 frames (~1s at 5fps)
    if (frameCountRef.current % 5 === 0) setFrameCount(frameCountRef.current);
    createImageBitmap(new Blob([bytes], { type: 'image/jpeg' }))
      .then(bm => {
        const cv = canvasRef.current;
        if (!cv) { bm.close(); return; }
        cv.width = bm.width; cv.height = bm.height;
        cv.getContext('2d').drawImage(bm, 0, 0);
        bm.close();
      }).catch(() => {});
  }

  // Single stream attempt — returns reason string when done
  async function runStream(signal) {
    setPhase('loading');
    let res;
    try {
      res = await fetch(`${streamUrl}?token=${encodeURIComponent(token)}`, { signal });
    } catch (err) {
      if (err.name === 'AbortError') return 'aborted';
      return `Connection failed: ${err.message}`;
    }
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      return j.error || `HTTP ${res.status}`;
    }
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('multipart')) return `Unexpected response: ${ct}`;

    setPhase('streaming');
    const reader  = res.body.getReader();
    const decoder = new TextDecoder('utf-8', { fatal: false });
    let buf = new Uint8Array(0);
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) return 'ended';
        buf = appendBuf(buf, value);
        while (true) {
          const he = findSeq(buf, CRLF2);
          if (he === -1) break;
          const ht = decoder.decode(buf.slice(0, he));
          const m  = ht.match(/Content-Length:\s*(\d+)/i);
          if (!m) { buf = buf.slice(he + 4); continue; }
          const fl = parseInt(m[1], 10), fs = he + 4, fe = fs + fl;
          if (buf.length < fe) break;
          drawFrame(buf.slice(fs, fe));
          buf = buf.slice(fe);
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') return 'aborted';
      return `Stream error: ${err.message}`;
    } finally {
      try { reader.cancel(); } catch {}
    }
  }

  // Start the reconnecting stream loop
  const startStream = useCallback(() => {
    if (activeRef.current) return;
    activeRef.current     = true;
    frameCountRef.current = 0;
    setFrameCount(0);
    setErrorMsg('');

    (async () => {
      while (activeRef.current) {
        const ctrl = new AbortController();
        abortRef.current = ctrl;
        const result = await runStream(ctrl.signal);

        if (!activeRef.current || result === 'aborted') break;

        if (result !== 'ended') {
          // Real error — show message, retry in 3s
          setErrorMsg(result);
          setPhase('error');
          await new Promise(r => setTimeout(r, 3000));
          if (!activeRef.current) break;
          setErrorMsg('');
        } else {
          // Clean end (e.g. popout disconnected server stream) — reconnect quickly
          await new Promise(r => setTimeout(r, 800));
        }
      }
      // Loop exited cleanly
      abortRef.current = null;
      setPhase('idle');
      setFrameCount(0);
      frameCountRef.current = 0;
    })();
  // eslint-disable-next-line
  }, [streamUrl, token]);

  const stopStream = useCallback(() => {
    activeRef.current = false;
    abortRef.current?.abort();
    abortRef.current = null;
    api.delete(`/api/camera/${printer.serial}/stream`).catch(() => {});
    setPhase('idle');
    setFrameCount(0);
    frameCountRef.current = 0;
    setErrorMsg('');
  }, [printer.serial]);

  // Cleanup on unmount
  useEffect(() => () => {
    activeRef.current = false;
    abortRef.current?.abort();
  }, []);

  const isActive = phase !== 'idle';

  return (
    <div style={{ marginTop:12 }}>
      {!isActive ? (
        <button className="btn btn-ghost btn-sm"
          onClick={e => { e.stopPropagation(); startStream(); }}
          style={{ fontSize:11,color:'var(--accent)',width:'100%',justifyContent:'center',border:'0.5px solid var(--accent)',borderRadius:'var(--r-sm)',padding:'6px 0' }}>
          📹 View Camera
        </button>
      ) : (
        <div style={{ position:'relative',borderRadius:'var(--r-sm)',overflow:'hidden',background:'#000',minHeight:80 }}>
          {phase === 'loading' && (
            <div style={{ position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.85)',zIndex:1,gap:8 }}>
              <div style={{ width:24,height:24,border:'2px solid rgba(255,255,255,0.2)',borderTopColor:'var(--accent)',borderRadius:'50%',animation:'spin 0.8s linear infinite' }}/>
              <div style={{ fontSize:11,color:'var(--text-secondary)' }}>Connecting to camera...</div>
            </div>
          )}
          {phase === 'error' && (
            <div style={{ position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.75)',zIndex:1,gap:6,padding:12 }}>
              <div style={{ fontSize:11,color:'var(--red)',textAlign:'center' }}>⚠ {errorMsg}</div>
              <div style={{ fontSize:10,color:'var(--text-tertiary)' }}>Retrying in 3s...</div>
            </div>
          )}
          <canvas ref={canvasRef} onClick={e=>e.stopPropagation()}
            style={{ width:'100%',display:'block',maxHeight:240,objectFit:'cover' }} />
          <div style={{ position:'absolute',top:6,right:6,display:'flex',gap:4 }}>
            <button onClick={e=>{ e.stopPropagation(); window.printflow.openCameraPopout({ serial:printer.serial, name:printer.name, streamUrl:`${streamUrl}?token=${encodeURIComponent(token)}` }); }}
              style={{ background:'rgba(0,0,0,0.6)',border:'none',color:'#fff',borderRadius:4,padding:'3px 7px',fontSize:10,cursor:'pointer' }} title="Open fullscreen">⛶</button>
            <button onClick={e=>{ e.stopPropagation(); stopStream(); }}
              style={{ background:'rgba(0,0,0,0.6)',border:'none',color:'#fff',borderRadius:4,padding:'3px 7px',fontSize:10,cursor:'pointer' }}>✖ Stop</button>
          </div>
          <div style={{ position:'absolute',top:6,left:6,display:'flex',gap:4,alignItems:'center' }}>
            <div style={{ background:phase==='error'?'var(--amber)':phase==='loading'?'var(--text-tertiary)':'var(--red)',color:'#fff',fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:4,letterSpacing:'0.05em' }}>
              {phase==='loading'?'CONNECTING':phase==='error'?'RECONNECTING':'LIVE'}
            </div>
            {frameCount > 0 && <div style={{ background:'rgba(0,0,0,0.6)',color:'#fff',fontSize:9,padding:'2px 6px',borderRadius:4 }}>{frameCount} frames</div>}
          </div>
        </div>
      )}
      {phase === 'idle' && (
        <div style={{ marginTop:4,fontSize:10,color:'var(--text-tertiary)',textAlign:'center' }}>
          H2C/X1C require "LAN Mode Liveview" enabled on printer
        </div>
      )}
    </div>
  );
}

// ── Cloud Login Modal ─────────────────────────────────────────────────────────
function CloudLoginModal({ onClose, onSuccess }) {
  const [step, setStep]     = useState('login');
  const [email, setEmail]   = useState('');
  const [password, setPass] = useState('');
  const [code, setCode]     = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr]       = useState('');
  const [msg, setMsg]       = useState('');

  async function doLogin() {
    setLoading(true); setErr('');
    try {
      const r = await api.post('/api/bambu/cloud/login', { email, password });
      if (r.data.noTfa) { setStep('done'); setMsg('Connected!'); onSuccess(); }
      else { setStep('verify'); setMsg(`Check ${email} for your code.`); }
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
          <button className="btn btn-primary" style={{ width:'100%',justifyContent:'center' }} onClick={onClose}>Done</button>
        </div>
      ) : step==='verify' ? (
        <div>
          <div style={{ fontSize:13,color:'var(--text-secondary)',marginBottom:16,padding:'10px 14px',background:'var(--accent-light)',borderRadius:'var(--r-sm)' }}>{msg}</div>
          <div className="form-group">
            <label className="label">Verification Code</label>
            <input className="input" value={code} onChange={e=>setCode(e.target.value)} placeholder="123456"
              style={{ fontFamily:'monospace',fontSize:20,textAlign:'center',letterSpacing:'0.2em' }} autoFocus maxLength={6} />
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
        <div style={{ padding:'10px 14px',background:'var(--amber-light)',borderRadius:'var(--r-sm)',fontSize:12,color:'var(--amber)',marginBottom:16,lineHeight:1.5 }}>
            <strong>Note:</strong> LAN Mode is the most stable option. Cloud Mode uses Bambu's unofficial API and may break with firmware updates.<br/>
            <strong>Apple/Google sign-in:</strong> If you signed up with Apple or Google, you must first set a password at <button className="btn btn-ghost" style={{ fontSize:12,padding:0,color:'var(--accent)',height:'auto' }} onClick={()=>window.printflow.openExternal('https://bambulab.com')}>bambulab.com</button> → Account → Security before logging in here.
          </div>
          <div className="form-group"><label className="label">Bambu Account Email</label><input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} autoFocus /></div>
          <div className="form-group"><label className="label">Password</label><input className="input" type="password" value={password} onChange={e=>setPass(e.target.value)} /></div>
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

// ── Blank form ────────────────────────────────────────────────────────────────
const BLANK = { name:'',model:'P1S',serial:'',ip_address:'',access_code:'',has_ams:true,ams_count:4,notes:'',camera_ip:'',camera_access_code:'',connection_type:'bambu_lan' };

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PrintersPage() {
  const [printers, setPrinters]           = useState([]);
  const [liveStates, setLiveStates]       = useState({});
  const [loading, setLoading]             = useState(true);
  const [showAdd, setShowAdd]             = useState(false);
  const [showEdit, setShowEdit]           = useState(false);
  const [editingPrinter, setEditingPrinter] = useState(null);
  const [form, setForm]                   = useState(BLANK);
  const [saving, setSaving]               = useState(false);
  const [err, setErr]                     = useState('');
  const [showCloud, setShowCloud]         = useState(false);
  const { user } = useAuthStore();
  const isOwner = user?.role === 'owner';
  const token   = useAuthStore(s => s.token);

  const load = useCallback(async () => {
    try {
      const r  = await api.get('/api/printers');
      // Merge live states from all connection types
      const [bambu, octo, klipper] = await Promise.all([
        api.get('/api/bambu/status').catch(() => ({ data: {} })),
        api.get('/api/octoprint/status').catch(() => ({ data: {} })),
        api.get('/api/klipper/status').catch(() => ({ data: {} })),
      ]);
      setPrinters(r.data);
      setLiveStates({
        ...(bambu.data   || {}),
        ...(octo.data    || {}),
        ...(klipper.data || {}),
      });
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const u1 = onSocketEvent('printer:status',   s => setLiveStates(p => ({ ...p, [s.serial]: s })));
    const u2 = onSocketEvent('printer:registered', () => load());
    const u3 = onSocketEvent('printer:tray_updated', () => load());
    const u4 = onSocketEvent('printer:updated',  () => load());
    return () => { u1(); u2(); u3(); u4(); };
  }, [load]);

  // ── Add printer ────────────────────────────────────────────────────────────
  async function addPrinter() {
    setSaving(true); setErr('');
    try {
      const connType = form.connection_type || 'bambu_lan';
      await api.post('/api/printers', {
        name:                form.name,
        model:               form.model,
        serial:              form.serial.trim(),
        ip_address:          form.ip_address.trim(),
        access_code:         form.access_code.trim(),
        has_ams:             form.has_ams,
        ams_count:           parseInt(form.ams_count) || 0,
        notes:               form.notes,
        camera_ip:           form.camera_ip?.trim() || null,
        camera_access_code:  form.camera_access_code?.trim() || null,
        connection_type:     connType,
      });
      // Only auto-connect Bambu printers via MQTT here — others started server-side
      if (connType === 'bambu_lan') {
        await api.post(`/api/bambu/connect/${form.serial.trim()}`).catch(() => {});
      }
      setShowAdd(false);
      setForm(BLANK);
      await load();
    } catch(e) { setErr(e.response?.data?.error || 'Failed to add printer'); }
    finally { setSaving(false); }
  }

  // ── Edit existing printer ──────────────────────────────────────────────────
  function openEdit(printer) {
    setForm({
      name:                printer.name       || '',
      model:               printer.model      || 'P1S',
      serial:              printer.serial     || '',
      ip_address:          printer.ip_address || '',
      access_code:         printer.access_code         || '',
      has_ams:             !!printer.has_ams,
      ams_count:           printer.ams_count  || 4,
      notes:               printer.notes      || '',
      camera_ip:           printer.camera_ip  || '',
      camera_access_code:  printer.camera_access_code || '',
      connection_type:     printer.connection_type || 'bambu_lan',
    });
    setEditingPrinter(printer);
    setErr('');
    setShowEdit(true);
  }

  async function savePrinterEdit() {
    setSaving(true); setErr('');
    try {
      await api.patch(`/api/printers/${editingPrinter.id}`, {
        name:               form.name,
        model:              form.model,
        ip_address:         form.ip_address.trim(),
        access_code:        form.access_code.trim(),
        has_ams:            form.has_ams,
        ams_count:          parseInt(form.ams_count) || 0,
        notes:              form.notes,
        camera_ip:          form.camera_ip?.trim() || null,
        camera_access_code: form.camera_access_code?.trim() || null,
        connection_type:    form.connection_type || 'bambu_lan',
      });
      setShowEdit(false);
      setEditingPrinter(null);
      await load();
    } catch(e) { setErr(e.response?.data?.error || 'Failed to save changes'); }
    finally { setSaving(false); }
  }

  // ── Remove printer ─────────────────────────────────────────────────────────
  async function removePrinter(printer) {
    if (!window.confirm(`Remove "${printer.name}" from PrintFlow?\n\nThis disconnects the printer but does not affect the physical device.`)) return;
    try {
      await api.delete(`/api/printers/${printer.id}`);
      setShowEdit(false);
      setEditingPrinter(null);
      await load();
    } catch(e) { alert(e.response?.data?.error || 'Failed to remove printer'); }
  }

  async function sendCommand(printer, cmd) {
    const connType = printer.connection_type || 'bambu_lan';
    const route = connType === 'octoprint' ? 'octoprint'
                : connType === 'klipper'   ? 'klipper'
                : 'bambu';
    // Map stop → cancel for OctoPrint/Klipper
    const apiCmd = (cmd === 'stop' && route !== 'bambu') ? 'cancel' : cmd;
    try { await api.post(`/api/${route}/${printer.serial}/${apiCmd}`); }
    catch(e) { alert(`Command failed: ${e.response?.data?.error || e.message}`); }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ height:'100%',overflowY:'auto',padding:24 }}>
      <div style={{ maxWidth:1200,margin:'0 auto' }}>

        {/* Header */}
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20 }}>
          <div>
            <h1>Printers</h1>
            <p style={{ color:'var(--text-secondary)',fontSize:13,marginTop:4 }}>
              Live status, camera feeds and controls for all your printers
            </p>
          </div>
          {isOwner && (
            <div style={{ display:'flex',gap:8 }}>
              <button className="btn btn-secondary" onClick={()=>setShowCloud(true)}>☁ Bambu Cloud</button>
              <button className="btn btn-primary" onClick={()=>{ setShowAdd(true); setForm(BLANK); setErr(''); }}>+ Add Printer</button>
            </div>
          )}
        </div>

        {/* Printer grid */}
        {loading ? <div style={{ color:'var(--text-secondary)',padding:32 }}>Loading...</div> : (
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:16,marginBottom:24 }}>
            {printers.map(p => {
              const live   = liveStates[p.serial] || {};
              const status = live.status || 'offline';
              const pct    = live.print_pct || 0;
              const isActive = ['printing','paused','preparing'].includes(status);

              return (
                <div key={p.id} className="card" style={{ padding:20 }}>
                  {/* Card header */}
                  <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:14 }}>
                    <StatusDot status={status} />
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontSize:15,fontWeight:700 }}>{p.name}</div>
                      <div style={{ fontSize:12,color:'var(--text-secondary)' }}>
                      {p.model} · {p.serial}
                      {p.connection_type && p.connection_type !== 'bambu_lan' && (
                        <span style={{ marginLeft:6,fontSize:10,padding:'1px 6px',background:'var(--accent-light)',color:'var(--accent)',borderRadius:4,fontWeight:600 }}>
                          {p.connection_type === 'octoprint' ? 'OctoPrint' : p.connection_type === 'klipper' ? 'Klipper' : p.connection_type === 'bambu_cloud' ? 'Cloud' : p.connection_type}
                        </span>
                      )}
                    </div>
                    </div>
                    <span className={`pill ${status==='printing'?'pill-green':status==='paused'?'pill-amber':status==='error'?'pill-red':status==='idle'?'pill-blue':'pill-grey'}`}>
                      {status}
                    </span>
                    {isOwner && (
                      <button className="btn btn-ghost btn-icon" style={{ padding:4,flexShrink:0 }}
                        onClick={() => openEdit(p)} title="Edit printer settings">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Print progress */}
                  {isActive && (
                    <div style={{ marginBottom:14 }}>
                      <div style={{ display:'flex',justifyContent:'space-between',fontSize:12,color:'var(--text-secondary)',marginBottom:4 }}>
                        <span style={{ overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'70%' }}>{live.filename||'Printing...'}</span>
                        <span style={{ fontWeight:600,color:'var(--accent)',flexShrink:0 }}>{pct}%</span>
                      </div>
                      <div className="progress"><div className="progress-fill" style={{ width:`${pct}%`,background:'var(--green)' }}/></div>
                      {live.eta_min>0 && (
                        <div style={{ fontSize:11,color:'var(--text-tertiary)',marginTop:4 }}>
                          ETA: ~{Math.round(live.eta_min)} min · Layer {live.layer_num}/{live.total_layer_num}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Temperatures */}
                  <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:14 }}>
                    {[['Nozzle',live.nozzle_temp,live.nozzle_target,'var(--red)'],
                      ['Bed',   live.bed_temp,   live.bed_target,   'var(--amber)'],
                      ['Chamber',live.chamber_temp,null,            'var(--blue)']].map(([l,t,tgt,c])=>(
                      <div key={l} style={{ padding:'8px 10px',background:'var(--bg-hover)',borderRadius:'var(--r-sm)',textAlign:'center' }}>
                        <div style={{ fontSize:10,color:'var(--text-tertiary)',marginBottom:2 }}>{l}</div>
                        <div style={{ fontSize:14,fontWeight:700,color:t>0?c:'var(--text-tertiary)' }}>{t||0}°C</div>
                        {tgt>0 && <div style={{ fontSize:10,color:'var(--text-tertiary)' }}>/{tgt}°C</div>}
                      </div>
                    ))}
                  </div>

                  {/* Print controls */}
                  {isOwner && isActive && (
                    <div style={{ display:'flex',gap:6,marginBottom:12 }}>
                      {status==='printing' && <button className="btn btn-secondary btn-sm" onClick={()=>sendCommand(p,'pause')}>Pause</button>}
                      {status==='paused'   && <button className="btn btn-primary btn-sm"   onClick={()=>sendCommand(p,'resume')}>Resume</button>}
                      <button className="btn btn-danger btn-sm" onClick={()=>{ if(window.confirm('Stop print?')) sendCommand(p,'stop'); }}>Stop</button>
                    </div>
                  )}

                  {/* AMS trays */}
                  {p.trays?.length>0 && (
                    <div style={{ marginBottom:12 }}>
                      <div style={{ fontSize:11,color:'var(--text-tertiary)',marginBottom:6,fontWeight:600 }}>AMS</div>
                      <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
                        {p.trays.map(t=>(
                          <div key={`${t.ams_unit}-${t.tray_index}`}
                            title={`${t.material||'Empty'} — ${t.color_name||t.color_hex||'No spool'}`}
                            style={{ width:22,height:22,borderRadius:'50%',background:t.spool_color||t.color_hex||'var(--bg-hover)',border:'1.5px solid rgba(255,255,255,0.2)',flexShrink:0 }}/>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Camera — Bambu only */}
                  {(!p.connection_type || p.connection_type.startsWith('bambu')) && (
                    <CameraFeed printer={p} token={token} />
                  )}

                  {/* Footer actions */}
                  {isOwner && (
                    <div style={{ marginTop:10,display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                      <button className="btn btn-ghost btn-sm" style={{ fontSize:11,color:'var(--accent)' }} onClick={()=>openEdit(p)}>
                        ✏ Edit Settings
                      </button>
                      <button className="btn btn-ghost btn-sm" style={{ fontSize:11,color:'var(--text-tertiary)' }} onClick={()=>removePrinter(p)}>
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add printer placeholder */}
            {isOwner && (
              <div className="card interactive" onClick={()=>{ setShowAdd(true); setForm(BLANK); setErr(''); }}
                style={{ padding:24,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:10,border:'0.5px dashed var(--border-strong)',background:'transparent',minHeight:200,cursor:'pointer' }}>
                <svg width="40" height="40" viewBox="0 0 80 80" fill="none" style={{ opacity:0.35 }}>
                  <rect x="8" y="12" width="6" height="40" rx="3" fill="currentColor"/>
                  <rect x="66" y="12" width="6" height="40" rx="3" fill="currentColor"/>
                  <rect x="8" y="10" width="64" height="8" rx="4" fill="currentColor"/>
                  <rect x="31" y="12" width="18" height="11" rx="3" fill="currentColor"/>
                  <path d="M37 23 L40 30 L43 23 Z" fill="currentColor"/>
                  <rect x="27" y="46" width="26" height="5" rx="2" fill="currentColor"/>
                  <rect x="10" y="57" width="60" height="8" rx="3" fill="currentColor"/>
                </svg>
                <span style={{ fontSize:13,color:'var(--text-tertiary)',fontWeight:500 }}>Add Printer</span>
              </div>
            )}
            {printers.length===0 && !isOwner && (
              <div style={{ gridColumn:'1/-1',textAlign:'center',padding:48,color:'var(--text-tertiary)' }}>
                No printers registered yet.
              </div>
            )}
          </div>
        )}

        {/* Camera setup help */}
        <div className="card" style={{ padding:16 }}>
          <div style={{ fontSize:13,fontWeight:600,marginBottom:10 }}>Camera Setup — Bambu Lab Printers</div>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12,fontSize:12,color:'var(--text-secondary)' }}>
            <div><strong style={{ color:'var(--text-primary)',display:'block',marginBottom:3 }}>1. Enable LAN Mode Liveview</strong>Printer touchscreen: Settings → Network → LAN Mode Liveview → Enable. Then restart the printer.</div>
            <div><strong style={{ color:'var(--text-primary)',display:'block',marginBottom:3 }}>2. Note your IP Address</strong>Settings → Network — shows the printer's local IP. It should match what's in PrintFlow.</div>
            <div><strong style={{ color:'var(--text-primary)',display:'block',marginBottom:3 }}>3. Access Code</strong>Camera uses the same LAN access code as MQTT. No separate credentials needed in most cases.</div>
            <div><strong style={{ color:'var(--text-primary)',display:'block',marginBottom:3 }}>4. Edit Settings</strong>Click the pencil icon on any printer card to update IP, access code, or camera settings.</div>
          </div>
        </div>
      </div>

      {/* ── Add Printer Modal ── */}
      {showAdd && (
        <Modal title="Add Printer" width={520} onClose={()=>{ setShowAdd(false); setErr(''); }}>
          <PrinterForm form={form} setForm={setForm} isEdit={false} />
          {err && <div style={{ color:'var(--red)',fontSize:12,marginTop:12 }}>{err}</div>}
          <div style={{ display:'flex',gap:8,justifyContent:'flex-end',marginTop:20 }}>
            <button className="btn btn-secondary" onClick={()=>{ setShowAdd(false); setErr(''); }}>Cancel</button>
            <button className="btn btn-primary" onClick={addPrinter}
              disabled={saving||!form.name||!form.serial||!form.ip_address||(form.connection_type?.startsWith('bambu')&&!form.access_code)}>
              {saving ? 'Connecting...' : 'Add Printer'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Edit Printer Modal ── */}
      {showEdit && editingPrinter && (
        <Modal title={`Edit — ${editingPrinter.name}`} width={520} onClose={()=>{ setShowEdit(false); setErr(''); }}>
          <PrinterForm form={form} setForm={setForm} isEdit={true} />
          {err && <div style={{ color:'var(--red)',fontSize:12,marginTop:12 }}>{err}</div>}
          <div style={{ display:'flex',gap:8,justifyContent:'space-between',marginTop:20 }}>
            <button className="btn btn-danger btn-sm" onClick={()=>removePrinter(editingPrinter)}>Remove Printer</button>
            <div style={{ display:'flex',gap:8 }}>
              <button className="btn btn-secondary" onClick={()=>{ setShowEdit(false); setErr(''); }}>Cancel</button>
              <button className="btn btn-primary" onClick={savePrinterEdit}
                disabled={saving||!form.name||!form.ip_address||!form.access_code}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Cloud Login Modal ── */}
      {showCloud && (
        <CloudLoginModal onClose={()=>setShowCloud(false)} onSuccess={()=>{ setShowCloud(false); load(); }} />
      )}
    </div>
  );
}
