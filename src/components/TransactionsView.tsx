import React, { useState, useMemo } from 'react';
import { useHoneymoney } from '../context/HoneymoneyContext';
import { Transaction, PaymentMode, getUpiBrandMeta } from '../types';
import { formatDateDisplay, formatFullDate } from '../utils/date';
import { normalizeForSearch } from '../utils/normalize';
import { 
  Search, Filter, Plus, Calendar, ArrowUpDown, 
  Receipt, Copy, Trash2, Edit3, X, SlidersHorizontal, ChevronDown, Check,
  Wallet
} from 'lucide-react';

export const TransactionsView: React.FC = () => {
  const {
    transactions,
    categories,
    accounts,
    upiApps,
    currencySymbol,
    formatCurrency,
    openAddTransaction,
    openEditTransaction,
    deleteTransaction,
    duplicateTransaction
  } = useHoneymoney();

  // Filter and search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<string>('ALL');
  const [selectedUpiApp, setSelectedUpiApp] = useState<string>('ALL');
  const [selectedAccount, setSelectedAccount] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'DATE_DESC' | 'DATE_ASC' | 'AMOUNT_DESC' | 'AMOUNT_ASC'>('DATE_DESC');
  const [showFilters, setShowFilters] = useState(false);

  // Selected transaction for full detail modal
  const [viewingDetailTx, setViewingDetailTx] = useState<Transaction | null>(null);
  const [previewReceipt, setPreviewReceipt] = useState<string | null>(null);

  // Lookup maps
  const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
  const accountMap = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);
  const upiAppMap = useMemo(() => new Map(upiApps.map(u => [u.id, u])), [upiApps]);

  // Filtered and sorted transactions
  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    // Global Search
    if (searchQuery.trim()) {
      const q = normalizeForSearch(searchQuery);
      result = result.filter(tx => {
        const item = normalizeForSearch(tx.item);
        const merchant = normalizeForSearch(tx.merchant);
        const cat = normalizeForSearch(categoryMap.get(tx.categoryId)?.name || '');
        const acc = normalizeForSearch(accountMap.get(tx.accountId)?.name || '');
        const upi = tx.upiAppId ? normalizeForSearch(upiAppMap.get(tx.upiAppId)?.name || '') : '';
        const notes = normalizeForSearch(tx.notes || '');
        const amountStr = String(tx.amount);

        return (
          item.includes(q) ||
          merchant.includes(q) ||
          cat.includes(q) ||
          acc.includes(q) ||
          upi.includes(q) ||
          notes.includes(q) ||
          amountStr.includes(q)
        );
      });
    }

    // Category filter
    if (selectedCategory !== 'ALL') {
      result = result.filter(tx => tx.categoryId === selectedCategory);
    }

    // Payment mode filter
    if (selectedPaymentMode !== 'ALL') {
      result = result.filter(tx => tx.paymentMode === selectedPaymentMode);
    }

    // UPI app filter
    if (selectedUpiApp !== 'ALL') {
      result = result.filter(tx => tx.upiAppId === selectedUpiApp);
    }

    // Account filter
    if (selectedAccount !== 'ALL') {
      result = result.filter(tx => tx.accountId === selectedAccount);
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'DATE_DESC') {
        if (b.date !== a.date) return b.date.localeCompare(a.date);
        return (b.createdAt || 0) - (a.createdAt || 0);
      }
      if (sortBy === 'DATE_ASC') {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return (a.createdAt || 0) - (b.createdAt || 0);
      }
      if (sortBy === 'AMOUNT_DESC') {
        return b.amount - a.amount;
      }
      if (sortBy === 'AMOUNT_ASC') {
        return a.amount - b.amount;
      }
      return 0;
    });

    return result;
  }, [
    transactions,
    searchQuery,
    selectedCategory,
    selectedPaymentMode,
    selectedUpiApp,
    selectedAccount,
    sortBy,
    categoryMap,
    accountMap,
    upiAppMap
  ]);

  // Group by Date for timeline
  const groupedByDate = useMemo(() => {
    const groups: { date: string; displayDate: string; items: Transaction[]; dayTotal: number }[] = [];
    const dateMap = new Map<string, Transaction[]>();

    for (const tx of filteredTransactions) {
      const list = dateMap.get(tx.date) || [];
      list.push(tx);
      dateMap.set(tx.date, list);
    }

    // Preserve order from filtered
    for (const [date, items] of dateMap.entries()) {
      const dayTotal = items
        .filter(t => t.transactionType === 'EXPENSE')
        .reduce((sum, t) => sum + t.amount, 0);

      groups.push({
        date,
        displayDate: formatDateDisplay(date),
        items,
        dayTotal
      });
    }

    return groups;
  }, [filteredTransactions]);

  const activeFilterCount = (selectedCategory !== 'ALL' ? 1 : 0) +
    (selectedPaymentMode !== 'ALL' ? 1 : 0) +
    (selectedUpiApp !== 'ALL' ? 1 : 0) +
    (selectedAccount !== 'ALL' ? 1 : 0);

  const resetFilters = () => {
    setSelectedCategory('ALL');
    setSelectedPaymentMode('ALL');
    setSelectedUpiApp('ALL');
    setSelectedAccount('ALL');
    setSearchQuery('');
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">
            Transactions & History
          </h1>
          <p className="text-xs text-[#7E9A89]">
            {filteredTransactions.length} of {transactions.length} entries
          </p>
        </div>
      </div>

      {/* Global Search and Filter Bar */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#7E9A89] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search item, merchant, category, notes, UPI..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0D1C14] border border-[#1E3E2C] rounded-2xl pl-10 pr-9 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#E5A93C] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2.5 rounded-2xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'bg-[#1E3E2C] border-[#E5A93C] text-[#E5A93C]'
                : 'bg-[#0D1C14] border-[#1E3E2C] text-slate-300 hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#E5A93C] text-black text-[10px] font-black flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Expandable Filter Drawer */}
        {showFilters && (
          <div className="p-3.5 bg-[#0C1A13] border border-[#1D402D] rounded-2xl space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#E5A93C]">Filter Dimensions</span>
              {activeFilterCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="text-[11px] text-red-400 hover:underline font-medium"
                >
                  Reset all
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {/* Category */}
              <div>
                <label className="text-[10px] font-medium text-[#7E9A89] block mb-1">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-[#07110C] border border-[#1C3A29] rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
                >
                  <option value="ALL">All Categories</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Payment Mode */}
              <div>
                <label className="text-[10px] font-medium text-[#7E9A89] block mb-1">Payment Mode</label>
                <select
                  value={selectedPaymentMode}
                  onChange={(e) => setSelectedPaymentMode(e.target.value)}
                  className="w-full bg-[#07110C] border border-[#1C3A29] rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
                >
                  <option value="ALL">All Modes</option>
                  <option value="UPI">UPI</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                  <option value="DEBIT_CARD">Debit Card</option>
                  <option value="CASH">Cash</option>
                  <option value="NET_BANKING">Net Banking</option>
                </select>
              </div>

              {/* UPI App */}
              <div>
                <label className="text-[10px] font-medium text-[#7E9A89] block mb-1">UPI App</label>
                <select
                  value={selectedUpiApp}
                  onChange={(e) => setSelectedUpiApp(e.target.value)}
                  className="w-full bg-[#07110C] border border-[#1C3A29] rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
                >
                  <option value="ALL">All UPI Apps</option>
                  {upiApps.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              {/* Account/Card */}
              <div>
                <label className="text-[10px] font-medium text-[#7E9A89] block mb-1">Paid From</label>
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="w-full bg-[#07110C] border border-[#1C3A29] rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
                >
                  <option value="ALL">All Accounts</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.institution})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sort row */}
            <div className="pt-2 border-t border-[#183323] flex items-center justify-between text-xs">
              <span className="text-[10px] text-[#7E9A89]">Sort Order</span>
              <div className="flex gap-1">
                {[
                  { key: 'DATE_DESC', label: 'Newest' },
                  { key: 'DATE_ASC', label: 'Oldest' },
                  { key: 'AMOUNT_DESC', label: 'High Amount' },
                  { key: 'AMOUNT_ASC', label: 'Low Amount' }
                ].map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setSortBy(s.key as any)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-semibold ${
                      sortBy === s.key
                        ? 'bg-[#E5A93C] text-black font-bold'
                        : 'bg-[#07110C] text-slate-300 hover:text-white'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Transactions List Grouped by Date */}
      {transactions.length === 0 ? (
        <div className="p-10 rounded-2xl bg-[#0C1711] border border-dashed border-[#1E4330] text-center space-y-3">
          <Wallet className="w-10 h-10 text-[#7E9A89] mx-auto opacity-60" />
          <div>
            <h3 className="text-sm font-bold text-white">No Transactions Recorded Yet</h3>
            <p className="text-xs text-[#7E9A89] mt-1 max-w-xs mx-auto">
              Your transaction history is completely clean. Tap below to log your first transaction.
            </p>
          </div>
          <button
            onClick={() => openAddTransaction()}
            className="px-4 py-2 rounded-xl bg-[#E5A93C] text-black font-extrabold text-xs inline-flex items-center gap-1.5 shadow-md shadow-[#E5A93C]/25"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add First Transaction</span>
          </button>
        </div>
      ) : groupedByDate.length === 0 ? (
        <div className="p-10 rounded-2xl bg-[#0C1711] border border-dashed border-[#1E4330] text-center space-y-2">
          <p className="text-sm font-semibold text-slate-300">No matching transactions</p>
          <p className="text-xs text-[#7E9A89]">
            Try changing your search terms or resetting filters.
          </p>
          {activeFilterCount > 0 && (
            <button
              onClick={resetFilters}
              className="mt-2 px-3 py-1.5 rounded-xl bg-[#1C3E2C] text-[#E5A93C] text-xs font-semibold"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByDate.map((group) => (
            <div key={group.date} className="space-y-1.5">
              {/* Date Header with Day Total */}
              <div className="flex items-center justify-between px-2 pt-1">
                <span className="text-xs font-bold text-[#A5C7B4] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#E5A93C]" />
                  {group.displayDate}
                </span>
                {group.dayTotal > 0 && (
                  <span className="text-[11px] font-mono text-[#7E9A89]">
                    Spent {formatCurrency(group.dayTotal)}
                  </span>
                )}
              </div>

              {/* Transactions in Date Group */}
              <div className="space-y-1.5">
                {group.items.map((tx) => {
                  const cat = categoryMap.get(tx.categoryId);
                  const acc = accountMap.get(tx.accountId);
                  const upi = tx.upiAppId ? upiAppMap.get(tx.upiAppId) : undefined;
                  const isIncome = tx.transactionType === 'INCOME';

                  return (
                    <div
                      key={tx.id}
                      onClick={() => setViewingDetailTx(tx)}
                      className="p-3 rounded-2xl bg-[#0D1C14] hover:bg-[#132A1E] border border-[#193A28] hover:border-[#285A3E] transition-all cursor-pointer flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3 truncate pr-2">
                        <div className="w-9 h-9 rounded-xl bg-[#142C1F] border border-[#234E37] flex items-center justify-center text-[#E5A93C] shrink-0 font-bold text-sm">
                          {tx.item.charAt(0)}
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-bold text-white group-hover:text-[#E5A93C] transition-colors truncate">
                            {tx.item}
                          </div>
                          <div className="text-[11px] text-[#7E9A89] truncate flex items-center gap-1.5">
                            <span>{cat?.name || 'General'}</span>
                            <span>•</span>
                            <span>{tx.merchant}</span>
                            {tx.notes && (
                              <>
                                <span>•</span>
                                <span className="italic truncate max-w-[120px]">{tx.notes}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className={`text-xs font-mono font-extrabold ${isIncome ? 'text-emerald-400' : 'text-slate-100'}`}>
                          {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
                        </div>
                        <div className="text-[10px] text-[#7E9A89] font-medium flex items-center justify-end gap-1.5 mt-0.5">
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
                          {tx.receipt && (
                            <Receipt className="w-3 h-3 text-[#E5A93C]" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Transaction Detail & Actions Modal */}
      {viewingDetailTx && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setViewingDetailTx(null)}
        >
          <div 
            className="w-full max-w-md bg-[#0F1E16] border border-[#224A35] rounded-3xl p-5 shadow-2xl text-slate-100 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#1A3828]">
              <span className="text-xs font-bold text-[#E5A93C] uppercase tracking-wider">
                Transaction Memory Details
              </span>
              <button
                onClick={() => setViewingDetailTx(null)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Hero info */}
            <div className="text-center py-2">
              <span className="text-3xl font-mono font-black text-white">
                {viewingDetailTx.transactionType === 'INCOME' ? '+' : '-'}
                {formatCurrency(viewingDetailTx.amount)}
              </span>
              <h3 className="text-lg font-bold text-white mt-1">
                {viewingDetailTx.item}
              </h3>
              <p className="text-xs text-[#7E9A89]">
                {viewingDetailTx.merchant}
              </p>
            </div>

            {/* Field Grid */}
            <div className="bg-[#08120D] border border-[#193826] rounded-2xl p-3.5 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#7E9A89]">Category</span>
                <span className="font-semibold text-white">
                  {categoryMap.get(viewingDetailTx.categoryId)?.name || 'General'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7E9A89]">Date</span>
                <span className="font-semibold text-white">
                  {formatFullDate(viewingDetailTx.date)} (No time stored)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7E9A89]">Payment Mode</span>
                <span className="font-semibold text-white">
                  {viewingDetailTx.paymentMode.replace('_', ' ')}
                </span>
              </div>
              {(viewingDetailTx.paymentMode === 'UPI' || viewingDetailTx.ccPaymentSubtype === 'UPI_ON_CREDIT_CARD') && (
                <div className="flex justify-between items-center">
                  <span className="text-[#7E9A89]">UPI App</span>
                  {(() => {
                    const upiMeta = getUpiBrandMeta(viewingDetailTx.upiBrandId || viewingDetailTx.upiAppId);
                    return upiMeta ? (
                      <span className={`px-2 py-0.5 rounded-md border text-[11px] font-black inline-flex items-center gap-1.5 ${upiMeta.bgClass} ${upiMeta.textClass} ${upiMeta.borderClass}`}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: upiMeta.dotColor }} />
                        <span>{upiMeta.badgeLabel}</span>
                      </span>
                    ) : (
                      <span className="font-bold text-[#E5A93C]">
                        {viewingDetailTx.upiAppId ? upiAppMap.get(viewingDetailTx.upiAppId)?.name : 'RuPay UPI'}
                      </span>
                    );
                  })()}
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[#7E9A89]">Paid From</span>
                <span className="font-semibold text-white">
                  {accountMap.get(viewingDetailTx.accountId)?.name || 'Account'}
                </span>
              </div>
              {viewingDetailTx.notes && (
                <div className="pt-2 border-t border-[#162F21]">
                  <span className="text-[#7E9A89] block mb-0.5">Notes:</span>
                  <p className="text-slate-300 italic">{viewingDetailTx.notes}</p>
                </div>
              )}
            </div>

            {/* Receipt Preview if attached */}
            {viewingDetailTx.receipt && (
              <div className="space-y-1">
                <span className="text-xs font-semibold text-[#7E9A89] block">Attached Receipt:</span>
                <img
                  src={viewingDetailTx.receipt}
                  alt="Receipt"
                  onClick={() => setPreviewReceipt(viewingDetailTx.receipt || null)}
                  className="w-full max-h-40 object-cover rounded-xl border border-[#234E37] cursor-pointer hover:opacity-90 transition-opacity"
                />
              </div>
            )}

            {/* Quick Actions (Edit, Duplicate, Delete) */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#1A3828]">
              <button
                onClick={() => {
                  const tx = viewingDetailTx;
                  setViewingDetailTx(null);
                  openEditTransaction(tx);
                }}
                className="py-2 px-3 rounded-xl bg-[#1C3E2C] hover:bg-[#255038] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#E5A93C]" />
                <span>Edit</span>
              </button>

              <button
                onClick={() => {
                  duplicateTransaction(viewingDetailTx.id);
                  setViewingDetailTx(null);
                }}
                className="py-2 px-3 rounded-xl bg-[#152B1F] hover:bg-[#1E3B2C] text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Copy className="w-3.5 h-3.5 text-cyan-400" />
                <span>Clone</span>
              </button>

              <button
                onClick={() => {
                  if (confirm('Delete this transaction?')) {
                    deleteTransaction(viewingDetailTx.id);
                    setViewingDetailTx(null);
                  }
                }}
                className="py-2 px-3 rounded-xl bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-800/60 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox for receipt */}
      {previewReceipt && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90"
          onClick={() => setPreviewReceipt(null)}
        >
          <div className="relative max-w-lg max-h-[85vh]">
            <img src={previewReceipt} alt="Receipt Full" className="max-h-[85vh] rounded-2xl object-contain shadow-2xl" />
            <button
              onClick={() => setPreviewReceipt(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[#1C3E2C] text-white flex items-center justify-center shadow-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
