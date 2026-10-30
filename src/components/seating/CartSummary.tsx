import React from 'react';
import { SeatItem, formatINR } from '../../types/api';
import { Trash2, Clock, ShieldCheck, CreditCard, Armchair } from 'lucide-react';
import { TierBadge } from '../common/StatusBadge';

interface CartSummaryProps {
  selectedSeats: SeatItem[];
  pricing: {
    subtotal: number;
    convenienceFee: number;
    taxAmount: number;
    totalAmount: number;
  };
  onRemoveSeat: (seat: SeatItem) => void;
  onClearAll: () => void;
  onProceedToCheckout: () => void;
  holdTimerSeconds: number | null;
  isHolding: boolean;
}

export const CartSummary: React.FC<CartSummaryProps> = ({
  selectedSeats,
  pricing,
  onRemoveSeat,
  onClearAll,
  onProceedToCheckout,
  holdTimerSeconds,
  isHolding,
}) => {
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (selectedSeats.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 text-center shadow-2xs">
        <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-3 text-slate-400">
          <Armchair className="w-5 h-5" />
        </div>
        <h4 className="text-sm font-bold text-[#20242C] mb-1">No Seats Selected</h4>
        <p className="text-xs text-[#687386] max-w-xs mx-auto leading-relaxed">
          Select seats on the chart to begin your reservation. Up to 6 seats per transaction.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-5">
      
      {/* Header & Hold Timer (Shown only when genuine hold exists) */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
        <div>
          <h4 className="text-sm font-bold text-[#20242C]">
            Selected Seats ({selectedSeats.length})
          </h4>
          <span className="text-[11px] text-[#687386]">Itemized ticket summary</span>
        </div>

        {holdTimerSeconds !== null && holdTimerSeconds > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-mono font-bold">
            <Clock className="w-3.5 h-3.5 text-amber-700" />
            <span>Hold: {formatTimer(holdTimerSeconds)}</span>
          </div>
        )}
      </div>

      {/* Selected Seats Chips */}
      <div className="space-y-2 max-h-52 overflow-y-auto pr-1 scrollbar-thin">
        {selectedSeats.map((seat) => (
          <div
            key={seat.id}
            className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs"
          >
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-white border border-slate-300 text-slate-700 font-mono font-bold flex items-center justify-center text-[10px]">
                {seat.row}{seat.number}
              </span>
              <div>
                <span className="text-[#20242C] font-semibold block text-xs">
                  Row {seat.row}, Seat {seat.number}
                </span>
                <TierBadge tier={seat.tier} />
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="font-bold text-[#20242C] font-mono">{formatINR(seat.price)}</span>
              <button
                onClick={() => onRemoveSeat(seat)}
                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition cursor-pointer"
                title="Remove seat"
                aria-label={`Remove Row ${seat.row} Seat ${seat.number}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Clear Selection */}
      <div className="flex justify-end">
        <button
          onClick={onClearAll}
          className="text-[11px] text-[#687386] hover:text-rose-600 transition cursor-pointer"
        >
          Clear selection
        </button>
      </div>

      {/* Pricing Breakdown */}
      <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs">
        <div className="flex justify-between text-[#687386]">
          <span>Tickets Subtotal</span>
          <span className="font-mono text-[#20242C]">{formatINR(pricing.subtotal, true)}</span>
        </div>
        <div className="flex justify-between text-[#687386]">
          <span>Platform Service Fee (5%)</span>
          <span className="font-mono text-[#20242C]">{formatINR(pricing.convenienceFee, true)}</span>
        </div>
        <div className="flex justify-between text-[#687386]">
          <span>GST &amp; Surcharge (10%)</span>
          <span className="font-mono text-[#20242C]">{formatINR(pricing.taxAmount, true)}</span>
        </div>
        <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm">
          <span className="font-bold text-[#20242C]">Total Payable (INR)</span>
          <span className="font-mono font-extrabold text-base text-[#356AE6]">
            {formatINR(pricing.totalAmount, true)}
          </span>
        </div>
      </div>

      {/* Verified Policy Note */}
      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-[#687386]">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>Official ticket guarantee with instant QR pass issuance.</span>
      </div>

      {/* Checkout Action */}
      <button
        onClick={onProceedToCheckout}
        disabled={isHolding}
        className="w-full py-3 px-4 rounded-lg bg-[#356AE6] hover:bg-[#2A55B8] text-white font-semibold text-xs shadow-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
      >
        <CreditCard className="w-4 h-4" />
        {isHolding ? 'Holding Seats...' : 'Proceed to Checkout'}
      </button>

    </div>
  );
};
