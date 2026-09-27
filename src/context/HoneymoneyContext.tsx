import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Transaction,
  Category,
  Account,
  UpiApp,
  Budget,
  RecurringTransaction,
  ActiveTab,
  SmsTransaction,
  SmsParsedData,
  MerchantLearningRule
} from '../types';
import {
  STARTER_CATEGORIES,
  STARTER_UPI_APPS,
  STARTER_ACCOUNTS,
  STARTER_BUDGETS,
  STARTER_RECURRING,
  STARTER_MERCHANT_RULES,
  generateStarterPendingSms,
  generateStarterTransactions
} from '../data/starterData';
import { normalizeTitleCase } from '../utils/normalize';
import { parseBankSms, checkForDuplicate } from '../services/smsParser';
import { registerPlugin } from '@capacitor/core';

const NativeBridge = registerPlugin<any>('HoneymoneyNativeBridge');

interface HoneymoneyContextType {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  upiApps: UpiApp[];
  budgets: Budget[];
  recurring: RecurringTransaction[];
  smsQueue: SmsTransaction[];
  merchantRules: MerchantLearningRule[];
  pendingSmsCount: number;
  currencySymbol: string;
  currencyCode: string;
  startupPreference: 'HOME' | 'NEW_TRANSACTION';
  smartSuggestionsEnabled: boolean;
  isOnboarded: boolean;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  // Modal states
  isTransactionModalOpen: boolean;
  editingTransaction: Transaction | null;
  openAddTransaction: (prefill?: Partial<Transaction>) => void;
  openEditTransaction: (tx: Transaction) => void;
  closeTransactionModal: () => void;
  // SMS Review Modal states
  isSmsReviewOpen: boolean;
  openSmsReview: () => void;
  closeSmsReview: () => void;
  // SMS Simulator / Ingest Modal
  isSmsSimulatorOpen: boolean;
  openSmsSimulator: () => void;
  closeSmsSimulator: () => void;
  // Transaction actions
  addTransaction: (txData: Omit<Transaction, 'id' | 'createdAt'>) => Transaction;
  updateTransaction: (tx: Transaction) => void;
  deleteTransaction: (id: string) => void;
  duplicateTransaction: (id: string) => Transaction | null;
  // Category / Account / UPI App / Budget actions
  addAccount: (acc: Omit<Account, 'id'>) => void;
  updateAccount: (acc: Account) => void;
  deleteAccount: (id: string) => void;
  addCategory: (cat: Omit<Category, 'id'>) => void;
  addUpiApp: (app: Omit<UpiApp, 'id'>) => void;
  addBudget: (budget: Omit<Budget, 'id'>) => void;
  updateBudget: (budget: Budget) => void;
  deleteBudget: (id: string) => void;
  addRecurring: (rec: Omit<RecurringTransaction, 'id'>) => void;
  updateRecurring: (rec: RecurringTransaction) => void;
  deleteRecurring: (id: string) => void;
  // SMS & Merchant Learning actions
  approveSmsTransaction: (smsId: string, customParsed?: Partial<SmsParsedData>) => Transaction | null;
  discardSmsTransaction: (smsId: string) => void;
  markSmsDuplicate: (smsId: string) => void;
  recheckSmsDuplicates: () => void;
  updateSmsParsedData: (smsId: string, updated: Partial<SmsParsedData>) => void;
  addIncomingSms: (rawText: string, sender?: string, existingId?: string) => Promise<SmsTransaction>;
  deleteMerchantRule: (id: string) => void;
  addMerchantRule: (rule: Omit<MerchantLearningRule, 'id' | 'timesApplied' | 'createdAt' | 'updatedAt'>) => void;
  // Settings & Storage
  setCurrencySymbol: (symbol: string) => void;
  setStartupPreference: (pref: 'HOME' | 'NEW_TRANSACTION') => void;
  setSmartSuggestionsEnabled: (enabled: boolean) => void;
  completeOnboarding: (preference: 'HOME' | 'NEW_TRANSACTION') => void;
  resetToStarterData: () => void;
  wipeAllData: () => void;
  exportDataJson: () => string;
  importDataJson: (jsonStr: string) => boolean;
  formatCurrency: (amount: number) => string;
}

const HoneymoneyContext = createContext<HoneymoneyContextType | undefined>(undefined);

export const HoneymoneyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // LocalStorage keys
  const STORAGE_TXS = 'honeymoney_v2_transactions';
  const STORAGE_ACCOUNTS = 'honeymoney_v2_accounts';
  const STORAGE_CATEGORIES = 'honeymoney_v2_categories';
  const STORAGE_UPI = 'honeymoney_v2_upi';
  const STORAGE_BUDGETS = 'honeymoney_v2_budgets';
  const STORAGE_RECURRING = 'honeymoney_v2_recurring';
  const STORAGE_SETTINGS = 'honeymoney_v2_settings';
  const STORAGE_SMS = 'honeymoney_v2_sms_queue';
  const STORAGE_MERCHANT_RULES = 'honeymoney_v2_merchant_rules';

  // One-time clear to wipe sample data memory for clean export & personal installation
  const CLEAN_RESET_FLAG = 'honeymoney_clean_install_v3';
  if (typeof window !== 'undefined' && !localStorage.getItem(CLEAN_RESET_FLAG)) {
    try {
      localStorage.removeItem(STORAGE_TXS);
      localStorage.removeItem(STORAGE_ACCOUNTS);
      localStorage.removeItem(STORAGE_BUDGETS);
      localStorage.removeItem(STORAGE_RECURRING);
      localStorage.removeItem(STORAGE_SMS);
      localStorage.removeItem(STORAGE_MERCHANT_RULES);
      localStorage.removeItem('honeymoney_v1_transactions');
      localStorage.setItem(CLEAN_RESET_FLAG, 'true');
    } catch (e) {
      console.error(e);
    }
  }

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_TXS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const [accounts, setAccounts] = useState<Account[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_ACCOUNTS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CATEGORIES);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return STARTER_CATEGORIES;
  });

  const [upiApps, setUpiApps] = useState<UpiApp[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_UPI);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return STARTER_UPI_APPS;
  });

  const [budgets, setBudgets] = useState<Budget[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_BUDGETS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const [recurring, setRecurring] = useState<RecurringTransaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_RECURRING);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  // SMS Queue state
  const [smsQueue, setSmsQueue] = useState<SmsTransaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SMS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  // Merchant Learning Knowledge Base
  const [merchantRules, setMerchantRules] = useState<MerchantLearningRule[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_MERCHANT_RULES);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  // Settings
  const [currencySymbol, setCurrencySymbolState] = useState<string>('₹');
  const [startupPreference, setStartupPreferenceState] = useState<'HOME' | 'NEW_TRANSACTION'>('HOME');
  const [smartSuggestionsEnabled, setSmartSuggestionsEnabledState] = useState<boolean>(true);
  const [isOnboarded, setIsOnboarded] = useState<boolean>(true);

  // App UI State
  const [activeTab, setActiveTab] = useState<ActiveTab>('HOME');
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState<boolean>(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // SMS Modals
  const [isSmsReviewOpen, setIsSmsReviewOpen] = useState<boolean>(false);
  const [isSmsSimulatorOpen, setIsSmsSimulatorOpen] = useState<boolean>(false);

  // Auto-open review deck on first load if pending SMS exists
  useEffect(() => {
    const pending = smsQueue.filter(s => s.status === 'PENDING_REVIEW');
    if (pending.length > 0) {
      // Small timeout for smooth initial mount
      const timer = setTimeout(() => {
        setIsSmsReviewOpen(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, []);

  // Synchronize with Native Android SMS Buffer & Notifications
  useEffect(() => {
    // 1. Check if launched directly via notification deep-link
    if (NativeBridge && typeof NativeBridge.getInitialRoute === 'function') {
      NativeBridge.getInitialRoute().then((res: any) => {
        if (res && res.route === 'SMS_REVIEW') {
          setIsSmsReviewOpen(true);
        }
      }).catch(() => {});
    }

    // 2. Poll & Consume pending SMS from native SharedPreferences buffer
    const fetchNativeSms = async () => {
      try {
        if (NativeBridge && typeof NativeBridge.getPendingSms === 'function') {
          const res = await NativeBridge.getPendingSms();
          if (res && Array.isArray(res.smsList) && res.smsList.length > 0) {
            const processedIds: string[] = [];
            for (const item of res.smsList) {
              await addIncomingSms(item.body, item.sender, item.id);
              processedIds.push(item.id);
            }
            if (processedIds.length > 0 && typeof NativeBridge.clearPendingSms === 'function') {
              await NativeBridge.clearPendingSms({ ids: processedIds });
            }
          }
        }
      } catch (e) {
        console.warn('Native SMS sync:', e);
      }
    };

    fetchNativeSms();

    // 3. Listen to live native events while WebView is running
    let smsListener: any = null;
    let routeListener: any = null;

    if (NativeBridge && typeof NativeBridge.addListener === 'function') {
      NativeBridge.addListener('pendingSmsReceived', async (data: any) => {
        if (data && data.body) {
          await addIncomingSms(data.body, data.sender, data.id);
          if (data.id && typeof NativeBridge.clearPendingSms === 'function') {
            NativeBridge.clearPendingSms({ ids: [data.id] }).catch(() => {});
          }
        }
      }).then((handle: any) => {
        smsListener = handle;
      }).catch(() => {});

      NativeBridge.addListener('appRouteRequested', (data: any) => {
        if (data && data.route === 'SMS_REVIEW') {
          setIsSmsReviewOpen(true);
        }
      }).catch(() => {});
    }

    // Also re-check when app regains visibility / window focus
    const onVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchNativeSms();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityOrFocus);
    window.addEventListener('focus', onVisibilityOrFocus);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityOrFocus);
      window.removeEventListener('focus', onVisibilityOrFocus);
      if (smsListener && typeof smsListener.remove === 'function') {
        smsListener.remove();
      }
      if (routeListener && typeof routeListener.remove === 'function') {
        routeListener.remove();
      }
    };
  }, []);

  // Sync Android Notification count whenever pending count changes
  useEffect(() => {
    const pendingCount = smsQueue.filter(s => s.status === 'PENDING_REVIEW').length;
    if (NativeBridge && typeof NativeBridge.updateNotificationCount === 'function') {
      NativeBridge.updateNotificationCount({ count: pendingCount }).catch(() => {});
    }
  }, [smsQueue]);

  // Load saved settings
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem(STORAGE_SETTINGS);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed.currencySymbol) setCurrencySymbolState(parsed.currencySymbol);
        if (parsed.startupPreference) setStartupPreferenceState(parsed.startupPreference);
        if (parsed.smartSuggestionsEnabled !== undefined) setSmartSuggestionsEnabledState(parsed.smartSuggestionsEnabled);
        if (parsed.isOnboarded !== undefined) setIsOnboarded(parsed.isOnboarded);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Persist state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_TXS, JSON.stringify(transactions));
    } catch (e) {
      console.error('Error saving transactions', e);
    }
  }, [transactions]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ACCOUNTS, JSON.stringify(accounts));
    } catch (e) {
      console.error(e);
    }
  }, [accounts]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CATEGORIES, JSON.stringify(categories));
    } catch (e) {
      console.error(e);
    }
  }, [categories]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_UPI, JSON.stringify(upiApps));
    } catch (e) {
      console.error(e);
    }
  }, [upiApps]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_BUDGETS, JSON.stringify(budgets));
    } catch (e) {
      console.error(e);
    }
  }, [budgets]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_RECURRING, JSON.stringify(recurring));
    } catch (e) {
      console.error(e);
    }
  }, [recurring]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SMS, JSON.stringify(smsQueue));
    } catch (e) {
      console.error(e);
    }
  }, [smsQueue]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_MERCHANT_RULES, JSON.stringify(merchantRules));
    } catch (e) {
      console.error(e);
    }
  }, [merchantRules]);

  const saveSettings = (updated: Partial<{
    currencySymbol: string;
    startupPreference: 'HOME' | 'NEW_TRANSACTION';
    smartSuggestionsEnabled: boolean;
    isOnboarded: boolean;
  }>) => {
    try {
      const current = {
        currencySymbol,
        startupPreference,
        smartSuggestionsEnabled,
        isOnboarded,
        ...updated
      };
      localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(current));
    } catch (e) {
      console.error(e);
    }
  };

  const setCurrencySymbol = (symbol: string) => {
    setCurrencySymbolState(symbol);
    saveSettings({ currencySymbol: symbol });
  };

  const setStartupPreference = (pref: 'HOME' | 'NEW_TRANSACTION') => {
    setStartupPreferenceState(pref);
    saveSettings({ startupPreference: pref });
  };

  const setSmartSuggestionsEnabled = (enabled: boolean) => {
    setSmartSuggestionsEnabledState(enabled);
    saveSettings({ smartSuggestionsEnabled: enabled });
  };

  const completeOnboarding = (preference: 'HOME' | 'NEW_TRANSACTION') => {
    setIsOnboarded(true);
    setStartupPreferenceState(preference);
    saveSettings({ isOnboarded: true, startupPreference: preference });
    if (preference === 'NEW_TRANSACTION') {
      setIsTransactionModalOpen(true);
    }
  };

  const openAddTransaction = (prefill?: Partial<Transaction>) => {
    if (prefill) {
      setEditingTransaction({
        id: '',
        amount: prefill.amount || 0,
        item: prefill.item || '',
        categoryId: prefill.categoryId || categories[0]?.id || 'cat-food',
        merchant: prefill.merchant || '',
        paymentMode: prefill.paymentMode || 'UPI',
        ccPaymentSubtype: prefill.ccPaymentSubtype,
        upiAppId: prefill.upiAppId,
        accountId: prefill.accountId || accounts[0]?.id || '',
        cardLastFour: prefill.cardLastFour,
        date: prefill.date || new Date().toISOString().split('T')[0],
        notes: prefill.notes || '',
        receipt: prefill.receipt,
        transactionType: prefill.transactionType || 'EXPENSE',
        createdAt: Date.now()
      });
    } else {
      setEditingTransaction(null);
    }
    setIsTransactionModalOpen(true);
  };

  const openEditTransaction = (tx: Transaction) => {
    setEditingTransaction(tx);
    setIsTransactionModalOpen(true);
  };

  const closeTransactionModal = () => {
    setIsTransactionModalOpen(false);
    setEditingTransaction(null);
  };

  const openSmsReview = () => setIsSmsReviewOpen(true);
  const closeSmsReview = () => setIsSmsReviewOpen(false);

  const openSmsSimulator = () => setIsSmsSimulatorOpen(true);
  const closeSmsSimulator = () => setIsSmsSimulatorOpen(false);

  // Centralized Add with Global Text Normalization
  const addTransaction = (txData: Omit<Transaction, 'id' | 'createdAt'>): Transaction => {
    const newTx: Transaction = {
      ...txData,
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      item: normalizeTitleCase(txData.item),
      merchant: normalizeTitleCase(txData.merchant),
      notes: txData.notes?.trim() ? normalizeTitleCase(txData.notes) : undefined,
      createdAt: Date.now()
    };

    setTransactions(prev => [newTx, ...prev]);
    return newTx;
  };

  const updateTransaction = (tx: Transaction) => {
    const normalized: Transaction = {
      ...tx,
      item: normalizeTitleCase(tx.item),
      merchant: normalizeTitleCase(tx.merchant),
      notes: tx.notes?.trim() ? normalizeTitleCase(tx.notes) : undefined,
    };
    setTransactions(prev => prev.map(t => (t.id === tx.id ? normalized : t)));
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const duplicateTransaction = (id: string): Transaction | null => {
    const target = transactions.find(t => t.id === id);
    if (!target) return null;
    const today = new Date().toISOString().split('T')[0];
    const cloned: Transaction = {
      ...target,
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      date: today,
      createdAt: Date.now()
    };
    setTransactions(prev => [cloned, ...prev]);
    return cloned;
  };

  // -------------------------------------------------------------
  // Background Learning & SMS Approval Mechanics
  // -------------------------------------------------------------
  const approveSmsTransaction = (
    smsId: string, 
    customParsed?: Partial<SmsParsedData>
  ): Transaction | null => {
    const targetSms = smsQueue.find(s => s.id === smsId);
    if (!targetSms) return null;

    const finalData = {
      ...targetSms.parsedData,
      ...customParsed
    };

    // 1. Add Transaction to persistent history
    const matchedAccount = accounts.find(a => a.id === finalData.accountId);
    const isCreditCard = matchedAccount?.type === 'CREDIT_CARD' || finalData.paymentMode === 'CREDIT_CARD';

    const newTx = addTransaction({
      amount: finalData.amount,
      item: finalData.item || finalData.cleanMerchant,
      categoryId: finalData.categoryId,
      merchant: finalData.cleanMerchant,
      paymentMode: finalData.paymentMode,
      ccPaymentSubtype: isCreditCard ? (finalData.ccPaymentSubtype || 'DIRECT_SWIPE') : undefined,
      upiAppId: finalData.upiAppId,
      upiBrandId: finalData.upiBrandId,
      accountId: finalData.accountId,
      cardLastFour: finalData.cardLastFour || matchedAccount?.lastFour,
      date: finalData.date,
      notes: `Verified from SMS (${targetSms.sender})`,
      transactionType: finalData.transactionType,
      sourceSmsId: smsId,
      isSmsVerified: true
    });

    // 2. Continuous Background Learning from user edits!
    // Extract candidate token/number or merchant pattern from raw text
    const rawPatternCandidate = extractLearningPattern(targetSms.parsedData.rawMerchant, targetSms.rawBody);
    
    if (rawPatternCandidate) {
      setMerchantRules(prev => {
        const existingIdx = prev.findIndex(r => 
          r.pattern.toUpperCase() === rawPatternCandidate.toUpperCase() ||
          r.cleanMerchant.toUpperCase() === finalData.cleanMerchant.toUpperCase()
        );

        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            pattern: rawPatternCandidate,
            cleanMerchant: normalizeTitleCase(finalData.cleanMerchant),
            defaultItem: normalizeTitleCase(finalData.item || finalData.cleanMerchant),
            defaultCategoryId: finalData.categoryId,
            defaultPaymentMode: finalData.paymentMode,
            defaultCcSubtype: finalData.ccPaymentSubtype,
            defaultUpiBrandId: finalData.upiBrandId,
            defaultAccountId: finalData.accountId,
            timesApplied: updated[existingIdx].timesApplied + 1,
            updatedAt: Date.now()
          };
          return updated;
        } else {
          const newRule: MerchantLearningRule = {
            id: `rule-${Date.now()}`,
            pattern: rawPatternCandidate,
            cleanMerchant: normalizeTitleCase(finalData.cleanMerchant),
            defaultItem: normalizeTitleCase(finalData.item || finalData.cleanMerchant),
            defaultCategoryId: finalData.categoryId,
            defaultPaymentMode: finalData.paymentMode,
            defaultCcSubtype: finalData.ccPaymentSubtype,
            defaultUpiBrandId: finalData.upiBrandId,
            defaultAccountId: finalData.accountId,
            timesApplied: 1,
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          return [newRule, ...prev];
        }
      });
    }

    // 3. Update SMS status to APPROVED
    setSmsQueue(prev => prev.map(s => s.id === smsId ? { ...s, status: 'APPROVED' } : s));
    return newTx;
  };

  const discardSmsTransaction = (smsId: string) => {
    setSmsQueue(prev => prev.map(s => s.id === smsId ? { ...s, status: 'DISCARDED' } : s));
  };

  const markSmsDuplicate = (smsId: string) => {
    setSmsQueue(prev => prev.map(s => s.id === smsId ? { ...s, status: 'DUPLICATE' } : s));
  };

  const recheckSmsDuplicates = () => {
    setSmsQueue(prev => prev.map(s => {
      if (s.status !== 'PENDING_REVIEW') return s;
      const dupCheck = checkForDuplicate(s.parsedData, transactions);
      return {
        ...s,
        duplicateCheck: dupCheck
      };
    }));
  };

  const updateSmsParsedData = (smsId: string, updated: Partial<SmsParsedData>) => {
    setSmsQueue(prev => prev.map(s => {
      if (s.id !== smsId) return s;
      const mergedParsed = {
        ...s.parsedData,
        ...updated
      };
      // Re-evaluate duplicate with updated fields
      const updatedDupCheck = checkForDuplicate(mergedParsed, transactions);
      return {
        ...s,
        parsedData: mergedParsed,
        duplicateCheck: updatedDupCheck
      };
    }));
  };

  // Helper to extract a distinct identifier (e.g. phone/VPA number, POS ID, or uppercase keyword)
  const extractLearningPattern = (rawMerchant: string, rawBody: string): string => {
    // 1. Phone number or VPA digits (e.g., 98210344)
    const phoneMatch = rawMerchant.match(/([0-9]{8,10})/);
    if (phoneMatch) return phoneMatch[1];

    // 2. POS terminal code (e.g. "POS 402919" or "402919")
    const posMatch = rawMerchant.match(/POS\s*([0-9A-Z]{4,8})/i) || rawBody.match(/POS\s*([0-9A-Z]{4,8})/i);
    if (posMatch) return posMatch[1];

    // 3. Clean token from raw merchant (e.g. "AMZN MKTP")
    const tokenMatch = rawMerchant.replace(/^(POS|VPA|INFO)\s+/i, '').trim();
    if (tokenMatch && tokenMatch.length >= 3 && tokenMatch !== 'Merchant') {
      return tokenMatch.substring(0, 18).trim();
    }

    return rawMerchant;
  };

  const addIncomingSms = async (rawText: string, sender: string = 'BANK', existingId?: string): Promise<SmsTransaction> => {
    const id = existingId || `sms-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // Re-processing check: If this exact SMS ID or raw content already exists in queue, avoid duplicating
    const existing = smsQueue.find(s => s.id === id || (s.rawBody === rawText && Math.abs(s.receivedAt - Date.now()) < 5000));
    if (existing) {
      return existing;
    }

    // 1. Pure offline regex & learning rules parsing
    const parsed = parseBankSms(rawText, { accounts, categories, merchantRules });

    // 2. Prioritized multi-factor duplicate check against existing canonical transactions
    const duplicateCheck = checkForDuplicate(parsed, transactions);

    const newSms: SmsTransaction = {
      id,
      sender: sender.toUpperCase(),
      rawBody: rawText,
      receivedAt: Date.now(),
      status: 'PENDING_REVIEW',
      parsedData: parsed,
      duplicateCheck
    };

    setSmsQueue(prev => {
      if (prev.some(s => s.id === newSms.id)) return prev;
      return [newSms, ...prev];
    });

    return newSms;
  };

  const deleteMerchantRule = (id: string) => {
    setMerchantRules(prev => prev.filter(r => r.id !== id));
  };

  const addMerchantRule = (rule: Omit<MerchantLearningRule, 'id' | 'timesApplied' | 'createdAt' | 'updatedAt'>) => {
    const newRule: MerchantLearningRule = {
      ...rule,
      id: `rule-${Date.now()}`,
      timesApplied: 1,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setMerchantRules(prev => [newRule, ...prev]);
  };

  // Accounts & Categories CRUD
  const addAccount = (acc: Omit<Account, 'id'>) => {
    const newAcc: Account = {
      ...acc,
      id: `acc-${Date.now()}`,
      name: normalizeTitleCase(acc.name),
      institution: normalizeTitleCase(acc.institution)
    };
    setAccounts(prev => [...prev, newAcc]);
  };

  const updateAccount = (acc: Account) => {
    setAccounts(prev => prev.map(a => (a.id === acc.id ? acc : a)));
  };

  const deleteAccount = (id: string) => {
    setAccounts(prev => prev.filter(a => a.id !== id));
  };

  const addCategory = (cat: Omit<Category, 'id'>) => {
    const newCat: Category = {
      ...cat,
      id: `cat-${Date.now()}`,
      name: normalizeTitleCase(cat.name),
      isCustom: true
    };
    setCategories(prev => [...prev, newCat]);
  };

  const addUpiApp = (app: Omit<UpiApp, 'id'>) => {
    const newApp: UpiApp = {
      ...app,
      id: `upi-${Date.now()}`,
      name: normalizeTitleCase(app.name),
      isCustom: true
    };
    setUpiApps(prev => [...prev, newApp]);
  };

  const addBudget = (budget: Omit<Budget, 'id'>) => {
    const newB: Budget = {
      ...budget,
      id: `budget-${Date.now()}`
    };
    setBudgets(prev => [...prev, newB]);
  };

  const updateBudget = (budget: Budget) => {
    setBudgets(prev => prev.map(b => (b.id === budget.id ? budget : b)));
  };

  const deleteBudget = (id: string) => {
    setBudgets(prev => prev.filter(b => b.id !== id));
  };

  const addRecurring = (rec: Omit<RecurringTransaction, 'id'>) => {
    const newRec: RecurringTransaction = {
      ...rec,
      id: `rec-${Date.now()}`,
      serviceName: normalizeTitleCase(rec.serviceName)
    };
    setRecurring(prev => [...prev, newRec]);
  };

  const updateRecurring = (rec: RecurringTransaction) => {
    setRecurring(prev => prev.map(r => (r.id === rec.id ? rec : r)));
  };

  const deleteRecurring = (id: string) => {
    setRecurring(prev => prev.filter(r => r.id !== id));
  };

  const resetToStarterData = () => {
    setTransactions(generateStarterTransactions());
    setAccounts(STARTER_ACCOUNTS);
    setCategories(STARTER_CATEGORIES);
    setUpiApps(STARTER_UPI_APPS);
    setBudgets(STARTER_BUDGETS);
    setRecurring(STARTER_RECURRING);
    setSmsQueue(generateStarterPendingSms());
    setMerchantRules(STARTER_MERCHANT_RULES);
  };

  const wipeAllData = () => {
    setTransactions([]);
    setAccounts([]);
    setBudgets([]);
    setRecurring([]);
    setSmsQueue([]);
    setMerchantRules([]);
    try {
      localStorage.removeItem(STORAGE_TXS);
      localStorage.removeItem(STORAGE_ACCOUNTS);
      localStorage.removeItem(STORAGE_BUDGETS);
      localStorage.removeItem(STORAGE_RECURRING);
      localStorage.removeItem(STORAGE_SMS);
      localStorage.removeItem(STORAGE_MERCHANT_RULES);
      localStorage.removeItem('honeymoney_v1_transactions');
    } catch (e) {
      console.error(e);
    }
  };

  const exportDataJson = (): string => {
    const backup = {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      transactions,
      accounts,
      categories,
      upiApps,
      budgets,
      recurring,
      smsQueue,
      merchantRules,
      settings: {
        currencySymbol,
        startupPreference,
        smartSuggestionsEnabled
      }
    };
    return JSON.stringify(backup, null, 2);
  };

  const importDataJson = (jsonStr: string): boolean => {
    try {
      const data = JSON.parse(jsonStr);
      if (Array.isArray(data.transactions)) setTransactions(data.transactions);
      if (Array.isArray(data.accounts)) setAccounts(data.accounts);
      if (Array.isArray(data.categories)) setCategories(data.categories);
      if (Array.isArray(data.upiApps)) setUpiApps(data.upiApps);
      if (Array.isArray(data.budgets)) setBudgets(data.budgets);
      if (Array.isArray(data.recurring)) setRecurring(data.recurring);
      if (Array.isArray(data.smsQueue)) setSmsQueue(data.smsQueue);
      if (Array.isArray(data.merchantRules)) setMerchantRules(data.merchantRules);
      if (data.settings?.currencySymbol) setCurrencySymbolState(data.settings.currencySymbol);
      return true;
    } catch (e) {
      console.error('Import failed', e);
      return false;
    }
  };

  const formatCurrency = (amount: number): string => {
    const formatted = Math.abs(amount).toLocaleString('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0
    });
    return `${amount < 0 ? '-' : ''}${currencySymbol}${formatted}`;
  };

  const pendingSmsCount = smsQueue.filter(s => s.status === 'PENDING_REVIEW').length;

  return (
    <HoneymoneyContext.Provider
      value={{
        transactions,
        categories,
        accounts,
        upiApps,
        budgets,
        recurring,
        smsQueue,
        merchantRules,
        pendingSmsCount,
        currencySymbol,
        currencyCode: currencySymbol === '₹' ? 'INR' : currencySymbol === '$' ? 'USD' : 'EUR',
        startupPreference,
        smartSuggestionsEnabled,
        isOnboarded,
        activeTab,
        setActiveTab,
        isTransactionModalOpen,
        editingTransaction,
        openAddTransaction,
        openEditTransaction,
        closeTransactionModal,
        isSmsReviewOpen,
        openSmsReview,
        closeSmsReview,
        isSmsSimulatorOpen,
        openSmsSimulator,
        closeSmsSimulator,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        duplicateTransaction,
        addAccount,
        updateAccount,
        deleteAccount,
        addCategory,
        addUpiApp,
        addBudget,
        updateBudget,
        deleteBudget,
        addRecurring,
        updateRecurring,
        deleteRecurring,
        approveSmsTransaction,
        discardSmsTransaction,
        markSmsDuplicate,
        recheckSmsDuplicates,
        updateSmsParsedData,
        addIncomingSms,
        deleteMerchantRule,
        addMerchantRule,
        setCurrencySymbol,
        setStartupPreference,
        setSmartSuggestionsEnabled,
        completeOnboarding,
        resetToStarterData,
        wipeAllData,
        exportDataJson,
        importDataJson,
        formatCurrency
      }}
    >
      {children}
    </HoneymoneyContext.Provider>
  );
};

export const useHoneymoney = () => {
  const context = useContext(HoneymoneyContext);
  if (!context) {
    throw new Error('useHoneymoney must be used within a HoneymoneyProvider');
  }
  return context;
};
