import React, { useEffect, useState, useCallback } from 'react';
import { api, ordersApi } from '../api/client';
import { onSocketEvent } from '../api/socket';
import { useAuthStore } from '../stores/authStore';

function Modal({ title, onClose, children, width = 520 }) {
  return (
    <div style={{ position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="card" style={{ width, maxHeight:'90vh', overflowY:'auto', padding:28 }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20 }}>
          <h2 style={{ fontSize:18 }}>{title}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const STAGES = [
  { id:'queued',      label:'Queued',         color:'var(--text-tertiary)', bg:'var(--bg-hover)' },
  { id:'printing',    label:'Printing',        color:'var(--amber)',          bg:'var(--amber-light)' },
  { id:'done',        label:'Done',            color:'var(--green)',          bg:'var(--green-light)' },
  { id:'failed',      label:'Failed',          color:'var(--red)',            bg:'var(--red-light)' },
];

function JobCard({ job, printers, onEdit, onDelete, onMove, canManage }) {
  const printer = printers.find(p => p.id === job.printer_id);
  const stage   = STAGES.find(s => s.id === job.stage) || STAGES[0];

  return (
    <div className="card" style={{ padding:14, marginBottom:8, borderLeft:`3px solid ${stage.color}`, cursor: canManage ? 'pointer' : 'default' }}
      onClick={() => canManage && onEdit(job)}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{job.job_name}</div>
          {job.customer_name && <div style={{ fontSize:11, color:'var(--text-secondary)', marginTop:2 }}>{job.customer_name}</div>}
        </div>
        <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:10, background:stage.bg, color:stage.color, flexShrink:0, marginLeft:8 }}>
          {stage.label}
        </span>
      </div>

      {printer && (
        <div style={{ fontSize:11, color:'var(--text-secondary)', marginBottom:6, display:'flex', alignItems:'center', gap:6 }}>
          <span>🖨</span> {printer.name}
        </div>
      )}

      {job.material && (
        <div style={{ fontSize:11, color:'var(--text-tertiary)', marginBottom:6 }}>
          {job.material}{job.color ? ` · ${job.color}` : ''}{job.estimated_grams ? ` · ~${job.estimated_grams}g` : ''}
        </div>
      )}

      {job.estimated_duration_min > 0 && (
        <div style={{ fontSize:11, color:'var(--text-tertiary)', marginBottom:8 }}>
          ⏱ {Math.floor(job.estimated_duration_min / 60)}h {job.estimated_duration_min % 60}m estimated
        </div>
      )}

      {canManage && (
        <div style={{ display:'flex', gap:6, marginTop:4 }} onClick={e => e.stopPropagation()}>
          {STAGES.filter(s => s.id !== job.stage).map(s => (
            <button key={s.id} className="btn btn-ghost btn-sm" style={{ fontSize:10, padding:'2px 8px', color: s.color }}
              onClick={() => onMove(job, s.id)}>
              → {s.label}
            </button>
          ))}
          <button className="btn btn-ghost btn-sm" style={{ fontSize:10, marginLeft:'auto', color:'var(--red)' }}
            onClick={() => onDelete(job)}>
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

const BLANK = {
  job_name: '', order_id: '', customer_name: '', printer_id: '',
  material: 'PLA', color: '', estimated_grams: '', estimated_duration_min: '',
  file_name: '', notes: '', stage: 'queued', priority: 1,
};

export default function JobQueuePage() {
  const [jobs, setJobs]           = useState([]);
  const [orders, setOrders]       = useState([]);
  const [printers, setPrinters]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [editing, setEditing]     = useState(null);
  const [form, setForm]           = useState(BLANK);
  const [saving, setSaving]       = useState(false);
  const [err, setErr]             = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const { user } = useAuthStore();
  const canManage = ['owner', 'manager'].includes(user?.role);

  const load = useCallback(async () => {
    try {
      const [j, o, p] = await Promise.all([
        api.get('/api/jobs'),
        ordersApi.list(),
        api.get('/api/printers'),
      ]);
      setJobs(j.data || []);
      setOrders(o.data || []);
      setPrinters(p.data || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const u1 = onSocketEvent('job:created', () => load());
    const u2 = onSocketEvent('job:updated', () => load());
    const u3 = onSocketEvent('job:deleted', () => load());
    return () => { u1(); u2(); u3(); };
  }, [load]);

  async function save() {
    setSaving(true); setErr('');
    try {
      const payload = {
        ...form,
        estimated_grams: parseFloat(form.estimated_grams) || null,
        estimated_duration_min: parseInt(form.estimated_duration_min) || null,
        printer_id: form.printer_id || null,
        order_id: form.order_id || null,
        priority: parseInt(form.priority) || 1,
      };
      if (editing?.id) {
        await api.put(`/api/jobs/${editing.id}`, payload);
      } else {
        await api.post('/api/jobs', payload);
      }
      setEditing(null);
      await load();
    } catch (e) {
      setErr(e.response?.data?.error || 'Save failed');
    }
    setSaving(false);
  }

  async function moveJob(job, newStage) {
    try {
      await api.put(`/api/jobs/${job.id}`, { ...job, stage: newStage });
      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, stage: newStage } : j));
    } catch {}
  }

  async function deleteJob(job) {
    if (!window.confirm(`Delete job "${job.job_name}"?`)) return;
    try {
      await api.delete(`/api/jobs/${job.id}`);
      setJobs(prev => prev.filter(j => j.id !== job.id));
    } catch (e) {
      alert(e.response?.data?.error || 'Delete failed');
    }
  }

  function openNew() {
    setForm(BLANK);
    setEditing({});
    setErr('');
  }

  function openEdit(job) {
    setForm({ ...job });
    setEditing(job);
    setErr('');
  }

  const F = k => ({ value: form[k] ?? '', onChange: e => setForm(f => ({ ...f, [k]: e.target.value })) });

  const filteredJobs = stageFilter === 'all' ? jobs : jobs.filter(j => j.stage === stageFilter);

  // Stats
  const printing = jobs.filter(j => j.stage === 'printing').length;
  const queued   = jobs.filter(j => j.stage === 'queued').length;
  const failed   = jobs.filter(j => j.stage === 'failed').length;
  const done     = jobs.filter(j => j.stage === 'done').length;

  return (
    <div style={{ height:'100%', overflowY:'auto', padding:24 }}>
      <div style={{ maxWidth:1300, margin:'0 auto' }}>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div>
            <h1>Job Queue</h1>
            <p style={{ color:'var(--text-secondary)', fontSize:13, marginTop:4 }}>
              {printing} printing · {queued} queued · {done} done today
            </p>
          </div>
          {canManage && (
            <button className="btn btn-primary" onClick={openNew}>+ Add Job</button>
          )}
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
          {[
            ['Queued', queued, 'var(--text-secondary)'],
            ['Printing', printing, 'var(--amber)'],
            ['Done', done, 'var(--green)'],
            ['Failed', failed, 'var(--red)'],
          ].map(([label, count, color]) => (
            <div key={label} className="card" style={{ padding:16, borderTop:`2px solid ${color}`, cursor:'pointer' }}
              onClick={() => setStageFilter(label.toLowerCase())}>
              <div style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--text-tertiary)', marginBottom:6 }}>{label}</div>
              <div style={{ fontSize:28, fontWeight:700, color }}>{count}</div>
            </div>
          ))}
        </div>

        {/* Stage filter */}
        <div style={{ display:'flex', gap:6, marginBottom:16 }}>
          {['all', ...STAGES.map(s => s.id)].map(s => (
            <button key={s} className={`btn btn-sm ${stageFilter === s ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setStageFilter(s)}>
              {s === 'all' ? 'All Jobs' : STAGES.find(st => st.id === s)?.label}
            </button>
          ))}
        </div>

        {/* Board view */}
        {loading ? (
          <div style={{ padding:40, textAlign:'center', color:'var(--text-secondary)' }}>Loading...</div>
        ) : stageFilter === 'all' ? (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
            {STAGES.map(stage => {
              const stageJobs = jobs.filter(j => j.stage === stage.id).sort((a, b) => a.priority - b.priority);
              return (
                <div key={stage.id}>
                  <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:stage.color, marginBottom:10, display:'flex', justifyContent:'space-between' }}>
                    <span>{stage.label}</span>
                    <span style={{ color:'var(--text-tertiary)' }}>{stageJobs.length}</span>
                  </div>
                  {stageJobs.length === 0 ? (
                    <div style={{ padding:'20px 14px', background:'var(--bg-hover)', borderRadius:'var(--r-md)', border:'0.5px dashed var(--border)', textAlign:'center', color:'var(--text-tertiary)', fontSize:12 }}>
                      {stage.id === 'queued' ? 'No jobs queued' : `No jobs ${stage.id}`}
                    </div>
                  ) : (
                    stageJobs.map(job => (
                      <JobCard key={job.id} job={job} printers={printers} onEdit={openEdit} onDelete={deleteJob} onMove={moveJob} canManage={canManage} />
                    ))
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ maxWidth:500 }}>
            {filteredJobs.length === 0 ? (
              <div style={{ padding:40, textAlign:'center', color:'var(--text-tertiary)' }}>No jobs in this stage</div>
            ) : (
              filteredJobs.map(job => (
                <JobCard key={job.id} job={job} printers={printers} onEdit={openEdit} onDelete={deleteJob} onMove={moveJob} canManage={canManage} />
              ))
            )}
          </div>
        )}
      </div>

      {/* Add / Edit modal */}
      {editing !== null && (
        <Modal title={editing.id ? 'Edit Job' : 'Add Print Job'} onClose={() => setEditing(null)}>
          <div className="form-group">
            <label className="label">Job Name *</label>
            <input className="input" {...F('job_name')} placeholder="e.g. Dragon figurine — red PETG" autoFocus />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="label">Linked Order</label>
              <select className="select" {...F('order_id')}>
                <option value="">None</option>
                {orders.filter(o => !['delivered','cancelled'].includes(o.status)).map(o => (
                  <option key={o.id} value={o.id}>{o.order_number} — {o.customer_name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Customer Name</label>
              <input className="input" {...F('customer_name')} placeholder="Auto-filled from order" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="label">Printer</label>
              <select className="select" {...F('printer_id')}>
                <option value="">Unassigned</option>
                {printers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Stage</label>
              <select className="select" {...F('stage')}>
                {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="label">Material</label>
              <input className="input" {...F('material')} list="material-list" placeholder="PLA" />
              <datalist id="material-list">
                {['PLA','PETG','ABS','ASA','TPU','Nylon','PLA+','Silk PLA'].map(m => <option key={m} value={m} />)}
              </datalist>
            </div>
            <div className="form-group">
              <label className="label">Color</label>
              <input className="input" {...F('color')} placeholder="e.g. Galaxy Black" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="label">Estimated Grams</label>
              <input className="input" type="number" min="0" {...F('estimated_grams')} placeholder="e.g. 85" />
            </div>
            <div className="form-group">
              <label className="label">Est. Duration (minutes)</label>
              <input className="input" type="number" min="0" {...F('estimated_duration_min')} placeholder="e.g. 240" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="label">File Name</label>
              <input className="input" {...F('file_name')} placeholder="dragon_v3.3mf" style={{ fontFamily:'monospace', fontSize:12 }} />
            </div>
            <div className="form-group">
              <label className="label">Priority (1=high)</label>
              <input className="input" type="number" min="1" max="10" {...F('priority')} />
            </div>
          </div>

          <div className="form-group">
            <label className="label">Notes</label>
            <textarea className="input" rows={2} {...F('notes')} placeholder="Any special instructions..." />
          </div>

          {err && <div style={{ color:'var(--red)', fontSize:12, marginBottom:8 }}>{err}</div>}

          <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:8 }}>
            <button className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={saving || !form.job_name}>
              {saving ? 'Saving...' : (editing.id ? 'Save Changes' : 'Add to Queue')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
