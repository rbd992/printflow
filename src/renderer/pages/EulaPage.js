import React, { useState } from 'react';

const EULA_TEXT = `PRINTFLOW SOFTWARE LICENSE AGREEMENT

Last Updated: April 2026

PLEASE READ THIS LICENSE AGREEMENT CAREFULLY BEFORE USING PRINTFLOW. BY CLICKING "ACCEPT" OR BY INSTALLING, COPYING, OR OTHERWISE USING THE SOFTWARE, YOU AGREE TO BE BOUND BY THE TERMS OF THIS AGREEMENT.

1. LICENSE GRANT
Subject to your compliance with this Agreement, PrintFlow grants you a limited, non-exclusive, non-transferable license to install and use PrintFlow for your personal or internal business operations.

2. RESTRICTIONS
You may not:
(a) Redistribute, sublicense, sell, or otherwise transfer PrintFlow or any rights therein to any third party without prior written consent.
(b) Reverse engineer, decompile, disassemble, or attempt to derive the source code of PrintFlow, except to the extent permitted by applicable law.
(c) Remove or alter any proprietary notices, labels, or marks on PrintFlow.
(d) Use PrintFlow in any manner that could damage, disable, overburden, or impair the software or servers.

3. OWNERSHIP
PrintFlow and all copies thereof are proprietary to the developer and title thereto remains with the developer. All rights in PrintFlow not specifically granted in this Agreement are reserved to the developer.

4. DATA AND PRIVACY
PrintFlow operates on your local network and stores all business data on your own server. No business data is transmitted to any external servers operated by the developer. Anonymized crash reports and usage telemetry may be collected if you opt in. You may opt out at any time in Settings.

5. DISCLAIMER OF WARRANTIES
PRINTFLOW IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. THE DEVELOPER DOES NOT WARRANT THAT PRINTFLOW WILL BE ERROR-FREE OR THAT DEFECTS WILL BE CORRECTED.

6. LIMITATION OF LIABILITY
IN NO EVENT SHALL THE DEVELOPER BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES ARISING OUT OF OR IN CONNECTION WITH THIS AGREEMENT OR YOUR USE OF PRINTFLOW, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. THE DEVELOPER'S TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT PAID BY YOU FOR PRINTFLOW IN THE TWELVE MONTHS PRECEDING THE CLAIM.

7. TERMINATION
This Agreement is effective until terminated. Your rights under this Agreement will terminate automatically if you fail to comply with any of its terms. Upon termination, you must destroy all copies of PrintFlow in your possession.

8. GOVERNING LAW
This Agreement shall be governed by and construed in accordance with the laws of the Province of Ontario, Canada, without regard to its conflict of law provisions.

9. ENTIRE AGREEMENT
This Agreement constitutes the entire agreement between you and the developer with respect to PrintFlow and supersedes all prior or contemporaneous communications, representations, and agreements.

By clicking "Accept", you acknowledge that you have read, understood, and agree to be bound by this Agreement.`;

export default function EulaPage({ onAccept }) {
  const [scrolled, setScrolled] = useState(false);

  function handleScroll(e) {
    const el = e.target;
    const atBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 40;
    if (atBottom) setScrolled(true);
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

      {/* Ambient glow */}
      <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle,rgba(0,113,227,0.08) 0%,transparent 65%)', top: -200, left: -200, pointerEvents: 'none' }} />

      <div className="card fade-in" style={{ width: 560, maxHeight: '88vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '28px 32px 20px', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <img src="/icon.png" alt="" style={{ width: 32, height: 32, borderRadius: 8 }}
                onError={e => e.target.style.display = 'none'} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>PrintFlow</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Software License Agreement</div>
            </div>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Please read the following agreement carefully before using PrintFlow. Scroll to the bottom to accept.
          </p>
        </div>

        {/* EULA text */}
        <div onScroll={handleScroll} style={{ flex: 1, overflowY: 'auto', padding: '20px 32px', fontFamily: 'monospace', fontSize: 11, lineHeight: 1.8, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', background: 'var(--bg-hover)' }}>
          {EULA_TEXT}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 32px 24px', borderTop: '0.5px solid var(--border)', flexShrink: 0 }}>
          {!scrolled && (
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 12, textAlign: 'center' }}>
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
              style={{ flex: 2, justifyContent: 'center', opacity: scrolled ? 1 : 0.4, cursor: scrolled ? 'pointer' : 'not-allowed' }}
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
