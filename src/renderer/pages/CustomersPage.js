import React, { useEffect, useState, useCallback } from 'react';
import { api, ordersApi } from '../api/client';
import { useAuthStore } from '../stores/authStore';

function Modal({ title, onClose, children, width = 520 }) {
  return (
    <div style={{ position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="card" style={{ width, maxHeight:'90vh', overflowY:'auto', padding:28 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h2 style={{ fontSize:18 }}>{title}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Avatar({ name, size = 36 }) {
  const initials = name ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';
  const colors = ['#0071E3','#30D158','#FF9F0A','#FF453A','#BF5AF2','#32ADE6'];
  const color = colors[name?.charCodeAt(0) % colors.length] || colors[0];
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:`${color}22`, border:`1.5px solid ${color}44`,
      display:'flex', alignItems:'center', justifyContent:'center', fontSize:size * 0.35, fontWeight:700, color, flexShrink:0 }}>
      {initials}
    </div>
  );
}

const BLANK = { name:'', email:'', phone:'', address:'', city:'', province:'', postal_code:'', notes:'', tags:'' };

export default function CustomersPage() {
  const [customers, setCustomers]   = useState([]);
  const [orders, setOrders]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [selected, setSelected]     = useState(null); // customer detail view
  const [editing, setEditing]       = useState(null);
  const [form, setForm]             = useState(BLANK);
  const [saving, setSaving]         = useState(false);
  const [err, setErr]               = useState('');
  const { user } = useAuthStore();
  const canManage = ['owner', 'manager'].includes(user?.role);

  const load = useCallback(async () => {
    try {
      const [c, o] = await Promise.all([
        api.get('/api/customers'),
        ordersApi.list(),
      ]);
      setCustomers(c.data || []);
      setOrders(o.data || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Build customers from orders if no customer records exist yet
  const allCustomers = customers.length > 0 ? customers : buildFromOrders(orders);

  function buildFromOrders(orders) {
    const map = {};
    orders.forEach(o => {
      const key = (o.customer_email || o.customer_name || '').toLowerCase();
      if (!key) return;
      if (!map[key]) {
        map[key] = {
          id: key, name: o.customer_name, email: o.customer_email,
          phone: o.customer_phone, orders: [], totalSpent: 0,
          firstOrder: o.created_at, lastOrder: o.created_at,
          fromOrders: true,
        };
      }
      map[key].orders.push(o);
      map[key].totalSpent += o.price_cad || 0;
      if (o.created_at > map[key].lastOrder) map[key].lastOrder = o.created_at;
    });
    return Object.values(map).sort((a, b) => b.totalSpent - a.totalSpent);
  }

  function getCustomerOrders(customer) {
    if (customer.fromOrders) return customer.orders || [];
    return orders.filter(o =>
      (o.customer_email && o.customer_email.toLowerCase() === customer.email?.toLowerCase()) ||
      o.customer_name?.toLowerCase() === customer.name?.toLowerCase()
    );
  }

  async function save() {
    setSaving(true); setErr('');
    try {
      if (editing?.id && !editing.fromOrders) {
        await api.put(`/api/customers/${editing.id}`, form);
      } else {
        await api.post('/api/customers', form);
      }
      setEditing(null);
      await load();
    } catch (e) {
      setErr(e.response?.data?.error || 'Save failed');
    }
    setSaving(false);
  }

  async function deleteCustomer(customer) {
    if (!window.confirm(`Delete ${customer.name}? Their order history will be kept.`)) return;
    try {
      await api.delete(`/api/customers/${customer.id}`);
      setSelected(null);
      await load();
    } catch (e) {
      alert(e.response?.data?.error || 'Delete failed');
    }
  }

  function openEdit(customer) {
    setForm({
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      city: customer.city || '',
      province: customer.province || 'ON',
      postal_code: customer.postal_code || '',
      notes: customer.notes || '',
      tags: customer.tags || '',
    });
    setEditing(customer);
    setErr('');
  }

  const F = k => ({ value: form[k] ?? '', onChange: e => setForm(f => ({ ...f, [k]: e.target.value })) });

  const filtered = allCustomers.filter(c =>
    !search || `${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(search.toLowerCase())
  );

  // Metrics
  const totalRevenue  = allCustomers.reduce((a, c) => a + (c.totalSpent || getCustomerOrders(c).reduce((s, o) => s + (o.price_cad || 0), 0)), 0);
  const repeatBuyers  = allCustomers.filter(c => (c.orders || getCustomerOrders(c)).length > 1).length;
  const avgOrderValue = orders.length ? orders.reduce((a, o) => a + (o.price_cad || 0), 0) / orders.length : 0;

  // Selected customer detail
  const selectedOrders = selected ? getCustomerOrders(selected) : [];
  const selectedRevenue = selectedOrders.reduce((a, o) => a + (o.price_cad || 0), 0);

  return (
    <div style={{ height:'100%', overflowY:'auto', padding:24 }}>
      <div style={{ maxWidth:1300, margin:'0 auto' }}>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div>
            <h1>Customers</h1>
            <p style={{ color:'var(--text-secondary)', fontSize:13, marginTop:4 }}>
              {allCustomers.length} customers · ${totalRevenue.toFixed(2)} total revenue
            </p>
          </div>
          {canManage && (
            <button className="btn btn-primary" onClick={() => { setForm(BLANK); setEditing({}); setErr(''); }}>
              + Add Customer
            </button>
          )}
        </div>

        {/* Metrics */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
          {[
            ['Total Customers', allCustomers.length],
            ['Repeat Buyers', repeatBuyers],
            ['Avg Order Value', `$${avgOrderValue.toFixed(2)}`],
            ['Total Revenue', `$${totalRevenue.toFixed(2)}`],
          ].map(([label, value]) => (
            <div key={label} className="card" style={{ padding:16 }}>
              <div style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--text-tertiary)', marginBottom:6 }}>{label}</div>
              <div style={{ fontSize:24, fontWeight:700 }}>{value}</div>
            </div>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap:16 }}>

          {/* Customer list */}
          <div>
            <div style={{ marginBottom:12 }}>
              <input className="input" placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} style={{ width:'100%', maxWidth:320 }} />
            </div>

            <div className="card">
              {loading ? (
                <div style={{ padding:32, textAlign:'center', color:'var(--text-secondary)' }}>Loading...</div>
              ) : filtered.length === 0 ? (
                <div style={{ padding:48, textAlign:'center', color:'var(--text-tertiary)' }}>
                  {search ? 'No customers match your search' : 'No customers yet — they\'ll appear here as you add orders'}
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Contact</th>
                      <th>Orders</th>
                      <th>Total Spent</th>
                      <th>Last Order</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(c => {
                      const custOrders = c.orders || getCustomerOrders(c);
                      const spent = c.totalSpent ?? custOrders.reduce((a, o) => a + (o.price_cad || 0), 0);
                      const lastOrder = c.lastOrder || custOrders[0]?.created_at;
                      const isSelected = selected?.id === c.id;
                      return (
                        <tr key={c.id} onClick={() => setSelected(isSelected ? null : c)}
                          style={{ cursor:'pointer', background: isSelected ? 'var(--accent-light)' : undefined }}>
                          <td>
                            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                              <Avatar name={c.name} size={32} />
                              <div>
                                <div style={{ fontWeight:600 }}>{c.name}</div>
                                {custOrders.length > 1 && (
                                  <span style={{ fontSize:10, color:'var(--accent)', fontWeight:600 }}>★ Repeat buyer</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div style={{ fontSize:12 }}>{c.email || '—'}</div>
                            {c.phone && <div style={{ fontSize:11, color:'var(--text-tertiary)' }}>{c.phone}</div>}
                          </td>
                          <td style={{ fontWeight:600 }}>{custOrders.length}</td>
                          <td style={{ fontWeight:700, color:'var(--accent)' }}>${spent.toFixed(2)}</td>
                          <td style={{ fontSize:12, color:'var(--text-tertiary)' }}>{lastOrder?.slice(0, 10) || '—'}</td>
                          <td onClick={e => e.stopPropagation()}>
                            {canManage && !c.fromOrders && (
                              <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)} style={{ fontSize:11 }}>Edit</button>
                            )}
                            {canManage && c.fromOrders && (
                              <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)} style={{ fontSize:11 }}>Save</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Customer detail panel */}
          {selected && (
            <div>
              <div className="card" style={{ padding:20 }}>
                {/* Header */}
                <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:20, paddingBottom:16, borderBottom:'0.5px solid var(--border)' }}>
                  <Avatar name={selected.name} size={52} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:16, fontWeight:700 }}>{selected.name}</div>
                    {selected.email && <div style={{ fontSize:12, color:'var(--text-secondary)' }}>{selected.email}</div>}
                    {selected.phone && <div style={{ fontSize:12, color:'var(--text-tertiary)' }}>{selected.phone}</div>}
                  </div>
                  <button className="btn btn-ghost btn-icon" onClick={() => setSelected(null)}>✕</button>
                </div>

                {/* Stats */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
                  {[
                    ['Orders', selectedOrders.length],
                    ['Total Spent', `$${selectedRevenue.toFixed(2)}`],
                    ['Avg Order', `$${selectedOrders.length ? (selectedRevenue / selectedOrders.length).toFixed(2) : '0.00'}`],
                    ['Since', selectedOrders[selectedOrders.length - 1]?.created_at?.slice(0, 10) || '—'],
                  ].map(([label, value]) => (
                    <div key={label} style={{ padding:'10px 12px', background:'var(--bg-hover)', borderRadius:'var(--r-sm)', textAlign:'center' }}>
                      <div style={{ fontSize:16, fontWeight:700 }}>{value}</div>
                      <div style={{ fontSize:10, color:'var(--text-tertiary)', marginTop:2 }}>{label}</div>
                    </div>
                  ))}
                </div>

                {selected.address && (
                  <div style={{ marginBottom:14, padding:'10px 12px', background:'var(--bg-hover)', borderRadius:'var(--r-sm)', fontSize:12, color:'var(--text-secondary)' }}>
                    📍 {selected.address}{selected.city ? `, ${selected.city}` : ''}{selected.province ? ` ${selected.province}` : ''} {selected.postal_code}
                  </div>
                )}

                {selected.notes && (
                  <div style={{ marginBottom:14, padding:'10px 12px', background:'var(--amber-light)', borderRadius:'var(--r-sm)', fontSize:12, color:'var(--amber)', lineHeight:1.6 }}>
                    📝 {selected.notes}
                  </div>
                )}

                {canManage && (
                  <div style={{ display:'flex', gap:8, marginBottom:16 }}>
                    <button className="btn btn-secondary btn-sm" style={{ flex:1, justifyContent:'center' }} onClick={() => openEdit(selected)}>
                      Edit Customer
                    </button>
                    {selected.email && (
                      <button className="btn btn-ghost btn-sm" onClick={() => window.printflow.openExternal(`mailto:${selected.email}`)}>
                        ✉ Email
                      </button>
                    )}
                  </div>
                )}

                {/* Order history */}
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-tertiary)', marginBottom:10 }}>
                  Order History
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {selectedOrders.length === 0 ? (
                    <div style={{ fontSize:12, color:'var(--text-tertiary)', padding:'12px 0' }}>No orders found</div>
                  ) : (
                    selectedOrders.map(o => (
                      <div key={o.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', background:'var(--bg-hover)', borderRadius:'var(--r-sm)' }}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:12, fontWeight:600 }}>{o.order_number}</div>
                          <div style={{ fontSize:11, color:'var(--text-secondary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:180 }}>{o.description || 'Order'}</div>
                        </div>
                        <div style={{ fontSize:12, fontWeight:700 }}>${(o.price_cad || 0).toFixed(2)}</div>
                        <span className={`pill ${o.status === 'delivered' ? 'pill-green' : o.status === 'cancelled' ? 'pill-red' : 'pill-blue'}`} style={{ fontSize:9 }}>
                          {o.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit modal */}
      {editing !== null && (
        <Modal title={editing.id && !editing.fromOrders ? 'Edit Customer' : 'Add Customer'} onClose={() => setEditing(null)}>
          <div className="form-row">
            <div className="form-group">
              <label className="label">Full Name *</label>
              <input className="input" {...F('name')} autoFocus />
            </div>
            <div className="form-group">
              <label className="label">Email</label>
              <input className="input" type="email" {...F('email')} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="label">Phone</label>
              <input className="input" {...F('phone')} />
            </div>
            <div className="form-group">
              <label className="label">Province</label>
              <select className="select" {...F('province')}>
                {['ON','BC','AB','QC','MB','SK','NS','NB','NL','PE','NT','YT','NU'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="label">Address</label>
            <input className="input" {...F('address')} placeholder="123 Main St" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="label">City</label>
              <input className="input" {...F('city')} />
            </div>
            <div className="form-group">
              <label className="label">Postal Code</label>
              <input className="input" {...F('postal_code')} placeholder="L9R 0A1" style={{ fontFamily:'monospace' }} />
            </div>
          </div>
          <div className="form-group">
            <label className="label">Tags <span style={{ color:'var(--text-tertiary)', fontWeight:400 }}>(comma-separated)</span></label>
            <input className="input" {...F('tags')} placeholder="e.g. vip, repeat, wholesale" />
          </div>
          <div className="form-group">
            <label className="label">Notes</label>
            <textarea className="input" rows={3} {...F('notes')} placeholder="Any notes about this customer..." />
          </div>

          {err && <div style={{ color:'var(--red)', fontSize:12, marginBottom:8 }}>{err}</div>}
          <div style={{ display:'flex', gap:8, justifyContent:'space-between', marginTop:8 }}>
            <div>
              {editing.id && !editing.fromOrders && canManage && (
                <button className="btn btn-danger btn-sm" onClick={() => deleteCustomer(editing)}>Delete</button>
              )}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving || !form.name}>
                {saving ? 'Saving...' : 'Save Customer'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
