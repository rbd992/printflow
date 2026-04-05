import React, { useState, useRef } from 'react';

const PLATFORMS = [
  {
    id: 'makerworld',
    name: 'MakerWorld',
    icon: '🏭',
    url: 'https://makerworld.com',
    color: '#00AE42',
    description: 'Official Bambu Lab model marketplace — direct print support',
    tips: ['Sign in to access your library and downloads', 'Use "Print" button to send .3mf directly to your printer'],
  },
  {
    id: 'printables',
    name: 'Printables',
    icon: '🔵',
    url: 'https://www.printables.com',
    color: '#FA6A00',
    description: 'Prusa\'s model sharing platform — massive free library',
    tips: ['Download .3mf or .stl files', 'Open downloaded files in Bambu Studio to slice before printing'],
  },
];

export default function ModelsPage() {
  const [active, setActive]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const webviewRef              = useRef(null);
  const [canBack, setCanBack]   = useState(false);
  const [canForward, setCanForward] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');

  function openPlatform(platform) {
    setActive(platform);
    setLoading(true);
    setCurrentUrl(platform.url);
  }

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
    el.addEventListener('new-window', (e) => {
      e.preventDefault();
      el.loadURL(e.url);
    });
  }

  function goBack()    { webviewRef.current?.goBack(); }
  function goForward() { webviewRef.current?.goForward(); }
  function goHome()    { webviewRef.current?.loadURL(active.url); }
  function refresh()   { webviewRef.current?.reload(); }

  function openExternal() {
    if (currentUrl) window.printflow.openExternal(currentUrl);
  }

  return (
    <div style={{ height:'100%',display:'flex',flexDirection:'column',overflow:'hidden' }}>
      {/* Platform selector bar */}
      <div style={{ display:'flex',gap:0,borderBottom:'0.5px solid var(--border)',background:'var(--bg-sidebar)',flexShrink:0 }}>
        <div style={{ padding:'0 16px',display:'flex',alignItems:'center',gap:8,borderRight:'0.5px solid var(--border)' }}>
          <span style={{ fontSize:12,fontWeight:600,color:'var(--text-tertiary)',textTransform:'uppercase',letterSpacing:'0.05em' }}>Models</span>
        </div>
        {PLATFORMS.map(p=>(
          <button key={p.id} onClick={()=>openPlatform(p)} style={{
            display:'flex',alignItems:'center',gap:8,padding:'10px 20px',
            border:'none',borderRight:'0.5px solid var(--border)',cursor:'pointer',
            background: active?.id===p.id ? 'var(--accent-light)' : 'transparent',
            color: active?.id===p.id ? 'var(--accent)' : 'var(--text-secondary)',
            fontSize:13,fontWeight:active?.id===p.id?600:400,
            transition:'all 0.15s',fontFamily:'var(--font)',
            borderBottom: active?.id===p.id ? `2px solid var(--accent)` : '2px solid transparent',
          }}>
            <span>{p.icon}</span>
            {p.name}
          </button>
        ))}
        <div style={{ flex:1 }}/>
      </div>

      {!active ? (
        /* Platform picker cards */
        <div style={{ flex:1,overflowY:'auto',padding:32,display:'flex',flexDirection:'column',gap:20,alignItems:'center',justifyContent:'center' }}>
          <div style={{ marginBottom:8,textAlign:'center' }}>
            <h1 style={{ marginBottom:8 }}>Models & Designs</h1>
            <p style={{ color:'var(--text-secondary)',fontSize:14 }}>Browse, download, and queue models directly from within PrintFlow</p>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:16,width:'100%',maxWidth:800 }}>
            {PLATFORMS.map(p=>(
              <div key={p.id} className="card interactive" onClick={()=>openPlatform(p)} style={{ padding:28 }}>
                <div style={{ display:'flex',alignItems:'center',gap:14,marginBottom:16 }}>
                  <div style={{ width:52,height:52,borderRadius:14,background:`${p.color}22`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,border:`1px solid ${p.color}33` }}>
                    {p.icon}
                  </div>
                  <div>
                    <div style={{ fontSize:18,fontWeight:700 }}>{p.name}</div>
                    <div style={{ fontSize:12,color:'var(--text-secondary)',marginTop:2 }}>{p.description}</div>
                  </div>
                </div>
                <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
                  {p.tips.map((tip,i)=>(
                    <div key={i} style={{ fontSize:12,color:'var(--text-secondary)',display:'flex',gap:8,alignItems:'flex-start' }}>
                      <span style={{ color:p.color,flexShrink:0,marginTop:1 }}>→</span>
                      {tip}
                    </div>
                  ))}
                </div>
                <button className="btn btn-primary" style={{ marginTop:16,width:'100%',justifyContent:'center' }}>
                  Open {p.name} →
                </button>
              </div>
            ))}
          </div>
          <div className="card" style={{ padding:16,maxWidth:800,width:'100%' }}>
            <div style={{ fontSize:13,fontWeight:600,marginBottom:6 }}>How to print a model</div>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12 }}>
              {['Browse models on MakerWorld or Printables','Download the .3mf or .stl file','Open in Bambu Studio to slice (for .stl files)','Send to printer from Bambu Studio or printer queue'].map((step,i)=>(
                <div key={i} style={{ padding:'10px 12px',background:'var(--bg-hover)',borderRadius:'var(--r-sm)' }}>
                  <div style={{ fontSize:20,fontWeight:700,color:'var(--accent)',marginBottom:4 }}>{i+1}</div>
                  <div style={{ fontSize:11,color:'var(--text-secondary)',lineHeight:1.4 }}>{step}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Browser view */
        <div style={{ flex:1,display:'flex',flexDirection:'column',overflow:'hidden' }}>
          {/* Browser toolbar */}
          <div style={{ display:'flex',alignItems:'center',gap:8,padding:'6px 12px',borderBottom:'0.5px solid var(--border)',background:'var(--bg-sidebar)',flexShrink:0 }}>
            <button className="btn btn-ghost btn-icon" onClick={goBack} disabled={!canBack} title="Back">←</button>
            <button className="btn btn-ghost btn-icon" onClick={goForward} disabled={!canForward} title="Forward">→</button>
            <button className="btn btn-ghost btn-icon" onClick={refresh} title="Refresh">↻</button>
            <button className="btn btn-ghost btn-icon" onClick={goHome} title={`Go to ${active.name}`}>🏠</button>
            <div style={{ flex:1,padding:'5px 10px',background:'var(--bg-input)',borderRadius:'var(--r-sm)',fontSize:12,color:'var(--text-secondary)',fontFamily:'monospace',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',border:'0.5px solid var(--border)' }}>
              {loading ? 'Loading…' : currentUrl}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={openExternal} style={{ fontSize:11 }} title="Open in browser">↗ Browser</button>
            <button className="btn btn-ghost btn-sm" onClick={()=>setActive(null)} style={{ fontSize:11 }}>✕ Close</button>
          </div>
          {/* Webview */}
          <div style={{ flex:1,position:'relative' }}>
            {loading && (
              <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:'var(--accent)',zIndex:10,animation:'pulse 1s ease infinite' }}/>
            )}
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
