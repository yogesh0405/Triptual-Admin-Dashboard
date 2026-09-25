import React, { useState, useMemo, useEffect } from 'react';
import {
  Download, Search, Filter, CheckCircle2,
  Clock, XCircle, IndianRupee,
  Zap, CreditCard, ArrowUpRight,
} from 'lucide-react';
import { getDashboard } from '../api';
import type { MockTransaction, PaymentStatus, PaymentType, ToastMessage } from '../types';
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

const formatCurrency = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`;

function toTransaction(transaction: {
  transactionId: string | null;
  userId: string | null;
  userName: string;
  userEmail: string;
  userAvatar: string | null;
  groupId: string | null;
  amount: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
}): MockTransaction {
  const normalizedStatus = transaction.status.toUpperCase();
  return {
    id: transaction.transactionId || `${transaction.createdAt}-${transaction.amount}`,
    transactionId: transaction.transactionId || 'Unassigned',
    userName: transaction.userName,
    userEmail: transaction.userEmail,
    userAvatar: transaction.userAvatar,
    tripDestination: transaction.groupId || 'Group upgrade',
    type: 'PRO_TIER_UPGRADE',
    amount: transaction.amount,
    paymentMethod: transaction.paymentMethod as MockTransaction['paymentMethod'],
    status: (['SUCCESS', 'PENDING', 'FAILED'].includes(normalizedStatus) ? normalizedStatus : 'PENDING') as PaymentStatus,
    timestamp: transaction.createdAt,
    groupId: transaction.groupId || undefined,
  };
}

const resolveAvatarUrl = (avatar: string | null) => {
  if (!avatar) return null;
  const cleaned = avatar.trim();
  if (!cleaned) return null;
  if (cleaned.startsWith('http://') || cleaned.startsWith('https://') || cleaned.startsWith('/')) return cleaned;

  const fileName = cleaned.split(/[\\/]/).pop() ?? cleaned;
  const noExt = fileName.includes('.') ? fileName.slice(0, fileName.lastIndexOf('.')) : fileName;
  const imageName = noExt.startsWith('ill_') ? noExt : `ill_${noExt}`;
  return `/illustrations/${imageName}.jpg`;
};

const RevenuePage: React.FC<RevenuePageProps> = ({ onToast }) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [transactions, setTransactions] = useState<MockTransaction[]>([]);
  const [summary, setSummary] = useState({ grossRevenue: 0, refunds: 0, netRevenue: 0, totalTransactions: 0, successfulTransactions: 0, successRate: 0, averageTransactionValue: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getDashboard()
      .then((data) => {
        setTransactions(data.revenue.transactions.map(toTransaction));
        setSummary(data.revenue.summary);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load payment transactions'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => transactions.filter((t) => {
    const q = search.toLowerCase();
    const matchQ = !q
      || t.transactionId.toLowerCase().includes(q)
      || t.userName.toLowerCase().includes(q)
      || t.tripDestination.toLowerCase().includes(q);
    const matchType = typeFilter === 'All' || t.type === typeFilter;
    const matchStatus = statusFilter === 'All' || t.status === statusFilter;
    return matchQ && matchType && matchStatus;
  }), [transactions, search, typeFilter, statusFilter]);

  const totalRevenue = filtered.filter(t => t.status === 'SUCCESS').reduce((acc, t) => acc + t.amount, 0);

  const exportCsv = () => {
    const headers = ['Transaction ID', 'User ID', 'Group ID', 'Amount', 'Method', 'Status', 'Timestamp'];
    const rows = filtered.map((tx) => [tx.transactionId, tx.userName, tx.groupId || '', tx.amount, tx.paymentMethod, tx.status, tx.timestamp]);
    const csv = [headers, ...rows].map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `triptual-revenue-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    onToast({ message: `${filtered.length} live transactions exported`, type: 'success' });
  };

  const summaryCards = [
    { label: 'Total Gross Volume', value: formatCurrency(summary.grossRevenue), sub: `${summary.totalTransactions} transactions`, icon: <IndianRupee size={20} />, color: '#2E331B', bg: '#E5EC68' },
    { label: 'Net Platform Revenue', value: formatCurrency(summary.netRevenue), sub: `${formatCurrency(summary.refunds)} refunds`, icon: <CreditCard size={20} />, color: '#059669', bg: '#ECFDF5' },
    { label: 'Average Transaction', value: formatCurrency(summary.averageTransactionValue), sub: 'Successful payments only', icon: <Zap size={20} />, color: '#D97706', bg: '#FFFBEB' },
  ];

  return (
    <div className="revenue-page">
      <div className="page-header">
        <div>
          <h1 className="page-header-title">Revenue & Payments</h1>
          <p className="page-header-subtitle">Platform transaction ledger and financial overview</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={exportCsv} disabled={loading || filtered.length === 0}>
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="kpi-grid revenue-kpi-grid">
        {summaryCards.map((c) => (
          <div key={c.label} className="card revenue-summary-card">
            <div className="revenue-summary-top">
              <ArrowUpRight size={16} style={{ color: 'var(--color-emerald)' }} />
            </div>
            <div className="revenue-metric">
              <div className="kpi-icon-wrap" style={{ background: c.bg, color: c.color }}>{c.icon}</div>
              <div className="kpi-value">{c.value}</div>
            </div>
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
              {loading && <tr><td colSpan={8}>Loading live payment transactions...</td></tr>}
              {!loading && error && <tr><td colSpan={8}>{error}</td></tr>}
              {!loading && !error && filtered.length === 0 && <tr><td colSpan={8}>No payment transactions match the selected filters.</td></tr>}
              {!loading && !error && filtered.map((tx) => (
                <tr key={tx.id}>
                  <td>
                    <span className="tx-id">{tx.transactionId}</span>
                    {tx.utrReference && (
                      <div className="tx-utr">UTR: {tx.utrReference}</div>
                    )}
                  </td>
                  <td>
                    <div className="tx-user">
                      <div className="tx-user-heading">
                        {resolveAvatarUrl(tx.userAvatar ?? null) ? <img className="tx-user-avatar" src={resolveAvatarUrl(tx.userAvatar ?? null) ?? undefined} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : <span className="tx-user-avatar tx-user-avatar-fallback">{tx.userName.slice(0, 2).toUpperCase()}</span>}
                        <span className="tx-user-name">{tx.userName}</span>
                      </div>
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
