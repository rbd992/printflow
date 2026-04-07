import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, settingsApi } from '../api/client';

const PROVINCES = ['AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT'];

const STEPS = [
  { id: 'welcome',  title: 'Welcome to PrintFlow' },
  { id: 'company',  title: 'Your Business' },
  { id: 'tax',      title: 'Tax Settings' },
  { id: 'printer',  title: 'Add Your First Printer' },
  { id: 'done',     title: "You're All Set" },
];

export default function OnboardingPage({ onComplete }) {
  const navigate   = useNavigate();
  const [step,     setStep]    = useState(0);
  const [saving,   setSaving]  = useState(false);
  const [err,      setErr]     = useState('');
  const [skipPrinter, setSkipPrinter] = useState(false);

  const [company, setCompany] = useState({
    name: '', email: '', phone: '', website: '',
    address: '', city: '', province: 'ON', postal: '',
    enable_hst: true, hst_rate: 13, hst_number: '',
    fiscal_year_start: '01',
  });

  const [printer, setPrinter] = useState({
    name: '', model: 'Bambu Lab X1 Carbon', serial: '',
    ip_address: '', access_code: '', connection_type: 'bambu_lan',
    has_ams: false, ams_count: 1,
  });

  const FC = k => ({ value: company[k] ?? '', onChange: e => setCompany(c => ({ ...c, [k]: e.target.value })) });
  const FP = k => ({ value: printer[k] ?? '', onChange: e => setPrinter(p => ({ ...p, [k]: e.target.value })) });

  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;

  async function next() {
    setErr('');

    if (current.id === 'company' || current.id === 'tax') {
      // Save company config
      try {
        await settingsApi.set('company_config', company);
      } catch (e) {
        setErr('Could not save company settings. Please try again.');
        return;
      }
    }

    if (current.id === 'printer' && !skipPrinter) {
      if (!printer.name || !printer.serial || !printer.ip_address) {
        setErr('Please fill in the printer name, serial number, and IP address.');
        return;
      }
      setSaving(true);
      try {
        await api.post('/api/printers', {
          name:         printer.name,
          model:        printer.model,
          serial:       printer.serial.trim(),
          ip_address:   printer.ip_address.trim(),
          access_code:  printer.access_code.trim(),
          connection_type: printer.connection_type,
          has_ams:      printer.has_ams ? 1 : 0,
          ams_count:    printer.has_ams ? parseInt(printer.ams_count) : 0,
          is_active:    1,
        });
      } catch (e) {
        setErr(e.response?.data?.error || 'Could not register printer. You can add it later from the Printers page.');
      }
      setSaving(false);
    }

    if (current.id === 'done') {
      // Mark onboarding complete
      try { await settingsApi.set('onboarding_complete', true); } catch {}
      onComplete();
      navigate('/', { replace: true });
      return;
    }

    setStep(s => s + 1);
  }

  function back() {
    setErr('');
    setStep(s => Math.max(0, s - 1));
  }

  const PRINTER_MODELS = [
    'Bambu Lab X1 Carbon', 'Bambu Lab X1E', 'Bambu Lab P1S', 'Bambu Lab P1P',
    'Bambu Lab A1', 'Bambu Lab A1 Mini', 'Bambu Lab H2C', 'Bambu Lab H2D',
    'Prusa MK4', 'Prusa MK3.9', 'Prusa XL', 'Prusa Mini+',
    'Creality Ender 3 V3', 'Creality K1', 'Creality K1 Max',
    'Voron 2.4', 'Voron Trident', 'Voron 0.2',
    'Anycubic Kobra 2 Pro', 'Elegoo Neptune 4 Pro',
    'Other FDM Printer', 'Other Resin Printer',
  ];

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gradient-bg)', overflow: 'hidden', position: 'relative' }}>
      <div className="drag-region" style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 44 }} />
      <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle,rgba(0,113,227,0.09) 0%,transparent 65%)', top: -200, left: -200, pointerEvents: 'none' }} />

      <div className="card fade-in" style={{ width: 520, maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>

        {/* Progress bar */}
        <div style={{ height: 3, background: 'var(--border)', flexShrink: 0 }}>
          <div style={{ height: '100%', background: 'var(--accent)', width: `${((step + 1) / STEPS.length) * 100}%`, transition: 'width 0.3s ease', borderRadius: 2 }} />
        </div>

        {/* Step indicator */}
        <div style={{ padding: '20px 32px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {STEPS.map((s, i) => (
              <div key={s.id} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? 'var(--accent)' : 'var(--border)', transition: 'background 0.2s' }} />
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Step {step + 1} of {STEPS.length}</div>
          <h2 style={{ fontSize: 20, marginBottom: 4 }}>{current.title}</h2>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 32px' }}>

          {/* Welcome */}
          {current.id === 'welcome' && (
            <div>
              <div style={{ width: 64, height: 64, borderRadius: 18, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                <img src="/icon.png" alt="" style={{ width: 52, height: 52, borderRadius: 14 }} onError={e => e.target.style.display = 'none'} />
              </div>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 20 }}>
                PrintFlow is your complete 3D print business management suite. This quick setup will configure your business details, tax settings, and your first printer so you can get started right away.
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                This takes about 2 minutes. You can change any of these settings later in the Settings page.
              </p>
              <div style={{ marginTop: 20, padding: '14px 16px', background: 'var(--bg-hover)', borderRadius: 8, border: '0.5px solid var(--border)' }}>
                {[
                  'Business info — used on quotes and invoices',
                  'Tax configuration — HST rate and registration number',
                  'First printer — connect your printer to the live dashboard',
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--green)', flexShrink: 0 }}>✓</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Company */}
          {current.id === 'company' && (
            <div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>
                This information appears on your quotes and invoices. All fields can be updated later.
              </p>
              <div className="form-row">
                <div className="form-group">
                  <label className="label">Business Name</label>
                  <input className="input" {...FC('name')} placeholder="Alliston 3D Prints" autoFocus />
                </div>
                <div className="form-group">
                  <label className="label">Business Email</label>
                  <input className="input" type="email" {...FC('email')} placeholder="hello@yourbusiness.com" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="label">Phone</label>
                  <input className="input" {...FC('phone')} placeholder="(705) 555-0100" />
                </div>
                <div className="form-group">
                  <label className="label">Website</label>
                  <input className="input" {...FC('website')} placeholder="https://yourbusiness.com" />
                </div>
              </div>
              <div className="form-group">
                <label className="label">Street Address</label>
                <input className="input" {...FC('address')} placeholder="123 Main St" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="label">City</label>
                  <input className="input" {...FC('city')} placeholder="Alliston" />
                </div>
                <div className="form-group">
                  <label className="label">Province</label>
                  <select className="select" {...FC('province')}>
                    {PROVINCES.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Postal Code</label>
                  <input className="input" {...FC('postal')} placeholder="L9R 0A1" style={{ fontFamily: 'monospace' }} />
                </div>
              </div>
            </div>
          )}

          {/* Tax */}
          {current.id === 'tax' && (
            <div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>
                Configure how tax is calculated on your orders. This can be changed any time in Settings → Company Configuration.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, padding: '14px 16px', background: 'var(--bg-hover)', borderRadius: 8, border: '0.5px solid var(--border)' }}>
                <input type="checkbox" id="hst_en" checked={!!company.enable_hst}
                  onChange={e => setCompany(c => ({ ...c, enable_hst: e.target.checked }))}
                  style={{ width: 16, height: 16 }} />
                <div>
                  <label htmlFor="hst_en" style={{ fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Enable sales tax on orders</label>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                    Recommended for Canadian businesses registered for HST/GST
                  </div>
                </div>
              </div>

              {company.enable_hst && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="label">Tax Rate (%)</label>
                      <input className="input" type="number" step="0.1" min="0" max="30"
                        value={company.hst_rate}
                        onChange={e => setCompany(c => ({ ...c, hst_rate: parseFloat(e.target.value) || 0 }))} />
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 3 }}>Ontario HST = 13% · Federal GST only = 5%</div>
                    </div>
                    <div className="form-group">
                      <label className="label">Registration Number</label>
                      <input className="input" {...FC('hst_number')} placeholder="123456789 RT0001" style={{ fontFamily: 'monospace' }} />
                    </div>
                  </div>
                  <div style={{ padding: '10px 14px', background: 'var(--accent-light)', borderRadius: 8, fontSize: 12, color: 'var(--accent)', border: '0.5px solid rgba(0,113,227,0.2)' }}>
                    Tax will be recorded at {company.hst_rate}% on all paid orders and shown on invoices.
                  </div>
                </>
              )}

              {!company.enable_hst && (
                <div style={{ padding: '10px 14px', background: 'var(--bg-hover)', borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)', border: '0.5px solid var(--border)' }}>
                  No tax will be added to orders or invoices. You can enable this later if your business registers for HST/GST.
                </div>
              )}
            </div>
          )}

          {/* Printer */}
          {current.id === 'printer' && (
            <div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
                Connect your first printer to enable the live dashboard. You can add more printers later from the Printers page.
              </p>

              {!skipPrinter ? (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="label">Printer Name</label>
                      <input className="input" {...FP('name')} placeholder="e.g. Workshop P1S" autoFocus />
                    </div>
                    <div className="form-group">
                      <label className="label">Model</label>
                      <select className="select" {...FP('model')}>
                        {PRINTER_MODELS.map(m => <option key={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="label">Connection Type</label>
                    <select className="select" value={printer.connection_type}
                      onChange={e => setPrinter(p => ({ ...p, connection_type: e.target.value }))}>
                      <option value="bambu_lan">Bambu Lab — LAN Mode (recommended)</option>
                      <option value="bambu_cloud">Bambu Lab — Cloud Mode</option>
                      <option value="octoprint">OctoPrint</option>
                      <option value="klipper">Klipper / Moonraker</option>
                      <option value="generic">Generic (IP Camera only)</option>
                    </select>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="label">Serial Number</label>
                      <input className="input" {...FP('serial')} placeholder="e.g. 01P00C591102103" style={{ fontFamily: 'monospace' }} />
                    </div>
                    <div className="form-group">
                      <label className="label">IP Address</label>
                      <input className="input" {...FP('ip_address')} placeholder="e.g. 10.0.0.43" style={{ fontFamily: 'monospace' }} />
                    </div>
                  </div>

                  {(printer.connection_type === 'bambu_lan') && (
                    <div className="form-group">
                      <label className="label">LAN Access Code</label>
                      <input className="input" {...FP('access_code')} placeholder="8-character code" style={{ fontFamily: 'monospace' }} />
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 3 }}>
                        Found on the printer screen: Settings → Network → LAN Mode Access Code
                      </div>
                    </div>
                  )}

                  {(printer.connection_type === 'octoprint' || printer.connection_type === 'klipper') && (
                    <div className="form-group">
                      <label className="label">API Key</label>
                      <input className="input" {...FP('access_code')} placeholder="OctoPrint/Moonraker API key" style={{ fontFamily: 'monospace' }} />
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, marginBottom: 4 }}>
                    <input type="checkbox" id="has_ams" checked={printer.has_ams}
                      onChange={e => setPrinter(p => ({ ...p, has_ams: e.target.checked }))}
                      style={{ width: 15, height: 15 }} />
                    <label htmlFor="has_ams" style={{ fontSize: 13, cursor: 'pointer' }}>This printer has an AMS / multi-material system</label>
                  </div>
                  {printer.has_ams && (
                    <div className="form-group" style={{ marginLeft: 23 }}>
                      <label className="label">Number of AMS units</label>
                      <select className="select" style={{ width: 80 }} value={printer.ams_count}
                        onChange={e => setPrinter(p => ({ ...p, ams_count: parseInt(e.target.value) }))}>
                        {[1, 2, 3, 4].map(n => <option key={n}>{n}</option>)}
                      </select>
                    </div>
                  )}

                  <button className="btn btn-ghost btn-sm" style={{ marginTop: 16, color: 'var(--text-tertiary)', fontSize: 12 }}
                    onClick={() => setSkipPrinter(true)}>
                    Skip for now — I'll add printers later
                  </button>
                </>
              ) : (
                <div style={{ padding: '20px', background: 'var(--bg-hover)', borderRadius: 8, border: '0.5px solid var(--border)', textAlign: 'center' }}>
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.7 }}>
                    No problem. You can add printers any time from the <strong>Printers</strong> page in the sidebar.
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => setSkipPrinter(false)}>
                    Add a printer now
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Done */}
          {current.id === 'done' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(48,209,88,0.15)', border: '1.5px solid rgba(48,209,88,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28 }}>
                ✓
              </div>
              <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>PrintFlow is ready</p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 24 }}>
                Your business details and printer are configured. Head to the Dashboard to see your business at a glance, or go to Orders to start tracking your first order.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left' }}>
                {[
                  ['Dashboard', 'Overview of revenue, active orders, and printer status'],
                  ['Orders', 'Create your first order or import historical orders'],
                  ['Help & Support', 'Full user guide and troubleshooting reference'],
                ].map(([page, desc]) => (
                  <div key={page} style={{ display: 'flex', gap: 12, padding: '10px 14px', background: 'var(--bg-hover)', borderRadius: 8, alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{page}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {err && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 12, lineHeight: 1.5 }}>{err}</div>}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 32px 24px', borderTop: '0.5px solid var(--border)', flexShrink: 0, display: 'flex', gap: 10 }}>
          {step > 0 && !isLast && (
            <button className="btn btn-secondary" onClick={back} style={{ minWidth: 90, justifyContent: 'center' }}>
              Back
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={next}
            disabled={saving}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            {saving ? 'Saving…' : isLast ? 'Go to Dashboard' : current.id === 'welcome' ? 'Get Started' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
