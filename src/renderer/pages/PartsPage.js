import React, { useState, useEffect, useCallback } from 'react';
import { FULL_PARTS_CATALOGUE, MAINTENANCE_SCHEDULE, getAllParts } from '../data/bambuParts';
import { useAuthStore } from '../stores/authStore';
import { partsApi, settingsApi } from '../api/client';

function getCatalogueParts() {
  return getAllParts();
}

const HST = 0.13;

function Modal({ title, onClose, children, width = 560 }) {
  return (
    <div style={{ position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="card" style={{ width,maxHeight:'92vh',overflowY:'auto',padding:28,animation:'fadeIn 0.2s ease' }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20 }}>
          <h2 style={{ fontSize:18 }}>{title}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Part image with fallback to emoji icon
function PartImage({ img, icon, size = 48 }) {
  const [failed, setFailed] = useState(false);
  if (img && !failed) {
    return (
      <img src={img} alt="" onError={() => setFailed(true)}
        style={{ width:size, height:size, objectFit:'contain', flexShrink:0, borderRadius:6, background:'#f5f5f5', padding:2 }} />
    );
  }
  return <div style={{ fontSize: size * 0.5, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', width:size, height:size }}>{icon || '🔩'}</div>;
}

export default function PartsPage() {
  const [tab, setTab]             = useState('inventory');
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showAdd, setShowAdd]     = useState(false);
  const [catFilter, setCatFilter]         = useState('');
  const [printerFilter, setPrinterFilter] = useState('');
  const [search, setSearch]               = useState('');
  const [mainPrinter, setMainPrinter]     = useState('');
  const [completed, setCompleted] = useState({});
  const { user } = useAuthStore();
  const canEdit = ['owner', 'manager'].includes(user?.role);

  const allCatParts = getCatalogueParts();
  const categories  = [...new Set(allCatParts.map(p => p.category))];

  const loadParts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await partsApi.list();
      setInventory(res.data || []);
    } catch (err) {
      console.error('[PartsPage] load error:', err);
    }
    setLoading(false);
  }, []);

  const loadCompleted = useCallback(async () => {
    try {
      const res = await settingsApi.get('maintenance_completed');
      setCompleted(res.data?.value || {});
    } catch {}
  }, []);

  useEffect(() => { loadParts(); loadCompleted(); }, [loadParts, loadCompleted]);

  async function addFromCatalogue(part) {
    try {
      const existing = inventory.find(i => i.name === part.name && i.category === part.category);
      if (existing) {
        await partsApi.update(existing.id, { quantity: (existing.quantity || 1) + 1 });
      } else {
        await partsApi.create({
          name:        part.name,
          category:    part.category,
          description: [part.sku, part.notes, ...(part.compatible || [])].filter(Boolean).join(' | '),
          quantity:    1,
          reorder_at:  1,
          unit_cost:   part.price_cad || 0,
        });
      }
      await loadParts();
    } catch (err) {
      console.error('[PartsPage] add error:', err);
    }
    setShowAdd(false);
  }

  async function adjustQty(part, delta) {
    const newQty = Math.max(0, (part.quantity || 1) + delta);
    if (newQty === 0) {
      if (!window.confirm('Remove this part from inventory?')) return;
      await partsApi.remove(part.id);
    } else {
      await partsApi.update(part.id, { quantity: newQty });
    }
    await loadParts();
  }

  async function removeItem(id) {
    if (!window.confirm('Remove this part from inventory?')) return;
    try { await partsApi.remove(id); await loadParts(); } catch {}
  }

  async function markComplete(key) {
    const updated = { ...completed, [key]: new Date().toLocaleDateString('en-CA') };
    setCompleted(updated);
    try { await settingsApi.set('maintenance_completed', updated); } catch {}
  }

  async function clearComplete(key) {
    const updated = { ...completed };
    delete updated[key];
    setCompleted(updated);
    try { await settingsApi.set('maintenance_completed', updated); } catch {}
  }

  function isOverdue(task, key) {
    if (!completed[key]) return false;
    return (Date.now() - new Date(completed[key])) / (1000 * 60 * 60 * 24) > task.interval_days;
  }
  function isDueSoon(task, key) {
    if (!completed[key]) return false;
    const days = (Date.now() - new Date(completed[key])) / (1000 * 60 * 60 * 24);
    return days > task.interval_days * 0.8 && days <= task.interval_days;
  }

  function getCatalogueData(serverPart) {
    const desc = serverPart.description || '';
    const sku  = desc.split(' | ')[0];
    return allCatParts.find(p => p.sku === sku || p.name === serverPart.name) || null;
  }

  const catalogueFiltered = allCatParts.filter(p => {
    if (catFilter     && p.category !== catFilter)               return false;
    if (printerFilter && !p.compatible.includes(printerFilter))  return false;
    if (search && !`${p.name} ${p.sku} ${p.notes || ''}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const tasks      = MAINTENANCE_SCHEDULE.filter(t => !mainPrinter || t.printer === mainPrinter);
  const totalValue = inventory.reduce((a, i) => a + (i.unit_cost || 0) * (i.quantity || 1), 0);

  return (
    <div style={{ height:'100%',overflowY:'auto',padding:24 }}>
      <div style={{ maxWidth:1200,margin:'0 auto' }}>

        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20 }}>
          <div>
            <h1>Parts & Supplies</h1>
            <p style={{ color:'var(--text-secondary)',fontSize:13,marginTop:4 }}>
              Shared inventory — all users see the same parts · Bambu Lab P1S & H2C
            </p>
          </div>
          {canEdit && tab === 'inventory' && (
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Part</button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display:'flex',gap:4,marginBottom:20,background:'var(--bg-hover)',borderRadius:'var(--r-sm)',padding:4,width:'fit-content' }}>
          {[['inventory','📦 Parts Inventory'],['maintenance','🔧 Maintenance Schedule']].map(([t, l]) => (
            <button key={t} onClick={() => setTab(t)} className={`btn ${tab === t ? 'btn-primary' : 'btn-ghost'}`} style={{ justifyContent:'center',fontSize:13 }}>{l}</button>
          ))}
        </div>

        {tab === 'inventory' && (
          <>
            {/* Metrics */}
            <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:20 }}>
              {[
                ['Parts in Stock',   inventory.length],
                ['Total Units',      inventory.reduce((a, i) => a + (i.quantity || 1), 0)],
                ['Inventory Value',  `$${(totalValue * (1 + HST)).toFixed(2)} incl HST`],
              ].map(([l, v]) => (
                <div key={l} className="card" style={{ padding:16 }}>
                  <div style={{ fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em',color:'var(--text-tertiary)',marginBottom:6 }}>{l}</div>
                  <div style={{ fontSize:20,fontWeight:700 }}>{v}</div>
                </div>
              ))}
            </div>

            {loading ? (
              <div style={{ textAlign:'center',padding:48,color:'var(--text-secondary)',fontSize:13 }}>Loading parts...</div>
            ) : inventory.length === 0 ? (
              <div className="card" style={{ padding:48,textAlign:'center' }}>
                <div style={{ fontSize:48,marginBottom:12 }}>🔧</div>
                <div style={{ fontSize:16,fontWeight:600,marginBottom:8 }}>No parts in inventory</div>
                <div style={{ fontSize:13,color:'var(--text-secondary)',marginBottom:20 }}>
                  Click "Add Part" to browse the Bambu Lab P1S and H2C parts catalogue
                </div>
                {canEdit && <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add First Part</button>}
              </div>
            ) : (
              <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:12 }}>
                {inventory.map(item => {
                  const cat = getCatalogueData(item);
                  return (
                    <div key={item.id} className="card" style={{ padding:16 }}>
                      <div style={{ display:'flex',alignItems:'flex-start',gap:12,marginBottom:10 }}>
                        <PartImage img={cat?.img} icon={cat?.categoryIcon} size={52} />
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ fontSize:13,fontWeight:600,lineHeight:1.3,marginBottom:2 }}>{item.name}</div>
                          <div style={{ fontSize:10,fontFamily:'monospace',color:'var(--text-tertiary)',marginBottom:4 }}>{item.description?.split(' | ')[0]}</div>
                          <div style={{ display:'flex',gap:4,flexWrap:'wrap' }}>
                            {(cat?.compatible || []).map(c => (
                              <span key={c} className={`pill ${c==='P1S'?'pill-blue':'pill-purple'}`} style={{ fontSize:9 }}>{c}</span>
                            ))}
                            <span className="pill pill-grey" style={{ fontSize:9 }}>{item.category}</span>
                          </div>
                        </div>
                      </div>

                      {cat?.notes && (
                        <div style={{ fontSize:11,color:'var(--text-secondary)',marginBottom:10,lineHeight:1.4 }}>
                          {cat.notes}
                        </div>
                      )}

                      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between' }}>
                        <div>
                          <div style={{ fontSize:15,fontWeight:700,color:'var(--accent)' }}>${(item.unit_cost || 0).toFixed(2)}</div>
                          <div style={{ fontSize:10,color:'var(--text-tertiary)' }}>+HST ${((item.unit_cost || 0) * HST).toFixed(2)} ea</div>
                        </div>
                        <div style={{ display:'flex',alignItems:'center',gap:6 }}>
                          {canEdit && (
                            <button className="btn btn-secondary btn-sm" style={{ width:28,height:28,padding:0,justifyContent:'center' }}
                              onClick={() => adjustQty(item, -1)}>−</button>
                          )}
                          <span style={{ fontSize:16,fontWeight:700,minWidth:28,textAlign:'center' }}>{item.quantity || 1}</span>
                          {canEdit && (
                            <button className="btn btn-secondary btn-sm" style={{ width:28,height:28,padding:0,justifyContent:'center' }}
                              onClick={() => adjustQty(item, 1)}>+</button>
                          )}
                        </div>
                      </div>

                      {canEdit && (
                        <div style={{ marginTop:10,display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                          {cat?.url && (
                            <button className="btn btn-ghost btn-sm" style={{ fontSize:10 }}
                              onClick={() => window.printflow.openExternal(cat.url)}>
                              Buy on Bambu ↗
                            </button>
                          )}
                          <button className="btn btn-ghost btn-sm" style={{ fontSize:10,color:'var(--red)' }}
                            onClick={() => removeItem(item.id)}>Remove</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {tab === 'maintenance' && (
          <div>
            <div style={{ display:'flex',gap:10,marginBottom:16,alignItems:'center' }}>
              <select className="select" style={{ width:160 }} value={mainPrinter} onChange={e => setMainPrinter(e.target.value)}>
                <option value="">All Printers</option>
                <option value="P1S">P1S</option>
                <option value="H2C">H2C</option>
              </select>
              <div style={{ display:'flex',gap:12,fontSize:12,color:'var(--text-secondary)' }}>
                {[['var(--green)','Done'],['var(--amber)','Due Soon'],['var(--red)','Overdue'],['var(--text-tertiary)','Pending']].map(([c, l]) => (
                  <span key={l} style={{ display:'flex',alignItems:'center',gap:4 }}>
                    <span style={{ width:10,height:10,borderRadius:'50%',background:c,display:'inline-block' }} />{l}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
              {tasks.map(task => {
                const key     = `${task.printer}__${task.task}`;
                const done    = !!completed[key];
                const overdue = done && isOverdue(task, key);
                const soon    = done && !overdue && isDueSoon(task, key);
                const dc      = overdue ? 'var(--red)' : soon ? 'var(--amber)' : done ? 'var(--green)' : 'var(--text-tertiary)';
                const relatedInStock = (task.parts || []).filter(sku =>
                  inventory.some(i => i.description?.includes(sku))
                );
                return (
                  <div key={key} className="card" style={{ padding:16,borderLeft:`3px solid ${dc}` }}>
                    <div style={{ display:'flex',alignItems:'flex-start',gap:12 }}>
                      <div style={{ width:12,height:12,borderRadius:'50%',background:dc,boxShadow:`0 0 6px ${dc}`,marginTop:3,flexShrink:0 }} />
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap' }}>
                          <div style={{ fontSize:14,fontWeight:600 }}>{task.task}</div>
                          <span className={`pill ${task.printer==='P1S'?'pill-blue':'pill-purple'}`} style={{ fontSize:10 }}>{task.printer}</span>
                          <span style={{ fontSize:11,color:'var(--text-tertiary)' }}>{task.interval_label}</span>
                        </div>
                        <div style={{ fontSize:12,color:'var(--text-secondary)',lineHeight:1.5,marginBottom:8 }}>{task.instructions}</div>
                        {done && (
                          <div style={{ fontSize:11,color:'var(--text-tertiary)',marginBottom:6 }}>
                            Last done: {completed[key]}
                            {overdue && <span style={{ color:'var(--red)',marginLeft:8,fontWeight:600 }}>⚠ Overdue</span>}
                            {soon    && <span style={{ color:'var(--amber)',marginLeft:8,fontWeight:600 }}>Due soon</span>}
                          </div>
                        )}
                        {relatedInStock.length > 0 && (
                          <div style={{ fontSize:11,color:'var(--green)' }}>✓ Parts in stock: {relatedInStock.join(', ')}</div>
                        )}
                      </div>
                      <div style={{ flexShrink:0 }}>
                        {done
                          ? <button className="btn btn-secondary btn-sm" onClick={() => clearComplete(key)}>Reset</button>
                          : <button className="btn btn-primary btn-sm"   onClick={() => markComplete(key)}>Mark Done</button>
                        }
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add Part Modal */}
      {showAdd && (
        <Modal title="Add Part from Catalogue" width={720} onClose={() => setShowAdd(false)}>
          {/* Filters */}
          <div style={{ display:'flex',gap:8,marginBottom:16,flexWrap:'wrap' }}>
            <input className="input" placeholder="Search parts..." style={{ flex:1,minWidth:180 }}
              value={search} onChange={e => setSearch(e.target.value)} autoFocus />
            <select className="select" style={{ width:200 }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
            <select className="select" style={{ width:130 }} value={printerFilter} onChange={e => setPrinterFilter(e.target.value)}>
              <option value="">All Printers</option>
              <option value="P1S">P1S</option>
              <option value="H2C">H2C</option>
            </select>
          </div>

          {/* Results */}
          <div style={{ maxHeight:500,overflowY:'auto',display:'flex',flexDirection:'column',gap:8 }}>
            {catalogueFiltered.map(p => {
              const inStock = inventory.find(i => i.name === p.name);
              return (
                <div key={p.sku} style={{ display:'flex',alignItems:'center',gap:12,padding:'12px 14px',borderRadius:'var(--r-sm)',background:'var(--bg-hover)',border:'0.5px solid var(--border)' }}>
                  <PartImage img={p.img} icon={p.categoryIcon} size={52} />
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:13,fontWeight:500,marginBottom:2 }}>{p.name}</div>
                    <div style={{ fontSize:10,color:'var(--text-tertiary)',fontFamily:'monospace',marginBottom:3 }}>{p.sku}</div>
                    <div style={{ fontSize:11,color:'var(--text-secondary)',marginBottom:4,lineHeight:1.4 }}>{p.notes}</div>
                    <div style={{ display:'flex',gap:4 }}>
                      {p.compatible.map(c => (
                        <span key={c} className={`pill ${c==='P1S'?'pill-blue':'pill-purple'}`} style={{ fontSize:9 }}>{c}</span>
                      ))}
                      <span className="pill pill-grey" style={{ fontSize:9 }}>{p.category}</span>
                    </div>
                  </div>
                  <div style={{ textAlign:'right',flexShrink:0,minWidth:90 }}>
                    <div style={{ fontSize:15,fontWeight:700,color:'var(--accent)' }}>${p.price_cad.toFixed(2)}</div>
                    <div style={{ fontSize:10,color:'var(--text-tertiary)',marginBottom:4 }}>CAD + HST</div>
                    {p.url && (
                      <button className="btn btn-ghost btn-sm" style={{ fontSize:9,padding:'2px 6px',marginBottom:4 }}
                        onClick={() => window.printflow.openExternal(p.url)}>
                        Bambu ↗
                      </button>
                    )}
                    {inStock ? (
                      <>
                        <div style={{ fontSize:11,color:'var(--green)',marginBottom:4 }}>✓ {inStock.quantity} in stock</div>
                        <button className="btn btn-secondary btn-sm" onClick={() => addFromCatalogue(p)}>+1 More</button>
                      </>
                    ) : (
                      <button className="btn btn-primary btn-sm" onClick={() => addFromCatalogue(p)}>Add</button>
                    )}
                  </div>
                </div>
              );
            })}
            {catalogueFiltered.length === 0 && (
              <div style={{ textAlign:'center',padding:32,color:'var(--text-tertiary)' }}>No parts match your filters</div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
