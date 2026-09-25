import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  Plus, Search, Star, Users, Clock,
  Globe, X, CheckCircle2, Edit3,
  Package, Eye, Trash2, Image as ImageIcon,
  Sparkles, ShieldCheck, MapPin, DollarSign, Tag, RefreshCw,
  UploadCloud, Loader2
} from 'lucide-react';
import {
  getTourPackages,
  createTourPackage,
  updateTourPackageStatus,
  deleteTourPackage,
  uploadTourPackageImage,
} from '../api';
import { MOCK_PACKAGES } from '../data/mockData';
import type { MockTripPackage, TripStatus, ToastMessage } from '../types';
import './TourPackagesPage.css';

interface TourPackagesPageProps {
  onToast: (msg: Omit<ToastMessage, 'id'>) => void;
}

const STATUS_BADGE: Record<string, string> = {
  Published: 'badge badge-success',
  Draft: 'badge badge-warning',
  'Sold Out': 'badge badge-danger',
};

const CATEGORY_OPTIONS = [
  { label: 'Hotel', value: 'hotel', type: 'Hotel' },
  { label: 'Villa', value: 'villa', type: 'Villa' },
  { label: 'Resort', value: 'resort', type: 'Resort' },
  { label: 'Camping', value: 'camping', type: 'Camping' },
  { label: 'House', value: 'villa', type: 'House' },
  { label: 'Expedition', value: 'hotel', type: 'Expedition' },
];

const STYLE_OPTIONS = ['Boutique', 'Luxury', 'Modern Minimalist', 'Heritage', 'Adventure', 'Coastal', 'Wellness'];

const INITIAL_FORM = {
  title: '',
  destination: '',
  country: 'India',
  type: 'Hotel',
  category: 'hotel',
  basePrice: '15000',
  totalNights: '7',
  guests: '2',
  duration: '7D/6N',
  dateRange: 'Jun 15-22',
  style: 'Boutique',
  distance: '0.5 km',
  rating: '4.85',
  matchScore: '92',
  featured: false,
  status: 'Published' as 'Published' | 'Draft' | 'Sold Out',
  image: '',
  altImagesText: '',
  description: '',
  itineraryHighlightsText: 'Gothic Quarter guided tour\nSunset sailing session\nLocal food & wine tasting',
  inclusionsText: 'Daily Breakfast\nAirport Transfer\nConcierge Service',
};

const TourPackagesPage: React.FC<TourPackagesPageProps> = ({ onToast }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<any | null>(null);
  const [packages, setPackages] = useState<any[]>(MOCK_PACKAGES);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // S3 image upload state
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add form state
  const [form, setForm] = useState(INITIAL_FORM);

  const handleFileSelected = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onToast({ message: 'Only image files (PNG, JPG, WebP) are allowed', type: 'error' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      onToast({ message: 'Image must be under 10MB', type: 'error' });
      return;
    }

    setIsUploadingImage(true);
    try {
      const res = await uploadTourPackageImage(file);
      if (res.success && res.imageUrl) {
        setForm((prev) => ({ ...prev, image: res.imageUrl }));
        setUploadedFileName(file.name);
        onToast({ message: `Cover image uploaded: ${file.name}`, type: 'success' });
      }
    } catch (err: any) {
      onToast({ message: err?.message || 'Failed to upload image', type: 'error' });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const fetchPackages = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getTourPackages(statusFilter, search);
      if (res.packages && res.packages.length > 0) {
        setPackages(res.packages);
      }
    } catch (err: any) {
      console.warn('Backend API unavailable, using local packages state:', err?.message);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const filtered = useMemo(() => {
    return packages.filter((p) => {
      const q = search.toLowerCase();
      const matchQ = !q || (p.title && p.title.toLowerCase().includes(q)) || (p.destination && p.destination.toLowerCase().includes(q));
      const matchStatus = statusFilter === 'All' || p.status === statusFilter;
      return matchQ && matchStatus;
    });
  }, [packages, search, statusFilter]);

  const handleStatusToggle = async (pkg: any) => {
    const next: TripStatus = pkg.status === 'Published' ? 'Draft' : 'Published';
    try {
      await updateTourPackageStatus(pkg.id, next);
      onToast({ message: `"${pkg.title || pkg.name}" status updated to ${next}`, type: 'success' });
      setPackages((prev) => prev.map((p) => p.id === pkg.id ? { ...p, status: next } : p));
    } catch (error: any) {
      // Fallback local state toggle
      setPackages((prev) => prev.map((p) => p.id === pkg.id ? { ...p, status: next } : p));
      onToast({ message: `"${pkg.title || pkg.name}" updated to ${next} (Local)`, type: 'default' });
    }
  };

  const handleDelete = async (pkg: any) => {
    if (!window.confirm(`Are you sure you want to delete tour package "${pkg.title || pkg.name}"?`)) return;
    try {
      await deleteTourPackage(pkg.id);
      onToast({ message: `Package "${pkg.title || pkg.name}" deleted`, type: 'success' });
      setPackages((prev) => prev.filter((p) => p.id !== pkg.id));
    } catch (err: any) {
      setPackages((prev) => prev.filter((p) => p.id !== pkg.id));
      onToast({ message: `Package removed`, type: 'success' });
    }
  };

  const handleCategorySelect = (catValue: string) => {
    const found = CATEGORY_OPTIONS.find((c) => c.value === catValue);
    setForm((prev) => ({
      ...prev,
      category: catValue,
      type: found ? found.type : 'Hotel'
    }));
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.destination.trim()) {
      onToast({ message: 'Title and destination are required.', type: 'error' });
      return;
    }
    if (!form.image.trim()) {
      onToast({ message: 'Please upload a package cover image.', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    const altImages = form.altImagesText
      ? form.altImagesText.split('\n').map((s) => s.trim()).filter(Boolean)
      : [];
    const itineraryHighlights = form.itineraryHighlightsText
      ? form.itineraryHighlightsText.split('\n').map((s) => s.trim()).filter(Boolean)
      : [];
    const inclusions = form.inclusionsText
      ? form.inclusionsText.split('\n').map((s) => s.trim()).filter(Boolean)
      : [];

    const payload = {
      title: form.title.trim(),
      destination: form.destination.trim(),
      country: form.country.trim() || 'India',
      type: form.type,
      category: form.category,
      basePrice: parseFloat(form.basePrice) || 15000,
      totalNights: parseInt(form.totalNights) || 7,
      guests: parseInt(form.guests) || 2,
      duration: form.duration || '7D/6N',
      dateRange: form.dateRange || 'Jun 15-22',
      style: form.style,
      distance: form.distance || '0.5 km',
      rating: parseFloat(form.rating) || 4.85,
      matchScore: parseInt(form.matchScore) || 92,
      featured: form.featured,
      status: form.status,
      image: form.image.trim(),
      altImages,
      itineraryHighlights,
      inclusions,
      description: form.description.trim() || `Experience an exclusive ${form.style} stay in ${form.destination}.`,
      whyMatched: [
        { icon: 'walk', title: `Prime location in ${form.destination}`, description: `Within ${form.distance} of top landmarks` },
        { icon: 'food', title: 'Top-rated dining options', description: 'Curated food & cultural experience' }
      ],
      metrics: { walk: 90, food: 92, activity: 88 }
    };

    try {
      const res = await createTourPackage(payload);
      if (res.package) {
        setPackages((prev) => [res.package, ...prev]);
        onToast({ message: res.message || `Package "${res.package.title}" created successfully!`, type: 'success' });
      }
    } catch (error: any) {
      // Create local object fallback
      const newPkg = {
        id: `pkg-${Date.now()}`,
        ...payload,
        name: payload.title,
        pricePerNight: Math.round(payload.basePrice / payload.totalNights),
        tags: [payload.type, payload.style].filter(Boolean)
      };
      setPackages((prev) => [newPkg, ...prev]);
      onToast({ message: `Tour package "${newPkg.title}" created!`, type: 'success' });
    } finally {
      setIsSubmitting(false);
      setShowAddModal(false);
      setForm(INITIAL_FORM);
    }
  };

  return (
    <div className="packages-page">
      <div className="page-header">
        <div>
          <h1 className="page-header-title">Tour Packages & Explore Catalog</h1>
          <p className="page-header-subtitle">
            Admin Management Portal — {packages.length} Packages ({packages.filter(p => p.status === 'Published').length} Live on Explore)
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => fetchPackages()} title="Refresh list from backend">
            <RefreshCw size={14} className={isLoading ? 'spin-icon' : ''} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={15} /> Add Tour Package
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-wrapper" style={{ flex: 1, maxWidth: 360 }}>
          <Search size={14} className="search-icon" />
          <input
            className="input"
            style={{ paddingLeft: 34 }}
            placeholder="Search package title or destination…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
        {filtered.map((pkg) => {
          const displayTitle = pkg.title || pkg.name || 'Untitled Package';
          const displayPrice = pkg.basePrice || (pkg.pricePerNight ? pkg.pricePerNight * (pkg.totalNights || 7) : 15000);
          const coverImg = pkg.image || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80';

          return (
            <div key={pkg.id} className="package-card card">
              {/* Cover */}
              <div
                className="package-cover"
                style={{
                  backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.7) 100%), url(${coverImg})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                <div className="package-cover-overlay">
                  <span className={STATUS_BADGE[pkg.status] || 'badge badge-success'}>{pkg.status || 'Published'}</span>
                  {pkg.featured && <span className="badge badge-chartreuse"><Sparkles size={11} /> Featured</span>}
                  {pkg.rating > 0 && (
                    <span className="package-rating">
                      <Star size={11} fill="currentColor" /> {pkg.rating}
                    </span>
                  )}
                </div>
                <div className="package-cover-dest">
                  <Globe size={13} />
                  {pkg.destination}, {pkg.country || 'India'}
                </div>
              </div>

              {/* Body */}
              <div className="package-body">
                <h3 className="package-title">{displayTitle}</h3>
                <p className="package-desc">{pkg.description || 'No description provided.'}</p>

                <div className="package-meta">
                  <span className="package-meta-item"><Clock size={12} />{pkg.duration || `${pkg.totalNights || 7} Days`}</span>
                  <span className="package-meta-item"><Users size={12} />{pkg.guests || 2} Guests</span>
                  <span className="package-meta-item"><MapPin size={12} />{pkg.distance || '0.5 km'}</span>
                </div>

                <div className="package-tags">
                  <span className="badge badge-olive">{pkg.type || 'Hotel'}</span>
                  <span className="badge badge-purple">{pkg.style || 'Boutique'}</span>
                  {pkg.matchScore && <span className="badge badge-info">{pkg.matchScore}% Match</span>}
                </div>

                <div className="package-footer">
                  <div>
                    <span className="package-price">₹{Number(displayPrice).toLocaleString('en-IN')}</span>
                    <span className="package-price-sub"> / total package</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setSelectedPackage(pkg)} title="View details">
                      <Eye size={13} />
                    </button>
                    <button
                      className={`btn ${pkg.status === 'Published' ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                      onClick={() => handleStatusToggle(pkg)}
                    >
                      {pkg.status === 'Published' ? 'Unpublish' : 'Publish'}
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(pkg)} title="Delete package">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Package Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" style={{ maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Create Industry-Grade Tour Package</span>
              <button className="btn-icon" onClick={() => setShowAddModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleAdd}>
              <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
                <div className="form-section-title"><Tag size={14} /> Basic Information</div>
                <div className="form-grid">
                  <div className="form-field">
                    <label className="form-label">Package Title *</label>
                    <input
                      className="input"
                      required
                      placeholder="e.g. Royal Horizon Villa"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Destination City / Region *</label>
                    <input
                      className="input"
                      required
                      placeholder="e.g. Barcelona or Goa"
                      value={form.destination}
                      onChange={(e) => setForm({ ...form, destination: e.target.value })}
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Country</label>
                    <input
                      className="input"
                      placeholder="e.g. Spain, India, France"
                      value={form.country}
                      onChange={(e) => setForm({ ...form, country: e.target.value })}
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Category & Property Type</label>
                    <select
                      className="input"
                      value={form.category}
                      onChange={(e) => handleCategorySelect(e.target.value)}
                    >
                      {CATEGORY_OPTIONS.map((c) => (
                        <option key={c.label} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-section-title" style={{ marginTop: 16 }}><DollarSign size={14} /> Pricing, Duration & Rating</div>
                <div className="form-grid">
                  <div className="form-field">
                    <label className="form-label">Total Package Price (₹) *</label>
                    <input
                      className="input"
                      type="number"
                      required
                      placeholder="18500"
                      value={form.basePrice}
                      onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Duration Tag</label>
                    <input
                      className="input"
                      placeholder="7D/6N or Jun 15-22"
                      value={form.duration}
                      onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Max Guests Capacity</label>
                    <input
                      className="input"
                      type="number"
                      placeholder="4"
                      value={form.guests}
                      onChange={(e) => setForm({ ...form, guests: e.target.value })}
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Travel Style Vibe</label>
                    <select
                      className="input"
                      value={form.style}
                      onChange={(e) => setForm({ ...form, style: e.target.value })}
                    >
                      {STYLE_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field">
                    <label className="form-label">Star Rating (0-5.0)</label>
                    <input
                      className="input"
                      type="number"
                      step="0.01"
                      placeholder="4.92"
                      value={form.rating}
                      onChange={(e) => setForm({ ...form, rating: e.target.value })}
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">AI Match Score (%)</label>
                    <input
                      className="input"
                      type="number"
                      placeholder="94"
                      value={form.matchScore}
                      onChange={(e) => setForm({ ...form, matchScore: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-section-title" style={{ marginTop: 16 }}>
                  <ImageIcon size={14} /> Package Cover Image
                </div>

                <div className="form-field">
                  <label className="form-label">
                    Upload Cover Image *
                  </label>

                  {/* Hidden File Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/jpg"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelected(file);
                      e.target.value = '';
                    }}
                  />

                  {/* Upload Dropzone when no image */}
                  {!form.image && (
                    <div
                      className={`s3-upload-zone ${isDragging ? 's3-upload-zone--dragging' : ''} ${isUploadingImage ? 's3-upload-zone--uploading' : ''}`}
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) handleFileSelected(file);
                      }}
                      onClick={() => !isUploadingImage && fileInputRef.current?.click()}
                    >
                      {isUploadingImage ? (
                        <div className="s3-uploading-state">
                          <Loader2 size={32} className="spin-icon" style={{ color: 'var(--color-emerald)' }} />
                          <div className="s3-upload-title">Uploading...</div>
                          <div className="s3-upload-sub">Storing in bucket: hackcelestial-profile-pictures (ap-south-1)</div>
                        </div>
                      ) : (
                        <div className="s3-idle-state">
                          <div className="s3-upload-icon-circle">
                            <UploadCloud size={24} />
                          </div>
                          <div className="s3-upload-title">
                            <strong>Click to upload</strong> or drag and drop image here
                          </div>
                          <div className="s3-upload-sub">
                            PNG, JPG or WebP up to 10MB
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Uploaded Card Preview */}
                  {form.image && (
                    <div className="s3-uploaded-card">
                      <div className="s3-preview-wrap">
                        <img
                          src={form.image}
                          alt="Cover Preview"
                          className="s3-preview-img"
                        />
                      </div>
                      <div className="s3-preview-info">
                        <div className="s3-badge-row">
                          <span className="badge badge-success">
                            <CheckCircle2 size={12} />Uploaded
                          </span>

                        </div>
                        {uploadedFileName && (
                          <div className="s3-filename">{uploadedFileName}</div>
                        )}

                        <div className="s3-actions-row">
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            disabled={isUploadingImage}
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <UploadCloud size={13} /> Change Image
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => {
                              setForm((prev) => ({ ...prev, image: '' }));
                              setUploadedFileName('');
                            }}
                          >
                            <Trash2 size={13} /> Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-section-title" style={{ marginTop: 16 }}><Sparkles size={14} /> Description & Experience Highlights</div>
                <div className="form-field">
                  <label className="form-label">Overview Description</label>
                  <textarea
                    className="input"
                    rows={2}
                    placeholder="Detailed description of the tour package experience…"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div className="form-grid">
                  <div className="form-field">
                    <label className="form-label">Itinerary Highlights (1 per line)</label>
                    <textarea
                      className="input"
                      rows={3}
                      value={form.itineraryHighlightsText}
                      onChange={(e) => setForm({ ...form, itineraryHighlightsText: e.target.value })}
                      style={{ resize: 'vertical' }}
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Package Inclusions (1 per line)</label>
                    <textarea
                      className="input"
                      rows={3}
                      value={form.inclusionsText}
                      onChange={(e) => setForm({ ...form, inclusionsText: e.target.value })}
                      style={{ resize: 'vertical' }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: 16, display: 'flex', gap: 20, alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 'var(--text-sm)' }}>
                    <input
                      type="checkbox"
                      checked={form.featured}
                      onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                    />
                    <strong>Mark as Featured Package</strong> (Appears in Explore Hero Banner)
                  </label>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                    <label className="form-label" style={{ margin: 0 }}>Initial Status:</label>
                    <select
                      className="input"
                      style={{ padding: '4px 8px', width: 'auto' }}
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                    >
                      <option value="Published">Published (Live on Explore)</option>
                      <option value="Draft">Draft (Admin Only)</option>
                      <option value="Sold Out">Sold Out</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving Package…' : 'Publish Tour Package'}
                </button>
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
              <span className="modal-title">{selectedPackage.title || selectedPackage.name}</span>
              <button className="btn-icon" onClick={() => setSelectedPackage(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div
                className="package-detail-cover"
                style={{
                  backgroundImage: `url(${selectedPackage.image || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80'})`,
                  backgroundSize: 'cover',
                  height: 180,
                  borderRadius: 12
                }}
              />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '16px 0 8px' }}>
                <span className={STATUS_BADGE[selectedPackage.status] || 'badge badge-success'}>{selectedPackage.status}</span>
                <span className="badge badge-olive">{selectedPackage.type || 'Hotel'}</span>
                <span className="badge badge-purple">{selectedPackage.style || 'Boutique'}</span>
                {selectedPackage.matchScore && <span className="badge badge-info">{selectedPackage.matchScore}% Match</span>}
              </div>
              <p style={{ color: '#7C7461', fontSize: 'var(--text-sm)', marginBottom: 16 }}>{selectedPackage.description}</p>

              {selectedPackage.itineraryHighlights && selectedPackage.itineraryHighlights.length > 0 && (
                <div className="detail-section">
                  <h4 className="detail-section-title">Itinerary Highlights</h4>
                  <ul className="detail-list">
                    {selectedPackage.itineraryHighlights.map((h: string, idx: number) => (
                      <li key={idx}><CheckCircle2 size={13} style={{ color: 'var(--color-emerald)', flexShrink: 0 }} />{h}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedPackage.inclusions && selectedPackage.inclusions.length > 0 && (
                <div className="detail-section" style={{ marginTop: 16 }}>
                  <h4 className="detail-section-title">Inclusions</h4>
                  <ul className="detail-list">
                    {selectedPackage.inclusions.map((inc: string, idx: number) => (
                      <li key={idx}><ShieldCheck size={13} style={{ color: 'var(--color-blue)', flexShrink: 0 }} />{inc}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TourPackagesPage;
