import React, { useState } from 'react';
import { useHoneymoney } from '../context/HoneymoneyContext';
import { Sparkles, Shield, Zap, ArrowRight, Check } from 'lucide-react';

export const OnboardingModal: React.FC = () => {
  const { isOnboarded, completeOnboarding } = useHoneymoney();
  const [pref, setPref] = useState<'HOME' | 'NEW_TRANSACTION'>('HOME');

  if (isOnboarded) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-md bg-[#0F1E16] border border-[#224A35] rounded-3xl p-6 shadow-2xl space-y-5 text-slate-100">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#E5A93C] via-[#B88022] to-[#6A4810] p-1 mx-auto shadow-lg shadow-[#E5A93C]/25 flex items-center justify-center">
            <div className="w-full h-full bg-[#0A1610] rounded-xl flex items-center justify-center">
              <span className="text-[#E5A93C] font-black text-2xl">H</span>
            </div>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">
            Welcome to Honeymoney
          </h2>
          <p className="text-xs text-[#7E9A89]">
            A personal spending memory, not merely an expense ledger.
          </p>
        </div>

        {/* Feature pillars */}
        <div className="space-y-3 bg-[#08120D] p-3.5 rounded-2xl border border-[#162D20] text-xs">
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-[#E5A93C] shrink-0 mt-0.5" />
            <div>
              <strong className="text-white">History-Driven Smart Entry</strong>
              <p className="text-[#7E9A89] text-[11px]">
                The app gets faster the more you use it. Habitual combinations appear in 1 tap.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Zap className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white">Strict Date, Zero Time Friction</strong>
              <p className="text-[#7E9A89] text-[11px]">
                Dates default to today without tedious time pickers or hours.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white">Local-First & Private</strong>
              <p className="text-[#7E9A89] text-[11px]">
                No SMS scrapers, no bank trackers. Complete financial privacy on your device.
              </p>
            </div>
          </div>
        </div>

        {/* Startup Preference Choice (PDF Phase 2) */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 block">
            Startup Behavior: What should open on launch?
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setPref('HOME')}
              className={`p-3 rounded-xl border text-left transition-all ${
                pref === 'HOME'
                  ? 'bg-[#183626] border-[#E5A93C] text-white font-bold'
                  : 'bg-[#09150E] border-[#183424] text-slate-400'
              }`}
            >
              <div>Open Home</div>
              <div className="text-[10px] text-[#7E9A89] font-normal">Monthly overview & feed</div>
            </button>

            <button
              type="button"
              onClick={() => setPref('NEW_TRANSACTION')}
              className={`p-3 rounded-xl border text-left transition-all ${
                pref === 'NEW_TRANSACTION'
                  ? 'bg-[#183626] border-[#E5A93C] text-white font-bold'
                  : 'bg-[#09150E] border-[#183424] text-slate-400'
              }`}
            >
              <div>Quick Entry</div>
              <div className="text-[10px] text-[#7E9A89] font-normal">Instant entry sheet</div>
            </button>
          </div>
        </div>

        <button
          onClick={() => completeOnboarding(pref)}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#E5A93C] to-[#E5A93C] hover:from-[#d89e33] hover:to-[#e8ba58] text-black font-extrabold text-xs shadow-lg shadow-[#E5A93C]/25 flex items-center justify-center gap-2"
        >
          <span>Get Started with Honeymoney</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
