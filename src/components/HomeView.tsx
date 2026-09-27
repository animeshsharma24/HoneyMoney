import React, { useMemo } from 'react';
import { useHoneymoney } from '../context/HoneymoneyContext';
import { isDateInCurrentMonth, formatDateDisplay, getMonthYearString, getTodayDateString } from '../utils/date';
import { getUpiBrandMeta } from '../types';
import { rankSmartSuggestions } from '../services/smartEntry';
import { 
  Plus, TrendingUp, Sparkles, Receipt, ArrowUpRight, 
  Wallet, ShieldCheck, ChevronRight, PieChart, Clock,
  Zap, Landmark
} from 'lucide-react';

export const HomeView: React.FC = () => {
  const {
    transactions,
    categories,
    accounts,
    upiApps,
    budgets,
    currencySymbol,
    formatCurrency,
    openAddTransaction,
    openEditTransaction,
    setActiveTab,
    pendingSmsCount,
    openSmsReview,
    openSmsSimulator
  } = useHoneymoney();

  const currentMonthName = useMemo(() => getMonthYearString(getTodayDateString()), []);

  // Compute this-month totals
  const thisMonthStats = useMemo(() => {
    const monthTx = transactions.filter(t => isDateInCurrentMonth(t.date));
    const totalExpense = monthTx
      .filter(t => t.transactionType === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = monthTx
      .filter(t => t.transactionType === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);
    const count = monthTx.length;

    // Day of month for daily average
    const dayOfMonth = Math.max(1, new Date().getDate());
    const dailyAvg = totalExpense / dayOfMonth;

    // Find top category
    const catTotals: Record<string, number> = {};
    for (const tx of monthTx) {
      if (tx.transactionType === 'EXPENSE') {
        catTotals[tx.categoryId] = (catTotals[tx.categoryId] || 0) + tx.amount;
      }
    }

    let topCatId = '';
    let topCatAmount = 0;
    for (const [cId, amt] of Object.entries(catTotals)) {
      if (amt > topCatAmount) {
        topCatAmount = amt;
        topCatId = cId;
      }
    }
    const topCat = categories.find(c => c.id === topCatId);

    return {
      totalExpense,
      totalIncome,
      count,
      dailyAvg,
      topCatName: topCat?.name || 'None',
      topCatAmount
    };
  }, [transactions, categories]);

  // Overall monthly budget status
  const overallBudget = useMemo(() => {
    const b = budgets.find(item => item.categoryId === 'ALL' || !item.categoryId);
    if (!b) return null;
    const spent = thisMonthStats.totalExpense;
    const limit = b.limitAmount;
    const percentage = Math.min(100, Math.round((spent / limit) * 100));
    return {
      limit,
      spent,
      remaining: Math.max(0, limit - spent),
      percentage,
      isOver: spent > limit
    };
  }, [budgets, thisMonthStats.totalExpense]);

  // Habitual / Smart quick entry starters from memory
  const habitualSuggestions = useMemo(() => {
    return rankSmartSuggestions(
      {},
      { transactions, categories, accounts, upiApps }
    );
  }, [transactions, categories, accounts, upiApps]);

  // Recent 6 transactions
  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => {
        if (b.date !== a.date) return b.date.localeCompare(a.date);
        return (b.createdAt || 0) - (a.createdAt || 0);
      })
      .slice(0, 7);
  }, [transactions]);

  const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
  const accountMap = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);
  const upiAppMap = useMemo(() => new Map(upiApps.map(u => [u.id, u])), [upiApps]);

  return (
    <div className="space-y-5 pb-20">
      {/* Top Monthly Overview Header */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#E5A93C] flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E5A93C] animate-pulse" />
          Monthly Overview
        </span>
        <span className="text-xs sm:text-sm font-semibold text-slate-300 tracking-tight">
          {getMonthYearString(getTodayDateString())}
        </span>
      </div>

      {/* Pending SMS Review Alert Card */}
      {pendingSmsCount > 0 && (
        <div 
          onClick={openSmsReview}
          className="p-4 rounded-3xl bg-gradient-to-r from-[#0E2038] via-[#142F21] to-[#0A1628] border border-[#E5A93C]/70 shadow-lg shadow-[#E5A93C]/15 cursor-pointer group transition-all hover:border-[#E5A93C]"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-r from-[#E5A93C] to-[#E5A93C] text-white flex items-center justify-center font-black shadow-md shadow-[#E5A93C]/25 shrink-0">
                <Zap className="w-5 h-5 fill-white" />
              </div>
              <div>
                <div className="text-xs font-black text-white flex items-center gap-1.5">
                  <span>{pendingSmsCount} Transaction SMSs Ready</span>
                  <span className="w-2 h-2 rounded-full bg-[#E5A93C] animate-ping" />
                </div>
                <div className="text-[11px] text-[#A6CDB5] mt-0.5">
                  Swipe cards to review & categorize merchants
                </div>
              </div>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-[#09150E] border border-[#234E37] group-hover:border-[#E5A93C] text-[#E5A93C] text-xs font-bold flex items-center gap-1 shrink-0 transition-colors">
              <span>Review</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      )}

      {/* Hero Monthly Total Card (Sleek deep navy, electric cyan highlights) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#122A1E] via-[#0E2017] to-[#0A1610] border border-[#1E4330] p-5 sm:p-6 shadow-xl">
        <div className="absolute top-0 right-0 w-44 h-44 bg-[#E5A93C]/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
          <span>{currentMonthName} Spend</span>
          <span className="font-mono text-[11px] bg-[#142C1F] text-[#F3C766] px-2 py-0.5 rounded-full border border-[#234E37]">
            {thisMonthStats.count} entries
          </span>
        </div>

        <div className="mt-1 flex items-baseline gap-1">
          <span className="text-2xl font-bold text-[#E5A93C]">{currencySymbol}</span>
          <span className="text-4xl sm:text-5xl font-black text-white tracking-tight font-mono">
            {Math.round(thisMonthStats.totalExpense).toLocaleString('en-IN')}
          </span>
        </div>

        {/* Budget Progress Bar if active */}
        {overallBudget && (
          <div className="mt-4 pt-4 border-t border-[#1C3E2C] space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">
                Monthly Budget: {formatCurrency(overallBudget.limit)}
              </span>
              <span className={`font-bold font-mono ${overallBudget.isOver ? 'text-red-400' : 'text-[#E5A93C]'}`}>
                {overallBudget.percentage}% used
              </span>
            </div>
            <div className="w-full h-2 bg-[#09101C] rounded-full overflow-hidden p-0.5 border border-[#1C3E2C]">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  overallBudget.isOver 
                    ? 'bg-red-500' 
                    : overallBudget.percentage > 80 
                    ? 'bg-amber-400' 
                    : 'bg-gradient-to-r from-[#E5A93C] to-[#E5A93C]'
                }`}
                style={{ width: `${Math.min(overallBudget.percentage, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Remaining: {formatCurrency(overallBudget.remaining)}</span>
              <span>{overallBudget.isOver ? 'Over budget' : 'On track'}</span>
            </div>
          </div>
        )}

        {/* Mini stats row */}
        <div className="mt-4 grid grid-cols-2 gap-2 pt-3 border-t border-[#1C3E2C]/80">
          <div className="p-2.5 rounded-xl bg-[#09101C]/80 border border-[#193B2A]">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Daily Average</span>
            <span className="text-sm font-bold text-white font-mono">{formatCurrency(thisMonthStats.dailyAvg)}/day</span>
          </div>
          <div className="p-2.5 rounded-xl bg-[#09101C]/80 border border-[#193B2A]">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Top Category</span>
            <span className="text-sm font-bold text-[#E5A93C] truncate block">{thisMonthStats.topCatName}</span>
          </div>
        </div>
      </div>

      {/* Clean Setup Banner when no accounts added yet */}
      {accounts.length === 0 && (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-[#0E2038] via-[#142F21] to-[#0A1628] border border-[#E5A93C]/60 shadow-lg shadow-[#E5A93C]/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-r from-[#E5A93C] to-[#E5A93C] text-white flex items-center justify-center font-black shadow-md shadow-[#E5A93C]/25 shrink-0">
              <Landmark className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-xs font-black text-white">Add Your Accounts & Cards</div>
              <div className="text-[11px] text-[#A6CDB5] mt-0.5">
                Link your bank, credit cards, or cash to start recording
              </div>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('ACCOUNTS')}
            className="px-3 py-1.5 rounded-xl bg-[#09150E] border border-[#234E37] hover:border-[#E5A93C] text-[#E5A93C] text-xs font-bold flex items-center gap-1 shrink-0 transition-colors"
          >
            <span>Add</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Habitual Spending Memory Shortcuts (Smart Entry Quick Tap) */}
      {habitualSuggestions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#E5A93C]" />
              Quick Shortcuts
            </span>
            <span className="text-[11px] text-slate-400">Quick log</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {habitualSuggestions.map((sug, idx) => (
              <button
                key={idx}
                onClick={() => openAddTransaction({
                  item: sug.item,
                  merchant: sug.merchant,
                  categoryId: sug.sourceTransaction.categoryId,
                  paymentMode: sug.paymentMode,
                  upiAppId: sug.sourceTransaction.upiAppId,
                  accountId: sug.sourceTransaction.accountId,
                  amount: sug.amount
                })}
                className="p-3 rounded-2xl bg-[#0D1C14] hover:bg-[#142038] border border-[#193A28] hover:border-[#E5A93C]/50 text-left transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white group-hover:text-[#E5A93C] transition-colors truncate">
                      {sug.item}
                    </span>
                    <span className="text-xs font-mono font-bold text-[#E5A93C]">
                      {currencySymbol}{sug.amount}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate mt-0.5">
                    {sug.categoryName} • {sug.merchant}
                  </div>
                </div>
                <div className="mt-2 text-[10px] text-slate-400 font-medium flex items-center gap-1">
                  <span>Logged {sug.frequency}x</span>
                  <ArrowUpRight className="w-3 h-3 text-[#E5A93C] ml-auto group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent Transactions Feed */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#E5A93C]" />
            Recent Transactions
          </span>
          <button
            onClick={() => setActiveTab('TRANSACTIONS')}
            className="text-xs text-[#E5A93C] hover:underline flex items-center gap-0.5 font-medium"
          >
            View all ({transactions.length})
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#0D1C14] border border-dashed border-[#1E4330] text-center space-y-2">
            <Wallet className="w-8 h-8 text-slate-500 mx-auto opacity-60" />
            <p className="text-sm font-medium text-slate-300">No transactions recorded yet</p>
            <p className="text-xs text-slate-500">Tap the "+" button to record your first transaction.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {recentTransactions.map((tx) => {
              const cat = categoryMap.get(tx.categoryId);
              const acc = accountMap.get(tx.accountId);
              const upi = tx.upiAppId ? upiAppMap.get(tx.upiAppId) : undefined;
              const isIncome = tx.transactionType === 'INCOME';

              return (
                <div
                  key={tx.id}
                  onClick={() => openEditTransaction(tx)}
                  className="p-3 rounded-2xl bg-[#0D1C14] hover:bg-[#142038] border border-[#193A28] hover:border-[#285A3E] transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3 truncate pr-2">
                    <div className="w-9 h-9 rounded-xl bg-[#142C1F] border border-[#234E37] flex items-center justify-center text-[#E5A93C] shrink-0 font-bold text-sm">
                      {tx.item.charAt(0)}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold text-white group-hover:text-[#E5A93C] transition-colors truncate">
                        {tx.item}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate flex items-center gap-1.5">
                        <span>{cat?.name || 'General'}</span>
                        <span>•</span>
                        <span>{tx.merchant}</span>
                        <span>•</span>
                        <span>{formatDateDisplay(tx.date)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className={`text-xs font-mono font-extrabold ${isIncome ? 'text-emerald-400' : 'text-slate-100'}`}>
                      {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium flex items-center justify-end gap-1 mt-0.5">
                      {(() => {
                        const upiMeta = getUpiBrandMeta(tx.upiBrandId || tx.upiAppId);
                        if (tx.paymentMode === 'CREDIT_CARD') {
                          if (tx.ccPaymentSubtype === 'UPI_ON_CREDIT_CARD') {
                            return upiMeta ? (
                              <span className={`px-1.5 py-0.5 rounded-md border text-[9px] font-black inline-flex items-center gap-1 ${upiMeta.bgClass} ${upiMeta.textClass} ${upiMeta.borderClass}`}>
                                <span className="w-1 h-1 rounded-full" style={{ backgroundColor: upiMeta.dotColor }} />
                                <span>{upiMeta.badgeLabel}</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-emerald-400 font-bold">RuPay UPI</span>
                            );
                          }
                          return <span>{tx.ccPaymentSubtype === 'DIRECT_SWIPE' ? 'POS Swipe' : tx.ccPaymentSubtype === 'ONLINE' ? 'Online CC' : 'Card'}</span>;
                        }
                        if (tx.paymentMode === 'UPI') {
                          return upiMeta ? (
                            <span className={`px-1.5 py-0.5 rounded-md border text-[9px] font-black inline-flex items-center gap-1 ${upiMeta.bgClass} ${upiMeta.textClass} ${upiMeta.borderClass}`}>
                              <span className="w-1 h-1 rounded-full" style={{ backgroundColor: upiMeta.dotColor }} />
                              <span>{upiMeta.badgeLabel}</span>
                            </span>
                          ) : (
                            <span>{upi ? upi.name : 'UPI'}</span>
                          );
                        }
                        return <span>{tx.paymentMode.replace('_', ' ')}</span>;
                      })()}
                      {tx.receipt && <Receipt className="w-3 h-3 text-[#E5A93C]" />}
                    </div>
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
