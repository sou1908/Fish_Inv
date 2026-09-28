"use client";

import { Fragment, useState } from "react";
import { ChevronRight } from "lucide-react";
import { prettyDate } from "@/lib/date";
import { formatMoney } from "@/lib/money";
import { saleTotals } from "@/lib/profit";

function ProductBreakdown({ date, entries, currency, productById }) {
  return <div className="bg-bg p-3 sm:p-4">
    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Products sold on {prettyDate(date)}</p>
    <div className="overflow-hidden rounded-xl border border-border bg-white">
      {entries.map((sale) => {
        const totals = saleTotals(sale);
        const name = productById(sale.productId)?.name || `Deleted product #${sale.productId}`;
        return <div key={sale.id} className="grid grid-cols-2 gap-x-3 gap-y-2 border-b border-border p-3 last:border-0 sm:grid-cols-5">
          <div className="col-span-2 min-w-0 font-semibold sm:col-span-1"><span className="break-words">{name}</span></div>
          <div><p className="text-xs text-muted">Items</p><span className="num">{totals.units}</span></div>
          <div><p className="text-xs text-muted">Revenue</p><span className="num text-sm">{formatMoney(totals.revenue, currency)}</span></div>
          <div><p className="text-xs text-muted">Cost</p><span className="num text-sm">{formatMoney(totals.cost, currency)}</span></div>
          <div><p className="text-xs text-muted">Profit / loss</p><span className={`num text-sm font-semibold ${totals.profit < 0 ? "text-danger" : "text-ok"}`}>{formatMoney(totals.profit, currency)}</span></div>
        </div>;
      })}
    </div>
  </div>;
}

export default function DailySalesTable({ days, sales = [], currency, productById, onSelectDate }) {
  const [expandedDate, setExpandedDate] = useState(null);
  const expandable = typeof productById === "function";
  const columnCount = onSelectDate ? 6 : 5;
  function toggle(date) {
    if (expandable) setExpandedDate((current) => current === date ? null : date);
  }

  return <>
    <div className="space-y-3 sm:hidden" aria-label="Daily sales totals">
      {days.map((day) => {
        const expanded = expandedDate === day.date;
        const entries = expanded ? sales.filter((sale) => sale.date === day.date) : [];
        return <article key={day.date} className="card overflow-hidden p-0">
          <button type="button" className={`flex min-h-14 w-full items-center justify-between gap-3 p-3 text-left ${expandable ? "active:bg-bg" : "cursor-default"}`} aria-expanded={expandable ? expanded : undefined} onClick={() => toggle(day.date)}>
            <span className="flex min-w-0 items-center gap-2 font-semibold">
              {expandable && <ChevronRight size={18} className={`shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`} />}
              <span className="truncate">{prettyDate(day.date)}</span>
            </span>
            <span className={`num shrink-0 text-sm font-bold ${day.profit < 0 ? "text-danger" : "text-ok"}`}>{formatMoney(day.profit, currency)}</span>
          </button>
          <dl className="grid grid-cols-3 border-t border-border bg-bg/60 px-3 py-2.5 text-sm">
            <div className="min-w-0"><dt className="text-[11px] text-muted">Items</dt><dd className="num font-medium">{day.units.toLocaleString("en-IN")}</dd></div>
            <div className="min-w-0 text-center"><dt className="text-[11px] text-muted">Revenue</dt><dd className="num truncate font-medium">{formatMoney(day.revenue, currency)}</dd></div>
            <div className="min-w-0 text-right"><dt className="text-[11px] text-muted">Cost</dt><dd className="num truncate font-medium">{formatMoney(day.cost, currency)}</dd></div>
          </dl>
          {onSelectDate && <div className="border-t border-border p-2"><button type="button" className="btn-ghost w-full py-2 text-sm" onClick={() => onSelectDate(day.date)}>View or edit this day</button></div>}
          {expanded && <ProductBreakdown date={day.date} entries={entries} currency={currency} productById={productById} />}
        </article>;
      })}
    </div>

    <div className="card hidden overflow-x-auto p-0 sm:block">
      <table className="w-full min-w-[620px] text-sm" aria-label="Daily sales totals">
        <thead><tr className="border-b border-border text-left text-muted">
          <th className="p-3">Date</th><th className="p-3 text-right">Items sold</th><th className="p-3 text-right">Revenue</th><th className="p-3 text-right">Cost</th><th className="p-3 text-right">Profit / loss</th>
          {onSelectDate && <th className="p-3 text-right"><span className="sr-only">Action</span></th>}
        </tr></thead>
        <tbody>{days.map((day) => {
          const expanded = expandedDate === day.date;
          const entries = expanded ? sales.filter((sale) => sale.date === day.date) : [];
          return <Fragment key={day.date}>
            <tr className="border-b border-border">
              <td className="whitespace-nowrap p-3 font-medium">{expandable ? <button type="button" className="inline-flex items-center gap-1.5 hover:text-brand-strong" aria-expanded={expanded} onClick={() => toggle(day.date)}><ChevronRight size={16} className={`transition-transform ${expanded ? "rotate-90" : ""}`} />{prettyDate(day.date)}</button> : prettyDate(day.date)}</td>
              <td className="num p-3 text-right">{day.units.toLocaleString("en-IN")}</td><td className="num p-3 text-right">{formatMoney(day.revenue, currency)}</td><td className="num p-3 text-right">{formatMoney(day.cost, currency)}</td><td className={`num p-3 text-right font-semibold ${day.profit < 0 ? "text-danger" : "text-ok"}`}>{formatMoney(day.profit, currency)}</td>
              {onSelectDate && <td className="p-2 text-right"><button type="button" className="btn-ghost whitespace-nowrap py-1.5 text-xs" onClick={() => onSelectDate(day.date)}>View / edit</button></td>}
            </tr>
            {expanded && <tr className="border-b border-border"><td colSpan={columnCount} className="p-0"><ProductBreakdown date={day.date} entries={entries} currency={currency} productById={productById} /></td></tr>}
          </Fragment>;
        })}</tbody>
      </table>
    </div>
  </>;
}
