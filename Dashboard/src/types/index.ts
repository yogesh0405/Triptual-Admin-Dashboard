/* ============================================================
   TRIPTUAL ADMIN — TypeScript Interfaces & Model Definitions
   ============================================================ */

export type AdminPage =
  | 'dashboard'
  | 'users'
  | 'tour-packages'
  | 'hotels'
  | 'revenue'
  | 'notifications';

export type UserRole = 'Organizer' | 'Traveler' | 'VIP';
export type UserStatus = 'Active' | 'Pending' | 'Suspended';
export type TripStatus = 'Published' | 'Draft' | 'Sold Out';
export type ContractStatus = 'ACTIVE' | 'IN_REVIEW' | 'EXPIRED';
export type PaymentStatus = 'SUCCESS' | 'PENDING' | 'FAILED';
export type PaymentType = 'PRO_TIER_UPGRADE' | 'SETTLEMENT_FEE' | 'REFUND';
export type PaymentMethod = 'Razorpay UPI' | 'NetBanking' | 'Card' | 'UPI Direct';
export type NotificationAudience = 'All Users' | 'Trip Organizers Only' | 'Active Travelers';

/* ── User ── */
export interface MockUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  joinedDate: string;
  isVerified: boolean;
  upiId?: string;
  travelStyle?: string;
  isTemp?: boolean;
  avatar?: string;
  currency?: string;
  dateOfBirth?: string;
  pushToken?: string;
  avatarColor: string;
  avatarInitials: string;
  tripsCount: number;
  totalSpend: number;
  lastActive: string;
}

/* ── Trip Package ── */
export interface MockTripPackage {
  id: string;
  title: string;
  destination: string;
  country: string;
  duration: string;
  basePrice: number;
  groupSizeMin: number;
  groupSizeMax: number;
  tags: string[];
  status: TripStatus;
  coverGradient: string;
  bookings: number;
  rating: number;
  itineraryHighlights: string[];
  inclusions: string[];
  description: string;
}

/* ── Hotel Partner ── */
export interface MockHotelPartner {
  id: string;
  name: string;
  city: string;
  state: string;
  category: string;
  stars: number;
  commissionRate: number;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  contractStatus: ContractStatus;
  roomsAvailable: number;
  contractStart: string;
  contractEnd: string;
  totalBookings: number;
  amenities: string[];
}

/* ── Payment Transaction ── */
export interface MockTransaction {
  id: string;
  transactionId: string;
  userName: string;
  userEmail: string;
  tripDestination: string;
  type: PaymentType;
  amount: number;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  timestamp: string;
  razorpayOrderId?: string;
  utrReference?: string;
  groupId?: string;
}

/* ── Notification ── */
export interface MockNotification {
  id: string;
  title: string;
  body: string;
  audience: NotificationAudience;
  deepLink: string;
  sentAt: string;
  sentCount: number;
  openRate: number;
  status: 'sent' | 'scheduled' | 'draft';
}

/* ── KPI Metric ── */
export interface KPIMetric {
  label: string;
  value: string;
  subValue?: string;
  trend: number; // percentage change
  trendLabel: string;
  icon: string;
  color: string;
  bgColor: string;
}

/* ── Chart Data Point ── */
export interface ChartDataPoint {
  label: string;
  value: number;
  secondary?: number;
}

/* ── Activity Feed Item ── */
export interface ActivityItem {
  id: string;
  type: 'trip_created' | 'member_joined' | 'expense_settled' | 'pro_upgrade' | 'invite_sent';
  title: string;
  description: string;
  timestamp: string;
  userAvatar: string;
  userColor: string;
  amount?: number;
}

/* ── Toast ── */
export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'default';
}
