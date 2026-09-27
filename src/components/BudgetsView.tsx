import React, { useState } from 'react';
import { useHoneymoney } from '../context/HoneymoneyContext';
import { Budget } from '../types';
import { isDateInCurrentMonth } from '../utils/date';
import { Plus, Target, AlertTriangle, CheckCircle2, Trash2, X } from 'lucide-react';

export const BudgetsView: React.FC = () => {
  const { budgets, categories, transactions, addBudget, deleteBudget, currencySymbol, formatCurrency } = useHoneymoney();
  const [isAdding, setIsAdding] = useState(false);
  const [categoryId, setCategoryId] = useState('ALL');
  const [limitAmount, setLimitAmount] = useState('');
  const [alertThreshold, setAlertThreshold] = useState('80');

  // Compute spend for each budget in current month
  const currentMonthExpenses = transactions.filter(t => isDateInCurrentMonth(t.date) && t.transactionType === 'EXPENSE');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const limit = parseFloat(limitAmount);
    if (isNaN(limit) || limit <= 0) return;

    addBudget({
      categoryId,
      period: 'MONTHLY',
      limitAmount: limit,
      alertThreshold: parseInt(alertThreshold, 10) || 80
    });

    setLimitAmount('');
    setIsAdding(false);
  };

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">
            Budgets & Limits
          </h1>
          <p className="text-xs text-[#7E9A89]">
            Monthly spending targets & warning thresholds
          </p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#E5A93C] to-[#E5A93C] text-black font-extrabold text-xs shadow-md shadow-[#E5A93C]/25 flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Budget</span>
        </button>
      </div>

      {budgets.length === 0 ? (
        <div className="p-8 rounded-2xl bg-[#0C1711] border border-dashed border-[#1E4330] text-center space-y-3">
          <Target className="w-10 h-10 text-[#7E9A89] mx-auto opacity-60" />
          <div>
            <h3 className="text-sm font-bold text-white">No Monthly Budgets Set</h3>
            <p className="text-xs text-[#7E9A89] mt-1 max-w-xs mx-auto">
              Set spending limits for overall expenses or specific categories like Food and Shopping.
            </p>
          </div>
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 rounded-xl bg-[#E5A93C] text-black font-extrabold text-xs inline-flex items-center gap-1.5 shadow-md shadow-[#E5A93C]/25"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Set First Budget</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {budgets.map((b) => {
            const isOverall = b.categoryId === 'ALL' || !b.categoryId;
          const cat = !isOverall ? categories.find(c => c.id === b.categoryId) : null;
          const label = isOverall ? 'Overall Monthly Budget' : `${cat?.name || 'Category'} Budget`;

          const spent = currentMonthExpenses
            .filter(t => isOverall || t.categoryId === b.categoryId)
            .reduce((sum, t) => sum + t.amount, 0);

          const percent = Math.min(100, Math.round((spent / b.limitAmount) * 100));
          const isOver = spent > b.limitAmount;
          const isWarning = percent >= b.alertThreshold;

          return (
            <div
              key={b.id}
              className="p-4 rounded-2xl bg-[#0D1C14] border border-[#1E4330] space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-[#E5A93C]" />
                    <h3 className="text-xs font-bold text-white">{label}</h3>
                  </div>
                  <span className="text-[10px] text-[#7E9A89] block mt-0.5">
                    Limit: {formatCurrency(b.limitAmount)} / month
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                    isOver 
                      ? 'bg-red-950/70 text-red-400 border border-red-800/40' 
                      : isWarning 
                      ? 'bg-amber-950/70 text-amber-400 border border-amber-800/40' 
                      : 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/40'
                  }`}>
                    {percent}% used
                  </span>

                  <button
                    onClick={() => deleteBudget(b.id)}
                    className="p-1 text-slate-500 hover:text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 bg-[#08120D] rounded-full overflow-hidden p-0.5 border border-[#1C3E2C]">
                <div
                  className={`h-full rounded-full transition-all ${
                    isOver ? 'bg-red-500' : isWarning ? 'bg-amber-400' : 'bg-gradient-to-r from-emerald-500 to-[#E5A93C]'
                  }`}
                  style={{ width: `${percent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-[#7E9A89]">
                <span>Spent: <strong className="text-white font-mono">{formatCurrency(spent)}</strong></span>
                <span>Remaining: <strong className="text-white font-mono">{formatCurrency(Math.max(0, b.limitAmount - spent))}</strong></span>
              </div>
            </div>
          );
        })}
      </div>
    )}

      {/* Add Budget Modal */}
      {isAdding && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setIsAdding(false)}
        >
          <div 
            className="w-full max-w-md bg-[#0F1E16] border border-[#224A35] rounded-3xl p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#1A3828]">
              <h3 className="text-sm font-bold text-white">Create Monthly Budget</h3>
              <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Target Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full bg-[#08120D] border border-[#1E4330] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="ALL">Overall (All Categories)</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Monthly Limit ({currencySymbol})</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 15000"
                  value={limitAmount}
                  onChange={(e) => setLimitAmount(e.target.value)}
                  className="w-full bg-[#08120D] border border-[#1E4330] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E5A93C]"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Warning Threshold (% of limit)</label>
                <input
                  type="number"
                  min="50"
                  max="100"
                  value={alertThreshold}
                  onChange={(e) => setAlertThreshold(e.target.value)}
                  className="w-full bg-[#08120D] border border-[#1E4330] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 rounded-xl bg-[#142C1F] text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#E5A93C] text-black text-xs font-bold"
                >
                  Save Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
