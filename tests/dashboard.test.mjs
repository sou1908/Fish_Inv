import test from "node:test";
import assert from "node:assert/strict";
import { allTimeRevenue, itemsSoldByProduct, recentRevenue } from "../lib/dashboard.js";
import { summarizeSales } from "../lib/profit.js";

const sales = [
  { date: "2026-08-01", productId: 3, quantity: 1, unitPrice: 10000, totalCost: 15000 },
  { date: "2026-09-24", productId: 2, quantity: 2, unitPrice: 12500, totalCost: 10000 },
  { date: "2026-09-25", productId: 2, quantity: 1, unitPrice: 12500, totalCost: 5000 },
  { date: "2026-09-25", productId: 3, quantity: 0, unitPrice: 10000, totalCost: 3000 },
];

test("overall profit includes old dates and zero-sales costs", () => {
  assert.equal(summarizeSales(sales).profit, 14500);
});

test("daily chart separates revenue from profit or loss, including costs without sales", () => {
  const recent = recentRevenue(sales, "2026-09-25");
  assert.equal(recent.length, 30);
  assert.deepEqual(recent[0], { date: "2026-08-27", revenue: 0, cost: 0, profit: 0 });
  assert.deepEqual(recent.slice(-2), [
    { date: "2026-09-24", revenue: 25000, cost: 10000, profit: 15000 },
    { date: "2026-09-25", revenue: 12500, cost: 8000, profit: 4500 },
  ]);
  assert.deepEqual(allTimeRevenue(sales)[0], { date: "2026-08-01", revenue: 10000, cost: 15000, profit: -5000 });
  assert.deepEqual(allTimeRevenue([
    { date: "2026-09-23", quantity: 1, unitPrice: 20000, totalCost: 30000 },
  ]), [{ date: "2026-09-23", revenue: 20000, cost: 30000, profit: -10000 }]);
});

test("item share uses units sold, excludes zero-sales rows, and sorts by quantity", () => {
  assert.deepEqual(itemsSoldByProduct(sales), [
    { productId: 2, units: 3 },
    { productId: 3, units: 1 },
  ]);
});
