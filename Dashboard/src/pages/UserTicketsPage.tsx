import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  LifeBuoy, Search, Filter, RefreshCw, Send, Paperclip, CheckCircle2,
  Clock, AlertCircle, Check, X, FileText, Image as ImageIcon, Eye,
  Download, ArrowUpRight, Copy, ChevronRight, MessageSquare, User,
  Mail, Phone, Sparkles, ExternalLink, ShieldCheck, CornerDownLeft
} from 'lucide-react';
import {
  getTickets, getTicketDetail, updateTicketStatus,
  sendTicketMessage, getTicketAttachmentUrl
} from '../api';
import {
  joinTicketRoom, leaveTicketRoom, onTicketMessage,
  joinTicketRooms, onTicketStatusChange, onTicketPresence, onTicketTyping, sendAdminTyping,
  sendSocketTicketMessage, sendSocketTicketStatus, onConnectionChange, getSocket, onTicketCreated
} from '../services/socket.ts';
import type { SupportTicket, TicketMessage, TicketStatus, ToastMessage } from '../types';
import './UserTicketsPage.css';

interface UserTicketsPageProps {
  onToast: (msg: Omit<ToastMessage, 'id'>) => void;
  onTicketCountChange?: (count: number) => void;
}

const CATEGORY_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  split: { label: 'Split Engine', color: '#B45309', bg: '#FEF3C7' },
  payments: { label: 'UPI & Payments', color: '#15803D', bg: '#DCFCE7' },
  upi: { label: 'UPI Settlements', color: '#15803D', bg: '#DCFCE7' },
  invite: { label: 'Trip Invites', color: '#6D28D9', bg: '#EDE9FE' },
  bug: { label: 'Bug Report', color: '#BE123C', bg: '#FFE4E6' },
  other: { label: 'General Inquiry', color: '#4B5563', bg: '#F3F4F6' },
};

const CANNED_REPLIES = [
  'Hello! We are looking into this inquiry right away.',
  'Your settlement transaction has been verified and processed.',
  'Could you kindly share a screenshot or transaction reference ID?',
  'This issue has been resolved. Please check your app and let us know!',
];

const UserTicketsPage: React.FC<UserTicketsPageProps> = ({ onToast, onTicketCountChange }) => {
  // Master tickets list
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0 });
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<'all' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Active Selected Ticket & Chat
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const sendInFlightRef = useRef(false);
  const [draftMessage, setDraftMessage] = useState('');
  const [draftAttachment, setDraftAttachment] = useState<File | null>(null);

  // Real-time states
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [clientPresence, setClientPresence] = useState<Record<string, boolean>>({});
  const [userTyping, setUserTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Document Lightbox Preview
  const [previewDoc, setPreviewDoc] = useState<{ url: string; name: string; isImage: boolean } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize Socket Connection & Listeners
  useEffect(() => {
    const socket = getSocket();
    setIsSocketConnected(socket.connected);

    const unsubConn = onConnectionChange((connected) => {
      setIsSocketConnected(connected);
    });

    const unsubMsg = onTicketMessage((payload) => {
      const msg: TicketMessage = payload?.message && typeof payload.message === 'object'
        ? payload.message
        : payload;
      const tNum = payload?.ticketNumber || msg?.ticketNumber;

      // Update in active chat if viewing this ticket
      if (selectedTicket && (tNum === selectedTicket.ticketNumber || msg?.ticketId === selectedTicket.id)) {
        if (msg && msg.id) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      }

      // Update tickets list summary
      setTickets((prev) =>
        prev.map((t) => {
          if (t.ticketNumber === tNum || t.id === msg?.ticketId) {
            return {
              ...t,
              messagesCount: (t.messagesCount || 0) + 1,
              lastMessage: msg.message || 'Attachment sent',
            };
          }
          return t;
        })
      );
    });

    const unsubStatus = onTicketStatusChange((payload) => {
      if (!payload || !payload.ticketNumber) return;
      const { ticketNumber, status } = payload;

      setTickets((prev) =>
        prev.map((t) => (t.ticketNumber === ticketNumber ? { ...t, status } : t))
      );

      if (selectedTicket && selectedTicket.ticketNumber === ticketNumber) {
        setSelectedTicket((prev) => (prev ? { ...prev, status } : null));
      }
    });

    const unsubPresence = onTicketPresence((payload) => {
      if (!payload?.ticketNumber) return;
      setClientPresence((prev) => ({ ...prev, [payload.ticketNumber]: Boolean(payload.clientOnline ?? payload.userOnline) }));
    });

    const unsubTyping = onTicketTyping((data) => {
      if (selectedTicket && data.ticketNumber === selectedTicket.ticketNumber) {
        setUserTyping(data.isTyping);
      }
    });

    return () => {
      unsubConn();
      unsubMsg();
      unsubStatus();
      unsubPresence();
      unsubTyping();
    };
  }, [selectedTicket]);

  // Load Tickets from API
  const fetchTicketsList = useCallback(async () => {
    setIsLoadingTickets(true);
    try {
      const res = await getTickets(statusFilter, categoryFilter, searchQuery);
      if (res && res.tickets) {
        setTickets(res.tickets);
        joinTicketRooms(res.tickets.map((ticket) => ticket.ticketNumber));
        if (res.stats) {
          setStats(res.stats);
          if (onTicketCountChange) {
            onTicketCountChange(res.stats.open);
          }
        }
      }
    } catch (err: any) {
      console.warn('Could not load tickets:', err);
      onToast({ message: err.message || 'Failed to load tickets', type: 'error' });
    } finally {
      setIsLoadingTickets(false);
    }
  }, [statusFilter, categoryFilter, searchQuery, onToast, onTicketCountChange]);

  useEffect(() => {
    fetchTicketsList();
  }, [fetchTicketsList]);

  useEffect(() => onTicketCreated(() => { void fetchTicketsList(); }), [fetchTicketsList]);
  useEffect(() => onConnectionChange((connected) => {
    if (connected) void fetchTicketsList();
  }), [fetchTicketsList]);

  // Handle Selecting a Ticket
  const handleSelectTicket = async (ticket: SupportTicket) => {
    if (selectedTicket?.ticketNumber === ticket.ticketNumber) return;

    if (selectedTicket) {
      leaveTicketRoom(selectedTicket.ticketNumber);
    }

    setSelectedTicket(ticket);
    setIsLoadingMessages(true);
    setMessages([]);
    setDraftMessage('');
    setDraftAttachment(null);
    setUserTyping(false);

    joinTicketRoom(ticket.ticketNumber);

    try {
      const res = await getTicketDetail(ticket.ticketNumber);
      if (res.ticket) setSelectedTicket(res.ticket);
      setMessages(res.messages || []);
    } catch (err: any) {
      console.warn('Failed to load ticket details:', err);
      onToast({ message: err.message || 'Failed to load ticket conversation', type: 'error' });
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Scroll to bottom on message change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handle Status Update
  const handleStatusUpdate = async (newStatus: TicketStatus) => {
    if (!selectedTicket) return;
    try {
      const res = await updateTicketStatus(selectedTicket.ticketNumber, newStatus);
      setSelectedTicket((prev) => (prev ? { ...prev, status: newStatus } : null));
      setTickets((prev) =>
        prev.map((t) => (t.ticketNumber === selectedTicket.ticketNumber ? { ...t, status: newStatus } : t))
      );
      sendSocketTicketStatus(selectedTicket.ticketNumber, newStatus);

      // Re-calculate stats
      setStats((prev) => ({
        ...prev,
        open: newStatus === 'OPEN' ? prev.open + 1 : Math.max(0, prev.open - 1),
        resolved: newStatus === 'RESOLVED' ? prev.resolved + 1 : prev.resolved,
      }));

      onToast({ message: `Ticket ${selectedTicket.ticketNumber} marked as ${newStatus}`, type: 'success' });
    } catch (err: any) {
      onToast({ message: err.message || 'Failed to update status', type: 'error' });
    }
  };

  // Handle Typing indicator broadcast
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraftMessage(e.target.value);
    if (!selectedTicket) return;

    sendAdminTyping(selectedTicket.ticketNumber, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (selectedTicket) sendAdminTyping(selectedTicket.ticketNumber, false);
    }, 1500);
  };

  // Handle Send Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedTicket) return;
    if (!draftMessage.trim() && !draftAttachment) return;
    if (sendInFlightRef.current) return;

    sendInFlightRef.current = true;
    setIsSending(true);
    const textToSend = draftMessage.trim();
    const fileToSend = draftAttachment;

    try {
      const res = await sendTicketMessage(
        selectedTicket.ticketNumber,
        textToSend,
        fileToSend,
        'Admin Support'
      );

      const newMsg = res.data;
      setMessages((prev) => prev.some((item) => item.id === newMsg.id) ? prev : [...prev, newMsg]);

      // Broadcast over socket directly to WebApp
      sendSocketTicketMessage(selectedTicket.ticketNumber, newMsg);
      if (selectedTicket.status === 'RESOLVED') {
        setSelectedTicket((prev) => prev ? { ...prev, status: 'IN_PROGRESS' } : null);
        setTickets((prev) => prev.map((ticket) => ticket.ticketNumber === selectedTicket.ticketNumber
          ? { ...ticket, status: 'IN_PROGRESS' }
          : ticket));
        sendSocketTicketStatus(selectedTicket.ticketNumber, 'IN_PROGRESS');
      }

      setDraftMessage('');
      setDraftAttachment(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      // Update in master list
      setTickets((prev) =>
        prev.map((t) =>
          t.ticketNumber === selectedTicket.ticketNumber
            ? { ...t, messagesCount: (t.messagesCount || 0) + 1, lastMessage: textToSend || 'Attachment sent' }
            : t
        )
      );

      onToast({ message: 'Response sent to traveler in real-time', type: 'success' });
    } catch (err: any) {
      onToast({ message: err.message || 'Failed to send response', type: 'error' });
    } finally {
      sendInFlightRef.current = false;
      setIsSending(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopyTicketId = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedId(num);
    onToast({ message: `Copied ${num} to clipboard`, type: 'default' });
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="tickets-page animate-fade-in">
      {/* ── Top Header & KPI Summary ── */}
      <div className="tickets-header-section">
        <div className="tickets-header-title-row">
          <div>
            <div className="tickets-badge-row">
              <span className="tickets-desk-badge">
                <LifeBuoy size={14} />
                <span>Concierge Support Desk</span>
              </span>
              <span className={`socket-status-pill ${isSocketConnected ? 'socket-status-pill--online' : 'socket-status-pill--offline'}`}>
                <span className="socket-pulse-dot" />
                <span>{isSocketConnected ? 'Live Socket Connected' : 'Connecting WebSocket...'}</span>
              </span>
            </div>
            <h1 className="tickets-title">User Tickets & Inquiries</h1>
            <p className="tickets-subtitle">
              Real-time traveler support desk with WebSocket live chat, attachment inspection, and dispute resolution.
            </p>
          </div>

          <div className="tickets-header-actions">
            <button
              className="btn btn-secondary tickets-refresh-btn"
              onClick={fetchTicketsList}
              disabled={isLoadingTickets}
              title="Refresh Ticket Queue"
            >
              <RefreshCw size={15} className={isLoadingTickets ? 'spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* ── KPI Stat Cards ── */}
        <div className="tickets-stats-grid">
          <div className="ticket-stat-card">
            <div className="ticket-stat-header">
              <span className="ticket-stat-label">Total Inquiries</span>
              <div className="ticket-stat-icon-wrap" style={{ background: '#F3F4F6', color: '#4B5563' }}>
                <MessageSquare size={17} />
              </div>
            </div>
            <div className="ticket-stat-value">{stats.total}</div>
            <div className="ticket-stat-desc">Cumulative support threads</div>
          </div>

          <div className="ticket-stat-card ticket-stat-card--attention">
            <div className="ticket-stat-header">
              <span className="ticket-stat-label">Pending / Open</span>
              <div className="ticket-stat-icon-wrap" style={{ background: '#FEF3C7', color: '#D97706' }}>
                <AlertCircle size={17} />
              </div>
            </div>
            <div className="ticket-stat-value" style={{ color: '#D97706' }}>{stats.open}</div>
            <div className="ticket-stat-desc">Awaiting administrator response</div>
          </div>

          <div className="ticket-stat-card">
            <div className="ticket-stat-header">
              <span className="ticket-stat-label">In Progress</span>
              <div className="ticket-stat-icon-wrap" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                <Clock size={17} />
              </div>
            </div>
            <div className="ticket-stat-value" style={{ color: '#2563EB' }}>{stats.inProgress}</div>
            <div className="ticket-stat-desc">Active investigation threads</div>
          </div>

          <div className="ticket-stat-card">
            <div className="ticket-stat-header">
              <span className="ticket-stat-label">Resolved / Solved</span>
              <div className="ticket-stat-icon-wrap" style={{ background: '#ECFDF5', color: '#059669' }}>
                <CheckCircle2 size={17} />
              </div>
            </div>
            <div className="ticket-stat-value" style={{ color: '#059669' }}>{stats.resolved}</div>
            <div className="ticket-stat-desc">Successfully concluded tickets</div>
          </div>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="tickets-controls-bar">
        <div className="tickets-search-wrap">
          <Search size={15} className="tickets-search-icon" />
          <input
            type="text"
            className="tickets-search-input"
            placeholder="Search tickets by ID (e.g. TICKET-420E96), user name, email, or subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="tickets-search-clear" onClick={() => setSearchQuery('')}>
              <X size={13} />
            </button>
          )}
        </div>

        {/* Status Filter Pills */}
        <div className="tickets-status-pills">
          {(['all', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const).map((st) => (
            <button
              key={st}
              className={`tickets-filter-pill ${statusFilter === st ? 'tickets-filter-pill--active' : ''}`}
              onClick={() => setStatusFilter(st)}
            >
              {st === 'all' ? 'All Tickets' : st.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Category Filter Dropdown */}
        <select
          className="tickets-category-select"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">All Categories</option>
          <option value="split">Split Engine</option>
          <option value="payments">UPI & Payments</option>
          <option value="invite">Trip Invites</option>
          <option value="bug">Bug Report</option>
          <option value="other">General Inquiry</option>
        </select>
      </div>

      {/* ── Master-Detail Layout ── */}
      <div className="tickets-workspace-layout">
        {/* Left Side: Ticket List */}
        <div className="tickets-sidebar-pane">
          <div className="tickets-sidebar-header">
            <span className="tickets-sidebar-count">Showing {tickets.length} inquiries</span>
            <span className="tickets-sidebar-realtime-hint">● Live Synced</span>
          </div>

          {isLoadingTickets ? (
            <div className="tickets-list-loading">
              <RefreshCw size={24} className="spin" />
              <span>Fetching tickets queue...</span>
            </div>
          ) : tickets.length === 0 ? (
            <div className="tickets-list-empty">
              <LifeBuoy size={36} color="var(--accent-olive-light)" />
              <h4>No Tickets Found</h4>
              <p>No support inquiries match the current filter or search criteria.</p>
            </div>
          ) : (
            <div className="tickets-scroll-container">
              {tickets.map((t) => {
                const isSelected = selectedTicket?.ticketNumber === t.ticketNumber;
                const cat = CATEGORY_LABELS[t.category] || CATEGORY_LABELS.other;

                return (
                  <div
                    key={t.id || t.ticketNumber}
                    className={`ticket-list-item ${isSelected ? 'ticket-list-item--active' : ''} ${t.status === 'OPEN' ? 'ticket-list-item--open' : ''}`}
                    onClick={() => handleSelectTicket(t)}
                  >
                    <div className="ticket-item-top-row">
                      <span className="ticket-item-number">{t.ticketNumber}</span>
                      {clientPresence[t.ticketNumber] && !['RESOLVED', 'CLOSED'].includes(t.status) && (
                        <span className="ticket-client-online" title="Client is online">
                          <span className="ticket-client-online-dot" /> Client online
                        </span>
                      )}
                      <span className={`ticket-status-chip ticket-status-chip--${t.status.toLowerCase()}`}>
                        {t.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="ticket-item-subject" title={t.subject}>
                      {t.subject}
                    </div>

                    <p className="ticket-item-preview">
                      {t.lastMessage || t.message || 'No messages yet'}
                    </p>

                    <div className="ticket-item-footer">
                      <div className="ticket-item-user">
                        <div className="ticket-avatar-circle">
                          {(t.userName || 'T').slice(0, 2).toUpperCase()}
                        </div>
                        <span className="ticket-user-name">{t.userName || 'Traveler'}</span>
                      </div>

                      <div className="ticket-item-meta">
                        <span className="ticket-cat-chip" style={{ color: cat.color, background: cat.bg }}>
                          {cat.label}
                        </span>
                        {t.messagesCount !== undefined && t.messagesCount > 0 && (
                          <span className="ticket-msg-count">
                            <MessageSquare size={11} />
                            {t.messagesCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Active Ticket Conversation & Detail Pane */}
        <div className="tickets-detail-pane">
          {!selectedTicket ? (
            <div className="tickets-unselected-state">
              <div className="unselected-icon-wrap">
                <MessageSquare size={42} />
              </div>
              <h3>Select a Ticket to Open Chat Desk</h3>
              <p>
                Click on any traveler inquiry from the queue on the left to inspect ticket details, view uploaded documents, and chat in real-time over WebSocket.
              </p>
            </div>
          ) : (
            <div className="tickets-chat-desk">
              {/* Ticket Topbar */}
              <div className="tickets-chat-topbar">
                <div className="chat-topbar-left">
                  <div className="chat-topbar-ticket-id">
                    <span className="ticket-topbar-num">{selectedTicket.ticketNumber}</span>
                    <button
                      className="btn-icon chat-copy-btn"
                      onClick={() => handleCopyTicketId(selectedTicket.ticketNumber)}
                      title="Copy Ticket ID"
                    >
                      {copiedId === selectedTicket.ticketNumber ? <Check size={14} color="#059669" /> : <Copy size={14} />}
                    </button>
                    <span
                      className="chat-topbar-cat-badge"
                      style={{
                        background: (CATEGORY_LABELS[selectedTicket.category] || CATEGORY_LABELS.other).bg,
                        color: (CATEGORY_LABELS[selectedTicket.category] || CATEGORY_LABELS.other).color,
                      }}
                    >
                      {(CATEGORY_LABELS[selectedTicket.category] || CATEGORY_LABELS.other).label}
                    </span>
                  </div>
                  <h2 className="chat-topbar-subject">{selectedTicket.subject}</h2>
                </div>

                <div className="chat-topbar-right">
                  {/* Status Dropdown */}
                  <div className="chat-status-changer">
                    <label className="chat-status-label">Status:</label>
                    <select
                      className={`chat-status-dropdown chat-status-dropdown--${selectedTicket.status.toLowerCase()}`}
                      value={selectedTicket.status}
                      onChange={(e) => handleStatusUpdate(e.target.value as TicketStatus)}
                    >
                      <option value="OPEN">OPEN</option>
                      <option value="IN_PROGRESS">IN PROGRESS</option>
                      <option value="RESOLVED">RESOLVED</option>
                      <option value="CLOSED">CLOSED</option>
                    </select>
                  </div>

                  {selectedTicket.status !== 'RESOLVED' && (
                    <button
                      className="btn btn-primary chat-solve-btn"
                      onClick={() => handleStatusUpdate('RESOLVED')}
                    >
                      <CheckCircle2 size={15} />
                      <span>Mark Solved</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Traveler Metadata Strip */}
              <div className="traveler-meta-banner">
                <div className="traveler-info-item">
                  <User size={14} className="meta-icon" />
                  <span className="meta-label">Traveler:</span>
                  <span className="meta-val">{selectedTicket.userName || 'Unknown Traveler'}</span>
                </div>
                {selectedTicket.userEmail && (
                  <div className="traveler-info-item">
                    <Mail size={14} className="meta-icon" />
                    <span className="meta-label">Email:</span>
                    <a href={`mailto:${selectedTicket.userEmail}`} className="meta-link">{selectedTicket.userEmail}</a>
                  </div>
                )}
                {selectedTicket.userPhone && (
                  <div className="traveler-info-item">
                    <Phone size={14} className="meta-icon" />
                    <span className="meta-label">Phone:</span>
                    <span className="meta-val">{selectedTicket.userPhone}</span>
                  </div>
                )}
                <div className="traveler-info-item">
                  <Clock size={14} className="meta-icon" />
                  <span className="meta-label">Submitted:</span>
                  <span className="meta-val">{new Date(selectedTicket.createdAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Initial Inquiry Card (Collapsible context) */}
              <div className="initial-inquiry-card">
                <div className="inquiry-card-header">
                  <span className="inquiry-badge">Original Traveler Issue Description</span>
                </div>
                <p className="inquiry-card-text">{selectedTicket.message}</p>

                {/* Initial Attachment if any */}
                {selectedTicket.attachmentName && (
                  <div className="inquiry-attachment-box">
                    <div className="inquiry-attachment-info">
                      <FileText size={16} />
                      <span className="attachment-filename">{selectedTicket.attachmentName}</span>
                    </div>
                    {selectedTicket.attachmentUrl && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() =>
                          setPreviewDoc({
                            url: selectedTicket.attachmentUrl!,
                            name: selectedTicket.attachmentName || 'Document',
                            isImage: /\.(jpe?g|png|webp|gif)$/i.test(selectedTicket.attachmentName || ''),
                          })
                        }
                      >
                        <Eye size={13} />
                        <span>Preview Document</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* ── Real-Time Chat Feed ── */}
              <div className="chat-feed-scrollable">
                <div className="chat-feed-timeline-divider">
                  <span>WebSocket Real-Time Chat History</span>
                </div>

                {isLoadingMessages ? (
                  <div className="chat-feed-loading">
                    <RefreshCw size={20} className="spin" />
                    <span>Loading conversation thread...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="chat-feed-empty">
                    <Sparkles size={24} color="var(--accent-olive)" />
                    <p>No reply messages yet. Send a message below to begin chatting live with the user.</p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isSupport = m.senderRole === 'SUPPORT' || m.senderRole === 'ADMIN';
                    const isSystem = m.senderRole === 'SYSTEM';

                    if (isSystem) {
                      return (
                        <div key={m.id} className="chat-bubble-system">
                          <span>{m.message}</span>
                          <span className="chat-system-time">
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={m.id}
                        className={`chat-bubble-row ${isSupport ? 'chat-bubble-row--support' : 'chat-bubble-row--user'}`}
                      >
                        <div className={`chat-bubble ${isSupport ? 'chat-bubble--support' : 'chat-bubble--user'}`}>
                          <div className="chat-bubble-sender">
                            <span>{isSupport ? m.senderName || 'Admin Concierge' : selectedTicket.userName || 'Traveler'}</span>
                            <span className="chat-bubble-role-tag">{isSupport ? 'Support Desk' : 'Traveler'}</span>
                          </div>

                          {m.message && <p className="chat-bubble-text">{m.message}</p>}

                          {/* Chat Attachment */}
                          {m.attachmentUrl && (
                            <div className="chat-bubble-attachment">
                              {/\.(jpe?g|png|webp|gif)$/i.test(m.attachmentName || '') || m.attachmentType?.includes('image') ? (
                                <img
                                  src={m.attachmentUrl}
                                  alt={m.attachmentName || 'Attachment'}
                                  className="chat-img-thumb"
                                  onClick={() =>
                                    setPreviewDoc({
                                      url: m.attachmentUrl!,
                                      name: m.attachmentName || 'Attached Image',
                                      isImage: true,
                                    })
                                  }
                                />
                              ) : (
                                <button
                                  type="button"
                                  className="chat-file-pill"
                                  onClick={() =>
                                    setPreviewDoc({
                                      url: m.attachmentUrl!,
                                      name: m.attachmentName || 'Document',
                                      isImage: false,
                                    })
                                  }
                                >
                                  <FileText size={15} />
                                  <span>{m.attachmentName || 'View Document'}</span>
                                  <Eye size={12} />
                                </button>
                              )}
                            </div>
                          )}

                          <div className="chat-bubble-time">
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {userTyping && (
                  <div className="chat-bubble-row chat-bubble-row--user">
                    <div className="chat-typing-indicator">
                      <span>Traveler is typing</span>
                      <span className="typing-dots">
                        <span>.</span><span>.</span><span>.</span>
                      </span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* ── Canned Quick Replies ── */}
              <div className="chat-canned-replies-row">
                <span className="canned-label">Quick Responses:</span>
                {CANNED_REPLIES.map((text, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="canned-reply-btn"
                    onClick={() => setDraftMessage(text)}
                  >
                    {text}
                  </button>
                ))}
              </div>

              {/* ── Message Composer ── */}
              <form className="chat-composer-form" onSubmit={handleSendMessage}>
                {draftAttachment && (
                  <div className="draft-attachment-preview">
                    <FileText size={14} />
                    <span className="draft-attachment-name">{draftAttachment.name}</span>
                    <button
                      type="button"
                      className="draft-attachment-remove"
                      onClick={() => setDraftAttachment(null)}
                    >
                      <X size={13} />
                    </button>
                  </div>
                )}

                <div className="chat-composer-inner">
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setDraftAttachment(e.target.files[0]);
                      }
                    }}
                  />

                  <button
                    type="button"
                    className="composer-attach-btn"
                    title="Attach screenshot or document"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip size={18} />
                  </button>

                  <textarea
                    ref={textareaRef}
                    className="composer-textarea"
                    placeholder={`Reply to ${selectedTicket.userName || 'traveler'}... (Press Enter to send, Shift+Enter for new line)`}
                    rows={2}
                    value={draftMessage}
                    onChange={handleTextChange}
                    onKeyDown={handleKeyDown}
                  />

                  <button
                    type="submit"
                    className="composer-send-btn"
                    disabled={isSending || (!draftMessage.trim() && !draftAttachment)}
                  >
                    {isSending ? <RefreshCw size={16} className="spin" /> : <Send size={16} />}
                    <span>Send</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* ── Document / Image Lightbox Modal ── */}
      {previewDoc && (
        <div className="doc-lightbox-overlay" onClick={() => setPreviewDoc(null)}>
          <div className="doc-lightbox-window" onClick={(e) => e.stopPropagation()}>
            <div className="doc-lightbox-header">
              <span className="doc-lightbox-title">{previewDoc.name}</span>
              <div className="doc-lightbox-actions">
                <a
                  href={previewDoc.url}
                  target="_blank"
                  rel="noreferrer"
                  download={previewDoc.name}
                  className="btn btn-secondary btn-sm"
                >
                  <Download size={14} />
                  <span>Download</span>
                </a>
                <button
                  className="btn-icon"
                  onClick={() => setPreviewDoc(null)}
                  aria-label="Close Preview"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            <div className="doc-lightbox-body">
              {previewDoc.isImage ? (
                <img src={previewDoc.url} alt={previewDoc.name} className="doc-lightbox-img" />
              ) : (
                <div className="doc-lightbox-file-view">
                  <FileText size={64} color="var(--accent-olive)" />
                  <h4>{previewDoc.name}</h4>
                  <p>Document stored securely in AWS S3 storage.</p>
                  <a
                    href={previewDoc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary"
                  >
                    <ExternalLink size={15} />
                    <span>Open in New Tab</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserTicketsPage;
