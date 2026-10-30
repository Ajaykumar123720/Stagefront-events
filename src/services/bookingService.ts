/**
 * StageFront Events — Secure Booking Service
 * 
 * Enforces server-authoritative seat reservation:
 * 1. The browser NEVER directly marks seats as booked or confirmed.
 * 2. Seat holds, locks, confirmations, and cancellations are executed through
 *    trusted Express backend transactions verified with Firebase ID tokens.
 */

import { collection, query, where, getDocs } from 'firebase/firestore';
import {
  BookingRecord,
  CreateBookingRequest,
  RazorpayGatewayStatus,
  RazorpayOrderCreateResponse,
  SeatHoldRequest,
  SeatHoldResponse,
  SeatItem,
} from '../types/api';
import { apiClient } from './apiClient';
import { auth, db, isFirebaseConfigured } from './firebase';
import { userService } from './userService';

export interface IBookingService {
  getRazorpayStatus(): Promise<RazorpayGatewayStatus>;
  createRazorpayOrder(eventId: string, seatIds: string[]): Promise<RazorpayOrderCreateResponse>;
  holdSeats(req: SeatHoldRequest): Promise<SeatHoldResponse>;
  releaseHeldSeats(eventId: string, seatIds: string[]): Promise<boolean>;
  createBooking(req: CreateBookingRequest, seats: SeatItem[]): Promise<BookingRecord>;
  getUserBookings(userId?: string): Promise<BookingRecord[]>;
  getAllBookings(): Promise<BookingRecord[]>;
  getBookingById(id: string): Promise<BookingRecord | null>;
  cancelBooking(bookingId: string): Promise<BookingRecord>;
  calculatePricing(seats: SeatItem[]): {
    subtotal: number;
    convenienceFee: number;
    taxAmount: number;
    totalAmount: number;
    currencyCode: 'INR';
  };
}

class BookingService implements IBookingService {
  public async getRazorpayStatus(): Promise<RazorpayGatewayStatus> {
    try {
      return await apiClient.get<RazorpayGatewayStatus>('/payments/razorpay/status');
    } catch (err: any) {
      return {
        success: false,
        configured: false,
        mode: 'unconfigured',
        keyId: null,
        currency: 'INR',
        message:
          err?.message ||
          'Razorpay Test Mode credentials are not configured on the server. Payments cannot be processed until RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are set.',
      };
    }
  }

  public async createRazorpayOrder(
    eventId: string,
    seatIds: string[]
  ): Promise<RazorpayOrderCreateResponse> {
    return await apiClient.post<RazorpayOrderCreateResponse>('/payments/razorpay/create-order', {
      eventId,
      seatIds,
    });
  }

  public calculatePricing(seats: SeatItem[]) {
    const subtotal = seats.reduce((sum, s) => sum + s.price, 0);
    const convenienceFee = Math.round(subtotal * 0.05 * 100) / 100; // 5% fee
    const taxAmount = Math.round(subtotal * 0.1 * 100) / 100; // 10% GST & surcharge
    const totalAmount = Math.round((subtotal + convenienceFee + taxAmount) * 100) / 100;

    return {
      subtotal,
      convenienceFee,
      taxAmount,
      totalAmount,
      currencyCode: 'INR' as const,
    };
  }

  /**
   * Request an atomic 10-minute hold on selected seats from the backend.
   * Prevents race conditions and double-booking.
   */
  public async holdSeats(req: SeatHoldRequest): Promise<SeatHoldResponse> {
    try {
      const response = await apiClient.post<SeatHoldResponse>('/bookings/hold', {
        eventId: req.eventId,
        seatIds: req.seatIds,
        holdDurationSeconds: req.holdDurationSeconds || 600,
      });

      return response;
    } catch (err: any) {
      console.warn('[StageFront Booking] Backend hold request notice:', err.message);
      return {
        success: false,
        lockId: '',
        heldUntil: '',
        seatsLocked: [],
        failedSeats: req.seatIds,
        message: err.message || 'Unable to hold seats. They may already be reserved by another customer.',
      };
    }
  }

  /**
   * Release held seats
   */
  public async releaseHeldSeats(eventId: string, seatIds: string[]): Promise<boolean> {
    try {
      await apiClient.post('/bookings/release', { eventId, seatIds });
      return true;
    } catch {
      return true;
    }
  }

  /**
   * Complete booking via trusted backend transaction ONLY after verified Razorpay payment.
   * The browser never marks seats as booked directly.
   */
  public async createBooking(
    req: CreateBookingRequest,
    _seats: SeatItem[]
  ): Promise<BookingRecord> {
    try {
      const response = await apiClient.post<{ success: boolean; data: BookingRecord; message?: string }>(
        '/bookings/confirm',
        {
          eventId: req.eventId,
          seatIds: req.seatIds,
          paymentMethod: req.paymentMethod,
          userName: req.userName,
          userEmail: req.userEmail,
          razorpayOrderId: req.razorpayOrderId,
          razorpayPaymentId: req.razorpayPaymentId,
          razorpaySignature: req.razorpaySignature,
          idempotencyKey: req.razorpayPaymentId,
        }
      );

      if (response && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to generate confirmed booking record from backend.');
    } catch (err: any) {
      console.error('[StageFront Booking] Failed to confirm booking on backend:', err);
      throw new Error(err.message || 'Booking confirmation failed. Verified Razorpay payment is required.');
    }
  }

  /**
   * Fetch bookings belonging strictly to the currently authenticated customer.
   * Enforces `where("userId", "==", currentUser.uid)` on direct Firestore queries
   * and verifies that any requested userId matches the authenticated user's UID.
   */
  public async getUserBookings(userId?: string): Promise<BookingRecord[]> {
    const profileUser = userService.getCurrentUser();
    const currentUser = auth?.currentUser || (profileUser ? { uid: profileUser.id } : null);

    if (!currentUser || !currentUser.uid) {
      return [];
    }

    // Never allow a caller to query bookings for a different UID
    if (userId && userId !== currentUser.uid) {
      throw new Error('Forbidden: Cannot query bookings belonging to another user.');
    }

    const bookingsMap = new Map<string, BookingRecord>();

    // 1. Direct Firestore query restricted strictly to the authenticated customer's UID
    if (db && isFirebaseConfigured && auth?.currentUser) {
      try {
        const bookingsQuery = query(
          collection(db, 'bookings'),
          where("userId", "==", currentUser.uid)
        );
        const querySnapshot = await getDocs(bookingsQuery);
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data() as BookingRecord;
          if (data && data.userId === currentUser.uid) {
            bookingsMap.set(docSnap.id, {
              ...data,
              id: data.id || docSnap.id,
            });
          }
        });
      } catch (firestoreErr: any) {
        console.warn('[StageFront Booking] Direct Firestore booking query notice:', firestoreErr.message);
      }
    }

    // 2. Server-verified API query restricted to currentUser.uid
    try {
      const response = await apiClient.get<{ success: boolean; data: BookingRecord[] }>(
        `/bookings/user/${currentUser.uid}`
      );
      const apiBookings = response.data || [];
      for (const booking of apiBookings) {
        if (booking && booking.userId === currentUser.uid) {
          bookingsMap.set(booking.id, booking);
        }
      }
    } catch (err: any) {
      console.warn('[StageFront Booking] Could not fetch bookings from backend:', err.message);
    }

    return Array.from(bookingsMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Fetch all bookings (Admin only — authorized via backend /api/admin/metrics)
   */
  public async getAllBookings(): Promise<BookingRecord[]> {
    try {
      const response = await apiClient.get<{ success: boolean; data: { recentBookings: BookingRecord[] } }>(
        '/admin/metrics'
      );
      return response.data?.recentBookings || [];
    } catch (err: any) {
      console.warn('[StageFront Booking] Could not fetch admin bookings:', err.message);
      return [];
    }
  }

  /**
   * Fetch booking details by ID (restricted to booking owner or admin)
   */
  public async getBookingById(id: string): Promise<BookingRecord | null> {
    const profileUser = userService.getCurrentUser();
    const currentUser = auth?.currentUser || (profileUser ? { uid: profileUser.id } : null);
    if (!currentUser || !currentUser.uid) {
      return null;
    }

    try {
      const response = await apiClient.get<{ success: boolean; data: BookingRecord }>(
        `/bookings/${id}`
      );
      const booking = response.data || null;
      if (!booking) return null;

      // Verify ownership unless user is an authenticated admin
      if (booking.userId !== currentUser.uid && profileUser?.role !== 'admin') {
        return null;
      }
      return booking;
    } catch {
      return null;
    }
  }

  /**
   * Cancel booking and restore seat availability via backend
   */
  public async cancelBooking(bookingId: string): Promise<BookingRecord> {
    const response = await apiClient.post<{ success: boolean; data: BookingRecord }>(
      `/bookings/cancel/${bookingId}`
    );
    if (response && response.data) {
      return response.data;
    }
    throw new Error('Failed to cancel booking.');
  }
}

export const bookingService = new BookingService();
