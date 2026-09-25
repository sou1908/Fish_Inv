"use client";
import { useState } from "react";
import { Info } from "lucide-react";
import { Modal } from "./ui";

const HELP = {
  dashboard: "See today's revenue, costs, and profit or loss, plus overall profit for all time. The revenue chart shows sales before costs; the separate profit/loss chart shows what remains after daily costs. Each chart can show the last 30 days or all time. The pie chart counts items sold by product over all time. Overall budget is the starting amount minus all recorded product costs.",
  products: "Add a product name and its selling price per item. Daily costs belong in Sales. Price changes apply to new entries; saved sales keep their price.",
  sales: "Choose a date, then add each product's quantity sold and full daily cost. Profit equals quantity × selling price minus total daily cost. Include costs even when no items sold. Edit saved entries to correct the day's totals.",
  reports: "Choose 7, 30, or 90 days, or enter your own date range. See revenue, profit and margins, weekday averages, and product profit. Download a PDF or CSV of the selected period.",
  settings: "Set the business name and one overall budget. Download a JSON backup of all app data. Upload a backup to replace current data after reviewing its details.",
};
export default function Guide({ id, className = "" }) {
  const [open, setOpen] = useState(false);
  return <>
    <button className={`p-2 rounded-lg ${className}`} aria-label="Help" onClick={() => setOpen(true)}><Info size={18} /></button>
    <Modal open={open} onClose={() => setOpen(false)} title="How to use this page"><p className="text-sm leading-relaxed">{HELP[id]}</p></Modal>
  </>;
}
