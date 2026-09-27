import React, { useState } from 'react';
import { useHoneymoney } from '../context/HoneymoneyContext';
import { RecurringTransaction, TransactionType } from '../types';
import { getTodayDateString } from '../utils/date';
import { Plus, Repeat, Calendar, Trash2, Check, X, ShieldAlert } from 'lucide-react';

export const RecurringView: React.FC = () => {
  const { recurring, categories, accounts, addRecurring, updateRecurring, deleteRecurring, formatCurrency } = useHoneymoney();
  const [isAdding, setIsAdding] = useState(false);
  const [serviceName, setServiceName] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY' | 'WEEKLY'>('MONTHLY');
  const [nextDate, setNextDate] = useState(getTodayDateString());
  const [notes, setNotes] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!serviceName.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

    addRecurring({
      serviceName,
      amount: parsedAmount,
      transactionType: 'EXPENSE',
      categoryId,
      accountId,
      billingCycle,
      nextDate,
      isActive: true,
      notes: notes.trim() || undefined
    });

    setServiceName('');
    setAmount('');
    setNotes('');
    setIsAdding(false);
  };

  const totalMonthlyCommitment = recurring
    .filter(r => r.isActive)
    .reduce((sum, r) => {
      if (r.billingCycle === 'MONTHLY') return sum + r.amount;
      if (r.billingCycle === 'YEARLY') return sum + (r.amount / 12);
      if (r.billingCycle === 'WEEKLY') return sum + (r.amount * 4.33);
      return sum;
    }, 0);

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">
            Subscriptions & Recurring
          </h1>
          <p className="text-xs text-[#7E9A89]">
            Fixed commitments & renewals
          </p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#E5A93C] to-[#E5A93C] text-black font-extrabold text-xs shadow-md shadow-[#E5A93C]/25 flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Subscription</span>
        </button>
      </div>

      {/* Summary Banner */}
      <div className="p-4 rounded-2xl bg-[#0D1C14] border border-[#1E4330] flex items-center justify-between">
        <div>
          <span className="text-[11px] text-[#7E9A89] block">Total Monthly Commitment</span>
          <span className="text-xl font-black text-[#E5A93C] font-mono">
            {formatCurrency(Math.round(totalMonthlyCommitment))}
          </span>
        </div>
        <span className="text-xs font-semibold text-slate-300 bg-[#162F22] px-3 py-1.5 rounded-xl border border-[#214935]">
          {recurring.filter(r => r.isActive).length} active recurring
        </span>
      </div>

      {/* Subscriptions List */}
      {recurring.length === 0 ? (
        <div className="p-8 rounded-2xl bg-[#0C1711] border border-dashed border-[#1E4330] text-center space-y-3">
          <Repeat className="w-10 h-10 text-[#7E9A89] mx-auto opacity-60" />
          <div>
            <h3 className="text-sm font-bold text-white">No Recurring Subscriptions</h3>
            <p className="text-xs text-[#7E9A89] mt-1 max-w-xs mx-auto">
              Track your regular payments such as rent, SIP, Netflix, WiFi bills, or gym memberships.
            </p>
          </div>
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 rounded-xl bg-[#E5A93C] text-black font-extrabold text-xs inline-flex items-center gap-1.5 shadow-md shadow-[#E5A93C]/25"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add First Subscription</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {recurring.map((rec) => {
            const cat = categories.find(c => c.id === rec.categoryId);
            const acc = accounts.find(a => a.id === rec.accountId);

            return (
              <div
                key={rec.id}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                  rec.isActive
                    ? 'bg-[#0D1C14] border-[#1E4330]'
                    : 'bg-[#08120D] border-[#162B1F] opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#142C1F] border border-[#234E37] flex items-center justify-center text-[#E5A93C]">
                    <Repeat className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-white">{rec.serviceName}</h3>
                      <span className="text-[10px] text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-1.5 py-0.2 rounded font-mono">
                        {rec.billingCycle}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#7E9A89]">
                      Next renewal: {rec.nextDate} • {acc?.name || 'Card'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-sm font-mono font-bold text-[#E5A93C] block">
                      {formatCurrency(rec.amount)}
                    </span>
                    <button
                      onClick={() => updateRecurring({ ...rec, isActive: !rec.isActive })}
                      className="text-[10px] text-[#7E9A89] hover:underline"
                    >
                      {rec.isActive ? 'Active' : 'Paused'}
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      if (confirm(`Delete subscription ${rec.serviceName}?`)) {
                        deleteRecurring(rec.id);
                      }
                    }}
                    className="p-1 text-slate-500 hover:text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Subscription Modal */}
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
              <h3 className="text-sm font-bold text-white">Add Subscription</h3>
              <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Service / Subscription Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Netflix, Spotify, Gym Membership"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  className="w-full bg-[#08120D] border border-[#1E4330] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E5A93C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Amount</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 649"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-[#08120D] border border-[#1E4330] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E5A93C]"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Cycle</label>
                  <select
                    value={billingCycle}
                    onChange={(e) => setBillingCycle(e.target.value as any)}
                    className="w-full bg-[#08120D] border border-[#1E4330] rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="YEARLY">Yearly</option>
                    <option value="WEEKLY">Weekly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full bg-[#08120D] border border-[#1E4330] rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Paid From</label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full bg-[#08120D] border border-[#1E4330] rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Next Billing Date</label>
                <input
                  type="date"
                  value={nextDate}
                  onChange={(e) => setNextDate(e.target.value)}
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
                  Save Subscription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
