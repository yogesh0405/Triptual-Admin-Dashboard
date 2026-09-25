import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search, ChevronRight, X, LayoutDashboard, Users,
  Compass, Building2, CreditCard, BellRing, ArrowUpRight,
  LifeBuoy, MessageSquare
} from 'lucide-react';
import type { AdminPage } from '../types';
import './TopHeader.css';

interface TopHeaderProps {
  activePage: AdminPage;
  onNavigate?: (page: AdminPage) => void;
  onShowNotifications?: () => void;
}

const PAGE_LABELS: Record<AdminPage, string> = {
  dashboard: 'Dashboard & Analytics',
  users: 'User Management',
  'user-tickets': 'User Tickets & Support Desk',
  'tour-packages': 'Tour Packages',
  hotels: 'Hotel Tie-ups',
  revenue: 'Revenue & Payments',
  notifications: 'Broadcast Notifications',
};

interface SearchItem {
  id: string;
  title: string;
  category: 'Pages' | 'Actions';
  page: AdminPage;
  description: string;
  keywords: string[];
  icon: React.ReactNode;
}

const SEARCH_ITEMS: SearchItem[] = [
  {
    id: 'page-dashboard',
    title: 'Dashboard & Analytics',
    category: 'Pages',
    page: 'dashboard',
    description: 'Overview KPIs, activity velocity, revenue metrics and platform stats',
    keywords: ['dashboard', 'analytics', 'kpi', 'metrics', 'stats', 'growth', 'overview'],
    icon: <LayoutDashboard size={15} />,
  },
  {
    id: 'page-users',
    title: 'User Management',
    category: 'Pages',
    page: 'users',
    description: 'Registered travelers, trip organizers, verification status & moderation',
    keywords: ['users', 'travelers', 'organizers', 'vip', 'accounts', 'export', 'csv'],
    icon: <Users size={15} />,
  },
  {
    id: 'page-packages',
    title: 'Tour Packages Catalog',
    category: 'Pages',
    page: 'tour-packages',
    description: 'Expeditions, hotel packages, itineraries, media uploads & pricing',
    keywords: ['packages', 'tours', 'expeditions', 'trips', 'itinerary', 'add package', 's3 image'],
    icon: <Compass size={15} />,
  },
  {
    id: 'page-hotels',
    title: 'Hotel Tie-ups',
    category: 'Pages',
    page: 'hotels',
    description: 'Partner properties, hotel tie-ups, commission splits and inventory',
    keywords: ['hotels', 'partners', 'resorts', 'stays', 'villas', 'tie-ups'],
    icon: <Building2 size={15} />,
  },
  {
    id: 'page-revenue',
    title: 'Revenue & Payments',
    category: 'Pages',
    page: 'revenue',
    description: 'Transaction logs, payout settlements, gross platform volume & commission',
    keywords: ['revenue', 'payments', 'transactions', 'finance', 'settlements', 'upi'],
    icon: <CreditCard size={15} />,
  },
  {
    id: 'page-user-tickets',
    title: 'User Tickets & Live Chat',
    category: 'Pages',
    page: 'user-tickets',
    description: 'Traveler support tickets, live socket chat, issue resolution & docs',
    keywords: ['tickets', 'support', 'help', 'chat', 'user tickets', 'concierge', 'socket', 'issues', 'messages'],
    icon: <LifeBuoy size={15} />,
  },
  {
    id: 'page-notifications',
    title: 'Broadcast Notifications',
    category: 'Pages',
    page: 'notifications',
    description: 'Compose FCM push notifications, email blasts and in-app alerts',
    keywords: ['broadcast', 'notifications', 'fcm', 'push', 'alert', 'compose', 'history'],
    icon: <BellRing size={15} />,
  },
  {
    id: 'action-view-tickets',
    title: 'Open User Tickets Desk',
    category: 'Actions',
    page: 'user-tickets',
    description: 'Jump to tickets desk to reply to pending traveler inquiries',
    keywords: ['tickets', 'reply', 'chat', 'support', 'inquiry'],
    icon: <MessageSquare size={15} />,
  },
  {
    id: 'action-add-package',
    title: 'Add New Tour Package',
    category: 'Actions',
    page: 'tour-packages',
    description: 'Open tour packages catalog to upload package media and details',
    keywords: ['add', 'create', 'new', 'package', 'upload', 'image'],
    icon: <ArrowUpRight size={15} />,
  },
  {
    id: 'action-export-users',
    title: 'Export Travelers CSV',
    category: 'Actions',
    page: 'users',
    description: 'Jump to user management table to export traveler data',
    keywords: ['export', 'csv', 'download', 'travelers', 'users list'],
    icon: <ArrowUpRight size={15} />,
  },
  {
    id: 'action-compose-broadcast',
    title: 'Dispatch Broadcast Alert',
    category: 'Actions',
    page: 'notifications',
    description: 'Launch FCM push notification composer to reach travelers',
    keywords: ['send', 'fcm', 'push', 'broadcast', 'notification'],
    icon: <ArrowUpRight size={15} />,
  },
];

const TopHeader: React.FC<TopHeaderProps> = ({ activePage, onNavigate }) => {
  const [searchValue, setSearchValue] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredItems = useMemo(() => {
    const q = searchValue.trim().toLowerCase();
    if (!q) return [];
    return SEARCH_ITEMS.filter((item) => {
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.keywords.some((k) => k.toLowerCase().includes(q))
      );
    });
  }, [searchValue]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset highlight index when results change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredItems]);

  const handleSelectItem = (item: SearchItem) => {
    if (onNavigate) {
      onNavigate(item.page);
    }
    setSearchValue('');
    setIsSearchOpen(false);
    searchInputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isSearchOpen || filteredItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[highlightedIndex]) {
        handleSelectItem(filteredItems[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsSearchOpen(false);
      searchInputRef.current?.blur();
    }
  };

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

        {/* Working Quick Search */}
        <div className="header-search" ref={searchContainerRef}>
          <Search size={14} className="header-search-icon" />
          <input
            ref={searchInputRef}
            type="text"
            className="header-search-input"
            placeholder="Quick search… (e.g. users, tickets, broadcast)"
            value={searchValue}
            onChange={(e) => {
              setSearchValue(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => {
              if (searchValue.trim()) setIsSearchOpen(true);
            }}
            onKeyDown={handleKeyDown}
          />
          {searchValue && (
            <button
              type="button"
              className="header-search-clear"
              onClick={() => {
                setSearchValue('');
                setIsSearchOpen(false);
                searchInputRef.current?.focus();
              }}
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}

          {/* Search Dropdown Results */}
          {isSearchOpen && searchValue.trim() && (
            <div className="header-search-dropdown">
              <div className="search-dropdown-header">
                <span>Search results ({filteredItems.length})</span>
                <span className="search-keyboard-hint">Use ↑↓ to navigate, Enter to select</span>
              </div>
              {filteredItems.length === 0 ? (
                <div className="search-dropdown-empty">
                  No matches found for "{searchValue}"
                </div>
              ) : (
                <ul className="search-results-list">
                  {filteredItems.map((item, idx) => (
                    <li
                      key={item.id}
                      className={`search-result-item ${idx === highlightedIndex ? 'search-result-item--active' : ''}`}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      onClick={() => handleSelectItem(item)}
                    >
                      <div className="search-result-icon">
                        {item.icon}
                      </div>
                      <div className="search-result-info">
                        <div className="search-result-title-row">
                          <span className="search-result-title">{item.title}</span>
                          <span className="search-result-category">{item.category}</span>
                        </div>
                        <p className="search-result-desc">{item.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopHeader;
