import React from 'react';
import { CHANGELOG, getChangeType } from '../data/changelog';

export default function ChangelogPage() {
  return (
    <div style={{ height:'100%',overflowY:'auto',padding:24 }}>
      <div style={{ maxWidth:800,margin:'0 auto' }}>
        <div style={{ marginBottom:24 }}>
          <h1>Changelog</h1>
          <p style={{ color:'var(--text-secondary)',fontSize:13,marginTop:4 }}>PrintFlow release history and update notes</p>
        </div>

        {CHANGELOG.map((release, ri) => (
          <div key={release.version} style={{ marginBottom:32 }}>
            <div style={{ display:'flex',alignItems:'center',gap:14,marginBottom:16 }}>
              <div style={{
                padding:'6px 14px',borderRadius:'var(--r-sm)',fontWeight:700,fontSize:14,
                background: ri===0 ? 'var(--accent)' : 'var(--bg-active)',
                color: ri===0 ? '#fff' : 'var(--text-secondary)',
              }}>v{release.version}</div>
              <div>
                <div style={{ fontSize:15,fontWeight:600 }}>{release.title}</div>
                <div style={{ fontSize:12,color:'var(--text-tertiary)' }}>{release.date}</div>
              </div>
              {ri===0 && <span className="pill pill-green" style={{ marginLeft:'auto' }}>Current</span>}
            </div>

            {/* Highlights */}
            {release.highlights && (
              <div style={{ marginBottom:14,padding:'12px 16px',background:'var(--bg-hover)',borderRadius:'var(--r-sm)',borderLeft:`3px solid ${ri===0?'var(--accent)':'var(--border-strong)'}` }}>
                <div style={{ fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em',color:'var(--text-tertiary)',marginBottom:8 }}>Highlights</div>
                <div style={{ display:'flex',flexWrap:'wrap',gap:6 }}>
                  {release.highlights.map((h,i)=>(
                    <span key={i} style={{ fontSize:12,color:'var(--text-secondary)',background:'var(--bg-card)',padding:'3px 10px',borderRadius:20,border:'0.5px solid var(--border)' }}>{h}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Changes list */}
            <div className="card" style={{ overflow:'hidden' }}>
              {release.changes.map((change, ci) => {
                const meta = getChangeType(change.type);
                return (
                  <div key={ci} style={{ display:'flex',alignItems:'flex-start',gap:10,padding:'10px 16px',borderBottom:'0.5px solid var(--border)' }}>
                    <span style={{ display:'inline-flex',alignItems:'center',justifyContent:'center',padding:'2px 8px',borderRadius:12,fontSize:10,fontWeight:700,flexShrink:0,marginTop:1,background:meta.bg,color:meta.color }}>{meta.label}</span>
                    <span style={{ fontSize:13,color:'var(--text-primary)',lineHeight:1.5 }}>{change.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
