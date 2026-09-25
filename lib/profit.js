// Money is integer paise. Legacy sales retain their original per-unit cost.
export function saleTotals(sale) {
  const revenue = sale.quantity * sale.unitPrice;
  const cost = sale.totalCost ?? sale.quantity * (sale.costPriceSnapshot ?? 0);
  return { units: sale.quantity, revenue, cost, profit: revenue - cost };
}

export function summarizeSales(sales) {
  return sales.reduce((sum, sale) => {
    const values = saleTotals(sale);
    for (const key of Object.keys(sum)) sum[key] += values[key];
    return sum;
  }, { units: 0, revenue: 0, cost: 0, profit: 0 });
}

export function validAmount(value) {
  return Number.isInteger(value) && value >= 0 && value <= 2147483647;
}

export function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateSale(values) {
  if (!validAmount(values.quantity)) return "Quantity must be a non-negative whole number";
  if (!validAmount(values.totalCost)) return "Enter a non-negative total daily cost";
  if (values.quantity === 0 && values.totalCost === 0) return "Enter a quantity or a cost";
  return null;
}
