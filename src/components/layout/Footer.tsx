import React from 'react';
import { Ticket, ShieldAlert, Cpu } from 'lucide-react';

interface FooterProps {
  onOpenBlueprint: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenBlueprint }) => {
  return (
    <footer className="mt-20 border-t border-slate-200 bg-slate-50/70 text-[#687386] text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#356AE6] flex items-center justify-center text-white shadow-xs">
                <Ticket className="w-4 h-4" />
              </div>
              <span className="text-base font-bold text-[#20242C] tracking-tight">StageFront Events</span>
            </div>
            <p className="text-[#687386] text-xs leading-relaxed">
              Premium event discovery and interactive ticket booking platform. Engineered for a college final-year capstone project.
            </p>
            <div className="pt-1">
              <button
                onClick={onOpenBlueprint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-[#356AE6]/50 text-[#356AE6] text-xs font-semibold shadow-2xs transition"
              >
                <Cpu className="w-3.5 h-3.5" />
                Technical Architecture Blueprint
              </button>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-[#20242C] mb-3 text-xs uppercase tracking-wider">Event Categories</h4>
            <ul className="space-y-2 text-[#687386]">
              <li className="hover:text-[#20242C] transition cursor-pointer">Live Concerts &amp; Stadium Tours</li>
              <li className="hover:text-[#20242C] transition cursor-pointer">ICC &amp; IPL Cricket Matches</li>
              <li className="hover:text-[#20242C] transition cursor-pointer">Premier League &amp; Football Derbies</li>
              <li className="hover:text-[#20242C] transition cursor-pointer">Standup Comedy &amp; Theater Specials</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-[#20242C] mb-3 text-xs uppercase tracking-wider">Architecture Specs</h4>
            <ul className="space-y-2 text-[#687386]">
              <li>React 19 &amp; TypeScript v5</li>
              <li>Separated Service Domain Modules</li>
              <li>Express API REST Contracts</li>
              <li>Cloud Firestore Schemas Ready</li>
              <li>Visual Seating Selection Engine</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-[#20242C] mb-3 text-xs uppercase tracking-wider">Academic Disclosure</h4>
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-[11px] leading-relaxed text-[#687386] space-y-2 shadow-2xs">
              <div className="flex items-center gap-1.5 text-amber-700 font-semibold">
                <ShieldAlert className="w-3.5 h-3.5" />
                Phase 1 Prototype Notice
              </div>
              <p>
                Seat locking and payment transactions are simulated in Phase 1 for academic evaluation without real billing.
              </p>
            </div>
          </div>

        </div>

        <div className="pt-8 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#687386]">
          <p>© 2026 StageFront Events. College Final-Year Software Engineering Project.</p>
          <div className="flex gap-4">
            <span className="hover:text-[#20242C] transition cursor-pointer">Terms of Service</span>
            <span>•</span>
            <span className="hover:text-[#20242C] transition cursor-pointer">Privacy Policy</span>
            <span>•</span>
            <span className="hover:text-[#20242C] transition cursor-pointer">API Specification</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
