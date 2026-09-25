import test from "node:test";
import assert from "node:assert/strict";
import { BACKUP_TABLES, makeBackup, validateBackup } from "../lib/backup.js";

function exampleBackup() {
  const tables = Object.fromEntries(BACKUP_TABLES.map((name) => [name, []]));
  tables.settings = [{
    id: 1, businessName: "Fish Shop", logoDataUrl: null, currency: "₹", salesMode: "quick",
    wastageThresholdPercent: 10, targetMarginPercent: 40, operatingDaysPerMonth: 26,
    allocatedBudget: 500000,
  }];
  tables.products = [{ id: 7, name: "Fish", category: null, sellingPrice: 10000,
    costPrice: 0, batchYield: 1, isActive: true }];
  tables.sales = [{ id: 12, date: "2026-09-25", productId: 7, quantity: 3,
    unitPrice: 10000, totalCost: 20000, costPriceSnapshot: 0, paymentMode: "cash",
    time: null, createdAt: "2026-09-25T08:00:00.000Z" }];
  return makeBackup(tables, "2026-09-25T09:00:00.000Z");
}

test("JSON backup round trip preserves IDs, cost, budget and timestamps", () => {
  const restored = validateBackup(JSON.parse(JSON.stringify(exampleBackup())));
  assert.equal(restored.settings[0].allocatedBudget, 500000);
  assert.equal(restored.products[0].id, 7);
  assert.equal(restored.sales[0].productId, 7);
  assert.equal(restored.sales[0].totalCost, 20000);
  assert.equal(restored.sales[0].createdAt.toISOString(), "2026-09-25T08:00:00.000Z");
});

test("backup rejects missing sections, malformed rows and repeated IDs before restore", () => {
  const wrong = exampleBackup(); delete wrong.tables.products;
  assert.throws(() => validateBackup(wrong), /missing a required data section/);
  const malformed = exampleBackup(); malformed.tables.sales[0].totalCost = "20000";
  assert.throws(() => validateBackup(malformed), /Invalid sales.totalCost/);
  const repeated = exampleBackup(); repeated.tables.products.push({ ...repeated.tables.products[0] });
  assert.throws(() => validateBackup(repeated), /repeated products ID/);
  const badSettings = exampleBackup(); badSettings.tables.settings = [];
  assert.throws(() => validateBackup(badSettings), /one settings record/);
});
