# Honeymoney — Manual-First Personal Spending Memory

A high-performance personal spending memory app built with a local-first architecture, history-driven Smart Entry engine that speeds up data entry with every transaction, comprehensive spending analytics, accounts and card tracking, and a hybrid Honeymoney AI query assistant.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **Summary of Confirmed Choices**:
> - **Layout Experience**: Mobile app view with responsive desktop support (framed mobile view on large viewports with desktop side-rail expansion, native bottom navigation on touch viewports).
> - **Preloaded History**: Seeded with a rich set of realistic spending transactions (PhonePe, CRED, Paytm, SBI credit card, Irani Chai, Swiggy, Zepto, utilities) so Smart Entry multi-field ranking and analytics can be tested immediately.
> - **Honeymoney AI Query Assistant**: Hybrid model combining instant deterministic client-side structured filtering (exact amounts, category sums, payment mode totals) with Gemini 3.8 Flash for intelligent natural-language spending analysis and insights.

---

### 1. Overview & Core Concept

- **What It Does**: Honeymoney acts as a personal spending memory rather than a passive ledger. Instead of slow repetitive manual form filling or brittle SMS scrapers, Honeymoney learns directly from your historical transactions. As you type an amount, item, or merchant, the **Smart Entry Engine** surfaces the most relevant 2–3 historical patterns (e.g. *Irani Chai · Food & Drinks · Irani Chai · PhonePe · SBI CC*) allowing single-tap auto-completion.
- **Target Audience**: Users who want tight control over their daily finances (UPI, credit cards, bank accounts, cash) without giving apps invasive SMS or bank credentials, and who want lightning-fast entry that remembers repetitive habits.
- **Key Value**: The 1st transaction takes a few seconds; the 50th transaction takes 2 keystrokes and 1 tap. Complete data privacy: all master records, receipts, and history live in client storage with full JSON export and restore.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **First Launch & Onboarding**:
   - Welcome splash with Honeymoney identity ("Your Spending Memory").
   - Startup preference selector: *Open directly to New Transaction* vs *Open to Home Dashboard*.
   - Instant seed confirmation (preloaded realistic history enabled).
2. **Lightning-Fast Smart Entry (Add / Edit Transaction)**:
   - User taps the prominent Gold `+` button.
   - Enter Amount (e.g., `20`) → Smart Entry instantly shows matching historical combinations ranked by multi-field match, frequency, and recency.
   - Alternatively, start typing Item (`Chai`) or Merchant (`Irani Chai`) → Smart suggestion chips appear immediately below the input.
   - Tap a suggestion: fills Category, Merchant, Payment Mode, UPI App, and Paid From card/account without overwriting user-typed text.
   - Date defaults strictly to today (no time field). User can change date for back-dated entries.
   - Optional Receipt attachment (camera/gallery upload with local preview and zoom).
   - Save updates the canonical transaction store, updates accounts, and re-ranks historical tuples.
3. **Transaction History & Deep Search**:
   - Date-grouped timeline (Today, Yesterday, Previous Days, Months).
   - Real-time search across item, merchant, category, notes, UPI app, and account names.
   - Multi-dimensional combinable filters: Date range, Amount range, Category, UPI App (PhonePe, CRED, Paytm), Payment Rail, and Account.
4. **Analytics & Spending Intelligence**:
   - Default to "This Month" with period-over-period comparisons.
   - KPI cards: Total Spent, Total Transactions, Average Transaction Size.
   - Interactive visual breakdown charts: Category split, Payment mode distribution (UPI vs Credit Card vs Cash), Top Merchants, and UPI App utilization.
   - Tap any category or merchant to drill directly into filtered transaction history.
5. **Accounts, Cards, Budgets & Recurring**:
   - Master records for Banks, Credit Cards (with last 4 digits), Cash balances, and Starter UPI apps.
   - Category budgets with real-time spend progress and threshold warnings.
   - Recurring subscriptions tracker (Netflix, Spotify, SIP, Rent) with next due dates.
6. **Honeymoney AI**:
   - Natural language query box with starter chips ("How much did I spend on Chai this month?", "Compare PhonePe vs Credit Card spending", "Largest expenses this week").
   - Instant deterministic calculation paired with Gemini 3.8 Flash conversational insights and actionable suggestions.

#### Visual Identity & Theme
- **Color Palette (Dark Forest & Gold)**:
  - Neutral Canvas (60%): `#08100C` (Deep Forest Obsidian) to `#0D1914` (Pine Shadow).
  - Structural Surfaces (30%): `#13261E` (Dark Emerald Surface), `#183328` (Elevated Card), hairline border `rgba(52, 211, 153, 0.12)`.
  - Accent & Action Points (10%): Honey Gold `#F59E0B` / `#FBBF24` for primary CTAs, active tab indicators, and key metric highlights; Emerald Mint `#10B981` / `#34D399` for income/balance states.
- **Typography & Hierarchy**:
  - Display / Numbers: Modern tabular numerals (`tabular-nums font-semibold`), high-contrast currency symbols (`₹`).
  - Body Prose: Clean, highly legible sans-serif (`Inter` / system stack) with generous touch-friendly sizing.
  - Zero-Pill Discipline: Unboxed metadata rows with subtle typographic separators (`·` and `/`) for transaction list items.
- **Ergonomics & Touch Targets**:
  - Touch targets $\ge 44\text{px}$, bottom navigation bar height $\approx 64\text{px}$ adhering to the 15% sticky surface budget.
  - Natural thumb-zone placement for the primary `+ New Transaction` action.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Text Normalization Engine**:
  - *Chosen Approach*: Centralized pure title-case normalization utility (`normalizeText`) applied at input and storage boundaries (e.g. `iRaNI chai` → `Irani Chai`, `phone pe` → `Phone Pe`). System enums (`UPI`, `CREDIT_CARD`, `CASH`) and numeric card digits (e.g. `5210`) are preserved.
  - *Why*: Prevents fragmented records and ensures Smart Entry frequency matching works seamlessly regardless of capitalization.
- **Decision 2: Smart Entry Suggestion Algorithm**:
  - *Chosen Approach*: Deterministic client-side multi-field matcher scoring previous transactions:
    $\text{Score} = (\text{Field Matches} \times 100) + (\text{Frequency} \times 10) + \text{Recency Decay}$.
    Shows top 2–3 candidate tuples.
  - *Why*: Instantaneous sub-10ms response while typing, works 100% offline, predictable, and does not require cloud ML.
- **Decision 3: Local-First Storage & Data Mobility**:
  - *Chosen Approach*: Robust browser persistence (LocalStorage / IndexedDB pattern) with full JSON Export, Import/Restore, and Reset capabilities.
  - *Why*: Fulfills the PDF's local-first rule without requiring cloud user authentication or bank API dependencies.
- **Decision 4: Honeymoney AI Querying**:
  - *Chosen Approach*: Dual execution: Deterministic query parser extracts dimensions (date ranges, category names, payment rails) and calculates exact figures directly from local state; the structured result and query are passed to a server-side Gemini 3.8 Flash route (`/api/ai/query`) to synthesize natural conversational analysis.
  - *Why*: Eliminates hallucinated spending numbers while giving the user natural-language flexibility.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        HONEYMONEY CLIENT (SPA)                        │
├────────────────────────────────────────────────────────────────────────┤
│  Top App Bar: Brand Wordmark · Quick Search · Settings / Reset Action  │
├────────────────────────────────────────────────────────────────────────┤
│  View Router:                                                          │
│  ├── [1] Home: Month Spend · Quick Stats · Recent Transactions Feed   │
│  ├── [2] Add/Edit Modal: Amount, Item, Smart Chips, UPI/Account Pickers│
│  ├── [3] History: Filter Drawer · Date Timeline · Global Search        │
│  ├── [4] Analytics: KPI Cards · Category & Rail Breakdowns · Trends    │
│  ├── [5] Honeymoney AI: Natural Language Query & Insights Drawer       │
│  └── [6] Manage: Accounts, Budgets, Subscriptions, Backup/Restore     │
├────────────────────────────────────────────────────────────────────────┤
│  Core Domain Engines:                                                  │
│  ├── Smart Entry Engine (Multi-field candidate scoring & ranking)      │
│  ├── Normalization Service (Title case, enums preservation)            │
│  └── Local Store (Transactions, Accounts, Categories, Budgets)         │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │ Local Persistence               │ Server Proxy Route
                   ▼                                 ▼
         ┌───────────────────┐             ┌─────────────────────┐
         │ Browser Storage   │             │ Express Backend     │
         │ (LocalStorage     │             │ POST /api/ai/query  │
         │  & JSON Export)   │             │ (Gemini 3.8 Flash)  │
         └───────────────────┘             └─────────────────────┘
```

#### Core Data Entities
1. **Transaction**: `id`, `amount`, `item`, `categoryId`, `merchant`, `paymentMode` (`UPI` | `CREDIT_CARD` | `DEBIT_CARD` | `CASH` | `NET_BANKING` | `OTHER`), `upiAppId` (optional, for UPI), `accountId` (paid from), `date` (`YYYY-MM-DD`), `receipt` (optional base64/URL), `notes` (optional), `transactionType` (`EXPENSE` | `INCOME` | `TRANSFER`), `createdAt`.
2. **Account**: `id`, `name`, `institution`, `type` (`BANK` | `CREDIT_CARD` | `CASH`), `lastFourDigits` (optional), `isActive`.
3. **Category**: `id`, `name`, `iconName`, `isCustom`.
4. **UpiApp**: `id`, `name`, `iconName`.
5. **Budget**: `id`, `categoryId`, `amount`, `period` (`MONTHLY` | `WEEKLY`).
6. **Subscription**: `id`, `name`, `amount`, `billingCycle`, `nextDueDate`, `categoryId`, `accountId`, `isActive`.
7. **UserSettings**: `startupScreen` (`HOME` | `NEW_TRANSACTION`), `currencySymbol` (`₹`), `hasCompletedOnboarding`.

---

### Implementation Phasing & Verification Plan

1. **Backend Server Setup**: Configure `server.ts` with Express and Vite middlewares, mounting `@google/genai` using `gemini-3.8-flash` on `/api/ai/query`.
2. **Data Layer & Normalization**: Create domain models, storage utilities, title-casing normalizer, and realistic preloaded Indian spending history.
3. **Smart Entry Engine**: Implement the ranking algorithm (`SmartEntryEngine.ts`) that matches against historical transactions in real-time.
4. **UI Framework & Navigation**: Implement the mobile-first framed container with desktop side-rail expansion, dark forest-green & honey-gold theme tokens, and bottom tab bar.
5. **Views & Components**:
   - `HomeView`: Month spend, count, quick stats, recent feed, prominent `+ New Transaction` trigger.
   - `AddEditTransactionModal`: Amount, normalized Item/Merchant, Smart Entry suggestions drawer, conditional UPI selector, account picker, date picker, receipt upload.
   - `HistoryView`: Date-grouped list, instant search, multi-faceted filter drawer, detail/edit/delete/clone actions.
   - `AnalyticsView`: Totals, average, category breakdown, payment mode split, merchant ranking, trend charts.
   - `HoneymoneyAiView`: Pre-built queries, interactive query input, structured deterministic calculations, and Gemini 3.8 Flash insights.
   - `ManageView`: Accounts & cards manager, Budgets & Recurring subscriptions, JSON backup/export, restore, and wipe data.
6. **Verification**: Compile with `compile_applet`, verify all interactive flows, test Smart Entry autocompletion, filter combinations, and AI queries.
