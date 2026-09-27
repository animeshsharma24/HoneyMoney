import React, { useState, useEffect } from 'react';
import { useHoneymoney } from '../context/HoneymoneyContext';
import { ActiveTab } from '../types';
import { 
  Home, Clock, BarChart3, MoreHorizontal, 
  Plus, CreditCard, Target, Repeat, Settings, X, 
  MessageSquare, Zap, ShieldCheck 
} from 'lucide-react';

export const Navigation: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    openAddTransaction, 
    pendingSmsCount,
    openSmsReview,
    openSmsSimulator
  } = useHoneymoney();
  const [showMoreSheet, setShowMoreSheet] = useState(false);
  const [logoSrc, setLogoSrc] = useState<string>(() => {
    return localStorage.getItem('honeymoney_custom_logo') || '/honeymoney-icon.svg';
  });

  useEffect(() => {
    const handleLogoUpdate = () => {
      const saved = localStorage.getItem('honeymoney_custom_logo');
      if (saved) setLogoSrc(saved);
      else setLogoSrc('/honeymoney-icon.svg');
    };
    window.addEventListener('honeymoney-logo-changed', handleLogoUpdate);
    return () => window.removeEventListener('honeymoney-logo-changed', handleLogoUpdate);
  }, []);

  // 4 Primary bottom tabs + More
  const mainTabs: { id: ActiveTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'HOME', label: 'Home', icon: Home },
    { id: 'TRANSACTIONS', label: 'History', icon: Clock },
    { id: 'CARDS', label: 'Cards', icon: CreditCard },
    { id: 'ANALYTICS', label: 'Analytics', icon: BarChart3 },
  ];

  const moreItems: { id: ActiveTab; label: string; sub: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'ACCOUNTS', label: 'All Accounts & Wallets', sub: 'Manage banks, cash & limits', icon: CreditCard },
    { id: 'BUDGETS', label: 'Budgets & Limits', sub: 'Category & monthly targets', icon: Target },
    { id: 'RECURRING', label: 'Subscriptions', sub: 'Recurring fixed commitments', icon: Repeat },
    { id: 'SETTINGS', label: 'Settings & Data', sub: 'Preferences, backup & restore', icon: Settings },
  ];

  return (
    <>
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-[#070B09]/95 backdrop-blur-md border-b border-[#14261B] px-4 py-3 flex items-center justify-between">
        <div 
          onClick={() => setActiveTab('HOME')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          {/* Honeymoney Top Logo (Rounded Circle) */}
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden flex items-center justify-center transition-transform group-hover:scale-105 shadow-sm">
            <img src={logoSrc} alt="Honeymoney Logo" className="w-full h-full object-cover rounded-full" />
          </div>

          <div>
            <div className="text-[17px] sm:text-lg font-black tracking-tight text-white">
              <span>Honey</span><span className="text-[#E5A93C]">money</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* SMS Review Deck Trigger Button */}
          {pendingSmsCount > 0 ? (
            <button
              onClick={openSmsReview}
              className="py-1 px-2.5 rounded-xl bg-gradient-to-r from-[#173727] to-[#1B442F] border border-[#E5A93C]/60 hover:border-[#E5A93C] text-[#E5A93C] text-[11px] font-extrabold flex items-center gap-1.5 shadow-md shadow-[#E5A93C]/10 transition-transform active:scale-95 animate-pulse"
              title="Review Pending SMS Cards"
            >
              <Zap className="w-3.5 h-3.5 fill-[#E5A93C]" />
              <span>SMS ({pendingSmsCount})</span>
            </button>
          ) : (
            <button
              onClick={openSmsSimulator}
              className="w-8 h-8 rounded-xl bg-[#0D1C14] hover:bg-[#142B1F] border border-[#193A28] text-[#7E9A89] hover:text-[#E5A93C] flex items-center justify-center transition-colors"
              title="SMS Simulator"
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </header>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#070D09]/95 backdrop-blur-lg border-t border-[#162D20] px-3 py-2 flex items-center justify-around max-w-lg mx-auto">
        {mainTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setShowMoreSheet(false);
              }}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
                isActive
                  ? 'text-[#E5A93C] font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className={`p-1 rounded-lg ${isActive ? 'bg-[#E5A93C]/15' : ''}`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-[10px] tracking-tight">{tab.label}</span>
            </button>
          );
        })}

        {/* More Menu Item with Floating Add Button Directly Above It */}
        <div className="relative flex flex-col items-center">
          {/* Floating Dedicated + Transaction Button directly above the 3 dots */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              openAddTransaction();
            }}
            className="absolute -top-16 w-11 h-11 rounded-2xl bg-gradient-to-r from-[#E5A93C] to-[#F3C766] hover:from-[#d89e33] hover:to-[#e8ba58] text-black font-black flex items-center justify-center border border-[#FAD782]/60 active:scale-90 transition-transform shadow-lg shadow-[#E5A93C]/20"
            title="Add Transaction"
            aria-label="Add Transaction"
          >
            <Plus className="w-5 h-5 stroke-[3]" />
          </button>

          <button
            onClick={() => setShowMoreSheet(true)}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
              ['AI', 'ACCOUNTS', 'BUDGETS', 'RECURRING', 'SETTINGS'].includes(activeTab)
                ? 'text-[#E5A93C] font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className={`p-1 rounded-lg ${['AI', 'ACCOUNTS', 'BUDGETS', 'RECURRING', 'SETTINGS'].includes(activeTab) ? 'bg-[#E5A93C]/15' : ''}`}>
              <MoreHorizontal className="w-4 h-4" />
            </div>
            <span className="text-[10px] tracking-tight">More</span>
          </button>
        </div>
      </nav>

      {/* More Drawer Sheet */}
      {showMoreSheet && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowMoreSheet(false)}
        >
          <div
            className="w-full max-w-md bg-[#0D1C14] border-t sm:border border-[#1E4330] rounded-t-3xl sm:rounded-3xl p-5 space-y-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#183626]">
              <span className="text-xs font-bold text-[#E5A93C] uppercase tracking-wider">
                Honeymoney Modules
              </span>
              <button
                data-more-sheet-close="true"
                onClick={() => setShowMoreSheet(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 pt-1">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const isSelected = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setShowMoreSheet(false);
                    }}
                    className={`w-full p-3 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                      isSelected
                        ? 'bg-[#183626] border-[#E5A93C] text-white shadow-md shadow-[#E5A93C]/10'
                        : 'bg-[#09150E] border-[#183424] text-slate-300 hover:text-white hover:bg-[#12241A]'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#142C1F] border border-[#234E37] flex items-center justify-center text-[#E5A93C] shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{item.label}</div>
                      <div className="text-[11px] text-[#7E9A89]">{item.sub}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
