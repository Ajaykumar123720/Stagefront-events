import React from 'react';
import { SeatTierConfig } from '../../types/api';

interface SeatLegendProps {
  tiers: SeatTierConfig[];
}

export const SeatLegend: React.FC<SeatLegendProps> = ({ tiers }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3.5 shadow-2xs">
      {/* Seat Status Legend */}
      <div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#687386] block mb-2">
          Seat Availability Status
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-[#20242C]">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-white border border-slate-300" />
            <span className="text-[#687386]">Available</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-[#356AE6] border border-[#356AE6]" />
            <span className="font-semibold text-[#356AE6]">Selected</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-amber-100 border border-amber-300 text-amber-800" />
            <span className="text-amber-700">Held</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-slate-200 border border-slate-300" />
            <span className="text-slate-400">Booked</span>
          </div>
        </div>
      </div>

      {/* Tier Price Legend */}
      <div className="pt-3 border-t border-slate-100">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#687386] block mb-2">
          Category Tiers &amp; Pricing
        </span>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {tiers.map((tier) => (
            <div
              key={tier.tier}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200"
            >
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: tier.color }}
              />
              <span className="font-medium text-[#20242C]">{tier.label}</span>
              <span className="font-bold text-[#20242C]">${tier.price}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
