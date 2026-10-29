import { useState, useEffect, useCallback, useMemo } from 'react';
import { BookingRecord, CreateBookingRequest, SeatItem } from '../types/api';
import { bookingService } from '../services/bookingService';

export function useBooking(eventId?: string) {
  const [selectedSeats, setSelectedSeats] = useState<SeatItem[]>([]);
  const [isHolding, setIsHolding] = useState<boolean>(false);
  const [isCheckingOut, setIsCheckingOut] = useState<boolean>(false);
  const [holdTimerSeconds, setHoldTimerSeconds] = useState<number | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Seat toggle handler
  const toggleSeat = (seat: SeatItem) => {
    if (seat.status === 'booked' || seat.status === 'held') {
      return;
    }

    setSelectedSeats((prev) => {
      const exists = prev.some((s) => s.id === seat.id);
      if (exists) {
        return prev.filter((s) => s.id !== seat.id);
      }
      if (prev.length >= 6) {
        setBookingError('You can select a maximum of 6 seats per reservation.');
        return prev;
      }
      setBookingError(null);
      return [...prev, seat];
    });
  };

  const clearSelection = () => {
    setSelectedSeats([]);
    setHoldTimerSeconds(null);
  };

  // Pricing calculations
  const pricing = useMemo(() => {
    return bookingService.calculatePricing(selectedSeats);
  }, [selectedSeats]);

  // Hold reservation (10 minutes)
  const holdSelectedSeats = async (userId: string) => {
    if (!eventId || selectedSeats.length === 0) return false;
    setIsHolding(true);
    setBookingError(null);
    try {
      const res = await bookingService.holdSeats({
        eventId,
        seatIds: selectedSeats.map((s) => s.id),
        userId,
        holdDurationSeconds: 600,
      });

      if (!res.success) {
        setBookingError(res.message);
        return false;
      }

      setHoldTimerSeconds(600);
      return true;
    } catch (err: unknown) {
      setBookingError(err instanceof Error ? err.message : 'Failed to hold seats');
      return false;
    } finally {
      setIsHolding(false);
    }
  };

  // Complete booking
  const confirmBooking = async (
    req: CreateBookingRequest
  ): Promise<BookingRecord | null> => {
    setIsCheckingOut(true);
    setBookingError(null);
    try {
      const record = await bookingService.createBooking(req, selectedSeats);
      clearSelection();
      return record;
    } catch (err: unknown) {
      setBookingError(err instanceof Error ? err.message : 'Booking failed');
      return null;
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Timer countdown
  useEffect(() => {
    if (holdTimerSeconds === null || holdTimerSeconds <= 0) return;
    const interval = setInterval(() => {
      setHoldTimerSeconds((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [holdTimerSeconds]);

  return {
    selectedSeats,
    toggleSeat,
    clearSelection,
    pricing,
    holdSelectedSeats,
    confirmBooking,
    isHolding,
    isCheckingOut,
    holdTimerSeconds,
    bookingError,
  };
}

export function useCustomerBookings(userId?: string) {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    if (!userId) {
      setBookings([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await bookingService.getUserBookings(userId);
      setBookings(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load booking history');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const cancel = async (bookingId: string) => {
    try {
      await bookingService.cancelBooking(bookingId);
      await fetchBookings();
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to cancel booking');
      return false;
    }
  };

  return {
    bookings,
    isLoading,
    error,
    cancelBooking: cancel,
    refetch: fetchBookings,
  };
}
