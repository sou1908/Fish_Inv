// Dates are 'YYYY-MM-DD' strings throughout. Never store Date objects.

/** today's local date as 'YYYY-MM-DD' */
export function today() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 'YYYY-MM' partition key from a 'YYYY-MM-DD' string */
export function monthKey(dateStr) {
  return (dateStr || today()).slice(0, 7);
}

/** 0=Sun..6=Sat for a 'YYYY-MM-DD' string, parsed as local */
export function dayOfWeek(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** 'YYYY-MM-DD' -> '13 Aug 2026' */
export function prettyDate(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d} ${months[m - 1]} ${y}`;
}

/** add/subtract days from a 'YYYY-MM-DD' string */
export function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** inclusive list of date strings from start..end */
export function dateRange(start, end) {
  const out = [];
  let cur = start;
  let guard = 0;
  while (cur <= end && guard < 3660) {
    out.push(cur);
    cur = addDays(cur, 1);
    guard++;
  }
  return out;
}
