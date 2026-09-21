import React, { useMemo } from 'react';
import {
  Map, Users, TrendingUp, IndianRupee,
  ArrowUpRight, ArrowDownRight, CreditCard, CheckCircle2,
  Plane, UserPlus, BadgeCheck, Zap,
} from 'lucide-react';
import {
  MONTHLY_TRIPS_DATA, REVENUE_MONTHLY, SETTLEMENT_DATA, ACTIVITY_FEED,
} from '../data/mockData';
import './DashboardPage.css';

interface KPICardProps {
  label: string;
  value: string;
  sub?: string;
  trend: number;
  trendLabel: string;
  icon: React.ReactNode;
  accentColor: string;
  bgColor: string;
}

const KPICard: React.FC<KPICardProps> = ({
  label, value, sub, trend, trendLabel, icon, accentColor, bgColor,
}) => {
  const isUp = trend >= 0;
  return (
    <div className="kpi-card card">
      <div className="kpi-top">
        <div className="kpi-icon-wrap" style={{ background: bgColor, color: accentColor }}>
          {icon}
        </div>
        <div className={`kpi-trend ${isUp ? 'trend-up' : 'trend-down'}`}>
          {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          <span>{Math.abs(trend)}%</span>
        </div>
      </div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
      <div className="kpi-label">{label}</div>
      <div className="kpi-trend-label">{trendLabel}</div>
    </div>
  );
};

/* ── Mini Bar Chart ── */
const BarChart: React.FC<{
  data: { label: string; value: number; secondary?: number }[];
  color: string;
  secondaryColor?: string;
  height?: number;
  label?: string;
  secondaryLabel?: string;
}> = ({ data, color, secondaryColor, height = 120, label, secondaryLabel }) => {
  const maxVal = useMemo(() => Math.max(...data.map((d) => d.value)), [data]);

  return (
    <div className="mini-chart">
      {(label || secondaryLabel) && (
        <div className="chart-legend">
          {label && <span className="chart-legend-item"><span className="chart-legend-dot" style={{ background: color }} />{label}</span>}
          {secondaryLabel && secondaryColor && <span className="chart-legend-item"><span className="chart-legend-dot" style={{ background: secondaryColor }} />{secondaryLabel}</span>}
        </div>
      )}
      <div className="chart-bars-wrap" style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className="chart-col">
            <div className="chart-bar-group">
              {d.secondary !== undefined && secondaryColor && (
                <div
                  className="chart-bar"
                  style={{
                    height: `${(d.secondary / maxVal) * 100}%`,
                    background: secondaryColor,
                    width: '8px',
                    borderRadius: '3px 3px 0 0',
                  }}
                  title={`${d.label}: ${d.secondary}`}
                />
              )}
              <div
                className="chart-bar"
                style={{
                  height: `${(d.value / maxVal) * 100}%`,
                  background: color,
                  width: '14px',
                  borderRadius: '3px 3px 0 0',
                }}
                title={`${d.label}: ${d.value}`}
              />
            </div>
            <span className="chart-label">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── Activity Feed ── */
const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  trip_created: <Plane size={14} />,
  member_joined: <UserPlus size={14} />,
  expense_settled: <CheckCircle2 size={14} />,
  pro_upgrade: <Zap size={14} />,
  invite_sent: <UserPlus size={14} />,
};

const DashboardPage: React.FC = () => {
  const kpis = [
    {
      label: 'Active Trips',
      value: '1,847',
      sub: '341 created this month',
      trend: 18.6,
      trendLabel: 'vs last month',
      icon: <Map size={20} />,
      accentColor: '#2E331B',
      bgColor: '#E5EC68',
    },
    {
      label: 'Registered Travelers',
      value: '18,420',
      sub: '+2,341 this month',
      trend: 14.2,
      trendLabel: 'vs last month',
      icon: <Users size={20} />,
      accentColor: '#059669',
      bgColor: '#ECFDF5',
    },
    {
      label: 'Ledgers Settled',
      value: '6,892',
      sub: 'Total settlement events',
      trend: 22.1,
      trendLabel: 'vs last month',
      icon: <CheckCircle2 size={20} />,
      accentColor: '#2563EB',
      bgColor: '#EFF6FF',
    },
    {
      label: 'Platform Revenue',
      value: '₹1,786',
      sub: '94 Pro upgrades @ ₹19',
      trend: 19.0,
      trendLabel: 'vs last month',
      icon: <IndianRupee size={20} />,
      accentColor: '#D97706',
      bgColor: '#FFFBEB',
    },
  ];

  return (
    <div className="dashboard-page">
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-header-title">Platform Overview</h1>
          <p className="page-header-subtitle">Real-time analytics and operational metrics for Triptual</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm">
            <CreditCard size={14} />
            Export Report
          </button>
          <button className="btn btn-primary btn-sm">
            <TrendingUp size={14} />
            Live View
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        {kpis.map((k) => (
          <KPICard key={k.label} {...k} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="charts-row">
        <div className="card chart-card">
          <div className="chart-card-header">
            <h3 className="section-title" style={{ margin: 0 }}>Monthly Trip Creation</h3>
            <span className="badge badge-success">+18.6%</span>
          </div>
          <BarChart
            data={MONTHLY_TRIPS_DATA}
            color="var(--accent-olive)"
            secondaryColor="var(--accent-chartreuse)"
            height={140}
            label="Total Trips"
            secondaryLabel="Pro Upgrades"
          />
        </div>

        <div className="card chart-card">
          <div className="chart-card-header">
            <h3 className="section-title" style={{ margin: 0 }}>Revenue (₹)</h3>
            <span className="badge badge-chartreuse">₹1,786 MTD</span>
          </div>
          <BarChart
            data={REVENUE_MONTHLY}
            color="var(--color-emerald)"
            height={140}
            label="Platform Revenue"
          />
        </div>

        <div className="card chart-card">
          <div className="chart-card-header">
            <h3 className="section-title" style={{ margin: 0 }}>Settlement Events</h3>
            <span className="badge badge-info">6,892 Total</span>
          </div>
          <BarChart
            data={SETTLEMENT_DATA}
            color="var(--color-blue)"
            height={140}
            label="Settlements Recorded"
          />
        </div>
      </div>

      {/* Tier Breakdown + Activity Feed */}
      <div className="bottom-row">
        {/* Tier Breakdown */}
        <div className="card tier-card">
          <div className="chart-card-header" style={{ marginBottom: 20 }}>
            <h3 className="section-title" style={{ margin: 0 }}>Member Tier Distribution</h3>
          </div>
          <div className="tier-rows">
            <div className="tier-row">
              <div className="tier-row-label">
                <span className="badge badge-olive">FREE</span>
                <span className="tier-desc">Up to 6 members</span>
              </div>
              <div className="tier-bar-wrap">
                <div className="tier-bar" style={{ width: '78%', background: 'var(--bg-surface-subtle)', borderColor: 'var(--border-card)' }}>
                  <div className="tier-bar-fill" style={{ width: '78%', background: 'var(--accent-olive)' }} />
                </div>
                <span className="tier-count">14,367</span>
              </div>
            </div>
            <div className="tier-row">
              <div className="tier-row-label">
                <span className="badge badge-chartreuse">PRO</span>
                <span className="tier-desc">Unlimited members</span>
              </div>
              <div className="tier-bar-wrap">
                <div className="tier-bar" style={{ width: '22%' }}>
                  <div className="tier-bar-fill" style={{ width: '100%', background: 'var(--accent-chartreuse-dim)' }} />
                </div>
                <span className="tier-count">4,053</span>
              </div>
            </div>
          </div>

          {/* Platform Stats */}
          <div className="platform-stats">
            {[
              { label: 'Avg Trip Duration', value: '6.4 days' },
              { label: 'Avg Group Size', value: '8.2 members' },
              { label: 'UPI Settlement Rate', value: '94.1%' },
              { label: 'Gateway Success', value: '99.4%' },
            ].map((s) => (
              <div key={s.label} className="platform-stat">
                <span className="platform-stat-value">{s.value}</span>
                <span className="platform-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="card activity-card">
          <div className="chart-card-header" style={{ marginBottom: 0, padding: '20px 20px 0' }}>
            <h3 className="section-title" style={{ margin: 0 }}>Recent Activity</h3>
            <span className="badge badge-success">Live</span>
          </div>
          <div className="activity-list">
            {ACTIVITY_FEED.map((item) => (
              <div key={item.id} className="activity-item">
                <div className="activity-avatar" style={{ background: item.userColor + '22', color: item.userColor }}>
                  {item.userAvatar}
                </div>
                <div className="activity-content">
                  <div className="activity-header-row">
                    <span className="activity-type-icon" style={{ color: item.userColor }}>
                      {ACTIVITY_ICONS[item.type]}
                    </span>
                    <span className="activity-title">{item.title}</span>
                    {item.amount && (
                      <span className="activity-amount">
                        ₹{item.amount.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                  <p className="activity-desc">{item.description}</p>
                  <span className="activity-time">{item.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
