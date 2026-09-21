import React, { useState, useMemo } from 'react';
import {
  Download, Search, Filter, CheckCircle2,
  Clock, XCircle, IndianRupee, Percent,
  Zap, CreditCard, ArrowUpRight,
} from 'lucide-react';
import { MOCK_TRANSACTIONS } from '../data/mockData';
import type { PaymentStatus, PaymentType, ToastMessage } from '../types';
import './RevenuePage.css';

interface RevenuePageProps {
  onToast: (msg: Omit<ToastMessage, 'id'>) => void;
}

const STATUS_BADGE: Record<PaymentStatus, string> = {
  SUCCESS: 'badge badge-success',
  PENDING: 'badge badge-warning',
  FAILED: 'badge badge-danger',
};
const STATUS_ICON: Record<PaymentStatus, React.ReactNode> = {
  SUCCESS: <CheckCircle2 size={12} />,
  PENDING: <Clock size={12} />,
  FAILED: <XCircle size={12} />,
};
const TYPE_BADGE: Record<PaymentType, string> = {
  PRO_TIER_UPGRADE: 'badge badge-chartreuse',
  SETTLEMENT_FEE: 'badge badge-olive',
  REFUND: 'badge badge-danger',
};

const SUMMARY_CARDS = [
  { label: 'Total Gross Volume', value: '₹3,159', sub: '166 transactions', icon: <IndianRupee size={20} />, color: '#2E331B', bg: '#E5EC68' },
  { label: 'Net Platform Fees', value: '₹2,850', sub: 'After refunds & fees', icon: <CreditCard size={20} />, color: '#059669', bg: '#ECFDF5' },
  { label: 'Gateway Success Rate', value: '99.4%', sub: '158 / 159 processed', icon: <Percent size={20} />, color: '#2563EB', bg: '#EFF6FF' },
  { label: 'Avg Settlement Time', value: '2.4s', sub: 'Razorpay UPI median', icon: <Zap size={20} />, color: '#D97706', bg: '#FFFBEB' },
];

const RevenuePage: React.FC<RevenuePageProps> = ({ onToast }) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const filtered = useMemo(() => MOCK_TRANSACTIONS.filter((t) => {
    const q = search.toLowerCase();
    const matchQ = !q
      || t.transactionId.toLowerCase().includes(q)
      || t.userName.toLowerCase().includes(q)
      || t.tripDestination.toLowerCase().includes(q);
    const matchType = typeFilter === 'All' || t.type === typeFilter;
    const matchStatus = statusFilter === 'All' || t.status === statusFilter;
    return matchQ && matchType && matchStatus;
  }), [search, typeFilter, statusFilter]);

  const totalRevenue = filtered.filter(t => t.status === 'SUCCESS').reduce((acc, t) => acc + t.amount, 0);

  return (
    <div className="revenue-page">
      <div className="page-header">
        <div>
          <h1 className="page-header-title">Revenue & Payments</h1>
          <p className="page-header-subtitle">Platform transaction ledger and financial overview</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => onToast({ message: 'CSV export initiated', type: 'success' })}>
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        {SUMMARY_CARDS.map((c) => (
          <div key={c.label} className="card revenue-summary-card">
            <div className="revenue-summary-top">
              <div className="kpi-icon-wrap" style={{ background: c.bg, color: c.color }}>{c.icon}</div>
              <ArrowUpRight size={16} style={{ color: 'var(--color-emerald)' }} />
            </div>
            <div className="kpi-value">{c.value}</div>
            <div className="kpi-label">{c.label}</div>
            <div className="kpi-sub">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-wrapper" style={{ flex: 1, maxWidth: 320 }}>
          <Search size={14} className="search-icon" />
          <input className="input" style={{ paddingLeft: 34 }} placeholder="Search by ID, user, or destination…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Filter size={14} style={{ color: '#A39E8E' }} />
          <select className="input select" style={{ width: 180 }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="All">All Types</option>
            <option value="PRO_TIER_UPGRADE">Pro Tier Upgrade</option>
            <option value="SETTLEMENT_FEE">Settlement Fee</option>
            <option value="REFUND">Refund</option>
          </select>
        </div>
        <select className="input select" style={{ width: 160 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="All">All Status</option>
          <option value="SUCCESS">Success</option>
          <option value="PENDING">Pending</option>
          <option value="FAILED">Failed</option>
        </select>
        {filtered.length > 0 && (
          <span style={{ fontSize: 'var(--text-xs)', color: '#7C7461', fontWeight: 600 }}>
            ₹{totalRevenue.toLocaleString('en-IN')} filtered
          </span>
        )}
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>User / Payer</th>
                <th>Trip Destination</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx) => (
                <tr key={tx.id}>
                  <td>
                    <span className="tx-id">{tx.transactionId}</span>
                    {tx.utrReference && (
                      <div className="tx-utr">UTR: {tx.utrReference}</div>
                    )}
                  </td>
                  <td>
                    <div className="tx-user">
                      <span className="tx-user-name">{tx.userName}</span>
                      <span className="tx-user-email">{tx.userEmail}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 'var(--text-sm)', color: '#7C7461' }}>{tx.tripDestination}</td>
                  <td>
                    <span className={TYPE_BADGE[tx.type]}>
                      {tx.type.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td>
                    <span className="tx-amount" style={{ color: tx.type === 'REFUND' ? 'var(--color-rose)' : 'var(--accent-olive-dark)' }}>
                      {tx.type === 'REFUND' ? '-' : ''}₹{tx.amount}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-olive">{tx.paymentMethod}</span>
                  </td>
                  <td>
                    <span className={STATUS_BADGE[tx.status]}>
                      {STATUS_ICON[tx.status]}
                      {tx.status}
                    </span>
                  </td>
                  <td style={{ fontSize: 'var(--text-xs)', color: '#A39E8E' }}>
                    {new Date(tx.timestamp).toLocaleString('en-IN', {
                      day: '2-digit', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-footer-bar">
          <span>{filtered.length} transactions</span>
          <span className="table-total-label">
            Filtered Total: <strong>₹{totalRevenue}</strong>
          </span>
        </div>
      </div>
    </div>
  );
};

export default RevenuePage;
