import React, { useState } from 'react';
import {
  Send, Users, Radio, BookOpen,
  BarChart3, CheckCircle2, Clock,
  ChevronRight, Smartphone, Wifi,
} from 'lucide-react';
import { MOCK_NOTIFICATIONS } from '../data/mockData';
import type { NotificationAudience, ToastMessage } from '../types';
import './NotificationsPage.css';

interface NotificationsPageProps {
  onToast: (msg: Omit<ToastMessage, 'id'>) => void;
}

const AUDIENCE_ICONS: Record<NotificationAudience, React.ReactNode> = {
  'All Users': <Users size={14} />,
  'Trip Organizers Only': <Radio size={14} />,
  'Active Travelers': <BookOpen size={14} />,
};

const NotificationsPage: React.FC<NotificationsPageProps> = ({ onToast }) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<NotificationAudience>('All Users');
  const [deepLink, setDeepLink] = useState('/explore');
  const [isSending, setIsSending] = useState(false);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !body) return;
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setTitle('');
      setBody('');
      onToast({ message: `Notification broadcast to ${audience} — sent!`, type: 'success' });
    }, 1500);
  };

  const AUDIENCE_COUNT: Record<NotificationAudience, string> = {
    'All Users': '18,420 recipients',
    'Trip Organizers Only': '4,231 recipients',
    'Active Travelers': '8,912 recipients',
  };

  return (
    <div className="notifications-page">
      <div className="page-header">
        <div>
          <h1 className="page-header-title">Broadcast Notifications</h1>
          <p className="page-header-subtitle">Send push notifications to traveler segments</p>
        </div>
      </div>

      <div className="notif-layout">
        {/* Composer */}
        <div className="notif-composer-col">
          <div className="card notif-composer-card">
            <div className="notif-composer-header">
              <Send size={16} style={{ color: 'var(--accent-olive)' }} />
              <span className="notif-composer-title">Compose Notification</span>
            </div>
            <form onSubmit={handleSend} className="notif-form">
              {/* Audience */}
              <div className="form-field">
                <label className="form-label">Target Audience</label>
                <div className="audience-options">
                  {(['All Users', 'Trip Organizers Only', 'Active Travelers'] as NotificationAudience[]).map((a) => (
                    <button
                      key={a}
                      type="button"
                      className={`audience-option ${audience === a ? 'audience-option--active' : ''}`}
                      onClick={() => setAudience(a)}
                    >
                      {AUDIENCE_ICONS[a]}
                      <div>
                        <div className="audience-option-label">{a}</div>
                        <div className="audience-option-count">{AUDIENCE_COUNT[a]}</div>
                      </div>
                      {audience === a && <CheckCircle2 size={15} className="audience-check" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div className="form-field">
                <label className="form-label">Notification Title *</label>
                <input
                  className="input"
                  maxLength={60}
                  placeholder="e.g. New Expeditions Unlocked for May"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
                <span className="char-count">{title.length}/60</span>
              </div>

              {/* Body */}
              <div className="form-field">
                <label className="form-label">Message Body *</label>
                <textarea
                  className="input"
                  rows={4}
                  maxLength={200}
                  placeholder="Write your message to travelers…"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  required
                  style={{ resize: 'vertical' }}
                />
                <span className="char-count">{body.length}/200</span>
              </div>

              {/* Deep link */}
              <div className="form-field">
                <label className="form-label">Deep Link Destination</label>
                <div className="deeplink-options">
                  {['/explore', '/trips', '/profile', '/settle'].map((l) => (
                    <button
                      key={l}
                      type="button"
                      className={`deeplink-chip ${deepLink === l ? 'deeplink-chip--active' : ''}`}
                      onClick={() => setDeepLink(l)}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={isSending}>
                {isSending ? (
                  <><Clock size={15} /> Sending…</>
                ) : (
                  <><Send size={15} /> Broadcast Now</>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right: Device Preview + History */}
        <div className="notif-right-col">
          {/* Phone Preview */}
          <div className="notif-preview-section">
            <h3 className="section-title" style={{ marginBottom: 'var(--space-4)' }}>Live Device Preview</h3>
            <div className="phone-frame-wrap">
              <div className="phone-preview">
                <div className="phone-status-bar">
                  <span>9:41</span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <Wifi size={10} />
                    <div style={{ width: 16, height: 8, border: '1.5px solid #fff', borderRadius: 2, position: 'relative' }}>
                      <div style={{ width: '75%', height: '100%', background: '#fff', borderRadius: 1 }} />
                    </div>
                  </div>
                </div>
                <div className="phone-screen">
                  <div className="phone-notch" />
                  <div className="phone-home-screen">
                    <div className="phone-notif-banner">
                      <div className="phone-notif-app-row">
                        <div className="phone-app-icon">
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#2E331B' }}>T</span>
                        </div>
                        <span className="phone-app-name">Triptual</span>
                        <span className="phone-notif-time">now</span>
                      </div>
                      <div className="phone-notif-title">{title || 'Your notification title'}</div>
                      <div className="phone-notif-body">{body || 'Your message will appear here for travelers to see…'}</div>
                    </div>
                    <div className="phone-home-icons">
                      {[...Array(12)].map((_, i) => (
                        <div key={i} className="phone-home-icon-dot" style={{ background: `hsl(${i * 30}, 40%, 70%)` }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sent History */}
          <div className="card notif-history-card">
            <div className="chart-card-header" style={{ padding: 'var(--space-4) var(--space-5) 0' }}>
              <h3 className="section-title" style={{ margin: 0 }}>Sent History</h3>
              <BarChart3 size={16} style={{ color: '#A39E8E' }} />
            </div>
            <div className="notif-history-list">
              {MOCK_NOTIFICATIONS.map((n) => (
                <div key={n.id} className="notif-history-item">
                  <div className="notif-history-top">
                    <span className="notif-history-title">{n.title}</span>
                    <span className="badge badge-success" style={{ fontSize: 10 }}>{n.status}</span>
                  </div>
                  <div className="notif-history-meta">
                    <span className="notif-history-audience">
                      {AUDIENCE_ICONS[n.audience]} {n.audience}
                    </span>
                    <span className="notif-history-stats">
                      {n.sentCount.toLocaleString('en-IN')} sent · {n.openRate}% open rate
                    </span>
                  </div>
                  <div className="notif-history-date">
                    {new Date(n.sentAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
