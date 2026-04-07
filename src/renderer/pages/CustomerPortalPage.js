import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { api } from '../api/client';

export default function CustomerPortalPage() {
  const { serverUrl } = useAuthStore();
  const [copied, setCopied]   = useState('');
  const [orders, setOrders]   = useState([]);
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(true);

  // Build the public tracking URLs
  const lanUrl      = serverUrl ? serverUrl.replace(/\/$/, '') + '/track' : '';
  const remoteUrl   = lanUrl.replace('10.0.0.219', '100.68.105.76');

  useEffect(() => {
    api.get('/api/orders?limit=50')
      .then(r => setOrders(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function copy(text, key) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(''), 2000);
    });
  }

  function openInBrowser(url) {
    window.printflow.openExternal(url);
  }

  const filtered = orders.filter(o =>
    !['paid','cancelled'].includes(o.status) &&
    (!search || `${o.order_number} ${o.customer_name}`.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 24 }}>
      <div style={{ maxWidth: 780, margin: '0 auto' }}>

        <div style={{ marginBottom: 24 }}>
          <h1>Customer Order Portal</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            A public web page your customers visit in their browser to track their order
          </p>
        </div>

        {/* Portal URL cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
          {[
            { label: 'Local Network URL', desc: 'Works when customer is on your WiFi', url: lanUrl, key: 'lan' },
            { label: 'Remote URL (Tailscale)', desc: 'Works from anywhere via Tailscale', url: remoteUrl, key: 'remote' },
          ].map(({ label, desc, url, key }) => (
            <div key={key} className="card" style={{ padding: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 12 }}>{desc}</div>
              <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--accent)', background: 'var(--bg-hover)', padding: '8px 10px', borderRadius: 8, marginBottom: 12, wordBreak: 'break-all' }}>
                {url || '—'}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => copy(url, key)} disabled={!url}>
                  {copied === key ? '✓ Copied!' : 'Copy URL'}
                </button>
                <button className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => openInBrowser(url)} disabled={!url}>
                  Open ↗
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <h3 style={{ marginBottom: 14 }}>How it works</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {[
              { step: '1', title: 'Customer gets the link', body: 'Include the tracking URL in your quote or invoice email. Add ?order=1001 to pre-fill their order number.' },
              { step: '2', title: 'They open it in a browser', body: 'No login required. Just a clean branded page showing their order status, description, and tracking info.' },
              { step: '3', title: 'Status updates live', body: 'As you update the order in PrintFlow, the portal reflects the latest status instantly.' },
            ].map(({ step, title, body }) => (
              <div key={step} style={{ padding: '14px 16px', background: 'var(--bg-hover)', borderRadius: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, marginBottom: 10 }}>{step}</div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{body}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Per-order tracking links */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3>Tracking Links for Active Orders</h3>
            <input className="input" placeholder="Search orders…" style={{ width: 200, fontSize: 13 }}
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
            Copy a direct link to paste into an email or invoice. The link auto-fills the order number.
          </p>
          {loading ? (
            <div style={{ padding: 24, color: 'var(--text-tertiary)', fontSize: 13 }}>Loading orders…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 24, color: 'var(--text-tertiary)', fontSize: 13 }}>No active orders found.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>Order</th><th>Customer</th><th>Status</th><th>Tracking Link</th></tr>
              </thead>
              <tbody>
                {filtered.map(o => {
                  const num = o.order_number.replace('#', '');
                  const link = `${lanUrl}?order=${num}`;
                  const linkKey = `order-${o.id}`;
                  return (
                    <tr key={o.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>{o.order_number}</td>
                      <td style={{ fontSize: 13 }}>{o.customer_name}</td>
                      <td><span className="pill pill-blue" style={{ fontSize: 10 }}>{o.status}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>
                            {link}
                          </span>
                          <button className="btn btn-ghost btn-sm" style={{ flexShrink: 0, fontSize: 11 }}
                            onClick={() => copy(link, linkKey)}>
                            {copied === linkKey ? '✓' : 'Copy'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
