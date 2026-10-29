import React, { useState, useEffect } from 'react';
import { EventItem } from '../../types/api';
import { Calendar, MapPin, ChevronRight, ChevronLeft, ArrowRight } from 'lucide-react';
import { CategoryBadge } from '../common/StatusBadge';

interface EventHeroProps {
  featuredEvents: EventItem[];
  onSelectEvent: (event: EventItem) => void;
  onBookSeats: (event: EventItem) => void;
  onExploreAll?: () => void;
}

export const EventHero: React.FC<EventHeroProps> = ({
  featuredEvents,
  onSelectEvent,
  onBookSeats,
  onExploreAll,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (featuredEvents.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featuredEvents.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [featuredEvents.length]);

  if (!featuredEvents || featuredEvents.length === 0) {
    return null;
  }

  const current = featuredEvents[currentIndex];
  const dateFormatted = new Date(current.dateTime).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-200/60 shadow-md">
      {/* Background Photography with Editorial Contrast Treatment */}
      <div className="relative h-[380px] sm:h-[420px] md:h-[460px] w-full overflow-hidden">
        <img
          src={current.bannerUrl}
          alt={current.title}
          className="w-full h-full object-cover object-center filter brightness-[0.75] contrast-[1.05] transition-transform duration-700 ease-out"
        />
        {/* Cinematic gradient overlays for guaranteed text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/40 to-transparent" />
      </div>

      {/* Editorial Content */}
      <div className="absolute inset-0 p-6 sm:p-10 md:p-12 flex flex-col justify-end z-10 max-w-3xl">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <CategoryBadge category={current.category} />
          <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-white/90 text-[#20242C] shadow-xs">
            From ${current.priceStartingFrom}
          </span>
          <span className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-black/40 text-slate-200 border border-white/20 backdrop-blur-xs">
            {current.availableSeats} tickets left
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight mb-2">
          {current.title}
        </h1>

        <p className="text-slate-200 text-xs sm:text-sm line-clamp-2 mb-4 font-normal max-w-2xl text-shadow-xs">
          {current.subtitle} — {current.description}
        </p>

        <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-200 mb-6">
          <div className="flex items-center gap-1.5 font-medium">
            <Calendar className="w-4 h-4 text-white" />
            <span>{dateFormatted} • {current.doorTime} Doors</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <MapPin className="w-4 h-4 text-white" />
            <span>{current.venue.name}, {current.venue.city}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => onBookSeats(current)}
            className="px-5 py-2.5 rounded-lg bg-[#356AE6] hover:bg-[#2A55B8] text-white font-semibold text-xs sm:text-sm shadow-xs flex items-center gap-2 transition cursor-pointer"
          >
            <span>Book Seats</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => onSelectEvent(current)}
            className="px-4 py-2.5 rounded-lg bg-white/90 hover:bg-white text-[#20242C] font-semibold text-xs sm:text-sm shadow-xs backdrop-blur-xs transition cursor-pointer"
          >
            View Details
          </button>

          {onExploreAll && (
            <button
              onClick={onExploreAll}
              className="px-3 py-2 text-slate-300 hover:text-white text-xs font-medium transition cursor-pointer"
            >
              Explore All Events ↓
            </button>
          )}
        </div>
      </div>

      {/* Slide Navigation Controls */}
      {featuredEvents.length > 1 && (
        <div className="absolute bottom-6 right-6 z-20 flex items-center gap-2">
          <button
            onClick={() =>
              setCurrentIndex((prev) => (prev - 1 + featuredEvents.length) % featuredEvents.length)
            }
            className="p-2 rounded-lg bg-black/40 hover:bg-black/60 text-white border border-white/20 transition cursor-pointer backdrop-blur-xs"
            aria-label="Previous featured event"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex gap-1.5 px-1">
            {featuredEvents.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Jump to slide ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentIndex ? 'w-6 bg-white' : 'w-2 bg-white/40'
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => setCurrentIndex((prev) => (prev + 1) % featuredEvents.length)}
            className="p-2 rounded-lg bg-black/40 hover:bg-black/60 text-white border border-white/20 transition cursor-pointer backdrop-blur-xs"
            aria-label="Next featured event"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
