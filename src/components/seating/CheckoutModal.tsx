import React, { useState } from 'react';
import { EventItem, SeatItem, UserProfile } from '../../types/api';
import { X, CreditCard, QrCode, Smartphone, Landmark, ShieldAlert, Check, Loader2 } from 'lucide-react';
import { TierBadge } from '../common/StatusBadge';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventItem;
  seats: SeatItem[];
  pricing: {
    subtotal: number;
    convenienceFee: number;
    taxAmount: number;
    totalAmount: number;
  };
  currentUser: UserProfile | null;
  onConfirm: (payload: {
    userName: string;
    userEmail: string;
    paymentMethod: string;
  }) => Promise<void>;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  event,
  seats,
  pricing,
  currentUser,
  onConfirm,
}) => {
  const [userName, setUserName] = useState(currentUser?.fullName || 'Alex Chen');
  const [userEmail, setUserEmail] = useState(currentUser?.email || 'alex.chen@student.university.edu');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi' | 'applepay' | 'netbanking'>('card');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !userEmail.trim()) {
      setError('Please provide your name and email for ticket issuance.');
      return;
    }

    const methodLabels: Record<string, string> = {
      card: 'Simulated Visa (•••• 4242) — Academic Sandbox (Unpaid)',
      upi: 'Simulated UPI Gateway — Academic Sandbox (Unpaid)',
      applepay: 'Simulated Apple Pay — Academic Sandbox (Unpaid)',
      netbanking: 'Simulated Direct Net Banking — Academic Sandbox (Unpaid)',
    };

    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm({
        userName,
        userEmail,
        paymentMethod: methodLabels[paymentMethod],
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div>
            <h3 className="text-base font-bold text-[#20242C]">Confirm Reservation</h3>
            <span className="text-xs text-[#687386]">
              {event.title} • {seats.length} {seats.length === 1 ? 'Seat' : 'Seats'}
            </span>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-[#20242C] hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Phase 1 Project Notice Banner */}
        <div className="px-5 py-2.5 bg-amber-50 border-b border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <strong className="block text-amber-900">Final-Year Project Simulation:</strong>
            Payment processing is simulated for testing. No monetary charge will occur.
          </div>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {error}
            </div>
          )}

          {/* Attendee Details */}
          <div className="space-y-2.5">
            <span className="font-bold uppercase tracking-wider text-[#687386] block text-[11px]">
              1. Attendee Contact Details
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[#687386] mb-1 font-medium">Full Name</label>
                <input
                  type="text"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-[#20242C] outline-none focus:border-[#356AE6] transition"
                />
              </div>
              <div>
                <label className="block text-[#687386] mb-1 font-medium">Email for Delivery</label>
                <input
                  type="email"
                  required
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-[#20242C] outline-none focus:border-[#356AE6] transition"
                />
              </div>
            </div>
          </div>

          {/* Confirmed Seats Summary */}
          <div className="space-y-2">
            <span className="font-bold uppercase tracking-wider text-[#687386] block text-[11px]">
              2. Confirmed Seats
            </span>
            <div className="flex flex-wrap gap-2">
              {seats.map((s) => (
                <div
                  key={s.id}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-2"
                >
                  <span className="font-mono font-bold text-[#20242C]">Row {s.row}-{s.number}</span>
                  <TierBadge tier={s.tier} />
                  <span className="text-[#356AE6] font-mono font-semibold">${s.price}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-2.5">
            <span className="font-bold uppercase tracking-wider text-[#687386] block text-[11px]">
              3. Payment Channel (Simulation)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition cursor-pointer ${
                  paymentMethod === 'card'
                    ? 'bg-blue-50/80 border-[#356AE6] text-[#356AE6]'
                    : 'bg-white border-slate-200 text-[#687386] hover:text-[#20242C]'
                }`}
              >
                <CreditCard className="w-4 h-4 text-[#356AE6]" />
                <span className="font-medium text-xs">Credit / Debit Card</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('upi')}
                className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition cursor-pointer ${
                  paymentMethod === 'upi'
                    ? 'bg-blue-50/80 border-[#356AE6] text-[#356AE6]'
                    : 'bg-white border-slate-200 text-[#687386] hover:text-[#20242C]'
                }`}
              >
                <QrCode className="w-4 h-4 text-[#356AE6]" />
                <span className="font-medium text-xs">Instant UPI / QR</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('applepay')}
                className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition cursor-pointer ${
                  paymentMethod === 'applepay'
                    ? 'bg-blue-50/80 border-[#356AE6] text-[#356AE6]'
                    : 'bg-white border-slate-200 text-[#687386] hover:text-[#20242C]'
                }`}
              >
                <Smartphone className="w-4 h-4 text-[#356AE6]" />
                <span className="font-medium text-xs">Apple / Google Pay</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('netbanking')}
                className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition cursor-pointer ${
                  paymentMethod === 'netbanking'
                    ? 'bg-blue-50/80 border-[#356AE6] text-[#356AE6]'
                    : 'bg-white border-slate-200 text-[#687386] hover:text-[#20242C]'
                }`}
              >
                <Landmark className="w-4 h-4 text-[#356AE6]" />
                <span className="font-medium text-xs">Net Banking</span>
              </button>
            </div>
          </div>

          {/* Pricing Summary Box */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex justify-between text-[#687386]">
              <span>Subtotal</span>
              <span className="font-mono text-[#20242C]">${pricing.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[#687386]">
              <span>Service Fee &amp; VAT</span>
              <span className="font-mono text-[#20242C]">${(pricing.convenienceFee + pricing.taxAmount).toFixed(2)}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm">
              <span className="font-bold text-[#20242C]">Total Payable</span>
              <span className="font-mono font-bold text-base text-[#356AE6]">
                ${pricing.totalAmount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-lg bg-[#356AE6] hover:bg-[#2A55B8] text-white font-semibold text-xs shadow-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Issuing Pass...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Confirm &amp; Issue Ticket (${pricing.totalAmount.toFixed(2)})
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
};
