import { 
  SmsParsedData, 
  MerchantLearningRule, 
  Account, 
  Category, 
  PaymentMode, 
  CcPaymentSubtype,
  UpiBrandAppId,
  Transaction,
  DuplicateCheckResult
} from '../types';
import { normalizeTitleCase } from '../utils/normalize';

interface ParseContext {
  accounts: Account[];
  categories: Category[];
  merchantRules: MerchantLearningRule[];
}

export function parseBankSms(rawText: string, context: ParseContext): SmsParsedData {
  const { accounts, categories, merchantRules } = context;
  const upper = rawText.toUpperCase();

  // 1. Amount Extraction
  // Look for Rs. / INR / Rs / INR followed by digits and optional decimals
  let amount = 0;
  const amountMatch = rawText.match(/(?:(?:RS\.?|INR)\s*|DEBITED BY\s*(?:RS\.?|INR)?\s*)([0-9,]+(?:\.[0-9]{1,2})?)/i)
    || rawText.match(/(?:SPENT|FOR|USED FOR)\s*(?:RS\.?|INR)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i)
    || rawText.match(/([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:SPENT|DEBITED)/i);

  if (amountMatch && amountMatch[1]) {
    const cleanAmt = amountMatch[1].replace(/,/g, '');
    const parsedAmt = parseFloat(cleanAmt);
    if (!isNaN(parsedAmt)) {
      amount = parsedAmt;
    }
  }

  // 2. Transaction Type
  const isCredit = /(?:CREDITED|REFUND|RECEIVED|CASHBACK)/i.test(rawText) && !/(?:DEBITED|SPENT|CHARGED)/i.test(rawText);
  const transactionType = isCredit ? 'INCOME' : 'EXPENSE';

  // 3. Card / Account detection
  let cardLastFour: string | undefined;
  const cardMatch = rawText.match(/(?:ENDING|CARD|A\/C|ACC|XX|\*|NO\.?)\s*(?:NO\.?\s*)?[:#]?\s*([0-9]{4})/i)
    || rawText.match(/([0-9]{4})\s*(?:IS DEBITED|SPENT)/i);

  if (cardMatch && cardMatch[1]) {
    cardLastFour = cardMatch[1];
  }

  // Match with existing account
  let matchedAccount: Account | undefined;
  if (cardLastFour) {
    matchedAccount = accounts.find(a => a.lastFour === cardLastFour);
  }
  if (!matchedAccount) {
    if (/CREDIT CARD|CC|RUPAY CC/i.test(rawText)) {
      matchedAccount = accounts.find(a => a.type === 'CREDIT_CARD') || accounts[0];
    } else {
      matchedAccount = accounts.find(a => a.type === 'BANK') || accounts[0];
    }
  }

  // 4. Payment Mode & Subtype detection
  let paymentMode: PaymentMode = 'OTHER';
  let ccPaymentSubtype: CcPaymentSubtype | undefined;
  let upiAppId: string | undefined;
  let upiBrandId: UpiBrandAppId | undefined;

  // Detect specific UPI App from text, VPA handles, or payment headers
  if (/super\.?money|@super\b/i.test(rawText)) {
    upiBrandId = 'supermoney';
    upiAppId = 'upi-supermoney';
  } else if (/phonepe|@ybl\b|@ibl\b|@axl\b/i.test(rawText)) {
    upiBrandId = 'phonepe';
    upiAppId = 'upi-phonepe';
  } else if (/google\s*pay|gpay|@okhdfcbank\b|@okaxis\b|@okicici\b|@oksbi\b/i.test(rawText)) {
    upiBrandId = 'gpay';
    upiAppId = 'upi-gpay';
  } else if (/paytm|@paytm\b/i.test(rawText)) {
    upiBrandId = 'paytm';
    upiAppId = 'upi-paytm';
  } else if (/cred|@cred\b/i.test(rawText)) {
    upiBrandId = 'cred';
    upiAppId = 'upi-cred';
  } else if (/bhim|@upi\b/i.test(rawText)) {
    upiBrandId = 'bhim';
    upiAppId = 'upi-bhim';
  }

  const isUpi = /(?:UPI|VPA|BHIM|GPAY|PHONEPE|PAYTM|CRED|SUPERMONEY|SUPER\.MONEY)/i.test(rawText) || !!upiBrandId;
  const isCreditCard = matchedAccount?.type === 'CREDIT_CARD' || /(?:CREDIT CARD|CC|CARD ENDING|POS)/i.test(rawText);

  if (isCreditCard && isUpi) {
    paymentMode = 'CREDIT_CARD';
    ccPaymentSubtype = 'UPI_ON_CREDIT_CARD';
  } else if (isCreditCard) {
    paymentMode = 'CREDIT_CARD';
    if (/POS|SWIPE|STORE/i.test(rawText)) {
      ccPaymentSubtype = 'DIRECT_SWIPE';
    } else if (/ONLINE|AMAZON|SWIGGY|ZOMATO|FLIPKART|NETFLIX/i.test(rawText)) {
      ccPaymentSubtype = 'ONLINE';
    } else if (/MANDATE|AUTOPAY|SI|AUTO-DEBIT/i.test(rawText)) {
      ccPaymentSubtype = 'AUTO_DEBIT';
    } else {
      ccPaymentSubtype = 'DIRECT_SWIPE';
    }
  } else if (isUpi) {
    paymentMode = 'UPI';
  } else if (/DEBIT CARD|DC/i.test(rawText)) {
    paymentMode = 'DEBIT_CARD';
  } else if (/NET BANKING|NEFT|IMPS|RTGS/i.test(rawText)) {
    paymentMode = 'NET_BANKING';
  }

  // 5. Raw Merchant Extraction
  let rawMerchant = 'Merchant';
  const merchantRegexList = [
    /(?:AT|TO|INFO\/|TRANSFER TO)\s+(?:POS\s+)?([A-Z0-9\s\-@.]{3,30}?)(?=\s+(?:ON|REF|AVL|BAL|DATE|NOT YOU|LIMIT|\.))/i,
    /(?:VPA|UPI\/)\s*([A-Z0-9\-_.@]+)/i,
    /(?:FOR)\s+([A-Z0-9\s\-]{3,25}?)(?=\s+(?:ON|REF|AVL|BAL|\.))/i,
    /(?:SPENT AT|DEBITED AT)\s+([A-Z0-9\s\-]{3,25})/i
  ];

  for (const regex of merchantRegexList) {
    const match = rawText.match(regex);
    if (match && match[1]) {
      const candidate = match[1].trim();
      if (!/^(THE|YOUR|OUR|A\/C|RS|INR)$/i.test(candidate)) {
        rawMerchant = candidate;
        break;
      }
    }
  }

  // 6. Check Learned Merchant Rules (System Learning from user edits)
  let cleanMerchant = rawMerchant;
  let item = rawMerchant;
  let categoryId = 'cat-food';
  let isLearnedPattern = false;
  let matchedRulePattern: string | undefined;

  // Search user's learned knowledge base first!
  const sortedRules = [...merchantRules].sort((a, b) => b.timesApplied - a.timesApplied);
  for (const rule of sortedRules) {
    const patternUpper = rule.pattern.toUpperCase();
    if (
      upper.includes(patternUpper) || 
      rawMerchant.toUpperCase().includes(patternUpper)
    ) {
      cleanMerchant = rule.cleanMerchant;
      item = rule.defaultItem || rule.cleanMerchant;
      categoryId = rule.defaultCategoryId;
      if (rule.defaultPaymentMode) paymentMode = rule.defaultPaymentMode;
      if (rule.defaultCcSubtype) ccPaymentSubtype = rule.defaultCcSubtype;
      if (rule.defaultUpiBrandId) {
        upiBrandId = rule.defaultUpiBrandId;
        upiAppId = `upi-${rule.defaultUpiBrandId}`;
      }
      if (rule.defaultAccountId && accounts.some(a => a.id === rule.defaultAccountId)) {
        matchedAccount = accounts.find(a => a.id === rule.defaultAccountId);
      }
      isLearnedPattern = true;
      matchedRulePattern = rule.pattern;
      break;
    }
  }

  // If not learned yet, apply heuristic cleaning
  if (!isLearnedPattern) {
    let cleaned = rawMerchant
      .replace(/^POS\s+/i, '')
      .replace(/^VPA\s+/i, '')
      .replace(/@\w+$/i, '')
      .replace(/\s+(MUMBAI|BANGALORE|BENGALURU|DELHI|PUNE|HYDERABAD|CHENNAI|KOLKATA|IN|IND)$/i, '')
      .replace(/\s+(RETAIL|PVT|LTD|STORE|COMMERCE|MKTP)$/i, '')
      .replace(/[0-9]{6,}/g, '') // remove random long pos terminal ids
      .trim();

    // Specific well-known merchants
    if (/SWIGGY/i.test(cleaned)) {
      cleanMerchant = 'Swiggy';
      item = 'Food Delivery';
      categoryId = 'cat-food';
    } else if (/ZOMATO/i.test(cleaned)) {
      cleanMerchant = 'Zomato';
      item = 'Dining / Order';
      categoryId = 'cat-food';
    } else if (/AMAZON|AMZN/i.test(cleaned)) {
      cleanMerchant = 'Amazon';
      item = 'Online Shopping';
      categoryId = 'cat-shopping';
    } else if (/BLINKIT|ZEPTO|INSTAMART/i.test(cleaned)) {
      cleanMerchant = normalizeTitleCase(cleaned.split(' ')[0]);
      item = 'Quick Groceries';
      categoryId = 'cat-food';
    } else if (/UBER|OLA/i.test(cleaned)) {
      cleanMerchant = normalizeTitleCase(cleaned.split(' ')[0]);
      item = 'Cab Ride';
      categoryId = 'cat-transport';
    } else if (/INDIAN OIL|HPCL|BPCL|SHELL|PETROL/i.test(cleaned)) {
      cleanMerchant = 'Fuel Station';
      item = 'Petrol Fuel';
      categoryId = 'cat-transport';
    } else if (/IRANI CHAI|TEA|CHAI/i.test(cleaned)) {
      cleanMerchant = 'Irani Chai';
      item = 'Chai / Snacks';
      categoryId = 'cat-food';
    } else if (cleaned.length > 0) {
      cleanMerchant = normalizeTitleCase(cleaned);
      item = cleanMerchant;
      // Guess category by keyword
      if (/FOOD|CAFE|BAKERY|RESTAURANT|SWEETS|HOTEL/i.test(rawText)) categoryId = 'cat-food';
      else if (/MEDIC|PHARMA|HOSPITAL|CLINIC/i.test(rawText)) categoryId = 'cat-health';
      else if (/METRO|RAIL|FLIGHT|AIR/i.test(rawText)) categoryId = 'cat-travel';
      else if (/CINEMA|PVR|INOX|MOVIE|NETFLIX/i.test(rawText)) categoryId = 'cat-entertainment';
      else if (/MART|SUPERMARKET|BAZAR|STORE/i.test(rawText)) categoryId = 'cat-shopping';
      else categoryId = categories[0]?.id || 'cat-food';
    }
  }

  // 7. Date extraction
  let dateStr = new Date().toISOString().split('T')[0];
  const dateMatch = rawText.match(/(\d{1,2})[-/ ]([A-Za-z]{3}|\d{1,2})[-/ ](\d{2,4})/);
  if (dateMatch) {
    const day = dateMatch[1].padStart(2, '0');
    let month = dateMatch[2];
    const yearStr = dateMatch[3];
    const fullYear = yearStr.length === 2 ? `20${yearStr}` : yearStr;

    const months: Record<string, string> = {
      JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
      JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12'
    };

    if (months[month.toUpperCase()]) {
      month = months[month.toUpperCase()];
    } else if (/^\d+$/.test(month)) {
      month = month.padStart(2, '0');
    }

    if (/^\d{2}$/.test(month) && /^\d{2}$/.test(day) && /^\d{4}$/.test(fullYear)) {
      dateStr = `${fullYear}-${month}-${day}`;
    }
  }

  // 8. Ref number
  let refNumber: string | undefined;
  const refMatch = rawText.match(/(?:REF|TXN|RR|UPI REF)\s*(?:NO\.?)?\s*[:#]?\s*([A-Za-z0-9]{6,16})/i);
  if (refMatch && refMatch[1]) {
    refNumber = refMatch[1];
  }

  const confidence = isLearnedPattern ? 0.98 : amount > 0 && cleanMerchant !== 'Merchant' ? 0.85 : 0.65;

  return {
    amount,
    transactionType,
    rawMerchant,
    cleanMerchant,
    item,
    categoryId,
    accountId: matchedAccount?.id || accounts[0]?.id || 'acc-hdfc',
    paymentMode,
    ccPaymentSubtype,
    upiAppId,
    upiBrandId,
    cardLastFour,
    refNumber,
    date: dateStr,
    confidence,
    isLearnedPattern,
    matchedRulePattern
  };
}

/**
 * Prioritized Multi-Factor Duplicate Detection:
 * 1. Bank reference / UPI RRN
 * 2. Card last4 or account
 * 3. Merchant similarity
 * 4. Exact amount
 * 5. Date proximity
 * 
 * Strict rule: Amount + date alone is NOT sufficient.
 */
export function checkForDuplicate(
  parsed: SmsParsedData,
  existingTransactions: Transaction[]
): DuplicateCheckResult {
  if (!parsed || !parsed.amount || parsed.amount <= 0 || !existingTransactions || existingTransactions.length === 0) {
    return { isDuplicate: false, isPossibleDuplicate: false, confidence: 'NONE' };
  }

  const normParsedMerchant = (parsed.cleanMerchant || parsed.rawMerchant || '').toLowerCase().trim();
  const parsedDate = parsed.date;

  for (const tx of existingTransactions) {
    // Exact amount match is required
    if (Math.abs(tx.amount - parsed.amount) > 0.01) {
      continue;
    }

    // Date proximity: same day or within 1.5 calendar days
    let dateClose = false;
    if (tx.date && parsedDate) {
      if (tx.date === parsedDate) {
        dateClose = true;
      } else {
        const d1 = new Date(tx.date).getTime();
        const d2 = new Date(parsedDate).getTime();
        if (!isNaN(d1) && !isNaN(d2) && Math.abs(d1 - d2) <= 86400000 * 1.5) {
          dateClose = true;
        }
      }
    }

    if (!dateClose) {
      continue;
    }

    // 1. Bank reference / UPI RRN match (Highest confidence)
    if (parsed.refNumber && parsed.refNumber.length >= 6) {
      const refClean = parsed.refNumber.toLowerCase();
      const inNotes = (tx.notes || '').toLowerCase().includes(refClean);
      const inItem = (tx.item || '').toLowerCase().includes(refClean);
      const inMerchant = (tx.merchant || '').toLowerCase().includes(refClean);
      if (inNotes || inItem || inMerchant) {
        return {
          isDuplicate: true,
          isPossibleDuplicate: false,
          matchedTransaction: tx,
          matchReason: `Bank/UPI reference ${parsed.refNumber} matches existing transaction`,
          confidence: 'HIGH'
        };
      }
    }

    // Merchant Similarity
    const normTxMerchant = (tx.merchant || '').toLowerCase().trim();
    const normTxItem = (tx.item || '').toLowerCase().trim();
    const merchantMatches = Boolean(
      (normParsedMerchant && normTxMerchant && (normParsedMerchant.includes(normTxMerchant) || normTxMerchant.includes(normParsedMerchant))) ||
      (normParsedMerchant && normTxItem && (normParsedMerchant.includes(normTxItem) || normTxItem.includes(normParsedMerchant)))
    );

    // Account / Card last4 Match
    const accountMatches = Boolean(
      (parsed.accountId && tx.accountId === parsed.accountId) ||
      (parsed.cardLastFour && tx.cardLastFour === parsed.cardLastFour)
    );

    // 2. High confidence: Account/Card last4 + Merchant match + Exact Amount + Date Proximity
    if (accountMatches && merchantMatches) {
      return {
        isDuplicate: true,
        isPossibleDuplicate: false,
        matchedTransaction: tx,
        matchReason: `Matching ${tx.cardLastFour ? 'card ending ' + tx.cardLastFour : 'account'} & merchant "${tx.merchant}" on ${tx.date}`,
        confidence: 'HIGH'
      };
    }

    // 3. Medium confidence: Merchant matches + Exact Amount + Date Proximity (account unconfirmed)
    if (merchantMatches) {
      return {
        isDuplicate: false,
        isPossibleDuplicate: true,
        matchedTransaction: tx,
        matchReason: `Similar merchant "${tx.merchant}" & exact ₹${tx.amount} on ${tx.date}`,
        confidence: 'MEDIUM'
      };
    }

    // Notice: If only amount and date match without merchant/account/ref similarity,
    // we strictly do not flag it as duplicate or possible duplicate.
  }

  return { isDuplicate: false, isPossibleDuplicate: false, confidence: 'NONE' };
}

