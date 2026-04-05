import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { setServerUrlCache } from '../api/client';

export default function SetupPage() {
  const [status, setStatus]   = useState('detecting'); // 'detecting' | 'found' | 'failed' | 'manual'
  const [mode, setMode]       = useState('');          // 'lan' | 'tailscale'
  const [foundUrl, setFoundUrl] = useState('');
  const [manualUrl, setManualUrl] = useState('');
  const [manualError, setManualError] = useState('');
  const [manualTesting, setManualTesting] = useState(false);
  const { setServerUrl } = useAuthStore();
  const navigate = useNavigate();

  // Auto-detect on mount
  useEffect(() => {
    detect();
  }, []);

  async function detect() {
    setStatus('detecting');
    setMode('');
    try {
      const result = await window.printflow.autoDetectServer();
      if (result.url) {
        setFoundUrl(result.url);
        setMode(result.mode);
        setStatus('found');
        // Auto-connect after brief pause so user sees the success state
        await save(result.url);
      } else {
        setStatus('failed');
      }
    } catch {
      setStatus('failed');
    }
  }

  async function save(url) {
    setServerUrlCache(url);
    await setServerUrl(url);
    setTimeout(() => navigate('/login', { replace: true }), 900);
  }

  async function tryManual() {
    const target = manualUrl.replace(/\/$/, '');
    if (!target) return;
    setManualTesting(true);
    setManualError('');
    try {
      setServerUrlCache(target);
      const res = await fetch(`${target}/health`, { signal: AbortSignal.timeout(8000) });
      const data = await res.json();
      if (data.status !== 'ok') throw new Error('Server responded but status was not ok');
      await save(target);
    } catch (err) {
      const isNetwork = err.message.includes('fetch') || err.message.includes('Failed') || err.name === 'TimeoutError';
      setManualError(isNetwork
        ? `Could not reach ${target} — check the address and make sure the server is running`
        : err.message
      );
      setManualTesting(false);
    }
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--gradient-bg)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div className="drag-region" style={{ position:'fixed',top:0,left:0,right:0,height:44 }} />

      {/* Ambient glows */}
      <div style={{ position:'absolute',width:600,height:600,borderRadius:'50%',background:'radial-gradient(circle,rgba(0,113,227,0.09) 0%,transparent 65%)',top:-200,left:-200,pointerEvents:'none' }} />
      <div style={{ position:'absolute',width:400,height:400,borderRadius:'50%',background:'radial-gradient(circle,rgba(48,209,88,0.06) 0%,transparent 65%)',bottom:-100,right:-100,pointerEvents:'none' }} />

      <div className="card fade-in" style={{ width:420,padding:36,textAlign:'center' }}>

        {/* Logo */}
        <div style={{
          width:72,height:72,borderRadius:20,margin:'0 auto 20px',
          background:'linear-gradient(135deg,rgba(0,113,227,0.2) 0%,rgba(0,113,227,0.05) 100%)',
          border:'1px solid rgba(0,113,227,0.3)',
          display:'flex',alignItems:'center',justifyContent:'center',
          boxShadow:'0 16px 48px rgba(0,113,227,0.2)',
        }}>
          <img src="/icon.png" alt="PrintFlow" style={{ width:52,height:52,borderRadius:14 }}
            onError={e => { e.target.style.display='none'; e.target.parentNode.innerHTML='<span style="font-size:32px">🖨️</span>'; }} />
        </div>

        <div style={{ fontSize:22,fontWeight:700,marginBottom:6 }}>PrintFlow</div>
        <div style={{ fontSize:13,color:'var(--text-secondary)',marginBottom:28 }}>3D Print Business Suite</div>

        {/* ── DETECTING ── */}
        {status === 'detecting' && (
          <div>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:12,marginBottom:16 }}>
              <span style={{ width:20,height:20,border:'2px solid rgba(0,113,227,0.3)',borderTopColor:'var(--accent)',borderRadius:'50%',animation:'spin 0.8s linear infinite',display:'inline-block',flexShrink:0 }} />
              <span style={{ fontSize:14,color:'var(--text-secondary)' }}>Finding your server…</span>
            </div>
            <div style={{ fontSize:12,color:'var(--text-tertiary)',lineHeight:1.6 }}>
              Checking home network, then remote connection…
            </div>
          </div>
        )}

        {/* ── FOUND ── */}
        {status === 'found' && (
          <div>
            <div style={{ width:52,height:52,borderRadius:'50%',background:'var(--green-light)',border:'1px solid rgba(48,209,88,0.3)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',fontSize:24 }}>
              ✓
            </div>
            <div style={{ fontSize:15,fontWeight:600,marginBottom:6,color:'var(--green)' }}>
              {mode === 'lan' ? 'Connected on Home Network' : 'Connected via Tailscale'}
            </div>
            <div style={{ fontSize:12,color:'var(--text-tertiary)',fontFamily:'monospace',marginBottom:6 }}>{foundUrl}</div>
            <div style={{ fontSize:12,color:'var(--text-secondary)',marginBottom:20 }}>
              {mode === 'lan'
                ? 'Using your fast local connection.'
                : 'Not on home WiFi — using your secure Tailscale tunnel.'}
            </div>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:8,fontSize:12,color:'var(--text-tertiary)' }}>
              <span style={{ width:14,height:14,border:'2px solid rgba(0,113,227,0.3)',borderTopColor:'var(--accent)',borderRadius:'50%',animation:'spin 0.8s linear infinite',display:'inline-block' }} />
              Loading login screen…
            </div>
          </div>
        )}

        {/* ── FAILED ── */}
        {status === 'failed' && (
          <div style={{ textAlign:'left' }}>
            <div style={{ padding:'12px 14px',background:'var(--amber-light)',borderRadius:'var(--r-sm)',border:'0.5px solid rgba(255,179,0,0.3)',fontSize:13,color:'var(--amber)',marginBottom:20,textAlign:'center',lineHeight:1.6 }}>
              ⚠ Could not find your PrintFlow server.<br />
              <span style={{ fontSize:11,color:'var(--text-secondary)' }}>Both home network and Tailscale were unreachable.</span>
            </div>

            <div style={{ display:'flex',gap:8,marginBottom:20 }}>
              <button className="btn btn-primary" style={{ flex:1,justifyContent:'center' }} onClick={detect}>
                Try Again
              </button>
            </div>

            {/* Manual fallback */}
            <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:14 }}>
              <div style={{ flex:1,height:'0.5px',background:'var(--border)' }} />
              <span style={{ fontSize:11,color:'var(--text-tertiary)' }}>or enter manually</span>
              <div style={{ flex:1,height:'0.5px',background:'var(--border)' }} />
            </div>

            <input
              className="input"
              value={manualUrl}
              onChange={e => { setManualUrl(e.target.value); setManualError(''); }}
              placeholder="http://10.0.0.219:3001"
              onKeyDown={e => e.key === 'Enter' && !manualTesting && tryManual()}
              style={{ fontFamily:'monospace',fontSize:13,marginBottom:10 }}
            />
            {manualError && (
              <div style={{ fontSize:12,color:'var(--red)',marginBottom:10,lineHeight:1.5 }}>{manualError}</div>
            )}
            <button
              className="btn btn-secondary"
              style={{ width:'100%',justifyContent:'center' }}
              onClick={tryManual}
              disabled={manualTesting || !manualUrl}
            >
              {manualTesting ? 'Connecting…' : 'Connect to This Address'}
            </button>
          </div>
        )}

        {/* Help text */}
        {status !== 'found' && (
          <div style={{ marginTop:20,padding:'10px 14px',background:'var(--bg-hover)',borderRadius:'var(--r-sm)',border:'0.5px solid var(--border)',textAlign:'left' }}>
            <div style={{ fontSize:11,color:'var(--text-secondary)',lineHeight:1.7 }}>
              <strong style={{ color:'var(--text-primary)' }}>Having trouble?</strong><br />
              Make sure your NAS is powered on and the PrintFlow container is running. If you're away from home, install <strong>Tailscale</strong> on this device and sign in.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
