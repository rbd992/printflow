import React, { useEffect, useState, useCallback } from 'react';
import { dashboardApi, ordersApi } from '../api/client';
import { onSocketEvent } from '../api/socket';
import { useAuthStore } from '../stores/authStore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

function MetricCard({ label, value, sub, subColor, icon }) {
  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: subColor || 'var(--text-secondary)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    new:       ['pill-purple', 'New'],
    queued:    ['pill-blue',   'Queued'],
    quoted:    ['pill-purple', 'Quoted'],
    confirmed: ['pill-green',  'Confirmed'],
    printing:  ['pill-amber',  'Printing'],
    printed:   ['pill-teal',   'Printed'],
    'post-processing': ['pill-amber', 'Post-Processing'],
    qc:        ['pill-teal',   'QC Check'],
    packed:    ['pill-teal',   'Packed'],
    shipped:   ['pill-green',  'Shipped'],
    delivered: ['pill-green',  'Delivered'],
    paid:      ['pill-green',  '✅ Paid'],
    cancelled: ['pill-red',    'Cancelled'],
  };
  const [cls, label] = map[status] || ['pill-blue', status];
  return <span className={`pill ${cls}`}>{label}</span>;
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  const load = useCallback(async () => {
    try {
      const res = await dashboardApi.get();
      setData(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    // Reload dashboard on any order or filament change
    const off1 = onSocketEvent('order:created',  load);
    const off2 = onSocketEvent('order:updated',  load);
    const off3 = onSocketEvent('filament:updated', load);
    return () => { off1(); off2(); off3(); };
  }, [load]);

  if (loading) return <div style={{ padding: 32, color: 'var(--text-secondary)' }}>Loading dashboard...</div>;
  if (!data) return null;

  const { metrics, recent_orders, recent_transactions, weekly_revenue } = data;

  const chartData = weekly_revenue.map(r => ({
    day: new Date(r.date).toLocaleDateString('en', { weekday: 'short' }),
    revenue: r.total,
  }));

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 24 }}>
      <div className="fade-in" style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h1 style={{ marginBottom: 4 }}>Dashboard</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              {greeting}, {user?.name?.split(' ')[0]} — here's your business at a glance
            </p>
          </div>
        </div>

        {/* Metrics */}
        <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
          <MetricCard
            label="Monthly Revenue"
            value={`$${metrics.revenue_mtd.toLocaleString('en-CA', { minimumFractionDigits: 0 })}`}
            sub="↑ income this month"
            subColor="var(--green)"
          />
          <MetricCard
            label="Active Orders"
            value={metrics.active_orders}
            sub={`${metrics.orders_due_today} due today`}
            subColor={metrics.orders_due_today > 0 ? 'var(--amber)' : 'var(--text-secondary)'}
          />
          <MetricCard
            label="Filament Stock"
            value={`${metrics.total_filament_kg} kg`}
            sub={metrics.low_filament > 0 ? `${metrics.low_filament} spools low ⚠` : 'All stocked'}
            subColor={metrics.low_filament > 0 ? 'var(--red)' : 'var(--green)'}
          />
          <MetricCard
            label="Net Profit (MTD)"
            value={`$${metrics.profit_mtd.toLocaleString('en-CA', { minimumFractionDigits: 0 })}`}
            sub={`${metrics.margin_pct}% margin`}
            subColor="var(--green)"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          {/* Revenue chart */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3>Revenue — Last 7 Days</h3>
              <span className="pill pill-green">Live</span>
            </div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={chartData} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    formatter={v => [`$${v.toFixed(2)}`, 'Revenue']}
                  />
                  <Bar dataKey="revenue" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
                No revenue data yet
              </div>
            )}
          </div>

          {/* Recent activity */}
          <div className="card">
            <div style={{ padding: '16px 20px', borderBottom: '0.5px solid var(--border)' }}>
              <h3>Recent Activity</h3>
            </div>
            <div>
              {recent_transactions.slice(0, 5).map((t, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 20px', borderBottom: '0.5px solid var(--border)',
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                    background: t.type === 'income' ? 'var(--green-light)' : 'var(--amber-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
                  }}>
                    {t.type === 'income' ? '💳' : '📦'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>{t.date}</div>
                  </div>
                  <div style={{
                    fontSize: 13, fontWeight: 700, flexShrink: 0,
                    color: t.type === 'income' ? 'var(--green)' : 'var(--red)',
                  }}>
                    {t.type === 'income' ? '+' : '-'}${t.amount_cad.toFixed(2)}
                  </div>
                </div>
              ))}
              {recent_transactions.length === 0 && (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>No transactions yet</div>
              )}
            </div>
          </div>
        </div>

        {/* Upcoming orders */}
        <div className="card">
          <div style={{ padding: '14px 20px', borderBottom: '0.5px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Upcoming Orders</h3>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{metrics.active_orders} active</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th><th>Customer</th><th>Item</th><th>Platform</th><th>Due</th><th>Status</th><th>Value</th>
              </tr>
            </thead>
            <tbody>
              {recent_orders.filter(o => !['delivered','paid','cancelled'].includes(o.status)).slice(0, 8).map(o => (
                <tr key={o.id}>
                  <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{o.order_number}</td>
                  <td>{o.customer_name}</td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.description}</td>
                  <td><span className="pill pill-blue" style={{ textTransform: 'capitalize' }}>{o.platform}</span></td>
                  <td style={{ color: o.due_date === new Date().toISOString().slice(0,10) ? 'var(--amber)' : 'var(--text-primary)' }}>
                    {o.due_date || '—'}
                  </td>
                  <td><StatusPill status={o.status} /></td>
                  <td style={{ fontWeight: 600 }}>${o.price_cad.toFixed(2)}</td>
                </tr>
              ))}
              {recent_orders.filter(o => !['delivered','paid','cancelled'].includes(o.status)).length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: 24 }}>No active orders</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
