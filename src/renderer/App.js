import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { initApi } from './api/client';
import './index.css';

import SetupPage     from './pages/SetupPage';
import LoginPage     from './pages/LoginPage';
import AppShell      from './pages/AppShell';
import Dashboard     from './pages/Dashboard';
import FilamentPage  from './pages/FilamentPage';
import PartsPage     from './pages/PartsPage';
import OrdersPage    from './pages/OrdersPage';
import PrintersPage  from './pages/PrintersPage';
import VendorsPage   from './pages/VendorsPage';
import ShippingPage  from './pages/ShippingPage';
import FinancePage   from './pages/FinancePage';
import TaxPage       from './pages/TaxPage';
import MarketingPage from './pages/MarketingPage';
import UsersPage     from './pages/UsersPage';
import SettingsPage  from './pages/SettingsPage';
import ModelsPage    from './pages/ModelsPage';
import DesignPage    from './pages/DesignPage';
import ChangelogPage    from './pages/ChangelogPage';
import JobQueuePage     from './pages/JobQueuePage';
import CustomersPage    from './pages/CustomersPage';
import QuotePage        from './pages/QuotePage';
import PrintHistoryPage from './pages/PrintHistoryPage';

function AuthGuard({ children, roles }) {
  const { token, user } = useAuthStore();
  if (!token || !user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function LoadingScreen() {
  return (
    <div style={{ height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--gradient-bg)',flexDirection:'column',gap:16 }}>
      <div style={{ width:56,height:56,borderRadius:16,background:'var(--accent)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 8px 32px var(--accent-glow)' }}>
        <img src="/icon.png" alt="" style={{ width:48,height:48,borderRadius:12 }} onError={e=>e.target.style.display='none'} />
      </div>
      <div style={{ fontSize:13,color:'var(--text-tertiary)' }}>Loading PrintFlow…</div>
    </div>
  );
}

export default function App() {
  const { isLoading, token, serverUrl, init } = useAuthStore();
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    async function bootstrap() {
      const savedTheme = await window.printflow.getTheme();
      const t = savedTheme || 'dark';
      setTheme(t);
      document.documentElement.setAttribute('data-theme', t);
      await initApi();
      await init();
    }
    bootstrap();
  }, []);

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);

  if (isLoading) return <LoadingScreen />;
  const needsSetup = !serverUrl;

  return (
    <HashRouter>
      <Routes>
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/login" element={needsSetup ? <Navigate to="/setup" replace /> : <LoginPage />} />

        <Route path="/" element={
          needsSetup ? <Navigate to="/setup" replace />
            : !token ? <Navigate to="/login" replace />
            : <AppShell theme={theme} onThemeChange={setTheme} />
        }>
          <Route index element={<Dashboard />} />
          <Route path="filament"  element={<FilamentPage />} />
          <Route path="parts"     element={<PartsPage />} />
          <Route path="orders"    element={<OrdersPage />} />
          <Route path="queue"     element={<JobQueuePage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="history"   element={<PrintHistoryPage />} />
          <Route path="quotes"    element={<AuthGuard roles={['owner','manager']}><QuotePage /></AuthGuard>} />
          <Route path="printers"  element={<PrintersPage />} />
          <Route path="vendors"   element={<VendorsPage />} />
          <Route path="shipping"  element={<AuthGuard roles={['owner','manager']}><ShippingPage /></AuthGuard>} />
          <Route path="models"    element={<ModelsPage />} />
          <Route path="design"    element={<DesignPage />} />
          <Route path="finance"   element={<AuthGuard roles={['owner','manager']}><FinancePage /></AuthGuard>} />
          <Route path="tax"       element={<AuthGuard roles={['owner']}><TaxPage /></AuthGuard>} />
          <Route path="marketing" element={<AuthGuard roles={['owner','manager']}><MarketingPage /></AuthGuard>} />
          <Route path="users"     element={<AuthGuard roles={['owner']}><UsersPage /></AuthGuard>} />
          <Route path="changelog" element={<ChangelogPage />} />
          <Route path="settings"  element={<SettingsPage onThemeChange={setTheme} />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
