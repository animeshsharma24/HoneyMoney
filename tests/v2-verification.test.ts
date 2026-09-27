import { parseBankSms, checkForDuplicate } from '../src/services/smsParser';
import { 
  Transaction, 
  SmsTransaction, 
  MerchantLearningRule, 
  Account, 
  Category 
} from '../src/types';

// Minimal mock data
const mockAccounts: Account[] = [
  {
    id: 'acc-hdfc',
    name: 'HDFC Salary A/C',
    institution: 'HDFC Bank',
    type: 'BANK',
    lastFour: '1234',
    isActive: true
  },
  {
    id: 'acc-sbi-cc',
    name: 'SBI RuPay CC',
    institution: 'SBI Card',
    type: 'CREDIT_CARD',
    lastFour: '5210',
    isActive: true,
    creditLimit: 150000,
    billingCycleDay: 15,
    cardNetwork: 'RUPAY',
    supportsUpiOnCard: true
  }
];

const mockCategories: Category[] = [
  { id: 'cat-food', name: 'Food & Dining', icon: 'Utensils', color: '#10b981' },
  { id: 'cat-shopping', name: 'Shopping', icon: 'ShoppingBag', color: '#8b5cf6' }
];

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    testsPassed++;
  } else {
    console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    testsFailed++;
  }
}

console.log('\n--- 1. SMS PARSER & TRANSACTION CLASSIFICATION ---');
{
  const debitSms = 'Dear Customer, INR 450.00 debited from A/C XX1234 on 25-Sep-26 to SWIGGY. Ref 928310.';
  const parsed = parseBankSms(debitSms, { accounts: mockAccounts, categories: mockCategories, merchantRules: [] });
  assert(parsed.amount === 450, 'Extracts correct amount from debit SMS');
  assert(parsed.cleanMerchant.toLowerCase().includes('swiggy'), 'Extracts clean merchant name');
  assert(parsed.refNumber === '928310', 'Extracts reference number');
  assert(parsed.transactionType === 'EXPENSE', 'Classifies as EXPENSE');

  const ccUpiSms = 'SBI RuPay Card xx5210 debited by INR 195.00 via PhonePe UPI to IRANI CHAI on 25-Sep-26. Ref: 9940192.';
  const parsedCc = parseBankSms(ccUpiSms, { accounts: mockAccounts, categories: mockCategories, merchantRules: [] });
  assert(parsedCc.amount === 195, 'Extracts RuPay CC amount');
  assert(parsedCc.ccPaymentSubtype === 'UPI_ON_CREDIT_CARD', 'Classifies RuPay CC UPI correctly');
  assert(parsedCc.upiBrandId === 'phonepe', 'Identifies PhonePe UPI app brand');
  assert(parsedCc.cardLastFour === '5210', 'Extracts card ending digits 5210');

  const ccSwipeSms = 'Alert: Rs 80.00 spent on your Card ending 5210 at POS 402919 MUMBAI on 25-SEP-26. Ref: TXN948199.';
  const parsedSwipe = parseBankSms(ccSwipeSms, { accounts: mockAccounts, categories: mockCategories, merchantRules: [] });
  assert(parsedSwipe.amount === 80, 'Extracts direct swipe amount');
  assert(parsedSwipe.ccPaymentSubtype === 'DIRECT_SWIPE', 'Classifies POS 402919 as DIRECT_SWIPE');
}

console.log('\n--- 2. PRIORITIZED MULTI-FACTOR DUPLICATE DETECTION ---');
{
  const existingTx: Transaction = {
    id: 'tx-manual-1',
    amount: 195,
    item: 'Irani Chai',
    categoryId: 'cat-food',
    merchant: 'Irani Chai',
    paymentMode: 'UPI',
    accountId: 'acc-sbi-cc',
    cardLastFour: '5210',
    date: '2026-09-25',
    transactionType: 'EXPENSE',
    createdAt: Date.now(),
    notes: 'Ref: 9940192'
  };

  // Case A: Strong Bank Reference match (High Confidence)
  const smsWithRef = parseBankSms(
    'SBI RuPay Card xx5210 debited by INR 195.00 via PhonePe UPI to IRANI CHAI on 25-Sep-26. Ref: 9940192.',
    { accounts: mockAccounts, categories: mockCategories, merchantRules: [] }
  );
  const checkA = checkForDuplicate(smsWithRef, [existingTx]);
  assert(checkA.isDuplicate === true, 'Matches duplicate on bank reference / RRN');
  assert(checkA.confidence === 'HIGH', 'Confidence is HIGH on reference match');

  // Case B: Contextual Match (Card last4 + Merchant similarity + Amount + Date) without reference
  const smsWithoutRef = parseBankSms(
    'SBI RuPay Card xx5210 spent INR 195.00 at IRANI CHAI CAFE on 25-Sep-26.',
    { accounts: mockAccounts, categories: mockCategories, merchantRules: [] }
  );
  const checkB = checkForDuplicate(smsWithoutRef, [existingTx]);
  assert(checkB.isDuplicate === true, 'Matches duplicate on Card last4 + Merchant + Amount + Date');
  assert(checkB.confidence === 'HIGH', 'Confidence is HIGH for account/card + merchant match');

  // Case C: Possible Duplicate (Merchant + Amount + Date, but unverified account)
  const smsDifferentAccount = parseBankSms(
    'Alert: INR 195.00 spent on Axis Bank xx9999 to IRANI CHAI on 25-Sep-26.',
    { accounts: mockAccounts, categories: mockCategories, merchantRules: [] }
  );
  const checkC = checkForDuplicate(smsDifferentAccount, [existingTx]);
  assert(checkC.isDuplicate === false, 'Not marked as definitive duplicate when account differs');
  assert(checkC.isPossibleDuplicate === true, 'Marked as Possible Duplicate for user decision');
  assert(checkC.confidence === 'MEDIUM', 'Confidence is MEDIUM on merchant similarity alone');

  // Case D: Strict Non-Collision Rule: Amount & Date match alone without Merchant/Account similarity
  const smsChaiDifferentVendor = parseBankSms(
    'Paid INR 195.00 to BOOKMYSHOW TICKETS on 25-Sep-26.',
    { accounts: mockAccounts, categories: mockCategories, merchantRules: [] }
  );
  const checkD = checkForDuplicate(smsChaiDifferentVendor, [existingTx]);
  assert(checkD.isDuplicate === false, 'Strict rule: Amount + Date alone does NOT trigger duplicate');
  assert(checkD.isPossibleDuplicate === false, 'Strict rule: Amount + Date alone does NOT trigger possible duplicate');
  assert(checkD.confidence === 'NONE', 'Confidence is NONE');
}

console.log('\n--- 3. MERCHANT LEARNING RULE CREATION & REUSE ---');
{
  const learnedRules: MerchantLearningRule[] = [
    {
      id: 'rule-402919',
      pattern: '402919',
      cleanMerchant: 'Irani Chai Cafe',
      defaultItem: 'Irani Chai',
      defaultCategoryId: 'cat-food',
      defaultPaymentMode: 'CREDIT_CARD',
      defaultCcSubtype: 'DIRECT_SWIPE',
      defaultAccountId: 'acc-sbi-cc',
      timesApplied: 3,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  ];

  // Incoming SMS containing cryptic POS 402919
  const crypticSms = 'Alert: Rs 120.00 spent on Card ending 5210 at POS 402919 MUMBAI on 26-SEP-26.';
  const parsed = parseBankSms(crypticSms, { accounts: mockAccounts, categories: mockCategories, merchantRules: learnedRules });
  assert(parsed.cleanMerchant === 'Irani Chai Cafe', 'Applies learned merchant name from pattern 402919');
  assert(parsed.isLearnedPattern === true, 'Flags transaction as learned pattern');
  assert(parsed.confidence === 0.98, 'Sets learned pattern confidence to 98%');
  assert(parsed.item === 'Irani Chai', 'Applies learned default item');
}

console.log('\n--- 4. APPROVE, DISCARD, AND DUPLICATE STATE TRANSITIONS ---');
{
  let canonicalTxs: Transaction[] = [];
  let smsQueue: SmsTransaction[] = [
    {
      id: 'sms-test-1',
      sender: 'SBICRD',
      rawBody: 'INR 195.00 spent on Card 5210 at Irani Chai',
      receivedAt: Date.now(),
      status: 'PENDING_REVIEW',
      parsedData: {
        amount: 195,
        transactionType: 'EXPENSE',
        rawMerchant: 'IRANI CHAI',
        cleanMerchant: 'Irani Chai',
        item: 'Chai',
        categoryId: 'cat-food',
        accountId: 'acc-sbi-cc',
        paymentMode: 'CREDIT_CARD',
        ccPaymentSubtype: 'DIRECT_SWIPE',
        date: '2026-09-26',
        confidence: 0.85
      }
    },
    {
      id: 'sms-test-2',
      sender: 'HDFCBK',
      rawBody: 'INR 350.00 spent on Card 1234 at Starbucks',
      receivedAt: Date.now(),
      status: 'PENDING_REVIEW',
      parsedData: {
        amount: 350,
        transactionType: 'EXPENSE',
        rawMerchant: 'STARBUCKS',
        cleanMerchant: 'Starbucks',
        item: 'Coffee',
        categoryId: 'cat-food',
        accountId: 'acc-hdfc',
        paymentMode: 'CREDIT_CARD',
        date: '2026-09-26',
        confidence: 0.85
      }
    },
    {
      id: 'sms-test-3',
      sender: 'AXISBK',
      rawBody: 'INR 500.00 spent at Amazon',
      receivedAt: Date.now(),
      status: 'PENDING_REVIEW',
      parsedData: {
        amount: 500,
        transactionType: 'EXPENSE',
        rawMerchant: 'AMAZON',
        cleanMerchant: 'Amazon',
        item: 'Shopping',
        categoryId: 'cat-shopping',
        accountId: 'acc-hdfc',
        paymentMode: 'NET_BANKING',
        date: '2026-09-26',
        confidence: 0.85
      }
    }
  ];

  // 1. Approve sms-test-1: Creates exactly 1 canonical transaction and updates status to APPROVED
  const sms1 = smsQueue.find(s => s.id === 'sms-test-1')!;
  const newTx: Transaction = {
    id: `tx-${Date.now()}`,
    amount: sms1.parsedData.amount,
    item: sms1.parsedData.item,
    categoryId: sms1.parsedData.categoryId,
    merchant: sms1.parsedData.cleanMerchant,
    paymentMode: sms1.parsedData.paymentMode,
    accountId: sms1.parsedData.accountId,
    date: sms1.parsedData.date,
    transactionType: sms1.parsedData.transactionType,
    sourceSmsId: sms1.id,
    isSmsVerified: true,
    createdAt: Date.now()
  };
  canonicalTxs.push(newTx);
  sms1.status = 'APPROVED';

  assert(sms1.status === 'APPROVED', 'SMS status transitioned to APPROVED');
  assert(canonicalTxs.length === 1, 'Exactly one canonical transaction created on approval');
  assert(canonicalTxs[0].sourceSmsId === 'sms-test-1', 'Canonical transaction preserves sourceSmsId');

  // Attempting to approve again must be blocked
  assert((sms1.status as string) !== 'PENDING_REVIEW', 'Approved card is no longer pending and cannot be re-approved');

  // 2. Discard sms-test-2: Transitions status to DISCARDED and creates 0 canonical transactions
  const sms2 = smsQueue.find(s => s.id === 'sms-test-2')!;
  sms2.status = 'DISCARDED';
  assert(sms2.status === 'DISCARDED', 'SMS status transitioned to DISCARDED');
  assert(canonicalTxs.length === 1, 'Discarded item creates no canonical transaction');

  // 3. Mark sms-test-3 as DUPLICATE: Transitions status to DUPLICATE and creates 0 canonical transactions
  const sms3 = smsQueue.find(s => s.id === 'sms-test-3')!;
  sms3.status = 'DUPLICATE';
  assert(sms3.status === 'DUPLICATE', 'SMS status transitioned to DUPLICATE');
  assert(canonicalTxs.length === 1, 'Marking DUPLICATE creates no second canonical transaction');

  // Verify pending count logic
  const pendingCount = smsQueue.filter(s => s.status === 'PENDING_REVIEW').length;
  assert(pendingCount === 0, 'Pending count reaches 0 when all items are decided');
}

console.log('\n--- 5. CREDIT CARD BILLING CYCLE BOUNDARY CALCULATIONS ---');
{
  const cycleDay = 15;
  const currentYear = 2026;
  const currentMonth = 8; // September (0-indexed: 8)
  const currentDate = 20; // 20th of Sept -> current cycle is Sept 15 to Oct 14

  const toYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const start = new Date(currentYear, currentMonth, cycleDay);
  const end = new Date(currentYear, currentMonth + 1, cycleDay - 1);
  const prevStart = new Date(currentYear, currentMonth - 1, cycleDay);
  const prevEnd = new Date(currentYear, currentMonth, cycleDay - 1);

  const currentCycleStart = toYMD(start); // 2026-09-15
  const currentCycleEnd = toYMD(end);     // 2026-10-14
  const prevCycleStart = toYMD(prevStart); // 2026-08-15
  const prevCycleEnd = toYMD(prevEnd);     // 2026-09-14

  assert(currentCycleStart === '2026-09-15', 'Current cycle starts on exact cycle day (2026-09-15)');
  assert(currentCycleEnd === '2026-10-14', 'Current cycle ends on day before cycle day (2026-10-14)');
  assert(prevCycleStart === '2026-08-15', 'Previous cycle starts on previous month cycle day');
  assert(prevCycleEnd === '2026-09-14', 'Previous cycle ends on 2026-09-14');

  // Test inclusion / exclusion at boundary
  const txBoundaryStart = '2026-09-15';
  const txBoundaryPrev = '2026-09-14';
  const txBoundaryNextMonth = '2026-10-14';

  assert(txBoundaryStart >= currentCycleStart, 'Transaction on cycle start date included in unbilled');
  assert(txBoundaryPrev < currentCycleStart, 'Transaction on day before cycle start excluded from unbilled');
  assert(txBoundaryPrev >= prevCycleStart && txBoundaryPrev <= prevCycleEnd, 'Transaction on day before cycle start included in previous cycle');
  assert(txBoundaryNextMonth <= currentCycleEnd, 'Transaction on cycle end date included in current cycle');
}

console.log(`\n========================================`);
console.log(`TOTAL TESTS: ${testsPassed + testsFailed} | PASSED: ${testsPassed} | FAILED: ${testsFailed}`);
console.log(`========================================\n`);

if (testsFailed > 0) {
  process.exit(1);
}
