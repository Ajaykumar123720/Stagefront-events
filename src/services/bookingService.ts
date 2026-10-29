/**
 * StageFront Events — Secure Booking Service
 * 
 * Enforces server-authoritative seat reservation:
 * 1. The browser NEVER directly marks seats as booked or confirmed.
 * 2. Seat holds, locks, confirmations, and cancellations are executed through
 *    trusted Express backend transactions verified with Firebase ID tokens.
 */

import {
  BookingRecord,
  CreateBookingRequest,
  SeatHoldRequest,
  SeatHoldResponse,
  SeatItem,
} from '../types/api';
import { apiClient } from './apiClient';

export interface IBookingService {
  holdSeats(req: SeatHoldRequest): Promise<SeatHoldResponse>;
  releaseHeldSeats(eventId: string, seatIds: string[]): Promise<boolean>;
  createBooking(req: CreateBookingRequest, seats: SeatItem[]): Promise<BookingRecord>;
  getUserBookings(userId: string): Promise<BookingRecord[]>;
  getAllBookings(): Promise<BookingRecord[]>;
  getBookingById(id: string): Promise<BookingRecord | null>;
  cancelBooking(bookingId: string): Promise<BookingRecord>;
  calculatePricing(seats: SeatItem[]): {
    subtotal: number;
    convenienceFee: number;
    taxAmount: number;
    totalAmount: number;
  };
}

class BookingService implements IBookingService {
  public calculatePricing(seats: SeatItem[]) {
    const subtotal = seats.reduce((sum, s) => sum + s.price, 0);
    const convenienceFee = Math.round(subtotal * 0.05 * 100) / 100; // 5% fee
    const taxAmount = Math.round(subtotal * 0.1 * 100) / 100; // 10% tax
    const totalAmount = Math.round((subtotal + convenienceFee + taxAmount) * 100) / 100;

    return {
      subtotal,
      convenienceFee,
      taxAmount,
      totalAmount,
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
   * Complete booking via trusted backend transaction.
   * The browser never marks seats as booked directly.
   */
  public async createBooking(
    req: CreateBookingRequest,
    seats: SeatItem[]
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
        }
      );

      if (response && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to generate confirmed booking record from backend.');
    } catch (err: any) {
      console.error('[StageFront Booking] Failed to confirm booking on backend:', err);
      throw new Error(err.message || 'Booking confirmation failed. Your seats may have expired or were taken.');
    }
  }

  /**
   * Fetch bookings belonging to the authenticated user from the backend
   */
  public async getUserBookings(userId: string): Promise<BookingRecord[]> {
    if (!userId) return [];
    try {
      const response = await apiClient.get<{ success: boolean; data: BookingRecord[] }>(
        `/bookings/user/${userId}`
      );
      return response.data || [];
    } catch (err: any) {
      console.warn('[StageFront Booking] Could not fetch bookings from backend:', err.message);
      return [];
    }
  }

  /**
   * Fetch all bookings (Admin only)
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
   * Fetch booking details by ID
   */
  public async getBookingById(id: string): Promise<BookingRecord | null> {
    try {
      const response = await apiClient.get<{ success: boolean; data: BookingRecord }>(
        `/bookings/${id}`
      );
      return response.data || null;
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
