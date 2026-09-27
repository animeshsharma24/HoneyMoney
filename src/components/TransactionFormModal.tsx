import React, { useState, useEffect, useMemo } from 'react';
import { useHoneymoney } from '../context/HoneymoneyContext';
import { PaymentMode, TransactionType, SmartSuggestion, CcPaymentSubtype, UpiBrandAppId, UPI_BRAND_LIST, getUpiBrandMeta } from '../types';
import { rankSmartSuggestions, getKnownAutocompleteValues } from '../services/smartEntry';
import { getTodayDateString } from '../utils/date';
import { normalizeTitleCase } from '../utils/normalize';
import { 
  X, Sparkles, Camera, Image as ImageIcon, Trash2, 
  Check, ArrowRight, Wallet, CreditCard, ChevronRight, AlertCircle,
  Smartphone
} from 'lucide-react';

export const TransactionFormModal: React.FC = () => {
  const {
    isTransactionModalOpen,
    editingTransaction,
    closeTransactionModal,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    categories,
    accounts,
    upiApps,
    transactions,
    currencySymbol,
    smartSuggestionsEnabled,
    setActiveTab
  } = useHoneymoney();

  const isEditing = Boolean(editingTransaction && editingTransaction.id);

  // Form states
  const [transactionType, setTransactionType] = useState<TransactionType>('EXPENSE');
  const [amount, setAmount] = useState<string>('');
  const [item, setItem] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [merchant, setMerchant] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPI');
  const [ccPaymentSubtype, setCcPaymentSubtype] = useState<CcPaymentSubtype | undefined>(undefined);
  const [upiAppId, setUpiAppId] = useState<string>('');
  const [upiBrandId, setUpiBrandId] = useState<UpiBrandAppId | undefined>(undefined);
  const [accountId, setAccountId] = useState<string>('');
  const [date, setDate] = useState<string>(getTodayDateString());
  const [receipt, setReceipt] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showItemSuggestions, setShowItemSuggestions] = useState<boolean>(false);
  const [showMerchantSuggestions, setShowMerchantSuggestions] = useState<boolean>(false);

  // Initialize or reset form
  useEffect(() => {
    if (editingTransaction) {
      setTransactionType(editingTransaction.transactionType || 'EXPENSE');
      setAmount(editingTransaction.amount ? String(editingTransaction.amount) : '');
      setItem(editingTransaction.item || '');
      setCategoryId(editingTransaction.categoryId || categories[0]?.id || '');
      setMerchant(editingTransaction.merchant || '');
      setPaymentMode(editingTransaction.paymentMode || 'UPI');
      setCcPaymentSubtype(editingTransaction.ccPaymentSubtype);
      setUpiAppId(editingTransaction.upiAppId || (upiApps[0]?.id || ''));
      const detectedBrand = editingTransaction.upiBrandId || 
        (editingTransaction.upiAppId ? (editingTransaction.upiAppId.replace('upi-', '') as UpiBrandAppId) : undefined);
      setUpiBrandId(detectedBrand);
      setAccountId(editingTransaction.accountId || (accounts[0]?.id || ''));
      setDate(editingTransaction.date || getTodayDateString());
      setReceipt(editingTransaction.receipt);
      setNotes(editingTransaction.notes || '');
    } else {
      setTransactionType('EXPENSE');
      setAmount('');
      setItem('');
      setCategoryId(categories[0]?.id || '');
      setMerchant('');
      setPaymentMode('UPI');
      setCcPaymentSubtype(undefined);
      setUpiAppId(upiApps[0]?.id || '');
      setUpiBrandId('phonepe');
      setAccountId(accounts[0]?.id || '');
      setDate(getTodayDateString());
      setReceipt(undefined);
      setNotes('');
    }
    setValidationError(null);
  }, [editingTransaction, isTransactionModalOpen, categories, accounts, upiApps]);

  // Compute Smart Entry suggestions dynamically based on user input
  const suggestions: SmartSuggestion[] = useMemo(() => {
    if (!smartSuggestionsEnabled) return [];
    return rankSmartSuggestions(
      {
        amount: amount ? Number(amount) : undefined,
        item,
        categoryId,
        merchant,
        paymentMode,
        upiAppId: paymentMode === 'UPI' ? upiAppId : undefined,
        accountId
      },
      {
        transactions,
        categories,
        accounts,
        upiApps
      }
    );
  }, [
    amount,
    item,
    categoryId,
    merchant,
    paymentMode,
    upiAppId,
    accountId,
    transactions,
    categories,
    accounts,
    upiApps,
    smartSuggestionsEnabled
  ]);

  // Autocomplete suggestions
  const itemAutocompletes = useMemo(() => {
    if (!item.trim() || item.length < 2) return [];
    return getKnownAutocompleteValues(transactions, 'item', item);
  }, [item, transactions]);

  const merchantAutocompletes = useMemo(() => {
    if (!merchant.trim() || merchant.length < 2) return [];
    return getKnownAutocompleteValues(transactions, 'merchant', merchant);
  }, [merchant, transactions]);

  if (!isTransactionModalOpen) return null;

  // Handle Smart Suggestion Click
  // PDF Non-negotiable: "Suggestions never silently overwrite fields; user explicitly chooses a suggestion."
  // "Tap suggestion -> populate the form; user can edit every field. Never silently overwrite an already entered value."
  const applySuggestion = (sug: SmartSuggestion) => {
    const src = sug.sourceTransaction;
    if (!item.trim()) setItem(src.item);
    if (!merchant.trim()) setMerchant(src.merchant);
    if (!categoryId || categoryId === categories[0]?.id) setCategoryId(src.categoryId);
    setPaymentMode(src.paymentMode);
    if (src.paymentMode === 'UPI' && src.upiAppId) {
      setUpiAppId(src.upiAppId);
    }
    if (src.accountId) {
      setAccountId(src.accountId);
    }
    // If amount was empty, fill typical amount
    if (!amount && src.amount) {
      setAmount(String(src.amount));
    }
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert to compressed data URL for local storage
    const reader = new FileReader();
    reader.onload = () => {
      setReceipt(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setValidationError('Please enter a valid positive amount.');
      return;
    }

    if (!item.trim()) {
      setValidationError('Item description is required.');
      return;
    }

    if (!categoryId) {
      setValidationError('Please select a category.');
      return;
    }

    if (!accountId) {
      setValidationError('Please specify the account or card paid from.');
      return;
    }

    if (paymentMode === 'UPI' && !upiAppId) {
      setValidationError('Please select the UPI app used (e.g. PhonePe, CRED).');
      return;
    }

    if (!date) {
      setValidationError('Date is required (YYYY-MM-DD).');
      return;
    }

    const selectedAcc = accounts.find(a => a.id === accountId);
    const isCreditCard = paymentMode === 'CREDIT_CARD' || selectedAcc?.type === 'CREDIT_CARD';

    const payload = {
      amount: parsedAmount,
      item: normalizeTitleCase(item),
      categoryId,
      merchant: normalizeTitleCase(merchant || item),
      paymentMode,
      ccPaymentSubtype: isCreditCard ? (ccPaymentSubtype || 'DIRECT_SWIPE') : undefined,
      upiAppId: (paymentMode === 'UPI' || ccPaymentSubtype === 'UPI_ON_CREDIT_CARD') ? (upiBrandId ? `upi-${upiBrandId}` : upiAppId) : undefined,
      upiBrandId: (paymentMode === 'UPI' || ccPaymentSubtype === 'UPI_ON_CREDIT_CARD') ? upiBrandId : undefined,
      accountId,
      cardLastFour: selectedAcc?.lastFour,
      date, // Strictly YYYY-MM-DD, NO TIME
      receipt,
      notes: notes.trim() ? normalizeTitleCase(notes) : undefined,
      transactionType
    };

    if (isEditing && editingTransaction) {
      updateTransaction({
        ...payload,
        id: editingTransaction.id,
        createdAt: editingTransaction.createdAt || Date.now()
      });
    } else {
      addTransaction(payload);
    }

    closeTransactionModal();
  };

  const handleDelete = () => {
    if (editingTransaction && confirm('Are you sure you want to delete this transaction from your memory?')) {
      deleteTransaction(editingTransaction.id);
      closeTransactionModal();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div 
        className="w-full max-w-lg bg-[#0F1A14] border border-[#1E3A2B] rounded-2xl shadow-2xl text-slate-100 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1A3325] bg-[#0A130E]/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#E5A93C]/15 border border-[#E5A93C]/30 flex items-center justify-center text-[#E5A93C]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {isEditing ? 'Edit Transaction' : 'New Transaction'}
              </h2>
              <p className="text-xs text-[#7E9A89]">
                Manual-first spending memory
              </p>
            </div>
          </div>
          <button
            onClick={closeTransactionModal}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#1E3A2B] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto no-scrollbar">
          {/* Validation error banner */}
          {validationError && (
            <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Transaction Type Segmented Toggle */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-[#09120D] rounded-xl border border-[#162D20]">
            {(['EXPENSE', 'INCOME', 'TRANSFER'] as TransactionType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setTransactionType(type)}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  transactionType === type
                    ? type === 'EXPENSE'
                      ? 'bg-[#E5A93C] text-black shadow-sm'
                      : type === 'INCOME'
                      ? 'bg-emerald-500 text-black shadow-sm'
                      : 'bg-cyan-500 text-black shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Amount Input Display (Hero Input) */}
          <div className="bg-[#09120D] border border-[#1E3A2B] rounded-2xl p-4 flex flex-col items-center justify-center focus-within:border-[#E5A93C] transition-colors">
            <label className="text-[11px] font-medium text-[#7E9A89] uppercase tracking-wider mb-1">
              Amount ({currencySymbol})
            </label>
            <div className="flex items-center justify-center gap-1 w-full">
              <span className="text-3xl font-bold text-[#E5A93C]">{currencySymbol}</span>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                autoFocus={!isEditing}
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-48 text-center text-4xl font-extrabold bg-transparent text-white focus:outline-none placeholder:text-slate-700 font-mono"
              />
            </div>
          </div>

          {/* Smart Entry Suggestion Dock (PDF: "Rank by exact field matches + historical frequency + recency") */}
          {smartSuggestionsEnabled && suggestions.length > 0 && (
            <div className="bg-[#12261C] border border-[#1E4330] rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#E5A93C] flex items-center gap-1 tracking-wide uppercase">
                  <Sparkles className="w-3 h-3" /> Smart Memory Suggestions
                </span>
                <span className="text-[10px] text-[#7E9A89]">Tap to autofill fields</span>
              </div>
              <div className="space-y-1.5">
                {suggestions.map((sug, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applySuggestion(sug)}
                    className="w-full text-left p-2 rounded-lg bg-[#0C1A13] hover:bg-[#163023] border border-[#193B2A] hover:border-[#E5A93C]/50 transition-all flex items-center justify-between group"
                  >
                    <div className="truncate pr-2">
                      <div className="text-xs font-semibold text-white group-hover:text-[#E5A93C] transition-colors truncate">
                        {sug.item}
                      </div>
                      <div className="text-[11px] text-[#7E9A89] truncate">
                        {sug.label}
                      </div>
                    </div>
                    {sug.amount && (
                      <span className="text-xs font-mono font-bold text-[#E5A93C] shrink-0 bg-[#E5A93C]/10 px-2 py-0.5 rounded border border-[#E5A93C]/20">
                        {currencySymbol}{sug.amount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Item & Merchant Row */}
          <div className="space-y-3">
            {/* Item Field */}
            <div className="relative">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Item <span className="text-[#E5A93C]">*</span>
                <span className="text-[10px] text-[#7E9A89] ml-1">(What was purchased)</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Irani Chai, Swiggy Dinner, Groceries"
                value={item}
                onFocus={() => setShowItemSuggestions(true)}
                onBlur={() => setTimeout(() => setShowItemSuggestions(false), 200)}
                onChange={(e) => {
                  setItem(e.target.value);
                  setShowItemSuggestions(true);
                }}
                className="w-full bg-[#0A130E] border border-[#1E3A2B] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#E5A93C] transition-colors"
              />
              {/* Autocomplete list */}
              {showItemSuggestions && itemAutocompletes.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#0F1E16] border border-[#234734] rounded-xl shadow-xl z-20 overflow-hidden py-1">
                  {itemAutocompletes.map((val, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onMouseDown={() => setItem(val)}
                      className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-[#1A3828] hover:text-[#E5A93C] flex items-center justify-between"
                    >
                      <span>{val}</span>
                      <span className="text-[10px] text-slate-500 font-mono">history</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Merchant Field */}
            <div className="relative">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Merchant / Place
                <span className="text-[10px] text-[#7E9A89] ml-1">(Where purchased)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Irani Chai Cafe, Uber India, Blinkit"
                value={merchant}
                onFocus={() => setShowMerchantSuggestions(true)}
                onBlur={() => setTimeout(() => setShowMerchantSuggestions(false), 200)}
                onChange={(e) => {
                  setMerchant(e.target.value);
                  setShowMerchantSuggestions(true);
                }}
                className="w-full bg-[#0A130E] border border-[#1E3A2B] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#E5A93C] transition-colors"
              />
              {showMerchantSuggestions && merchantAutocompletes.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#0F1E16] border border-[#234734] rounded-xl shadow-xl z-20 overflow-hidden py-1">
                  {merchantAutocompletes.map((val, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onMouseDown={() => setMerchant(val)}
                      className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-[#1A3828] hover:text-[#E5A93C] flex items-center justify-between"
                    >
                      <span>{val}</span>
                      <span className="text-[10px] text-slate-500 font-mono">history</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Category Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Category <span className="text-[#E5A93C]">*</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-36 overflow-y-auto no-scrollbar p-1 bg-[#0A130E] rounded-xl border border-[#162D20]">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryId(cat.id)}
                  className={`p-2 rounded-lg text-xs font-medium flex flex-col items-center justify-center gap-1 border transition-all text-center ${
                    categoryId === cat.id
                      ? 'bg-[#183626] border-[#E5A93C] text-white font-bold shadow-sm'
                      : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#12221A]'
                  }`}
                >
                  <span className="truncate w-full">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Payment Mode (Chips) */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Payment Mode <span className="text-[#E5A93C]">*</span>
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#0A130E] rounded-xl border border-[#162D20]">
              {(['UPI', 'CREDIT_CARD', 'DEBIT_CARD', 'CASH', 'NET_BANKING', 'OTHER'] as PaymentMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPaymentMode(mode)}
                  className={`py-2 px-1 text-[11px] font-semibold rounded-lg text-center transition-all ${
                    paymentMode === mode
                      ? 'bg-[#1C3B2B] text-[#E5A93C] border border-[#E5A93C]/40 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {mode.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Conditional UPI App (Shown when Payment Mode = UPI OR Card Route = UPI on Card) */}
          {(paymentMode === 'UPI' || ccPaymentSubtype === 'UPI_ON_CREDIT_CARD') && (
            <div className="p-3 bg-[#0D1C14] rounded-xl border border-[#1F412F] space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-[#E5A93C]" />
                  <span>UPI App (PhonePe, super.money, GPay, etc.)</span>
                </label>
                {upiBrandId && (
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                    getUpiBrandMeta(upiBrandId)?.bgClass || 'bg-emerald-950/60'
                  } ${
                    getUpiBrandMeta(upiBrandId)?.textClass || 'text-emerald-300'
                  } ${
                    getUpiBrandMeta(upiBrandId)?.borderClass || 'border-emerald-500/40'
                  }`}>
                    {getUpiBrandMeta(upiBrandId)?.badgeLabel}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {UPI_BRAND_LIST.map((brand) => {
                  const isSelected = upiBrandId === brand.id;
                  return (
                    <button
                      key={brand.id}
                      type="button"
                      onClick={() => {
                        setUpiBrandId(brand.id);
                        setUpiAppId(`upi-${brand.id}`);
                      }}
                      className={`px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? `${brand.bgClass} ${brand.textClass} ${brand.borderClass} ring-1 ring-[#E5A93C] shadow-sm`
                          : 'bg-[#09130E] border-[#224432] text-slate-300 hover:text-white'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: brand.dotColor }} />
                      <span>{brand.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Credit Card Specific Route: UPI on CC vs Direct POS Swipe vs Online */}
          {(paymentMode === 'CREDIT_CARD' || accounts.find(a => a.id === accountId)?.type === 'CREDIT_CARD') && (
            <div className="p-3 bg-[#0D1C14] rounded-xl border border-[#1F412F] space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-200">
                  Card Route / Mode
                </label>
                <span className="text-[10px] text-[#A6CDB5]">Enriches statement details</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {[
                  { id: 'UPI_ON_CREDIT_CARD', label: 'UPI on Card' },
                  { id: 'DIRECT_SWIPE', label: 'Direct POS' },
                  { id: 'ONLINE', label: 'Online / App' },
                  { id: 'AUTO_DEBIT', label: 'Auto-Debit' },
                ].map((route) => (
                  <button
                    key={route.id}
                    type="button"
                    onClick={() => setCcPaymentSubtype(route.id as CcPaymentSubtype)}
                    className={`py-1.5 px-2 text-xs font-semibold rounded-lg border text-center transition-all ${
                      (ccPaymentSubtype || 'DIRECT_SWIPE') === route.id
                        ? 'bg-[#E5A93C] text-black border-[#E5A93C] font-bold shadow-sm'
                        : 'bg-[#09130E] border-[#224432] text-slate-300 hover:text-white'
                    }`}
                  >
                    {route.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Paid From (Bank account, credit card, or cash source) */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Paid From (Source) <span className="text-[#E5A93C]">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {accounts.filter(a => a.isActive).length === 0 ? (
                <div className="col-span-full p-3.5 rounded-xl bg-[#09150E] border border-dashed border-[#234E37] text-center space-y-1.5">
                  <p className="text-xs text-slate-300">No bank accounts or cards added yet.</p>
                  <button
                    type="button"
                    onClick={() => {
                      closeTransactionModal();
                      setActiveTab('ACCOUNTS');
                    }}
                    className="text-xs text-[#E5A93C] font-bold hover:underline inline-flex items-center gap-1"
                  >
                    <span>+ Add your first Bank or Card</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                accounts.filter(a => a.isActive).map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setAccountId(acc.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                      accountId === acc.id
                        ? 'bg-[#183626] border-[#E5A93C] text-white shadow-sm'
                        : 'bg-[#0A130E] border-[#1E4330] text-slate-400 hover:text-slate-200 hover:bg-[#12221A]'
                    }`}
                  >
                    <div className="truncate">
                      <div className="text-xs font-bold truncate text-slate-100">{acc.name}</div>
                      <div className="text-[10px] text-[#7E9A89] truncate">
                        {acc.institution} {acc.lastFour ? `••${acc.lastFour}` : ''}
                      </div>
                    </div>
                    {acc.type === 'CREDIT_CARD' ? (
                      <CreditCard className="w-3.5 h-3.5 text-[#E5A93C] shrink-0 ml-1" />
                    ) : (
                      <Wallet className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-1" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Date Picker: STRICTLY NO TIME FIELD */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Date <span className="text-[#E5A93C]">*</span>
                <span className="text-[10px] text-[#7E9A89] ml-1">(No time stored)</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[#0A130E] border border-[#1E3A2B] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E5A93C]"
              />
            </div>

            {/* Optional Receipt Attachment */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Receipt
                <span className="text-[10px] text-[#7E9A89] ml-1">(Optional)</span>
              </label>
              {receipt ? (
                <div className="flex items-center justify-between p-2 bg-[#0A130E] border border-[#1E3A2B] rounded-xl">
                  <div className="flex items-center gap-2">
                    <img src={receipt} alt="Receipt thumbnail" className="w-8 h-8 rounded object-cover border border-[#254B37]" />
                    <span className="text-xs text-emerald-400 font-medium">Receipt Attached</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReceipt(undefined)}
                    className="p-1 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded"
                    title="Remove receipt"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-[#0A130E] hover:bg-[#12221A] border border-dashed border-[#254B37] hover:border-[#E5A93C] rounded-xl text-xs text-slate-400 cursor-pointer transition-colors">
                  <Camera className="w-3.5 h-3.5 text-[#E5A93C]" />
                  <span>Attach Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleReceiptUpload}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Notes <span className="text-[10px] text-[#7E9A89]">(Optional context)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Split with Rohan, evening tea, tax invoice"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#0A130E] border border-[#1E3A2B] rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-[#E5A93C]"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-between gap-3 border-t border-[#183223]">
            {isEditing ? (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3.5 py-2.5 rounded-xl bg-red-950/50 hover:bg-red-900/60 text-red-300 border border-red-800/60 text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={closeTransactionModal}
                className="px-4 py-2.5 rounded-xl bg-[#12221A] hover:bg-[#1A3326] text-slate-300 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#E5A93C] to-[#E5A93C] hover:from-[#d89e33] hover:to-[#e8ba58] text-black font-bold text-xs shadow-lg shadow-[#E5A93C]/25 flex items-center gap-1.5 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>{isEditing ? 'Save Changes' : 'Record Memory'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
