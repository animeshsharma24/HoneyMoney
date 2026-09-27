import React, { useState, useMemo } from 'react';
import { useHoneymoney } from '../context/HoneymoneyContext';
import { Account, Transaction, CcPaymentSubtype, getUpiBrandMeta, UPI_BRAND_LIST } from '../types';
import { formatDateDisplay } from '../utils/date';
import { 
  CreditCard, Smartphone, ShieldCheck, Download, 
  ArrowUpRight, Plus, CheckCircle2, ChevronRight, 
  DollarSign, Sparkles, Filter, Receipt, Calendar
} from 'lucide-react';

export const CreditCardsView: React.FC = () => {
  const {
    accounts,
    transactions,
    categories,
    currencySymbol,
    formatCurrency,
    openAddTransaction,
    openEditTransaction,
    addTransaction,
    setActiveTab
  } = useHoneymoney();

  // Credit card accounts only
  const creditCards = useMemo(() => {
    return accounts.filter(a => a.type === 'CREDIT_CARD');
  }, [accounts]);

  const [selectedCardId, setSelectedCardId] = useState<string>(() => {
    return creditCards[0]?.id || '';
  });

  const [billingPeriodTab, setBillingPeriodTab] = useState<'CURRENT' | 'PREVIOUS' | 'ALL'>('CURRENT');
  const [subtypeFilter, setSubtypeFilter] = useState<'ALL' | CcPaymentSubtype>('ALL');
  const [selectedUpiBrandFilter, setSelectedUpiBrandFilter] = useState<'ALL' | string>('ALL');
  const [isPayBillOpen, setIsPayBillOpen] = useState<boolean>(false);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payFromBankId, setPayFromBankId] = useState<string>(() => {
    return accounts.find(a => a.type === 'BANK')?.id || '';
  });
  const [copiedNotice, setCopiedNotice] = useState<string | null>(null);

  const selectedCard = useMemo(() => {
    return creditCards.find(c => c.id === selectedCardId) || creditCards[0];
  }, [creditCards, selectedCardId]);

  // Transactions linked to this credit card
  const cardTransactions = useMemo(() => {
    if (!selectedCard) return [];
    return transactions.filter(t => t.accountId === selectedCard.id);
  }, [transactions, selectedCard]);

  // Compute billing cycle date ranges
  const cycleDay = selectedCard?.billingCycleDay || 15;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed
  const currentDate = now.getDate();

  // Cycle start & end
  const { currentCycleStart, currentCycleEnd, prevCycleStart, prevCycleEnd } = useMemo(() => {
    let start: Date;
    let end: Date;
    let prevStart: Date;
    let prevEnd: Date;

    if (currentDate >= cycleDay) {
      start = new Date(currentYear, currentMonth, cycleDay);
      end = new Date(currentYear, currentMonth + 1, cycleDay - 1);
      prevStart = new Date(currentYear, currentMonth - 1, cycleDay);
      prevEnd = new Date(currentYear, currentMonth, cycleDay - 1);
    } else {
      start = new Date(currentYear, currentMonth - 1, cycleDay);
      end = new Date(currentYear, currentMonth, cycleDay - 1);
      prevStart = new Date(currentYear, currentMonth - 2, cycleDay);
      prevEnd = new Date(currentYear, currentMonth - 1, cycleDay - 1);
    }

    const toYMD = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    return {
      currentCycleStart: toYMD(start),
      currentCycleEnd: toYMD(end),
      prevCycleStart: toYMD(prevStart),
      prevCycleEnd: toYMD(prevEnd),
    };
  }, [cycleDay, currentYear, currentMonth, currentDate]);

  // Filter transactions by cycle period and payment subtype
  const filteredTransactions = useMemo(() => {
    return cardTransactions.filter(t => {
      // Period filter
      if (billingPeriodTab === 'CURRENT') {
        if (t.date < currentCycleStart) return false;
      } else if (billingPeriodTab === 'PREVIOUS') {
        if (t.date < prevCycleStart || t.date > prevCycleEnd) return false;
      }

      // Subtype filter
      if (subtypeFilter !== 'ALL') {
        const matchesSubtype = t.ccPaymentSubtype === subtypeFilter || 
          (subtypeFilter === 'UPI_ON_CREDIT_CARD' && t.paymentMode === 'UPI');
        if (!matchesSubtype) return false;
      }

      // Specific UPI app filter
      if (selectedUpiBrandFilter !== 'ALL') {
        const brandMatch = t.upiBrandId === selectedUpiBrandFilter || 
          t.upiAppId === `upi-${selectedUpiBrandFilter}` ||
          (t.upiAppId && t.upiAppId.includes(selectedUpiBrandFilter));
        if (!brandMatch) return false;
      }

      return true;
    }).sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }, [cardTransactions, billingPeriodTab, subtypeFilter, selectedUpiBrandFilter, currentCycleStart, prevCycleStart, prevCycleEnd]);

  // Key metrics for the current card
  const stats = useMemo(() => {
    const unbilledSpend = cardTransactions
      .filter(t => t.date >= currentCycleStart && t.transactionType === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);

    const prevBilledSpend = cardTransactions
      .filter(t => t.date >= prevCycleStart && t.date <= prevCycleEnd && t.transactionType === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);

    const upiSpend = cardTransactions
      .filter(t => t.ccPaymentSubtype === 'UPI_ON_CREDIT_CARD' || (t.paymentMode === 'UPI' && t.accountId === selectedCard?.id))
      .reduce((sum, t) => sum + t.amount, 0);

    const directSwipeSpend = cardTransactions
      .filter(t => t.ccPaymentSubtype === 'DIRECT_SWIPE')
      .reduce((sum, t) => sum + t.amount, 0);

    const creditLimit = selectedCard?.creditLimit || 150000;
    const availableLimit = Math.max(0, creditLimit - unbilledSpend);

    return {
      unbilledSpend,
      prevBilledSpend,
      upiSpend,
      directSwipeSpend,
      creditLimit,
      availableLimit,
      utilizationPct: Math.min(100, Math.round((unbilledSpend / creditLimit) * 100))
    };
  }, [cardTransactions, currentCycleStart, prevCycleStart, prevCycleEnd, selectedCard]);

  const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);

  // Handle Pay Bill
  const handlePayBill = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0 || !selectedCard) return;

    // Record payment as credit transaction
    addTransaction({
      amount: amt,
      item: `Credit Card Bill Payment (${selectedCard.name})`,
      merchant: selectedCard.institution,
      categoryId: 'cat-bills',
      paymentMode: 'NET_BANKING',
      accountId: payFromBankId,
      date: new Date().toISOString().split('T')[0],
      transactionType: 'TRANSFER',
      notes: `Bill payment for ${selectedCard.name} ending in ${selectedCard.lastFour || ''}`
    });

    setIsPayBillOpen(false);
    setPayAmount('');
    setCopiedNotice('Recorded Credit Card bill payment successfully!');
    setTimeout(() => setCopiedNotice(null), 3000);
  };

  // Export readable statement summary
  const handleExportStatement = () => {
    if (!selectedCard) return;
    const lines = [
      `=== HONEYMONEY CREDIT CARD STATEMENT ===`,
      `Card: ${selectedCard.name} (${selectedCard.cardNetwork || 'Credit Card'} ending ${selectedCard.lastFour || ''})`,
      `Period: ${billingPeriodTab === 'CURRENT' ? `Current Cycle (${currentCycleStart} to ${currentCycleEnd})` : billingPeriodTab === 'PREVIOUS' ? `Previous Cycle (${prevCycleStart} to ${prevCycleEnd})` : 'All History'}`,
      `Total Spend: ${formatCurrency(billingPeriodTab === 'PREVIOUS' ? stats.prevBilledSpend : stats.unbilledSpend)}`,
      `Available Limit: ${formatCurrency(stats.availableLimit)} of ${formatCurrency(stats.creditLimit)}`,
      `---------------------------------------`,
      ...filteredTransactions.map(t => {
        const upiMeta = getUpiBrandMeta(t.upiBrandId);
        const methodTag = t.ccPaymentSubtype === 'UPI_ON_CREDIT_CARD' || t.paymentMode === 'UPI'
          ? `[UPI via ${upiMeta ? upiMeta.name : 'RuPay CC'}]`
          : t.ccPaymentSubtype === 'DIRECT_SWIPE'
          ? '[Direct POS Swipe]'
          : t.ccPaymentSubtype === 'ONLINE'
          ? '[Online Card Purchase]'
          : '[Card Transaction]';
        const cat = categoryMap.get(t.categoryId)?.name || 'General';
        return `${t.date} | ${formatCurrency(t.amount)} | ${t.merchant} - ${t.item} | ${cat} | ${methodTag}`;
      }),
      `---------------------------------------`,
      `Generated by Honeymoney Spending Memory (Manual + Offline SMS)`
    ];

    navigator.clipboard?.writeText(lines.join('\n'));
    setCopiedNotice('Statement copied to clipboard!');
    setTimeout(() => setCopiedNotice(null), 3000);
  };

  if (!selectedCard) {
    return (
      <div className="p-8 text-center space-y-3 rounded-3xl bg-[#0C1711] border border-dashed border-[#1E4330] mt-4">
        <CreditCard className="w-10 h-10 text-[#7E9A89] mx-auto opacity-70" />
        <h2 className="text-base font-bold text-white">No Credit Cards Configured</h2>
        <p className="text-xs text-[#7E9A89] max-w-xs mx-auto">
          Add your credit cards (Visa, MasterCard, or RuPay with UPI) in the Accounts tab.
        </p>
        <button
          onClick={() => setActiveTab('ACCOUNTS')}
          className="mt-2 px-4 py-2 rounded-xl bg-[#E5A93C] text-black font-extrabold text-xs inline-flex items-center gap-1.5 shadow-md shadow-[#E5A93C]/25"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Credit Card</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#E5A93C] flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5" />
            Credit Card Statements
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Cards & Bills
          </h1>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-[#7E9A89] uppercase tracking-wider font-semibold block">Managed</span>
          <span className="text-xs font-mono font-bold text-slate-200">
            {creditCards.length} Card{creditCards.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {copiedNotice && (
        <div className="p-2.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{copiedNotice}</span>
        </div>
      )}

      {/* Credit Card Selector Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
        {creditCards.map(card => {
          const isSelected = card.id === selectedCard.id;
          return (
            <button
              key={card.id}
              onClick={() => setSelectedCardId(card.id)}
              className={`shrink-0 px-3.5 py-2 rounded-2xl border text-left transition-all ${
                isSelected
                  ? 'bg-[#183626] border-[#E5A93C] text-white shadow-md shadow-[#E5A93C]/15'
                  : 'bg-[#09150E] border-[#183424] text-slate-400 hover:text-white'
              }`}
            >
              <div className="text-xs font-bold truncate max-w-[150px]">{card.name}</div>
              <div className="text-[10px] text-[#7E9A89] font-mono mt-0.5">
                •••• {card.lastFour || 'CC'} {card.supportsUpiOnCard ? '• RuPay UPI' : ''}
              </div>
            </button>
          );
        })}
      </div>

      {/* Luxury Credit Card Visualizer */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1A3828] via-[#0E2218] to-[#08130D] border border-[#2B5E43] p-5 sm:p-6 shadow-2xl text-white">
        {/* Ambient gold glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#E5A93C]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#A6CDB5]">
              {selectedCard.institution}
            </div>
            <div className="text-base sm:text-lg font-black tracking-tight text-white mt-0.5">
              {selectedCard.name}
            </div>
          </div>

          <div className="flex flex-col items-end">
            <span className="px-2 py-0.5 rounded-lg bg-[#E5A93C]/20 border border-[#E5A93C]/40 text-[#E5A93C] font-mono font-black text-xs">
              {selectedCard.cardNetwork || 'RUPAY'}
            </span>
            {selectedCard.supportsUpiOnCard && (
              <span className="text-[9px] text-[#A6CDB5] mt-1 font-bold flex items-center gap-1">
                <Smartphone className="w-2.5 h-2.5" />
                UPI on CC Active
              </span>
            )}
          </div>
        </div>

        {/* Card Number Mask & Holder */}
        <div className="mt-5 flex items-center justify-between font-mono">
          <div className="text-sm sm:text-base font-bold tracking-widest text-slate-300">
            •••• •••• •••• {selectedCard.lastFour || '5210'}
          </div>
          <div className="text-xs text-[#7E9A89]">
            Cycle: {cycleDay}th to {cycleDay - 1}th
          </div>
        </div>

        {/* Unbilled Spend & Limits */}
        <div className="mt-4 pt-4 border-t border-[#1C3E2C] grid grid-cols-2 gap-3">
          <div>
            <span className="text-[10px] text-[#7E9A89] uppercase tracking-wider block font-medium">
              Current Unbilled Spend
            </span>
            <div className="text-xl sm:text-2xl font-black text-white font-mono mt-0.5">
              {formatCurrency(stats.unbilledSpend)}
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-[#7E9A89] uppercase tracking-wider block font-medium">
              Available Credit Limit
            </span>
            <div className="text-sm sm:text-base font-bold text-[#E5A93C] font-mono mt-0.5">
              {formatCurrency(stats.availableLimit)}
              <span className="text-[10px] text-slate-400 block font-sans">
                of {formatCurrency(stats.creditLimit)}
              </span>
            </div>
          </div>
        </div>

        {/* Limit Utilization Progress Bar */}
        <div className="mt-3 space-y-1">
          <div className="w-full h-2 bg-[#060D09] rounded-full overflow-hidden p-0.5 border border-[#162F21]">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                stats.utilizationPct > 60 
                  ? 'bg-rose-500' 
                  : stats.utilizationPct > 30 
                  ? 'bg-amber-400' 
                  : 'bg-gradient-to-r from-emerald-500 to-[#E5A93C]'
              }`}
              style={{ width: `${Math.max(5, stats.utilizationPct)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-[#7E9A89]">
            <span>{stats.utilizationPct}% Limit Utilized</span>
            <span>Billing Day: {cycleDay}th</span>
          </div>
        </div>

        {/* Quick Action Buttons on Card */}
        <div className="mt-4 pt-3 border-t border-[#1C3E2C] flex items-center justify-between">
          <button
            onClick={() => setIsPayBillOpen(true)}
            className="py-1.5 px-3 rounded-xl bg-[#E5A93C] hover:bg-[#F3C766] text-black font-extrabold text-xs flex items-center gap-1.5 transition-transform active:scale-95"
          >
            <DollarSign className="w-3.5 h-3.5 stroke-[3]" />
            <span>Record Bill Payment</span>
          </button>

          <button
            onClick={handleExportStatement}
            className="py-1.5 px-3 rounded-xl bg-[#12271C] hover:bg-[#1A3828] border border-[#2B5E43] text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Statement</span>
          </button>
        </div>
      </div>

      {/* Pay Bill Form Modal Sheet */}
      {isPayBillOpen && (
        <div className="p-4 rounded-3xl bg-[#0C1A13] border border-[#1E4330] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-[#E5A93C]" />
              Record Credit Card Bill Payment
            </span>
            <button onClick={() => setIsPayBillOpen(false)} className="text-slate-400 hover:text-white">
              ✕
            </button>
          </div>

          <form onSubmit={handlePayBill} className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-[#7E9A89] mb-1">Payment Amount ({currencySymbol})</label>
                <input
                  type="number"
                  placeholder={String(stats.unbilledSpend || 1000)}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#07120C] border border-[#234E37] text-xs font-mono text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#7E9A89] mb-1">Paid From Bank Account</label>
                <select
                  value={payFromBankId}
                  onChange={(e) => setPayFromBankId(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl bg-[#07120C] border border-[#234E37] text-xs text-white focus:outline-none"
                >
                  {accounts.filter(a => a.type === 'BANK').map(bank => (
                    <option key={bank.id} value={bank.id}>{bank.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#E5A93C] hover:bg-[#F3C766] text-black font-extrabold text-xs flex items-center justify-center gap-1.5"
            >
              Confirm Bill Payment
            </button>
          </form>
        </div>
      )}

      {/* Statement Filtering & History Section */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#E5A93C]" />
            Statement History ({filteredTransactions.length})
          </span>
          <span className="text-[11px] text-[#7E9A89]">Human-readable merchants & routes</span>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex p-1 rounded-2xl bg-[#07110C] border border-[#163022]">
          <button
            onClick={() => setBillingPeriodTab('CURRENT')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
              billingPeriodTab === 'CURRENT'
                ? 'bg-[#183626] text-[#E5A93C] shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Current Cycle (Unbilled)
          </button>

          <button
            onClick={() => setBillingPeriodTab('PREVIOUS')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
              billingPeriodTab === 'PREVIOUS'
                ? 'bg-[#183626] text-[#E5A93C] shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Previous Cycle (Billed)
          </button>

          <button
            onClick={() => setBillingPeriodTab('ALL')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
              billingPeriodTab === 'ALL'
                ? 'bg-[#183626] text-[#E5A93C] shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All History
          </button>
        </div>

        {/* Specific Payment Subtype Chips */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => setSubtypeFilter('ALL')}
            className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
              subtypeFilter === 'ALL'
                ? 'bg-[#1E4330] border-[#E5A93C] text-white font-bold'
                : 'bg-[#09150E] border-[#183626] text-slate-400'
            }`}
          >
            All Methods
          </button>

          <button
            onClick={() => setSubtypeFilter('UPI_ON_CREDIT_CARD')}
            className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-medium border flex items-center gap-1 transition-all ${
              subtypeFilter === 'UPI_ON_CREDIT_CARD'
                ? 'bg-[#1E4330] border-[#E5A93C] text-[#E5A93C] font-bold'
                : 'bg-[#09150E] border-[#183626] text-slate-400'
            }`}
          >
            <Smartphone className="w-3 h-3 text-[#E5A93C]" />
            <span>UPI on Card</span>
          </button>

          <button
            onClick={() => setSubtypeFilter('DIRECT_SWIPE')}
            className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
              subtypeFilter === 'DIRECT_SWIPE'
                ? 'bg-[#1E4330] border-[#E5A93C] text-white font-bold'
                : 'bg-[#09150E] border-[#183626] text-slate-400'
            }`}
          >
            Direct POS Swipe
          </button>

          <button
            onClick={() => setSubtypeFilter('ONLINE')}
            className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
              subtypeFilter === 'ONLINE'
                ? 'bg-[#1E4330] border-[#E5A93C] text-white font-bold'
                : 'bg-[#09150E] border-[#183626] text-slate-400'
            }`}
          >
            Online / E-Com
          </button>
        </div>

        {/* UPI App Specific Quick Filters (PhonePe, super.money, GPay, Paytm, CRED, BHIM) */}
        {(subtypeFilter === 'UPI_ON_CREDIT_CARD' || cardTransactions.some(t => t.ccPaymentSubtype === 'UPI_ON_CREDIT_CARD')) && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 px-1.5 bg-[#09150E]/60 rounded-xl border border-[#142A1D]">
            <span className="text-[10px] text-[#7E9A89] font-bold shrink-0 uppercase tracking-wider pl-1">
              App:
            </span>
            <button
              onClick={() => setSelectedUpiBrandFilter('ALL')}
              className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all ${
                selectedUpiBrandFilter === 'ALL'
                  ? 'bg-[#1E4330] border-[#E5A93C] text-[#E5A93C]'
                  : 'bg-transparent border-transparent text-slate-400 hover:text-white'
              }`}
            >
              All Apps
            </button>
            {UPI_BRAND_LIST.map(brand => {
              const count = cardTransactions.filter(t => 
                (t.upiBrandId === brand.id || t.upiAppId === `upi-${brand.id}`) &&
                (billingPeriodTab === 'ALL' || (billingPeriodTab === 'CURRENT' ? t.date >= currentCycleStart : (t.date >= prevCycleStart && t.date <= prevCycleEnd)))
              ).length;
              const isSelected = selectedUpiBrandFilter === brand.id;

              return (
                <button
                  key={brand.id}
                  onClick={() => {
                    setSelectedUpiBrandFilter(isSelected ? 'ALL' : brand.id);
                    if (subtypeFilter !== 'UPI_ON_CREDIT_CARD') {
                      setSubtypeFilter('UPI_ON_CREDIT_CARD');
                    }
                  }}
                  className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 transition-all ${
                    isSelected
                      ? `${brand.bgClass} ${brand.textClass} ${brand.borderClass} ring-1 ring-[#E5A93C]`
                      : 'bg-[#10241A] border-[#1C3E2C] text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: brand.dotColor }} />
                  <span>{brand.shortName}</span>
                  {count > 0 && (
                    <span className="text-[9px] opacity-75 font-mono">({count})</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* The Enriched Statement Item List */}
        {filteredTransactions.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#09150E] border border-dashed border-[#183424] text-center space-y-2">
            <CreditCard className="w-8 h-8 text-[#7E9A89] mx-auto opacity-50" />
            <p className="text-xs font-semibold text-slate-300">No transactions in this statement period</p>
            <p className="text-[11px] text-[#7E9A89]">Transactions verified from SMS or entered manually appear here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTransactions.map(tx => {
              const cat = categoryMap.get(tx.categoryId);
              const isUpiOnCard = tx.ccPaymentSubtype === 'UPI_ON_CREDIT_CARD' || tx.paymentMode === 'UPI';
              const isDirectSwipe = tx.ccPaymentSubtype === 'DIRECT_SWIPE';
              const isOnline = tx.ccPaymentSubtype === 'ONLINE';
              const upiMeta = getUpiBrandMeta(tx.upiBrandId || tx.upiAppId);

              return (
                <div
                  key={tx.id}
                  onClick={() => openEditTransaction(tx)}
                  className="p-3.5 rounded-2xl bg-[#0D1C14] hover:bg-[#132A1E] border border-[#193A28] hover:border-[#285A3E] transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3 truncate pr-2">
                    {/* Category or Route Avatar */}
                    <div className="w-10 h-10 rounded-2xl bg-[#142C1F] border border-[#234E37] flex items-center justify-center text-[#E5A93C] shrink-0 font-bold">
                      {isUpiOnCard ? (
                        <Smartphone className="w-4 h-4 text-[#E5A93C]" />
                      ) : (
                        <CreditCard className="w-4 h-4 text-[#7E9A89]" />
                      )}
                    </div>

                    <div className="truncate">
                      {/* Enriched Merchant Name (Clean & Human-friendly!) */}
                      <div className="text-xs font-bold text-white group-hover:text-[#E5A93C] transition-colors truncate flex items-center gap-1.5">
                        <span>{tx.merchant}</span>
                        {tx.isSmsVerified && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="SMS Reconciled" />
                        )}
                      </div>

                      {/* Item description & Subtype Badge */}
                      <div className="text-[11px] text-[#7E9A89] truncate flex items-center gap-1.5 mt-0.5">
                        <span className="text-slate-300 font-medium truncate">{tx.item}</span>
                        <span>•</span>
                        <span>{formatDateDisplay(tx.date)}</span>
                      </div>

                      {/* Route Badge (Displays PhonePe, super.money, GPay, etc. or Direct Swipe) */}
                      <div className="mt-1 flex items-center gap-1.5">
                        {isUpiOnCard ? (
                          upiMeta ? (
                            <span className={`px-2 py-0.5 rounded-md border text-[10px] font-black flex items-center gap-1.5 ${upiMeta.bgClass} ${upiMeta.textClass} ${upiMeta.borderClass}`}>
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: upiMeta.dotColor }} />
                              <span>{upiMeta.badgeLabel}</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-[#132B1E] border border-emerald-500/40 text-[10px] text-emerald-300 font-bold flex items-center gap-1">
                              <Smartphone className="w-2.5 h-2.5" />
                              <span>UPI on RuPay Card</span>
                            </span>
                          )
                        ) : isDirectSwipe ? (
                          <span className="px-2 py-0.5 rounded-md bg-[#112330] border border-sky-500/40 text-[10px] text-sky-300 font-bold flex items-center gap-1">
                            <CreditCard className="w-2.5 h-2.5" />
                            Direct POS Swipe
                          </span>
                        ) : isOnline ? (
                          <span className="px-2 py-0.5 rounded-md bg-[#241733] border border-purple-500/40 text-[10px] text-purple-300 font-bold">
                            Online E-Commerce
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-[#1E2015] border border-amber-500/40 text-[10px] text-amber-300 font-bold">
                            Credit Card Txn
                          </span>
                        )}

                        <span className="text-[10px] text-[#7E9A89]">
                          {cat?.name || 'General'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-mono font-black text-white">
                      -{formatCurrency(tx.amount)}
                    </div>
                    {tx.notes && (
                      <div className="text-[10px] text-[#7E9A89] max-w-[100px] truncate">
                        {tx.notes}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
