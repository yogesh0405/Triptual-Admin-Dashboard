import React, { useState, useCallback } from 'react';
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

let toastCounter = 0;

const App: React.FC = () => {
  const [activePage, setActivePage] = useState<AdminPage>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

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

  return (
    <div className="app-shell">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
      />

      <main
        className="main-content"
        style={{ marginLeft: 0 }}
      >
        <TopHeader
          activePage={activePage}
          onShowNotifications={() => setActivePage('notifications')}
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
