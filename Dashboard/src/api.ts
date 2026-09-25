import type { ActivityItem, ChartDataPoint, MockUser, SupportTicket, TicketMessage, TicketStatus } from './types';

const ACCESS_KEY = 'triptual_admin_access';
let accessToken = localStorage.getItem(ACCESS_KEY);

export type DashboardData = {
  kpis: { activeTrips: number; registeredTravelers: number; revenue: number; settlements: number };
  monthlyTrips: ChartDataPoint[];
  monthlyRevenue: ChartDataPoint[];
  settlements: ChartDataPoint[];
  tiers: { label: string; count: number; percentage: number }[];
  activity: ActivityItem[];
};

export const setAccessToken = (token: string | null) => {
  accessToken = token;
  if (token) localStorage.setItem(ACCESS_KEY, token);
  else localStorage.removeItem(ACCESS_KEY);
};

const configuredApiBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
const isLocalDevelopment = typeof window !== 'undefined' && ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname);
const API_BASE_URL = (configuredApiBaseUrl ?? (isLocalDevelopment ? '' : 'https://triptual-admin-dashboard.onrender.com')).replace(/\/$/, '');
if (!API_BASE_URL && !isLocalDevelopment) {
  console.warn(
    '[Triptual Admin] VITE_API_BASE_URL is not set. ' +
    'API calls will fail in production. ' +
    'Add VITE_API_BASE_URL=https://your-backend.onrender.com to Vercel environment variables.'
  );
}

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;

  let response: Response;
  try {
    // credentials:'include' is required for cookie-based refresh tokens.
    // This works cross-origin only when backend has FRONTEND_URL set to this origin.
    const isCrossOrigin = API_BASE_URL && !API_BASE_URL.startsWith('/');
    response = await fetch(url, { ...init, headers, credentials: isCrossOrigin ? 'include' : 'same-origin' });
  } catch (err) {
    throw new Error('Network error: Unable to reach backend server');
  }

  if (response.status === 401 && retry && path !== '/api/auth/refresh' && path !== '/api/auth/login') {
    const refreshed = await refresh();
    if (refreshed) return request<T>(path, init, false);
  }

  const text = await response.text();
  let body: any = {};
  try {
    body = JSON.parse(text);
  } catch {
    body = {};
  }

  if (!response.ok) {
    const errorMsg = body.error || body.message || (text && text.length < 100 ? text : `Request failed (${response.status})`);
    throw new Error(errorMsg);
  }
  return body as T;
}

export async function login(email: string, password: string) {
  const result = await request<{ accessToken: string; admin: { email: string } }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }, false);
  setAccessToken(result.accessToken);
  return result.admin;
}

export async function refresh() {
  try {
    const result = await request<{ accessToken: string }>('/api/auth/refresh', { method: 'POST' }, false);
    setAccessToken(result.accessToken);
    return true;
  } catch {
    setAccessToken(null);
    return false;
  }
}

export async function logout() {
  await request('/api/auth/logout', { method: 'POST' }, false).catch(() => undefined);
  setAccessToken(null);
}

export const getDashboard = () => request<DashboardData>('/api/dashboard');
export const getUsersList = () => request<{ users: MockUser[]; total: number }>('/api/users');

export interface AudienceCountResponse {
  success: boolean;
  audience: string;
  totalUsers: number;
  pushTokenCount: number;
  emailCount: number;
  inAppCount: number;
}

export interface BroadcastPayload {
  title: string;
  body: string;
  channels: ('push' | 'inapp' | 'email')[];
  targetAudience: string;
  actionUrl?: string;
  category?: string;
}

export interface BroadcastHistoryItem {
  id: string;
  title: string;
  body: string;
  channels: ('push' | 'inapp' | 'email')[];
  target_audience: string;
  action_url?: string;
  category?: string;
  stats: {
    targetedUsers: number;
    pushSent: number;
    pushFailed: number;
    inappCreated: number;
    emailSent: number;
    emailFailed: number;
    isSimulatedPush?: boolean;
  };
  created_at: string;
}

export const getAudienceCount = (audience: string) =>
  request<AudienceCountResponse>(`/api/notifications/audience-count?audience=${encodeURIComponent(audience)}`);

export const sendBroadcastNotification = (payload: BroadcastPayload) =>
  request<{ success: boolean; message: string; stats: BroadcastHistoryItem['stats'] }>('/api/notifications/broadcast', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const getBroadcastHistoryLog = () =>
  request<{ success: boolean; broadcasts: BroadcastHistoryItem[] }>('/api/notifications/broadcasts');
export const getUsers = () => request<{ users: MockUser[]; total: number }>('/api/users');
export const updateUserStatus = (id: string, status: string) => request(`/api/users/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
export const updateUserPassword = (id: string, password: string) => request<{ ok: boolean }>('/api/users/' + encodeURIComponent(id) + '/password', { method: 'PATCH', body: JSON.stringify({ password }) });

// Tour Package API calls
export const getTourPackages = (status = 'All', search = '') =>
  request<{ success: boolean; packages: any[]; total: number }>(
    `/api/packages?status=${encodeURIComponent(status)}&search=${encodeURIComponent(search)}`
  );

export const createTourPackage = (payload: any) =>
  request<{ success: boolean; message: string; package: any }>('/api/packages', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateTourPackageStatus = (id: string, status: string) =>
  request<{ success: boolean; message: string; package: any }>(`/api/packages/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

export const deleteTourPackage = (id: string) =>
  request<{ success: boolean; message: string }>(`/api/packages/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });

export async function uploadTourPackageImage(file: File): Promise<{
  success: boolean;
  imageUrl: string;
  key: string;
  fileName: string;
  fileSize: number;
}> {
  const formData = new FormData();
  formData.append('image', file);

  const headers = new Headers();
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const url = `${API_BASE_URL}/api/packages/upload-image`;

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to upload image to AWS S3');
  }

  return response.json();
}

// ==========================================
// User Support Tickets & Real-Time Chat APIs
// ==========================================

export interface TicketListResponse {
  success: boolean;
  tickets: SupportTicket[];
  total: number;
  stats: {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
  };
}

export interface TicketDetailResponse {
  success: boolean;
  ticket: SupportTicket;
  messages: TicketMessage[];
}

export const getTickets = (status = 'all', category = 'all', search = '') =>
  request<TicketListResponse>(
    `/api/tickets?status=${encodeURIComponent(status)}&category=${encodeURIComponent(category)}&search=${encodeURIComponent(search)}`
  );

export const getTicketDetail = (ticketNumber: string) =>
  request<TicketDetailResponse>(`/api/tickets/${encodeURIComponent(ticketNumber)}`);

export const updateTicketStatus = (ticketNumber: string, status: TicketStatus) =>
  request<{ success: boolean; message: string; ticket: SupportTicket }>(
    `/api/tickets/${encodeURIComponent(ticketNumber)}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }
  );

export async function sendTicketMessage(
  ticketNumber: string,
  message: string,
  attachment?: File | null,
  senderName = 'Admin Concierge Desk'
): Promise<{ success: boolean; message: string; data: TicketMessage }> {
  const formData = new FormData();
  if (message && message.trim()) formData.append('message', message.trim());
  formData.append('senderName', senderName);
  if (attachment) formData.append('attachment', attachment);

  const headers = new Headers();
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const url = `${API_BASE_URL}/api/tickets/${encodeURIComponent(ticketNumber)}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to dispatch ticket message');
  }

  return response.json();
}

export function getTicketAttachmentUrl(ticketNumber: string, directUrl?: string | null): string {
  if (directUrl && (directUrl.startsWith('http://') || directUrl.startsWith('https://'))) {
    return directUrl;
  }
  return `${API_BASE_URL}/api/tickets/${encodeURIComponent(ticketNumber)}/attachment`;
}

