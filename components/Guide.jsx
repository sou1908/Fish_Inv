"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { Modal } from "./ui";

// Section-by-section help, written for the vendor.
const GUIDES = {
  dashboard: {
    title: "the Dashboard",
    intro: "Your day at a glance — whether you actually made money.",
    steps: [
      "The dark panel is today's verdict: up or down after all costs.",
      "Budget shows what's left of your allocation after purchases — change the amount in Settings.",
      "Total sales is your all-time revenue.",
      "Tap Sale, Make, Buy or Close to jump straight to that task.",
      "Low-stock and top/lowest earners flag what needs your attention.",
    ],
  },
  sales: {
    title: "Sales",
    intro: "Record what you sold. Quickest to do at the end of the day.",
    steps: [
      "Pick the date (it defaults to today).",
      "Type the quantity sold next to each product — the running total updates live.",
      "Tap Save to record them all at once.",
      "Each sale locks in today's selling and cost price, so changing prices later never rewrites past sales.",
      "Recorded sales appear below; delete a row if you slipped up.",
    ],
  },
  production: {
    title: "Production",
    intro: "Log how much of each snack you made.",
    steps: [
      "Pick a product and how many batches you made.",
      "Units auto-fill from the batch yield — edit it to the real count if it differs.",
      "Tap Log production. It saves today's cost price with the run.",
      "Raw stock is not reduced automatically — adjust it in Raw Stock if you want it to reflect usage.",
    ],
  },
  dayclose: {
    title: "Day Close",
    intro: "Reconcile the day, then lock the profit.",
    steps: [
      "Made and Sold fill in automatically from Production and Sales.",
      "Enter Leftover and Wasted per product. They should balance (Made − Sold − Left − Wasted = 0); a mismatch is flagged, not blocked.",
      "Add the day's overheads — gas, labour, transport, packaging.",
      "Check the profit summary, then tap Close Day to lock it. You can reopen it anytime to fix.",
    ],
  },
  purchases: {
    title: "Purchases",
    intro: "Record what you bought. This updates raw stock and your budget.",
    steps: [
      "Pick the date, supplier (optional) and how you paid.",
      "Add each material with quantity and rate — the amount and total calculate for you.",
      "Add other charges like transport if there are any.",
      "Save. Raw stock goes up, the last rate updates, and the amount is subtracted from your Budget on the Dashboard.",
    ],
  },
  rawstock: {
    title: "Raw Stock",
    intro: "Your ingredients and packaging on hand.",
    steps: [
      "Add materials (fish, oil, flour, packaging) with a unit and a reorder level.",
      "Stock rises automatically when you record a Purchase.",
      "Use the adjust icon to log spoilage, usage, or a recount.",
      "Anything at or below its reorder level is flagged here and on the Dashboard.",
    ],
  },
  products: {
    title: "Products",
    intro: "The snacks you sell and the margin on each.",
    steps: [
      "Add a product with its selling price and your estimated cost price per piece.",
      "Profit and margin update live. Products below your target margin get highlighted.",
      "Use the target-margin helper to get a suggested selling price.",
      "Editing a price only affects future records — past sales keep their snapshot.",
      "Cost price is typed by hand; it isn't linked to raw materials.",
    ],
  },
  reports: {
    title: "Reports",
    intro: "See trends over any period and export them.",
    steps: [
      "Choose a date range or tap a quick preset.",
      "Review revenue, margins, best day of the week, product profit and wastage.",
      "Export a PDF or CSV to share or file away.",
    ],
  },
  settings: {
    title: "Settings",
    intro: "Business details and preferences.",
    steps: [
      "Set your business name and currency.",
      "Set the budget you've allocated for buying raw materials.",
      "Adjust the wastage alert and target-margin thresholds.",
      "Download a full backup of your data anytime.",
    ],
  },
};

export default function Guide({ id, className = "" }) {
  const [open, setOpen] = useState(false);
  const g = GUIDES[id];
  if (!g) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="How to use this section"
        aria-label="How to use this section"
        className={`inline-flex items-center justify-center h-8 w-8 rounded-full transition ${className}`}
      >
        <Info size={18} />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={`How to use ${g.title}`}>
        {g.intro && <p className="text-sm text-muted mb-3">{g.intro}</p>}
        <ul className="space-y-2">
          {g.steps.map((s, i) => (
            <li key={i} className="flex gap-2.5 text-sm">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand shrink-0" />
              <span>{s}</span>
            </li>
          ))}
        </ul>
        <button className="btn-primary w-full mt-5" onClick={() => setOpen(false)}>
          Got it
        </button>
      </Modal>
    </>
  );
}
