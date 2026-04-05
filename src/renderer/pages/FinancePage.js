import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';

const CATEGORIES = ['sales','materials','shipping','fees','maintenance','other'];
const CAT_COLORS = { sales:'var(--green)',materials:'var(--amber)',shipping:'var(--accent)',fees:'var(--purple)',maintenance:'var(--teal)',other:'var(--text-tertiary)' };
const PLATFORMS  = ['Etsy','Amazon','Direct','Other'];

export default function FinancePage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ date:new Date().toISOString().slice(0,10),description:'',category:'sales',type:'income',amount_cad:'',notes:'' });
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async()=>{
    try{ const r = await api.get('/api/transactions'); setTransactions(r.data); }catch{}finally{ setLoading(false); }
  },[]);

  useEffect(()=>{ load(); },[load]);

  const income   = transactions.filter(t=>t.type==='income').reduce((a,t)=>a+t.amount_cad,0);
  const expenses = transactions.filter(t=>t.type==='expense').reduce((a,t)=>a+t.amount_cad,0);
  const profit   = income - expenses;

  // Group by month for chart
  const byMonth = transactions.reduce((acc,t)=>{
    const m = t.date?.slice(0,7) || '';
    if(!acc[m]) acc[m] = { month:m,income:0,expenses:0 };
    if(t.type==='income') acc[m].income+=t.amount_cad;
    else acc[m].expenses+=t.amount_cad;
    return acc;
  },{});
  const chartData = Object.values(byMonth).sort((a,b)=>a.month.localeCompare(b.month)).slice(-6);

  // Expense breakdown for pie
  const expByCategory = CATEGORIES.map(c=>({
    name: c.charAt(0).toUpperCase()+c.slice(1),
    value: transactions.filter(t=>t.type==='expense'&&t.category===c).reduce((a,t)=>a+t.amount_cad,0),
    color: CAT_COLORS[c],
  })).filter(x=>x.value>0);

  async function addTransaction(){
    setSaving(true);
    try{
      await api.post('/api/transactions',{ ...form, amount_cad:parseFloat(form.amount_cad), hst_amount: form.type==='income'?parseFloat((form.amount_cad*0.13).toFixed(2)):0 });
      setAdding(false); setForm({ date:new Date().toISOString().slice(0,10),description:'',category:'sales',type:'income',amount_cad:'' }); await load();
    }catch{}finally{ setSaving(false); }
  }

  const F=k=>({ value:form[k]??'',onChange:e=>setForm(f=>({...f,[k]:e.target.value})) });

  return (
    <div style={{ height:'100%',overflowY:'auto',padding:24 }}>
      <div style={{ maxWidth:1200,margin:'0 auto' }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20 }}>
          <div><h1>Revenue & Expenses</h1><p style={{ color:'var(--text-secondary)',fontSize:13,marginTop:4 }}>Full financial ledger — income, expenses, and margin tracking</p></div>
          <div style={{ display:'flex',gap:8 }}>
            <button className="btn btn-secondary" onClick={()=>{}}>Export CSV</button>
            <button className="btn btn-primary" onClick={()=>setAdding(true)}>＋ Add Entry</button>
          </div>
        </div>

        {/* Metrics */}
        <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20 }}>
          {[['Total Revenue',`$${income.toFixed(2)}`,'var(--green)'],['Total Expenses',`$${expenses.toFixed(2)}`,'var(--red)'],['Net Profit',`$${profit.toFixed(2)}`,profit>=0?'var(--green)':'var(--red)'],['Margin',income>0?`${Math.round((profit/income)*100)}%`:'—','var(--accent)']].map(([l,v,c])=>(
            <div key={l} className="card" style={{ padding:16 }}>
              <div style={{ fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em',color:'var(--text-tertiary)',marginBottom:6 }}>{l}</div>
              <div style={{ fontSize:24,fontWeight:700,color:c }}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{ display:'grid',gridTemplateColumns:'2fr 1fr',gap:14,marginBottom:14 }}>
          {/* Revenue vs expenses chart */}
          <div className="card" style={{ padding:20 }}>
            <h3 style={{ marginBottom:16 }}>Revenue vs Expenses — Last 6 Months</h3>
            {chartData.length>0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                  <XAxis dataKey="month" tick={{ fontSize:11,fill:'var(--text-tertiary)' }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fontSize:11,fill:'var(--text-tertiary)' }} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}`}/>
                  <Tooltip contentStyle={{ background:'var(--bg-card)',border:'0.5px solid var(--border)',borderRadius:8,fontSize:12 }} formatter={v=>`$${v.toFixed(2)}`}/>
                  <Bar dataKey="income" name="Revenue" fill="var(--green)" radius={[4,4,0,0]} barSize={14}/>
                  <Bar dataKey="expenses" name="Expenses" fill="var(--red)" radius={[4,4,0,0]} barSize={14}/>
                </BarChart>
              </ResponsiveContainer>
            ) : <div style={{ height:160,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text-tertiary)',fontSize:13 }}>No data yet</div>}
          </div>

          {/* Expense breakdown pie */}
          <div className="card" style={{ padding:20 }}>
            <h3 style={{ marginBottom:12 }}>Expense Breakdown</h3>
            {expByCategory.length>0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={expByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={({name,percent})=>`${name} ${Math.round(percent*100)}%`} labelLine={false} style={{ fontSize:9 }}>
                    {expByCategory.map((e,i)=><Cell key={i} fill={['#0071E3','#FF9F0A','#30D158','#BF5AF2','#32ADE6','#888'][i%6]}/>)}
                  </Pie>
                  <Tooltip formatter={v=>`$${v.toFixed(2)}`}/>
                </PieChart>
              </ResponsiveContainer>
            ) : <div style={{ height:160,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text-tertiary)',fontSize:13 }}>No expenses yet</div>}
          </div>
        </div>

        {/* Transaction log */}
        <div className="card">
          <div style={{ padding:'14px 20px',borderBottom:'0.5px solid var(--border)' }}><h3>Transaction Log</h3></div>
          {loading ? <div style={{ padding:24,color:'var(--text-secondary)' }}>Loading…</div> : (
            <table className="data-table">
              <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Type</th><th>HST</th><th>Amount</th></tr></thead>
              <tbody>
                {transactions.slice(0,50).map(t=>(
                  <tr key={t.id}>
                    <td style={{ fontSize:12 }}>{t.date}</td>
                    <td style={{ maxWidth:220,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{t.description}</td>
                    <td><span className="pill pill-blue" style={{ fontSize:10,textTransform:'capitalize' }}>{t.category}</span></td>
                    <td><span className={`pill ${t.type==='income'?'pill-green':'pill-red'}`} style={{ fontSize:10 }}>{t.type}</span></td>
                    <td style={{ fontSize:12,color:'var(--text-secondary)' }}>${t.hst_amount?.toFixed(2)||'0.00'}</td>
                    <td style={{ fontWeight:700,color:t.type==='income'?'var(--green)':'var(--red)' }}>
                      {t.type==='income'?'+':'-'}${t.amount_cad?.toFixed(2)}
                    </td>
                  </tr>
                ))}
                {transactions.length===0 && <tr><td colSpan={6} style={{ textAlign:'center',padding:32,color:'var(--text-tertiary)' }}>No transactions yet. They are created automatically when orders are added.</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add entry modal */}
      {adding && (
        <div style={{ position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.55)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center' }}
          onClick={e=>e.target===e.currentTarget&&setAdding(false)}>
          <div className="card" style={{ width:460,padding:28,animation:'fadeIn 0.2s ease' }}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20 }}>
              <h2 style={{ fontSize:18 }}>Add Transaction</h2>
              <button className="btn btn-ghost btn-icon" onClick={()=>setAdding(false)}>✕</button>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="label">Date</label><input className="input" type="date" {...F('date')} /></div>
              <div className="form-group"><label className="label">Type</label><select className="select" {...F('type')}><option value="income">Income</option><option value="expense">Expense</option></select></div>
            </div>
            <div className="form-group"><label className="label">Description</label><input className="input" {...F('description')} /></div>
            <div className="form-row">
              <div className="form-group"><label className="label">Category</label><select className="select" {...F('category')}>{CATEGORIES.map(c=><option key={c} style={{ textTransform:'capitalize' }}>{c}</option>)}</select></div>
              <div className="form-group"><label className="label">Amount ($CAD)</label><input className="input" type="number" step="0.01" {...F('amount_cad')} /></div>
            </div>
            <div style={{ display:'flex',gap:8,justifyContent:'flex-end',marginTop:4 }}>
              <button className="btn btn-secondary" onClick={()=>setAdding(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addTransaction} disabled={saving||!form.description||!form.amount_cad}>{saving?'Saving…':'Add'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
