import React, { useState, useEffect } from 'react';
import { EventItem, RazorpayGatewayStatus, SeatItem, UserProfile, formatINR } from '../../types/api';
import { bookingService } from '../../services/bookingService';
import {
  X,
  CreditCard,
  Smartphone,
  Landmark,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Lock,
  Calendar,
  MapPin,
  Clock,
  RefreshCw,
  LogIn,
  XCircle,
} from 'lucide-react';
import { TierBadge } from '../common/StatusBadge';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, any>) => {
      open: () => void;
      on: (event: string, handler: (response: any) => void) => void;
    };
  }
}

function loadRazorpayCheckoutScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(true);
      return;
    }
    const existing = document.getElementById('razorpay-checkout-sdk');
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }
    const script = document.createElement('script');
    script.id = 'razorpay-checkout-sdk';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

type PaymentMethodOption = 'upi' | 'credit_card' | 'debit_card' | 'netbanking';
type CheckoutStepState =
  | 'idle'
  | 'creating_order'
  | 'awaiting_gateway'
  | 'verifying_signature'
  | 'failed'
  | 'cancelled';

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
  holdTimerSeconds?: number | null;
  onOpenAuth?: () => void;
  onConfirm: (payload: {
    userName: string;
    userEmail: string;
    paymentMethod: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) => Promise<void>;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  event,
  seats,
  pricing,
  currentUser,
  holdTimerSeconds,
  onOpenAuth,
  onConfirm,
}) => {
  const [userName, setUserName] = useState(currentUser?.fullName || '');
  const [userEmail, setUserEmail] = useState(currentUser?.email || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodOption>('upi');
  const [stepState, setStepState] = useState<CheckoutStepState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [gatewayStatus, setGatewayStatus] = useState<RazorpayGatewayStatus | null>(null);
  const [isCheckingGateway, setIsCheckingGateway] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setUserName(currentUser.fullName || '');
      setUserEmail(currentUser.email || '');
    }
  }, [currentUser]);

  const checkGateway = () => {
    setIsCheckingGateway(true);
    bookingService
      .getRazorpayStatus()
      .then((status) => {
        setGatewayStatus(status);
      })
      .finally(() => {
        setIsCheckingGateway(false);
      });
  };

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setStepState('idle');
    checkGateway();
  }, [isOpen]);

  if (!isOpen) return null;

  const isGatewayReady = Boolean(gatewayStatus?.configured && gatewayStatus?.mode === 'test');
  const isSubmitting =
    stepState === 'creating_order' ||
    stepState === 'awaiting_gateway' ||
    stepState === 'verifying_signature';

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const methodLabels: Record<PaymentMethodOption, string> = {
    upi: 'Razorpay UPI (Google Pay, PhonePe, Paytm • INR)',
    credit_card: 'Razorpay Credit Card (Test Mode • INR)',
    debit_card: 'Razorpay Debit Card (Test Mode • INR)',
    netbanking: 'Razorpay Net Banking (Test Mode • INR)',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentUser) {
      setError('Please sign in to your customer account before initiating Razorpay Test Mode payment.');
      if (onOpenAuth) onOpenAuth();
      return;
    }

    if (!userName.trim() || !userEmail.trim()) {
      setError('Please provide your full name and email address for QR ticket delivery.');
      return;
    }

    // Strict guard: never simulate payment or confirm booking if Razorpay credentials are missing
    if (!isGatewayReady) {
      setStepState('failed');
      setError(
        gatewayStatus?.message ||
          'Configuration Error: Razorpay Test Mode credentials (RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET) are missing on the server. Bookings cannot be confirmed without a verified Razorpay payment.'
      );
      return;
    }

    setStepState('creating_order');
    try {
      const sdkLoaded = await loadRazorpayCheckoutScript();
      if (!sdkLoaded || !window.Razorpay) {
        throw new Error('Unable to load Razorpay Checkout.js SDK. Please check your internet connection.');
      }

      // Ensure seats have an active hold for the authenticated customer
      const holdRes = await bookingService.holdSeats({
        eventId: event.id,
        seatIds: seats.map((s) => s.id),
        userId: currentUser.id,
        holdDurationSeconds: 600,
      });

      if (!holdRes.success) {
        throw new Error(
          holdRes.message || 'Unable to lock selected seats. One or more seats may have been taken.'
        );
      }

      // Step 7: Create Razorpay Test Mode order on the backend
      const orderData = await bookingService.createRazorpayOrder(
        event.id,
        seats.map((s) => s.id)
      );

      setStepState('awaiting_gateway');

      // Step 8: Open the actual Razorpay Checkout.js window
      await new Promise<void>((resolve, reject) => {
        const rzpInstance = new window.Razorpay!({
          key: orderData.keyId,
          amount: orderData.amount,
          currency: 'INR',
          name: 'StageFront Events',
          description: `${event.title} • ${seats.map((s) => `${s.row}${s.number}`).join(', ')}`,
          order_id: orderData.orderId,
          prefill: {
            name: userName.trim(),
            email: userEmail.trim(),
            method:
              paymentMethod === 'upi'
                ? 'upi'
                : paymentMethod === 'netbanking'
                ? 'netbanking'
                : 'card',
          },
          notes: {
            eventId: event.id,
            seats: seats.map((s) => `${s.row}${s.number}`).join(','),
            preferredMethod: paymentMethod,
            environment: 'test',
          },
          theme: {
            color: '#356AE6',
          },
          modal: {
            ondismiss: () => {
              setStepState('cancelled');
              reject(
                new Error(
                  'Payment Cancelled: You closed the Razorpay Checkout window before completing payment. No confirmed ticket was generated.'
                )
              );
            },
          },
          handler: async (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            try {
              setStepState('verifying_signature');
              // Step 10 & 11: Verify signature on backend and confirm booking
              await onConfirm({
                userName: userName.trim(),
                userEmail: userEmail.trim(),
                paymentMethod: methodLabels[paymentMethod],
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });
              resolve();
            } catch (confirmErr) {
              setStepState('failed');
              reject(confirmErr);
            }
          },
        });

        rzpInstance.on('payment.failed', (failureResp: any) => {
          setStepState('failed');
          const reason =
            failureResp?.error?.description ||
            'Payment Failed in Razorpay Test Mode. No confirmed ticket was generated.';
          reject(new Error(reason));
        });

        rzpInstance.open();
      });

      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Payment verification failed. Booking not confirmed.';
      setError(msg);
      setStepState((prev) => (prev === 'cancelled' ? 'cancelled' : 'failed'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Checkout Header with Explicit TEST MODE Badge */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-[#20242C]">StageFront Secure Checkout</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                RAZORPAY TEST MODE • INR (₹)
              </span>
              {holdTimerSeconds !== null && holdTimerSeconds !== undefined && holdTimerSeconds > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-[#356AE6] border border-blue-200">
                  <Clock className="w-3 h-3" />
                  Hold: {formatTimer(holdTimerSeconds)}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#687386] mt-1">
              <span className="font-semibold text-[#20242C]">{event.title}</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                {new Date(event.dateTime).toLocaleDateString('en-IN', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                {event.venue.name}, {event.venue.city}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-[#20242C] hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Gateway Readiness Banner */}
        {isCheckingGateway ? (
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2 text-xs text-[#687386]">
            <Loader2 className="w-4 h-4 animate-spin text-[#356AE6]" />
            <span>Verifying server-side Razorpay Test Mode configuration...</span>
          </div>
        ) : isGatewayReady ? (
          <div className="px-5 py-2.5 bg-amber-50 border-b border-amber-200 flex items-start justify-between gap-2.5 text-xs text-amber-900">
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Razorpay Test Mode Ready (INR):</strong>{' '}
                Orders are created on the backend in paise and verified with HMAC-SHA256 before seat confirmation.
              </div>
            </div>
          </div>
        ) : (
          <div className="px-5 py-3 bg-rose-50 border-b border-rose-200 flex items-start justify-between gap-3 text-xs text-rose-900">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-rose-900">
                  Configuration Error: Razorpay Test Mode Credentials Missing
                </strong>
                <span>
                  {gatewayStatus?.message ||
                    'RAZORPAY_KEY_ID (rzp_test_...) and RAZORPAY_KEY_SECRET are not configured on the server. Bookings are strictly blocked until verified payment is configured.'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={checkGateway}
              className="px-2.5 py-1 rounded bg-white border border-rose-200 text-rose-700 hover:bg-rose-100 font-semibold text-[11px] flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          </div>
        )}

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          
          {/* Sign-In Required Notice if Guest */}
          {!currentUser && (
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <strong className="text-[#20242C] block text-xs">Customer Sign-In Required</strong>
                <span className="text-[#687386] text-[11px]">
                  Sign in or create an account to lock your seats and save your QR ticket in My Bookings.
                </span>
              </div>
              {onOpenAuth && (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="px-3.5 py-2 rounded-lg bg-[#356AE6] hover:bg-[#2A55B8] text-white font-semibold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Sign In / Register
                </button>
              )}
            </div>
          )}

          {/* Payment Status / Error Alerts */}
          {stepState === 'cancelled' && error && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <XCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Payment Cancelled</strong>
                <span>{error}</span>
              </div>
            </div>
          )}

          {stepState !== 'cancelled' && error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Payment Could Not Be Completed</strong>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* 1. Selected Seats & Ticket Prices */}
          <div className="space-y-2">
            <span className="font-bold uppercase tracking-wider text-[#687386] block text-[11px]">
              1. Selected Seats &amp; Ticket Prices ({seats.length})
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {seats.map((s) => (
                <div
                  key={s.id}
                  className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#20242C]">
                      Row {s.row}, Seat {s.number}
                    </span>
                    <TierBadge tier={s.tier} />
                  </div>
                  <span className="text-[#356AE6] font-mono font-bold">
                    {formatINR(s.price)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Attendee Contact Details */}
          <div className="space-y-2.5">
            <span className="font-bold uppercase tracking-wider text-[#687386] block text-[11px]">
              2. Pass Holder Details
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[#687386] mb-1 font-medium">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Enter full name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-[#20242C] outline-none focus:border-[#356AE6] transition"
                />
              </div>
              <div>
                <label className="block text-[#687386] mb-1 font-medium">Email for QR Ticket</label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-[#20242C] outline-none focus:border-[#356AE6] transition"
                />
              </div>
            </div>
          </div>

          {/* 3. Razorpay Checkout Payment Options */}
          <div className="space-y-2.5">
            <span className="font-bold uppercase tracking-wider text-[#687386] block text-[11px]">
              3. Select Payment Option (Razorpay Checkout • Test Mode)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setPaymentMethod('upi')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition cursor-pointer ${
                  paymentMethod === 'upi'
                    ? 'bg-blue-50/90 border-[#356AE6] text-[#20242C] ring-1 ring-[#356AE6]/20'
                    : 'bg-white border-slate-200 text-[#687386] hover:text-[#20242C]'
                }`}
              >
                <Smartphone className="w-4 h-4 text-[#356AE6] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-xs block text-[#20242C]">
                    UPI (Google Pay, PhonePe, Paytm)
                  </span>
                  <span className="text-[11px] text-[#687386]">
                    Instant UPI ID or QR scan via Razorpay
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('credit_card')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition cursor-pointer ${
                  paymentMethod === 'credit_card'
                    ? 'bg-blue-50/90 border-[#356AE6] text-[#20242C] ring-1 ring-[#356AE6]/20'
                    : 'bg-white border-slate-200 text-[#687386] hover:text-[#20242C]'
                }`}
              >
                <CreditCard className="w-4 h-4 text-[#356AE6] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-xs block text-[#20242C]">
                    Credit Card
                  </span>
                  <span className="text-[11px] text-[#687386]">
                    Visa, Mastercard, RuPay &amp; Amex
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('debit_card')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition cursor-pointer ${
                  paymentMethod === 'debit_card'
                    ? 'bg-blue-50/90 border-[#356AE6] text-[#20242C] ring-1 ring-[#356AE6]/20'
                    : 'bg-white border-slate-200 text-[#687386] hover:text-[#20242C]'
                }`}
              >
                <CreditCard className="w-4 h-4 text-[#356AE6] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-xs block text-[#20242C]">
                    Debit Card
                  </span>
                  <span className="text-[11px] text-[#687386]">
                    All major Indian bank Debit Cards
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('netbanking')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition cursor-pointer ${
                  paymentMethod === 'netbanking'
                    ? 'bg-blue-50/90 border-[#356AE6] text-[#20242C] ring-1 ring-[#356AE6]/20'
                    : 'bg-white border-slate-200 text-[#687386] hover:text-[#20242C]'
                }`}
              >
                <Landmark className="w-4 h-4 text-[#356AE6] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-xs block text-[#20242C]">
                    Net Banking
                  </span>
                  <span className="text-[11px] text-[#687386]">
                    HDFC, ICICI, SBI, Axis, Kotak &amp; 50+ banks
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* 4. Itemized INR Pricing Breakdown */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex justify-between text-[#687386]">
              <span>Subtotal ({seats.length} {seats.length === 1 ? 'seat' : 'seats'})</span>
              <span className="font-mono font-semibold text-[#20242C]">
                {formatINR(pricing.subtotal, true)}
              </span>
            </div>
            <div className="flex justify-between text-[#687386]">
              <span>Convenience Fee (5%)</span>
              <span className="font-mono text-[#20242C]">
                {formatINR(pricing.convenienceFee, true)}
              </span>
            </div>
            <div className="flex justify-between text-[#687386]">
              <span>GST (10%)</span>
              <span className="font-mono text-[#20242C]">
                {formatINR(pricing.taxAmount, true)}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm">
              <span className="font-bold text-[#20242C]">Total Payable (INR)</span>
              <span className="font-mono font-extrabold text-base text-[#356AE6]">
                {formatINR(pricing.totalAmount, true)}
              </span>
            </div>
          </div>

          {/* 5. Primary Pay Now CTA */}
          <button
            type="submit"
            disabled={isSubmitting || isCheckingGateway}
            className="w-full py-3.5 px-4 rounded-xl bg-[#356AE6] hover:bg-[#2A55B8] text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
          >
            {stepState === 'creating_order' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating Razorpay Test Mode Order...</span>
              </>
            ) : stepState === 'awaiting_gateway' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Complete Payment in Razorpay Window...</span>
              </>
            ) : stepState === 'verifying_signature' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying Signature &amp; Issuing QR Ticket...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Pay Now • {formatINR(pricing.totalAmount, true)}</span>
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
};
