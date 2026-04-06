import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { useAuthStore } from '../stores/authStore';

// ── Quote / Invoice PDF Generator ─────────────────────────────────────────
// Generates a professional PDF quote or invoice using HTML + print dialog

const HST_RATE = 0.13;

function formatCAD(n) {
  return `$${(parseFloat(n) || 0).toFixed(2)}`;
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });
}

const BLANK_LINE = { description: '', qty: 1, unit_price: '', hst: true };

export default function QuotePage() {
  const { user } = useAuthStore();
  const [docType, setDocType]   = useState('quote');  // 'quote' | 'invoice'
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders]     = useState([]);

  // Doc fields
  const [docNum, setDocNum]     = useState('');
  const [docDate, setDocDate]   = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate]   = useState('');
  const [customer, setCustomer] = useState({ name: '', email: '', address: '', city: '', province: 'ON', postal: '' });
  const [lines, setLines]       = useState([{ ...BLANK_LINE }]);
  const [notes, setNotes]       = useState('Thank you for your business!');
  const [linkedOrder, setLinkedOrder] = useState('');

  // Business info (editable)
  const [biz, setBiz] = useState({
    name: 'Alliston 3D Prints',
    address: 'Alliston, Ontario',
    email: 'robert@alliston3dprints.ca',
    phone: '',
    hst_number: '',
  });

  useEffect(() => {
    api.get('/api/customers').then(r => setCustomers(r.data || [])).catch(() => {});
    api.get('/api/orders').then(r => setOrders(r.data || [])).catch(() => {});
    // Load persisted business info
    api.get('/api/settings/biz_info').then(r => { if (r.data?.value) setBiz(b => ({ ...b, ...r.data.value })); }).catch(() => {});
    // Auto-generate doc number
    const prefix = docType === 'quote' ? 'Q' : 'INV';
    const num = String(Math.floor(Date.now() / 1000) % 100000).padStart(5, '0');
    setDocNum(`${prefix}-${num}`);
  }, [docType]);

  async function saveBizInfo() {
    try {
      await api.post('/api/settings', { key: 'biz_info', value: biz });
    } catch {}
  }

  function fillFromCustomer(id) {
    const c = customers.find(c => String(c.id) === String(id));
    if (c) setCustomer({ name: c.name, email: c.email || '', address: c.address || '', city: c.city || '', province: c.province || 'ON', postal: c.postal_code || '' });
  }

  function fillFromOrder(id) {
    const o = orders.find(o => String(o.id) === String(id));
    if (!o) return;
    setLinkedOrder(id);
    setCustomer(c => ({ ...c, name: o.customer_name, email: o.customer_email || '' }));
    setLines([{ description: o.description || 'Custom 3D Print', qty: 1, unit_price: o.price_cad || '', hst: true }]);
  }

  function updateLine(i, k, v) {
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [k]: v } : l));
  }

  function addLine() { setLines(prev => [...prev, { ...BLANK_LINE }]); }
  function removeLine(i) { setLines(prev => prev.filter((_, idx) => idx !== i)); }

  // Calculations
  const subtotal   = lines.reduce((a, l) => a + (parseFloat(l.unit_price) || 0) * (parseFloat(l.qty) || 1), 0);
  const hstAmount  = lines.reduce((a, l) => l.hst ? a + (parseFloat(l.unit_price) || 0) * (parseFloat(l.qty) || 1) * HST_RATE : a, 0);
  const total      = subtotal + hstAmount;

  function generateAndPrint() {
    const html = buildHTML({ docType, docNum, docDate, dueDate, customer, lines, notes, biz, subtotal, hstAmount, total });
    const win = window.open('', '_blank', 'width=900,height=700');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
  }

  async function saveToOrder() {
    if (!linkedOrder) { alert('Link an order first'); return; }
    // Could save quote number to order notes in future
    alert('Quote saved. Link it to an order by adding the quote number to the order notes.');
  }

  const canAccess = ['owner', 'manager'].includes(user?.role);

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 24 }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h1>Quote & Invoice</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
              Generate professional quotes and invoices as PDFs
            </p>
          </div>
          <button className="btn btn-primary" onClick={generateAndPrint}>
            🖨 Print / Save PDF
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>

          {/* Main form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Doc type + number */}
            <div className="card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                {['quote', 'invoice'].map(t => (
                  <button key={t} className={`btn btn-sm ${docType === t ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setDocType(t)} style={{ textTransform: 'capitalize' }}>
                    {t === 'quote' ? '📋 Quote' : '🧾 Invoice'}
                  </button>
                ))}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="label">{docType === 'quote' ? 'Quote' : 'Invoice'} Number</label>
                  <input className="input" value={docNum} onChange={e => setDocNum(e.target.value)} style={{ fontFamily: 'monospace' }} />
                </div>
                <div className="form-group">
                  <label className="label">Date</label>
                  <input className="input" type="date" value={docDate} onChange={e => setDocDate(e.target.value)} />
                </div>
                {docType === 'invoice' && (
                  <div className="form-group">
                    <label className="label">Due Date</label>
                    <input className="input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                  </div>
                )}
              </div>
            </div>

            {/* Customer */}
            <div className="card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Bill To</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select className="select" style={{ fontSize: 12 }} onChange={e => fillFromCustomer(e.target.value)}>
                    <option value="">Fill from customer…</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select className="select" style={{ fontSize: 12 }} onChange={e => fillFromOrder(e.target.value)}>
                    <option value="">Fill from order…</option>
                    {orders.slice(0, 50).map(o => <option key={o.id} value={o.id}>{o.order_number} — {o.customer_name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="label">Name</label>
                  <input className="input" value={customer.name} onChange={e => setCustomer(c => ({ ...c, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="label">Email</label>
                  <input className="input" type="email" value={customer.email} onChange={e => setCustomer(c => ({ ...c, email: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="label">Address</label>
                <input className="input" value={customer.address} onChange={e => setCustomer(c => ({ ...c, address: e.target.value }))} placeholder="123 Main St" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="label">City</label>
                  <input className="input" value={customer.city} onChange={e => setCustomer(c => ({ ...c, city: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="label">Province</label>
                  <select className="select" value={customer.province} onChange={e => setCustomer(c => ({ ...c, province: e.target.value }))}>
                    {['ON','BC','AB','QC','MB','SK','NS','NB','NL','PE'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Postal</label>
                  <input className="input" value={customer.postal} onChange={e => setCustomer(c => ({ ...c, postal: e.target.value }))} style={{ fontFamily: 'monospace' }} />
                </div>
              </div>
            </div>

            {/* Line items */}
            <div className="card" style={{ padding: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Line Items</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 100px 60px 30px', gap: 6, marginBottom: 8 }}>
                {['Description', 'Qty', 'Unit Price', 'HST', ''].map(h => (
                  <div key={h} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>{h}</div>
                ))}
              </div>
              {lines.map((l, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 100px 60px 30px', gap: 6, marginBottom: 6 }}>
                  <input className="input" value={l.description} onChange={e => updateLine(i, 'description', e.target.value)} placeholder="Item description" style={{ fontSize: 13 }} />
                  <input className="input" type="number" min="1" value={l.qty} onChange={e => updateLine(i, 'qty', e.target.value)} style={{ fontSize: 13 }} />
                  <input className="input" type="number" min="0" step="0.01" value={l.unit_price} onChange={e => updateLine(i, 'unit_price', e.target.value)} placeholder="0.00" style={{ fontSize: 13, fontFamily: 'monospace' }} />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <input type="checkbox" checked={l.hst} onChange={e => updateLine(i, 'hst', e.target.checked)} style={{ width: 16, height: 16 }} />
                  </div>
                  <button onClick={() => removeLine(i)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 14 }}>✕</button>
                </div>
              ))}
              <button className="btn btn-ghost btn-sm" onClick={addLine} style={{ marginTop: 4 }}>+ Add Line</button>

              {/* Totals */}
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '0.5px solid var(--border)' }}>
                {[
                  ['Subtotal', formatCAD(subtotal)],
                  [`HST (13%)`, formatCAD(hstAmount)],
                ].map(([l, v]) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0', color: 'var(--text-secondary)' }}>
                    <span>{l}</span><span>{v}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, padding: '8px 0 0', color: 'var(--accent)', borderTop: '0.5px solid var(--border)', marginTop: 6 }}>
                  <span>Total</span><span>{formatCAD(total)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="card" style={{ padding: 18 }}>
              <label className="label">Notes / Payment Instructions</label>
              <textarea className="input" rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </div>

          {/* Right panel — business info */}
          <div>
            <div className="card" style={{ padding: 18, marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Your Business Info</div>
              {[
                ['Business Name', 'name'],
                ['Address', 'address'],
                ['Email', 'email'],
                ['Phone', 'phone'],
                ['HST Number', 'hst_number'],
              ].map(([label, key]) => (
                <div key={key} className="form-group">
                  <label className="label">{label}</label>
                  <input className="input" value={biz[key]} onChange={e => setBiz(b => ({ ...b, [key]: e.target.value }))} style={{ fontSize: 12 }} />
                </div>
              ))}
              <button className="btn btn-secondary btn-sm" style={{ width:'100%',justifyContent:'center',marginTop:4 }} onClick={saveBizInfo}>
                Save Business Info
              </button>
            </div>

            <div className="card" style={{ padding: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Preview</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>{biz.name}</div>
                <div>{biz.address}</div>
                <div style={{ marginTop: 8, fontWeight: 700, color: 'var(--accent)', fontSize: 13 }}>
                  {docType === 'quote' ? 'QUOTE' : 'INVOICE'} {docNum}
                </div>
                <div>{formatDate(docDate)}</div>
                <div style={{ marginTop: 8 }}>
                  <strong>Bill To:</strong><br />
                  {customer.name || '—'}<br />
                  {customer.email}
                </div>
                <div style={{ marginTop: 8 }}>
                  <strong>Items:</strong> {lines.filter(l => l.description).length}<br />
                  <strong>Total:</strong> {formatCAD(total)}
                </div>
              </div>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 14 }} onClick={generateAndPrint}>
                🖨 Generate PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── HTML template for the printed PDF ─────────────────────────────────────
function buildHTML({ docType, docNum, docDate, dueDate, customer, lines, notes, biz, subtotal, hstAmount, total }) {
  const title = docType === 'quote' ? 'QUOTE' : 'INVOICE';
  const validUntil = new Date(docDate);
  validUntil.setDate(validUntil.getDate() + 30);

  const lineRows = lines.filter(l => l.description).map(l => {
    const qty = parseFloat(l.qty) || 1;
    const price = parseFloat(l.unit_price) || 0;
    const lineTotal = qty * price;
    return `
      <tr>
        <td>${l.description}</td>
        <td style="text-align:center">${qty}</td>
        <td style="text-align:right">$${price.toFixed(2)}</td>
        <td style="text-align:center">${l.hst ? '✓' : '—'}</td>
        <td style="text-align:right">$${lineTotal.toFixed(2)}</td>
      </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title} ${docNum}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; font-size: 13px; color: #1a1a2e; background: white; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
    .biz-name { font-size: 22px; font-weight: 800; color: #0071e3; margin-bottom: 4px; }
    .biz-info { font-size: 12px; color: #666; line-height: 1.7; }
    .doc-title { font-size: 28px; font-weight: 800; color: #1a1a2e; text-align: right; }
    .doc-meta { font-size: 12px; color: #666; text-align: right; margin-top: 6px; line-height: 1.7; }
    .doc-num { color: #0071e3; font-weight: 700; }
    .bill-section { display: flex; gap: 40px; margin-bottom: 30px; padding: 20px; background: #f8f9ff; border-radius: 10px; }
    .bill-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #999; margin-bottom: 6px; }
    .bill-name { font-size: 14px; font-weight: 700; margin-bottom: 3px; }
    .bill-detail { font-size: 12px; color: #555; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead th { background: #0071e3; color: white; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
    thead th:not(:first-child) { text-align: center; }
    thead th:last-child { text-align: right; }
    tbody td { padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 13px; }
    tbody tr:last-child td { border-bottom: none; }
    tbody tr:nth-child(even) { background: #f9f9f9; }
    .totals { display: flex; justify-content: flex-end; }
    .totals-box { width: 260px; }
    .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #555; }
    .totals-row.total { font-size: 16px; font-weight: 800; color: #0071e3; border-top: 2px solid #0071e3; padding-top: 10px; margin-top: 4px; }
    .notes { margin-top: 30px; padding: 16px 20px; background: #f8f9ff; border-radius: 8px; border-left: 4px solid #0071e3; }
    .notes-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #999; margin-bottom: 6px; }
    .notes-text { font-size: 12px; color: #555; line-height: 1.7; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #eee; font-size: 11px; color: #999; text-align: center; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; background: ${docType === 'quote' ? '#e8f4fd' : '#e8fdf0'}; color: ${docType === 'quote' ? '#0071e3' : '#00a550'}; margin-bottom: 6px; }
    @media print { body { padding: 20px; } @page { margin: 1.5cm; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="biz-name">${biz.name}</div>
      <div class="biz-info">
        ${biz.address}<br>
        ${biz.email}${biz.phone ? `<br>${biz.phone}` : ''}
        ${biz.hst_number ? `<br>HST #: ${biz.hst_number}` : ''}
      </div>
    </div>
    <div>
      <div class="badge">${title}</div>
      <div class="doc-title">${title}</div>
      <div class="doc-meta">
        <span class="doc-num">${docNum}</span><br>
        Date: ${formatDate(docDate)}<br>
        ${docType === 'quote' ? `Valid Until: ${formatDate(validUntil.toISOString())}` : dueDate ? `Due: ${formatDate(dueDate)}` : ''}
      </div>
    </div>
  </div>

  <div class="bill-section">
    <div>
      <div class="bill-label">Bill To</div>
      <div class="bill-name">${customer.name || '—'}</div>
      <div class="bill-detail">
        ${customer.email ? customer.email + '<br>' : ''}
        ${customer.address ? customer.address + '<br>' : ''}
        ${customer.city ? customer.city + ', ' : ''}${customer.province} ${customer.postal}
      </div>
    </div>
    <div>
      <div class="bill-label">Payment</div>
      <div class="bill-detail">
        E-Transfer to:<br>
        <strong>${biz.email}</strong>
      </div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th style="text-align:center;width:60px">Qty</th>
        <th style="text-align:right;width:100px">Unit Price</th>
        <th style="text-align:center;width:60px">HST</th>
        <th style="text-align:right;width:100px">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${lineRows}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-box">
      <div class="totals-row"><span>Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>
      <div class="totals-row"><span>HST (13%)</span><span>$${hstAmount.toFixed(2)}</span></div>
      <div class="totals-row total"><span>Total</span><span>$${total.toFixed(2)}</span></div>
    </div>
  </div>

  ${notes ? `
  <div class="notes">
    <div class="notes-label">Notes</div>
    <div class="notes-text">${notes}</div>
  </div>` : ''}

  <div class="footer">
    ${biz.name} · ${biz.email} · Generated by PrintFlow
  </div>
</body>
</html>`;
}
