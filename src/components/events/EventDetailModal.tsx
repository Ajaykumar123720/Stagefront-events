import React from 'react';
import { EventItem, formatINR } from '../../types/api';
import { X, Calendar, MapPin, Clock, Armchair, ShieldCheck, Users, Tag } from 'lucide-react';
import { CategoryBadge, TierBadge } from '../common/StatusBadge';

interface EventDetailModalProps {
  event: EventItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectSeats: (event: EventItem) => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event,
  isOpen,
  onClose,
  onSelectSeats,
}) => {
  if (!isOpen || !event) return null;

  const dateFormatted = new Date(event.dateTime).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const timeFormatted = new Date(event.dateTime).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Banner with Close */}
        <div className="relative h-64 w-full overflow-hidden shrink-0 bg-slate-900">
          <img
            src={event.bannerUrl}
            alt={event.title}
            className="w-full h-full object-cover filter brightness-[0.8]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/30" />
          
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition backdrop-blur-xs cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="absolute bottom-5 left-6 right-6">
            <div className="flex items-center gap-2 mb-2">
              <CategoryBadge category={event.category} />
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                {event.availableSeats} of {event.totalSeats} seats available
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight">
              {event.title}
            </h2>
            <p className="text-slate-200 text-xs mt-0.5">{event.subtitle}</p>
          </div>
        </div>

        {/* Scrollable Details */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-[#20242C] text-xs">
          
          {/* Schedule Info Box */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 text-[#356AE6] border border-blue-100">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-[#687386] font-semibold">Date &amp; Time</span>
                <span className="text-xs font-bold text-[#20242C]">{dateFormatted}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 text-[#356AE6] border border-blue-100">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-[#687386] font-semibold">Doors &amp; Show</span>
                <span className="text-xs font-bold text-[#20242C]">{event.doorTime} (Show: {timeFormatted})</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 text-[#356AE6] border border-blue-100">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-[#687386] font-semibold">Venue</span>
                <span className="text-xs font-bold text-[#20242C] truncate max-w-[150px] block">{event.venue.name}</span>
              </div>
            </div>
          </div>

          {/* About Event */}
          <div>
            <h4 className="text-xs font-bold text-[#20242C] uppercase tracking-wider mb-2">About This Event</h4>
            <p className="text-[#687386] leading-relaxed text-xs">
              {event.description}
            </p>
          </div>

          {/* Line-up / Teams */}
          <div>
            <h4 className="text-xs font-bold text-[#20242C] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#356AE6]" />
              Featured Artists / Teams
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {event.artistOrTeams.map((artist, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-md bg-slate-50 border border-slate-200 text-xs text-[#20242C] font-medium"
                >
                  {artist}
                </span>
              ))}
            </div>
          </div>

          {/* Pricing Tiers & Capacity */}
          <div>
            <h4 className="text-xs font-bold text-[#20242C] uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[#356AE6]" />
              Ticket Tiers &amp; Pricing
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {event.tierConfigs.map((tier) => (
                <div
                  key={tier.tier}
                  className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-2">
                    <TierBadge tier={tier.tier} />
                    <span className="text-sm font-bold text-[#20242C]">{formatINR(tier.price)}</span>
                  </div>
                  <ul className="text-[11px] text-[#687386] space-y-1">
                    {tier.perks.map((perk, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-[#356AE6]" />
                        {perk}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Policy & Terms */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3 text-xs text-[#687386]">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-[#20242C] block mb-0.5">Verified Ticket Policy</span>
              Official tickets with instant digital boarding pass issuance. Seat reservations remain locked during checkout to ensure you get your selected row and number.
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
          <div>
            <span className="text-[11px] text-[#687386] block">Starting From</span>
            <span className="text-lg font-bold text-[#20242C]">{formatINR(event.priceStartingFrom)}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-[#687386] hover:text-[#20242C] text-xs font-medium transition cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={() => {
                onClose();
                onSelectSeats(event);
              }}
              className="px-5 py-2 rounded-lg bg-[#356AE6] hover:bg-[#2A55B8] text-white font-semibold text-xs shadow-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Armchair className="w-3.5 h-3.5" />
              Select Seats
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
