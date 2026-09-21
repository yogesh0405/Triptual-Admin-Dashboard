import React, { useState, useMemo, useCallback } from 'react';
import {
  Search, Filter, Download, UserCheck, UserX,
  KeyRound, X, ChevronDown, Mail, Phone,
  BadgeCheck, Clock, ShieldOff, Eye,
  MapPin, Wallet, TrendingUp,
} from 'lucide-react';
import { MOCK_USERS } from '../data/mockData';
import type { MockUser, UserRole, UserStatus, ToastMessage } from '../types';
import './UsersPage.css';

interface UsersPageProps {
  onToast: (msg: Omit<ToastMessage, 'id'>) => void;
}

const ROLE_BADGE: Record<UserRole, string> = {
  VIP: 'badge badge-chartreuse',
  Organizer: 'badge badge-purple',
  Traveler: 'badge badge-olive',
};

const STATUS_BADGE: Record<UserStatus, string> = {
  Active: 'badge badge-success',
  Pending: 'badge badge-warning',
  Suspended: 'badge badge-danger',
};

const STATUS_ICON: Record<UserStatus, React.ReactNode> = {
  Active: <UserCheck size={12} />,
  Pending: <Clock size={12} />,
  Suspended: <ShieldOff size={12} />,
};

const UsersPage: React.FC<UsersPageProps> = ({ onToast }) => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedUser, setSelectedUser] = useState<MockUser | null>(null);
  const [users, setUsers] = useState<MockUser[]>(MOCK_USERS);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const q = search.toLowerCase();
      const matchQ = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.phone.includes(q);
      const matchRole = roleFilter === 'All' || u.role === roleFilter;
      const matchStatus = statusFilter === 'All' || u.status === statusFilter;
      return matchQ && matchRole && matchStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const handleToggleStatus = useCallback((user: MockUser) => {
    const newStatus: UserStatus = user.status === 'Active' ? 'Suspended' : 'Active';
    setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, status: newStatus } : u));
    setSelectedUser((prev) => prev?.id === user.id ? { ...prev, status: newStatus } : prev);
    onToast({
      message: `${user.name} marked as ${newStatus}`,
      type: newStatus === 'Active' ? 'success' : 'warning',
    });
  }, [onToast]);

  const handleResetPassword = useCallback((user: MockUser) => {
    onToast({ message: `Password reset email sent to ${user.email}`, type: 'success' });
  }, [onToast]);

  return (
    <div className="users-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header-title">User Management</h1>
          <p className="page-header-subtitle">{users.length} registered travelers & organizers</p>
        </div>
        <button className="btn btn-secondary btn-sm">
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-wrapper" style={{ flex: 1, maxWidth: 340 }}>
          <Search size={14} className="search-icon" />
          <input
            className="input select"
            style={{ appearance: 'none', backgroundImage: 'none' }}
            placeholder="Search by name, email or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
          <Filter size={14} style={{ color: '#A39E8E' }} />
          <select className="input select" style={{ width: 160 }} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option>All</option>
            <option>Organizer</option>
            <option>Traveler</option>
            <option>VIP</option>
          </select>
        </div>

        <select className="input select" style={{ width: 160 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option>All</option>
          <option>Active</option>
          <option>Pending</option>
          <option>Suspended</option>
        </select>

        <span className="users-count-badge">
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Traveler</th>
                <th>Contact</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Trips</th>
                <th>Spend</th>
                <th>Last Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="empty-state">
                      <Search size={32} className="empty-state-icon" />
                      <div className="empty-state-title">No users match your filters</div>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="user-cell">
                        <div
                          className="avatar avatar-md"
                          style={{ background: user.avatarColor + '22', color: user.avatarColor }}
                        >
                          {user.avatarInitials}
                        </div>
                        <div>
                          <div className="user-name">
                            {user.name}
                            {user.isVerified && (
                              <BadgeCheck size={13} style={{ color: 'var(--color-blue)', marginLeft: 4 }} />
                            )}
                          </div>
                          <div className="user-style">{user.travelStyle ?? '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="contact-cell">
                        <span><Mail size={12} /> {user.email}</span>
                        <span><Phone size={12} /> {user.phone}</span>
                      </div>
                    </td>
                    <td><span className={ROLE_BADGE[user.role]}>{user.role}</span></td>
                    <td>
                      <span className={STATUS_BADGE[user.status]}>
                        {STATUS_ICON[user.status]}
                        {user.status}
                      </span>
                    </td>
                    <td style={{ color: '#7C7461', fontSize: 'var(--text-xs)' }}>
                      {new Date(user.joinedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ fontWeight: 600 }}>{user.tripsCount}</td>
                    <td style={{ fontWeight: 600, color: 'var(--color-emerald)' }}>
                      ₹{user.totalSpend.toLocaleString('en-IN')}
                    </td>
                    <td style={{ color: '#A39E8E', fontSize: 'var(--text-xs)' }}>{user.lastActive}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedUser(user)}
                          style={{ gap: 4 }}
                        >
                          <Eye size={13} />
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Profile Drawer */}
      {selectedUser && (
        <>
          <div className="drawer-overlay" onClick={() => setSelectedUser(null)} />
          <aside className="drawer">
            <div className="drawer-header">
              <span className="drawer-title">Traveler Profile</span>
              <button className="btn-icon" onClick={() => setSelectedUser(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="drawer-body">
              {/* Avatar + Name */}
              <div className="drawer-profile-hero">
                <div
                  className="avatar avatar-lg"
                  style={{
                    background: selectedUser.avatarColor + '22',
                    color: selectedUser.avatarColor,
                    width: 64, height: 64,
                    fontSize: 'var(--text-xl)',
                    borderRadius: 'var(--radius-lg)',
                  }}
                >
                  {selectedUser.avatarInitials}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-xl)', fontWeight: 600 }}>
                      {selectedUser.name}
                    </h2>
                    {selectedUser.isVerified && <BadgeCheck size={18} style={{ color: 'var(--color-blue)' }} />}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <span className={ROLE_BADGE[selectedUser.role]}>{selectedUser.role}</span>
                    <span className={STATUS_BADGE[selectedUser.status]}>
                      {STATUS_ICON[selectedUser.status]}
                      {selectedUser.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="divider" />

              {/* Info Grid */}
              <div className="drawer-info-grid">
                {[
                  { icon: <Mail size={14} />, label: 'Email', val: selectedUser.email },
                  { icon: <Phone size={14} />, label: 'Phone', val: selectedUser.phone },
                  { icon: <Wallet size={14} />, label: 'UPI ID', val: selectedUser.upiId ?? 'Not set' },
                  { icon: <MapPin size={14} />, label: 'Travel Style', val: selectedUser.travelStyle ?? '—' },
                  { icon: <TrendingUp size={14} />, label: 'Total Spend', val: `₹${selectedUser.totalSpend.toLocaleString('en-IN')}` },
                  { icon: <Clock size={14} />, label: 'Last Active', val: selectedUser.lastActive },
                ].map((row) => (
                  <div key={row.label} className="drawer-info-row">
                    <span className="drawer-info-icon">{row.icon}</span>
                    <div>
                      <div className="drawer-info-label">{row.label}</div>
                      <div className="drawer-info-val">{row.val}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="divider" />

              {/* Stats */}
              <div className="drawer-stats">
                <div className="drawer-stat">
                  <span className="drawer-stat-val">{selectedUser.tripsCount}</span>
                  <span className="drawer-stat-label">Trips Organized</span>
                </div>
                <div className="drawer-stat">
                  <span className="drawer-stat-val">₹{selectedUser.totalSpend.toLocaleString('en-IN')}</span>
                  <span className="drawer-stat-label">Total Platform Spend</span>
                </div>
              </div>

              <div className="divider" />

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  className={`btn ${selectedUser.status === 'Active' ? 'btn-danger' : 'btn-secondary'}`}
                  onClick={() => handleToggleStatus(selectedUser)}
                >
                  {selectedUser.status === 'Active' ? <UserX size={15} /> : <UserCheck size={15} />}
                  {selectedUser.status === 'Active' ? 'Suspend Account' : 'Reactivate Account'}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleResetPassword(selectedUser)}
                >
                  <KeyRound size={15} /> Send Password Reset
                </button>
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  );
};

export default UsersPage;
