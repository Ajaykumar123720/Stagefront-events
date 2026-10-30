import React from 'react';
import { BookingRecord, formatINR } from '../../types/api';
import { QrTicketGraphic, downloadTicketPassPng } from './QrTicketGraphic';
import { CategoryBadge, TierBadge } from '../common/StatusBadge';
import {
  CheckCircle2,
  Download,
  Ticket,
  Calendar,
  MapPin,
  ShieldCheck,
  ArrowRight,
  Printer,
  Sparkles,
} from 'lucide-react';

interface BookingSuccessViewProps {
  booking: BookingRecord;
  onViewPassModal: (booking: BookingRecord) => void;
  onGoToMyBookings: () => void;
  onBrowseEvents: () => void;
}

export const BookingSuccessView: React.FC<BookingSuccessViewProps> = ({
  booking,
  onViewPassModal,
  onGoToMyBookings,
  onBrowseEvents,
}) => {
  const formattedDate = new Date(booking.eventDate).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fadeIn">
      {/* Top Success Banner */}
      <div className="p-6 rounded-2xl bg-emerald-50/90 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold text-emerald-950">
                Booking Successful!
              </h1>
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                Verified Razorpay Payment • INR
              </span>
            </div>
            <p className="text-xs text-emerald-800 mt-1">
              Your payment signature has been verified, your seats are marked as booked, and your confirmed ticket is saved in Firestore under <strong>My Bookings</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => downloadTicketPassPng(booking)}
            className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs flex items-center gap-2 shadow-xs transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download QR Ticket</span>
          </button>
        </div>
      </div>

      {/* Main Ticket Pass & QR Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Event Artwork Header */}
        <div className="relative h-40 w-full bg-slate-900 overflow-hidden">
          <img
            src={booking.bannerUrl}
            alt={booking.eventTitle}
            className="w-full h-full object-cover brightness-75"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
          <div className="absolute top-4 left-5 flex items-center gap-2">
            <CategoryBadge category={booking.category} />
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-white/90 text-[#20242C]">
              Ref: {booking.bookingReference}
            </span>
          </div>
          <div className="absolute bottom-4 left-5 right-5 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                {booking.eventTitle}
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-200 mt-1">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-300" />
                  {formattedDate}
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-300" />
                  {booking.venueName}, {booking.venueCity}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Two-Column Ticket Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          {/* Left 8 Cols: Booking Metadata, Seats & INR Breakdown */}
          <div className="lg:col-span-8 p-6 space-y-5 text-xs">
            {/* Identifiers Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#687386] block">
                  Booking Reference
                </span>
                <span className="font-mono font-bold text-[#356AE6] text-xs mt-0.5 block">
                  {booking.bookingReference}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#687386] block">
                  Unique Booking ID
                </span>
                <span className="font-mono font-semibold text-[#20242C] text-xs mt-0.5 block truncate">
                  {booking.id}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#687386] block">
                  Razorpay Order ID
                </span>
                <span className="font-mono font-semibold text-[#20242C] text-xs mt-0.5 block truncate">
                  {booking.razorpayOrderId || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#687386] block">
                  Razorpay Payment ID
                </span>
                <span className="font-mono font-semibold text-emerald-700 text-xs mt-0.5 block truncate">
                  {booking.razorpayPaymentId || booking.paymentTransactionId}
                </span>
              </div>
            </div>

            {/* Pass Holder Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-[#687386] block">
                  Pass Holder Name
                </span>
                <span className="font-semibold text-[#20242C] mt-0.5 block">
                  {booking.userName}
                </span>
              </div>
              <div className="p-3 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-[#687386] block">
                  Registered Email
                </span>
                <span className="font-semibold text-[#20242C] mt-0.5 block truncate">
                  {booking.userEmail}
                </span>
              </div>
              <div className="p-3 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-[#687386] block">
                  Payment Method
                </span>
                <span className="font-semibold text-[#20242C] mt-0.5 block truncate">
                  {booking.paymentMethod}
                </span>
              </div>
            </div>

            {/* Confirmed Seats Table */}
            <div>
              <span className="text-[11px] uppercase font-bold tracking-wider text-[#687386] block mb-2">
                Confirmed Seats ({booking.seats.length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {booking.seats.map((seat) => (
                  <div
                    key={seat.seatId}
                    className="p-3 rounded-xl bg-blue-50/50 border border-blue-200/80 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-[#356AE6] text-white font-mono font-bold text-xs flex items-center justify-center">
                        {seat.row}{seat.number}
                      </span>
                      <div>
                        <span className="font-bold text-[#20242C] block">
                          Row {seat.row}, Seat {seat.number}
                        </span>
                        <TierBadge tier={seat.tier} />
                      </div>
                    </div>
                    <span className="font-mono font-bold text-[#356AE6] text-xs">
                      {formatINR(seat.price)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* INR Financial Breakdown */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex justify-between text-[#687386]">
                <span>Tickets Subtotal ({booking.seats.length} {booking.seats.length === 1 ? 'seat' : 'seats'})</span>
                <span className="font-mono text-[#20242C]">{formatINR(booking.subtotal, true)}</span>
              </div>
              <div className="flex justify-between text-[#687386]">
                <span>Convenience Fee (5%)</span>
                <span className="font-mono text-[#20242C]">{formatINR(booking.convenienceFee, true)}</span>
              </div>
              <div className="flex justify-between text-[#687386]">
                <span>GST (10%)</span>
                <span className="font-mono text-[#20242C]">{formatINR(booking.taxAmount, true)}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm">
                <span className="font-bold text-[#20242C]">Total Amount Paid (INR)</span>
                <span className="font-mono font-extrabold text-base text-[#356AE6]">
                  {formatINR(booking.totalAmount, true)}
                </span>
              </div>
            </div>
          </div>

          {/* Right 4 Cols: Scannable QR Ticket Stub */}
          <div className="lg:col-span-4 p-6 bg-slate-50/60 flex flex-col items-center justify-between text-center space-y-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Admit {booking.seats.length} {booking.seats.length === 1 ? 'Guest' : 'Guests'}</span>
              </div>
              <h3 className="text-sm font-bold text-[#20242C] pt-1">
                Unique Gate Entry QR Code
              </h3>
              <p className="text-[11px] text-[#687386]">
                Present this QR code at the venue entrance for turnstile verification
              </p>
            </div>

            <QrTicketGraphic booking={booking} size={175} />

            <div className="w-full p-2.5 rounded-lg bg-white border border-slate-200 text-left">
              <span className="text-[10px] uppercase font-bold text-[#687386] block">
                Cryptographic QR Token
              </span>
              <span className="font-mono text-[11px] font-semibold text-[#20242C] break-all block mt-0.5">
                {booking.qrCodeToken}
              </span>
            </div>

            <div className="w-full space-y-2 pt-1">
              <button
                onClick={() => downloadTicketPassPng(booking)}
                className="w-full py-2.5 px-4 rounded-xl bg-[#356AE6] hover:bg-[#2A55B8] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download QR Ticket (PNG)</span>
              </button>

              <button
                onClick={() => onViewPassModal(booking)}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-[#20242C] border border-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Printer className="w-4 h-4 text-[#356AE6]" />
                <span>Open Printable Ticket Pass</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
        <div className="flex items-center gap-2 text-xs text-[#687386]">
          <Sparkles className="w-4 h-4 text-[#356AE6]" />
          <span>Your booking is permanently accessible anytime in your customer dashboard.</span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            onClick={onBrowseEvents}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-[#20242C] transition cursor-pointer"
          >
            Browse More Events
          </button>
          <button
            onClick={onGoToMyBookings}
            className="px-4 py-2 rounded-xl bg-[#20242C] hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>View in My Bookings</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
