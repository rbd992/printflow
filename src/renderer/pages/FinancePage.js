import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

const CATEGORIES = ['sales','materials','shipping','fees','maintenance','other'];
const CAT_COLORS = { sales:'var(--green)',materials:'var(--amber)',shipping:'var(--accent)',fees:'var(--purple)',maintenance:'var(--teal)',other:'var(--text-tertiary)' };
const CAT_HEX    = { sales:'#30D158',materials:'#FF9F0A',shipping:'#0071E3',fees:'#BF5AF2',maintenance:'#32ADE6',other:'#888888' };

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmt(n) { return `$${(n||0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g,',')}`; }

export default function FinancePage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [view, setView]         = useState('overview');   // overview | monthly | yearly
  const [selectedYear, setSelectedYear]   = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [form, setForm]         = useState({ date: new Date().toISOString().slice(0,10), description:'', category:'sales', type:'income', amount_cad:'' });
  const [adding, setAdding]     = useState(false);
  const [saving, setSaving]     = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.get('/api/transactions?limit=2000');
      setTransactions(r.data);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Derived data ──────────────────────────────────────────────────────────

  const allYears = [...new Set(transactions.map(t => t.date?.slice(0,4)).filter(Boolean))].sort().reverse();
  if (!allYears.includes(String(selectedYear))) allYears.unshift(String(selectedYear));

  // Filter to selected year
  const yearTxns  = transactions.filter(t => t.date?.startsWith(String(selectedYear)));
  const monthTxns = yearTxns.filter(t => {
    const m = parseInt(t.date?.slice(5,7));
    return m === selectedMonth;
  });

  function summary(txns) {
    const income   = txns.filter(t=>t.type==='income').reduce((a,t)=>a+t.amount_cad,0);
    const expenses = txns.filter(t=>t.type==='expense').reduce((a,t)=>a+t.amount_cad,0);
    return { income, expenses, profit: income-expenses, margin: income > 0 ? Math.round(((income-expenses)/income)*100) : 0 };
  }

  const overallSummary = summary(transactions);
  const yearSummary    = summary(yearTxns);
  const monthSummary   = summary(monthTxns);

  // Monthly breakdown for the selected year
  const monthlyData = MONTHS.map((name, idx) => {
    const m = String(idx+1).padStart(2,'0');
    const txns = yearTxns.filter(t => t.date?.slice(5,7) === m);
    const { income, expenses } = summary(txns);
    return { name, month: idx+1, income, expenses, profit: income-expenses };
  });

  // Overall month chart (last 12 months across all years)
  const last12 = (() => {
    const now = new Date();
    const result = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      const txns = transactions.filter(t => t.date?.startsWith(key));
      const { income, expenses } = summary(txns);
      result.push({ name: `${MONTHS[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`, income, expenses });
    }
    return result;
  })();

  // Expense breakdown
  const expByCategory = (txns) => CATEGORIES.map(c => ({
    name: c.charAt(0).toUpperCase()+c.slice(1),
    value: txns.filter(t=>t.type==='expense'&&t.category===c).reduce((a,t)=>a+t.amount_cad,0),
    color: CAT_HEX[c],
  })).filter(x=>x.value>0);

  async function addTransaction() {
    setSaving(true);
    try {
      await api.post('/api/transactions', {
        ...form,
        amount_cad: parseFloat(form.amount_cad),
        hst_amount: form.type==='income' ? parseFloat((form.amount_cad*0.13).toFixed(2)) : 0
      });
      setAdding(false);
      setForm({ date: new Date().toISOString().slice(0,10), description:'', category:'sales', type:'income', amount_cad:'' });
      await load();
    } catch {}
    finally { setSaving(false); }
  }

  function exportCSV(txns, filename) {
    const rows = [['Date','Description','Category','Type','Amount','HST','Order#']];
    txns.forEach(t => rows.push([t.date, `"${t.description}"`, t.category, t.type, t.amount_cad?.toFixed(2), t.hst_amount?.toFixed(2)||'0.00', t.order_number||'']));
    const csv  = rows.map(r=>r.join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href=url; a.download=filename; a.click();
    URL.revokeObjectURL(url);
  }

  const F = k => ({ value: form[k]??'', onChange: e => setForm(f=>({...f,[k]:e.target.value})) });

  const TAB_STYLE = (active) => ({
    padding: '7px 16px', borderRadius: 7, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none',
    background: active ? 'var(--accent)' : 'var(--bg-hover)',
    color: active ? '#fff' : 'var(--text-secondary)',
  });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ height:'100%', overflowY:'auto', padding:24 }}>
      <div style={{ maxWidth:1200, margin:'0 auto' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div>
            <h1>Finance</h1>
            <p style={{ color:'var(--text-secondary)', fontSize:13, marginTop:4 }}>Revenue, expenses, and profit — by month, year, or all time</p>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn btn-secondary" onClick={() => exportCSV(transactions, 'transactions-all.csv')}>⬇ Export All</button>
            <button className="btn btn-primary" onClick={() => setAdding(true)}>＋ Add Entry</button>
          </div>
        </div>

        {/* View tabs */}
        <div style={{ display:'flex', gap:6, marginBottom:20 }}>
          <button style={TAB_STYLE(view==='overview')} onClick={() => setView('overview')}>Overview</button>
          <button style={TAB_STYLE(view==='monthly')}  onClick={() => setView('monthly')}>Monthly</button>
          <button style={TAB_STYLE(view==='yearly')}   onClick={() => setView('yearly')}>Yearly</button>
        </div>

        {/* ── OVERVIEW ──────────────────────────────────────────────────── */}
        {view === 'overview' && (
          <>
            {/* All-time metrics */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
              {[
                ['All-Time Revenue',  fmt(overallSummary.income),   'var(--green)'],
                ['All-Time Expenses', fmt(overallSummary.expenses),  'var(--red)'],
                ['All-Time Profit',   fmt(overallSummary.profit),    overallSummary.profit>=0?'var(--green)':'var(--red)'],
                ['Overall Margin',    overallSummary.income>0?`${overallSummary.margin}%`:'—', 'var(--accent)'],
              ].map(([l,v,c]) => (
                <div key={l} className="card" style={{ padding:16 }}>
                  <div style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--text-tertiary)', marginBottom:6 }}>{l}</div>
                  <div style={{ fontSize:22, fontWeight:700, color:c }}>{v}</div>
                </div>
              ))}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:14, marginBottom:14 }}>
              <div className="card" style={{ padding:20 }}>
                <h3 style={{ marginBottom:16 }}>Revenue vs Expenses — Last 12 Months</h3>
                {last12.some(m=>m.income>0||m.expenses>0) ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={last12} barGap={3}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                      <XAxis dataKey="name" tick={{ fontSize:10, fill:'var(--text-tertiary)' }} axisLine={false} tickLine={false}/>
                      <YAxis tick={{ fontSize:10, fill:'var(--text-tertiary)' }} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}`}/>
                      <Tooltip contentStyle={{ background:'var(--bg-card)', border:'0.5px solid var(--border)', borderRadius:8, fontSize:12 }} formatter={v=>`$${v.toFixed(2)}`}/>
                      <Bar dataKey="income"   name="Revenue"  fill="var(--green)" radius={[3,3,0,0]} barSize={10}/>
                      <Bar dataKey="expenses" name="Expenses" fill="var(--red)"   radius={[3,3,0,0]} barSize={10}/>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div style={{ height:180, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-tertiary)', fontSize:13 }}>No data yet</div>}
              </div>

              <div className="card" style={{ padding:20 }}>
                <h3 style={{ marginBottom:12 }}>Expense Breakdown</h3>
                {expByCategory(transactions).length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={expByCategory(transactions)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65}
                        label={({name,percent})=>`${name} ${Math.round(percent*100)}%`} labelLine={false} style={{ fontSize:9 }}>
                        {expByCategory(transactions).map((e,i) => <Cell key={i} fill={e.color}/>)}
                      </Pie>
                      <Tooltip formatter={v=>`$${v.toFixed(2)}`}/>
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div style={{ height:180, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-tertiary)', fontSize:13 }}>No expenses yet</div>}
              </div>
            </div>

            {/* Full ledger */}
            <TransactionTable transactions={transactions.slice(0,100)} title="All Transactions" onExport={() => exportCSV(transactions,'transactions-all.csv')}/>
          </>
        )}

        {/* ── MONTHLY ───────────────────────────────────────────────────── */}
        {view === 'monthly' && (
          <>
            {/* Year + Month pickers */}
            <div style={{ display:'flex', gap:10, marginBottom:20, alignItems:'center' }}>
              <select className="select" style={{ width:100 }} value={selectedYear} onChange={e=>setSelectedYear(parseInt(e.target.value))}>
                {allYears.map(y=><option key={y} value={y}>{y}</option>)}
              </select>
              <select className="select" style={{ width:130 }} value={selectedMonth} onChange={e=>setSelectedMonth(parseInt(e.target.value))}>
                {MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
              </select>
              <button className="btn btn-secondary btn-sm" onClick={() => exportCSV(monthTxns, `transactions-${selectedYear}-${String(selectedMonth).padStart(2,'0')}.csv`)}>⬇ Export Month</button>
            </div>

            {/* Month metrics */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
              {[
                ['Revenue', fmt(monthSummary.income), 'var(--green)'],
                ['Expenses', fmt(monthSummary.expenses), 'var(--red)'],
                ['Net Profit', fmt(monthSummary.profit), monthSummary.profit>=0?'var(--green)':'var(--red)'],
                ['Margin', monthSummary.income>0?`${monthSummary.margin}%`:'—', 'var(--accent)'],
              ].map(([l,v,c]) => (
                <div key={l} className="card" style={{ padding:16 }}>
                  <div style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--text-tertiary)', marginBottom:6 }}>
                    {MONTHS[selectedMonth-1]} {selectedYear} — {l}
                  </div>
                  <div style={{ fontSize:22, fontWeight:700, color:c }}>{v}</div>
                </div>
              ))}
            </div>

            <TransactionTable transactions={monthTxns} title={`${MONTHS[selectedMonth-1]} ${selectedYear} Transactions`} onExport={() => exportCSV(monthTxns,`transactions-${selectedYear}-${String(selectedMonth).padStart(2,'0')}.csv`)}/>
          </>
        )}

        {/* ── YEARLY ────────────────────────────────────────────────────── */}
        {view === 'yearly' && (
          <>
            <div style={{ display:'flex', gap:10, marginBottom:20, alignItems:'center' }}>
              <select className="select" style={{ width:100 }} value={selectedYear} onChange={e=>setSelectedYear(parseInt(e.target.value))}>
                {allYears.map(y=><option key={y} value={y}>{y}</option>)}
              </select>
              <button className="btn btn-secondary btn-sm" onClick={() => exportCSV(yearTxns, `transactions-${selectedYear}.csv`)}>⬇ Export Year</button>
            </div>

            {/* Year metrics */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
              {[
                ['Revenue', fmt(yearSummary.income), 'var(--green)'],
                ['Expenses', fmt(yearSummary.expenses), 'var(--red)'],
                ['Net Profit', fmt(yearSummary.profit), yearSummary.profit>=0?'var(--green)':'var(--red)'],
                ['Margin', yearSummary.income>0?`${yearSummary.margin}%`:'—', 'var(--accent)'],
              ].map(([l,v,c]) => (
                <div key={l} className="card" style={{ padding:16 }}>
                  <div style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--text-tertiary)', marginBottom:6 }}>{selectedYear} — {l}</div>
                  <div style={{ fontSize:22, fontWeight:700, color:c }}>{v}</div>
                </div>
              ))}
            </div>

            {/* Monthly bar chart for the year */}
            <div className="card" style={{ padding:20, marginBottom:14 }}>
              <h3 style={{ marginBottom:16 }}>Month-by-Month — {selectedYear}</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyData} barGap={3}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                  <XAxis dataKey="name" tick={{ fontSize:11, fill:'var(--text-tertiary)' }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fontSize:11, fill:'var(--text-tertiary)' }} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}`}/>
                  <Tooltip contentStyle={{ background:'var(--bg-card)', border:'0.5px solid var(--border)', borderRadius:8, fontSize:12 }} formatter={v=>`$${v.toFixed(2)}`}/>
                  <Bar dataKey="income"   name="Revenue"  fill="var(--green)" radius={[3,3,0,0]} barSize={12}/>
                  <Bar dataKey="expenses" name="Expenses" fill="var(--red)"   radius={[3,3,0,0]} barSize={12}/>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Monthly summary table */}
            <div className="card" style={{ marginBottom:14 }}>
              <div style={{ padding:'14px 20px', borderBottom:'0.5px solid var(--border)' }}>
                <h3>Monthly Summary — {selectedYear}</h3>
              </div>
              <table className="data-table">
                <thead>
                  <tr><th>Month</th><th>Revenue</th><th>Expenses</th><th>Net Profit</th><th>Margin</th></tr>
                </thead>
                <tbody>
                  {monthlyData.map(m => (
                    <tr key={m.name}
                      style={{ cursor:'pointer' }}
                      onClick={() => { setSelectedMonth(m.month); setView('monthly'); }}>
                      <td style={{ fontWeight:500 }}>{m.name}</td>
                      <td style={{ color:'var(--green)', fontWeight:600 }}>{fmt(m.income)}</td>
                      <td style={{ color:'var(--red)' }}>{fmt(m.expenses)}</td>
                      <td style={{ color: m.profit>=0?'var(--green)':'var(--red)', fontWeight:600 }}>{fmt(m.profit)}</td>
                      <td style={{ color:'var(--text-secondary)' }}>{m.income>0?`${Math.round((m.profit/m.income)*100)}%`:'—'}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop:'2px solid var(--border)', fontWeight:700 }}>
                    <td>Total</td>
                    <td style={{ color:'var(--green)' }}>{fmt(yearSummary.income)}</td>
                    <td style={{ color:'var(--red)' }}>{fmt(yearSummary.expenses)}</td>
                    <td style={{ color:yearSummary.profit>=0?'var(--green)':'var(--red)' }}>{fmt(yearSummary.profit)}</td>
                    <td style={{ color:'var(--accent)' }}>{yearSummary.income>0?`${yearSummary.margin}%`:'—'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <TransactionTable transactions={yearTxns} title={`${selectedYear} Transactions`} onExport={() => exportCSV(yearTxns,`transactions-${selectedYear}.csv`)}/>
          </>
        )}
      </div>

      {/* Add entry modal */}
      {adding && (
        <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.55)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center' }}
          onClick={e=>e.target===e.currentTarget&&setAdding(false)}>
          <div className="card" style={{ width:460, padding:28, animation:'fadeIn 0.2s ease' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h2 style={{ fontSize:18 }}>Add Transaction</h2>
              <button className="btn btn-ghost btn-icon" onClick={()=>setAdding(false)}>✕</button>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="label">Date</label><input className="input" type="date" {...F('date')}/></div>
              <div className="form-group"><label className="label">Type</label><select className="select" {...F('type')}><option value="income">Income</option><option value="expense">Expense</option></select></div>
            </div>
            <div className="form-group"><label className="label">Description</label><input className="input" {...F('description')}/></div>
            <div className="form-row">
              <div className="form-group"><label className="label">Category</label>
                <select className="select" {...F('category')}>
                  {CATEGORIES.map(c=><option key={c} style={{ textTransform:'capitalize' }}>{c}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="label">Amount ($CAD)</label><input className="input" type="number" step="0.01" {...F('amount_cad')}/></div>
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:4 }}>
              <button className="btn btn-secondary" onClick={()=>setAdding(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addTransaction} disabled={saving||!form.description||!form.amount_cad}>
                {saving?'Saving…':'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TransactionTable({ transactions, title, onExport }) {
  return (
    <div className="card">
      <div style={{ padding:'14px 20px', borderBottom:'0.5px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <h3>{title}</h3>
        <button className="btn btn-secondary btn-sm" onClick={onExport}>⬇ CSV</button>
      </div>
      {transactions.length === 0 ? (
        <div style={{ padding:32, textAlign:'center', color:'var(--text-tertiary)', fontSize:13 }}>No transactions in this period</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr><th>Date</th><th>Description</th><th>Category</th><th>Type</th><th>HST</th><th>Amount</th></tr>
          </thead>
          <tbody>
            {transactions.map(t => (
              <tr key={t.id}>
                <td style={{ fontSize:12 }}>{t.date}</td>
                <td style={{ maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {t.description}
                  {t.order_number && <span style={{ marginLeft:6, fontSize:10, color:'var(--text-tertiary)' }}>{t.order_number}</span>}
                </td>
                <td><span className="pill pill-blue" style={{ fontSize:10, textTransform:'capitalize' }}>{t.category}</span></td>
                <td><span className={`pill ${t.type==='income'?'pill-green':'pill-red'}`} style={{ fontSize:10 }}>{t.type}</span></td>
                <td style={{ fontSize:12, color:'var(--text-secondary)' }}>${t.hst_amount?.toFixed(2)||'0.00'}</td>
                <td style={{ fontWeight:700, color:t.type==='income'?'var(--green)':'var(--red)' }}>
                  {t.type==='income'?'+':'-'}${t.amount_cad?.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
