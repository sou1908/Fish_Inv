"use client";
import { useState } from "react";
import { Info } from "lucide-react";
import { Modal } from "./ui";

const HELP = {
  dashboard: "See today's opening balance, costs, revenue, closing balance, and profit or loss. Each day starts with the previous closing balance. The charts show revenue and profit or loss, and the pie chart counts items sold by product.",
  products: "Add a product name and its selling price per item. Daily costs belong in Sales. Price changes apply to new entries; saved sales keep their price.",
  sales: "Use Record sales to add each product's quantity sold and full daily cost for a date. The opening balance comes from the previous day's closing balance. Costs are subtracted, revenue is added, and the result carries into the next day. Use Sales history to review and edit earlier dates.",
  reports: "Choose 7, 30, or 90 days, or enter your own date range. See opening and closing balances, revenue, costs, profit, weekday averages, daily sales, and product profit. Tap a date to see its products. Download a PDF or CSV of the selected period.",
  settings: "Set the business name and the initial opening balance. Download a JSON backup of all app data. Upload a backup to replace current data after reviewing its details.",
};
export default function Guide({ id, className = "" }) {
  const [open, setOpen] = useState(false);
  return <>
    <button className={`p-2 rounded-lg ${className}`} aria-label="Help" onClick={() => setOpen(true)}><Info size={18} /></button>
    <Modal open={open} onClose={() => setOpen(false)} title="How to use this page"><p className="text-sm leading-relaxed">{HELP[id]}</p></Modal>
  </>;
}
