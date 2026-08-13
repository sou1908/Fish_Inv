"use client";

import { useEffect, useMemo, useState } from "react";
import { FileDown, Sheet, BarChart3 } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, Cell as RCell,
} from "recharts";
import { useStore } from "../store";
import { api } from "@/lib/client";
import { formatMoney, formatAmount } from "@/lib/money";
import { today, addDays, dayOfWeek, WEEKDAYS } from "@/lib/date";
import { toCsv, download } from "@/lib/csv";
import { buildReport } from "@/lib/pdf";
import { Spinner, MoneyKpi, KpiCard } from "../ui";

const PRESETS = [
  { key: "week", label: "7 days", days: 6 },
  { key: "month", label: "30 days", days: 29 },
  { key: "quarter", label: "90 days", days: 89 },
];

export default function Reports() {
  const { settings, rawMaterials, currency, productById, products } = useStore();
  const [from, setFrom] = useState(addDays(today(), -29));
  const [to, setTo] = useState(today());
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [closes, setCloses] = useState([]);

  async function load() {
    setLoading(true);
    const [s, p, c] = await Promise.all([
      api.get(`/api/sales?from=${from}&to=${to}`),
      api.get(`/api/purchases?from=${from}&to=${to}`),
      api.get(`/api/day-close?from=${from}&to=${to}`),
    ]);
    setSales(s);
    setPurchases(p);
    setCloses(c);
    setLoading(false);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  const analytics = useMemo(() => {
    const revenue = sales.reduce((s, x) => s + x.quantity * x.unitPrice, 0);
    const cogs = sales.reduce((s, x) => s + x.quantity * x.costPriceSnapshot, 0);
    const grossProfit = revenue - cogs;
    const overheads = closes.reduce(
      (s, c) => s + (c.overheads || []).reduce((a, o) => a + (o.amount || 0), 0), 0
    );
    const netProfit = grossProfit - overheads;
    const units = sales.reduce((s, x) => s + x.quantity, 0);
    const summary = {
      revenue, cogs, grossProfit, overheads, netProfit, units,
      grossMargin: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
      netMargin: revenue > 0 ? (netProfit / revenue) * 100 : 0,
    };

    // by product
    const pmap = {};
    sales.forEach((s) => {
      const m = (pmap[s.productId] ||= { units: 0, revenue: 0, cost: 0 });
      m.units += s.quantity;
      m.revenue += s.quantity * s.unitPrice;
      m.cost += s.quantity * s.costPriceSnapshot;
    });
    const byProduct = Object.entries(pmap)
      .map(([pid, m]) => ({
        name: productById(Number(pid))?.name || "—",
        units: m.units, revenue: m.revenue, cost: m.cost,
        profit: m.revenue - m.cost,
        margin: m.revenue > 0 ? ((m.revenue - m.cost) / m.revenue) * 100 : 0,
      }))
      .sort((a, b) => b.profit - a.profit);

    // daily
    const dmap = {};
    sales.forEach((s) => {
      const d = (dmap[s.date] ||= { revenue: 0, profit: 0 });
      d.revenue += s.quantity * s.unitPrice;
      d.profit += s.quantity * (s.unitPrice - s.costPriceSnapshot);
    });
    const daily = Object.entries(dmap)
      .map(([date, d]) => ({ date, ...d }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // day of week averages
    const dowAgg = WEEKDAYS.map(() => ({ rev: 0, profit: 0, n: 0 }));
    daily.forEach((d) => {
      const w = dayOfWeek(d.date);
      dowAgg[w].rev += d.revenue;
      dowAgg[w].profit += d.profit;
      dowAgg[w].n += 1;
    });
    const dow = dowAgg.map((a, i) => ({
      day: WEEKDAYS[i],
      avgRevenue: a.n ? Math.round(a.rev / a.n) : 0,
      avgProfit: a.n ? Math.round(a.profit / a.n) : 0,
    }));

    // day-of-week callout
    const active = dow.filter((d) => d.avgRevenue > 0).sort((a, b) => b.avgRevenue - a.avgRevenue);
    let callout = "";
    if (active.length >= 2) {
      const best = active[0], worst = active[active.length - 1];
      if (worst.avgRevenue > 0) {
        const x = (best.avgRevenue / worst.avgRevenue).toFixed(1);
        callout = `${dayName(best.day)} averages ${x}× ${dayName(worst.day)}`;
      }
    }

    // purchases by material
    const mmap = {};
    purchases.forEach((p) =>
      (p.items || []).forEach((it) => {
        const m = (mmap[it.rawMaterialId] ||= { qty: 0, spend: 0 });
        m.qty += it.quantity || 0;
        m.spend += it.amount || 0;
      })
    );
    const purchaseRows = Object.entries(mmap).map(([id, m]) => ({
      name: rawMaterials.find((r) => r.id === Number(id))?.name || "—",
      qty: Math.round(m.qty * 100) / 100,
      spend: m.spend,
      avgRate: m.qty > 0 ? Math.round(m.spend / m.qty) : 0,
    }));

    // wastage from closes
    const wmap = {};
    closes.forEach((c) =>
      (c.entries || []).forEach((e) => {
        const w = (wmap[e.productId] ||= { leftover: 0, wasted: 0 });
        w.leftover += e.leftover || 0;
        w.wasted += e.wasted || 0;
      })
    );
    const wastage = Object.entries(wmap)
      .map(([pid, w]) => ({
        name: productById(Number(pid))?.name || "—",
        leftover: w.leftover,
        wasted: w.wasted,
        value: w.wasted * (productById(Number(pid))?.costPrice || 0),
      }))
      .filter((w) => w.wasted > 0 || w.leftover > 0);

    const closingStock = rawMaterials.map((r) => ({
      name: r.name, stock: r.currentStock, unit: r.unit,
    }));

    return { summary, byProduct, daily, dow, callout, purchaseRows, wastage, closingStock };
  }, [sales, purchases, closes, rawMaterials, productById]);

  function setPreset(days) {
    setFrom(addDays(today(), -days));
    setTo(today());
  }

  function exportPdf() {
    buildReport({
      settings,
      from,
      to,
      summary: analytics.summary,
      byProduct: analytics.byProduct,
      daily: analytics.daily,
      dow: analytics.dow.filter((d) => d.avgRevenue > 0),
      purchases: analytics.purchaseRows,
      wastage: analytics.wastage,
      closingStock: analytics.closingStock,
    });
  }

  function exportCsv() {
    const csv = toCsv(
      ["Product", "Units", "Revenue", "Cost", "Profit", "Margin %"],
      analytics.byProduct.map((r) => [
        r.name, r.units, formatAmount(r.revenue), formatAmount(r.cost),
        formatAmount(r.profit), r.margin.toFixed(1),
      ])
    );
    download(`fish-sales-${from}_to_${to}.csv`, csv);
  }

  const s = analytics.summary;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Reports</h1>

      <div className="flex gap-2">
        {PRESETS.map((p) => (
          <button key={p.key} className="btn-ghost py-1.5 px-3 text-sm flex-1" onClick={() => setPreset(p.days)}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">From</label>
          <input type="date" className="field" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="field" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <MoneyKpi label="Revenue" paise={s.revenue} currency={currency} />
            <MoneyKpi label="Net profit" paise={s.netProfit} currency={currency} tone={s.netProfit >= 0 ? "good" : "bad"} />
            <KpiCard label="Gross margin" value={`${s.grossMargin.toFixed(1)}%`} />
            <KpiCard label="Net margin" value={`${s.netMargin.toFixed(1)}%`} tone={s.netMargin >= 0 ? "good" : "bad"} />
          </div>

          {/* day of week */}
          {analytics.callout && (
            <div className="card">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted mb-2">
                <BarChart3 size={16} /> Day of week
              </div>
              <p className="text-sm mb-3">{analytics.callout}</p>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.dow} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [`${currency}${Number(v).toFixed(0)}`, "Avg revenue"]} />
                    <Bar dataKey="avgRevenue" radius={[6, 6, 0, 0]}>
                      {analytics.dow.map((_, i) => <RCell key={i} fill="#E8A33D" />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* product table */}
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-2">Product profit</h2>
            {analytics.byProduct.length === 0 ? (
              <p className="text-sm text-muted">No sales in range.</p>
            ) : (
              <div className="card p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted border-b border-border">
                      <th className="p-3">Product</th>
                      <th className="p-3 text-right">Units</th>
                      <th className="p-3 text-right">Profit</th>
                      <th className="p-3 text-right">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.byProduct.map((r) => (
                      <tr key={r.name} className="border-b border-border last:border-0">
                        <td className="p-3 font-medium">{r.name}</td>
                        <td className="p-3 text-right num">{r.units}</td>
                        <td className="p-3 text-right num font-semibold">{formatMoney(r.profit, currency)}</td>
                        <td className="p-3 text-right num">{r.margin.toFixed(0)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* wastage */}
          {analytics.wastage.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-2">Wastage</h2>
              <div className="card p-0 divide-y divide-border">
                {analytics.wastage.map((w) => (
                  <div key={w.name} className="flex items-center justify-between p-3 text-sm">
                    <span className="font-medium">{w.name}</span>
                    <span className="text-muted">{w.wasted} wasted</span>
                    <span className="text-danger font-semibold">{formatMoney(w.value, currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button className="btn-primary flex-1" onClick={exportPdf}>
              <FileDown size={18} /> PDF
            </button>
            <button className="btn-ghost flex-1" onClick={exportCsv}>
              <Sheet size={18} /> CSV
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function dayName(abbr) {
  const map = { Sun: "Sunday", Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday" };
  return map[abbr] || abbr;
}
