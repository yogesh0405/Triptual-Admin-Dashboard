import React, { useState, useMemo } from 'react';
import {
  Building2, Plus, Search, Phone, Mail,
  Star, Users, FileText, Send, X,
  CheckCircle2, Clock, XCircle,
} from 'lucide-react';
import { MOCK_HOTELS } from '../data/mockData';
import type { MockHotelPartner, ContractStatus, ToastMessage } from '../types';
import './HotelsPage.css';

interface HotelsPageProps {
  onToast: (msg: Omit<ToastMessage, 'id'>) => void;
}

const CONTRACT_BADGE: Record<ContractStatus, string> = {
  ACTIVE: 'badge badge-success',
  IN_REVIEW: 'badge badge-warning',
  EXPIRED: 'badge badge-danger',
};
const CONTRACT_ICON: Record<ContractStatus, React.ReactNode> = {
  ACTIVE: <CheckCircle2 size={12} />,
  IN_REVIEW: <Clock size={12} />,
  EXPIRED: <XCircle size={12} />,
};

const CATEGORY_COLORS: Record<string, string> = {
  '5-Star Resort': 'badge badge-chartreuse',
  'Heritage Palace': 'badge badge-purple',
  'Eco-Lodge': 'badge badge-success',
  'Heritage Villa': 'badge badge-olive',
  'Boutique Hostel': 'badge badge-info',
};

const HotelsPage: React.FC<HotelsPageProps> = ({ onToast }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({ name: '', city: '', category: '', commission: '', contact: '', email: '' });

  const filtered = useMemo(() => MOCK_HOTELS.filter((h) => {
    const q = search.toLowerCase();
    const matchQ = !q || h.name.toLowerCase().includes(q) || h.city.toLowerCase().includes(q);
    const matchS = statusFilter === 'All' || h.contractStatus === statusFilter;
    return matchQ && matchS;
  }), [search, statusFilter]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setShowAddModal(false);
    setForm({ name: '', city: '', category: '', commission: '', contact: '', email: '' });
    onToast({ message: `Hotel partner "${form.name}" added for review`, type: 'success' });
  };

  return (
    <div className="hotels-page">
      <div className="page-header">
        <div>
          <h1 className="page-header-title">Hotel Tie-ups</h1>
          <p className="page-header-subtitle">Partner accommodation network — {MOCK_HOTELS.length} partners</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={15} /> Add Hotel Partner
        </button>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-wrapper" style={{ flex: 1, maxWidth: 300 }}>
          <Search size={14} className="search-icon" />
          <input className="input" style={{ paddingLeft: 34 }} placeholder="Search hotels…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {['All', 'ACTIVE', 'IN_REVIEW', 'EXPIRED'].map((s) => (
          <button key={s} className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setStatusFilter(s)}>
            {s === 'All' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Hotel / Resort</th>
                <th>Location</th>
                <th>Category</th>
                <th>Stars</th>
                <th>Commission</th>
                <th>Rooms</th>
                <th>Contract</th>
                <th>Bookings</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((hotel) => (
                <tr key={hotel.id}>
                  <td>
                    <div className="hotel-name-cell">
                      <div className="hotel-icon-wrap">
                        <Building2 size={16} />
                      </div>
                      <div>
                        <div className="hotel-name">{hotel.name}</div>
                        <div className="hotel-contact-person">{hotel.contactPerson}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: 'var(--text-sm)', color: '#7C7461' }}>
                      {hotel.city}
                    </span>
                  </td>
                  <td>
                    <span className={CATEGORY_COLORS[hotel.category] ?? 'badge badge-olive'}>
                      {hotel.category}
                    </span>
                  </td>
                  <td>
                    <div className="stars-row">
                      {Array.from({ length: hotel.stars }).map((_, i) => (
                        <Star key={i} size={12} fill="var(--color-amber)" color="var(--color-amber)" />
                      ))}
                    </div>
                  </td>
                  <td>
                    <span className="commission-badge">{hotel.commissionRate}%</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{hotel.roomsAvailable}</td>
                  <td>
                    <span className={CONTRACT_BADGE[hotel.contractStatus]}>
                      {CONTRACT_ICON[hotel.contractStatus]}
                      {hotel.contractStatus.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--color-emerald)' }}>{hotel.totalBookings}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => onToast({ message: `Contract for ${hotel.name} opened`, type: 'default' })}
                        title="View Contract"
                      >
                        <FileText size={13} />
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => onToast({ message: `Email drafted to ${hotel.contactEmail}`, type: 'success' })}
                        title="Email Partner"
                      >
                        <Send size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Add Hotel Partner</span>
              <button className="btn-icon" onClick={() => setShowAddModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleAdd}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-field form-field--full">
                    <label className="form-label">Hotel / Resort Name *</label>
                    <input className="input" placeholder="e.g. The Taj Lake Palace" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
                  </div>
                  <div className="form-field">
                    <label className="form-label">City & State</label>
                    <input className="input" placeholder="e.g. Udaipur, Rajasthan" value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Category</label>
                    <select className="input select" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}>
                      <option value="">Select category</option>
                      <option>5-Star Resort</option>
                      <option>Heritage Palace</option>
                      <option>Heritage Villa</option>
                      <option>Eco-Lodge</option>
                      <option>Boutique Hostel</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label className="form-label">Commission Rate (%)</label>
                    <input className="input" type="number" placeholder="e.g. 15" value={form.commission} onChange={(e) => setForm((p) => ({ ...p, commission: e.target.value }))} />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Contact Person</label>
                    <input className="input" placeholder="Name" value={form.contact} onChange={(e) => setForm((p) => ({ ...p, contact: e.target.value }))} />
                  </div>
                  <div className="form-field form-field--full">
                    <label className="form-label">Partner Email</label>
                    <input className="input" type="email" placeholder="partnerships@hotel.com" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
                  </div>
                  {/* Amenities checklist */}
                  <div className="form-field form-field--full">
                    <label className="form-label">Amenities</label>
                    <div className="amenities-grid">
                      {['Pool', 'Spa', 'Restaurant', 'Gym', 'Parking', 'Beach Access', 'Ayurveda', 'WiFi', 'Pet-Friendly'].map((a) => (
                        <label key={a} className="amenity-check">
                          <input type="checkbox" />
                          <span>{a}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><Plus size={14} /> Onboard Partner</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HotelsPage;
