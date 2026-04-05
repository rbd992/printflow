// Stub pages — Phase 1 scaffolding
// Each will be fully implemented in Phase 2 & 3

import React from 'react';

function ComingSoon({ title, icon, description }) {
  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 24 }}>
      <div className="fade-in" style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <h1>{title}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>{description}</p>
        </div>
        <div className="card" style={{ padding: 64, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>
          <h3 style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>
            Coming in Phase 2
          </h3>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 13, marginTop: 8 }}>
            Full implementation with real-time data sync
          </p>
        </div>
      </div>
    </div>
  );
}

export function FilamentPage() {
  return <ComingSoon title="Filament Inventory" icon="🧵" description="Track all your spools, AMS tray mapping, and auto-reorder rules" />;
}

export function PartsPage() {
  return <ComingSoon title="Parts & Supplies" icon="🔧" description="Maintenance part tracking and printer service schedules" />;
}

export function OrdersPage() {
  return <ComingSoon title="Orders" icon="📦" description="Full order lifecycle from new through delivered" />;
}

export function PrintersPage() {
  return <ComingSoon title="Printers" icon="🖨️" description="Live Bambu Lab status — print progress, AMS trays, temperatures" />;
}

export function VendorsPage() {
  return <ComingSoon title="Vendors" icon="🛒" description="Browse vendors and configure auto-reorder rules" />;
}

export function FinancePage() {
  return <ComingSoon title="Revenue & Expenses" icon="💰" description="Full transaction ledger with platform and category breakdowns" />;
}

export function TaxPage() {
  return <ComingSoon title="Tax Manager" icon="🧾" description="Ontario HST/GST tracking, ITC credits, and CRA filing summaries" />;
}

export function MarketingPage() {
  return <ComingSoon title="Marketing" icon="📣" description="Campaign tracking, Etsy listing performance, and conversion metrics" />;
}

export function UsersPage() {
  return <ComingSoon title="Users" icon="👥" description="Manage team accounts and role assignments" />;
}

export function SettingsPage({ onThemeChange }) {
  return <ComingSoon title="Settings" icon="⚙️" description="Server connection, integrations, and account settings" />;
}

export default { FilamentPage, PartsPage, OrdersPage, PrintersPage, VendorsPage, FinancePage, TaxPage, MarketingPage, UsersPage, SettingsPage };
