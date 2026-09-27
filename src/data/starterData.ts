import { 
  Category, 
  Account, 
  UpiApp, 
  Transaction, 
  Budget, 
  RecurringTransaction, 
  MerchantLearningRule, 
  SmsTransaction 
} from '../types';

export const STARTER_CATEGORIES: Category[] = [
  { id: 'cat-food', name: 'Food & Drinks', icon: 'Utensils', color: '#10B981' },
  { id: 'cat-transport', name: 'Transport', icon: 'Car', color: '#3B82F6' },
  { id: 'cat-shopping', name: 'Shopping', icon: 'ShoppingBag', color: '#EC4899' },
  { id: 'cat-bills', name: 'Bills & Utilities', icon: 'Zap', color: '#F59E0B' },
  { id: 'cat-health', name: 'Health', icon: 'HeartPulse', color: '#EF4444' },
  { id: 'cat-entertainment', name: 'Entertainment', icon: 'Film', color: '#8B5CF6' },
  { id: 'cat-travel', name: 'Travel', icon: 'Plane', color: '#06B6D4' },
  { id: 'cat-education', name: 'Education', icon: 'GraduationCap', color: '#6366F1' },
  { id: 'cat-family', name: 'Family', icon: 'Users', color: '#14B8A6' },
  { id: 'cat-personal', name: 'Personal', icon: 'UserCheck', color: '#F97316' },
  { id: 'cat-investments', name: 'Investments', icon: 'TrendingUp', color: '#84CC16' },
  { id: 'cat-other', name: 'Other', icon: 'MoreHorizontal', color: '#94A3B8' },
];

export const STARTER_UPI_APPS: UpiApp[] = [
  { id: 'upi-phonepe', name: 'PhonePe', color: '#5F259F' },
  { id: 'upi-supermoney', name: 'super.money', color: '#84CC16' },
  { id: 'upi-cred', name: 'CRED', color: '#1E1E1E' },
  { id: 'upi-paytm', name: 'Paytm', color: '#00BAF2' },
  { id: 'upi-gpay', name: 'Google Pay', color: '#4285F4' },
  { id: 'upi-bhim', name: 'BHIM', color: '#005A9C' },
];

// Clean empty starter state for personal use and fresh export
export const STARTER_ACCOUNTS: Account[] = [];

export const STARTER_BUDGETS: Budget[] = [];

export const STARTER_RECURRING: RecurringTransaction[] = [];

export const STARTER_MERCHANT_RULES: MerchantLearningRule[] = [];

export function generateStarterPendingSms(): SmsTransaction[] {
  return [];
}

export function generateStarterTransactions(): Transaction[] {
  return [];
}
