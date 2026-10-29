import React from 'react';

export const EventCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-xs animate-pulse">
      <div className="h-52 bg-slate-100 w-full" />
      <div className="p-5 space-y-3">
        <div className="flex gap-2">
          <div className="h-4 w-18 bg-slate-100 rounded" />
          <div className="h-4 w-14 bg-slate-100 rounded" />
        </div>
        <div className="h-5 w-3/4 bg-slate-100 rounded" />
        <div className="h-4 w-1/2 bg-slate-100 rounded" />
        <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
          <div className="h-5 w-20 bg-slate-100 rounded" />
          <div className="h-8 w-24 bg-slate-100 rounded-lg" />
        </div>
      </div>
    </div>
  );
};

export const SeatingChartSkeleton: React.FC = () => {
  return (
    <div className="p-8 bg-white border border-slate-200 rounded-xl animate-pulse space-y-6">
      <div className="h-8 bg-slate-100 rounded-lg w-1/3 mx-auto" />
      <div className="grid grid-cols-10 gap-2.5 max-w-xl mx-auto py-6">
        {Array.from({ length: 50 }).map((_, i) => (
          <div key={i} className="h-7 w-7 bg-slate-100 rounded-md mx-auto" />
        ))}
      </div>
      <div className="h-10 bg-slate-100 rounded-lg w-2/3 mx-auto" />
    </div>
  );
};
