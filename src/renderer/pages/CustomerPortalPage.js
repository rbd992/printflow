import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';

const STATUS_STEPS = [
  { key: 'new',              label: 'Order Received',   icon: '📋' },
  { key: 'queued',           label: 'In Queue',          icon: '⏳' },
  { key: 'printing',         label: 'Printing',          icon: '🖨️' },
  { key: 'qc',               label: 'Quality Check',     icon: '🔍' },
  { key: 'packed',           label: 'Packed',            icon: '📦' },
  { key: 'shipped',          label: 'Shipped',           icon: '🚚' },
  { key: 'paid',             label: 'Complete',          icon: '✅' },
];

const STATUS_MAP = {
  new:               0,
  queued:            1,
  quoted:            1,
  confirmed:         1,
  printing:          2,
  printed:           2,
  'post-processing': 2,
  qc:                3,
  packed:            4,
  shipped:           5,
  delivered:         6,
  paid:              6,
  cancelled:        -1,
};

function formatDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function CustomerPortalPage() {
  const { serverUrl } = useAuthStore();
  const [orderNum, setOrderNum]   = useState('');
  const [order, setOrder]         = useState(null);
  const [biz, setBiz]             = useState(null);
  const [loading, setLoading]     = useState(false);
  const [err, setErr]             = useState('');
  const [searched, setSearched]   = useState(false);

  useEffect(() => {
    fetch(`${serverUrl}/api/portal/config`)
      .then(r => r.json())
      .then(d => setBiz(d))
      .catch(() => {});
  }, [serverUrl]);

  async function lookup() {
    const num = orderNum.trim().replace(/^#/, '');
    if (!num) return;
    setLoading(true); setErr(''); setOrder(null); setSearched(true);
    try {
      const r = await fetch(`${serverUrl}/api/portal/order/%23${num}`);
      if (!r.ok) {
        const d = await r.json();
        setErr(d.error || 'Order not found.');
      } else {
        setOrder(await r.json());
      }
    } catch {
      setErr('Could not reach the server. Please try again.');
    }
    setLoading(false);
  }

  const step = order ? (STATUS_MAP[order.status] ?? 0) : -1;
  const isCancelled = order?.status === 'cancelled';

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: 'var(--bg-page)' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <svg width="28" height="28" viewBox="0 0 80 80" fill="none">
              <rect x="8" y="12" width="6" height="40" rx="3" fill="white"/>
              <rect x="66" y="12" width="6" height="40" rx="3" fill="white"/>
              <rect x="8" y="10" width="64" height="8" rx="4" fill="white"/>
              <rect x="31" y="12" width="18" height="11" rx="3" fill="white"/>
              <path d="M37 23 L40 30 L43 23 Z" fill="white"/>
              <rect x="27" y="46" width="26" height="5" rx="2" fill="white"/>
              <rect x="10" y="57" width="60" height="8" rx="3" fill="white"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>
            {biz?.name || 'Order Status'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            Enter your order number to check your print status
          </p>
        </div>

        {/* Search */}
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              className="input"
              value={orderNum}
              onChange={e => setOrderNum(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && lookup()}
              placeholder="e.g. #1001 or 1001"
              style={{ flex: 1, fontFamily: 'monospace', fontSize: 16 }}
              autoFocus
            />
            <button className="btn btn-primary" onClick={lookup} disabled={loading || !orderNum.trim()}
              style={{ minWidth: 100, justifyContent: 'center' }}>
              {loading ? 'Looking up…' : 'Track Order'}
            </button>
          </div>
        </div>

        {/* Error */}
        {err && (
          <div style={{ padding: '14px 18px', background: 'var(--red-light)', borderRadius: 10, color: 'var(--red)', fontSize: 14, marginBottom: 20, border: '0.5px solid var(--red)' }}>
            {err}
          </div>
        )}

        {/* Result */}
        {order && (
          <div className="card" style={{ padding: 24 }}>
            {/* Order header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: 4 }}>Order</div>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'monospace' }}>{order.order_number}</div>
              </div>
              <span style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700,
                background: isCancelled ? 'var(--red-light)' : order.status === 'paid' ? 'var(--green-light)' : 'var(--accent-light)',
                color: isCancelled ? 'var(--red)' : order.status === 'paid' ? 'var(--green)' : 'var(--accent)',
              }}>
                {order.status_label}
              </span>
            </div>

            {/* Description */}
            <div style={{ padding: '12px 14px', background: 'var(--bg-hover)', borderRadius: 8, marginBottom: 20, fontSize: 14 }}>
              {order.description}
            </div>

            {/* Progress tracker */}
            {!isCancelled && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                  {/* Progress line */}
                  <div style={{ position: 'absolute', top: 18, left: '6%', right: '6%', height: 3, background: 'var(--border)', zIndex: 0, borderRadius: 2 }} />
                  <div style={{ position: 'absolute', top: 18, left: '6%', height: 3, background: 'var(--accent)', zIndex: 1, borderRadius: 2,
                    width: `${Math.min(100, (step / (STATUS_STEPS.length - 1)) * 88)}%`,
                    transition: 'width 0.5s ease',
                  }} />
                  {STATUS_STEPS.map((s, i) => (
                    <div key={s.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, zIndex: 2, flex: 1 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16, border: '2.5px solid',
                        borderColor: i <= step ? 'var(--accent)' : 'var(--border)',
                        background: i <= step ? 'var(--accent)' : 'var(--bg-card)',
                        transition: 'all 0.3s ease',
                      }}>
                        {i <= step ? <span style={{ fontSize: 14 }}>{s.icon}</span> : <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--border)' }} />}
                      </div>
                      <div style={{ fontSize: 9, fontWeight: 600, textAlign: 'center', color: i <= step ? 'var(--accent)' : 'var(--text-tertiary)', lineHeight: 1.3, maxWidth: 60 }}>
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isCancelled && (
              <div style={{ padding: '12px 14px', background: 'var(--red-light)', borderRadius: 8, color: 'var(--red)', fontSize: 13, marginBottom: 20 }}>
                This order has been cancelled. Please contact us if you have questions.
              </div>
            )}

            {/* Details grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: order.tracking_number ? 16 : 0 }}>
              {order.due_date && (
                <div style={{ padding: '10px 14px', background: 'var(--bg-hover)', borderRadius: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: 4 }}>Due Date</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{formatDate(order.due_date)}</div>
                </div>
              )}
              <div style={{ padding: '10px 14px', background: 'var(--bg-hover)', borderRadius: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: 4 }}>Order Placed</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{formatDate(order.created_at)}</div>
              </div>
              {order.notes && (
                <div style={{ padding: '10px 14px', background: 'var(--bg-hover)', borderRadius: 8, gridColumn: '1/-1' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: 4 }}>Notes</div>
                  <div style={{ fontSize: 13 }}>{order.notes}</div>
                </div>
              )}
            </div>

            {/* Tracking */}
            {order.tracking_number && (
              <div style={{ padding: '14px 16px', background: 'var(--accent-light)', borderRadius: 8, border: '0.5px solid var(--accent)', marginTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent)', marginBottom: 6 }}>
                  📦 Tracking Info
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{order.tracking_number}</div>
                {order.carrier && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Carrier: {order.carrier}</div>}
              </div>
            )}
          </div>
        )}

        {/* Contact footer */}
        {biz && (biz.email || biz.phone) && (
          <div style={{ textAlign: 'center', marginTop: 28, fontSize: 13, color: 'var(--text-tertiary)' }}>
            Questions? Contact us
            {biz.email && <> at <a href={`mailto:${biz.email}`} style={{ color: 'var(--accent)' }}>{biz.email}</a></>}
            {biz.phone && <> · {biz.phone}</>}
          </div>
        )}
      </div>
    </div>
  );
}
