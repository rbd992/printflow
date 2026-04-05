import React, { useEffect, useState, useCallback } from 'react';
import { usersApi } from '../api/client';
import { useAuthStore } from '../stores/authStore';

const ROLES = ['owner','manager','operator'];
const ROLE_COLOR = { owner:'pill-purple',manager:'pill-blue',operator:'pill-teal' };

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.55)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center' }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="card" style={{ width:440,padding:28,animation:'fadeIn 0.2s ease' }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20 }}>
          <h2 style={{ fontSize:18 }}>{title}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function UsersPage() {
  const [users,setUsers]     = useState([]);
  const [loading,setLoading] = useState(true);
  const [editing,setEditing] = useState(null);
  const [adding,setAdding]   = useState(false);
  const [form,setForm]       = useState({ name:'',email:'',password:'',role:'operator' });
  const [saving,setSaving]   = useState(false);
  const [err,setErr]         = useState('');
  const { user: me } = useAuthStore();

  const load=useCallback(async()=>{ try{ const r=await usersApi.list(); setUsers(r.data); }catch{}finally{ setLoading(false); } },[]);
  useEffect(()=>{ load(); },[load]);

  async function create(){
    setSaving(true); setErr('');
    try{ await usersApi.create(form); setAdding(false); setForm({ name:'',email:'',password:'',role:'operator' }); await load(); }
    catch(e){ setErr(e.response?.data?.error||e.response?.data?.errors?.[0]?.msg||'Failed'); }finally{ setSaving(false); }
  }

  async function update(id,patch){
    try{ await usersApi.update(id,patch); await load(); setEditing(null); }catch{}
  }

  async function deactivate(id){
    if(!window.confirm('Deactivate this user?')) return;
    try{ await usersApi.remove(id); await load(); setEditing(null); }catch{}
  }

  const F=k=>({ value:form[k]??'',onChange:e=>setForm(f=>({...f,[k]:e.target.value})) });

  return (
    <div style={{ height:'100%',overflowY:'auto',padding:24 }}>
      <div style={{ maxWidth:900,margin:'0 auto' }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20 }}>
          <div><h1>Users</h1><p style={{ color:'var(--text-secondary)',fontSize:13,marginTop:4 }}>Manage team accounts, roles, and access permissions</p></div>
          <button className="btn btn-primary" onClick={()=>{setForm({ name:'',email:'',password:'',role:'operator' });setAdding(true);setErr('');}}>＋ Add User</button>
        </div>

        <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:20 }}>
          {ROLES.map(r=>(
            <div key={r} className="card" style={{ padding:16 }}>
              <div style={{ fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em',color:'var(--text-tertiary)',marginBottom:6,textTransform:'capitalize' }}>{r}s</div>
              <div style={{ fontSize:24,fontWeight:700 }}>{users.filter(u=>u.role===r&&u.is_active).length}</div>
            </div>
          ))}
        </div>

        <div className="card">
          <div style={{ padding:'14px 20px',borderBottom:'0.5px solid var(--border)' }}><h3>Team Members</h3></div>
          {loading ? <div style={{ padding:24,color:'var(--text-secondary)' }}>Loading…</div> : (
            <table className="data-table">
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last Login</th><th>Created</th><th></th></tr></thead>
              <tbody>
                {users.map(u=>(
                  <tr key={u.id}>
                    <td style={{ fontWeight:500 }}>
                      <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                        <div style={{ width:28,height:28,borderRadius:'50%',background:'var(--accent-light)',color:'var(--accent)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,flexShrink:0 }}>{u.name.slice(0,2).toUpperCase()}</div>
                        {u.name} {u.id===me?.id&&<span style={{ fontSize:10,color:'var(--text-tertiary)' }}>(you)</span>}
                      </div>
                    </td>
                    <td style={{ fontSize:12,color:'var(--text-secondary)' }}>{u.email}</td>
                    <td><span className={`pill ${ROLE_COLOR[u.role]}`} style={{ textTransform:'capitalize',fontSize:10 }}>{u.role}</span></td>
                    <td>{u.is_active?<span className="pill pill-green" style={{ fontSize:10 }}>Active</span>:<span className="pill pill-red" style={{ fontSize:10 }}>Inactive</span>}</td>
                    <td style={{ fontSize:12,color:'var(--text-secondary)' }}>{u.last_login?new Date(u.last_login).toLocaleDateString('en-CA'):'Never'}</td>
                    <td style={{ fontSize:12,color:'var(--text-secondary)' }}>{new Date(u.created_at).toLocaleDateString('en-CA')}</td>
                    <td>
                      {u.id!==me?.id && (
                        <button className="btn btn-ghost btn-sm" onClick={()=>setEditing(u)}>Edit</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Role reference */}
        <div className="card" style={{ marginTop:14,padding:20 }}>
          <h3 style={{ marginBottom:12 }}>Role Reference</h3>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12 }}>
            {[['Owner','Full access — all modules, finance, tax, user management, auto-order approval','var(--purple)'],['Manager','Inventory, orders, shipping, marketing. Read-only finance. No tax or user admin.','var(--accent)'],['Operator','Order status updates, printer live view, shipment tracking only.','var(--teal)']].map(([r,d,c])=>(
              <div key={r} style={{ padding:'12px 14px',background:'var(--bg-hover)',borderRadius:'var(--r-sm)',borderLeft:`3px solid ${c}` }}>
                <div style={{ fontSize:13,fontWeight:600,color:c,marginBottom:4 }}>{r}</div>
                <div style={{ fontSize:12,color:'var(--text-secondary)',lineHeight:1.5 }}>{d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add user modal */}
      {adding && (
        <Modal title="Add User" onClose={()=>{setAdding(false);setErr('');}}>
          <div className="form-group"><label className="label">Full Name</label><input className="input" {...F('name')} autoFocus /></div>
          <div className="form-group"><label className="label">Email</label><input className="input" type="email" {...F('email')} /></div>
          <div className="form-group"><label className="label">Temporary Password</label><input className="input" type="password" {...F('password')} placeholder="Min 8 characters" /></div>
          <div className="form-group"><label className="label">Role</label>
            <select className="select" {...F('role')}>{ROLES.map(r=><option key={r} value={r} style={{ textTransform:'capitalize' }}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}</select>
          </div>
          {err && <div style={{ color:'var(--red)',fontSize:12,marginBottom:12 }}>{err}</div>}
          <div style={{ fontSize:12,color:'var(--text-secondary)',marginBottom:14,padding:'10px 12px',background:'var(--bg-hover)',borderRadius:'var(--r-sm)' }}>
            The user will be asked to change their password on first login.
          </div>
          <div style={{ display:'flex',gap:8,justifyContent:'flex-end' }}>
            <button className="btn btn-secondary" onClick={()=>{setAdding(false);setErr('');}}>Cancel</button>
            <button className="btn btn-primary" onClick={create} disabled={saving||!form.name||!form.email||!form.password}>{saving?'Creating…':'Create User'}</button>
          </div>
        </Modal>
      )}

      {/* Edit user modal */}
      {editing && (
        <Modal title={`Edit — ${editing.name}`} onClose={()=>setEditing(null)}>
          <div className="form-group"><label className="label">Name</label>
            <input className="input" defaultValue={editing.name} onChange={e=>setEditing(x=>({...x,name:e.target.value}))} />
          </div>
          <div className="form-group"><label className="label">Role</label>
            <select className="select" value={editing.role} onChange={e=>setEditing(x=>({...x,role:e.target.value}))}>
              {ROLES.map(r=><option key={r} value={r} style={{ textTransform:'capitalize' }}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
            </select>
          </div>
          <div style={{ display:'flex',gap:8,justifyContent:'space-between',marginTop:4 }}>
            <button className="btn btn-danger btn-sm" onClick={()=>deactivate(editing.id)}>Deactivate</button>
            <div style={{ display:'flex',gap:8 }}>
              <button className="btn btn-secondary" onClick={()=>setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={()=>update(editing.id,{ name:editing.name,role:editing.role })}>Save</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
