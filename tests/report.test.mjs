import test from "node:test";
import assert from "node:assert/strict";
import { buildReportData } from "../lib/report.js";
import { toCsv } from "../lib/csv.js";

const sales = [
  { date: "2026-09-16", productId: 1, quantity: 2, unitPrice: 10000, totalCost: 5000 },
  { date: "2026-09-23", productId: 1, quantity: 1, unitPrice: 10000, totalCost: 15000 },
  { date: "2026-09-25", productId: 2, quantity: 3, unitPrice: 20000, totalCost: 20000 },
  { date: "2026-09-25", productId: 1, quantity: 0, unitPrice: 10000, totalCost: 3000 },
];

test("restored report totals match daily cost accounting", () => {
  const report = buildReportData(sales);
  assert.deepEqual(report.totals, { units: 6, revenue: 90000, cost: 43000, profit: 47000 });
  assert.ok(Math.abs(report.margin - (47000 / 90000) * 100) < 1e-8);
  assert.deepEqual(report.byProduct.map((row) => [row.productId, row.units, row.profit]), [
    [2, 3, 40000], [1, 3, 7000],
  ]);
  assert.deepEqual(report.daily[2], { date: "2026-09-25", units: 3, revenue: 60000, cost: 23000, profit: 37000 });
  assert.equal(report.byWeekday[3].avgRevenue, 15000);
  assert.equal(report.byWeekday[5].avgRevenue, 60000);
});

test("cost-only days keep the loss and leave margin undefined", () => {
  const report = buildReportData([{ date: "2026-09-25", productId: 1, quantity: 0, unitPrice: 10000, totalCost: 9000 }]);
  assert.equal(report.totals.profit, -9000);
  assert.equal(report.margin, null);
  assert.equal(report.byProduct[0].margin, null);
});

test("CSV escapes names containing commas and quotes", () => {
  assert.equal(toCsv(["Product", "Profit"], [["Fish, \"large\"", "100.00"]]),
    'Product,Profit\n"Fish, ""large""",100.00');
});
