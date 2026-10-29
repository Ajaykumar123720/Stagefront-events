import React, { useState } from 'react';
import { X, Layers, Database, ShieldCheck, Terminal, Cpu, CheckCircle2 } from 'lucide-react';
import { API_CONFIG } from '../../services/apiClient';

interface ProjectNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProjectNoticeModal: React.FC<ProjectNoticeModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'api' | 'firebase' | 'nextsteps'>('architecture');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-[#356AE6] border border-blue-100">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#20242C]">StageFront Technical Blueprint</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-[#356AE6] border border-blue-200">
                  College Capstone Project
                </span>
              </div>
              <p className="text-xs text-[#687386]">Modular Architecture, Service Separation &amp; Backend Roadmap</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Callout Bar */}
        <div className="px-6 py-2.5 bg-blue-50 border-b border-blue-200 flex items-center justify-between text-xs text-blue-900">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#356AE6] shrink-0" />
            <span>
              <strong>Phase 2 State:</strong> Real Firebase Authentication, Firestore profile schemas, and Express token verification middleware are active.
            </span>
          </div>
          <span className="font-mono text-[11px] text-[#356AE6] font-semibold">
            Status: Auth Engine Wired
          </span>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-white px-6 gap-2">
          <button
            onClick={() => setActiveTab('architecture')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'architecture'
                ? 'border-[#356AE6] text-[#356AE6]'
                : 'border-transparent text-[#687386] hover:text-[#20242C]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            1. Modular Architecture
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'api'
                ? 'border-[#356AE6] text-[#356AE6]'
                : 'border-transparent text-[#687386] hover:text-[#20242C]'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            2. Express API Contracts
          </button>
          <button
            onClick={() => setActiveTab('firebase')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'firebase'
                ? 'border-[#356AE6] text-[#356AE6]'
                : 'border-transparent text-[#687386] hover:text-[#20242C]'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            3. Firebase &amp; Firestore Schemas
          </button>
          <button
            onClick={() => setActiveTab('nextsteps')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'nextsteps'
                ? 'border-[#356AE6] text-[#356AE6]'
                : 'border-transparent text-[#687386] hover:text-[#20242C]'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            4. Real Backend Next Steps
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs text-[#20242C]">
          {activeTab === 'architecture' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-[#20242C]">Separation of Concerns &amp; Frontend Modules</h3>
              <p className="text-[#687386] leading-relaxed">
                Business logic and pricing calculations are completely separated from presentation components. Four distinct service modules manage domain responsibilities:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex items-center gap-2 text-[#356AE6] font-bold text-xs">
                    <span className="w-2 h-2 rounded-full bg-[#356AE6]" />
                    Event Management Module (`eventService.ts`)
                  </div>
                  <p className="text-[11px] text-[#687386]">
                    Manages catalog querying, category/city filtering, search algorithms, multi-tier pricing specifications, and seating matrix generation.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs">
                    <span className="w-2 h-2 rounded-full bg-indigo-600" />
                    Booking &amp; Seat Engine (`bookingService.ts`)
                  </div>
                  <p className="text-[11px] text-[#687386]">
                    Handles seat lock requests, pricing calculation (subtotal, convenience fee, VAT), reservation generation, and ticket cancellations.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    User &amp; Auth Module (`userService.ts`)
                  </div>
                  <p className="text-[11px] text-[#687386]">
                    Standardized authentication interfaces, Role-Based Access Control (RBAC: Customer vs Faculty Admin), and token authorization headers.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex items-center gap-2 text-amber-700 font-bold text-xs">
                    <span className="w-2 h-2 rounded-full bg-amber-600" />
                    Admin Analytics Module (`adminService.ts`)
                  </div>
                  <p className="text-[11px] text-[#687386]">
                    Calculates occupancy ratios, revenue telemetry across categories, and generates CSV attendee manifests.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-[#20242C]">Defined Express Backend Endpoints</h3>
              <p className="text-[#687386]">
                The application interfaces with standard REST endpoints configured in <code className="text-[#356AE6]">server.ts</code>:
              </p>

              <div className="space-y-2 font-mono text-[11px]">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">GET</span>
                    <span className="text-slate-800 font-medium">/api/events</span>
                  </div>
                  <span className="text-slate-500 text-[10px]">Query: category, city, search, sortBy</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">GET</span>
                    <span className="text-slate-800 font-medium">/api/events/:id/seats</span>
                  </div>
                  <span className="text-slate-500 text-[10px]">Real-time seat matrix availability</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">POST</span>
                    <span className="text-slate-800 font-medium">/api/bookings/hold</span>
                  </div>
                  <span className="text-slate-500 text-[10px]">Temporary hold locking</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">POST</span>
                    <span className="text-slate-800 font-medium">/api/bookings/confirm</span>
                  </div>
                  <span className="text-slate-500 text-[10px]">Payment settlement &amp; ticket generation</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'firebase' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-[#20242C]">Cloud Firestore Schema Design</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[10px]">
                  <span className="font-bold text-[#356AE6] block mb-1">/events/{'{eventId}'}</span>
                  <pre className="text-slate-600">
{`{
  title: string,
  category: "concert"|"cricket"|"football"|"entertainment",
  dateTime: Timestamp,
  venue: { name, city, address },
  priceStartingFrom: number,
  tierConfigs: Array<TierConfig>
}`}
                  </pre>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[10px]">
                  <span className="font-bold text-indigo-700 block mb-1">/events/{'{id}'}/seats/{'{seatId}'}</span>
                  <pre className="text-slate-600">
{`{
  row: string,
  number: number,
  tier: "vip"|"platinum"|"gold"|"silver",
  price: number,
  status: "available"|"held"|"booked",
  heldUntil: Timestamp,
  heldByUserId: string | null
}`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'nextsteps' && (
            <div className="space-y-2.5">
              <h3 className="text-sm font-bold text-[#20242C]">Real Backend Deployment Steps</h3>
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-[#356AE6] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                <div>
                  <p className="font-semibold text-[#20242C]">Provision Firebase Firestore &amp; Auth</p>
                  <p className="text-[11px] text-[#687386]">Install Firebase Admin SDK and connect client credentials in <code className="text-[#356AE6]">firebase.config.ts</code>.</p>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-[#356AE6] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                <div>
                  <p className="font-semibold text-[#20242C]">Run Firestore Transactions for Concurrency</p>
                  <p className="text-[11px] text-[#687386]">Use <code className="text-[#356AE6]">db.runTransaction()</code> on seat documents to prevent race conditions during high-demand drops.</p>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-[#356AE6] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
                <div>
                  <p className="font-semibold text-[#20242C]">Attach Payment Webhooks</p>
                  <p className="text-[11px] text-[#687386]">Wire Stripe/Razorpay webhooks to verify signature before final ticket issuance.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-[#687386]">
          <div className="flex items-center gap-3">
            <span>StageFront Architecture • React 19, TypeScript, Express Full-Stack</span>
            <a
              href="/stagefront-production.zip"
              download="stagefront-production.zip"
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition"
            >
              <Terminal className="w-3.5 h-3.5" />
              Download for VS Code (.zip)
            </a>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#356AE6] hover:bg-[#2A55B8] text-white font-medium text-xs transition"
          >
            Close Documentation
          </button>
        </div>
      </div>
    </div>
  );
};
