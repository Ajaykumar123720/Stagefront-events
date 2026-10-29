import React from 'react';
import { EventCategory, EventStatus, SeatTier } from '../../types/api';

export const CategoryBadge: React.FC<{ category: EventCategory }> = ({ category }) => {
  const styles: Record<EventCategory, { className: string; label: string }> = {
    concert: { className: 'bg-indigo-50 border-indigo-200 text-indigo-700', label: 'Concert' },
    cricket: { className: 'bg-emerald-50 border-emerald-200 text-emerald-700', label: 'Cricket' },
    football: { className: 'bg-sky-50 border-sky-200 text-sky-700', label: 'Football' },
    entertainment: { className: 'bg-amber-50 border-amber-200 text-amber-800', label: 'Comedy & Shows' },
  };

  const current = styles[category] || styles.concert;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold tracking-wide border ${current.className}`}>
      {current.label}
    </span>
  );
};

export const TierBadge: React.FC<{ tier: SeatTier }> = ({ tier }) => {
  const styles: Record<SeatTier, { className: string; label: string }> = {
    vip: { className: 'bg-purple-50 border-purple-200 text-purple-700', label: 'VIP Lounge' },
    platinum: { className: 'bg-blue-50 border-blue-200 text-blue-700', label: 'Platinum' },
    gold: { className: 'bg-amber-50 border-amber-200 text-amber-700', label: 'Gold' },
    silver: { className: 'bg-slate-100 border-slate-200 text-slate-700', label: 'Silver' },
  };

  const current = styles[tier] || styles.silver;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${current.className}`}>
      {current.label}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: EventStatus | 'confirmed' | 'held' | 'cancelled' | 'refunded' }> = ({ status }) => {
  const config: Record<string, { className: string; label: string }> = {
    upcoming: { className: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Upcoming' },
    live: { className: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Live Now' },
    sold_out: { className: 'bg-slate-100 text-slate-600 border-slate-200', label: 'Sold Out' },
    confirmed: { className: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Confirmed' },
    held: { className: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Held' },
    cancelled: { className: 'bg-rose-50 text-rose-700 border-rose-200', label: 'Cancelled' },
    refunded: { className: 'bg-slate-100 text-slate-600 border-slate-200', label: 'Refunded' },
  };

  const item = config[status] || { className: 'bg-slate-100 text-slate-700 border-slate-200', label: status };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${item.className}`}>
      {item.label}
    </span>
  );
};
