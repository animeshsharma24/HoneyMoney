export type TransactionType = 'EXPENSE' | 'INCOME' | 'TRANSFER';

export type PaymentMode = 'UPI' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'CASH' | 'NET_BANKING' | 'OTHER';

export type CcPaymentSubtype = 'DIRECT_SWIPE' | 'UPI_ON_CREDIT_CARD' | 'ONLINE' | 'AUTO_DEBIT';

export type UpiBrandAppId = 'phonepe' | 'supermoney' | 'gpay' | 'paytm' | 'cred' | 'bhim' | 'other';

export interface UpiBrandMeta {
  id: UpiBrandAppId;
  name: string;
  badgeLabel: string;
  shortName: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  dotColor: string;
}

export const UPI_BRAND_LIST: UpiBrandMeta[] = [
  {
    id: 'phonepe',
    name: 'PhonePe',
    badgeLabel: 'PhonePe UPI',
    shortName: 'PhonePe',
    bgClass: 'bg-purple-950/70',
    textClass: 'text-purple-300',
    borderClass: 'border-purple-500/40',
    dotColor: '#a855f7',
  },
  {
    id: 'supermoney',
    name: 'super.money',
    badgeLabel: 'super.money UPI',
    shortName: 'super.money',
    bgClass: 'bg-emerald-950/80',
    textClass: 'text-lime-300',
    borderClass: 'border-lime-500/40',
    dotColor: '#84cc16',
  },
  {
    id: 'gpay',
    name: 'Google Pay',
    badgeLabel: 'Google Pay UPI',
    shortName: 'GPay',
    bgClass: 'bg-blue-950/70',
    textClass: 'text-blue-300',
    borderClass: 'border-blue-500/40',
    dotColor: '#3b82f6',
  },
  {
    id: 'paytm',
    name: 'Paytm',
    badgeLabel: 'Paytm UPI',
    shortName: 'Paytm',
    bgClass: 'bg-cyan-950/70',
    textClass: 'text-cyan-300',
    borderClass: 'border-cyan-500/40',
    dotColor: '#06b6d4',
  },
  {
    id: 'cred',
    name: 'CRED',
    badgeLabel: 'CRED UPI',
    shortName: 'CRED',
    bgClass: 'bg-stone-900',
    textClass: 'text-amber-300',
    borderClass: 'border-amber-500/40',
    dotColor: '#f59e0b',
  },
  {
    id: 'bhim',
    name: 'BHIM',
    badgeLabel: 'BHIM UPI',
    shortName: 'BHIM',
    bgClass: 'bg-teal-950/70',
    textClass: 'text-teal-300',
    borderClass: 'border-teal-500/40',
    dotColor: '#14b8a6',
  },
];

export const getUpiBrandMeta = (id?: string | null): UpiBrandMeta | undefined => {
  if (!id) return undefined;
  const clean = id.toLowerCase().replace('upi-', '').replace('.', '');
  return UPI_BRAND_LIST.find(b => b.id === clean || b.id === id);
};

export interface Transaction {
  id: string;
  amount: number;
  item: string;
  categoryId: string;
  merchant: string;
  paymentMode: PaymentMode;
  upiAppId?: string; // e.g. 'upi-phonepe' or 'phonepe'
  upiBrandId?: UpiBrandAppId; // 'phonepe' | 'supermoney' | 'gpay' | 'paytm' | 'cred' | 'bhim' | 'other'
  accountId: string; // Bank account, credit card, or cash source
  date: string; // Strictly YYYY-MM-DD. NO TIME FIELD.
  receipt?: string; // Optional image data URL or reference
  notes?: string;
  transactionType: TransactionType;
  createdAt: number;
  // Enhanced Credit Card & SMS tracking fields
  ccPaymentSubtype?: CcPaymentSubtype;
  cardLastFour?: string;
  sourceSmsId?: string;
  isSmsVerified?: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  isCustom?: boolean;
}

export type AccountType = 'BANK' | 'CREDIT_CARD' | 'CASH' | 'WALLET';

export type CardNetwork = 'RUPAY' | 'VISA' | 'MASTERCARD' | 'AMEX';

export interface Account {
  id: string;
  name: string;
  institution: string;
  type: AccountType;
  lastFour?: string;
  color?: string;
  isActive: boolean;
  // Specific credit card properties
  creditLimit?: number;
  billingCycleDay?: number; // e.g. 15 for 15th of month
  paymentDueDaysAfterBill?: number; // e.g. 20 days after cycle
  cardNetwork?: CardNetwork;
  supportsUpiOnCard?: boolean; // RuPay credit cards support UPI directly
  cardholderName?: string;
}

export interface UpiApp {
  id: string;
  name: string;
  color?: string;
  isCustom?: boolean;
}

export interface Budget {
  id: string;
  categoryId?: string; // 'ALL' or specific categoryId
  period: 'MONTHLY' | 'WEEKLY';
  limitAmount: number;
  alertThreshold: number; // e.g. 80 for 80%
}

export interface RecurringTransaction {
  id: string;
  serviceName: string;
  amount: number;
  transactionType: TransactionType;
  categoryId: string;
  accountId: string;
  billingCycle: 'MONTHLY' | 'YEARLY' | 'WEEKLY';
  nextDate: string;
  isActive: boolean;
  notes?: string;
}

export interface SmartSuggestion {
  sourceTransaction: Transaction;
  item: string;
  categoryName: string;
  merchant: string;
  paymentMode: PaymentMode;
  upiAppName?: string;
  accountName: string;
  amount?: number;
  matchScore: number;
  frequency: number;
  recency: number;
  label: string; // e.g. "Chai · Food · Irani Chai · PhonePe · SBI CC"
}

// SMS Ingestion and Review Models
export interface SmsParsedData {
  amount: number;
  transactionType: TransactionType;
  rawMerchant: string; // e.g. "POS 402919 MUMBAI" or "98210344@paytm"
  cleanMerchant: string; // e.g. "Irani Chai"
  item: string; // e.g. "Irani Chai" or "Chai / Snacks"
  categoryId: string;
  accountId: string;
  paymentMode: PaymentMode;
  ccPaymentSubtype?: CcPaymentSubtype;
  upiAppId?: string;
  upiBrandId?: UpiBrandAppId;
  cardLastFour?: string;
  refNumber?: string;
  date: string; // YYYY-MM-DD
  confidence: number;
  isAiCleaned?: boolean;
  isLearnedPattern?: boolean;
  matchedRulePattern?: string;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  isPossibleDuplicate: boolean;
  matchedTransaction?: Transaction;
  matchReason?: string;
  confidence: 'HIGH' | 'MEDIUM' | 'NONE';
}

export interface SmsTransaction {
  id: string;
  sender: string; // e.g. "HDFCBK", "SBIINB", "ICICIB", "AXISBK"
  rawBody: string;
  receivedAt: number;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'DISCARDED' | 'DUPLICATE';
  parsedData: SmsParsedData;
  duplicateCheck?: DuplicateCheckResult;
}

// Background Learning Rules Store
export interface MerchantLearningRule {
  id: string;
  pattern: string; // e.g. "98210344" or "POS 402919" or "AMZN MKTP"
  cleanMerchant: string; // e.g. "Irani Chai"
  defaultItem: string;
  defaultCategoryId: string;
  defaultPaymentMode?: PaymentMode;
  defaultCcSubtype?: CcPaymentSubtype;
  defaultUpiBrandId?: UpiBrandAppId;
  defaultAccountId?: string;
  timesApplied: number;
  createdAt: number;
  updatedAt: number;
}

export type ActiveTab = 'HOME' | 'TRANSACTIONS' | 'CARDS' | 'ANALYTICS' | 'BUDGETS' | 'ACCOUNTS' | 'RECURRING' | 'SETTINGS';
