import React, { useEffect, useState } from 'react';
import { api, settingsApi } from '../api/client';

function fmt(n) {
  return `$${(parseFloat(n) || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

export default function TaxPage() {
  const [data,    setData]    = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [txnRes, cfgRes] = await Promise.all([
          api.get('/api/transactions?limit=2000'),
          settingsApi.get('company_config'),
        ]);

        const txns   = txnRes.data || [];
        const cfg    = cfgRes.data?.value || {};
        const hstRate = parseFloat(cfg.hst_rate) || 13;
        const hstEnabled = cfg.enable_hst !== false;
        setCompany({ ...cfg, hstRate, hstEnabled });

        // Income transactions
        const incomeTxns  = txns.filter(t => t.type === 'income');
        const expenseTxns = txns.filter(t => t.type === 'expense');

        const totalRevenue  = incomeTxns.reduce((a, t) => a + t.amount_cad, 0);
        const totalExpenses = expenseTxns.reduce((a, t) => a + t.amount_cad, 0);

        // HST collected from recorded hst_amount fields
        const hstCollected = incomeTxns.reduce((a, t) => a + (t.hst_amount || 0), 0);

        // ITC — HST paid on eligible business expenses
        // Materials and shipping are typically HST-eligible
        const itcEligible = expenseTxns
          .filter(t => ['materials', 'shipping', 'fees', 'maintenance'].includes(t.category))
          .reduce((a, t) => a + t.amount_cad, 0);
        const itc = itcEligible * (hstRate / 100);

        // Expense breakdown by real category
        const byCategory = {};
        expenseTxns.forEach(t => {
          const cat = t.category || 'other';
          byCategory[cat] = (byCategory[cat] || 0) + t.amount_cad;
        });

        setData({
          totalRevenue,
          totalExpenses,
          hstCollected,
          itc,
          netRemittance: Math.max(0, hstCollected - itc),
          hstRate,
          hstEnabled,
          byCategory,
          txnCount: txns.length,
          incomeTxns,
          expenseTxns,
        });
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }
    load();
  }, []);

  function exportCSV() {
    if (!data) return;
    const rows = [['Category', 'Type', 'Amount', 'HST Collected / ITC']];
    const income = data.incomeTxns;
    const expenses = data.expenseTxns;
    income.forEach(t => rows.push([t.category || 'sales', 'Income', t.amount_cad?.toFixed(2), t.hst_amount?.toFixed(2) || '0.00']));
    expenses.forEach(t => rows.push([t.category || 'expense', 'Expense', t.amount_cad?.toFixed(2), '']));
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'tax-summary.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  const CAT_LABELS = {
    materials: 'Filament & Materials',
    shipping: 'Shipping & Packaging',
    fees: 'Platform & Payment Fees',
    maintenance: 'Maintenance & Parts',
    other: 'Other Expenses',
    sales: 'Sales',
  };

  if (loading) return <div style={{ padding: 32, color: 'var(--text-secondary)' }}>Loading tax data…</div>;

  const hstRate = data?.hstRate || 13;
  const hstEnabled = data?.hstEnabled ?? true;

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 24 }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h1>Tax Manager</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
              {hstEnabled
                ? `${hstRate}% tax rate · HST collected and Input Tax Credits`
                : 'Tax tracking disabled — enable in Settings → Company Configuration'}
            </p>
          </div>
          <button className="btn btn-primary" onClick={exportCSV}>Export for Accountant</button>
        </div>

        {!hstEnabled && (
          <div style={{ padding: '12px 16px', background: 'var(--amber-light)', borderRadius: 8, border: '0.5px solid rgba(255,179,0,0.3)', fontSize: 13, color: 'var(--amber)', marginBottom: 20, lineHeight: 1.6 }}>
            Tax tracking is currently disabled. Enable it in <strong>Settings → Company Configuration</strong> to track HST/GST on your orders.
          </div>
        )}

        {/* Key metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
          {[
            ['HST Collected',    fmt(data?.hstCollected),   'var(--amber)'],
            ['Input Tax Credits', fmt(data?.itc),           'var(--green)'],
            ['Net Remittance',   fmt(data?.netRemittance),  data?.netRemittance > 0 ? 'var(--red)' : 'var(--green)'],
            ['Tax Rate',         hstEnabled ? `${hstRate}%` : 'Off', 'var(--accent)'],
          ].map(([l, v, c]) => (
            <div key={l} className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: 6 }}>{l}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: c }}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

          {/* HST Summary */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ marginBottom: 14 }}>HST / GST Summary</h3>
            {[
              ['Total Revenue (excl. tax)', fmt(data?.totalRevenue)],
              [`Tax Rate`, `${hstRate}%`],
              ['Tax Collected from Customers', fmt(data?.hstCollected)],
              ['Input Tax Credits (ITC)', `-${fmt(data?.itc)}`],
              ['Net Tax Payable', fmt(data?.netRemittance)],
            ].map(([k, v], i) => (
              <div key={k} style={{
                display: 'flex', justifyContent: 'space-between', padding: '9px 0',
                borderBottom: '0.5px solid var(--border)', fontSize: 13,
                fontWeight: i === 4 ? 700 : 400,
                color: i === 4 ? 'var(--red)' : 'var(--text-primary)',
              }}>
                <span style={{ color: i === 4 ? 'var(--red)' : 'var(--text-secondary)' }}>{k}</span>
                <span>{v}</span>
              </div>
            ))}

            {company?.fiscal_year_start && (
              <div style={{ marginTop: 14, padding: '10px 12px', background: 'var(--amber-light)', border: '0.5px solid rgba(255,179,0,0.3)', borderRadius: 8, fontSize: 12, color: 'var(--amber)', lineHeight: 1.5 }}>
                Fiscal year starts in <strong>
                  {['January','February','March','April','May','June','July','August','September','October','November','December'][parseInt(company.fiscal_year_start) - 1]}
                </strong>. Consult your accountant for filing deadlines.
              </div>
            )}

            <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--bg-hover)', borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              ITC calculated at {hstRate}% on eligible business expenses (materials, shipping, fees, maintenance). Consult your accountant for final figures.
            </div>
          </div>

          {/* Expense breakdown by real category */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ marginBottom: 14 }}>Expense Breakdown by Category</h3>
            {Object.keys(data?.byCategory || {}).length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
                No expenses recorded yet
              </div>
            ) : (
              <>
                {Object.entries(data?.byCategory || {}).sort((a, b) => b[1] - a[1]).map(([cat, amount]) => {
                  const pct = data.totalExpenses > 0 ? (amount / data.totalExpenses) * 100 : 0;
                  return (
                    <div key={cat} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                        <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                          {CAT_LABELS[cat] || cat}
                        </span>
                        <span style={{ fontWeight: 600 }}>{fmt(amount)}</span>
                      </div>
                      <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)', borderRadius: 3, transition: 'width 0.5s ease' }} />
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>{pct.toFixed(1)}% of total expenses</div>
                    </div>
                  );
                })}
                <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 12, marginTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700 }}>
                  <span>Total Expenses</span>
                  <span style={{ color: 'var(--red)' }}>{fmt(data?.totalExpenses)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
