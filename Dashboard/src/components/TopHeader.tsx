import React from 'react';
import { Search, Bell, ChevronRight, Zap, LogOut } from 'lucide-react';
import type { AdminPage } from '../types';
import './TopHeader.css';

interface TopHeaderProps {
  activePage: AdminPage;
  onShowNotifications?: () => void;
  onLogout?: () => void;
}

const PAGE_LABELS: Record<AdminPage, string> = {
  dashboard: 'Dashboard & Analytics',
  users: 'User Management',
  'tour-packages': 'Tour Packages',
  hotels: 'Hotel Tie-ups',
  revenue: 'Revenue & Payments',
  notifications: 'Broadcast Notifications',
};

const TopHeader: React.FC<TopHeaderProps> = ({ activePage, onLogout }) => {
  const [searchValue, setSearchValue] = React.useState('');

  return (
    <header className="top-header">
      {/* Breadcrumb */}
      <div className="header-breadcrumb">
        <span className="breadcrumb-root">Admin</span>
        <ChevronRight size={14} className="breadcrumb-sep" />
        <span className="breadcrumb-current">{PAGE_LABELS[activePage]}</span>
      </div>

      {/* Right section */}
      <div className="header-right">
        {/* System Status */}
        <div className="system-status">
          <span className="pulse-dot" />
          <span className="system-status-label">All systems operational</span>
        </div>

        {/* Search */}
        <div className="header-search">
          <Search size={14} className="header-search-icon" />
          <input
            type="text"
            className="header-search-input"
            placeholder="Quick search…"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
        </div>

        {/* Quick Action */}
        <button className="btn btn-primary btn-sm header-action-btn">
          <Zap size={13} />
          Quick Action
        </button>

        {/* Notifications */}
        <button className="header-notif-btn btn-icon" aria-label="Notifications">
          <Bell size={17} />
          <span className="header-notif-dot" />
        </button>
        <button className="btn-icon" aria-label="Sign out" title="Sign out" onClick={onLogout}>
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
};

export default TopHeader;
