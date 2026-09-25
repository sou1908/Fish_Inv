import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  real,
  jsonb,
  timestamp,
  date,
} from "drizzle-orm/pg-core";

/**
 * MONEY is stored as integer paise everywhere (e.g. ₹12.50 -> 1250).
 * QUANTITIES that can be fractional (kg, litre) use real.
 * DATES are stored as 'YYYY-MM-DD' strings (date mode: 'string') to dodge
 * timezone/midnight bugs. See fish.md §6.
 */

// 2.8 Settings — single row (id = 1)
export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  businessName: text("business_name").notNull().default("My Fish Snacks"),
  logoDataUrl: text("logo_data_url"),
  currency: text("currency").notNull().default("₹"),
  salesMode: text("sales_mode").notNull().default("quick"), // 'quick' | 'bill'
  wastageThresholdPercent: real("wastage_threshold_percent").notNull().default(10),
  targetMarginPercent: real("target_margin_percent").notNull().default(40),
  operatingDaysPerMonth: integer("operating_days_per_month").notNull().default(26),
  allocatedBudget: integer("allocated_budget").notNull().default(2000000), // paise (₹20,000)
});

// 2.1 RawMaterial
export const rawMaterials = pgTable("raw_materials", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull().default("Other"),
  unit: text("unit").notNull().default("kg"), // kg | litre | piece | packet
  currentStock: real("current_stock").notNull().default(0),
  lastRate: integer("last_rate").notNull().default(0), // paise per unit
  reorderLevel: real("reorder_level").notNull().default(0),
  isPerishable: boolean("is_perishable").notNull().default(true),
});

// 2.3 Product
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category"),
  sellingPrice: integer("selling_price").notNull().default(0), // paise
  costPrice: integer("cost_price").notNull().default(0), // paise
  batchYield: integer("batch_yield").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
});

// cost/selling price history for a product (§2.3)
export const productPriceHistory = pgTable("product_price_history", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  costPrice: integer("cost_price").notNull(), // paise
  sellingPrice: integer("selling_price").notNull(), // paise
  effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
});

// 2.2 Purchase
export const purchases = pgTable("purchases", {
  id: serial("id").primaryKey(),
  date: date("date", { mode: "string" }).notNull(),
  supplier: text("supplier"),
  paymentMode: text("payment_mode").notNull().default("cash"), // cash | upi | credit
  // [{ rawMaterialId, quantity, rate(paise), amount(paise) }]
  items: jsonb("items").notNull().default([]),
  otherCharges: integer("other_charges").notNull().default(0), // paise
  total: integer("total").notNull().default(0), // paise
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 2.4 ProductionRun
export const productionRuns = pgTable("production_runs", {
  id: serial("id").primaryKey(),
  date: date("date", { mode: "string" }).notNull(),
  productId: integer("product_id").notNull(),
  batches: real("batches").notNull().default(1),
  unitsProduced: integer("units_produced").notNull().default(0),
  costPriceSnapshot: integer("cost_price_snapshot").notNull().default(0), // paise
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 2.5 Sale
export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  date: date("date", { mode: "string" }).notNull(),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull().default(0),
  unitPrice: integer("unit_price").notNull().default(0), // paise
  totalCost: integer("total_cost"), // total daily cost in paise; null for legacy sales
  costPriceSnapshot: integer("cost_price_snapshot").notNull().default(0), // paise
  paymentMode: text("payment_mode").notNull().default("cash"), // cash | upi | credit
  time: text("time"), // 'HH:MM' optional (bill mode)
  createdAt: timestamp("created_at").defaultNow(),
});

// 2.6 DayClose — one row per date
export const dayCloses = pgTable("day_closes", {
  date: date("date", { mode: "string" }).primaryKey(),
  // [{ productId, produced, sold, leftover, wasted }]
  entries: jsonb("entries").notNull().default([]),
  // [{ label, amount(paise) }]
  overheads: jsonb("overheads").notNull().default([]),
  isLocked: boolean("is_locked").notNull().default(false),
  closedAt: timestamp("closed_at"),
});

// 2.7 StockAdjustment
export const stockAdjustments = pgTable("stock_adjustments", {
  id: serial("id").primaryKey(),
  date: date("date", { mode: "string" }).notNull(),
  rawMaterialId: integer("raw_material_id").notNull(),
  quantityDelta: real("quantity_delta").notNull().default(0),
  reason: text("reason").notNull().default("other"), // spoilage | count | used | other
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow(),
});
