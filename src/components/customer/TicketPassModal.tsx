import React from 'react';
import { BookingRecord } from '../../types/api';
import { X, Calendar, MapPin, QrCode, Printer, CheckCircle2, Ticket } from 'lucide-react';
import { CategoryBadge } from '../common/StatusBadge';

interface TicketPassModalProps {
  booking: BookingRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TicketPassModal: React.FC<TicketPassModalProps> = ({
  booking,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !booking) return null;

  const dateFormatted = new Date(booking.eventDate).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Top Bar */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#356AE6]">
            <Ticket className="w-4 h-4" />
            <span>Official StageFront Pass</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-[#20242C] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Boarding Pass Container */}
        <div className="p-6">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            
            {/* Pass Artwork Header */}
            <div className="relative h-28 w-full overflow-hidden bg-slate-900">
              <img
                src={booking.bannerUrl}
                alt={booking.eventTitle}
                className="w-full h-full object-cover filter brightness-[0.8]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute top-3 left-3">
                <CategoryBadge category={booking.category} />
              </div>
              <div className="absolute bottom-2 left-4 right-4">
                <h3 className="text-base font-bold text-white truncate">
                  {booking.eventTitle}
                </h3>
              </div>
            </div>

            {/* Pass Body Content */}
            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#687386] block">Date &amp; Time</span>
                  <div className="flex items-center gap-1.5 text-[#20242C] font-semibold mt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-[#356AE6]" />
                    <span>{dateFormatted}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-[#687386] block">Venue</span>
                  <div className="flex items-center gap-1.5 text-[#20242C] font-semibold mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-[#356AE6]" />
                    <span className="truncate">{booking.venueName}</span>
                  </div>
                </div>
              </div>

              {/* Reserved Seats List */}
              <div>
                <span className="text-[10px] uppercase font-bold text-[#687386] block mb-1.5">
                  Seat Allocation
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {booking.seats.map((seat, i) => (
                    <div
                      key={i}
                      className="px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-xs font-mono font-bold text-[#356AE6]"
                    >
                      Row {seat.row} • Seat {seat.number} ({seat.tier.toUpperCase()})
                    </div>
                  ))}
                </div>
              </div>

              {/* Attendee Info */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#687386] block">Pass Holder</span>
                  <span className="font-semibold text-[#20242C]">{booking.userName}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#687386] block">Booking Reference</span>
                  <span className="font-mono font-bold text-[#356AE6]">{booking.bookingReference}</span>
                </div>
              </div>

              {/* Perforation Line */}
              <div className="relative py-2 flex items-center justify-between">
                <div className="w-4 h-8 bg-slate-50 rounded-r-full -ml-6 border-r border-slate-200" />
                <div className="flex-1 border-t-2 border-dashed border-slate-200 mx-2" />
                <div className="w-4 h-8 bg-slate-50 rounded-l-full -mr-6 border-l border-slate-200" />
              </div>

              {/* Digital QR Token Section */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Admit {booking.seats.length} Person(s)</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#687386] block truncate max-w-[200px]">
                    {booking.qrCodeToken}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Scan at gate turnstile for entry
                  </span>
                </div>

                <div className="p-1.5 bg-white rounded border border-slate-200 shrink-0 shadow-2xs">
                  <QrCode className="w-14 h-14 text-[#20242C]" />
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Action Bottom */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 text-xs">
          <span className="text-[11px] text-[#687386] font-mono">
            TXN: {booking.paymentTransactionId}
          </span>
          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-lg bg-[#356AE6] hover:bg-[#2A55B8] text-white font-medium text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Ticket
          </button>
        </div>

      </div>
    </div>
  );
};
