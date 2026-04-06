import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { useAuthStore } from '../stores/authStore';

const STAGE_COLORS = {
  queued:   'var(--text-tertiary)',
  printing: 'var(--amber)',
  done:     'var(--green)',
  failed:   'var(--red)',
};

function duration(mins) {
  if (!mins) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function PrintHistoryPage() {
  const [jobs, setJobs]           = useState([]);
  const [printers, setPrinters]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState({ stage: '', search: '', printer: '' });
  const { user } = useAuthStore();

  const load = useCallback(async () => {
    try {
      const [j, p] = await Promise.all([
        api.get('/api/jobs'),
        api.get('/api/printers'),
      ]);
      setJobs(j.data || []);
      setPrinters(p.data || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = jobs.filter(j => {
    if (filter.stage && j.stage !== filter.stage) return false;
    if (filter.printer && String(j.printer_id) !== String(filter.printer)) return false;
    if (filter.search && !`${j.job_name} ${j.customer_name || ''} ${j.file_name || ''}`.toLowerCase().includes(filter.search.toLowerCase())) return false;
    return true;
  });

  // Stats
  const done      = jobs.filter(j => j.stage === 'done');
  const failed    = jobs.filter(j => j.stage === 'failed');
  const totalMins = done.reduce((a, j) => a + (j.actual_duration_min || j.estimated_duration_min || 0), 0);
  const totalGrams = done.reduce((a, j) => a + (j.estimated_grams || 0), 0);

  function exportCSV() {
    const headers = ['Job Name','Customer','Printer','Material','Color','Est. Grams','Est. Duration (min)','Actual Duration (min)','Stage','File','Created'];
    const rows = filtered.map(j => [
      j.job_name, j.customer_name || '', j.printer_name || '', j.material || '', j.color || '',
      j.estimated_grams || '', j.estimated_duration_min || '', j.actual_duration_min || '',
      j.stage, j.file_name || '', j.created_at?.slice(0, 10) || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'print_history.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 24 }}>
      <div style={{ maxWidth: 1300, margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h1>Print History</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
              Complete log of all print jobs across all printers
            </p>
          </div>
          <button className="btn btn-secondary" onClick={exportCSV}>⬇ Export CSV</button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
          {[
            ['Total Jobs', jobs.length, 'var(--text-primary)'],
            ['Completed', done.length, 'var(--green)'],
            ['Failed', failed.length, 'var(--red)'],
            ['Total Print Time', duration(totalMins), 'var(--accent)'],
          ].map(([label, value, color]) => (
            <div key={label} className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <input className="input" placeholder="Search jobs..." style={{ width: 220 }}
            value={filter.search} onChange={e => setFilter(f => ({ ...f, search: e.target.value }))} />
          <select className="select" style={{ width: 140 }} value={filter.stage} onChange={e => setFilter(f => ({ ...f, stage: e.target.value }))}>
            <option value="">All Stages</option>
            {['queued','printing','done','failed'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          <select className="select" style={{ width: 160 }} value={filter.printer} onChange={e => setFilter(f => ({ ...f, printer: e.target.value }))}>
            <option value="">All Printers</option>
            {printers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {(filter.search || filter.stage || filter.printer) && (
            <button className="btn btn-secondary btn-sm" onClick={() => setFilter({ stage: '', search: '', printer: '' })}>Clear</button>
          )}
        </div>

        {/* Table */}
        <div className="card">
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-tertiary)' }}>
              {jobs.length === 0 ? 'No print jobs yet — add jobs from the Job Queue page' : 'No jobs match your filter'}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Customer</th>
                  <th>Printer</th>
                  <th>Material</th>
                  <th>Grams</th>
                  <th>Est. Time</th>
                  <th>Actual Time</th>
                  <th>Stage</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(j => (
                  <tr key={j.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{j.job_name}</div>
                      {j.file_name && <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>{j.file_name}</div>}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{j.customer_name || '—'}</td>
                    <td style={{ fontSize: 12 }}>{j.printer_name || '—'}</td>
                    <td style={{ fontSize: 12 }}>
                      {j.material}{j.color ? <span style={{ color: 'var(--text-tertiary)' }}> · {j.color}</span> : ''}
                    </td>
                    <td style={{ fontSize: 12 }}>{j.estimated_grams ? `${j.estimated_grams}g` : '—'}</td>
                    <td style={{ fontSize: 12 }}>{duration(j.estimated_duration_min)}</td>
                    <td style={{ fontSize: 12, color: j.actual_duration_min ? 'var(--green)' : 'var(--text-tertiary)' }}>
                      {duration(j.actual_duration_min)}
                    </td>
                    <td>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                        color: STAGE_COLORS[j.stage] || 'var(--text-secondary)',
                        background: `${STAGE_COLORS[j.stage] || 'var(--text-secondary)'}22` }}>
                        {j.stage}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{j.created_at?.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
