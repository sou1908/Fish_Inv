import { saleTotals } from "./profit.js";

function emptyDay(date) {
  return { date, units: 0, revenue: 0, cost: 0, profit: 0 };
}

function addSale(day, sale) {
  const values = saleTotals(sale);
  for (const key of ["units", "revenue", "cost", "profit"]) day[key] += values[key];
}

/** Build chronological daily balances from the initial opening balance. */
export function buildDailyBalances(sales, initialBalance = 0) {
  const days = new Map();
  for (const sale of sales) {
    const day = days.get(sale.date) || emptyDay(sale.date);
    addSale(day, sale);
    days.set(sale.date, day);
  }

  let balance = initialBalance;
  return [...days.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((day) => {
      const openingBalance = balance;
      const balanceAfterCost = openingBalance - day.cost;
      const closingBalance = balanceAfterCost + day.revenue;
      balance = closingBalance;
      return { ...day, openingBalance, balanceAfterCost, closingBalance };
    });
}

/** Return the balance flow for a date, including dates with no entries. */
export function balanceForDate(sales, initialBalance = 0, date) {
  let openingBalance = initialBalance;
  const day = emptyDay(date);
  for (const sale of sales) {
    if (sale.date < date) openingBalance += saleTotals(sale).profit;
    else if (sale.date === date) addSale(day, sale);
  }
  const balanceAfterCost = openingBalance - day.cost;
  return {
    ...day,
    openingBalance,
    balanceAfterCost,
    closingBalance: balanceAfterCost + day.revenue,
  };
}
