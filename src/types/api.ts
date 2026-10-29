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
  color: string;
  perks: string[];
}

export interface SeatItem {
  id: string;
  row: string;
  number: number;
  tier: SeatTier;
  price: number;
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
  status: 'confirmed' | 'held' | 'cancelled' | 'refunded';
  paymentMethod: string;
  paymentTransactionId: string;
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
