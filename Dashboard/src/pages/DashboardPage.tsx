import React, { useEffect, useMemo, useState } from 'react';
import { Map, Users, TrendingUp, IndianRupee, ArrowUpRight, CheckCircle2, Plane, UserPlus, Zap } from 'lucide-react';
import { getDashboard, type DashboardData } from '../api';
import './DashboardPage.css';

const emptyData: DashboardData = { kpis: { activeTrips: 0, registeredTravelers: 0, revenue: 0, settlements: 0 }, monthlyTrips: [], monthlyRevenue: [], settlements: [], tiers: [], activity: [] };
const format = (value: number) => value.toLocaleString('en-IN');
const icons = [<Map size={20} />, <Users size={20} />, <CheckCircle2 size={20} />, <IndianRupee size={20} />];
const colors = [['#2E331B', '#E5EC68'], ['#059669', '#ECFDF5'], ['#2563EB', '#EFF6FF'], ['#D97706', '#FFFBEB']];
const activityIcons: Record<string, React.ReactNode> = { trip_created: <Plane size={14} />, member_joined: <UserPlus size={14} />, expense_settled: <CheckCircle2 size={14} />, pro_upgrade: <Zap size={14} />, invite_sent: <UserPlus size={14} /> };

const BarChart: React.FC<{ data: { label: string; value: number; secondary?: number }[]; color: string; secondaryColor?: string }> = ({ data, color, secondaryColor }) => {
  const max = Math.max(...data.map((item) => item.value), 1);
  return <div className="mini-chart"><div className="chart-bars-wrap" style={{ height: 140 }}>{data.map((item) => <div key={item.label} className="chart-col"><div className="chart-bar-group">{item.secondary !== undefined && secondaryColor && <div className="chart-bar" style={{ height: `${item.secondary / max * 100}%`, background: secondaryColor, width: 8 }} /> }<div className="chart-bar" style={{ height: `${item.value / max * 100}%`, background: color, width: 14 }} /></div><span className="chart-label">{item.label}</span></div>)}</div>{!data.length && <div className="empty-chart">No data available yet</div>}</div>;
};

const DashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { getDashboard().then(setData).catch((err) => setError(err instanceof Error ? err.message : 'Unable to load analytics')).finally(() => setLoading(false)); }, []);
  const kpis = useMemo(() => [
    ['Active Trips', format(data.kpis.activeTrips), 'Live database count'],
    ['Registered Travelers', format(data.kpis.registeredTravelers), 'Live database count'],
    ['Settlement Events', format(data.kpis.settlements), 'Live database count'],
    ['Platform Revenue', `₹${format(data.kpis.revenue)}`, 'Successful payments'],
  ], [data]);
  if (loading) return <div className="page-loading">Loading live analytics...</div>;
  return <div className="dashboard-page">
    <div className="page-header"><div><h1 className="page-header-title">Platform Overview</h1><p className="page-header-subtitle">Live analytics from your connected Postgres database</p></div><span className="badge badge-success"><span className="pulse-dot" /> Live data</span></div>
    {error && <div className="data-error">{error}</div>}
    <div className="kpi-grid">{kpis.map(([label, value, sub], index) => <div key={label} className="kpi-card card"><div className="kpi-top"><div className="kpi-icon-wrap" style={{ background: colors[index][1], color: colors[index][0] }}>{icons[index]}</div><ArrowUpRight size={15} style={{ color: 'var(--color-emerald)' }} /></div><div className="kpi-value">{value}</div><div className="kpi-sub">{sub}</div><div className="kpi-label">{label}</div></div>)}</div>
    <div className="charts-row"><div className="card chart-card"><div className="chart-card-header"><h3 className="section-title">Monthly Trip Creation</h3></div><BarChart data={data.monthlyTrips} color="var(--accent-olive)" secondaryColor="var(--accent-chartreuse)" /></div><div className="card chart-card"><div className="chart-card-header"><h3 className="section-title">Revenue</h3></div><BarChart data={data.monthlyRevenue} color="var(--color-emerald)" /></div><div className="card chart-card"><div className="chart-card-header"><h3 className="section-title">Settlement Events</h3></div><BarChart data={data.settlements} color="var(--color-blue)" /></div></div>
    <div className="bottom-row"><div className="card tier-card"><div className="chart-card-header"><h3 className="section-title">Member Tier Distribution</h3></div>{data.tiers.length ? <div className="tier-rows">{data.tiers.map((tier) => <div key={tier.label} className="tier-row"><div className="tier-row-label"><span className="badge badge-olive">{tier.label}</span></div><div className="tier-bar-wrap"><div className="tier-bar"><div className="tier-bar-fill" style={{ width: `${tier.percentage}%`, background: 'var(--accent-olive)' }} /></div><span className="tier-count">{format(tier.count)}</span></div></div>)}</div> : <div className="empty-state"><div className="empty-state-title">No tier data available</div></div>}</div><div className="card activity-card"><div className="chart-card-header"><h3 className="section-title">Recent Activity</h3></div>{data.activity.length ? <div className="activity-list">{data.activity.map((item) => <div key={item.id} className="activity-item"><div className="activity-avatar" style={{ color: item.userColor }}>{item.userAvatar}</div><div className="activity-content"><div className="activity-title">{activityIcons[item.type]} {item.title}</div><p className="activity-desc">{item.description}</p><span className="activity-time">{item.timestamp}</span></div></div>)}</div> : <div className="empty-state"><div className="empty-state-title">No activity available</div></div>}</div></div>
  </div>;
};

export default DashboardPage;