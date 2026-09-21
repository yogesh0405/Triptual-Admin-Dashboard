import React, { useState, useCallback, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import Toast from './components/Toast';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import TourPackagesPage from './pages/TourPackagesPage';
import HotelsPage from './pages/HotelsPage';
import RevenuePage from './pages/RevenuePage';
import NotificationsPage from './pages/NotificationsPage';
import type { AdminPage, ToastMessage } from './types';
import './App.css';
import LoginPage from './pages/LoginPage';
import { getUsers, logout, refresh } from './api';

let toastCounter = 0;

const App: React.FC = () => {
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [activePage, setActivePage] = useState<AdminPage>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userCount, setUserCount] = useState<number | undefined>(undefined);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    refresh()
      .then((valid) => {
        if (!valid) {
          setAdminEmail(null);
          return;
        }

        setAdminEmail('admin');
        getUsers()
          .then((result) => setUserCount(result.total))
          .catch(() => setUserCount(0));
      })
      .finally(() => setAuthChecking(false));
  }, []);

  const showToast = useCallback((msg: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${++toastCounter}`;
    setToasts((prev) => [...prev.slice(-3), { id, ...msg }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <DashboardPage />;
      case 'users': return <UsersPage onToast={showToast} />;
      case 'tour-packages': return <TourPackagesPage onToast={showToast} />;
      case 'hotels': return <HotelsPage onToast={showToast} />;
      case 'revenue': return <RevenuePage onToast={showToast} />;
      case 'notifications': return <NotificationsPage onToast={showToast} />;
      default: return null;
    }
  };

  if (authChecking) return <div className="auth-loading">Checking secure session...</div>;
  if (!adminEmail) return <LoginPage onLogin={setAdminEmail} />;

  return (
    <div className="app-shell">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
        userCount={userCount}
      />

      <main
        className="main-content"
        style={{ marginLeft: 0 }}
      >
        <TopHeader
          activePage={activePage}
          onShowNotifications={() => setActivePage('notifications')}
          onLogout={async () => { await logout(); setAdminEmail(null); }}
        />
        <div className="page-body">
          {renderPage()}
        </div>
      </main>

      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default App;
