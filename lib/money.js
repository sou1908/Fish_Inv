// All money moves as integer paise internally. Convert only at the UI boundary.

/** rupees (number/string like "12.5") -> paise integer */
export function toPaise(rupees) {
  const n = typeof rupees === "string" ? parseFloat(rupees) : rupees;
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

/** paise integer -> rupees number */
export function toRupees(paise) {
  return (paise || 0) / 100;
}

/** paise integer -> "1,234.50" (no symbol) */
export function formatAmount(paise) {
  return toRupees(paise).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** paise integer -> "₹1,234.50" */
export function formatMoney(paise, currency = "₹") {
  return `${currency}${formatAmount(paise)}`;
}

/** profit per unit and margin % from paise prices */
export function margin(sellingPrice, costPrice) {
  const profit = (sellingPrice || 0) - (costPrice || 0);
  const pct = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;
  return { profitPerUnit: profit, marginPercent: pct };
}

/** selling price (paise) needed to hit a target margin % from a cost (paise) */
export function priceForMargin(costPrice, targetMarginPercent) {
  const m = targetMarginPercent / 100;
  if (m >= 1) return costPrice; // impossible margin, guard
  return Math.round(costPrice / (1 - m));
}
