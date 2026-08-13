# Fish Snacks Vendor — Inventory & Profit Tracking Admin Studio
### Product Specification v1.1 (React, manual cost price)

**Context:** A single vendor prepares and sells fish-based snacks (fish momo, fish cutlet, fish roll, fish pakora, etc.) daily. He needs one place to record what he buys, what he makes, what he sells, what he wastes — and to see whether he actually made money that day.

**Decisions locked in:**
- **Stack:** React SPA, single operator, single device, browser-side storage. No login, no server.
- **Costing:** the vendor types the cost price per unit for each product manually. No recipe/BOM engine.

---

## 1. Design Principles

1. **Daily entry under 3 minutes.** The vendor is not an accountant. Every screen answers "what happened today."
2. **Snapshot every price.** Cost price and selling price are copied onto each transaction at the moment it is saved. The product record holds only the *current* price. This is non-negotiable — without it, editing a price corrupts all past reports.
3. **Made ≠ Sold.** The gap between production and sales is wastage, tracked explicitly. Ignoring it inflates profit.
4. **Fixed costs count.** Gas, packaging, transport, labour are recorded, so the vendor sees *net* profit, not just gross margin.
5. **Nothing is hard-deleted.** Corrections create adjustment records; history stays auditable.

---

## 2. Data Model

Because cost price is manual, raw material tracking and product costing are now **two independent subsystems**. Purchases tell him where his money went; product cost price tells him his margin. They are reconciled monthly rather than transaction-by-transaction.

### 2.1 RawMaterial
```
id, name, category, unit ('kg'|'litre'|'piece'|'packet'),
currentStock, lastRate, reorderLevel, isPerishable
```
Categories: Fish / Vegetable / Flour & Grain / Oil & Fat / Spice / Packaging / Other.

### 2.2 Purchase
```
id, date, supplier?, paymentMode ('cash'|'upi'|'credit'),
items: [{ rawMaterialId, quantity, rate, amount }],
otherCharges, total, note?
```
**On save:** `currentStock += quantity`, `lastRate = rate`. No costing math — this subsystem exists for spend tracking and stock alerts.

### 2.3 Product
```
id, name, sellingPrice, costPrice, batchYield, isActive, category?
```
`costPrice` is what the vendor types — his estimated ingredient cost per single sellable unit. Derived and shown live, not stored:
```
profitPerUnit = sellingPrice - costPrice
marginPercent = (profitPerUnit / sellingPrice) * 100
```
A **cost price history** array (`{ costPrice, sellingPrice, effectiveFrom }`) is kept on the product so past changes are visible in reports.

### 2.4 ProductionRun
```
id, date, productId, batches, unitsProduced,
costPriceSnapshot, note?
```
`unitsProduced` defaults to `batches × batchYield` but stays editable — real yield varies. Raw stock is **not** auto-deducted (no recipe to deduct against); the vendor adjusts raw stock manually or via the stock-adjustment tool.

### 2.5 Sale
```
id, date, productId, quantity, unitPrice,
costPriceSnapshot, paymentMode, time?
```
`unitPrice` defaults to the product's selling price, editable for discounts. `revenue = quantity × unitPrice`, `profit = quantity × (unitPrice − costPriceSnapshot)`.

**Sales mode** (a setting):
- *Quick* — one row per product at end of day. Recommended.
- *Bill* — individual transactions with timestamps, unlocking peak-hour analysis.

### 2.6 DayClose
```
date, entries: [{ productId, produced, sold, leftover, wasted }],
overheads: [{ label, amount }], isLocked, closedAt
```
Reconciliation: `produced − sold − leftover − wasted = 0`. Mismatches are flagged, not blocked. Wastage value = `wasted × costPriceSnapshot`, flagged above a configurable threshold (default 10%).

### 2.7 StockAdjustment
```
id, date, rawMaterialId, quantityDelta, reason ('spoilage'|'count'|'used'|'other'), note?
```
The escape hatch that keeps raw stock honest without a recipe engine.

### 2.8 Settings
```
businessName, logoDataUrl?, currency ('₹'), salesMode,
wastageThresholdPercent, targetMarginPercent, operatingDaysPerMonth
```

---

## 3. Screens (tabs)

**1. Dashboard** — Today's revenue, cost, gross profit, net profit, margin %. 30-day sparkline. Low-stock and wastage alerts. Top 3 / bottom 3 products by profit. Quick-action buttons.

**2. Purchases** — Multi-line purchase entry, history with date/supplier filters, spend by category, rate-trend chart per material.

**3. Raw Stock** — Live stock table, last purchase rate, reorder flags, stock-adjustment tool, spoilage logging.

**4. Products** — Product cards showing selling price, cost price, profit/unit, margin %. Inline cost-price editing with a warning that it applies to *future* records only. A **target-margin helper**: enter a desired margin, get the suggested selling price. Products below target margin are highlighted.

**5. Production** — Log batches per product, planned vs actual units, today's production sheet.

**6. Sales** — Single-screen grid: every active product in a row, quantity field, running revenue total. Built for thumb entry on a phone.

**7. Day Close** — Produced / sold / leftover / wasted per product, overhead entry, one-tap "Close Day" that locks the record.

**8. Reports** — Date-range picker, the analytics below, PDF and CSV export.

**9. Settings** — Business identity, sales mode, thresholds, backup/restore.

---

## 4. Analytics

| Question | How it's answered |
|---|---|
| Which day sells the most? | Day-of-week heatmap averaging revenue and profit across Mon–Sun, with a plain-language callout ("Sunday averages 2.1× Tuesday") |
| Which product makes real money? | Ranked by *total profit*, not units sold — a high-volume low-margin item often loses to a slower premium one |
| How much am I wasting? | Wastage % and rupee value per product; over-production list |
| Is my margin holding? | Margin trend per product over time, using snapshotted cost prices |
| What is my real margin? | Gross margin (after cost price) and net margin (after overheads), side by side |
| Where is my money going? | Purchase spend by category and by material |
| What's outstanding? | Receivables from credit sales, payables from credit purchases |

---

## 5. PDF Report

Client-side via `jspdf` + `jspdf-autotable`. Sections:

1. Header — business name, logo, period, generated timestamp
2. Executive summary — revenue, COGS, gross profit, overheads, net profit, margin %, units sold
3. Sales by product — units, revenue, cost, profit, margin %, sorted by profit
4. Daily breakdown — one row per day
5. Best/worst analysis — best day, worst day, day-of-week averages
6. Purchases summary — material-wise quantity, spend, average rate
7. Wastage report — product-wise leftover and spoilage with value
8. Closing raw stock
9. Footer — page numbers, "figures as entered" note

Ranges: Daily / Weekly / Monthly / Custom. CSV export alongside.

---

## 6. React Implementation Notes

**Suggested structure**
```
src/
  App.jsx                  // tab shell + routing
  context/StoreProvider.jsx // useReducer + persistence
  store/
    reducer.js             // all actions in one place
    selectors.js           // derived metrics live here, NOT in components
    persistence.js         // load/save, monthly partitioning
  tabs/
    Dashboard.jsx  Purchases.jsx  RawStock.jsx  Products.jsx
    Production.jsx Sales.jsx      DayClose.jsx  Reports.jsx  Settings.jsx
  components/               // KpiCard, DataTable, DateRangePicker, NumberPad...
  utils/
    pdf.js  csv.js  date.js  money.js
```

**State:** Context + `useReducer` is enough here; Redux is overkill for one operator. Every mutation goes through the reducer so persistence can be a single `useEffect` subscription.

**Persistence:** `localStorage` (or IndexedDB if you expect >5MB). Partition transactional data by month — `sales:2026-08`, `purchases:2026-08` — and keep masters (`products`, `rawMaterials`, `settings`) unpartitioned. Reports load only the months in range.

**Money:** store paise as integers, or round every calculation to 2 decimals at the boundary. Floating-point drift across a month of entries is real and will make his totals fail to tie out.

**Dates:** store `YYYY-MM-DD` strings, not `Date` objects. Timezone bugs at midnight are the classic killer here.

**Libraries:** `recharts` (charts), `jspdf` + `jspdf-autotable` (PDF), `date-fns` (dates), `lucide-react` (icons).

**Mobile-first:** this runs on a phone at a stall. Large touch targets, `inputMode="decimal"` on every numeric field, bottom tab bar rather than a sidebar.

---

## 7. Build Phases

**Phase 1 — Shell & masters.** Tab layout, store, persistence, Products CRUD with live margin, Raw Materials CRUD, Settings. *He can define his catalogue.*

**Phase 2 — Daily transactions.** Purchases, Production, Sales entry grid, raw stock adjustments. *He can record a day.*

**Phase 3 — Day Close & P&L.** Reconciliation, wastage, overheads, daily profit calculation. *He knows if today was profitable.*

**Phase 4 — Dashboard & analytics.** KPIs, trends, day-of-week analysis, product ranking, alerts.

**Phase 5 — Reports.** PDF, CSV, backup/restore, polish.

---

## 8. Still Open

1. **Sales mode** — quick daily totals or itemised bills? Bills unlock peak-hour analysis but cost effort every day.
2. **One stall or several?** Adding a location dimension later is painful; deciding now is cheap.
3. **Credit sales (udhaar)** — full customer ledger, or a single outstanding figure?
4. **UI language** — English only, or Bengali/Hindi labels on entry screens?
5. **Cost price review reminder** — since cost price is manual, it will drift out of date. Recommend a monthly nudge: "Fish cost has moved 18% since you last updated momo's cost price."