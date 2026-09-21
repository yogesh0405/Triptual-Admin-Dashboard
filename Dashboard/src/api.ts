import type { ActivityItem, ChartDataPoint, MockUser } from './types';

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

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const response = await fetch(path, { ...init, headers, credentials: 'include' });
  if (response.status === 401 && retry && path !== '/api/auth/refresh') {
    const refreshed = await refresh();
    if (refreshed) return request<T>(path, init, false);
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? 'Request failed');
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
export const getUsers = () => request<{ users: MockUser[]; total: number }>('/api/users');
export const updateUserStatus = (id: string, status: string) => request(`/api/users/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
export const updateUserPassword = (id: string, password: string) => request<{ ok: boolean }>('/api/users/' + encodeURIComponent(id) + '/password', { method: 'PATCH', body: JSON.stringify({ password }) });