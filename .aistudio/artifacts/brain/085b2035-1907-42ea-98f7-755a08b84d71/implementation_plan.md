# Implementation Plan: Honeymoney v2 Gap Closure

Honeymoney v2 already has a robust manual-first spending architecture, history-driven Smart Entry, Credit Cards hub, and Tinder-style SMS review deck. This plan outlines the exact steps to close the verified gaps identified in the audit without redesigning existing working UI or architecture.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions were clarified, refined, and confirmed for v2 implementation:

- **Role of `sourceSmsId` vs Inbound Deduplication**: `sourceSmsId` serves primarily as an SMS-to-SMS re-processing/re-ingestion deduplication identifier (preventing the native bridge or simulator from inserting the same physical SMS candidate twice). For detecting a duplicate between an existing canonical transaction (which may have been entered manually and therefore has no `sourceSmsId`) and a newly received SMS, deduplication strictly prioritizes:
  1. Bank reference / UPI RRN
  2. Card last 4 digits or matched account
  3. Merchant similarity
  4. Exact amount
  5. Date proximity (same day or within 1 day)
  `sourceSmsId` alone is never required to detect that a manual transaction matches an incoming SMS.
- **Distinct `DUPLICATE` Review Status**: In addition to `PENDING_REVIEW`, `APPROVED`, and `DISCARDED`, SMS records support `DUPLICATE` as an explicit first-class status. A duplicate is a valid transaction that already exists in canonical history, whereas `DISCARDED` signifies the user intentionally rejected or ignored the SMS candidate.
- **Multi-Factor Duplicate Detection & Confidence Rules**: Amount and date similarity alone are strictly insufficient for flagging duplicates. If reference/RRN matches, it is a high-confidence match. If reference is missing, matching requires account/card last4 + merchant similarity + exact amount + date proximity. If only merchant and amount match without account context, it is labeled an advisory "Possible Duplicate" for user decision rather than automatically marked.
- **SMS Permissions Scope**: Real-time incoming SMS receiver only using `RECEIVE_SMS` (avoiding unnecessary broad `READ_SMS` inbox-scanning permissions).
- **Native Pending Buffer**: Compact `SharedPreferences` JSON queue to ensure zero SMS loss across Android process death or when the WebView is closed.
- **AI Removal**: Complete elimination of `/api/ai/clean-merchant` and Gemini dependencies from the SMS pipeline; 100% local, offline regex parsing and merchant learning.

---

## 1. Overview & Core Concept

Honeymoney v2 operates on a strict **Manual-First + Real-Time SMS Memory** paradigm. When an Android device receives a bank or UPI transaction SMS:
1. A native `BroadcastReceiver` catches the incoming SMS even if Honeymoney is killed or in the background.
2. The SMS is reconstructed (handling multipart PDUs) and stored in a durable native buffer (`SharedPreferences`).
3. A consolidated Android local notification informs the user ("X transactions need review") and directly targets the Review Queue.
4. When Honeymoney opens or resumes, the Capacitor bridge delivers pending SMS records to the local regex parser and merchant learning engine.
5. The user reviews transactions one-by-one in the Tinder-style deck with duplicate detection alerts, inline editing, and right-swipe approval.

---

## 2. User Experience & Visual Design

- **Visual Baseline**: Preserves the established Dark Forest Green & Gold aesthetic (`#070B09`, `#14261B`, `#E5A93C`, `#F1F5F3`) and Plus Jakarta Sans / JetBrains Mono typography. No UI redesigns.
- **SMS Review Deck Hardening**:
  - The card deck maintains touch drag and swipe mechanics (Right = Approve, Left = Discard).
  - Touching an input field (merchant, item, category, account) explicitly disables drag gesture listening to avoid accidental swipes.
  - **Refined Duplicate Detection Banner**:
    - Evaluated before approval against canonical transactions.
    - If strong match (matching Bank Ref/RRN, or Account/Card Last4 + Merchant + Amount + Date): displays "Duplicate Detected: matches existing transaction [₹X at Merchant on Date]".
    - If partial / moderate match (Merchant + Amount + Date but unverified account): displays advisory "Possible Duplicate: please verify [₹X at Merchant on Date]".
    - Direct actions on card:
      - **[Mark as Duplicate]**: Transition SMS status to `DUPLICATE` (records duplicate link, does not create a duplicate transaction in canonical history, clears from pending queue).
      - **[Add as New Transaction]**: Proceed to create a canonical transaction (bypasses duplicate warning if user confirms it was a separate spend).
- **Notification Deep-Link**:
  - Tapping the Android system notification launches the app directly into `SmsReviewModal` instead of generic Home.
  - When all pending SMS items are approved, discarded, or marked duplicate, the Android system notification automatically clears.

---

## 3. Key Product Decisions & Trade-Offs

- **No Background WebView / Service**:
  - *Chosen Approach*: Standard Android `BroadcastReceiver` + `SharedPreferences` buffer.
  - *Rationale*: Running background headless WebViews or persistent foreground services drains battery and is frequently killed by Android OEM battery managers (MIUI, OneUI). The receiver guarantees SMS capture in milliseconds with zero battery drain.
- **Local-Only Regex & Rule Learning (AI Removal)**:
  - *Chosen Approach*: Pure offline regex matching + `MerchantLearningRule` lookup.
  - *Rationale*: Guarantees instant processing in Airplane Mode, zero API costs, zero network latency, and complete user financial privacy.
- **Deduplication Priority Hierarchy**:
  - *Level 0 (SMS Buffer Deduplication)*: `sourceSmsId` or raw SMS fingerprint prevents duplicate ingestion of the exact same SMS event into the queue.
  - *Level 1 (Canonical Matching - Strong)*: Bank reference number / UPI RRN match against existing transaction reference / notes.
  - *Level 2 (Canonical Matching - Contextual)*: Card last 4 or account match + normalized merchant similarity + exact amount + date proximity (same day or within 1 day).
  - *Level 3 (Possible Duplicate Advisory)*: High merchant similarity + exact amount + date proximity, but funding account unverified.
  - *Strict Non-Collision Rule*: If only amount and date match without merchant or account alignment, do NOT flag as duplicate.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Android OS Telephony Layer                      │
│            [android.provider.Telephony.SMS_RECEIVED]                   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 Native Android Layer (Java / Capacitor)                │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ SmsReceiver.java                                               │   │
│   │ - Combines multipart SMS PDUs                                  │   │
│   │ - Extracts sender, body, timestamp, fingerprint                │   │
│   │ - Filters non-financial SMS (OTP, spam, promo)                 │   │
│   │ - Writes to SharedPreferences ("honeymoney_pending_sms")       │   │
│   │ - Triggers NotificationHelper ("X transactions need review")   │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   │                                    │
│   ┌───────────────────────────────▼────────────────────────────────┐   │
│   │ HoneymoneyNativeBridgePlugin.java (@CapacitorPlugin)           │   │
│   │ - getPendingSms() / clearPendingSms(ids)                       │   │
│   │ - cancelNotification()                                         │   │
│   │ - checkPermissions() / requestPermissions()                    │   │
│   │ - Emits 'pendingSmsReceived' when WebView is live              │   │
│   │ - Passes intent extras (OPEN_SMS_REVIEW) on notification tap   │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
└───────────────────────────────────┼────────────────────────────────────┘
                                    │ Capacitor Bridge
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     React Application Layer (TypeScript)               │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ HoneymoneyContext.tsx                                          │   │
│   │ - Consumes native pending buffer on launch/resume              │   │
│   │ - Passes to parseBankSms() (offline regex)                     │   │
│   │ - Applies MerchantLearningRule pattern matching                │   │
│   │ - Runs multi-factor duplicate detection against transactions   │   │
│   │ - Prioritizes Bank Ref/RRN -> Card last4/Acct -> Merchant      │   │
│   │ - Adds to smsQueue (PENDING_REVIEW)                            │   │
│   │ - Supports status: PENDING_REVIEW | APPROVED | DISCARDED |     │   │
│   │   DUPLICATE                                                    │   │
│   │ - Clears native buffer & updates native notification count     │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   │                                    │
│   ┌───────────────────────────────▼────────────────────────────────┐   │
│   │ SmsReviewModal.tsx (Tinder Card Deck)                          │   │
│   │ - Displays 1 pending SMS at a time                             │   │
│   │ - Shows "Duplicate Detected" or "Possible Duplicate" banner    │   │
│   │ - Actions: Mark Duplicate (DUPLICATE) | Discard (DISCARDED)    │   │
│   │ - Right Swipe / Approve -> Canonical Transaction + Learn Rule  │   │
│   │ - Left Swipe / Discard -> Mark DISCARDED                       │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Implementation Phases & File Inventory

### Phase 1: Native Android SMS Engine & Notification Service
- **`android/app/src/main/AndroidManifest.xml`**:
  - Add `<uses-permission android:name="android.permission.RECEIVE_SMS" />`
  - Add `<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />`
  - Register `<receiver android:name=".SmsReceiver" android:exported="true" android:permission="android.permission.BROADCAST_SMS">` with intent-filter `android.provider.Telephony.SMS_RECEIVED`.
- **`android/app/src/main/java/com/honeymoney/app/SmsReceiver.java`**:
  - Reconstruct multipart SMS via `Telephony.Sms.Intents.getMessagesFromIntent(intent)`.
  - Filter out OTP / telecom service messages without transaction markers (`debited`, `spent`, `credited`, `paid`, `INR`, `Rs`).
  - Generate deterministic SMS hash to avoid double-processing.
  - Persist compact record into `SharedPreferences`.
  - Issue/update consolidated status bar notification via `NotificationHelper`.
- **`android/app/src/main/java/com/honeymoney/app/NotificationHelper.java`**:
  - Create notification channel `honeymoney_sms_alerts` (HIGH importance).
  - Post/update notification with `PendingIntent` holding `EXTRA_ROUTE = "SMS_REVIEW"`.
  - Support `cancelNotification()`.
- **`android/app/src/main/java/com/honeymoney/app/HoneymoneyNativeBridgePlugin.java`**:
  - Capacitor plugin registered in `MainActivity.java`.
  - Expose `getPendingSms`, `clearPendingSms`, `cancelNotification`, and permission helpers.
- **`android/app/src/main/java/com/honeymoney/app/MainActivity.java`**:
  - Register `HoneymoneyNativeBridgePlugin`.
  - In `onNewIntent` and `onCreate`, pass notification route intent extras to the bridge.

### Phase 2: AI Removal & Pure Local SMS Pipeline
- **`src/context/HoneymoneyContext.tsx`**:
  - Remove all calls to `/api/ai/clean-merchant` and `enhanceMerchantWithAi`.
  - Hook Capacitor plugin listeners and resume listeners to consume native pending SMS buffer.
  - When pending count reaches 0, invoke native `cancelNotification()`.
- **`server.ts`**:
  - Remove `/api/ai/clean-merchant` route handler to ensure zero AI dependency.

### Phase 3: Status Model & Multi-Factor Duplicate Detection
- **`src/types/index.ts`**:
  - Update `SmsTransaction['status']` to `'PENDING_REVIEW' | 'APPROVED' | 'DISCARDED' | 'DUPLICATE'`.
  - Add `DuplicateCheckResult` with `isDuplicate`, `isPossibleDuplicate`, `matchedTransaction`, `matchReason`.
- **`src/services/smsParser.ts` & `src/context/HoneymoneyContext.tsx`**:
  - Implement `checkForDuplicate(parsedData, existingTransactions)`:
    - `sourceSmsId` checks queue re-processing.
    - Factor 1: Bank reference / UPI RRN match against existing transaction notes/ref.
    - Factor 2: Card last 4 or account match + normalized merchant similarity + exact amount + date proximity (within 1 day).
    - Factor 3: Flag as "Possible Duplicate" if merchant similarity is high with exact amount & date match but account differs.
    - Factor 4: Explicitly reject matching purely on amount and date without merchant or account context.
  - Attach `duplicateCheck?: DuplicateCheckResult` to `SmsTransaction`.
- **`src/components/SmsReviewModal.tsx`**:
  - Render dedicated duplicate alert banner:
    - For confirmed duplicate: "Duplicate Detected (matches [Tx details])" with **[Mark as Duplicate]** action.
    - For possible duplicate: "Possible Duplicate (matches [Tx details])" with **[Mark Duplicate]** or **[Accept Anyway]**.
  - Provide explicit handler `handleMarkDuplicate(smsId)` setting status to `'DUPLICATE'` without creating a second canonical transaction.
  - Isolate form inputs (`onPointerDown={(e) => e.stopPropagation()}`) to prevent accidental swipe gestures.

### Phase 4: Credit Card Statement Accuracy
- **`src/components/CreditCardsView.tsx`**:
  - Verify statement item filtering preserves `ccPaymentSubtype === 'UPI_ON_CREDIT_CARD'` vs `DIRECT_SWIPE`.
  - Ensure rich context (UPI brand badge, card last 4, merchant) renders cleanly in statement list and exported clipboard summary.

### Phase 5: Automated Test Suite & Capacitor Build Sync
- **`tests/v2-verification.test.ts`**:
  - Standalone TypeScript test suite runnable via `tsx tests/v2-verification.test.ts`.
  - Tests SMS parser, non-transaction filtering, multi-factor duplicate detection (and non-detection when only amount/date match), merchant learning, `DUPLICATE` vs `DISCARDED` vs `APPROVED` state transitions, UPI-on-CC classification, and billing cycle boundary dates.
- **Capacitor Sync & Android Asset Verification**:
  - Execute `npm run build && npx cap sync`.
  - Confirm `android/app/src/main/assets/public/` matches current build artifacts.
