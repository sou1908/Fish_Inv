"use client";

import { Fragment, useState } from "react";
import { ChevronRight } from "lucide-react";
import { prettyDate } from "@/lib/date";
import { formatMoney } from "@/lib/money";
import { saleTotals } from "@/lib/profit";

export default function DailySalesTable({ days, sales = [], currency, productById, onSelectDate }) {
  const [expandedDate, setExpandedDate] = useState(null);
  const expandable = typeof productById === "function";
  const columnCount = onSelectDate ? 6 : 5;
  return <div className="card p-0 overflow-x-auto">
    <table className="w-full min-w-[620px] text-sm" aria-label="Daily sales totals">
      <thead><tr className="text-left text-muted border-b border-border">
        <th className="p-3">Date</th>
        <th className="p-3 text-right">Items sold</th>
        <th className="p-3 text-right">Revenue</th>
        <th className="p-3 text-right">Cost</th>
        <th className="p-3 text-right">Profit / loss</th>
        {onSelectDate && <th className="p-3 text-right"><span className="sr-only">Action</span></th>}
      </tr></thead>
      <tbody>{days.map((day) => {
        const expanded = expandedDate === day.date;
        const entries = expanded ? sales.filter((sale) => sale.date === day.date) : [];
        return <Fragment key={day.date}>
          <tr className="border-b border-border">
            <td className="p-3 font-medium whitespace-nowrap">
              {expandable ? <button type="button" className="inline-flex items-center gap-1.5 hover:text-brand-strong" aria-expanded={expanded} onClick={() => setExpandedDate(expanded ? null : day.date)}>
                <ChevronRight size={16} className={`transition-transform ${expanded ? "rotate-90" : ""}`} />
                {prettyDate(day.date)}
              </button> : prettyDate(day.date)}
            </td>
            <td className="p-3 text-right num">{day.units.toLocaleString("en-IN")}</td>
            <td className="p-3 text-right num">{formatMoney(day.revenue, currency)}</td>
            <td className="p-3 text-right num">{formatMoney(day.cost, currency)}</td>
            <td className={`p-3 text-right num font-semibold ${day.profit < 0 ? "text-danger" : "text-ok"}`}>{formatMoney(day.profit, currency)}</td>
            {onSelectDate && <td className="p-2 text-right"><button type="button" className="btn-ghost py-1.5 text-xs whitespace-nowrap" onClick={() => onSelectDate(day.date)}>View / edit</button></td>}
          </tr>
          {expanded && <tr className="border-b border-border">
            <td colSpan={columnCount} className="bg-bg p-3 sm:p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Products sold on {prettyDate(day.date)}</p>
              <div className="rounded-xl bg-white border border-border overflow-hidden">
                {entries.map((sale) => {
                  const totals = saleTotals(sale);
                  const name = productById(sale.productId)?.name || `Deleted product #${sale.productId}`;
                  return <div key={sale.id} className="grid grid-cols-2 sm:grid-cols-5 gap-x-3 gap-y-2 p-3 border-b border-border last:border-0">
                    <div className="col-span-2 sm:col-span-1 font-semibold">{name}</div>
                    <div><p className="text-xs text-muted">Items</p><span className="num">{totals.units}</span></div>
                    <div><p className="text-xs text-muted">Revenue</p><span className="num">{formatMoney(totals.revenue, currency)}</span></div>
                    <div><p className="text-xs text-muted">Cost</p><span className="num">{formatMoney(totals.cost, currency)}</span></div>
                    <div><p className="text-xs text-muted">Profit / loss</p><span className={`num font-semibold ${totals.profit < 0 ? "text-danger" : "text-ok"}`}>{formatMoney(totals.profit, currency)}</span></div>
                  </div>;
                })}
              </div>
            </td>
          </tr>}
        </Fragment>;
      })}</tbody>
    </table>
  </div>;
}
