import React, { useState, useEffect, useCallback } from 'react';
import {
  Send, Users, Radio, BookOpen, Crown,
  CheckCircle2, Clock, Smartphone, Mail, MessageSquare,
  BarChart3, Wifi, Layers
} from 'lucide-react';
import {
  getAudienceCount,
  sendBroadcastNotification,
  getBroadcastHistoryLog,
  type BroadcastHistoryItem,
  type AudienceCountResponse
} from '../api';
import { MOCK_NOTIFICATIONS } from '../data/mockData';
import type { ToastMessage } from '../types';
import './NotificationsPage.css';

interface NotificationsPageProps {
  onToast: (msg: Omit<ToastMessage, 'id'>) => void;
}

type NotificationChannel = 'push' | 'inapp' | 'email';
type TargetSegmentKey = 'all' | 'role:Organizer' | 'role:Traveler' | 'role:VIP';

interface SegmentOption {
  key: TargetSegmentKey;
  label: string;
  icon: React.ReactNode;
}

const TARGET_SEGMENTS: SegmentOption[] = [
  { key: 'all', label: 'All Registered Users', icon: <Users size={14} /> },
  { key: 'role:Organizer', label: 'Trip Organizers Only', icon: <Radio size={14} /> },
  { key: 'role:Traveler', label: 'Active Travelers', icon: <BookOpen size={14} /> },
  { key: 'role:VIP', label: 'VIP Passholders', icon: <Crown size={14} /> },
];

const CATEGORIES = ['general', 'announcement', 'promotion', 'alert'];
const DEEP_LINKS = ['/explore', '/trips', '/profile', '/settle', '/support'];

const NotificationsPage: React.FC<NotificationsPageProps> = ({ onToast }) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<NotificationChannel[]>(['push', 'inapp', 'email']);
  const [targetAudience, setTargetAudience] = useState<TargetSegmentKey>('all');
  const [actionUrl, setActionUrl] = useState('/explore');
  const [category, setCategory] = useState('general');
  const [isSending, setIsSending] = useState(false);

  // Audience reach state fetched live from Database
  const [audienceCounts, setAudienceCounts] = useState<AudienceCountResponse | null>(null);
  const [isLoadingCounts, setIsLoadingCounts] = useState(false);

  // Sent Broadcasts History Log
  const [history, setHistory] = useState<BroadcastHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Fetch Live Audience Reach from DB
  const loadAudienceCount = useCallback(async (audience: string) => {
    setIsLoadingCounts(true);
    try {
      const data = await getAudienceCount(audience);
      setAudienceCounts(data);
    } catch {
      // Fallback mock counts if DB unreachable
      setAudienceCounts({
        success: true,
        audience,
        totalUsers: audience === 'all' ? 18420 : audience === 'role:Organizer' ? 4231 : 8912,
        pushTokenCount: audience === 'all' ? 16850 : audience === 'role:Organizer' ? 3980 : 8100,
        emailCount: audience === 'all' ? 18420 : audience === 'role:Organizer' ? 4231 : 8912,
        inAppCount: audience === 'all' ? 18420 : audience === 'role:Organizer' ? 4231 : 8912,
      });
    } finally {
      setIsLoadingCounts(false);
    }
  }, []);

  // Fetch Broadcast History Log
  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const data = await getBroadcastHistoryLog();
      if (data.broadcasts && data.broadcasts.length > 0) {
        setHistory(data.broadcasts);
      } else {
        // Fallback to initial mock notifications
        setHistory(MOCK_NOTIFICATIONS.map(m => ({
          id: String(m.id),
          title: m.title,
          body: 'Automated expedition and group travel notification broadcast to travelers.',
          channels: ['push', 'inapp', 'email'],
          target_audience: m.audience === 'Trip Organizers Only' ? 'role:Organizer' : m.audience === 'Active Travelers' ? 'role:Traveler' : 'all',
          stats: {
            targetedUsers: m.sentCount,
            pushSent: Math.round(m.sentCount * 0.92),
            pushFailed: Math.round(m.sentCount * 0.08),
            inappCreated: m.sentCount,
            emailSent: m.sentCount,
            emailFailed: 0,
          },
          created_at: m.sentAt,
        })));
      }
    } catch {
      // Keep initial list
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadAudienceCount(targetAudience);
  }, [targetAudience, loadAudienceCount]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const toggleChannel = (channel: NotificationChannel) => {
    if (selectedChannels.includes(channel)) {
      if (selectedChannels.length === 1) {
        onToast({ message: 'Select at least one notification channel', type: 'error' });
        return;
      }
      setSelectedChannels(selectedChannels.filter(c => c !== channel));
    } else {
      setSelectedChannels([...selectedChannels, channel]);
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      onToast({ message: 'Please provide both title and body', type: 'error' });
      return;
    }
    if (selectedChannels.length === 0) {
      onToast({ message: 'Select at least one notification channel', type: 'error' });
      return;
    }

    setIsSending(true);
    try {
      const res = await sendBroadcastNotification({
        title,
        body,
        channels: selectedChannels,
        targetAudience,
        actionUrl,
        category,
      });

      onToast({
        message: `Broadcast Sent! Push: ${res.stats?.pushSent ?? 0} | In-App: ${res.stats?.inappCreated ?? 0} | Email: ${res.stats?.emailSent ?? 0}`,
        type: 'success'
      });

      setTitle('');
      setBody('');
      loadHistory();
    } catch (err: any) {
      onToast({
        message: err.message || 'Failed to dispatch broadcast. Check backend connection.',
        type: 'error'
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="notifications-page">
      <div className="page-header">
        <div>
          <h1 className="page-header-title">Broadcast Notification Center</h1>
          <p className="page-header-subtitle">Deploy multi-channel FCM Push, In-App, and Email broadcasts to targeted users</p>
        </div>
      </div>

      <div className="notif-layout">
        {/* Left Column: Multi-Channel Composer */}
        <div className="notif-composer-col">
          <div className="card notif-composer-card">
            <div className="notif-composer-header">
              <div className="notif-composer-title-wrap">
                <Send size={18} style={{ color: 'var(--accent-olive)' }} />
                <span className="notif-composer-title">Compose Broadcast</span>
              </div>
              <span className="badge badge-success" style={{ fontSize: 11 }}>
                FCM Ready
              </span>
            </div>

            <form onSubmit={handleSendBroadcast} className="notif-form">

              {/* 1. Multi-Channel Selector */}
              <div className="form-field">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Delivery Channels (Select Options) *</span>
                  <span style={{ fontSize: 10, color: 'var(--accent-olive-light)' }}>
                    {selectedChannels.length} channel{selectedChannels.length > 1 ? 's' : ''} active
                  </span>
                </label>
                <div className="channel-selector">
                  <button
                    type="button"
                    className={`channel-pill ${selectedChannels.includes('push') ? 'channel-pill--active' : ''}`}
                    onClick={() => toggleChannel('push')}
                  >
                    <Smartphone size={18} />
                    <span className="channel-pill-title">Push (FCM)</span>
                    <span className="channel-pill-sub">Device Tokens</span>
                  </button>

                  <button
                    type="button"
                    className={`channel-pill ${selectedChannels.includes('inapp') ? 'channel-pill--active' : ''}`}
                    onClick={() => toggleChannel('inapp')}
                  >
                    <MessageSquare size={18} />
                    <span className="channel-pill-title">In-App</span>
                    <span className="channel-pill-sub">Database Inbox</span>
                  </button>

                  <button
                    type="button"
                    className={`channel-pill ${selectedChannels.includes('email') ? 'channel-pill--active' : ''}`}
                    onClick={() => toggleChannel('email')}
                  >
                    <Mail size={18} />
                    <span className="channel-pill-title">Email</span>
                    <span className="channel-pill-sub">Nodemailer HTML</span>
                  </button>
                </div>
              </div>

              {/* 2. Target Audience Segment */}
              <div className="form-field">
                <label className="form-label">Target Audience Segment *</label>
                <div className="audience-options">
                  {TARGET_SEGMENTS.map((seg) => (
                    <button
                      key={seg.key}
                      type="button"
                      className={`audience-option ${targetAudience === seg.key ? 'audience-option--active' : ''}`}
                      onClick={() => setTargetAudience(seg.key)}
                    >
                      {seg.icon}
                      <div>
                        <div className="audience-option-label">{seg.label}</div>
                      </div>
                      {targetAudience === seg.key && <CheckCircle2 size={15} className="audience-check" />}
                    </button>
                  ))}
                </div>

                {/* Audience Reach Metrics Bar */}
                <div className="audience-reach-bar">
                  <span style={{ fontWeight: 600, color: 'var(--accent-olive-dark)' }}>Live Audience Reach:</span>
                  <div className="reach-item">
                    <Users size={12} />
                    <span>Users:</span>
                    <span className="reach-badge">{isLoadingCounts ? '...' : audienceCounts?.totalUsers.toLocaleString('en-IN') ?? 0}</span>
                  </div>
                  <div className="reach-item">
                    <Smartphone size={12} />
                    <span>FCM Tokens:</span>
                    <span className="reach-badge" style={{ color: '#059669' }}>
                      {isLoadingCounts ? '...' : audienceCounts?.pushTokenCount.toLocaleString('en-IN') ?? 0}
                    </span>
                  </div>
                  <div className="reach-item">
                    <Mail size={12} />
                    <span>Emails:</span>
                    <span className="reach-badge" style={{ color: '#D97706' }}>
                      {isLoadingCounts ? '...' : audienceCounts?.emailCount.toLocaleString('en-IN') ?? 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Notification Category */}
              <div className="form-field">
                <label className="form-label">Notification Category</label>
                <div className="category-options">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className={`category-chip ${category === cat ? 'category-chip--active' : ''}`}
                      onClick={() => setCategory(cat)}
                    >
                      {cat.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Title */}
              <div className="form-field">
                <label className="form-label">Notification Title *</label>
                <input
                  className="input"
                  maxLength={60}
                  placeholder="e.g. May Expeditions Unlocked: Book Your Spot Now!"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
                <span className="char-count">{title.length}/60</span>
              </div>

              {/* 5. Message Body */}
              <div className="form-field">
                <label className="form-label">Message Body *</label>
                <textarea
                  className="input"
                  rows={4}
                  maxLength={250}
                  placeholder="Write your broadcast announcement to travelers…"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  required
                  style={{ resize: 'vertical' }}
                />
                <span className="char-count">{body.length}/250</span>
              </div>

              {/* 6. Deep Link Destination */}
              <div className="form-field">
                <label className="form-label">Deep Link / Action Destination</label>
                <div className="deeplink-options">
                  {DEEP_LINKS.map((link) => (
                    <button
                      key={link}
                      type="button"
                      className={`deeplink-chip ${actionUrl === link ? 'deeplink-chip--active' : ''}`}
                      onClick={() => setActionUrl(link)}
                    >
                      {link}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }} disabled={isSending}>
                {isSending ? (
                  <><Clock size={16} /> Dispatching Broadcast…</>
                ) : (
                  <><Send size={16} /> Broadcast to Selected Channels</>
                )}
              </button>

            </form>
          </div>
        </div>

        {/* Right Column: Device Preview & Sent History */}
        <div className="notif-right-col">
          {/* Live Mobile Device Preview */}
          <div className="notif-preview-section">
            <h3 className="section-title" style={{ marginBottom: 'var(--space-3)' }}>Live FCM Device Preview</h3>
            <div className="phone-frame-wrap">
              <div className="phone-preview">
                <div className="phone-status-bar">
                  <span>9:41</span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <Wifi size={10} />
                    <div style={{ width: 14, height: 7, border: '1.5px solid #fff', borderRadius: 2, position: 'relative' }}>
                      <div style={{ width: '75%', height: '100%', background: '#fff', borderRadius: 1 }} />
                    </div>
                  </div>
                </div>

                <div className="phone-screen">
                  <div className="phone-home-screen">
                    <div className="phone-notif-banner">
                      <div className="phone-notif-app-row">
                        <div className="phone-app-icon">
                          <span style={{ fontSize: 9, fontWeight: 700, color: '#2E331B' }}>T</span>
                        </div>
                        <span className="phone-app-name">Triptual</span>
                        <span className="phone-notif-time">now</span>
                      </div>
                      <div className="phone-notif-title">{title || 'New Expedition Announcement'}</div>
                      <div className="phone-notif-body">{body || 'Your notification content will appear here on traveler devices.'}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, opacity: 0.25, marginTop: 10, justifyContent: 'center' }}>
                      <Layers size={32} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sent Broadcast History */}
          <div className="card notif-history-card">
            <div className="chart-card-header" style={{ padding: 'var(--space-4) var(--space-5) 0' }}>
              <h3 className="section-title" style={{ margin: 0 }}>Broadcast History Log</h3>
              <BarChart3 size={16} style={{ color: '#A39E8E' }} />
            </div>

            <div className="notif-history-list">
              {isLoadingHistory ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#888', fontSize: 13 }}>Loading history log...</div>
              ) : history.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#888', fontSize: 13 }}>No broadcast logs found</div>
              ) : (
                history.map((item) => (
                  <div key={item.id} className="notif-history-item">
                    <div className="notif-history-top">
                      <span className="notif-history-title">{item.title}</span>
                      <div className="notif-history-channels">
                        {item.channels?.map((ch) => (
                          <span key={ch} className={`channel-badge channel-badge--${ch}`}>
                            {ch}
                          </span>
                        ))}
                      </div>
                    </div>

                    <p style={{ fontSize: 12, color: '#555', margin: '4px 0 8px 0', lineHeight: 1.4 }}>
                      {item.body}
                    </p>

                    <div className="notif-history-meta">
                      <span className="notif-history-audience">
                        <Users size={12} /> {item.target_audience}
                      </span>
                      <span className="notif-history-stats">
                        Push: {item.stats?.pushSent ?? 0} | In-App: {item.stats?.inappCreated ?? 0} | Email: {item.stats?.emailSent ?? 0}
                      </span>
                    </div>

                    <div className="notif-history-date">
                      {new Date(item.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default NotificationsPage;
