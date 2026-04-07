import React, { useState } from 'react';

const SECTIONS = [
  {
    title: 'License Grant',
    body: 'Subject to your compliance with this Agreement, PrintFlow grants you a limited, non-exclusive, non-transferable license to install and use PrintFlow for your personal or internal business operations.',
  },
  {
    title: 'Restrictions',
    body: 'You may not redistribute, sublicense, sell, or transfer PrintFlow to any third party without prior written consent. You may not reverse engineer, decompile, or disassemble the software except as permitted by applicable law. You may not remove proprietary notices or use PrintFlow in any manner that could damage or impair the software or servers.',
  },
  {
    title: 'Ownership',
    body: 'PrintFlow and all copies thereof are proprietary to the developer and title thereto remains with the developer. All rights not specifically granted in this Agreement are reserved.',
  },
  {
    title: 'Data & Privacy',
    body: 'PrintFlow operates on your local network and stores all business data on your own server. No business data is transmitted to any external servers operated by the developer. Anonymized crash reports and usage telemetry may be collected if you opt in, and you may opt out at any time in Settings.',
  },
  {
    title: 'Disclaimer of Warranties',
    body: 'PrintFlow is provided "as is" without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose, and non-infringement. The developer does not warrant that PrintFlow will be error-free or that defects will be corrected.',
  },
  {
    title: 'Limitation of Liability',
    body: 'In no event shall the developer be liable for any indirect, incidental, special, exemplary, or consequential damages arising out of or in connection with this Agreement or your use of PrintFlow, even if advised of the possibility of such damages. The developer\'s total liability shall not exceed the amount paid by you for PrintFlow in the twelve months preceding the claim.',
  },
  {
    title: 'Termination',
    body: 'This Agreement is effective until terminated. Your rights under this Agreement will terminate automatically if you fail to comply with any of its terms. Upon termination, you must destroy all copies of PrintFlow in your possession.',
  },
  {
    title: 'Governing Law',
    body: 'This Agreement shall be governed by and construed in accordance with the laws of the Province of Ontario, Canada, without regard to its conflict of law provisions.',
  },
  {
    title: 'Entire Agreement',
    body: 'This Agreement constitutes the entire agreement between you and the developer with respect to PrintFlow and supersedes all prior or contemporaneous communications, representations, and agreements.',
  },
];

export default function EulaPage({ onAccept }) {
  const [scrolled, setScrolled] = useState(false);

  function handleScroll(e) {
    const el = e.target;
    if (el.scrollHeight - el.scrollTop <= el.clientHeight + 40) {
      setScrolled(true);
    }
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--gradient-bg)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div className="drag-region" style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 44 }} />
      <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle,rgba(0,113,227,0.08) 0%,transparent 65%)', top: -200, left: -200, pointerEvents: 'none' }} />

      <div className="card fade-in" style={{ width: 580, maxHeight: '88vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '24px 32px 18px', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px var(--accent-glow)' }}>
              <img src="/icon.png" alt="" style={{ width: 32, height: 32, borderRadius: 8 }}
                onError={e => e.target.style.display = 'none'} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>PrintFlow</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Software License Agreement · Last Updated April 2026</div>
            </div>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
            Please read this agreement carefully. By using PrintFlow you agree to be bound by these terms.
            Scroll to the bottom to enable the Accept button.
          </p>
        </div>

        {/* EULA body — readable prose */}
        <div onScroll={handleScroll} style={{ flex: 1, overflowY: 'auto', padding: '20px 32px 24px' }}>

          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 20 }}>
            This Software License Agreement ("Agreement") is a legal agreement between you ("User") and the developer of PrintFlow ("Developer"). By installing, copying, or using PrintFlow, you agree to be bound by the terms of this Agreement.
          </p>

          {SECTIONS.map((s, i) => (
            <div key={i} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                {i + 1}. {s.title}
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8, margin: 0 }}>
                {s.body}
              </p>
            </div>
          ))}

          <div style={{ marginTop: 24, padding: '14px 16px', background: 'var(--accent-light)', borderRadius: 8, border: '0.5px solid rgba(0,113,227,0.25)' }}>
            <p style={{ fontSize: 13, color: 'var(--accent)', lineHeight: 1.7, margin: 0, fontWeight: 500 }}>
              By clicking "Accept & Continue", you acknowledge that you have read, understood, and agree to be bound by this Agreement.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 32px 24px', borderTop: '0.5px solid var(--border)', flexShrink: 0 }}>
          {!scrolled && (
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 12, textAlign: 'center' }}>
              Scroll to the bottom to enable the Accept button
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn btn-secondary"
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={() => window.printflow?.closeWindow?.()}
            >
              Decline & Quit
            </button>
            <button
              className="btn btn-primary"
              style={{ flex: 2, justifyContent: 'center', opacity: scrolled ? 1 : 0.35, cursor: scrolled ? 'pointer' : 'not-allowed', transition: 'opacity 0.2s' }}
              disabled={!scrolled}
              onClick={onAccept}
            >
              Accept & Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
