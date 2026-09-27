import React, { useState } from 'react';
import { useHoneymoney } from '../context/HoneymoneyContext';
import { Account, AccountType } from '../types';
import { Plus, CreditCard, Landmark, Wallet, Trash2, X, Check } from 'lucide-react';

export const AccountsView: React.FC = () => {
  const { accounts, addAccount, deleteAccount, transactions, formatCurrency } = useHoneymoney();
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [type, setType] = useState<AccountType>('BANK');
  const [lastFour, setLastFour] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !institution.trim()) return;

    addAccount({
      name,
      institution,
      type,
      lastFour: lastFour.trim() ? lastFour.slice(0, 4) : undefined,
      isActive: true
    });

    setName('');
    setInstitution('');
    setLastFour('');
    setIsAdding(false);
  };

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">
            Accounts & Cards
          </h1>
          <p className="text-xs text-[#7E9A89]">
            Bank accounts, credit cards, cash wallets
          </p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#E5A93C] to-[#E5A93C] text-black font-extrabold text-xs shadow-md shadow-[#E5A93C]/25 flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Account</span>
        </button>
      </div>

      {/* Account Cards Grid */}
      {accounts.length === 0 ? (
        <div className="p-8 rounded-2xl bg-[#0C1711] border border-dashed border-[#1E4330] text-center space-y-3">
          <Landmark className="w-10 h-10 text-[#7E9A89] mx-auto opacity-60" />
          <div>
            <h3 className="text-sm font-bold text-white">No Accounts or Cards Yet</h3>
            <p className="text-xs text-[#7E9A89] mt-1 max-w-xs mx-auto">
              Add your bank accounts, credit cards, or cash wallet to start tracking your finances.
            </p>
          </div>
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 rounded-xl bg-[#E5A93C] text-black font-extrabold text-xs inline-flex items-center gap-1.5 shadow-md shadow-[#E5A93C]/25"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add First Account</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {accounts.map((acc) => {
          const txCount = transactions.filter(t => t.accountId === acc.id).length;
          const totalSpent = transactions
            .filter(t => t.accountId === acc.id && t.transactionType === 'EXPENSE')
            .reduce((sum, t) => sum + t.amount, 0);

          return (
            <div
              key={acc.id}
              className="p-4 rounded-2xl bg-[#0D1C14] border border-[#1E4330] flex flex-col justify-between space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#142C1F] border border-[#234E37] flex items-center justify-center text-[#E5A93C]">
                    {acc.type === 'CREDIT_CARD' ? (
                      <CreditCard className="w-5 h-5" />
                    ) : acc.type === 'BANK' ? (
                      <Landmark className="w-5 h-5" />
                    ) : (
                      <Wallet className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">{acc.name}</h3>
                    <p className="text-[11px] text-[#7E9A89]">
                      {acc.institution} {acc.lastFour ? `•••• ${acc.lastFour}` : ''}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (confirm(`Remove ${acc.name}?`)) {
                      deleteAccount(acc.id);
                    }
                  }}
                  className="p-1 text-slate-500 hover:text-red-400"
                  title="Delete account"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="pt-2 border-t border-[#183626] flex items-center justify-between text-xs">
                <span className="text-[11px] text-[#7E9A89]">{txCount} transactions</span>
                <span className="font-mono font-bold text-[#E5A93C]">
                  {formatCurrency(totalSpent)} spent
                </span>
              </div>
            </div>
          );
        })}
      </div>
    )}

      {/* Add Account Modal */}
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
              <h3 className="text-sm font-bold text-white">Add New Account or Card</h3>
              <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Account Display Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Axis Flipkart Card, ICICI Salary"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#08120D] border border-[#1E4330] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E5A93C]"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Financial Institution</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Axis Bank, State Bank of India"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  className="w-full bg-[#08120D] border border-[#1E4330] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E5A93C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as AccountType)}
                    className="w-full bg-[#08120D] border border-[#1E4330] rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="BANK">Bank Account</option>
                    <option value="CREDIT_CARD">Credit Card</option>
                    <option value="CASH">Cash Source</option>
                    <option value="WALLET">Digital Wallet</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Last 4 Digits (Optional)</label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="e.g. 5210"
                    value={lastFour}
                    onChange={(e) => setLastFour(e.target.value)}
                    className="w-full bg-[#08120D] border border-[#1E4330] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E5A93C]"
                  />
                </div>
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
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
