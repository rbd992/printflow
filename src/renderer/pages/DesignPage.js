import React, { useState, useRef } from 'react';

const TOOLS = [
  {
    id: 'tinkercad',
    name: 'TinkerCAD',
    icon: '🟠',
    url: 'https://www.tinkercad.com',
    color: '#FF6B35',
    description: 'Free, browser-based 3D design — beginner friendly',
    tags: ['Free','Browser-based','Beginner','Autodesk'],
  },
  {
    id: 'fusion360',
    name: 'Fusion 360',
    icon: '🔷',
    url: 'https://www.autodesk.com/products/fusion-360',
    color: '#0696D7',
    description: 'Professional CAD/CAM — powerful parametric design',
    tags: ['Paid','Desktop App','Professional','Autodesk'],
  },
  {
    id: 'onshape',
    name: 'Onshape',
    icon: '⬛',
    url: 'https://www.onshape.com',
    color: '#1A1A1A',
    description: 'Professional cloud-based CAD — free for hobbyists',
    tags: ['Free tier','Browser-based','Professional','PTC'],
  },
];

export default function DesignPage() {
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');
  const [canBack, setCanBack] = useState(false);
  const [canForward, setCanForward] = useState(false);
  const webviewRef = useRef(null);

  function openTool(tool) { setActive(tool); setLoading(true); setCurrentUrl(tool.url); }

  function handleWebviewRef(el) {
    webviewRef.current = el;
    if (!el) return;
    el.addEventListener('did-start-loading', () => setLoading(true));
    el.addEventListener('did-stop-loading', () => {
      setLoading(false);
      setCanBack(el.canGoBack());
      setCanForward(el.canGoForward());
      setCurrentUrl(el.getURL());
    });
  }

  return (
    <div style={{ height:'100%',display:'flex',flexDirection:'column',overflow:'hidden' }}>
      <div style={{ display:'flex',gap:0,borderBottom:'0.5px solid var(--border)',background:'var(--bg-sidebar)',flexShrink:0 }}>
        <div style={{ padding:'0 16px',display:'flex',alignItems:'center',gap:8,borderRight:'0.5px solid var(--border)' }}>
          <span style={{ fontSize:12,fontWeight:600,color:'var(--text-tertiary)',textTransform:'uppercase',letterSpacing:'0.05em' }}>Design</span>
        </div>
        {TOOLS.map(t=>(
          <button key={t.id} onClick={()=>openTool(t)} style={{
            display:'flex',alignItems:'center',gap:8,padding:'10px 20px',
            border:'none',borderRight:'0.5px solid var(--border)',cursor:'pointer',
            background:active?.id===t.id?'var(--accent-light)':'transparent',
            color:active?.id===t.id?'var(--accent)':'var(--text-secondary)',
            fontSize:13,fontWeight:active?.id===t.id?600:400,
            transition:'all 0.15s',fontFamily:'var(--font)',
            borderBottom:active?.id===t.id?'2px solid var(--accent)':'2px solid transparent',
          }}>
            <span>{t.icon}</span>{t.name}
          </button>
        ))}
        <div style={{ flex:1 }}/>
      </div>

      {!active ? (
        <div style={{ flex:1,overflowY:'auto',padding:32,display:'flex',flexDirection:'column',gap:20,alignItems:'center',justifyContent:'center' }}>
          <div style={{ textAlign:'center',marginBottom:8 }}>
            <h1 style={{ marginBottom:8 }}>Design Studio</h1>
            <p style={{ color:'var(--text-secondary)',fontSize:14 }}>Access your favourite CAD tools directly within PrintFlow</p>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:16,width:'100%',maxWidth:900 }}>
            {TOOLS.map(t=>(
              <div key={t.id} className="card interactive" onClick={()=>openTool(t)} style={{ padding:24 }}>
                <div style={{ display:'flex',alignItems:'center',gap:14,marginBottom:14 }}>
                  <div style={{ width:48,height:48,borderRadius:12,background:`${t.color}22`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,border:`1px solid ${t.color}33` }}>{t.icon}</div>
                  <div>
                    <div style={{ fontSize:16,fontWeight:700 }}>{t.name}</div>
                    <div style={{ fontSize:12,color:'var(--text-secondary)',marginTop:2 }}>{t.description}</div>
                  </div>
                </div>
                <div style={{ display:'flex',gap:6,flexWrap:'wrap',marginBottom:14 }}>
                  {t.tags.map(tag=><span key={tag} className="pill pill-blue" style={{ fontSize:10 }}>{tag}</span>)}
                </div>
                <button className="btn btn-primary" style={{ width:'100%',justifyContent:'center' }}>Open {t.name} →</button>
              </div>
            ))}
          </div>
          <div className="card" style={{ padding:16,maxWidth:900,width:'100%' }}>
            <div style={{ fontSize:13,fontWeight:600,marginBottom:8 }}>Design → Print workflow</div>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10 }}>
              {['Design your model in TinkerCAD or Fusion 360','Export as .3mf or .stl','Open in Bambu Studio to slice and configure supports','Send to your P1S or H2D from Bambu Studio'].map((s,i)=>(
                <div key={i} style={{ padding:'10px 12px',background:'var(--bg-hover)',borderRadius:'var(--r-sm)' }}>
                  <div style={{ fontSize:18,fontWeight:700,color:'var(--accent)',marginBottom:4 }}>{i+1}</div>
                  <div style={{ fontSize:11,color:'var(--text-secondary)',lineHeight:1.4 }}>{s}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ flex:1,display:'flex',flexDirection:'column',overflow:'hidden' }}>
          <div style={{ display:'flex',alignItems:'center',gap:8,padding:'6px 12px',borderBottom:'0.5px solid var(--border)',background:'var(--bg-sidebar)',flexShrink:0 }}>
            <button className="btn btn-ghost btn-icon" onClick={()=>webviewRef.current?.goBack()} disabled={!canBack}>←</button>
            <button className="btn btn-ghost btn-icon" onClick={()=>webviewRef.current?.goForward()} disabled={!canForward}>→</button>
            <button className="btn btn-ghost btn-icon" onClick={()=>webviewRef.current?.reload()}>↻</button>
            <button className="btn btn-ghost btn-icon" onClick={()=>webviewRef.current?.loadURL(active.url)}>🏠</button>
            <div style={{ flex:1,padding:'5px 10px',background:'var(--bg-input)',borderRadius:'var(--r-sm)',fontSize:12,color:'var(--text-secondary)',fontFamily:'monospace',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',border:'0.5px solid var(--border)' }}>
              {loading?'Loading…':currentUrl}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={()=>window.printflow.openExternal(currentUrl)} style={{ fontSize:11 }}>↗ Browser</button>
            <button className="btn btn-ghost btn-sm" onClick={()=>setActive(null)} style={{ fontSize:11 }}>✕ Close</button>
          </div>
          <div style={{ flex:1,position:'relative' }}>
            {loading && <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:'var(--accent)',zIndex:10 }}/>}
            <webview
              ref={handleWebviewRef}
              src={active.url}
              style={{ width:'100%',height:'100%',border:'none' }}
              allowpopups="true"
              partition={`persist:${active.id}`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
