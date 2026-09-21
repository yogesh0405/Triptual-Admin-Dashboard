import React from 'react';
import {
  LayoutDashboard, Users, Compass, Building2, CreditCard,
  BellRing, ChevronLeft, ChevronRight, LogOut, MapPin, Shield,
} from 'lucide-react';
import type { AdminPage } from '../types';
import './Sidebar.css';

interface SidebarProps {
  activePage: AdminPage;
  onNavigate: (page: AdminPage) => void;
  collapsed: boolean;
  onToggle: () => void;
  userCount?: number;
}

interface NavItem {
  id: AdminPage;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Core Operations',
    items: [
      { id: 'dashboard', label: 'Dashboard & Analytics', icon: <LayoutDashboard size={18} /> },
      { id: 'users', label: 'User Management', icon: <Users size={18} /> },
    ],
  },
  {
    title: 'Inventory & Logistics',
    items: [
      { id: 'tour-packages', label: 'Tour Packages', icon: <Compass size={18} />, badge: '6' },
      { id: 'hotels', label: 'Hotel Tie-ups', icon: <Building2 size={18} /> },
    ],
  },
  {
    title: 'Finance & Comms',
    items: [
      { id: 'revenue', label: 'Revenue & Payments', icon: <CreditCard size={18} /> },
      { id: 'notifications', label: 'Broadcast Notifications', icon: <BellRing size={18} /> },
    ],
  },
];

const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate, collapsed, onToggle, userCount }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard & Analytics', icon: <LayoutDashboard size={18} /> },
    { id: 'users', label: 'User Management', icon: <Users size={18} />, badge: userCount !== undefined ? String(userCount) : undefined },
  ];

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">
            <MapPin size={16} strokeWidth={2.5} />
          </div>
          {!collapsed && (
            <div className="sidebar-brand-text">
              <span className="sidebar-brand-name">Triptual</span>
              <span className="sidebar-brand-sub">Admin Console</span>
            </div>
          )}
        </div>
        <button className="sidebar-toggle btn-ghost" onClick={onToggle} aria-label="Toggle sidebar">
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {NAV_SECTIONS.map((section) => {
          const items = section.title === 'Core Operations' ? navItems : section.items;
          return (
            <div key={section.title} className="sidebar-section">
              {!collapsed && <span className="sidebar-section-title">{section.title}</span>}
              <ul className="sidebar-nav-list">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      className={`sidebar-nav-item ${activePage === item.id ? 'sidebar-nav-item--active' : ''}`}
                      onClick={() => onNavigate(item.id)}
                      title={collapsed ? item.label : undefined}
                    >
                      <span className="sidebar-nav-icon">{item.icon}</span>
                      {!collapsed && (
                        <>
                          <span className="sidebar-nav-label">{item.label}</span>
                          {item.badge && (
                            <span className="sidebar-nav-badge">{item.badge}</span>
                          )}
                        </>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Footer Admin Profile */}
      <div className="sidebar-footer">
        <div className={`sidebar-profile ${collapsed ? 'sidebar-profile--collapsed' : ''}`}>
          <div className="sidebar-avatar">
            <Shield size={16} strokeWidth={2} />
          </div>
          {!collapsed && (
            <div className="sidebar-profile-info">
              <span className="sidebar-profile-name">System Admin</span>
              <span className="sidebar-profile-role">Super Administrator</span>
            </div>
          )}
          {!collapsed && (
            <button className="btn-icon sidebar-logout" aria-label="Logout">
              <LogOut size={15} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
