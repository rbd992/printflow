import React, { useEffect, useState, useCallback } from 'react';
import { api, ordersApi, filamentApi } from '../api/client';
import { onSocketEvent } from '../api/socket';
import { useAuthStore } from '../stores/authStore';
import { BAMBU_CATALOGUE, ALL_MATERIALS } from '../data/bambuCatalogue';

const STATUSES = ['new','quoted','confirmed','printing','printed','post-processing','packed','shipped','delivered','cancelled'];
const STATUS_COLORS = { new:'pill-blue',quoted:'pill-purple',confirmed:'pill-green',printing:'pill-amber',printed:'pill-teal',
  'post-processing':'pill-amber',packed:'pill-blue',shipped:'pill-purple',delivered:'pill-green',cancelled:'pill-red' };

function Modal({ title, onClose, children, width=560 }) {
  return (
    <div style={{ position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="card" style={{ width,maxHeight:'92vh',overflowY:'auto',padding:28,animation:'fadeIn 0.2s ease' }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20 }}>
          <h2 style={{ fontSize:18 }}>{title}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>x</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Price Calculator ───────────────────────────────────────────────
function PriceCalculator({ spools, onApply }) {
  const [material, setMaterial]     = useState('PLA');
  const [grams, setGrams]           = useState('');
  const [laborHours, setLaborHours] = useState('0');
  const [laborRate, setLaborRate]   = useState('25');
  const [markup, setMarkup]         = useState('40');
  const [postProcess, setPostProcess] = useState('0');
  const [includeHST, setIncludeHST] = useState(true);

  // Find average cost per gram for this material from inventory
  const relevantSpools = spools.filter(s=>s.material===material&&s.cost_cad>0);
  const avgCostPerG = relevantSpools.length
    ? relevantSpools.reduce((a,s)=>a+(s.cost_cad/s.full_weight_g),0)/relevantSpools.length
    : 0.025; // default ~$25/kg

  const filamentCost  = parseFloat(grams||0) * avgCostPerG;
  const laborCost     = parseFloat(laborHours||0) * parseFloat(laborRate||0);
  const postCost      = parseFloat(postProcess||0);
  const subtotal      = (filamentCost + laborCost + postCost) * (1 + parseFloat(markup||0)/100);
  const hst           = includeHST ? subtotal * 0.13 : 0;
  const total         = subtotal + hst;

  return (
    <div>
      <div style={{ fontSize:14,fontWeight:600,marginBottom:16,color:'var(--accent)' }}>Price Calculator</div>

      <div className="form-row">
        <div className="form-group">
          <label className="label">Filament Material</label>
          <select className="select" value={material} onChange={e=>setMaterial(e.target.value)}>
            {ALL_MATERIALS.map(m=><option key={m}>{m}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="label">Estimated Grams</label>
          <input className="input" type="number" min="0" step="1" value={grams} onChange={e=>setGrams(e.target.value)} placeholder="e.g. 85" />
        </div>
      </div>

      {relevantSpools.length>0 ? (
        <div style={{ fontSize:11,color:'var(--text-secondary)',marginBottom:12,padding:'6px 10px',background:'var(--bg-hover)',borderRadius:'var(--r-sm)' }}>
          Using avg cost from {relevantSpools.length} {material} spool{relevantSpools.length!==1?'s':''} in inventory: ${(avgCostPerG*1000).toFixed(2)}/kg
        </div>
      ) : (
        <div style={{ fontSize:11,color:'var(--amber)',marginBottom:12,padding:'6px 10px',background:'var(--amber-light)',borderRadius:'var(--r-sm)' }}>
          No {material} spools in inventory — using default $25/kg estimate. Add spools with cost data for accurate pricing.
        </div>
      )}

      <div className="form-row">
        <div className="form-group">
          <label className="label">Labour Hours</label>
          <input className="input" type="number" min="0" step="0.25" value={laborHours} onChange={e=>setLaborHours(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="label">Labour Rate ($/hr)</label>
          <input className="input" type="number" min="0" step="1" value={laborRate} onChange={e=>setLaborRate(e.target.value)} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="label">Post-Processing / Assembly ($)</label>
          <input className="input" type="number" min="0" step="0.5" value={postProcess} onChange={e=>setPostProcess(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="label">Markup (%)</label>
          <input className="input" type="number" min="0" step="5" value={markup} onChange={e=>setMarkup(e.target.value)} />
        </div>
      </div>

      <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:16 }}>
        <input type="checkbox" id="hst" checked={includeHST} onChange={e=>setIncludeHST(e.target.checked)} style={{ width:15,height:15 }} />
        <label htmlFor="hst" style={{ fontSize:13,cursor:'pointer' }}>Include Ontario HST (13%)</label>
      </div>

      {/* Breakdown */}
      <div style={{ background:'var(--bg-hover)',borderRadius:'var(--r-sm)',padding:14,marginBottom:16 }}>
        <div style={{ fontSize:12,fontWeight:600,marginBottom:8,color:'var(--text-tertiary)',textTransform:'uppercase',letterSpacing:'0.05em' }}>Breakdown</div>
        {[
          ['Filament cost', filamentCost],
          ['Labour', laborCost],
          ['Post-processing', postCost],
          [`Markup (${markup}%)`, subtotal - (filamentCost+laborCost+postCost)],
          includeHST ? ['HST (13%)', hst] : null,
        ].filter(Boolean).map(([l,v])=>(
          <div key={l} style={{ display:'flex',justifyContent:'space-between',fontSize:13,padding:'3px 0',borderBottom:'0.5px solid var(--border)' }}>
            <span style={{ color:'var(--text-secondary)' }}>{l}</span>
            <span>${v.toFixed(2)}</span>
          </div>
        ))}
        <div style={{ display:'flex',justifyContent:'space-between',fontSize:16,fontWeight:700,padding:'8px 0 0',color:'var(--accent)' }}>
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>

      <button className="btn btn-primary" style={{ width:'100%',justifyContent:'center' }}
        onClick={()=>onApply(total.toFixed(2))}>
        Apply ${total.toFixed(2)} to Order
      </button>
    </div>
  );
}

// ── Main OrdersPage ───────────────────────────────────────────────
export default function OrdersPage() {
  const [orders,setOrders]     = useState([]);
  const [spools,setSpools]     = useState([]);
  const [loading,setLoading]   = useState(true);
  const [filter,setFilter]     = useState({ status:'',search:'',platform:'' });
  const [editing,setEditing]   = useState(null);
  const [showCalc,setShowCalc] = useState(false);
  const [form,setForm]         = useState({});
  const [saving,setSaving]     = useState(false);
  const [err,setErr]           = useState('');
  const { user } = useAuthStore();
  const canManage = ['owner','manager'].includes(user?.role);
  const isOwner = user?.role === 'owner';

  const load = useCallback(async()=>{
    try {
      const [o, s] = await Promise.all([
        ordersApi.list(),
        filamentApi.list().catch(()=>({data:[]})),
      ]);
      setOrders(o.data);
      setSpools(s.data);
    } catch {}
    finally { setLoading(false); }
  },[]);

  useEffect(()=>{
    load();
    const u1=onSocketEvent('order:created',o=>setOrders(p=>[o,...p]));
    const u2=onSocketEvent('order:updated',o=>setOrders(p=>p.map(x=>x.id===o.id?o:x)));
    const u3=onSocketEvent('order:deleted',({id})=>setOrders(p=>p.filter(x=>x.id!==id)));
    return()=>{u1();u2();u3();};
  },[load]);

  const filtered = orders.filter(o=>{
    if(filter.status && o.status!==filter.status) return false;
    if(filter.platform && o.platform!==filter.platform) return false;
    if(filter.search && !`${o.order_number} ${o.customer_name} ${o.description||''}`.toLowerCase().includes(filter.search.toLowerCase())) return false;
    return true;
  });

  const platforms = [...new Set(orders.map(o=>o.platform).filter(Boolean))];

  function openEdit(order) {
    setForm({ ...order, price_cad:order.price_cad||'' });
    setEditing(order); setErr(''); setShowCalc(false);
  }

  function openNew() {
    setForm({ customer_name:'',customer_email:'',customer_phone:'',description:'',platform:'',price_cad:'',status:'new',notes:'' });
    setEditing({}); setErr(''); setShowCalc(false);
  }

  async function save() {
    setSaving(true); setErr('');
    try {
      const payload = { ...form, price_cad:parseFloat(form.price_cad)||0 };
      if(editing?.id) { await ordersApi.update(editing.id, payload); }
      else { await ordersApi.create(payload); }
      setEditing(null); await load();
    } catch(e) { setErr(e.response?.data?.error||'Save failed'); }
    finally { setSaving(false); }
  }

  async function duplicateOrder(order) {
    setSaving(true);
    try {
      const payload = {
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        customer_phone: order.customer_phone,
        description: order.description,
        platform: order.platform || 'direct',
        price_cad: order.price_cad || 0,
        status: 'new',
        notes: order.notes,
      };
      await ordersApi.create(payload);
      setEditing(null);
      await load();
    } catch(e) { setErr(e.response?.data?.error || 'Duplicate failed'); }
    finally { setSaving(false); }
  }

  function exportCSV() {
    const headers = ['Order #','Customer','Email','Description','Platform','Price','Status','Tracking','Date'];
    const rows = filtered.map(o => [
      o.order_number, o.customer_name, o.customer_email || '', o.description || '',
      o.platform || '', (o.price_cad || 0).toFixed(2), o.status,
      o.tracking_number || '', o.created_at?.slice(0,10) || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'orders.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  async function deleteOrder(order) {
    if(!window.confirm(`Delete order "${order.order_number}" for ${order.customer_name}?\n\nThis will also delete all associated transactions and financial records. This cannot be undone.`)) return;
    try {
      await api.delete(`/api/orders/${order.id}`);
      setEditing(null); await load();
    } catch(e) { alert(e.response?.data?.error||'Delete failed'); }
  }

  async function updateStatus(id, status) {
    try {
      await ordersApi.update(id, { status });
      setOrders(p=>p.map(o=>o.id===id?{...o,status}:o));
    } catch {}
  }

  const F = k => ({ value:form[k]??'', onChange:e=>setForm(f=>({...f,[k]:e.target.value})) });

  const revenue = filtered.filter(o=>o.status!=='cancelled').reduce((a,o)=>a+(o.price_cad||0),0);
  const pending = filtered.filter(o=>['new','quoted','confirmed'].includes(o.status)).length;

  return (
    <div style={{ height:'100%',overflowY:'auto',padding:24 }}>
      <div style={{ maxWidth:1300,margin:'0 auto' }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20 }}>
          <div>
            <h1>Orders</h1>
            <p style={{ color:'var(--text-secondary)',fontSize:13,marginTop:4 }}>{orders.length} orders · ${revenue.toFixed(2)} total</p>
          </div>
          {canManage && <button className="btn btn-primary" onClick={openNew}>+ New Order</button>}
          <button className="btn btn-secondary" onClick={exportCSV}>⬇ CSV</button>
        </div>

        {/* Metrics */}
        <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20 }}>
          {[['Total Orders',orders.length],['Pending',pending],['In Progress',orders.filter(o=>['printing','printed','post-processing','packed'].includes(o.status)).length],['Revenue',`$${orders.filter(o=>o.status!=='cancelled').reduce((a,o)=>a+(o.price_cad||0),0).toFixed(2)}`]].map(([l,v])=>(
            <div key={l} className="card" style={{ padding:16 }}>
              <div style={{ fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em',color:'var(--text-tertiary)',marginBottom:6 }}>{l}</div>
              <div style={{ fontSize:24,fontWeight:700 }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display:'flex',gap:10,marginBottom:16,flexWrap:'wrap' }}>
          <input className="input" placeholder="Search orders..." style={{ width:220 }} value={filter.search} onChange={e=>setFilter(f=>({...f,search:e.target.value}))} />
          <select className="select" style={{ width:150 }} value={filter.status} onChange={e=>setFilter(f=>({...f,status:e.target.value}))}>
            <option value="">All Statuses</option>
            {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          {platforms.length>0 && (
            <select className="select" style={{ width:150 }} value={filter.platform} onChange={e=>setFilter(f=>({...f,platform:e.target.value}))}>
              <option value="">All Platforms</option>
              {platforms.map(p=><option key={p}>{p}</option>)}
            </select>
          )}
          {(filter.search||filter.status||filter.platform) && <button className="btn btn-secondary btn-sm" onClick={()=>setFilter({status:'',search:'',platform:''})}>Clear</button>}
        </div>

        {/* Orders table */}
        <div className="card">
          {loading ? <div style={{ padding:32,color:'var(--text-secondary)' }}>Loading...</div> : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order #</th><th>Customer</th><th>Description</th><th>Platform</th>
                  <th>Price</th><th>Status</th><th>Date</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(o=>(
                  <tr key={o.id} onClick={()=>canManage&&openEdit(o)} style={{ cursor:canManage?'pointer':'default' }}>
                    <td style={{ fontWeight:600,color:'var(--accent)',fontFamily:'monospace',fontSize:12 }}>{o.order_number}</td>
                    <td>
                      <div style={{ fontWeight:500 }}>{o.customer_name}</div>
                      {o.customer_email && <div style={{ fontSize:11,color:'var(--text-tertiary)' }}>{o.customer_email}</div>}
                    </td>
                    <td style={{ maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:12 }}>{o.description||'—'}</td>
                    <td>{o.platform ? <span className="pill pill-blue" style={{ fontSize:10 }}>{o.platform}</span> : '—'}</td>
                    <td style={{ fontWeight:600 }}>${(o.price_cad||0).toFixed(2)}</td>
                    <td><span className={`pill ${STATUS_COLORS[o.status]||'pill-grey'}`}>{o.status}</span></td>
                    <td style={{ fontSize:12,color:'var(--text-tertiary)' }}>{o.created_at?.slice(0,10)}</td>
                    <td onClick={e=>e.stopPropagation()}>
                      {canManage && (
                        <select className="select" style={{ fontSize:11,padding:'3px 6px',height:28 }} value={o.status}
                          onChange={e=>updateStatus(o.id,e.target.value)}>
                          {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length===0 && (
                  <tr><td colSpan={8} style={{ textAlign:'center',padding:40,color:'var(--text-tertiary)' }}>No orders {filter.search||filter.status?'match your filter':'yet'}</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit / New Order Modal */}
      {editing!==null && (
        <Modal title={editing.id?`Order ${editing.order_number}`:'New Order'} width={600} onClose={()=>{setEditing(null);setShowCalc(false);}}>
          {showCalc ? (
            <div>
              <button className="btn btn-ghost btn-sm" style={{ marginBottom:16 }} onClick={()=>setShowCalc(false)}>← Back to order</button>
              <PriceCalculator spools={spools} onApply={price=>{ setForm(f=>({...f,price_cad:price})); setShowCalc(false); }} />
            </div>
          ) : (
            <>
              <div className="form-row">
                <div className="form-group"><label className="label">Customer Name</label><input className="input" {...F('customer_name')} autoFocus /></div>
                <div className="form-group"><label className="label">Email</label><input className="input" type="email" {...F('customer_email')} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="label">Phone</label><input className="input" {...F('customer_phone')} /></div>
                <div className="form-group"><label className="label">Platform / Source</label>
                  <input className="input" {...F('platform')} list="platforms-list" placeholder="e.g. Etsy, Direct, Shopify" />
                  <datalist id="platforms-list">{['Etsy','Shopify','Amazon','Direct','Facebook','Instagram','TikTok'].map(p=><option key={p} value={p}/>)}</datalist>
                </div>
              </div>
              <div className="form-group"><label className="label">Description</label><textarea className="input" rows={2} {...F('description')} placeholder="What are they ordering?" /></div>
              <div className="form-row">
                <div className="form-group">
                  <label className="label">Price ($CAD)</label>
                  <div style={{ display:'flex',gap:6 }}>
                    <input className="input" type="number" step="0.01" min="0" {...F('price_cad')} />
                    <button className="btn btn-secondary btn-sm" onClick={()=>setShowCalc(true)} title="Open price calculator" style={{ flexShrink:0,whiteSpace:'nowrap' }}>
                      🧮 Calculate
                    </button>
                  </div>
                </div>
                <div className="form-group"><label className="label">Status</label>
                  <select className="select" {...F('status')}>
                    {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              {editing?.id && (
                <div className="form-row">
                  <div className="form-group"><label className="label">Tracking #</label><input className="input" {...F('tracking_number')} style={{ fontFamily:'monospace' }} /></div>
                  <div className="form-group"><label className="label">Carrier</label><input className="input" {...F('carrier')} placeholder="Canada Post" /></div>
                </div>
              )}
              <div className="form-group"><label className="label">Notes</label><textarea className="input" rows={2} {...F('notes')} /></div>
              {err && <div style={{ color:'var(--red)',fontSize:12,marginBottom:8 }}>{err}</div>}
              <div style={{ display:'flex',gap:8,justifyContent:'space-between',marginTop:8 }}>
                <div>
                  {editing?.id && isOwner && (
                    <button className="btn btn-danger btn-sm" onClick={()=>deleteOrder(editing)}>Delete Order</button>
                  )}
                  {editing?.id && canManage && (
                    <button className="btn btn-secondary btn-sm" onClick={()=>duplicateOrder(editing)}>⧉ Duplicate</button>
                  )}
                </div>
                <div style={{ display:'flex',gap:8 }}>
                  <button className="btn btn-secondary" onClick={()=>{setEditing(null);setShowCalc(false);}}>Cancel</button>
                  <button className="btn btn-primary" onClick={save} disabled={saving||!form.customer_name}>
                    {saving?'Saving...':(editing?.id?'Save Changes':'Create Order')}
                  </button>
                </div>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
