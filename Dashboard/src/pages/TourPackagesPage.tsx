import React, { useState, useMemo, useCallback } from 'react';
import {
  Plus, Search, Star, Users, Clock,
  Globe, Tag, X, CheckCircle2, Edit3,
  BookOpen, Package, Eye,
} from 'lucide-react';
import { MOCK_PACKAGES } from '../data/mockData';
import type { MockTripPackage, TripStatus, ToastMessage } from '../types';
import './TourPackagesPage.css';

interface TourPackagesPageProps {
  onToast: (msg: Omit<ToastMessage, 'id'>) => void;
}

const STATUS_BADGE: Record<TripStatus, string> = {
  Published: 'badge badge-success',
  Draft: 'badge badge-warning',
  'Sold Out': 'badge badge-danger',
};

const TAG_COLORS: Record<string, string> = {
  Trekking: 'badge badge-olive',
  Nature: 'badge badge-success',
  Boutique: 'badge badge-purple',
  Luxury: 'badge badge-chartreuse',
  Heritage: 'badge badge-warning',
  Cultural: 'badge badge-info',
  Beach: 'badge badge-info',
  Adventure: 'badge badge-danger',
  Scuba: 'badge badge-info',
  Winter: 'badge badge-olive',
  Wellness: 'badge badge-success',
  Photography: 'badge badge-purple',
  Festival: 'badge badge-chartreuse',
};

const TourPackagesPage: React.FC<TourPackagesPageProps> = ({ onToast }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<MockTripPackage | null>(null);
  const [packages, setPackages] = useState<MockTripPackage[]>(MOCK_PACKAGES);

  // Add form state
  const [form, setForm] = useState({ title: '', destination: '', duration: '', basePrice: '', description: '' });

  const filtered = useMemo(() => packages.filter((p) => {
    const q = search.toLowerCase();
    const matchQ = !q || p.title.toLowerCase().includes(q) || p.destination.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'All' || p.status === statusFilter;
    return matchQ && matchStatus;
  }), [packages, search, statusFilter]);

  const handleStatusToggle = useCallback((pkg: MockTripPackage) => {
    const next: TripStatus = pkg.status === 'Published' ? 'Draft' : 'Published';
    setPackages((prev) => prev.map((p) => p.id === pkg.id ? { ...p, status: next } : p));
    onToast({ message: `"${pkg.title}" set to ${next}`, type: 'success' });
  }, [onToast]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.destination) return;
    const newPkg: MockTripPackage = {
      id: `p${Date.now()}`, title: form.title, destination: form.destination,
      country: 'India', duration: form.duration || '5D/4N',
      basePrice: parseInt(form.basePrice) || 25000,
      groupSizeMin: 4, groupSizeMax: 16,
      tags: ['Boutique'], status: 'Draft',
      coverGradient: 'linear-gradient(135deg, #2E331B 0%, #464B29 100%)',
      bookings: 0, rating: 0,
      itineraryHighlights: [], inclusions: [],
      description: form.description,
    };
    setPackages((prev) => [newPkg, ...prev]);
    setForm({ title: '', destination: '', duration: '', basePrice: '', description: '' });
    setShowAddModal(false);
    onToast({ message: `Tour package "${newPkg.title}" created as Draft`, type: 'success' });
  };

  return (
    <div className="packages-page">
      <div className="page-header">
        <div>
          <h1 className="page-header-title">Tour Packages</h1>
          <p className="page-header-subtitle">Curated expedition catalog — {packages.length} packages</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={15} /> Add Tour Package
        </button>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-wrapper" style={{ flex: 1, maxWidth: 320 }}>
          <Search size={14} className="search-icon" />
          <input className="input" style={{ paddingLeft: 34 }} placeholder="Search packages…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {(['All', 'Published', 'Draft', 'Sold Out'] as const).map((s) => (
          <button
            key={s}
            className={`btn ${statusFilter === s ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setStatusFilter(s)}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Package Grid */}
      <div className="packages-grid">
        {filtered.map((pkg) => (
          <div key={pkg.id} className="package-card card">
            {/* Cover */}
            <div className="package-cover" style={{ background: pkg.coverGradient }}>
              <div className="package-cover-overlay">
                <span className={STATUS_BADGE[pkg.status]}>{pkg.status}</span>
                {pkg.rating > 0 && (
                  <span className="package-rating">
                    <Star size={11} fill="currentColor" /> {pkg.rating}
                  </span>
                )}
              </div>
              <div className="package-cover-dest">
                <Globe size={13} />
                {pkg.destination}, {pkg.country}
              </div>
            </div>

            {/* Body */}
            <div className="package-body">
              <h3 className="package-title">{pkg.title}</h3>
              <p className="package-desc">{pkg.description}</p>

              <div className="package-meta">
                <span className="package-meta-item"><Clock size={12} />{pkg.duration}</span>
                <span className="package-meta-item"><Users size={12} />{pkg.groupSizeMin}–{pkg.groupSizeMax} members</span>
                {pkg.bookings > 0 && (
                  <span className="package-meta-item"><BookOpen size={12} />{pkg.bookings} bookings</span>
                )}
              </div>

              <div className="package-tags">
                {pkg.tags.map((tag) => (
                  <span key={tag} className={TAG_COLORS[tag] ?? 'badge badge-olive'}>{tag}</span>
                ))}
              </div>

              <div className="package-footer">
                <div>
                  <span className="package-price">₹{pkg.basePrice.toLocaleString('en-IN')}</span>
                  <span className="package-price-sub"> / person</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setSelectedPackage(pkg)}>
                    <Eye size={13} />
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleStatusToggle(pkg)}>
                    {pkg.status === 'Published' ? <Edit3 size={13} /> : <CheckCircle2 size={13} />}
                    {pkg.status === 'Published' ? 'Unpublish' : 'Publish'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Package Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Add New Tour Package</span>
              <button className="btn-icon" onClick={() => setShowAddModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleAdd}>
              <div className="modal-body">
                <div className="form-grid">
                  {[
                    { label: 'Package Title *', key: 'title', placeholder: 'e.g. Ladakh Silk Route Expedition' },
                    { label: 'Destination *', key: 'destination', placeholder: 'e.g. Leh, Ladakh' },
                    { label: 'Duration', key: 'duration', placeholder: 'e.g. 8D/7N' },
                    { label: 'Base Price (₹)', key: 'basePrice', placeholder: 'e.g. 38000' },
                  ].map((f) => (
                    <div key={f.key} className="form-field">
                      <label className="form-label">{f.label}</label>
                      <input
                        className="input"
                        placeholder={f.placeholder}
                        value={(form as Record<string, string>)[f.key]}
                        onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      />
                    </div>
                  ))}
                  <div className="form-field form-field--full">
                    <label className="form-label">Description</label>
                    <textarea
                      className="input"
                      rows={3}
                      placeholder="Describe the expedition experience…"
                      value={form.description}
                      onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                      style={{ resize: 'vertical' }}
                    />
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <div className="badge badge-warning" style={{ display: 'inline-flex' }}>
                    <Package size={12} /> Package will be saved as Draft initially
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><Plus size={14} /> Create Package</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedPackage && (
        <div className="modal-overlay" onClick={() => setSelectedPackage(null)}>
          <div className="modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{selectedPackage.title}</span>
              <button className="btn-icon" onClick={() => setSelectedPackage(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="package-detail-cover" style={{ background: selectedPackage.coverGradient }} />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '16px 0 8px' }}>
                <span className={STATUS_BADGE[selectedPackage.status]}>{selectedPackage.status}</span>
                {selectedPackage.tags.map((t) => <span key={t} className={TAG_COLORS[t] ?? 'badge badge-olive'}>{t}</span>)}
              </div>
              <p style={{ color: '#7C7461', fontSize: 'var(--text-sm)', marginBottom: 16 }}>{selectedPackage.description}</p>
              <div className="detail-section">
                <h4 className="detail-section-title">Itinerary Highlights</h4>
                <ul className="detail-list">
                  {selectedPackage.itineraryHighlights.map((h) => <li key={h}><CheckCircle2 size={13} style={{ color: 'var(--color-emerald)', flexShrink: 0 }} />{h}</li>)}
                </ul>
              </div>
              <div className="detail-section" style={{ marginTop: 16 }}>
                <h4 className="detail-section-title">Inclusions</h4>
                <ul className="detail-list">
                  {selectedPackage.inclusions.map((inc) => <li key={inc}><CheckCircle2 size={13} style={{ color: 'var(--color-blue)', flexShrink: 0 }} />{inc}</li>)}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TourPackagesPage;
