import React, { useEffect, useState, useCallback } from 'react';
import { api, ordersApi } from '../api/client';
import { onSocketEvent } from '../api/socket';
import { useAuthStore } from '../stores/authStore';

const CARRIERS = {
  'Canada Post': { icon: '🇨🇦', color: 'var(--red)' },
  'UPS':         { icon: '🟤', color: 'var(--amber)' },
  'FedEx':       { icon: '🟣', color: 'var(--purple)' },
};

const CP_SERVICES = {
  'DOM.RP': 'Regular Parcel',
  'DOM.EP': 'Expedited Parcel',
  'DOM.XP': 'Xpresspost',
  'DOM.PC': 'Priority',
};

function Modal({ title, onClose, children, width = 540 }) {
  return (
    <div style={{ position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.55)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="card" style={{ width, maxHeight:'92vh', overflowY:'auto', padding:28, animation:'fadeIn 0.2s ease' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h2 style={{ fontSize:18 }}>{title}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function ShippingPage() {
  const [shipments, setShipments]   = useState([]);
  const [orders, setOrders]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showLabel, setShowLabel]   = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [rates, setRates]           = useState([]);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [selectedRate, setSelectedRate] = useState(null);
  const [labelCreating, setLabelCreating] = useState(false);
  const [labelResult, setLabelResult] = useState(null);
  const [cpConfigured, setCpConfigured] = useState(null);
  const { user } = useAuthStore();
  const canManage = ['owner','manager'].includes(user?.role);

  // Label form state
  const [labelForm, setLabelForm] = useState({
    weight_kg: '0.5',
    length: '20', width: '15', height: '10',
    to_name: '', to_line1: '', to_city: '',
    to_province: 'ON', to_postal: '',
  });

  const load = useCallback(async () => {
    try {
      const [s, o] = await Promise.all([
        api.get('/api/shipping'),
        ordersApi.list({ status: 'packed' }),
      ]);
      setShipments(s.data);
      setOrders(o.data);

      // Check Canada Post config
      if (canManage) {
        try {
          const cfg = await api.get('/api/shipping/config');
          setCpConfigured(cfg.data);
        } catch {}
      }
    } catch {}
    finally { setLoading(false); }
  }, [canManage]);

  useEffect(() => {
    load();
    const off = onSocketEvent('order:updated', () => load());
    return () => off();
  }, [load]);

  async function getRates() {
    if (!labelForm.to_postal || !labelForm.weight_kg) return;
    setRatesLoading(true); setRates([]); setSelectedRate(null);
    try {
      const res = await api.post('/api/shipping/rates', {
        to_postal:  labelForm.to_postal.replace(/\s/g,''),
        weight_kg:  parseFloat(labelForm.weight_kg),
        dimensions: { length: parseFloat(labelForm.length), width: parseFloat(labelForm.width), height: parseFloat(labelForm.height) },
      });
      setRates(res.data);
      if (res.data.length) setSelectedRate(res.data[0].service_code);
    } catch (e) {
      console.error(e);
    } finally { setRatesLoading(false); }
  }

  async function createLabel() {
    if (!selectedOrder || !selectedRate) return;
    setLabelCreating(true); setLabelResult(null);
    try {
      const res = await api.post('/api/shipping/label', {
        order_id:     selectedOrder.id,
        weight_kg:    parseFloat(labelForm.weight_kg),
        dimensions:   { length: parseFloat(labelForm.length), width: parseFloat(labelForm.width), height: parseFloat(labelForm.height) },
        service_code: selectedRate,
        to_address: {
          name:     labelForm.to_name || selectedOrder.customer_name,
          line1:    labelForm.to_line1,
          city:     labelForm.to_city,
          province: labelForm.to_province,
          postal:   labelForm.to_postal,
        },
      });
      setLabelResult(res.data);
      await load();
    } catch (e) {
      console.error(e);
    } finally { setLabelCreating(false); }
  }

  function openLabelModal(order) {
    setSelectedOrder(order);
    setLabelForm(f => ({ ...f, to_name: order.customer_name }));
    setRates([]); setSelectedRate(null); setLabelResult(null);
    setShowLabel(true);
  }

  const LF = k => ({ value: labelForm[k] ?? '', onChange: e => setLabelForm(f => ({ ...f, [k]: e.target.value })) });

  const inTransit = shipments.filter(s => s.status === 'shipped').length;
  const delivered = shipments.filter(s => s.status === 'delivered').length;

  return (
    <div style={{ height:'100%', overflowY:'auto', padding:24 }}>
      <div style={{ maxWidth:1200, margin:'0 auto' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div>
            <h1>Shipping</h1>
            <p style={{ color:'var(--text-secondary)', fontSize:13, marginTop:4 }}>
              Canada Post rate quotes, label generation, and shipment tracking
            </p>
          </div>
          {canManage && (
            <button className="btn btn-primary" onClick={() => { setSelectedOrder(null); setShowLabel(true); setRates([]); setLabelResult(null); }}>
              ＋ Create Label
            </button>
          )}
        </div>

        {/* Metrics */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
          {[
            ['Total Shipments', shipments.length],
            ['In Transit',      inTransit],
            ['Delivered',       delivered],
            ['Packed — Ready',  orders.length],
          ].map(([l, v]) => (
            <div key={l} className="card" style={{ padding:16 }}>
              <div style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--text-tertiary)', marginBottom:6 }}>{l}</div>
              <div style={{ fontSize:24, fontWeight:700 }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Canada Post config banner */}
        {cpConfigured && (
          <div style={{ padding:'10px 16px', borderRadius:'var(--r-sm)', marginBottom:14, fontSize:13, display:'flex', alignItems:'center', gap:10,
            background: cpConfigured.configured ? 'var(--green-light)' : 'var(--amber-light)',
            border: `0.5px solid ${cpConfigured.configured ? 'rgba(48,209,88,0.3)' : 'rgba(255,159,10,0.3)'}`,
            color: cpConfigured.configured ? 'var(--green)' : 'var(--amber)',
          }}>
            {cpConfigured.configured
              ? `✓ Canada Post API connected${cpConfigured.sandbox ? ' (sandbox mode)' : ''} · Ship from ${cpConfigured.from_postal}`
              : '⚠ Canada Post API not configured — add credentials to your server .env file to generate real labels. Mock rates are shown.'}
          </div>
        )}

        {/* Orders ready to ship */}
        {orders.length > 0 && canManage && (
          <div className="card" style={{ marginBottom:14 }}>
            <div style={{ padding:'14px 20px', borderBottom:'0.5px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h3>📦 Ready to Ship</h3>
              <span className="pill pill-amber">{orders.length} order{orders.length !== 1 ? 's' : ''} packed</span>
            </div>
            <table className="data-table">
              <thead><tr><th>Order</th><th>Customer</th><th>Item</th><th>Value</th><th></th></tr></thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td style={{ fontWeight:600, color:'var(--accent)' }}>{o.order_number}</td>
                    <td>{o.customer_name}</td>
                    <td style={{ maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{o.description}</td>
                    <td>${o.price_cad?.toFixed(2)}</td>
                    <td><button className="btn btn-primary btn-sm" onClick={() => openLabelModal(o)}>Create Label</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Carrier selector info */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:14 }}>
          {Object.entries(CARRIERS).map(([name, meta]) => (
            <div key={name} className="card" style={{ padding:16, display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:40, height:40, borderRadius:10, background:`${meta.color}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>
                {meta.icon}
              </div>
              <div>
                <div style={{ fontWeight:600, fontSize:13 }}>{name}</div>
                <div style={{ fontSize:11, color:'var(--text-secondary)' }}>
                  {name === 'Canada Post' ? 'Live rates + labels' : 'Coming in Phase 4'}
                </div>
              </div>
              <span className={`pill ${name === 'Canada Post' ? 'pill-green' : 'pill-amber'}`} style={{ marginLeft:'auto', fontSize:10 }}>
                {name === 'Canada Post' ? 'Active' : 'Soon'}
              </span>
            </div>
          ))}
        </div>

        {/* Shipments table */}
        <div className="card">
          <div style={{ padding:'14px 20px', borderBottom:'0.5px solid var(--border)' }}><h3>All Shipments</h3></div>
          {loading ? <div style={{ padding:24, color:'var(--text-secondary)' }}>Loading…</div> : (
            <table className="data-table">
              <thead><tr><th>Order</th><th>Customer</th><th>Carrier</th><th>Tracking #</th><th>Shipped</th><th>Status</th></tr></thead>
              <tbody>
                {shipments.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight:600, color:'var(--accent)' }}>{s.order_number}</td>
                    <td>{s.customer_name}</td>
                    <td><span className="pill pill-blue" style={{ fontSize:10 }}>{s.carrier || '—'}</span></td>
                    <td>
                      {s.tracking_number ? (
                        <span style={{ fontFamily:'monospace', fontSize:11, color:'var(--accent)', cursor:'pointer' }}
                          onClick={() => window.printflow.openExternal(`https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor=${s.tracking_number}`)}>
                          {s.tracking_number}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ fontSize:12 }}>{s.updated_at?.slice(0,10) || '—'}</td>
                    <td>
                      <span className={`pill ${s.status === 'delivered' ? 'pill-green' : s.status === 'shipped' ? 'pill-blue' : 'pill-amber'}`}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {shipments.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign:'center', padding:32, color:'var(--text-tertiary)' }}>No shipments yet</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Label creation modal */}
      {showLabel && (
        <Modal title="Create Shipping Label" width={580} onClose={() => { setShowLabel(false); setLabelResult(null); }}>
          {labelResult ? (
            /* ── Success state ── */
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:48, marginBottom:12 }}>✅</div>
              <h3 style={{ marginBottom:8 }}>Label Created!</h3>
              <div style={{ fontFamily:'monospace', fontSize:16, color:'var(--accent)', marginBottom:16, padding:'10px 16px', background:'var(--bg-hover)', borderRadius:'var(--r-sm)' }}>
                {labelResult.tracking_number}
              </div>
              {labelResult.sandbox && <p style={{ fontSize:12, color:'var(--amber)', marginBottom:12 }}>⚠ Sandbox mode — this is a test tracking number</p>}
              <p style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:20 }}>
                Order updated to Packed. Tracking number saved.
                {labelResult.tracking_number && !labelResult.sandbox && (
                  <> <button className="btn btn-ghost btn-sm" onClick={() => window.printflow.openExternal(`https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor=${labelResult.tracking_number}`)}>Track →</button></>
                )}
              </p>
              <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }} onClick={() => { setShowLabel(false); setLabelResult(null); }}>Done</button>
            </div>
          ) : (
            /* ── Form state ── */
            <>
              {/* Order selector */}
              <div className="form-group">
                <label className="label">Order</label>
                <select className="select" value={selectedOrder?.id || ''} onChange={e => {
                  const o = orders.find(x => x.id === parseInt(e.target.value));
                  setSelectedOrder(o || null);
                  if (o) setLabelForm(f => ({ ...f, to_name: o.customer_name }));
                  setRates([]); setSelectedRate(null);
                }}>
                  <option value="">— Select packed order —</option>
                  {orders.map(o => <option key={o.id} value={o.id}>{o.order_number} — {o.customer_name}</option>)}
                </select>
              </div>

              {/* Destination */}
              <div style={{ fontWeight:600, fontSize:12, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--text-secondary)', marginBottom:8, marginTop:4 }}>Ship To</div>
              <div className="form-group"><label className="label">Name</label><input className="input" {...LF('to_name')} /></div>
              <div className="form-group"><label className="label">Street Address</label><input className="input" {...LF('to_line1')} placeholder="123 Main St" /></div>
              <div className="form-row">
                <div className="form-group"><label className="label">City</label><input className="input" {...LF('to_city')} /></div>
                <div className="form-group"><label className="label">Province</label>
                  <select className="select" {...LF('to_province')}>
                    {['AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group"><label className="label">Postal Code</label><input className="input" {...LF('to_postal')} placeholder="A1A 1A1" style={{ fontFamily:'monospace', textTransform:'uppercase' }} /></div>

              {/* Package dimensions */}
              <div style={{ fontWeight:600, fontSize:12, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--text-secondary)', marginBottom:8, marginTop:4 }}>Package</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:10, marginBottom:14 }}>
                {[['Weight (kg)','weight_kg'],['Length (cm)','length'],['Width (cm)','width'],['Height (cm)','height']].map(([l,k]) => (
                  <div key={k} className="form-group">
                    <label className="label">{l}</label>
                    <input className="input" type="number" step="0.1" min="0" {...LF(k)} />
                  </div>
                ))}
              </div>

              {/* Get rates button */}
              <button className="btn btn-secondary" style={{ width:'100%', justifyContent:'center', marginBottom:14 }}
                onClick={getRates} disabled={ratesLoading || !labelForm.to_postal || !labelForm.weight_kg}>
                {ratesLoading ? 'Getting rates…' : '🇨🇦 Get Canada Post Rates'}
              </button>

              {/* Rate selection */}
              {rates.length > 0 && (
                <div style={{ marginBottom:14 }}>
                  <label className="label" style={{ marginBottom:8, display:'block' }}>Select Service</label>
                  {rates.map(r => (
                    <div key={r.service_code} onClick={() => setSelectedRate(r.service_code)} style={{
                      display:'flex', alignItems:'center', gap:12, padding:'11px 14px',
                      borderRadius:'var(--r-sm)', marginBottom:6, cursor:'pointer',
                      border: `0.5px solid ${selectedRate === r.service_code ? 'var(--accent)' : 'var(--border)'}`,
                      background: selectedRate === r.service_code ? 'var(--accent-light)' : 'var(--bg-hover)',
                    }}>
                      <div style={{ width:18, height:18, borderRadius:'50%', border:`2px solid ${selectedRate===r.service_code?'var(--accent)':'var(--border-strong)'}`, background:selectedRate===r.service_code?'var(--accent)':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        {selectedRate===r.service_code && <div style={{ width:8,height:8,borderRadius:'50%',background:'#fff' }}/>}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:500 }}>{r.service_name}</div>
                        <div style={{ fontSize:11, color:'var(--text-secondary)' }}>{r.expected_delivery}{r.guaranteed ? ' · Guaranteed' : ''}{r.trackable ? ' · Trackable' : ''}</div>
                      </div>
                      <div style={{ fontSize:15, fontWeight:700 }}>${r.price_cad?.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => setShowLabel(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={createLabel}
                  disabled={labelCreating || !selectedOrder || !selectedRate || !labelForm.to_postal}>
                  {labelCreating ? 'Creating label…' : 'Generate Label & Save Tracking'}
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
