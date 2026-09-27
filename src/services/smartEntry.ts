import { Transaction, Category, Account, UpiApp, SmartSuggestion, PaymentMode } from '../types';
import { normalizeTitleCase, normalizeForSearch } from '../utils/normalize';

interface SmartEntryQuery {
  amount?: number | string;
  item?: string;
  categoryId?: string;
  merchant?: string;
  paymentMode?: PaymentMode | '';
  upiAppId?: string;
  accountId?: string;
}

interface SmartEntryContext {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  upiApps: UpiApp[];
}

export function rankSmartSuggestions(
  query: SmartEntryQuery,
  context: {
    transactions: Transaction[];
    categories: Category[];
    accounts: Account[];
    upiApps: UpiApp[];
  }
): SmartSuggestion[] {
  const { transactions, categories, accounts, upiApps } = context;
  if (!transactions || transactions.length === 0) {
    return [];
  }

  const categoryMap = new Map<string, Category>(categories.map(c => [c.id, c]));
  const accountMap = new Map<string, Account>(accounts.map(a => [a.id, a]));
  const upiAppMap = new Map<string, UpiApp>(upiApps.map(u => [u.id, u]));

  const queryAmount = query.amount ? Number(query.amount) : undefined;
  const queryItemNorm = normalizeForSearch(query.item);
  const queryMerchantNorm = normalizeForSearch(query.merchant);
  const queryCategoryId = query.categoryId?.trim() || undefined;
  const queryPaymentMode = query.paymentMode || undefined;
  const queryUpiAppId = query.upiAppId || undefined;
  const queryAccountId = query.accountId || undefined;

  const hasAnyInput = Boolean(
    (queryAmount && queryAmount > 0) ||
    queryItemNorm ||
    queryMerchantNorm ||
    queryCategoryId ||
    (queryPaymentMode && queryPaymentMode !== 'OTHER') ||
    queryUpiAppId ||
    queryAccountId
  );

  // Group historical transactions by signature to compute frequency and recency
  // Signature: [item, categoryId, merchant, paymentMode, upiAppId, accountId]
  interface HistoricalGroup {
    signature: string;
    item: string;
    categoryId: string;
    merchant: string;
    paymentMode: PaymentMode;
    upiAppId?: string;
    accountId: string;
    typicalAmount?: number;
    frequency: number;
    latestCreatedAt: number;
    latestTransaction: Transaction;
  }

  const groups = new Map<string, HistoricalGroup>();

  for (const tx of transactions) {
    // Only analyze expenses for standard smart entry suggestions
    const sig = `${normalizeForSearch(tx.item)}|${tx.categoryId}|${normalizeForSearch(tx.merchant)}|${tx.paymentMode}|${tx.upiAppId || ''}|${tx.accountId}`;
    const existing = groups.get(sig);
    if (!existing) {
      groups.set(sig, {
        signature: sig,
        item: normalizeTitleCase(tx.item),
        categoryId: tx.categoryId,
        merchant: normalizeTitleCase(tx.merchant),
        paymentMode: tx.paymentMode,
        upiAppId: tx.upiAppId,
        accountId: tx.accountId,
        typicalAmount: tx.amount,
        frequency: 1,
        latestCreatedAt: tx.createdAt || 0,
        latestTransaction: tx
      });
    } else {
      existing.frequency += 1;
      if ((tx.createdAt || 0) > existing.latestCreatedAt) {
        existing.latestCreatedAt = tx.createdAt || 0;
        existing.latestTransaction = tx;
        existing.typicalAmount = tx.amount;
      }
    }
  }

  const now = Date.now();
  const scoredSuggestions: SmartSuggestion[] = [];

  for (const group of groups.values()) {
    let score = 0;
    let matchFieldCount = 0;

    // Amount match
    if (queryAmount && queryAmount > 0 && group.typicalAmount) {
      if (Math.abs(group.typicalAmount - queryAmount) < 0.01) {
        score += 65;
        matchFieldCount++;
      } else if (Math.abs(group.typicalAmount - queryAmount) / queryAmount < 0.1) {
        score += 20; // within 10%
      }
    }

    // Item match
    if (queryItemNorm) {
      const gItemNorm = normalizeForSearch(group.item);
      if (gItemNorm === queryItemNorm) {
        score += 75;
        matchFieldCount++;
      } else if (gItemNorm.startsWith(queryItemNorm)) {
        score += 50;
        matchFieldCount++;
      } else if (gItemNorm.includes(queryItemNorm)) {
        score += 30;
        matchFieldCount++;
      }
    }

    // Merchant match
    if (queryMerchantNorm) {
      const gMerchNorm = normalizeForSearch(group.merchant);
      if (gMerchNorm === queryMerchantNorm) {
        score += 45;
        matchFieldCount++;
      } else if (gMerchNorm.startsWith(queryMerchantNorm)) {
        score += 30;
        matchFieldCount++;
      } else if (gMerchNorm.includes(queryMerchantNorm)) {
        score += 15;
        matchFieldCount++;
      }
    }

    // Category match
    if (queryCategoryId && group.categoryId === queryCategoryId) {
      score += 25;
      matchFieldCount++;
    }

    // Payment Mode match
    if (queryPaymentMode && group.paymentMode === queryPaymentMode) {
      score += 20;
      matchFieldCount++;
    }

    // UPI App match
    if (queryUpiAppId && group.upiAppId === queryUpiAppId) {
      score += 20;
      matchFieldCount++;
    }

    // Account match
    if (queryAccountId && group.accountId === queryAccountId) {
      score += 20;
      matchFieldCount++;
    }

    // Multi-field exact combo booster (PDF: "Exact multi-field combinations should strongly outrank weak partial matches")
    if (matchFieldCount >= 2) {
      score += matchFieldCount * 25;
    }

    // Historical frequency weight (more frequent transactions get consistent boost)
    score += Math.min(group.frequency * 6, 30);

    // Recency boost (within 7 days = +15, 30 days = +8)
    const daysAgo = (now - group.latestCreatedAt) / (1000 * 60 * 60 * 24);
    if (daysAgo <= 7) {
      score += 15;
    } else if (daysAgo <= 30) {
      score += 8;
    }

    // If user has not typed anything yet, suggest top 3 habitual spending items
    if (!hasAnyInput) {
      score = group.frequency * 10 + (daysAgo <= 7 ? 20 : 5);
    }

    // Filter threshold: must have matched at least something if inputs were provided
    if (hasAnyInput && matchFieldCount === 0 && (!queryAmount || Math.abs((group.typicalAmount || 0) - queryAmount) >= 0.01)) {
      continue;
    }

    const catName = categoryMap.get(group.categoryId)?.name || 'General';
    const acc = accountMap.get(group.accountId);
    const accName = acc ? `${acc.institution}${acc.lastFour ? ` ${acc.lastFour}` : ''}` : 'Account';
    const upiName = group.upiAppId ? upiAppMap.get(group.upiAppId)?.name : undefined;

    // Suggestion card example format from PDF: "Chai · Food · Irani Chai · PhonePe · SBI CC"
    const labelParts = [
      group.item,
      catName,
      group.merchant,
      group.paymentMode === 'UPI' && upiName ? upiName : group.paymentMode.replace('_', ' '),
      accName
    ].filter(Boolean);

    scoredSuggestions.push({
      sourceTransaction: group.latestTransaction,
      item: group.item,
      categoryName: catName,
      merchant: group.merchant,
      paymentMode: group.paymentMode,
      upiAppName: upiName,
      accountName: accName,
      amount: group.typicalAmount,
      matchScore: score,
      frequency: group.frequency,
      recency: group.latestCreatedAt,
      label: labelParts.join(' · ')
    });
  }

  // Sort descending by score, then recency
  scoredSuggestions.sort((a, b) => {
    if (b.matchScore !== a.matchScore) {
      return b.matchScore - a.matchScore;
    }
    return b.recency - a.recency;
  });

  // PDF Non-negotiable: "Show only about 2–3 highly relevant suggestions."
  return scoredSuggestions.slice(0, 3);
}

/**
 * Autocomplete helper for known unique Items and Merchants
 */
export function getKnownAutocompleteValues(
  transactions: Transaction[],
  type: 'item' | 'merchant',
  searchQuery: string
): string[] {
  const query = normalizeForSearch(searchQuery);
  const seen = new Set<string>();
  const results: string[] = [];

  for (const tx of transactions) {
    const rawVal = type === 'item' ? tx.item : tx.merchant;
    const normalized = normalizeTitleCase(rawVal);
    const lower = normalizeForSearch(normalized);
    if (!seen.has(lower) && (!query || lower.includes(query))) {
      seen.add(lower);
      results.push(normalized);
      if (results.length >= 6) break;
    }
  }

  return results;
}
