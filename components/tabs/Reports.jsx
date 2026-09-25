"use client";

import { useEffect, useState } from "react";
import { BarChart3, FileDown, Sheet } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { useStore } from "../store";
import { api } from "@/lib/client";
import { today, addDays, prettyDate } from "@/lib/date";
import { formatAmount, formatMoney } from "@/lib/money";
import { buildReportData } from "@/lib/report";
import { download, toCsv } from "@/lib/csv";
import { KpiCard, MoneyKpi, Spinner } from "../ui";

const PRESETS = [
  { label: "7 days", days: 6 },
  { label: "30 days", days: 29 },
  { label: "90 days", days: 89 },
];
const FULL_DAY = {
  Sun: "Sunday", Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday",
  Thu: "Thursday", Fri: "Friday", Sat: "Saturday",
};

export default function Reports() {
  const currentDay = today();
  const [from, setFrom] = useState(addDays(currentDay, -29));
  const [to, setTo] = useState(currentDay);
  const { settings, currency, productById } = useStore();
  function choosePreset(days) {
    setFrom(addDays(currentDay, -days));
    setTo(currentDay);
  }
  return <div className="space-y-5">
    <h1 className="text-xl font-bold">Reports</h1>
    <div className="grid grid-cols-3 gap-2">
      {PRESETS.map((preset) => {
        const selected = from === addDays(currentDay, -preset.days) && to === currentDay;
        return <button key={preset.label} type="button" className={selected ? "btn-primary py-2 text-sm" : "btn-ghost py-2 text-sm"} onClick={() => choosePreset(preset.days)} aria-pressed={selected}>{preset.label}</button>;
      })}
    </div>
    <div className="grid grid-cols-2 gap-3">
      <label><span className="label">From</span><input type="date" className="field" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
      <label><span className="label">To</span><input type="date" className="field" value={to} onChange={(event) => setTo(event.target.value)} /></label>
    </div>
    {!from || !to || from > to
      ? <p role="alert" className="text-sm text-danger">Choose a valid date range.</p>
      : <ReportResults key={from + ":" + to} from={from} to={to} currency={currency} settings={settings} productById={productById} />}
  </div>;
}

function ReportResults({ from, to, currency, settings, productById }) {
  const [state, setState] = useState({ loading: true, rows: [], error: "" });
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  useEffect(() => {
    let cancelled = false;
    api.get("/api/sales?from=" + from + "&to=" + to).then((rows) => {
      if (!cancelled) setState({ loading: false, rows, error: "" });
    }).catch((error) => {
      if (!cancelled) setState({ loading: false, rows: [], error: error.message });
    });
    return () => { cancelled = true; };
  }, [from, to]);

  if (state.loading) return <Spinner />;
  if (state.error) return <p role="alert" className="card text-danger">{state.error}</p>;

  const report = buildReportData(state.rows);
  const totals = report.totals;
  const byProduct = report.byProduct.map((row) => ({
    ...row,
    name: productById(row.productId)?.name || "Deleted product #" + row.productId,
  }));
  const activeDays = report.byWeekday.filter((day) => day.avgRevenue > 0)
    .sort((a, b) => b.avgRevenue - a.avgRevenue);
  const best = activeDays[0];
  const worst = activeDays[activeDays.length - 1];
  const comparison = activeDays.length > 1
    ? FULL_DAY[best.day] + " averages " + (best.avgRevenue / worst.avgRevenue).toFixed(1) + "× " + FULL_DAY[worst.day]
    : "Add sales on more days to compare weekdays.";
  const marginText = report.margin === null ? "—" : report.margin.toFixed(1) + "%";

  async function exportPdf() {
    setExporting(true);
    setExportError("");
    try {
      const { buildReport } = await import("@/lib/pdf");
      buildReport({
        settings, from, to,
        summary: {
          revenue: totals.revenue, cogs: totals.cost, grossProfit: totals.profit,
          overheads: 0, netProfit: totals.profit, units: totals.units,
          grossMargin: report.margin, netMargin: report.margin,
        },
        byProduct,
        daily: report.daily,
        dow: report.byWeekday.filter((day) => day.count > 0),
        purchases: [], wastage: [], closingStock: [],
      });
    } catch (error) {
      setExportError(error.message || "Could not create PDF.");
    } finally {
      setExporting(false);
    }
  }

  function exportCsv() {
    const csv = toCsv(
      ["Product", "Units", "Revenue", "Total cost", "Profit", "Margin %"],
      byProduct.map((row) => [
        row.name, row.units, formatAmount(row.revenue), formatAmount(row.cost),
        formatAmount(row.profit), row.margin === null ? "" : row.margin.toFixed(1),
      ])
    );
    download("fish-report-" + from + "_to_" + to + ".csv", csv);
  }

  return <div className="space-y-5">
    <div className="grid grid-cols-2 gap-3">
      <MoneyKpi label="Revenue" paise={totals.revenue} currency={currency} />
      <MoneyKpi label="Net profit" paise={totals.profit} currency={currency} tone={totals.profit < 0 ? "bad" : "good"} />
      <KpiCard label="Gross margin" value={marginText} tone={report.margin !== null && report.margin < 0 ? "bad" : "default"} />
      <KpiCard label="Net margin" value={marginText} tone={report.margin !== null && report.margin < 0 ? "bad" : "good"} />
    </div>
    <p className="text-xs text-muted">Gross and net use the same recorded daily costs because this app has no separate overhead entry.</p>

    <section className="card">
      <h2 className="flex items-center gap-2 font-semibold"><BarChart3 size={18} /> Day of week</h2>
      <p className="text-sm text-muted mt-2">{state.rows.length ? comparison : "No sales in this period."}</p>
      {state.rows.length > 0 && <div className="h-44 mt-4" role="img" aria-label="Average sales revenue by day of week">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={report.byWeekday} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#e5ebe6" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value) => [formatMoney(value, currency), "Avg revenue"]} />
            <Bar dataKey="avgRevenue" fill="#e8a33d" radius={[6, 6, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </div>}
    </section>

    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-2">Product profit</h2>
      {byProduct.length === 0 ? <p className="text-sm text-muted">No sales in this period.</p> :
        <div className="card p-0 overflow-x-auto">
          <table className="w-full min-w-[380px] text-sm">
            <thead><tr className="text-left text-muted border-b border-border">
              <th className="p-3">Product</th><th className="p-3 text-right">Units</th>
              <th className="p-3 text-right">Profit</th><th className="p-3 text-right">Margin</th>
            </tr></thead>
            <tbody>{byProduct.map((row) => <tr key={row.productId} className="border-b border-border last:border-0">
              <td className="p-3 font-medium">{row.name}</td>
              <td className="p-3 text-right num">{row.units}</td>
              <td className={"p-3 text-right num font-semibold " + (row.profit < 0 ? "text-danger" : "text-ok")}>{formatMoney(row.profit, currency)}</td>
              <td className="p-3 text-right num">{row.margin === null ? "—" : row.margin.toFixed(0) + "%"}</td>
            </tr>)}</tbody>
          </table>
        </div>}
    </section>

    <div className="flex gap-2 pt-1">
      <button className="btn-primary flex-1" disabled={exporting || !state.rows.length} onClick={exportPdf}><FileDown size={18} />{exporting ? "Creating…" : "PDF"}</button>
      <button className="btn-ghost flex-1" disabled={!state.rows.length} onClick={exportCsv}><Sheet size={18} /> CSV</button>
    </div>
    {exportError && <p role="alert" className="text-sm text-danger">{exportError}</p>}
  </div>;
}
