import React from 'react';
import { EventItem, formatINR } from '../../types/api';
import { Calendar, MapPin, ArrowRight } from 'lucide-react';
import { CategoryBadge } from '../common/StatusBadge';

interface EventCardProps {
  event: EventItem;
  onSelect: (event: EventItem) => void;
  onBookSeats: (event: EventItem) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onSelect, onBookSeats }) => {
  const dateFormatted = new Date(event.dateTime).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  });

  const timeFormatted = new Date(event.dateTime).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="group bg-white border border-slate-200/90 hover:border-slate-300 rounded-xl overflow-hidden transition-all duration-200 flex flex-col shadow-xs hover:shadow-sm">
      {/* Event Photography Banner */}
      <div className="relative h-48 w-full overflow-hidden bg-slate-100">
        <img
          src={event.bannerUrl}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-80" />
        
        {/* Category Pill */}
        <div className="absolute top-3 left-3">
          <CategoryBadge category={event.category} />
        </div>

        {/* Starting Price Pill */}
        <div className="absolute top-3 right-3">
          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-white text-[#20242C] shadow-xs">
            From {formatINR(event.priceStartingFrom)}
          </span>
        </div>

        {/* Date chip */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-xs font-medium text-white bg-black/60 px-2.5 py-1 rounded-md backdrop-blur-xs">
          <Calendar className="w-3.5 h-3.5" />
          <span>{dateFormatted} • {timeFormatted}</span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <h3 className="text-base font-bold text-[#20242C] group-hover:text-[#356AE6] transition line-clamp-1">
            {event.title}
          </h3>
          <p className="text-xs text-[#687386] line-clamp-1 mt-0.5">
            {event.subtitle}
          </p>

          <div className="flex items-center gap-1.5 text-xs text-[#687386] mt-3">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{event.venue.name}, {event.venue.city}</span>
          </div>

          {/* Clean availability pill */}
          <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-[#687386]">Availability</span>
            <span className={`font-semibold ${event.availableSeats < 50 ? 'text-amber-700' : 'text-emerald-700'}`}>
              {event.availableSeats} of {event.totalSeats} seats
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-2 flex items-center gap-2">
          <button
            onClick={() => onBookSeats(event)}
            className="flex-1 py-2 px-3 rounded-lg bg-[#356AE6] hover:bg-[#2A55B8] text-white font-medium text-xs flex items-center justify-center gap-1.5 transition shadow-2xs cursor-pointer"
          >
            <span>Select Seats</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onSelect(event)}
            className="py-2 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 text-[#20242C] font-medium text-xs border border-slate-200 transition cursor-pointer"
          >
            View Event
          </button>
        </div>
      </div>
    </div>
  );
};
