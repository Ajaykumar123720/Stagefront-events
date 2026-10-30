import React from 'react';
import { SeatTierConfig, formatINR } from '../../types/api';

interface SeatLegendProps {
  tiers: SeatTierConfig[];
}

const TIER_ROW_LABELS: Record<string, string> = {
  vip: 'Rows A–B',
  platinum: 'Rows C–D',
  gold: 'Rows E–F',
  silver: 'Rows G–H',
};

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
          Category Tiers &amp; Pricing (INR)
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
              {TIER_ROW_LABELS[tier.tier] && (
                <span className="text-[10px] font-mono text-[#687386]">
                  ({TIER_ROW_LABELS[tier.tier]})
                </span>
              )}
              <span className="font-bold text-[#20242C]">{formatINR(tier.price)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
