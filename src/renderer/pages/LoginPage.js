import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { setServerUrlCache } from '../api/client';

// 3D Printer SVG — custom icon, not a regular printer
function PrinterIcon({ size = 80 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Gantry left vertical */}
      <rect x="8"  y="12" width="6" height="46" rx="3" fill="rgba(255,255,255,0.22)" />
      {/* Gantry right vertical */}
      <rect x="66" y="12" width="6" height="46" rx="3" fill="rgba(255,255,255,0.22)" />
      {/* Gantry top horizontal rail */}
      <rect x="8"  y="10" width="64" height="8"  rx="4" fill="rgba(255,255,255,0.28)" />
      {/* Corner caps */}
      <rect x="6"  y="8"  width="10" height="6"  rx="2" fill="rgba(255,255,255,0.18)" />
      <rect x="64" y="8"  width="10" height="6"  rx="2" fill="rgba(255,255,255,0.18)" />
      {/* Print head carriage on rail */}
      <rect x="31" y="12" width="18" height="12" rx="4" fill="rgba(0,113,227,0.95)" />
      {/* Nozzle tip */}
      <path d="M37 24 L40 32 L43 24 Z" fill="rgba(0,100,210,1)" />
      {/* Filament extrusion line (dashed, glowing green) */}
      <line x1="40" y1="32" x2="40" y2="38" stroke="rgba(48,209,88,0.9)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="3 2" />
      {/* Printed object — layered blocks building up */}
      <rect x="27" y="52" width="26" height="6"  rx="2" fill="rgba(48,209,88,0.85)" />
      <rect x="29" y="46" width="22" height="7"  rx="2" fill="rgba(48,209,88,0.70)" />
      <rect x="31" y="41" width="18" height="6"  rx="2" fill="rgba(48,209,88,0.55)" />
      <rect x="33" y="37" width="14" height="5"  rx="2" fill="rgba(48,209,88,0.40)" />
      {/* Print bed surface */}
      <rect x="16" y="58" width="48" height="5"  rx="2" fill="rgba(0,113,227,0.45)" />
      {/* Base platform */}
      <rect x="10" y="63" width="60" height="9"  rx="4" fill="rgba(0,113,227,0.65)" />
      {/* Bed grid lines for realism */}
      <line x1="24" y1="58" x2="24" y2="63" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      <line x1="32" y1="58" x2="32" y2="63" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      <line x1="40" y1="58" x2="40" y2="63" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      <line x1="48" y1="58" x2="48" y2="63" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      <line x1="56" y1="58" x2="56" y2="63" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading]       = useState(false);
  const submitting                  = useRef(false);
  const { login, error, clearError, token, serverUrl } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => { if (token) navigate('/', { replace: true }); }, [token, navigate]);

  useEffect(() => {
    clearError();
    async function loadSaved() {
      const saved = await window.printflow.getServerUrl();
      if (saved) setServerUrlCache(saved);
      try {
        const savedEmail = localStorage.getItem('pf_remember_email');
        const savedPass  = localStorage.getItem('pf_remember_pass');
        if (savedEmail) { setEmail(savedEmail); setRememberMe(true); }
        if (savedPass)  setPassword(savedPass);
      } catch {}
    }
    loadSaved();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading || submitting.current) return;
    submitting.current = true;
    setLoading(true);
    try {
      if (rememberMe) {
        localStorage.setItem('pf_remember_email', email);
        localStorage.setItem('pf_remember_pass',  password);
      } else {
        localStorage.removeItem('pf_remember_email');
        localStorage.removeItem('pf_remember_pass');
      }
    } catch {}
    await login(email, password);
    submitting.current = false;
    setLoading(false);
  }

  async function changeServer() {
    await window.printflow.clearToken();
    useAuthStore.getState().setServerUrl('');
    navigate('/setup', { replace: true });
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
      {/* Drag region */}
      <div className="drag-region" style={{ position:'fixed',top:0,left:0,right:0,height:44 }} />

      {/* Ambient glows */}
      <div style={{ position:'absolute',width:700,height:700,borderRadius:'50%',background:'radial-gradient(circle,rgba(0,113,227,0.10) 0%,transparent 65%)',top:-250,left:-250,pointerEvents:'none' }} />
      <div style={{ position:'absolute',width:500,height:500,borderRadius:'50%',background:'radial-gradient(circle,rgba(48,209,88,0.07) 0%,transparent 65%)',bottom:-150,right:-150,pointerEvents:'none' }} />
      <div style={{ position:'absolute',width:300,height:300,borderRadius:'50%',background:'radial-gradient(circle,rgba(0,113,227,0.06) 0%,transparent 65%)',bottom:80,left:120,pointerEvents:'none' }} />

      {/* Centered card */}
      <div className="card fade-in" style={{ width:400,padding:'44px 40px',textAlign:'center' }}>

        {/* 3D Printer Icon */}
        <div style={{
          width: 110,
          height: 110,
          borderRadius: 28,
          background: 'linear-gradient(135deg, rgba(0,113,227,0.18) 0%, rgba(0,113,227,0.05) 100%)',
          border: '1px solid rgba(0,113,227,0.25)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
          boxShadow: '0 16px 48px rgba(0,113,227,0.20), 0 0 0 1px rgba(255,255,255,0.04)',
        }}>
          <PrinterIcon size={76} />
        </div>

        {/* Brand */}
        <div style={{ fontSize:28,fontWeight:800,letterSpacing:'-0.02em',marginBottom:6 }}>
          PrintFlow
        </div>
        <div style={{ fontSize:13,color:'var(--text-secondary)',marginBottom:6 }}>
          3D Print Business Suite
        </div>
        {serverUrl && (
          <div style={{
            display: 'inline-block',
            fontSize: 10,
            color: 'var(--text-tertiary)',
            fontFamily: 'monospace',
            padding: '3px 8px',
            background: 'var(--bg-hover)',
            borderRadius: 'var(--r-sm)',
            marginBottom: 4,
            border: '0.5px solid var(--border)',
          }}>
            {serverUrl}
          </div>
        )}

        {/* Divider */}
        <div style={{ height:'0.5px',background:'var(--border)',margin:'24px 0' }} />

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ textAlign:'left' }}>
          <div className="form-group">
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              autoComplete="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              style={{ height:42 }}
            />
          </div>

          <div className="form-group">
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{ height:42 }}
            />
          </div>

          <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:20 }}>
            <input
              type="checkbox"
              id="rm"
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
              style={{ width:15,height:15,cursor:'pointer',accentColor:'var(--accent)' }}
            />
            <label htmlFor="rm" style={{ fontSize:13,color:'var(--text-secondary)',cursor:'pointer' }}>
              Remember me
            </label>
          </div>

          {error && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 'var(--r-sm)',
              marginBottom: 16,
              background: 'var(--red-light)',
              color: 'var(--red)',
              fontSize: 13,
              border: '0.5px solid rgba(255,69,58,0.25)',
              lineHeight: 1.5,
            }}>
              {error}
            </div>
          )}

          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading || !email || !password}
            style={{ width:'100%',justifyContent:'center',height:44,fontSize:14,fontWeight:600 }}
          >
            {loading ? (
              <span style={{ display:'flex',alignItems:'center',gap:8 }}>
                <span style={{ width:16,height:16,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin 0.7s linear infinite',display:'inline-block' }} />
                Signing in...
              </span>
            ) : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop:16,textAlign:'center' }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={changeServer}
            style={{ color:'var(--text-tertiary)',fontSize:12 }}
          >
            Change server
          </button>
        </div>

        <div style={{ marginTop:20,fontSize:10,color:'var(--text-tertiary)' }}>
          v1.0.33
        </div>
      </div>
    </div>
  );
}
