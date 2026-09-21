/* ============================================================
   TRIPTUAL ADMIN — Rich Mock Data Sets
   ============================================================ */
import type {
  MockUser, MockTripPackage, MockHotelPartner,
  MockTransaction, MockNotification, ChartDataPoint, ActivityItem,
} from '../types';

/* ── Users ── */
export const MOCK_USERS: MockUser[] = [
  {
    id: 'u1', name: 'Arjun Mehta', email: 'arjun.mehta@gmail.com', phone: '+91 98765 43210',
    role: 'Organizer', status: 'Active', joinedDate: '2024-02-14', isVerified: true,
    upiId: 'arjun.mehta@okaxis', travelStyle: 'Adventure', avatarColor: '#2E331B',
    avatarInitials: 'AM', tripsCount: 12, totalSpend: 184200, lastActive: '2 hours ago',
  },
  {
    id: 'u2', name: 'Priya Sharma', email: 'priya.sharma@icloud.com', phone: '+91 87654 32109',
    role: 'VIP', status: 'Active', joinedDate: '2024-01-07', isVerified: true,
    upiId: 'priya@ybl', travelStyle: 'Luxury', avatarColor: '#7C3AED',
    avatarInitials: 'PS', tripsCount: 28, totalSpend: 492600, lastActive: '15 minutes ago',
  },
  {
    id: 'u3', name: 'Rohan Kapoor', email: 'rohan.k@outlook.com', phone: '+91 76543 21098',
    role: 'Traveler', status: 'Active', joinedDate: '2024-03-22', isVerified: true,
    upiId: 'rohan.kapoor@paytm', travelStyle: 'Budget', avatarColor: '#059669',
    avatarInitials: 'RK', tripsCount: 7, totalSpend: 63400, lastActive: '1 day ago',
  },
  {
    id: 'u4', name: 'Sneha Patel', email: 'sneha.patel@gmail.com', phone: '+91 65432 10987',
    role: 'Traveler', status: 'Pending', joinedDate: '2024-04-15', isVerified: false,
    travelStyle: 'Cultural', avatarColor: '#D97706',
    avatarInitials: 'SP', tripsCount: 2, totalSpend: 18700, lastActive: '3 days ago',
  },
  {
    id: 'u5', name: 'Vikram Singh', email: 'vikram.singh@hotmail.com', phone: '+91 54321 09876',
    role: 'Organizer', status: 'Active', joinedDate: '2023-11-30', isVerified: true,
    upiId: 'vikram.s@icici', travelStyle: 'Trekking', avatarColor: '#2563EB',
    avatarInitials: 'VS', tripsCount: 19, totalSpend: 287500, lastActive: '5 hours ago',
  },
  {
    id: 'u6', name: 'Nisha Rao', email: 'nisha.rao@gmail.com', phone: '+91 43210 98765',
    role: 'VIP', status: 'Active', joinedDate: '2023-10-12', isVerified: true,
    upiId: 'nisha.rao@upi', travelStyle: 'Wellness', avatarColor: '#E11D48',
    avatarInitials: 'NR', tripsCount: 34, totalSpend: 678900, lastActive: '30 minutes ago',
  },
  {
    id: 'u7', name: 'Karan Joshi', email: 'karan.j@yahoo.com', phone: '+91 32109 87654',
    role: 'Traveler', status: 'Suspended', joinedDate: '2024-01-19', isVerified: true,
    travelStyle: 'Solo', avatarColor: '#64748B',
    avatarInitials: 'KJ', tripsCount: 4, totalSpend: 32100, lastActive: '2 weeks ago',
  },
  {
    id: 'u8', name: 'Ananya Desai', email: 'ananya.d@gmail.com', phone: '+91 21098 76543',
    role: 'Traveler', status: 'Active', joinedDate: '2024-05-01', isVerified: true,
    upiId: 'ananya.d@sbi', travelStyle: 'Beach', avatarColor: '#0891B2',
    avatarInitials: 'AD', tripsCount: 9, totalSpend: 115300, lastActive: '6 hours ago',
  },
  {
    id: 'u9', name: 'Mohit Verma', email: 'mohit.v@gmail.com', phone: '+91 11098 76543',
    role: 'Organizer', status: 'Active', joinedDate: '2023-08-14', isVerified: true,
    upiId: 'mohit.v@hdfc', travelStyle: 'Heritage', avatarColor: '#9333EA',
    avatarInitials: 'MV', tripsCount: 23, totalSpend: 354000, lastActive: '1 hour ago',
  },
  {
    id: 'u10', name: 'Divya Krishnan', email: 'divya.k@gmail.com', phone: '+91 99876 54320',
    role: 'VIP', status: 'Active', joinedDate: '2023-06-22', isVerified: true,
    upiId: 'divya@airtel', travelStyle: 'Luxury', avatarColor: '#EA580C',
    avatarInitials: 'DK', tripsCount: 41, totalSpend: 893400, lastActive: 'Just now',
  },
];

/* ── Tour Packages ── */
export const MOCK_PACKAGES: MockTripPackage[] = [
  {
    id: 'p1', title: 'Valley of Flowers Expedition', destination: 'Uttarakhand', country: 'India',
    duration: '7D/6N', basePrice: 28500, groupSizeMin: 4, groupSizeMax: 12,
    tags: ['Trekking', 'Nature', 'Boutique'], status: 'Published',
    coverGradient: 'linear-gradient(135deg, #2E331B 0%, #464B29 50%, #5C6334 100%)',
    bookings: 142, rating: 4.8,
    itineraryHighlights: ['Govindghat base camp', 'Valley of Flowers UNESCO site', 'Hemkund Sahib trek', 'Badrinath darshan'],
    inclusions: ['Accommodation', 'All meals', 'Experienced guide', 'Permits', 'First aid'],
    description: 'A rare high-altitude flower paradise accessible only in monsoon months.',
  },
  {
    id: 'p2', title: 'Rajasthan Royal Circuit', destination: 'Rajasthan', country: 'India',
    duration: '9D/8N', basePrice: 54000, groupSizeMin: 2, groupSizeMax: 20,
    tags: ['Luxury', 'Heritage', 'Cultural'], status: 'Published',
    coverGradient: 'linear-gradient(135deg, #92400E 0%, #D97706 50%, #F59E0B 100%)',
    bookings: 89, rating: 4.9,
    itineraryHighlights: ['Jaipur Palace tour', 'Udaipur lake cruise', 'Jaisalmer fort stay', 'Desert safari'],
    inclusions: ['Heritage hotel stays', 'Private AC vehicle', 'Cultural performances', 'All meals', 'Entry tickets'],
    description: 'An opulent journey through the maharajas\' courts, forts, and golden deserts.',
  },
  {
    id: 'p3', title: 'Andaman Coral Odyssey', destination: 'Port Blair', country: 'India',
    duration: '6D/5N', basePrice: 38000, groupSizeMin: 2, groupSizeMax: 15,
    tags: ['Beach', 'Adventure', 'Scuba'], status: 'Published',
    coverGradient: 'linear-gradient(135deg, #0C4A6E 0%, #0369A1 50%, #0EA5E9 100%)',
    bookings: 203, rating: 4.7,
    itineraryHighlights: ['Havelock Island', 'Radhanagar Beach', 'Scuba certification', 'Cellular Jail light show'],
    inclusions: ['Beach resort stay', 'All ferry transfers', 'Scuba lessons', 'Snorkeling gear', 'Seafood meals'],
    description: 'Pristine turquoise waters, coral reefs, and untouched island ecosystems.',
  },
  {
    id: 'p4', title: 'Spiti Winter Expedition', destination: 'Himachal Pradesh', country: 'India',
    duration: '10D/9N', basePrice: 42000, groupSizeMin: 6, groupSizeMax: 10,
    tags: ['Adventure', 'Trekking', 'Winter'], status: 'Draft',
    coverGradient: 'linear-gradient(135deg, #1E293B 0%, #334155 50%, #475569 100%)',
    bookings: 0, rating: 0,
    itineraryHighlights: ['Kaza valley', 'Key Monastery', 'Chandratal Lake frozen trek', 'Kunzum Pass crossing'],
    inclusions: ['Homestay accommodation', 'Winter gear rental', 'Experienced mountaineer guide', 'Meals'],
    description: 'One of India\'s most extreme and beautiful high-altitude winter crossings.',
  },
  {
    id: 'p5', title: 'Kerala Backwaters Serenity', destination: 'Kerala', country: 'India',
    duration: '5D/4N', basePrice: 22000, groupSizeMin: 2, groupSizeMax: 8,
    tags: ['Wellness', 'Nature', 'Boutique'], status: 'Published',
    coverGradient: 'linear-gradient(135deg, #064E3B 0%, #059669 50%, #34D399 100%)',
    bookings: 167, rating: 4.9,
    itineraryHighlights: ['Alleppey houseboat stay', 'Munnar tea estate', 'Ayurveda spa session', 'Periyar wildlife'],
    inclusions: ['Houseboat stay', 'Ayurveda treatments', 'Village cooking class', 'Spice garden tour'],
    description: 'Float through ancient waterways, emerald tea hills, and healing Ayurvedic traditions.',
  },
  {
    id: 'p6', title: 'Rann of Kutch Salt Festival', destination: 'Gujarat', country: 'India',
    duration: '4D/3N', basePrice: 18500, groupSizeMin: 4, groupSizeMax: 25,
    tags: ['Cultural', 'Photography', 'Festival'], status: 'Sold Out',
    coverGradient: 'linear-gradient(135deg, #451A03 0%, #92400E 50%, #D97706 100%)',
    bookings: 380, rating: 4.6,
    itineraryHighlights: ['White salt flats sunrise', 'Rann Utsav tent city', 'Folk music night', 'Handicraft bazaar'],
    inclusions: ['Swiss tent accommodation', 'Cultural shows', 'Local cuisine', 'Photography guide'],
    description: 'The world\'s largest salt desert transforms into a magical white canvas under the full moon.',
  },
];

/* ── Hotel Partners ── */
export const MOCK_HOTELS: MockHotelPartner[] = [
  {
    id: 'h1', name: 'The Leela Goa', city: 'Cavelossim, Goa', state: 'Goa', category: '5-Star Resort',
    stars: 5, commissionRate: 12, contactPerson: 'Rahul D\'souza', contactEmail: 'partnerships@leela.com',
    contactPhone: '+91 832 662 1234', contractStatus: 'ACTIVE', roomsAvailable: 42,
    contractStart: '2024-01-01', contractEnd: '2024-12-31', totalBookings: 284,
    amenities: ['Private Beach', 'Spa', 'Golf Course', 'Multiple Restaurants', 'Pool Villa'],
  },
  {
    id: 'h2', name: 'Umaid Bhawan Palace', city: 'Jodhpur', state: 'Rajasthan', category: 'Heritage Palace',
    stars: 5, commissionRate: 10, contactPerson: 'Preet Singh', contactEmail: 'reservations@tajhotels.com',
    contactPhone: '+91 291 251 0101', contractStatus: 'ACTIVE', roomsAvailable: 18,
    contractStart: '2024-03-01', contractEnd: '2025-02-28', totalBookings: 96,
    amenities: ['Palace Museum', 'Royal Spa', 'Vintage Car Collection', 'Polo Grounds', 'Butler Service'],
  },
  {
    id: 'h3', name: 'Spiti Eco Lodge', city: 'Kaza', state: 'Himachal Pradesh', category: 'Eco-Lodge',
    stars: 3, commissionRate: 18, contactPerson: 'Tenzin Norbu', contactEmail: 'info@spitilodge.com',
    contactPhone: '+91 94181 78234', contractStatus: 'ACTIVE', roomsAvailable: 14,
    contractStart: '2024-04-01', contractEnd: '2024-10-31', totalBookings: 187,
    amenities: ['Mountain Views', 'Solar Power', 'Local Cuisine', 'Trekking Support', 'Camping Equipment'],
  },
  {
    id: 'h4', name: 'Kumarakom Lake Resort', city: 'Kumarakom', state: 'Kerala', category: 'Heritage Villa',
    stars: 5, commissionRate: 14, contactPerson: 'Anitha Nair', contactEmail: 'sales@klresort.com',
    contactPhone: '+91 481 252 5711', contractStatus: 'ACTIVE', roomsAvailable: 29,
    contractStart: '2024-02-15', contractEnd: '2025-02-14', totalBookings: 213,
    amenities: ['Private Jetty', 'Ayurveda Spa', 'Houseboat Rides', 'Yoga Pavilion', 'Organic Farm'],
  },
  {
    id: 'h5', name: 'Zostel Manali', city: 'Manali', state: 'Himachal Pradesh', category: 'Boutique Hostel',
    stars: 3, commissionRate: 20, contactPerson: 'Aditya Kumar', contactEmail: 'manali@zostel.com',
    contactPhone: '+91 98820 45231', contractStatus: 'IN_REVIEW', roomsAvailable: 58,
    contractStart: '2024-06-01', contractEnd: '2025-05-31', totalBookings: 412,
    amenities: ['Common Lounge', 'Mountain View Cafe', 'Trip Desk', 'Bonfire Area', 'Bike Rental'],
  },
  {
    id: 'h6', name: 'Taj Mahal Palace', city: 'Mumbai', state: 'Maharashtra', category: '5-Star Resort',
    stars: 5, commissionRate: 9, contactPerson: 'Kavya Menon', contactEmail: 'reservations.taj@tajhotels.com',
    contactPhone: '+91 22 6665 3366', contractStatus: 'EXPIRED', roomsAvailable: 0,
    contractStart: '2023-01-01', contractEnd: '2023-12-31', totalBookings: 64,
    amenities: ['Gateway Views', 'Multiple Restaurants', 'Luxury Spa', 'Pool', 'Concierge'],
  },
];

/* ── Transactions ── */
export const MOCK_TRANSACTIONS: MockTransaction[] = [
  {
    id: 't1', transactionId: 'TRP-2024-001847', userName: 'Priya Sharma', userEmail: 'priya.sharma@icloud.com',
    tripDestination: 'Uttarakhand', type: 'PRO_TIER_UPGRADE', amount: 19,
    paymentMethod: 'Razorpay UPI', status: 'SUCCESS', timestamp: '2024-04-15T10:23:11Z',
    razorpayOrderId: 'order_OVq2PL9Y3xKa7B', utrReference: 'UTR2024041512345',
  },
  {
    id: 't2', transactionId: 'TRP-2024-001848', userName: 'Arjun Mehta', userEmail: 'arjun.mehta@gmail.com',
    tripDestination: 'Rajasthan', type: 'PRO_TIER_UPGRADE', amount: 19,
    paymentMethod: 'Card', status: 'SUCCESS', timestamp: '2024-04-15T11:45:33Z',
    razorpayOrderId: 'order_OVq3QL0Z4yLb8C',
  },
  {
    id: 't3', transactionId: 'TRP-2024-001849', userName: 'Vikram Singh', userEmail: 'vikram.singh@hotmail.com',
    tripDestination: 'Andaman', type: 'PRO_TIER_UPGRADE', amount: 19,
    paymentMethod: 'NetBanking', status: 'PENDING', timestamp: '2024-04-15T14:12:07Z',
    razorpayOrderId: 'order_OVq4RM1A5zMc9D',
  },
  {
    id: 't4', transactionId: 'TRP-2024-001850', userName: 'Nisha Rao', userEmail: 'nisha.rao@gmail.com',
    tripDestination: 'Kerala', type: 'SETTLEMENT_FEE', amount: 19,
    paymentMethod: 'UPI Direct', status: 'SUCCESS', timestamp: '2024-04-14T09:30:00Z',
    utrReference: 'UTR2024041409876',
  },
  {
    id: 't5', transactionId: 'TRP-2024-001851', userName: 'Mohit Verma', userEmail: 'mohit.v@gmail.com',
    tripDestination: 'Goa', type: 'PRO_TIER_UPGRADE', amount: 19,
    paymentMethod: 'Razorpay UPI', status: 'SUCCESS', timestamp: '2024-04-14T16:55:44Z',
    razorpayOrderId: 'order_OVq5SN2B6aNd0E',
  },
  {
    id: 't6', transactionId: 'TRP-2024-001852', userName: 'Divya Krishnan', userEmail: 'divya.k@gmail.com',
    tripDestination: 'Spiti Valley', type: 'PRO_TIER_UPGRADE', amount: 19,
    paymentMethod: 'Card', status: 'SUCCESS', timestamp: '2024-04-13T12:20:15Z',
  },
  {
    id: 't7', transactionId: 'TRP-2024-001853', userName: 'Karan Joshi', userEmail: 'karan.j@yahoo.com',
    tripDestination: 'Manali', type: 'PRO_TIER_UPGRADE', amount: 19,
    paymentMethod: 'Razorpay UPI', status: 'FAILED', timestamp: '2024-04-13T18:44:22Z',
    razorpayOrderId: 'order_OVq6TO3C7bOe1F',
  },
  {
    id: 't8', transactionId: 'TRP-2024-001854', userName: 'Ananya Desai', userEmail: 'ananya.d@gmail.com',
    tripDestination: 'Andaman', type: 'SETTLEMENT_FEE', amount: 19,
    paymentMethod: 'UPI Direct', status: 'SUCCESS', timestamp: '2024-04-12T08:15:00Z',
  },
  {
    id: 't9', transactionId: 'TRP-2024-001855', userName: 'Rohan Kapoor', userEmail: 'rohan.k@outlook.com',
    tripDestination: 'Coorg', type: 'PRO_TIER_UPGRADE', amount: 19,
    paymentMethod: 'NetBanking', status: 'SUCCESS', timestamp: '2024-04-12T20:30:00Z',
  },
  {
    id: 't10', transactionId: 'TRP-2024-001856', userName: 'Sneha Patel', userEmail: 'sneha.patel@gmail.com',
    tripDestination: 'Rann of Kutch', type: 'REFUND', amount: 19,
    paymentMethod: 'Razorpay UPI', status: 'SUCCESS', timestamp: '2024-04-11T11:00:00Z',
  },
];

/* ── Notifications ── */
export const MOCK_NOTIFICATIONS: MockNotification[] = [
  {
    id: 'n1', title: '✈ New Expeditions Unlocked for April', 
    body: 'Valley of Flowers & Spiti Winter routes are now bookable. Limited slots available — plan your adventure today!',
    audience: 'All Users', deepLink: '/explore', sentAt: '2024-04-10T09:00:00Z',
    sentCount: 18420, openRate: 62.4, status: 'sent',
  },
  {
    id: 'n2', title: 'Pro Tier Now ₹19 — Upgrade Your Group',
    body: 'Organize trips with up to 50 members, advanced analytics, and priority support. Upgrade today for just ₹19.',
    audience: 'Trip Organizers Only', deepLink: '/trips', sentAt: '2024-04-08T08:30:00Z',
    sentCount: 4231, openRate: 78.9, status: 'sent',
  },
  {
    id: 'n3', title: 'Settle Up Before Your Trip Ends',
    body: 'Your group trip is ending in 2 days. Check your unsettled balances and settle up with one tap.',
    audience: 'Active Travelers', deepLink: '/trips', sentAt: '2024-04-05T16:00:00Z',
    sentCount: 8912, openRate: 84.1, status: 'sent',
  },
  {
    id: 'n4', title: 'Weekend Flash Deals — Andaman Packages',
    body: 'Book any Andaman package this weekend and get early bird pricing. Groups of 6+ get 10% off.',
    audience: 'All Users', deepLink: '/explore', sentAt: '2024-04-03T10:00:00Z',
    sentCount: 18420, openRate: 45.6, status: 'sent',
  },
];

/* ── Chart Data ── */
export const MONTHLY_TRIPS_DATA: ChartDataPoint[] = [
  { label: 'Nov', value: 142, secondary: 38 },
  { label: 'Dec', value: 189, secondary: 52 },
  { label: 'Jan', value: 224, secondary: 61 },
  { label: 'Feb', value: 198, secondary: 47 },
  { label: 'Mar', value: 287, secondary: 79 },
  { label: 'Apr', value: 341, secondary: 94 },
];

export const REVENUE_MONTHLY: ChartDataPoint[] = [
  { label: 'Nov', value: 722, secondary: 38 },
  { label: 'Dec', value: 988, secondary: 52 },
  { label: 'Jan', value: 1159, secondary: 61 },
  { label: 'Feb', value: 893, secondary: 47 },
  { label: 'Mar', value: 1501, secondary: 79 },
  { label: 'Apr', value: 1786, secondary: 94 },
];

export const SETTLEMENT_DATA: ChartDataPoint[] = [
  { label: 'Nov', value: 2840 },
  { label: 'Dec', value: 3920 },
  { label: 'Jan', value: 4710 },
  { label: 'Feb', value: 3880 },
  { label: 'Mar', value: 5620 },
  { label: 'Apr', value: 6890 },
];

/* ── Activity Feed ── */
export const ACTIVITY_FEED: ActivityItem[] = [
  {
    id: 'a1', type: 'pro_upgrade', title: 'Pro Tier Upgrade',
    description: 'Divya Krishnan upgraded Spiti Valley expedition to Pro',
    timestamp: '2 minutes ago', userAvatar: 'DK', userColor: '#EA580C', amount: 19,
  },
  {
    id: 'a2', type: 'trip_created', title: 'New Trip Created',
    description: 'Arjun Mehta created "Coorg Coffee Trail — April 2024" with 8 members',
    timestamp: '14 minutes ago', userAvatar: 'AM', userColor: '#2E331B',
  },
  {
    id: 'a3', type: 'expense_settled', title: 'Group Settled',
    description: 'Goa Sunsets group (14 members) completed full ledger settlement',
    timestamp: '1 hour ago', userAvatar: 'MV', userColor: '#9333EA', amount: 128400,
  },
  {
    id: 'a4', type: 'member_joined', title: 'Member Joined',
    description: 'Sneha Patel joined "Rajasthan Royal Circuit" via invite code',
    timestamp: '2 hours ago', userAvatar: 'SP', userColor: '#D97706',
  },
  {
    id: 'a5', type: 'invite_sent', title: 'Invitations Sent',
    description: 'Nisha Rao sent 6 invitations for "Andaman Coral Odyssey"',
    timestamp: '3 hours ago', userAvatar: 'NR', userColor: '#E11D48',
  },
  {
    id: 'a6', type: 'pro_upgrade', title: 'Pro Tier Upgrade',
    description: 'Vikram Singh upgraded Manali Winter Ride to Pro',
    timestamp: '5 hours ago', userAvatar: 'VS', userColor: '#2563EB', amount: 19,
  },
  {
    id: 'a7', type: 'expense_settled', title: 'Group Settled',
    description: 'Uttarakhand Trek group reached ₹0 balance — all settled!',
    timestamp: '8 hours ago', userAvatar: 'RK', userColor: '#059669', amount: 86200,
  },
];
