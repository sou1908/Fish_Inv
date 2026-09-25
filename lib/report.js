import { dayOfWeek, WEEKDAYS } from "./date.js";
import { saleTotals, summarizeSales } from "./profit.js";

export function buildReportData(sales) {
  const totals = summarizeSales(sales);
  const margin = totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : null;
  const products = new Map();
  const days = new Map();

  for (const sale of sales) {
    const values = saleTotals(sale);
    const product = products.get(sale.productId) || {
      productId: sale.productId, units: 0, revenue: 0, cost: 0, profit: 0,
    };
    const day = days.get(sale.date) || {
      date: sale.date, units: 0, revenue: 0, cost: 0, profit: 0,
    };
    for (const key of ["units", "revenue", "cost", "profit"]) {
      product[key] += values[key];
      day[key] += values[key];
    }
    products.set(sale.productId, product);
    days.set(sale.date, day);
  }

  const byProduct = [...products.values()]
    .map((product) => ({
      ...product,
      margin: product.revenue > 0 ? (product.profit / product.revenue) * 100 : null,
    }))
    .sort((a, b) => b.profit - a.profit || a.productId - b.productId);
  const daily = [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
  const byWeekday = WEEKDAYS.map((day) => ({ day, avgRevenue: 0, avgProfit: 0, count: 0 }));
  for (const entry of daily) {
    const day = byWeekday[dayOfWeek(entry.date)];
    day.avgRevenue += entry.revenue;
    day.avgProfit += entry.profit;
    day.count++;
  }
  for (const day of byWeekday) {
    if (day.count) {
      day.avgRevenue = Math.round(day.avgRevenue / day.count);
      day.avgProfit = Math.round(day.avgProfit / day.count);
    }
  }
  return { totals, margin, byProduct, daily, byWeekday };
}
