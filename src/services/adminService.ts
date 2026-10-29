import { AdminAnalyticsMetrics, BookingRecord, EventCategory } from '../types/api';
import { eventService } from './eventService';
import { bookingService } from './bookingService';
import { apiClient } from './apiClient';

export interface IAdminService {
  getAnalytics(): Promise<AdminAnalyticsMetrics>;
  getEventBookings(eventId: string): Promise<BookingRecord[]>;
  generateManifestCsv(eventId: string): Promise<string>;
}

class AdminService implements IAdminService {
  public async getAnalytics(): Promise<AdminAnalyticsMetrics> {
    try {
      const res = await apiClient.get<{ success: boolean; data: AdminAnalyticsMetrics }>('/admin/metrics');
      if (res && res.data) {
        return res.data;
      }
    } catch {
      // fallback to client-side derivation
    }

    const [events, allBookings] = await Promise.all([
      eventService.getEvents(),
      bookingService.getAllBookings(),
    ]);

    const confirmedBookings = allBookings.filter((b) => b.status === 'confirmed');

    const totalRevenue = confirmedBookings.reduce((sum, b) => sum + b.totalAmount, 0);
    const totalTicketsSold = confirmedBookings.reduce((sum, b) => sum + b.seats.length, 0);
    const totalBookings = confirmedBookings.length;
    const averageTicketValue = totalTicketsSold > 0 ? Math.round((totalRevenue / totalTicketsSold) * 100) / 100 : 0;

    const totalCapacity = events.reduce((sum, e) => sum + e.totalSeats, 0);
    const totalBookedSeats = events.reduce((sum, e) => sum + (e.totalSeats - e.availableSeats), 0);
    const occupancyRate = totalCapacity > 0 ? Math.round((totalBookedSeats / totalCapacity) * 100) : 0;

    const categories: EventCategory[] = ['concert', 'cricket', 'football', 'entertainment'];
    const categorySalesDistribution = categories.map((cat) => {
      const catBookings = confirmedBookings.filter((b) => b.category === cat);
      const rev = catBookings.reduce((sum, b) => sum + b.totalAmount, 0);
      const count = catBookings.reduce((sum, b) => sum + b.seats.length, 0);
      return { category: cat, count, revenue: rev };
    });

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalBookings,
      totalTicketsSold,
      averageTicketValue,
      occupancyRate,
      activeEventsCount: events.length,
      categorySalesDistribution,
      recentBookings: allBookings.slice(0, 8),
    };
  }

  public async getEventBookings(eventId: string): Promise<BookingRecord[]> {
    await apiClient.delay(100);
    const all = await bookingService.getAllBookings();
    return all.filter((b) => b.eventId === eventId);
  }

  public async generateManifestCsv(eventId: string): Promise<string> {
    const bookings = await this.getEventBookings(eventId);
    const headers = ['Booking ID', 'Customer Name', 'Email', 'Seats', 'Tier', 'Total Paid', 'Status', 'Date'];
    const rows = bookings.map((b) => [
      b.bookingReference,
      `"${b.userName}"`,
      b.userEmail,
      `"${b.seats.map((s) => `${s.row}${s.number}`).join(', ')}"`,
      b.seats[0]?.tier || 'general',
      `$${b.totalAmount}`,
      b.status,
      b.createdAt,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}

export const adminService = new AdminService();
