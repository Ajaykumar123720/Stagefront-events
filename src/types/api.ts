/**
 * StageFront Events — Domain Model & Backend API Contracts
 * 
 * Defines the standard Request/Response contracts for:
 * 1. Event Management Module
 * 2. Booking & Seating Module
 * 3. User & Authentication Module
 * 4. Admin & Analytics Module
 */

export type EventCategory = 'concert' | 'cricket' | 'football' | 'entertainment';

export type EventStatus = 'upcoming' | 'live' | 'completed' | 'sold_out' | 'cancelled' | 'archived';

export type SeatTier = 'vip' | 'platinum' | 'gold' | 'silver';

export type SeatStatus = 'available' | 'selected' | 'held' | 'booked';

export type UserRole = 'customer' | 'admin' | 'organizer';

export type CurrencyCode = 'INR';

/**
 * Formats a numeric INR amount using the Indian Rupee symbol (₹) and en-IN number grouping.
 */
export function formatINR(amount: number, includeDecimals = false): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const hasFraction = Math.round(safeAmount * 100) % 100 !== 0;
  const formatted = safeAmount.toLocaleString('en-IN', {
    minimumFractionDigits: includeDecimals || hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return `₹${formatted}`;
}

export interface VenueInfo {
  id: string;
  name: string;
  city: string;
  address: string;
  capacity: number;
  layoutType: 'arena' | 'stadium' | 'auditorium';
}

export interface SeatTierConfig {
  tier: SeatTier;
  label: string;
  price: number;
  currencyCode?: CurrencyCode;
  color: string;
  perks: string[];
}

export interface SeatItem {
  id: string;
  row: string;
  number: number;
  tier: SeatTier;
  price: number;
  currencyCode?: CurrencyCode;
  status: SeatStatus;
  heldBy?: string;
  heldUntil?: string; // ISO string for seat lock expiry
}

export interface EventItem {
  id: string;
  title: string;
  subtitle: string;
  category: EventCategory;
  bannerUrl: string;
  thumbnailUrl: string;
  venue: VenueInfo;
  dateTime: string;
  doorTime: string;
  status: EventStatus;
  priceStartingFrom: number;
  currencyCode?: CurrencyCode;
  tags: string[];
  artistOrTeams: string[];
  description: string;
  totalSeats: number;
  availableSeats: number;
  tierConfigs: SeatTierConfig[];
  isFeatured?: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
}

export interface BookingTicketSeat {
  seatId: string;
  row: string;
  number: number;
  tier: SeatTier;
  price: number;
  currencyCode?: CurrencyCode;
}

export interface BookingRecord {
  id: string;
  bookingReference: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  venueName: string;
  venueCity: string;
  category: EventCategory;
  bannerUrl: string;
  userId: string;
  userName: string;
  userEmail: string;
  seats: BookingTicketSeat[];
  subtotal: number;
  convenienceFee: number;
  taxAmount: number;
  totalAmount: number;
  currencyCode?: CurrencyCode;
  status: 'confirmed' | 'held' | 'cancelled' | 'refunded';
  paymentMethod: string;
  paymentTransactionId: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAt: string;
  qrCodeToken: string;
}

export interface EventFilterQuery {
  searchQuery?: string;
  category?: EventCategory | 'all';
  city?: string;
  dateRange?: 'all' | 'today' | 'weekend' | 'month';
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'date_asc' | 'price_asc' | 'price_desc' | 'popularity';
}

export interface SeatHoldRequest {
  eventId: string;
  seatIds: string[];
  userId: string;
  holdDurationSeconds?: number;
}

export interface SeatHoldResponse {
  success: boolean;
  lockId: string;
  heldUntil: string;
  seatsLocked: string[];
  failedSeats: string[];
  message: string;
}

export interface CreateBookingRequest {
  eventId: string;
  userId: string;
  userEmail: string;
  userName: string;
  seatIds: string[];
  paymentMethod: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
}

export interface RazorpayGatewayStatus {
  success: boolean;
  configured: boolean;
  mode: 'test' | 'unconfigured' | 'live_blocked';
  keyId: string | null;
  currency: CurrencyCode;
  message: string;
}

export interface RazorpayOrderCreateResponse {
  success: boolean;
  keyId: string;
  orderId: string;
  amount: number;
  currency: CurrencyCode;
  totalAmountINR: number;
  eventTitle: string;
}

export interface AdminAnalyticsMetrics {
  totalRevenue: number;
  totalBookings: number;
  totalTicketsSold: number;
  averageTicketValue: number;
  occupancyRate: number;
  activeEventsCount: number;
  totalEvents?: number;
  registeredCustomers?: number;
  availableSeats?: number;
  bookedSeats?: number;
  categorySalesDistribution: { category: EventCategory; count: number; revenue: number }[];
  recentBookings: BookingRecord[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
  error?: string;
}
