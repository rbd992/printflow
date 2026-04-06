import React, { useEffect, useState, useCallback } from 'react';
import { filamentApi } from '../api/client';
import { onSocketEvent } from '../api/socket';
import { useAuthStore } from '../stores/authStore';
import { BAMBU_CATALOGUE, ALL_MATERIALS, getColorsForMaterial, SPOOL_WEIGHTS, DIAMETERS } from '../data/bambuCatalogue';
import { VENDOR_CATALOGUES, getVendorColors, getVendorPrice, getVendorMaterials, ALL_VENDORS } from '../data/vendorCatalogues';

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="card" style={{ width:560,maxHeight:'92vh',overflowY:'auto',padding:28,animation:'fadeIn 0.2s ease' }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20 }}>
          <h2 style={{ fontSize:18 }}>{title}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>x</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ColorPicker({ material, selected, onSelect }) {
  const colors = getColorsForMaterial(material);
  if (!colors.length) return null;
  return (
    <div>
      <label className="label" style={{ marginBottom:8,display:'block' }}>
        Colour — {colors.length} options for {material}
      </label>
      <div style={{ display:'flex',flexWrap:'wrap',gap:8,maxHeight:160,overflowY:'auto',padding:4 }}>
        {colors.map(c => (
          <div key={c.name} onClick={()=>onSelect(c)} title={c.name} style={{
            width:32,height:32,borderRadius:'50%',cursor:'pointer',
            background:c.hex,flexShrink:0,
            border:`2px solid ${selected && selected.hex===c.hex ? 'var(--accent)' : 'rgba(255,255,255,0.2)'}`,
            boxShadow:selected && selected.hex===c.hex ? '0 0 0 3px var(--accent-glow)' : '0 1px 3px rgba(0,0,0,0.3)',
            transform:selected && selected.hex===c.hex ? 'scale(1.18)' : 'scale(1)',
            transition:'all 0.15s',
          }}/>
        ))}
      </div>
      {selected && (
        <div style={{ marginTop:8,fontSize:12,color:'var(--text-secondary)',display:'flex',alignItems:'center',gap:8 }}>
          <div style={{ width:16,height:16,borderRadius:'50%',background:selected.hex,border:'1px solid var(--border)' }}/>
          {selected.name} · {selected.hex}
        </div>
      )}
    </div>
  );
}

const BLANK = { brand:'Bambu Lab',material:'PLA',color_name:'',color_hex:'#3B82F6',diameter_mm:1.75,full_weight_g:1000,remaining_g:1000,cost_cad:'',reorder_at_g:200,auto_reorder:false,reorder_qty:1,spool_quantity:1,notes:'' };

export default function FilamentPage() {
  const [spools,setSpools]     = useState([]);
  const [loading,setLoading]   = useState(true);
  const [filter,setFilter]     = useState({ material:'',search:'',showLow:false });
  const [editing,setEditing]   = useState(null);
  const [form,setForm]         = useState(BLANK);
  const [selectedColor,setSelectedColor] = useState(null);
  const [saving,setSaving]     = useState(false);
  const [err,setErr]           = useState('');
  const [activeTab,setActiveTab] = useState('bambu');
  const [customWeight,setCustomWeight] = useState('');
  const { user } = useAuthStore();
  const canEdit = ['owner','manager'].includes(user && user.role);

  const load = useCallback(async()=>{
    try{ const r=await filamentApi.list(); setSpools(r.data); }catch{} finally{ setLoading(false); }
  },[]);

  useEffect(()=>{
    load();
    const u1=onSocketEvent('filament:updated',u=>setSpools(p=>p.some(s=>s.id===u.id)?p.map(s=>s.id===u.id?u:s):[...p,u]));
    const u2=onSocketEvent('filament:deleted',({id})=>setSpools(p=>p.filter(s=>s.id!==id)));
    return ()=>{u1();u2();};
  },[load]);

  const filtered = spools.filter(s=>{
    if(filter.material && s.material!==filter.material) return false;
    if(filter.showLow && !s.is_low) return false;
    if(filter.search && !`${s.brand} ${s.color_name} ${s.material}`.toLowerCase().includes(filter.search.toLowerCase())) return false;
    return true;
  });

  // Group identical spools (same brand+material+color_hex) into single cards
  const grouped = filtered.reduce((acc, s) => {
    const key = `${s.brand}__${s.material}__${s.color_hex}`;
    if (!acc[key]) {
      acc[key] = { ...s, roll_count: 1, total_remaining_g: s.remaining_g };
    } else {
      acc[key].roll_count += 1;
      acc[key].total_remaining_g += s.remaining_g;
      acc[key].remaining_g = acc[key].total_remaining_g / acc[key].roll_count; // avg for progress bar
      if (s.is_low) acc[key].is_low = true;
    }
    return acc;
  }, {});
  const groupedSpools = Object.values(grouped);

  const lowCount = spools.filter(s=>s.is_low).length;
  const totalKg  = (spools.reduce((a,s)=>a+s.remaining_g,0)/1000).toFixed(2);

  function openAdd() {
    // Pre-fill PLA price immediately so user doesn't have to click another material first
    const plaInfo = BAMBU_CATALOGUE['PLA'];
    setForm({
      ...BLANK,
      cost_cad: plaInfo?.price_cad ? String(plaInfo.price_cad) : '',
      full_weight_g: plaInfo?.weight_g || 1000,
      remaining_g: plaInfo?.weight_g || 1000,
    });
    setEditing({});
    setSelectedColor(null);
    setActiveTab('bambu');
    setErr('');
    setCustomWeight('');
  }
  function openEdit(spool) {
    setForm({ ...spool,cost_cad:spool.cost_cad||'',auto_reorder:!!spool.auto_reorder,spool_quantity:1 });
    setSelectedColor({ name:spool.color_name,hex:spool.color_hex });
    setEditing(spool); setActiveTab('custom'); setErr('');
  }

  function handleColorSelect(color) { setSelectedColor(color); setForm(f=>({...f,color_name:color.name,color_hex:color.hex})); }

  async function save() {
    setSaving(true); setErr('');
    try {
      const vendorTabMap = { sunlu:'Sunlu', polymaker:'Polymaker', overture:'Overture', elegoo:'Elegoo' };
      const brand = vendorTabMap[activeTab] || form.brand || 'Bambu Lab';
      const qty = parseInt(form.spool_quantity)||1;
      const costCad = parseFloat(form.cost_cad) || 0;
      const fullWeight = parseInt(form.full_weight_g) || 1000;
      const payload = {
        brand, material:form.material, color_name:form.color_name,
        color_hex:form.color_hex,
        diameter_mm:parseFloat(form.diameter_mm) || 1.75,
        full_weight_g: fullWeight,
        remaining_g: parseFloat(form.remaining_g) || fullWeight,
        cost_cad: costCad,
        reorder_at_g:parseInt(form.reorder_at_g)||200,
        auto_reorder:!!form.auto_reorder,
        reorder_qty:parseInt(form.reorder_qty)||1,
        notes:form.notes||'',
      };
      if(!payload.color_name) { setErr('Please select or enter a colour'); setSaving(false); return; }
      if(editing && editing.id) { await filamentApi.update(editing.id,payload); }
      else { for(let i=0;i<qty;i++) { await filamentApi.create(payload); } }
      setEditing(null); setForm(BLANK); setSelectedColor(null); setCustomWeight(''); await load();
    } catch(e) { setErr(e.response&&e.response.data&&e.response.data.error ? e.response.data.error : 'Save failed'); }
    finally { setSaving(false); }
  }

  async function del(id) {
    if(!window.confirm('Delete this spool?')) return;
    try{ await filamentApi.remove(id); setEditing(null); setSelectedColor(null); await load(); }catch{}
  }

  const F = k => ({ value:form[k]!==undefined?form[k]:'', onChange:e=>setForm(f=>({...f,[k]:e.target.value})) });
  const materialInfo = BAMBU_CATALOGUE[form.material];

  return (
    <div style={{ height:'100%',overflowY:'auto',padding:24 }}>
      <div style={{ maxWidth:1200,margin:'0 auto' }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20 }}>
          <div>
            <h1>Filament Inventory</h1>
            <p style={{ color:'var(--text-secondary)',fontSize:13,marginTop:4 }}>{spools.length} spools · {totalKg} kg total</p>
          </div>
          {canEdit && <button className="btn btn-primary" onClick={openAdd}>+ Add Spool</button>}
        </div>

        <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20 }}>
          {[['Total Spools',spools.length,'var(--text-primary)'],['Total Stock',`${totalKg} kg`,'var(--text-primary)'],['Low Stock',lowCount,lowCount>0?'var(--red)':'var(--green)'],['Est. Value',`$${spools.reduce((a,s)=>a+(parseFloat(s.cost_cad||0)*(parseFloat(s.remaining_g)||0)/(parseFloat(s.full_weight_g)||1000)),0).toFixed(2)}`,'var(--text-primary)']].map(([l,v,c])=>(
            <div key={l} className="card" style={{ padding:16 }}>
              <div style={{ fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em',color:'var(--text-tertiary)',marginBottom:6 }}>{l}</div>
              <div style={{ fontSize:24,fontWeight:700,color:c }}>{v}</div>
            </div>
          ))}
        </div>

        {lowCount>0 && (
          <div style={{ padding:'10px 16px',borderRadius:'var(--r-sm)',marginBottom:14,fontSize:13,background:'var(--red-light)',border:'0.5px solid rgba(255,69,58,0.25)',color:'var(--red)',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
            <span>Warning: {lowCount} spool{lowCount!==1?'s':''} low on stock</span>
            <button className="btn btn-ghost btn-sm" style={{ color:'var(--red)',fontSize:12 }} onClick={()=>setFilter(f=>({...f,showLow:!f.showLow}))}>{filter.showLow?'Show all':'Show only low'}</button>
          </div>
        )}

        <div style={{ display:'flex',gap:10,marginBottom:16,flexWrap:'wrap' }}>
          <input className="input" placeholder="Search brand, colour, material" style={{ width:220 }} value={filter.search} onChange={e=>setFilter(f=>({...f,search:e.target.value}))} />
          <select className="select" style={{ width:160 }} value={filter.material} onChange={e=>setFilter(f=>({...f,material:e.target.value}))}>
            <option value="">All Materials</option>
            {ALL_MATERIALS.map(m=><option key={m}>{m}</option>)}
          </select>
          {(filter.search||filter.material||filter.showLow) && <button className="btn btn-secondary btn-sm" onClick={()=>setFilter({ material:'',search:'',showLow:false })}>Clear</button>}
        </div>

        {loading ? <div style={{ color:'var(--text-secondary)',padding:32 }}>Loading...</div> : (
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))',gap:14 }}>
            {groupedSpools.map(s=>{
              const pct=Math.min(100,Math.round((s.remaining_g/s.full_weight_g)*100));
              const bc=pct>40?'var(--green)':pct>15?'var(--amber)':'var(--red)';
              return (
                <div key={s.id} className="card interactive" onClick={()=>canEdit&&openEdit(s)} style={{ padding:16,display:'flex',flexDirection:'column',gap:8 }}>
                  <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                    <div style={{ width:36,height:36,borderRadius:'50%',flexShrink:0,background:s.color_hex,boxShadow:`0 2px 8px ${s.color_hex}55`,border:'2px solid rgba(255,255,255,0.2)' }}/>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontSize:13,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{s.color_name}</div>
                      <div style={{ fontSize:11,color:'var(--text-secondary)' }}>{s.brand}</div>
                      <div style={{ fontSize:10,color:'var(--text-tertiary)' }}>{s.material}</div>
                    </div>
                    {s.roll_count > 1 && (
                    <span style={{ background:'var(--accent)',color:'#fff',borderRadius:10,fontSize:10,fontWeight:700,padding:'2px 7px',flexShrink:0 }}>
                      x{s.roll_count}
                    </span>
                  )}
                  {s.is_low && <span style={{ fontSize:14,flexShrink:0 }}>⚠️</span>}
                  </div>
                  <div className="progress"><div className="progress-fill" style={{ width:`${pct}%`,background:bc }}/></div>
                  <div style={{ display:'flex',justifyContent:'space-between',fontSize:11 }}>
                    <span style={{ color:bc,fontWeight:600 }}>
                    {s.roll_count > 1 ? `${s.total_remaining_g}g total` : `${s.remaining_g}g`}
                  </span>
                    <span style={{ color:'var(--text-tertiary)' }}>{pct}%</span>
                  </div>
                  <div style={{ display:'flex',gap:5,flexWrap:'wrap' }}>
                    <span className="pill pill-blue" style={{ fontSize:10 }}>{s.diameter_mm}mm</span>
                    {s.auto_reorder && <span className="pill pill-green" style={{ fontSize:10 }}>Auto</span>}
                  </div>
                </div>
              );
            })}
            {canEdit && (
              <div className="card interactive" onClick={openAdd} style={{ padding:16,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8,border:'0.5px dashed var(--border-strong)',background:'transparent',minHeight:140 }}>
                <span style={{ fontSize:28,color:'var(--text-tertiary)' }}>+</span>
                <span style={{ fontSize:12,color:'var(--text-tertiary)',fontWeight:500 }}>Add Spool</span>
              </div>
            )}
          </div>
        )}
      </div>

      {editing && (
        <Modal title={editing.id ? 'Edit Spool' : 'Add Filament Spool'} onClose={()=>{setEditing(null);setSelectedColor(null);setErr('');}}>
          {!editing.id && (
            <div style={{ display:'flex',gap:4,marginBottom:20,background:'var(--bg-hover)',borderRadius:'var(--r-sm)',padding:4,flexWrap:'wrap' }}>
              {[['bambu','🏭 Bambu Lab'],['sunlu','Sunlu'],['polymaker','Polymaker'],['overture','Overture'],['elegoo','Elegoo'],['custom','✏️ Other']].map(([t,l])=>(
                <button key={t} onClick={()=>setActiveTab(t)} className={`btn ${activeTab===t?'btn-primary':'btn-ghost'}`} style={{ justifyContent:'center',fontSize:11,padding:'6px 10px' }}>{l}</button>
              ))}
            </div>
          )}

          {activeTab==='bambu' && !editing.id && (
            <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
              <div className="form-group">
                <label className="label">Material Type</label>
                <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))',gap:6 }}>
                  {ALL_MATERIALS.map(m=>{
                    const isSelected=form.material===m;
                    const info=BAMBU_CATALOGUE[m];
                    return (
                      <div key={m} onClick={()=>{
                        const matInfo = BAMBU_CATALOGUE[m];
                        setForm(f=>({
                          ...f,
                          material:m,
                          color_name:'',
                          color_hex:'#888888',
                          // Auto-fill price and weight from catalogue
                          cost_cad: matInfo?.price_cad ? String(matInfo.price_cad) : f.cost_cad,
                          full_weight_g: matInfo?.weight_g || f.full_weight_g,
                          remaining_g: matInfo?.weight_g || f.remaining_g,
                        }));
                        setSelectedColor(null);
                        setCustomWeight('');
                      }} style={{ padding:'8px 10px',borderRadius:'var(--r-sm)',cursor:'pointer',border:`1px solid ${isSelected?'var(--accent)':'var(--border)'}`,background:isSelected?'var(--accent-light)':'var(--bg-hover)',transition:'all 0.15s' }}>
                        <div style={{ fontSize:12,fontWeight:600,color:isSelected?'var(--accent)':'var(--text-primary)' }}>{m}</div>
                        <div style={{ fontSize:10,color:'var(--text-tertiary)',marginTop:2,lineHeight:1.3 }}>{info && info.description ? info.description.split(' — ')[0] : ''}</div>
                      </div>
                    );
                  })}
                </div>
                {materialInfo && <div style={{ marginTop:8,fontSize:11,color:'var(--text-secondary)',padding:'6px 10px',background:'var(--bg-hover)',borderRadius:'var(--r-sm)' }}>{materialInfo.description}</div>}
                {materialInfo?.price_cad && (
                  <div style={{ marginTop:6,fontSize:12,color:'var(--green)',padding:'8px 12px',background:'var(--green-light)',borderRadius:'var(--r-sm)',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                    <span>💰 Price auto-filled from Bambu Lab Canada</span>
                    <strong>${materialInfo.price_cad.toFixed(2)} CAD / {materialInfo.weight_g}g</strong>
                  </div>
                )}
              </div>

              <ColorPicker material={form.material} selected={selectedColor} onSelect={handleColorSelect} />

              <div className="form-group">
                <label className="label">Diameter</label>
                <div style={{ display:'flex',gap:8 }}>
                  {DIAMETERS.map(d=>(
                    <button key={d.value} onClick={()=>setForm(f=>({...f,diameter_mm:d.value}))} className={`btn ${form.diameter_mm===d.value?'btn-primary':'btn-secondary'}`} style={{ flex:1,justifyContent:'center' }}>{d.label}</button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="label">Spool Weight</label>
                <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
                  {SPOOL_WEIGHTS.filter(w=>w.value).map(w=>(
                    <button key={w.value} onClick={()=>{setForm(f=>({...f,full_weight_g:w.value,remaining_g:w.value}));setCustomWeight('');}} className={`btn ${form.full_weight_g===w.value?'btn-primary':'btn-secondary'} btn-sm`}>{w.label}</button>
                  ))}
                </div>
                <div style={{ display:'flex',gap:8,marginTop:8,alignItems:'center' }}>
                  <span style={{ fontSize:12,color:'var(--text-secondary)',flexShrink:0 }}>Custom:</span>
                  <input className="input" type="number" placeholder="e.g. 750" style={{ width:100 }} value={customWeight} onChange={e=>{setCustomWeight(e.target.value);if(e.target.value)setForm(f=>({...f,full_weight_g:parseInt(e.target.value),remaining_g:parseInt(e.target.value)}));}} />
                  <span style={{ fontSize:12,color:'var(--text-tertiary)' }}>grams</span>
                </div>
              </div>

              <div className="form-group">
                <label className="label">How many spools to add?</label>
                <div style={{ display:'flex',alignItems:'center',gap:12 }}>
                  <button className="btn btn-secondary" style={{ width:36,height:36,padding:0,justifyContent:'center',fontSize:18 }} onClick={()=>setForm(f=>({...f,spool_quantity:Math.max(1,(f.spool_quantity||1)-1)}))}>-</button>
                  <span style={{ fontSize:22,fontWeight:700,minWidth:40,textAlign:'center' }}>{form.spool_quantity||1}</span>
                  <button className="btn btn-secondary" style={{ width:36,height:36,padding:0,justifyContent:'center',fontSize:18 }} onClick={()=>setForm(f=>({...f,spool_quantity:Math.min(24,(f.spool_quantity||1)+1)}))}>+</button>
                  <span style={{ fontSize:13,color:'var(--text-secondary)' }}>{(form.spool_quantity||1)>1?`${form.spool_quantity} spools will be added`:'spool'}</span>
                </div>
              </div>

              <div className="form-group">
                <label className="label">
                  Cost per Spool ($CAD)
                  {form.cost_cad && parseFloat(form.cost_cad) > 0 && (
                    <span style={{ marginLeft:8,fontSize:10,color:'var(--green)',fontWeight:400 }}>
                      auto-filled ✓
                    </span>
                  )}
                </label>
                <input className="input" type="number" step="0.01" min="0" {...F('cost_cad')} placeholder="e.g. 31.99" />
              </div>

              <div className="form-row">
                <div className="form-group"><label className="label">Reorder At (g)</label><input className="input" type="number" {...F('reorder_at_g')} /></div>
                <div className="form-group"><label className="label">Reorder Qty</label><input className="input" type="number" min="1" {...F('reorder_qty')} /></div>
              </div>
              <div className="form-group" style={{ display:'flex',alignItems:'center',gap:10 }}>
                <input type="checkbox" id="ar" checked={!!form.auto_reorder} onChange={e=>setForm(f=>({...f,auto_reorder:e.target.checked}))} style={{ width:16,height:16 }} />
                <label htmlFor="ar" style={{ fontSize:13,cursor:'pointer' }}>Enable auto-reorder at threshold</label>
              </div>

              {selectedColor && form.full_weight_g && (
                <div style={{ padding:'12px 14px',background:'var(--bg-hover)',borderRadius:'var(--r-sm)',fontSize:12 }}>
                  <div style={{ fontWeight:600,marginBottom:6 }}>Summary</div>
                  <div style={{ display:'flex',gap:16,flexWrap:'wrap',color:'var(--text-secondary)' }}>
                    <span>Material: <strong style={{ color:'var(--text-primary)' }}>{form.material}</strong></span>
                    <span>Colour: <strong style={{ color:'var(--text-primary)' }}>{form.color_name}</strong></span>
                    <span>Weight: <strong style={{ color:'var(--text-primary)' }}>{form.full_weight_g}g</strong></span>
                    <span>Qty: <strong style={{ color:'var(--accent)' }}>x{form.spool_quantity||1}</strong></span>
                    {form.cost_cad && <span>Total: <strong style={{ color:'var(--text-primary)' }}>${(parseFloat(form.cost_cad)*(form.spool_quantity||1)).toFixed(2)}</strong></span>}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── VENDOR TABS (Sunlu, Polymaker, Overture, Elegoo) ── */}
          {['sunlu','polymaker','overture','elegoo'].includes(activeTab) && !editing.id && (() => {
            const vendorName = activeTab.charAt(0).toUpperCase()+activeTab.slice(1);
            const vendorKey  = vendorName === 'Sunlu' ? 'Sunlu' : vendorName === 'Polymaker' ? 'Polymaker' : vendorName === 'Overture' ? 'Overture' : 'Elegoo';
            const vendorData = VENDOR_CATALOGUES[vendorKey];
            const vendorMats = getVendorMaterials(vendorKey) || [];
            const vendorColors = getVendorColors(vendorKey, form.material) || [];
            const priceInfo  = getVendorPrice(vendorKey, form.material);
            return (
              <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
                <div style={{ padding:'8px 12px',background:'var(--bg-hover)',borderRadius:'var(--r-sm)',fontSize:12,color:'var(--text-secondary)',display:'flex',justifyContent:'space-between' }}>
                  <span>Vendor: <strong style={{ color:'var(--text-primary)' }}>{vendorKey}</strong></span>
                  <button className="btn btn-ghost btn-sm" style={{ fontSize:11 }} onClick={()=>window.printflow.openExternal(vendorData.website)}>Visit website ↗</button>
                </div>

                <div className="form-group">
                  <label className="label">Material Type</label>
                  <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))',gap:6 }}>
                    {vendorMats.map(m=>{
                      const isSelected=form.material===m;
                      return (
                        <div key={m} onClick={()=>setForm(f=>({...f,material:m,brand:vendorKey,color_name:'',color_hex:'#888888'}))} style={{ padding:'8px 10px',borderRadius:'var(--r-sm)',cursor:'pointer',border:`1px solid ${isSelected?'var(--accent)':'var(--border)'}`,background:isSelected?'var(--accent-light)':'var(--bg-hover)',transition:'all 0.15s' }}>
                          <div style={{ fontSize:12,fontWeight:600,color:isSelected?'var(--accent)':'var(--text-primary)' }}>{m}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {vendorColors.length>0 && (
                  <div>
                    <label className="label" style={{ marginBottom:8,display:'block' }}>Colour — {vendorColors.length} options</label>
                    <div style={{ display:'flex',flexWrap:'wrap',gap:8,maxHeight:160,overflowY:'auto',padding:4 }}>
                      {vendorColors.map(c=>(
                        <div key={c.name} onClick={()=>setSelectedColor(c)||setForm(f=>({...f,color_name:c.name,color_hex:c.hex}))} title={c.name} style={{ width:32,height:32,borderRadius:'50%',cursor:'pointer',background:c.hex,flexShrink:0,border:`2px solid ${selectedColor&&selectedColor.hex===c.hex?'var(--accent)':'rgba(255,255,255,0.2)'}`,boxShadow:selectedColor&&selectedColor.hex===c.hex?'0 0 0 3px var(--accent-glow)':'0 1px 3px rgba(0,0,0,0.3)',transform:selectedColor&&selectedColor.hex===c.hex?'scale(1.18)':'scale(1)',transition:'all 0.15s' }}/>
                      ))}
                    </div>
                    {selectedColor && <div style={{ marginTop:8,fontSize:12,color:'var(--text-secondary)',display:'flex',alignItems:'center',gap:8 }}>
                      <div style={{ width:16,height:16,borderRadius:'50%',background:selectedColor.hex,border:'1px solid var(--border)' }}/>{selectedColor.name} · {selectedColor.hex}
                    </div>}
                  </div>
                )}

                <div className="form-group">
                  <label className="label">Spool Weight</label>
                  <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
                    {SPOOL_WEIGHTS.filter(w=>w.value).map(w=>(
                      <button key={w.value} onClick={()=>{setForm(f=>({...f,full_weight_g:w.value,remaining_g:w.value}));setCustomWeight('');}} className={`btn ${form.full_weight_g===w.value?'btn-primary':'btn-secondary'} btn-sm`}>{w.label}</button>
                    ))}
                  </div>
                </div>

                {priceInfo && (
                  <div style={{ padding:'8px 12px',background:'var(--green-light)',borderRadius:'var(--r-sm)',fontSize:12,color:'var(--green)' }}>
                    Suggested price: <strong>${priceInfo.price_cad.toFixed(2)} CAD</strong> for {priceInfo.weight_g}g
                    <button className="btn btn-ghost btn-sm" style={{ marginLeft:8,fontSize:11 }} onClick={()=>setForm(f=>({...f,cost_cad:priceInfo.price_cad,full_weight_g:priceInfo.weight_g,remaining_g:priceInfo.weight_g}))}>Use this price</button>
                  </div>
                )}

                <div className="form-group">
                  <label className="label">How many spools to add?</label>
                  <div style={{ display:'flex',alignItems:'center',gap:12 }}>
                    <button className="btn btn-secondary" style={{ width:36,height:36,padding:0,justifyContent:'center',fontSize:18 }} onClick={()=>setForm(f=>({...f,spool_quantity:Math.max(1,(f.spool_quantity||1)-1)}))}>-</button>
                    <span style={{ fontSize:22,fontWeight:700,minWidth:40,textAlign:'center' }}>{form.spool_quantity||1}</span>
                    <button className="btn btn-secondary" style={{ width:36,height:36,padding:0,justifyContent:'center',fontSize:18 }} onClick={()=>setForm(f=>({...f,spool_quantity:Math.min(24,(f.spool_quantity||1)+1)}))}>+</button>
                    <span style={{ fontSize:13,color:'var(--text-secondary)' }}>{(form.spool_quantity||1)>1?`${form.spool_quantity} spools will be added`:'spool'}</span>
                  </div>
                </div>

                <div className="form-group"><label className="label">Cost per Spool ($CAD)</label><input className="input" type="number" step="0.01" {...F('cost_cad')} placeholder="0.00" /></div>
                <div className="form-row">
                  <div className="form-group"><label className="label">Reorder At (g)</label><input className="input" type="number" {...F('reorder_at_g')} /></div>
                  <div className="form-group"><label className="label">Reorder Qty</label><input className="input" type="number" min="1" {...F('reorder_qty')} /></div>
                </div>
                <div className="form-group" style={{ display:'flex',alignItems:'center',gap:10 }}>
                  <input type="checkbox" id="arv" checked={!!form.auto_reorder} onChange={e=>setForm(f=>({...f,auto_reorder:e.target.checked}))} style={{ width:16,height:16 }} />
                  <label htmlFor="arv" style={{ fontSize:13,cursor:'pointer' }}>Enable auto-reorder at threshold</label>
                </div>

                {selectedColor && form.full_weight_g && (
                  <div style={{ padding:'12px 14px',background:'var(--bg-hover)',borderRadius:'var(--r-sm)',fontSize:12 }}>
                    <div style={{ fontWeight:600,marginBottom:6 }}>Summary</div>
                    <div style={{ display:'flex',gap:16,flexWrap:'wrap',color:'var(--text-secondary)' }}>
                      <span>Brand: <strong style={{ color:'var(--text-primary)' }}>{vendorKey}</strong></span>
                      <span>Material: <strong style={{ color:'var(--text-primary)' }}>{form.material}</strong></span>
                      <span>Colour: <strong style={{ color:'var(--text-primary)' }}>{form.color_name}</strong></span>
                      <span>Qty: <strong style={{ color:'var(--accent)' }}>x{form.spool_quantity||1}</strong></span>
                      {form.cost_cad && <span>Total: <strong>${(parseFloat(form.cost_cad)*(form.spool_quantity||1)).toFixed(2)}</strong></span>}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── CUSTOM / EDIT TAB ── */}
          {(activeTab === 'custom' || editing.id) && (
            <div>
              <div className="form-row">
                <div className="form-group"><label className="label">Brand</label><input className="input" {...F('brand')} /></div>
                <div className="form-group"><label className="label">Material</label><select className="select" {...F('material')}>{ALL_MATERIALS.map(m=><option key={m}>{m}</option>)}</select></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="label">Colour Name</label><input className="input" {...F('color_name')} placeholder="e.g. Silk Gold" /></div>
                <div className="form-group"><label className="label">Colour</label>
                  <div style={{ display:'flex',gap:8,alignItems:'center' }}>
                    <input type="color" value={form.color_hex} onChange={e=>setForm(f=>({...f,color_hex:e.target.value}))} style={{ width:40,height:38,border:'none',borderRadius:6,cursor:'pointer',padding:2 }} />
                    <input className="input" {...F('color_hex')} style={{ fontFamily:'monospace' }} />
                  </div>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="label">Diameter</label><select className="select" {...F('diameter_mm')}><option value="1.75">1.75mm</option><option value="2.85">2.85mm</option></select></div>
                <div className="form-group"><label className="label">Full Weight (g)</label><input className="input" type="number" {...F('full_weight_g')} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="label">Remaining (g)</label><input className="input" type="number" {...F('remaining_g')} /></div>
                <div className="form-group"><label className="label">Cost ($CAD)</label><input className="input" type="number" step="0.01" {...F('cost_cad')} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="label">Reorder At (g)</label><input className="input" type="number" {...F('reorder_at_g')} /></div>
                <div className="form-group"><label className="label">Reorder Qty</label><input className="input" type="number" min="1" {...F('reorder_qty')} /></div>
              </div>
              {!editing.id && (
                <div className="form-group">
                  <label className="label">Spool Quantity to Add</label>
                  <div style={{ display:'flex',alignItems:'center',gap:12 }}>
                    <button className="btn btn-secondary" style={{ width:36,height:36,padding:0,justifyContent:'center',fontSize:18 }} onClick={()=>setForm(f=>({...f,spool_quantity:Math.max(1,(f.spool_quantity||1)-1)}))}>-</button>
                    <span style={{ fontSize:22,fontWeight:700,minWidth:40,textAlign:'center' }}>{form.spool_quantity||1}</span>
                    <button className="btn btn-secondary" style={{ width:36,height:36,padding:0,justifyContent:'center',fontSize:18 }} onClick={()=>setForm(f=>({...f,spool_quantity:Math.min(24,(f.spool_quantity||1)+1)}))}>+</button>
                    <span style={{ fontSize:13,color:'var(--text-secondary)' }}>{(form.spool_quantity||1)>1?`${form.spool_quantity} spools will be added`:'spool'}</span>
                  </div>
                </div>
              )}
              <div className="form-group" style={{ display:'flex',alignItems:'center',gap:10 }}>
                <input type="checkbox" id="ar2" checked={!!form.auto_reorder} onChange={e=>setForm(f=>({...f,auto_reorder:e.target.checked}))} style={{ width:16,height:16 }} />
                <label htmlFor="ar2" style={{ fontSize:13,cursor:'pointer' }}>Enable auto-reorder at threshold</label>
              </div>
              <div className="form-group"><label className="label">Notes</label><textarea className="input" rows={2} {...F('notes')} /></div>
            </div>
          )}

          {err && <div style={{ color:'var(--red)',fontSize:12,marginTop:12 }}>{err}</div>}

          <div style={{ display:'flex',gap:8,justifyContent:'flex-end',marginTop:20 }}>
            {editing && editing.id && canEdit && <button className="btn btn-danger btn-sm" onClick={()=>del(editing.id)}>Delete</button>}
            <button className="btn btn-secondary" onClick={()=>{setEditing(null);setSelectedColor(null);setErr('');}}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Saving...' : editing && editing.id ? 'Save Changes' : `Add ${(form.spool_quantity||1)>1 ? form.spool_quantity+' Spools' : 'Spool'}`}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
