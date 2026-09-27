import React, { useState, useMemo } from 'react';
import { useHoneymoney } from '../context/HoneymoneyContext';
import { isDateInCurrentMonth, isDateInLastMonth } from '../utils/date';
import { 
  BarChart3, PieChart, TrendingUp, ArrowUpRight, 
  Calendar, CreditCard, ChevronRight, Filter
} from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const {
    transactions,
    categories,
    accounts,
    upiApps,
    currencySymbol,
    formatCurrency,
    setActiveTab
  } = useHoneymoney();

  const [period, setPeriod] = useState<'THIS_MONTH' | 'LAST_MONTH' | 'ALL_TIME'>('THIS_MONTH');
  const [breakdownTab, setBreakdownTab] = useState<'CATEGORY' | 'MERCHANT' | 'PAYMENT_MODE' | 'UPI_APP' | 'ACCOUNT'>('CATEGORY');

  // Filter transactions by chosen period
  const periodTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (period === 'THIS_MONTH') return isDateInCurrentMonth(t.date);
      if (period === 'LAST_MONTH') return isDateInLastMonth(t.date);
      return true;
    });
  }, [transactions, period]);

  // Overall totals
  const metrics = useMemo(() => {
    const expenses = periodTransactions.filter(t => t.transactionType === 'EXPENSE');
    const income = periodTransactions.filter(t => t.transactionType === 'INCOME');

    const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
    const count = expenses.length;
    const avg = count > 0 ? totalExpense / count : 0;

    return { totalExpense, totalIncome, count, avg };
  }, [periodTransactions]);

  // Month-over-month comparison if viewing THIS_MONTH
  const momComparison = useMemo(() => {
    if (period !== 'THIS_MONTH') return null;
    const lastMonthExpenses = transactions
      .filter(t => isDateInLastMonth(t.date) && t.transactionType === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);

    const diff = metrics.totalExpense - lastMonthExpenses;
    const percentDiff = lastMonthExpenses > 0 ? (diff / lastMonthExpenses) * 100 : 0;

    return {
      lastMonthExpenses,
      diff,
      percentDiff: Math.round(percentDiff),
      isHigher: diff > 0
    };
  }, [period, metrics.totalExpense, transactions]);

  // Category Breakdown
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { id: string; name: string; amount: number; count: number }> = {};
    for (const tx of periodTransactions.filter(t => t.transactionType === 'EXPENSE')) {
      const cat = categories.find(c => c.id === tx.categoryId);
      const name = cat?.name || 'General';
      if (!map[tx.categoryId]) {
        map[tx.categoryId] = { id: tx.categoryId, name, amount: 0, count: 0 };
      }
      map[tx.categoryId].amount += tx.amount;
      map[tx.categoryId].count += 1;
    }
    return Object.values(map).sort((a, b) => b.amount - a.amount);
  }, [periodTransactions, categories]);

  // Merchant Breakdown
  const merchantBreakdown = useMemo(() => {
    const map: Record<string, { merchant: string; amount: number; count: number }> = {};
    for (const tx of periodTransactions.filter(t => t.transactionType === 'EXPENSE')) {
      const m = tx.merchant || 'Other';
      if (!map[m]) {
        map[m] = { merchant: m, amount: 0, count: 0 };
      }
      map[m].amount += tx.amount;
      map[m].count += 1;
    }
    return Object.values(map).sort((a, b) => b.amount - a.amount).slice(0, 8);
  }, [periodTransactions]);

  // Payment Mode Breakdown
  const paymentModeBreakdown = useMemo(() => {
    const map: Record<string, { mode: string; amount: number; count: number }> = {};
    for (const tx of periodTransactions.filter(t => t.transactionType === 'EXPENSE')) {
      const mode = tx.paymentMode.replace('_', ' ');
      if (!map[mode]) {
        map[mode] = { mode, amount: 0, count: 0 };
      }
      map[mode].amount += tx.amount;
      map[mode].count += 1;
    }
    return Object.values(map).sort((a, b) => b.amount - a.amount);
  }, [periodTransactions]);

  // UPI App Share Breakdown
  const upiAppBreakdown = useMemo(() => {
    const upiExpenses = periodTransactions.filter(t => t.paymentMode === 'UPI' && t.transactionType === 'EXPENSE');
    const map: Record<string, { name: string; amount: number; count: number }> = {};
    for (const tx of upiExpenses) {
      const upi = upiApps.find(u => u.id === tx.upiAppId);
      const name = upi?.name || 'Other UPI';
      if (!map[name]) {
        map[name] = { name, amount: 0, count: 0 };
      }
      map[name].amount += tx.amount;
      map[name].count += 1;
    }
    return Object.values(map).sort((a, b) => b.amount - a.amount);
  }, [periodTransactions, upiApps]);

  // Account / Card Share
  const accountBreakdown = useMemo(() => {
    const map: Record<string, { name: string; institution: string; amount: number; count: number }> = {};
    for (const tx of periodTransactions.filter(t => t.transactionType === 'EXPENSE')) {
      const acc = accounts.find(a => a.id === tx.accountId);
      const name = acc?.name || 'Account';
      const inst = acc?.institution || '';
      if (!map[name]) {
        map[name] = { name, institution: inst, amount: 0, count: 0 };
      }
      map[name].amount += tx.amount;
      map[name].count += 1;
    }
    return Object.values(map).sort((a, b) => b.amount - a.amount);
  }, [periodTransactions, accounts]);

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">
            Spending Analytics
          </h1>
          <p className="text-xs text-[#7E9A89]">
            Deep memory breakdown & trends
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex p-1 bg-[#0A1610] rounded-xl border border-[#1A3828]">
          {[
            { id: 'THIS_MONTH', label: 'This Month' },
            { id: 'LAST_MONTH', label: 'Last Month' },
            { id: 'ALL_TIME', label: 'All Time' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPeriod(tab.id as any)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                period === tab.id
                  ? 'bg-[#E5A93C] text-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Hero Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3.5 rounded-2xl bg-[#0D1C14] border border-[#1E4330]">
          <span className="text-[10px] text-[#7E9A89] uppercase tracking-wider block">Total Spend</span>
          <span className="text-lg font-black text-[#E5A93C] font-mono block mt-0.5">
            {formatCurrency(metrics.totalExpense)}
          </span>
          <span className="text-[10px] text-[#A6CDB5]">{metrics.count} expenses</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#0D1C14] border border-[#1E4330]">
          <span className="text-[10px] text-[#7E9A89] uppercase tracking-wider block">Avg / Transaction</span>
          <span className="text-lg font-black text-white font-mono block mt-0.5">
            {formatCurrency(metrics.avg)}
          </span>
          <span className="text-[10px] text-slate-400">per purchase</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#0D1C14] border border-[#1E4330]">
          <span className="text-[10px] text-[#7E9A89] uppercase tracking-wider block">Total Income</span>
          <span className="text-lg font-black text-emerald-400 font-mono block mt-0.5">
            {formatCurrency(metrics.totalIncome)}
          </span>
          <span className="text-[10px] text-emerald-500/80">Inflow</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#0D1C14] border border-[#1E4330]">
          <span className="text-[10px] text-[#7E9A89] uppercase tracking-wider block">Net Balance</span>
          <span className={`text-lg font-black font-mono block mt-0.5 ${metrics.totalIncome - metrics.totalExpense >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCurrency(metrics.totalIncome - metrics.totalExpense)}
          </span>
          <span className="text-[10px] text-slate-400">Period flow</span>
        </div>
      </div>

      {/* Month-over-month banner if viewing THIS_MONTH */}
      {momComparison && (
        <div className="p-3 bg-[#0F2018] border border-[#234E37] rounded-2xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#E5A93C]" />
            <span className="text-slate-200">
              Last month total spend: <strong className="font-mono text-white">{formatCurrency(momComparison.lastMonthExpenses)}</strong>
            </span>
          </div>
          <span className={`font-bold font-mono px-2 py-0.5 rounded-full ${
            momComparison.isHigher 
              ? 'bg-red-950/60 text-red-400 border border-red-800/40' 
              : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
          }`}>
            {momComparison.isHigher ? '+' : ''}{momComparison.percentDiff}% MoM
          </span>
        </div>
      )}

      {/* Breakdown Dimension Tabs */}
      <div className="p-1 bg-[#0A1610] rounded-xl border border-[#183424] flex overflow-x-auto no-scrollbar gap-1">
        {[
          { key: 'CATEGORY', label: 'Category' },
          { key: 'MERCHANT', label: 'Merchant' },
          { key: 'PAYMENT_MODE', label: 'Payment Mode' },
          { key: 'UPI_APP', label: 'UPI Rail' },
          { key: 'ACCOUNT', label: 'Accounts/Cards' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setBreakdownTab(tab.key as any)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
              breakdownTab === tab.key
                ? 'bg-[#1C3E2C] text-[#E5A93C] border border-[#E5A93C]/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Breakdown List with Visual Proportion Bars */}
      <div className="bg-[#0C1A13] border border-[#1D402D] rounded-2xl p-4 space-y-3">
        <h3 className="text-xs font-bold text-[#E5A93C] uppercase tracking-wider">
          {breakdownTab === 'CATEGORY' && 'Spending by Category'}
          {breakdownTab === 'MERCHANT' && 'Top Merchants by Volume'}
          {breakdownTab === 'PAYMENT_MODE' && 'Distribution by Payment Method'}
          {breakdownTab === 'UPI_APP' && 'UPI App Market Share'}
          {breakdownTab === 'ACCOUNT' && 'Bank & Card Utilization'}
        </h3>

        {/* Category List */}
        {breakdownTab === 'CATEGORY' && (
          <div className="space-y-2.5">
            {categoryBreakdown.length === 0 ? (
              <p className="text-xs text-[#7E9A89]">No expenses recorded in this period.</p>
            ) : (
              categoryBreakdown.map((item) => {
                const pct = metrics.totalExpense > 0 ? (item.amount / metrics.totalExpense) * 100 : 0;
                return (
                  <div key={item.id} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-white">{item.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#E5A93C]">{formatCurrency(item.amount)}</span>
                        <span className="text-[10px] text-[#7E9A89] font-mono">({Math.round(pct)}%)</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-[#07110C] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-[#E5A93C] rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Merchant List */}
        {breakdownTab === 'MERCHANT' && (
          <div className="space-y-2.5">
            {merchantBreakdown.map((item, idx) => {
              const pct = metrics.totalExpense > 0 ? (item.amount / metrics.totalExpense) * 100 : 0;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-white">{item.merchant}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#E5A93C]">{formatCurrency(item.amount)}</span>
                      <span className="text-[10px] text-[#7E9A89]">({item.count} orders)</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-[#07110C] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Payment Mode List */}
        {breakdownTab === 'PAYMENT_MODE' && (
          <div className="space-y-2.5">
            {paymentModeBreakdown.map((item, idx) => {
              const pct = metrics.totalExpense > 0 ? (item.amount / metrics.totalExpense) * 100 : 0;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-white">{item.mode}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#E5A93C]">{formatCurrency(item.amount)}</span>
                      <span className="text-[10px] text-[#7E9A89]">({Math.round(pct)}%)</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-[#07110C] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-400 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* UPI App Share */}
        {breakdownTab === 'UPI_APP' && (
          <div className="space-y-2.5">
            {upiAppBreakdown.length === 0 ? (
              <p className="text-xs text-[#7E9A89]">No UPI transactions in this period.</p>
            ) : (
              upiAppBreakdown.map((item, idx) => {
                const totalUpi = upiAppBreakdown.reduce((s, u) => s + u.amount, 0);
                const pct = totalUpi > 0 ? (item.amount / totalUpi) * 100 : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-white">{item.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#E5A93C]">{formatCurrency(item.amount)}</span>
                        <span className="text-[10px] text-[#7E9A89]">({Math.round(pct)}%)</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-[#07110C] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-400 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Account / Card */}
        {breakdownTab === 'ACCOUNT' && (
          <div className="space-y-2.5">
            {accountBreakdown.map((item, idx) => {
              const pct = metrics.totalExpense > 0 ? (item.amount / metrics.totalExpense) * 100 : 0;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <div>
                      <span className="font-semibold text-white">{item.name}</span>
                      <span className="text-[10px] text-[#7E9A89] ml-1">({item.institution})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#E5A93C]">{formatCurrency(item.amount)}</span>
                      <span className="text-[10px] text-[#7E9A89]">({item.count} tx)</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-[#07110C] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
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
