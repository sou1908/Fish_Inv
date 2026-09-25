import { addDays, dateRange } from "./date.js";
import { saleTotals } from "./profit.js";

function addDailyTotals(byDate, sale) {
  const totals = byDate.get(sale.date) || { revenue: 0, cost: 0, profit: 0 };
  const values = saleTotals(sale);
  totals.revenue += values.revenue;
  totals.cost += values.cost;
  totals.profit += values.profit;
  byDate.set(sale.date, totals);
}

export function recentRevenue(sales, endDate, days = 30) {
  const startDate = addDays(endDate, 1 - days);
  const byDate = new Map();
  for (const sale of sales) {
    if (sale.date >= startDate && sale.date <= endDate) {
      addDailyTotals(byDate, sale);
    }
  }
  return dateRange(startDate, endDate).map((date) => ({
    date, ...(byDate.get(date) || { revenue: 0, cost: 0, profit: 0 }),
  }));
}

export function allTimeRevenue(sales) {
  const byDate = new Map();
  for (const sale of sales) {
    addDailyTotals(byDate, sale);
  }
  return [...byDate].sort(([a], [b]) => a.localeCompare(b))
    .map(([date, totals]) => ({ date, ...totals }));
}

export function itemsSoldByProduct(sales) {
  const byProduct = new Map();
  for (const sale of sales) {
    if (sale.quantity > 0) {
      byProduct.set(sale.productId, (byProduct.get(sale.productId) || 0) + sale.quantity);
    }
  }
  return [...byProduct].map(([productId, units]) => ({ productId, units }))
    .sort((a, b) => b.units - a.units || a.productId - b.productId);
}
