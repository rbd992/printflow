// TaxPage.js
import React, { useEffect, useState } from 'react';
import { api } from '../api/client';

export default function TaxPage() {
  const [data, setData] = useState(null);
  useEffect(()=>{
    api.get('/api/dashboard').then(r=>{
      const t = r.data;
      const revenue = 0; // will come from transactions sum
      setData({ revenue });
    }).catch(()=>{});
    // Load actual transaction data
    api.get('/api/transactions').then(r=>{
      const txns = r.data;
      const income   = txns.filter(t=>t.type==='income').reduce((a,t)=>a+t.amount_cad,0);
      const expenses = txns.filter(t=>t.type==='expense').reduce((a,t)=>a+t.amount_cad,0);
      const hstCollected = txns.filter(t=>t.type==='income').reduce((a,t)=>a+(t.hst_amount||0),0);
      const itc = txns.filter(t=>t.type==='expense'&&['materials','shipping'].includes(t.category)).reduce((a,t)=>a+t.amount_cad*0.13,0);
      setData({ income, expenses, hstCollected, itc, netRemittance: hstCollected-itc });
    }).catch(()=>{});
  },[]);

  const deductions = [
    ['Filament & Materials',  data ? (data.expenses * 0.45).toFixed(2) : '—'],
    ['Shipping & Packaging',  data ? (data.expenses * 0.24).toFixed(2) : '—'],
    ['Platform Fees (Etsy/Amazon)', data ? (data.expenses * 0.18).toFixed(2) : '—'],
    ['Maintenance & Parts',   data ? (data.expenses * 0.10).toFixed(2) : '—'],
    ['Home Office (pro-rated)', '480.00'],
  ];

  return (
    <div style={{ height:'100%',overflowY:'auto',padding:24 }}>
      <div style={{ maxWidth:1000,margin:'0 auto' }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20 }}>
          <div><h1>Tax Manager</h1><p style={{ color:'var(--text-secondary)',fontSize:13,marginTop:4 }}>Ontario HST/GST tracking — 13% rate · Input Tax Credits · CRA filing</p></div>
          <button className="btn btn-primary">Export for Accountant</button>
        </div>

        <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20 }}>
          {[['HST Collected',`$${data?.hstCollected?.toFixed(2)||'0.00'}`,'var(--amber)'],['Input Tax Credits',`$${data?.itc?.toFixed(2)||'0.00'}`,'var(--green)'],['Net Remittance',`$${data?.netRemittance?.toFixed(2)||'0.00'}`,'var(--red)'],['HST Rate','13% (ON)','var(--accent)']].map(([l,v,c])=>(
            <div key={l} className="card" style={{ padding:16 }}><div style={{ fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em',color:'var(--text-tertiary)',marginBottom:6 }}>{l}</div><div style={{ fontSize:24,fontWeight:700,color:c }}>{v}</div></div>
          ))}
        </div>

        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14 }}>
          <div className="card" style={{ padding:20 }}>
            <h3 style={{ marginBottom:14 }}>HST Summary</h3>
            {[['Total Revenue (incl. HST)',`$${data?.income?.toFixed(2)||'0.00'}`],['HST Rate','13%'],['HST Collected',`$${data?.hstCollected?.toFixed(2)||'0.00'}`],['Input Tax Credits (ITC)',`-$${data?.itc?.toFixed(2)||'0.00'}`],['Net HST Payable',`$${data?.netRemittance?.toFixed(2)||'0.00'}`]].map(([k,v],i)=>(
              <div key={k} style={{ display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:'0.5px solid var(--border)',fontSize:13,fontWeight:i===4?700:400,color:i===4?'var(--red)':'var(--text-primary)' }}>
                <span style={{ color:i===4?'var(--red)':'var(--text-secondary)' }}>{k}</span><span>{v}</span>
              </div>
            ))}
            <div style={{ marginTop:14,padding:'12px 14px',background:'rgba(255,159,10,0.1)',border:'0.5px solid rgba(255,159,10,0.3)',borderRadius:'var(--r-sm)',fontSize:12,color:'var(--amber)' }}>
              ⚠ Next HST filing: April 30, 2026 — Quarterly filer
            </div>
          </div>
          <div className="card" style={{ padding:20 }}>
            <h3 style={{ marginBottom:14 }}>Deductible Expenses</h3>
            {deductions.map(([k,v])=>(
              <div key={k} style={{ display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:'0.5px solid var(--border)',fontSize:13 }}>
                <span style={{ color:'var(--text-secondary)' }}>{k}</span><span>${v}</span>
              </div>
            ))}
            <div style={{ display:'flex',justifyContent:'space-between',padding:'9px 0',fontSize:14,fontWeight:700 }}>
              <span>Total Deductions</span>
              <span style={{ color:'var(--green)' }}>${data?((data.expenses)+480).toFixed(2):'—'}</span>
            </div>
            <div style={{ marginTop:14,fontSize:12,color:'var(--text-secondary)',lineHeight:1.6 }}>
              ITC calculated at 13% Ontario HST on eligible business expenses. Consult your accountant for final figures.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
