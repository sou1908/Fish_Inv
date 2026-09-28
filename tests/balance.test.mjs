import test from "node:test";
import assert from "node:assert/strict";
import { balanceForDate, buildDailyBalances } from "../lib/balance.js";

const sales = [
  { date: "2026-09-01", productId: 1, quantity: 14, unitPrice: 10000, totalCost: 120000 },
  { date: "2026-09-02", productId: 1, quantity: 8, unitPrice: 10000, totalCost: 50000 },
];

test("daily closing balance becomes the next opening balance", () => {
  const ledger = buildDailyBalances(sales, 300000);
  assert.deepEqual(ledger[0], {
    date: "2026-09-01", units: 14, revenue: 140000, cost: 120000, profit: 20000,
    openingBalance: 300000, balanceAfterCost: 180000, closingBalance: 320000,
  });
  assert.equal(ledger[1].openingBalance, 320000);
  assert.equal(ledger[1].closingBalance, 350000);
});

test("a date without sales still receives the carried opening balance", () => {
  assert.deepEqual(balanceForDate(sales, 300000, "2026-09-03"), {
    date: "2026-09-03", units: 0, revenue: 0, cost: 0, profit: 0,
    openingBalance: 350000, balanceAfterCost: 350000, closingBalance: 350000,
  });
});

test("editing an earlier day recalculates every later opening balance", () => {
  const edited = [{ ...sales[0], totalCost: 100000 }, sales[1]];
  assert.equal(buildDailyBalances(edited, 300000)[1].openingBalance, 340000);
});
