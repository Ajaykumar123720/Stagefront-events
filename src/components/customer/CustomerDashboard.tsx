import React, { useState } from 'react';
import { UserProfile, BookingRecord, formatINR } from '../../types/api';
import { useCustomerBookings } from '../../hooks/useBooking';
import { TicketPassModal } from './TicketPassModal';
import { downloadTicketPassPng } from './QrTicketGraphic';
import { EmptyState } from '../common/EmptyState';
import { Calendar, MapPin, QrCode, Ticket, AlertCircle, RefreshCw, Clock, AlertTriangle, X, Download } from 'lucide-react';
import { StatusBadge, CategoryBadge } from '../common/StatusBadge';

interface CustomerDashboardProps {
  currentUser: UserProfile;
  onBrowseEvents: () => void;
}

export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({
  currentUser,
  onBrowseEvents,
}) => {
  const { bookings, isLoading, error, cancelBooking, refetch } = useCustomerBookings(currentUser.id);
  const [selectedBooking, setSelectedBooking] = useState<BookingRecord | null>(null);
  const [bookingToCancel, setBookingToCancel] = useState<BookingRecord | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  const activeBookings = bookings.filter((b) => b.status === 'confirmed');
  const pastBookings = bookings.filter((b) => b.status === 'cancelled' || b.status === 'refunded');

  const handleConfirmCancel = async () => {
    if (!bookingToCancel) return;
    setCancellingId(bookingToCancel.id);
    try {
      await cancelBooking(bookingToCancel.id);
      setBookingToCancel(null);
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      
      {/* Profile Header Box */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#356AE6] flex items-center justify-center text-white text-xl font-bold shadow-xs">
            {currentUser.fullName[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#20242C]">{currentUser.fullName}</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-blue-50 text-[#356AE6] border border-blue-200">
                My Bookings
              </span>
            </div>
            <p className="text-xs text-[#687386] mt-0.5">{currentUser.email}</p>
            <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">
              UID: {currentUser.id}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetch()}
            className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 hover:text-[#20242C] transition cursor-pointer"
            title="Refresh bookings"
            aria-label="Refresh bookings"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onBrowseEvents}
            className="px-4 py-2 rounded-lg bg-[#356AE6] hover:bg-[#2A55B8] text-white font-medium text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Ticket className="w-4 h-4" />
            Discover Events
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'upcoming'
              ? 'border-[#356AE6] text-[#356AE6]'
              : 'border-transparent text-[#687386] hover:text-[#20242C]'
          }`}
        >
          <Ticket className="w-4 h-4" />
          Confirmed Tickets ({activeBookings.length})
        </button>

        <button
          onClick={() => setActiveTab('past')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'past'
              ? 'border-[#356AE6] text-[#356AE6]'
              : 'border-transparent text-[#687386] hover:text-[#20242C]'
          }`}
        >
          <Clock className="w-4 h-4" />
          Cancelled &amp; Past ({pastBookings.length})
        </button>
      </div>

      {/* Active Tab: Upcoming Bookings */}
      {activeTab === 'upcoming' && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="p-8 text-center text-[#687386] text-xs">Loading bookings from Firestore...</div>
          ) : activeBookings.length === 0 ? (
            <EmptyState
              type="tickets"
              title="No Confirmed Event Tickets Yet"
              description="You have no active event bookings at this time. Select an event and complete Razorpay Test Mode checkout to generate your QR ticket."
              actionText="Explore Events"
              onAction={onBrowseEvents}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeBookings.map((b) => (
                <div
                  key={b.id}
                  className="p-5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition flex flex-col justify-between space-y-4 shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <CategoryBadge category={b.category} />
                      <StatusBadge status={b.status} />
                    </div>

                    <h3 className="text-base font-bold text-[#20242C] mb-1">
                      {b.eventTitle}
                    </h3>

                    <div className="space-y-1 text-xs text-[#687386]">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(b.eventDate).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{b.venueName}, {b.venueCity}</span>
                      </div>
                    </div>

                    {/* Seat Allocation Pills */}
                    <div className="mt-3.5 pt-3 border-t border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-[#687386] block mb-1.5">
                        Confirmed Seats ({b.seats.length})
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {b.seats.map((seat, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-0.5 rounded bg-slate-50 border border-slate-200 text-xs font-mono font-semibold text-[#20242C]"
                          >
                            Row {seat.row}-{seat.number} ({seat.tier.toUpperCase()} • {formatINR(seat.price)})
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">
                        ID: {b.id} • Paid ({b.currencyCode || 'INR'})
                      </span>
                      <span className="font-mono font-bold text-[#356AE6]">
                        {b.bookingReference} • {formatINR(b.totalAmount, true)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => setBookingToCancel(b)}
                        disabled={cancellingId === b.id}
                        className="px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium transition cursor-pointer text-xs"
                      >
                        Cancel
                      </button>

                      <button
                        onClick={() => downloadTicketPassPng(b)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[#20242C] font-medium flex items-center gap-1.5 transition cursor-pointer text-xs"
                        title="Download QR Ticket PNG"
                      >
                        <Download className="w-3.5 h-3.5 text-[#356AE6]" />
                        Download QR
                      </button>

                      <button
                        onClick={() => setSelectedBooking(b)}
                        className="px-3.5 py-1.5 rounded-lg bg-[#356AE6] hover:bg-[#2A55B8] text-white font-medium flex items-center gap-1.5 transition shadow-2xs cursor-pointer text-xs"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        View QR Ticket
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Inactive / Cancelled Tab */}
      {activeTab === 'past' && (
        <div className="space-y-3">
          {pastBookings.length === 0 ? (
            <div className="p-8 text-center text-[#687386] text-xs bg-white border border-slate-200 rounded-xl">
              No cancelled or past bookings on record.
            </div>
          ) : (
            pastBookings.map((b) => (
              <div
                key={b.id}
                className="p-4 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs text-[#687386] shadow-2xs"
              >
                <div>
                  <span className="font-semibold text-[#20242C] block">{b.eventTitle}</span>
                  <span className="font-mono text-[11px] text-slate-400">
                    Ref: {b.bookingReference} • Seats released to public pool
                  </span>
                </div>
                <StatusBadge status="cancelled" />
              </div>
            ))
          )}
        </div>
      )}

      {/* Ticket Pass Modal */}
      <TicketPassModal
        booking={selectedBooking}
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
      />

      {/* In-App Booking Cancellation Confirmation Modal */}
      {bookingToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <button
                onClick={() => setBookingToCancel(null)}
                disabled={Boolean(cancellingId)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h3 className="text-base font-bold text-[#20242C]">Cancel Ticket Reservation?</h3>
              <p className="text-xs text-[#687386] mt-1 leading-relaxed">
                Are you sure you want to cancel your reservation for{' '}
                <strong className="text-[#20242C]">{bookingToCancel.eventTitle}</strong>?
                The {bookingToCancel.seats.length} reserved seat(s) will be immediately released back to the event inventory.
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Booking Reference:</span>
                <span className="font-mono font-semibold text-[#20242C]">{bookingToCancel.bookingReference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Reserved Seats:</span>
                <span className="font-mono font-semibold text-[#20242C]">
                  {bookingToCancel.seats.map((s) => `${s.row}${s.number}`).join(', ')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Refund Value (INR):</span>
                <span className="font-bold text-emerald-700">{formatINR(bookingToCancel.totalAmount, true)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setBookingToCancel(null)}
                disabled={Boolean(cancellingId)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-xs transition cursor-pointer"
              >
                Keep Booking
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={Boolean(cancellingId)}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                {cancellingId ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Releasing Seats...</span>
                  </>
                ) : (
                  <span>Yes, Cancel Reservation</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
