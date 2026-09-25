import test from "node:test";
import assert from "node:assert/strict";
import { saleTotals, summarizeSales, validateSale, validAmount, validDate } from "../lib/profit.js";

test("daily cost is subtracted once, never multiplied by quantity", () => {
  assert.deepEqual(saleTotals({ quantity: 10, unitPrice: 10000, totalCost: 70000 }),
    { units: 10, revenue: 100000, cost: 70000, profit: 30000 });
});

test("zero sales with a cost is a loss; zero cost is explicit", () => {
  assert.equal(saleTotals({ quantity: 0, unitPrice: 10000, totalCost: 70000 }).profit, -70000);
  assert.equal(saleTotals({ quantity: 3, unitPrice: 125, totalCost: 0, costPriceSnapshot: 100 }).profit, 375);
  assert.equal(validateSale({ quantity: 0, totalCost: 70000 }), null);
});

test("old records preserve cost and price snapshots", () => {
  assert.equal(saleTotals({ quantity: 3, unitPrice: 125, totalCost: null, costPriceSnapshot: 80 }).profit, 135);
});

test("day totals combine profitable products and losses precisely", () => {
  assert.deepEqual(summarizeSales([
    { quantity: 3, unitPrice: 125, totalCost: 100 },
    { quantity: 0, unitPrice: 500, totalCost: 300 },
  ]), { units: 3, revenue: 375, cost: 400, profit: -25 });
  assert.equal(summarizeSales([]).profit, 0);
});

test("reject invalid money, fractional counts, missing costs, and empty entries", () => {
  for (const value of [-1, NaN, Infinity, 1.1, null, undefined, "100", 2147483648]) assert.equal(validAmount(value), false);
  for (const entry of [{ quantity: 1.5, totalCost: 100 }, { quantity: -1, totalCost: 100 }, { quantity: 1 }, { quantity: 0, totalCost: 0 }]) assert.ok(validateSale(entry));
  assert.equal(validateSale({ quantity: 2, totalCost: 0 }), null);
});

test("dates validate leap years and calendar boundaries", () => {
  assert.equal(validDate("2024-02-29"), true);
  for (const value of ["2026-02-29", "2026-04-31", "2026-13-01", "", null]) assert.equal(validDate(value), false);
});
