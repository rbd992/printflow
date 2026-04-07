import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';

const VENDORS = [
  { name:'Bambu Lab',           url:'https://bambulab.com',              icon:'🏭', color:'#00AE42', desc:'Official Bambu Lab store — filament, accessories, spare parts', tags:['PLA','PETG','ABS','ASA','PA','TPU','Support'] },
  { name:'Polymaker',           url:'https://polymaker.com',             icon:'🧵', color:'#0066CC', desc:'Engineering filaments, PolyLite & PolyMax series', tags:['PLA','PETG','ABS','ASA','PC','TPU'] },
  { name:'Hatchbox',            url:'https://hatchbox3d.com',            icon:'📦', color:'#FF6B35', desc:'Premium PLA, PETG, ABS — great consistency', tags:['PLA','PETG','ABS','PETG-CF'] },
  { name:'eSUN',                url:'https://esun3d.com',                icon:'♻️', color:'#27AE60', desc:'Budget-friendly, wide colour range, worldwide shipping', tags:['PLA','PETG','ABS','TPU','PVA','HIPS'] },
  { name:'3D Printing Canada',  url:'https://3dprintingcanada.com',      icon:'🇨🇦', color:'#CC0000', desc:'Canadian distributor — fast local shipping, CAD pricing', tags:['PLA','PETG','ABS','Resins','Parts'] },
  { name:'Amazon Canada',       url:'https://amazon.ca/s?k=3d+filament', icon:'📬', color:'#FF9900', desc:'Prime shipping — wide selection, competitive pricing', tags:['PLA','PETG','ABS','Parts','Tools'] },
  { name:'Printed Solid',       url:'https://printedsolid.com',          icon:'🔵', color:'#2980B9', desc:'Curated premium filaments, engineering grades', tags:['PA','PC','PEEK','CF','PEI'] },
  { name:'FilamentOne',         url:'https://filamentone.com',           icon:'🟡', color:'#F39C12', desc:'Canadian reseller, broad material selection', tags:['PLA','PETG','ABS','Specialty'] },
];

export default function VendorsPage() {
  const [search, setSearch] = useState('');
  const { user } = useAuthStore();
  const isOwner = user?.role === 'owner';
  const canConfig = ['owner','manager'].includes(user?.role);

  const filtered = VENDORS.filter(v =>
    !search || v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  function openVendor(url) {
    window.printflow.openExternal(url);
  }

  return (
    <div style={{ height:'100%',overflowY:'auto',padding:24 }}>
      <div style={{ maxWidth:1200,margin:'0 auto' }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20 }}>
          <div><h1>Vendors</h1><p style={{ color:'var(--text-secondary)',fontSize:13,marginTop:4 }}>Browse suppliers and configure automated ordering</p></div>
          <input className="input" placeholder="Search vendors or materials…" style={{ width:220 }} value={search} onChange={e=>setSearch(e.target.value)} />
        </div>

        {/* Vendor grid */}
        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:14,marginBottom:24 }}>
          {filtered.map(v=>(
            <div key={v.name} className="card" style={{ padding:20,display:'flex',flexDirection:'column',gap:12 }}>
              <div style={{ display:'flex',alignItems:'center',gap:12 }}>
                <div style={{ width:44,height:44,borderRadius:12,background:`${v.color}22`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,border:`1px solid ${v.color}33`,flexShrink:0 }}>
                  {v.icon}
                </div>
                <div>
                  <div style={{ fontSize:14,fontWeight:700 }}>{v.name}</div>
                  <div style={{ fontSize:11,color:'var(--text-secondary)',marginTop:1 }}>{v.desc}</div>
                </div>
              </div>
              <div style={{ display:'flex',flexWrap:'wrap',gap:4 }}>
                {v.tags.map(t=><span key={t} className="pill pill-blue" style={{ fontSize:10 }}>{t}</span>)}
              </div>
              <button className="btn btn-primary btn-sm" style={{ width:'100%',justifyContent:'center' }} onClick={()=>openVendor(v.url)}>
                Visit Store →
              </button>
            </div>
          ))}
        </div>

        {/* Auto-order config */}
        <div className="card">
          <div style={{ padding:'14px 20px',borderBottom:'0.5px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
            <div>
              <h3>Automated Ordering</h3>
              <p style={{ fontSize:12,color:'var(--text-secondary)',marginTop:2 }}>Set reorder thresholds per spool on the Filament page to trigger low-stock alerts.</p>
            </div>
          </div>
          <div style={{ padding:20 }}>
            <div style={{ padding:'14px 16px',background:'var(--bg-hover)',borderRadius:'var(--r-sm)',marginBottom:14 }}>
              <div style={{ fontSize:13,fontWeight:600,marginBottom:4 }}>🤖 How Auto-Ordering Works</div>
              <div style={{ fontSize:12,color:'var(--text-secondary)',lineHeight:1.6 }}>
                When a spool drops below its reorder threshold, PrintFlow queues a pending order and notifies the Owner.
                The Owner must approve before any purchase is placed. Vendor API keys (for direct cart integration)
                can be configured in Settings.
              </div>
            </div>
            <table className="data-table">
              <thead><tr><th>Rule</th><th>Trigger</th><th>Vendor</th><th>Qty</th><th>Auto-Order</th><th>Status</th></tr></thead>
              <tbody>
                <tr>
                  <td style={{ color:'var(--text-tertiary)',fontStyle:'italic' }} colSpan={6}>
                    Auto-reorder rules are managed on the Filament page — set reorder thresholds per spool.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
