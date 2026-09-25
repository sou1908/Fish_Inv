"use client";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useStore } from "../store";
import { api } from "@/lib/client";
import { today, prettyDate } from "@/lib/date";
import { summarizeSales } from "@/lib/profit";
import { allTimeRevenue, itemsSoldByProduct, recentRevenue } from "@/lib/dashboard";
import { Spinner, MoneyKpi } from "../ui";
import { formatMoney } from "@/lib/money";

const PIE_COLORS = ["#0e7665", "#e8a33d", "#317ca5", "#db704b", "#7b6bb3", "#70a35c", "#c772a4"];

function SalesTooltip({ active, payload, currency, metric }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return <div className="rounded-lg border border-border bg-white p-3 text-sm shadow-md">
    <p className="font-semibold mb-2">{prettyDate(point.date)}</p>
    <p>Revenue: {formatMoney(point.revenue, currency)}</p>
    {metric === "profit" && <>
      <p>Daily cost: {formatMoney(point.cost, currency)}</p>
      <p className={point.profit < 0 ? "text-danger" : "text-ok"}>{point.profit < 0 ? "Loss" : "Profit"}: {formatMoney(Math.abs(point.profit), currency)}</p>
    </>}
  </div>;
}

function ChartPeriod({ period, onChange, label }) {
  return <div className="flex shrink-0 rounded-lg border border-border p-0.5 text-xs" aria-label={`${label} chart period`}>
    <button className={`px-2.5 py-1 rounded-md ${period === "30d" ? "bg-ink text-white" : "text-muted"}`} onClick={() => onChange("30d")} aria-pressed={period === "30d"}>30 days</button>
    <button className={`px-2.5 py-1 rounded-md ${period === "all" ? "bg-ink text-white" : "text-muted"}`} onClick={() => onChange("all")} aria-pressed={period === "all"}>All time</button>
  </div>;
}

function ProfitDot({ cx, cy, payload }) {
  if (!payload?.profit) return null;
  return <circle cx={cx} cy={cy} r="5" fill={payload.profit < 0 ? "#cb554b" : "#0e7665"} stroke="var(--surface)" strokeWidth="2" />;
}

function signedMoney(value, currency) {
  if (value === 0) return formatMoney(0, currency);
  return `${value > 0 ? "+" : "−"}${formatMoney(Math.abs(value), currency)}`;
}

export default function Dashboard({ goTo }) {
  const { currency, productById, settings } = useStore();
  const [state, setState] = useState({ loading: true, rows: [], error: "" });
  const [revenuePeriod, setRevenuePeriod] = useState("30d");
  const [profitPeriod, setProfitPeriod] = useState("30d");
  const date = today();
  useEffect(() => {
    let cancelled = false;
    api.get("/api/sales").then((rows) => {
      if (!cancelled) setState({ loading: false, rows, error: "" });
    }).catch((e) => { if (!cancelled) setState({ loading: false, rows: [], error: e.message }); });
    return () => { cancelled = true; };
  }, [date]);
  if (state.loading) return <Spinner />;
  if (state.error) return <p role="alert" className="card text-danger">{state.error}</p>;
  const todayRows = state.rows.filter((row) => row.date === date);
  const totals = summarizeSales(todayRows);
  const allTime = summarizeSales(state.rows);
  const allTimeCost = allTime.cost;
  const recentChart = recentRevenue(state.rows, date);
  const allTimeChart = allTimeRevenue(state.rows);
  const revenueChart = revenuePeriod === "all" ? allTimeChart : recentChart;
  const profitChart = profitPeriod === "all" ? allTimeChart : recentChart;
  const profitAnalysis = profitChart.reduce((summary, point) => ({
    total: summary.total + point.profit,
    profitDays: summary.profitDays + (point.profit > 0 ? 1 : 0),
    lossDays: summary.lossDays + (point.profit < 0 ? 1 : 0),
  }), { total: 0, profitDays: 0, lossDays: 0 });
  const itemChart = itemsSoldByProduct(state.rows).map((item) => ({
    ...item,
    name: productById(item.productId)?.name || `Deleted product #${item.productId}`,
  }));
  const totalItems = itemChart.reduce((sum, item) => sum + item.units, 0);
  const budget = settings?.allocatedBudget ?? 0;
  const remaining = budget - allTimeCost;
  const ids = [...new Set(todayRows.map((r) => r.productId))];
  return <div className="space-y-5">
    <section className="rounded-3xl bg-ink text-white p-6 md:p-8">
      <p className="text-sm text-white/70">All recorded sales</p>
      <h1 className="text-2xl font-bold mt-2">Overall profit / loss · all time</h1>
      <p className={`text-4xl font-bold mt-3 ${allTime.profit < 0 ? "text-red-300" : "text-emerald-300"}`}>{formatMoney(allTime.profit, currency)}</p>
      <p className="text-sm text-white/70 mt-3">All sales revenue minus all recorded daily costs.</p>
    </section>
    <div className="grid sm:grid-cols-3 gap-3">
      <MoneyKpi label="Sales revenue" paise={totals.revenue} currency={currency} />
      <MoneyKpi label="Total daily cost" paise={totals.cost} currency={currency} />
      <MoneyKpi label={`Today's profit / loss · ${prettyDate(date)}`} paise={totals.profit} currency={currency} tone={totals.profit < 0 ? "bad" : "good"} />
    </div>
    <section className="card space-y-3">
      <div className="flex items-center justify-between gap-3"><h2 className="font-semibold">Overall budget</h2><button className="text-sm text-brand-strong" onClick={() => goTo("settings")}>Edit budget</button></div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
        <div><p className="text-muted">Starting budget</p><strong>{formatMoney(budget, currency)}</strong></div>
        <div><p className="text-muted">All recorded costs</p><strong>{formatMoney(allTimeCost, currency)}</strong></div>
        <div><p className="text-muted">Remaining</p><strong className={remaining < 0 ? "text-danger" : "text-ok"}>{formatMoney(remaining, currency)}</strong></div>
      </div>
      <p className="text-xs text-muted">All recorded product costs reduce this budget. It does not reset monthly.</p>
    </section>
    <div className="grid lg:grid-cols-2 gap-4">
      <section className="card min-w-0">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">Revenue</h2>
          <ChartPeriod period={revenuePeriod} onChange={setRevenuePeriod} label="Revenue" />
        </div>
        <p className="text-xs text-muted mt-1">Daily sales before costs</p>
        {revenueChart.some((point) => point.revenue > 0) ? (
          <div className="h-64 mt-4" role="img" aria-label={`Bar chart of daily revenue for ${revenuePeriod === "all" ? "all time" : "the last 30 days"}`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueChart} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#e5ebe6" />
                <XAxis dataKey="date" tickFormatter={(value) => value.slice(5)} interval="preserveStartEnd" minTickGap={22} tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(value) => (value / 100).toLocaleString("en-IN", { notation: "compact", maximumFractionDigits: 1 })} tick={{ fontSize: 11 }} width={46} />
                <Tooltip content={<SalesTooltip currency={currency} metric="revenue" />} />
                <Bar dataKey="revenue" fill="#cf861c" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <p className="text-sm text-muted py-16 text-center">Record sales to see the revenue chart.</p>}
      </section>
      <section className="card min-w-0">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">Profit / loss</h2>
          <ChartPeriod period={profitPeriod} onChange={setProfitPeriod} label="Profit and loss" />
        </div>
        <p className="text-xs text-muted mt-1">Daily revenue minus daily cost</p>
        {profitChart.some((point) => point.revenue !== 0 || point.cost !== 0) ? (
          <>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mt-4">
              <p className={`text-2xl font-bold ${profitAnalysis.total < 0 ? "text-danger" : "text-ok"}`}>{signedMoney(profitAnalysis.total, currency)}</p>
              <p className="text-xs text-muted">Selected period · {profitAnalysis.profitDays} profit {profitAnalysis.profitDays === 1 ? "day" : "days"} · {profitAnalysis.lossDays} loss {profitAnalysis.lossDays === 1 ? "day" : "days"}</p>
            </div>
            <div className="h-56 mt-2" role="img" aria-label={`Line chart of daily profit and loss for ${profitPeriod === "all" ? "all time" : "the last 30 days"}`}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={profitChart} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#e5ebe6" />
                  <XAxis dataKey="date" tickFormatter={(value) => value.slice(5)} interval="preserveStartEnd" minTickGap={22} tick={{ fontSize: 11 }} />
                  <YAxis domain={[(min) => Math.min(min, 0), (max) => Math.max(max, 0)]} tickFormatter={(value) => (value / 100).toLocaleString("en-IN", { notation: "compact", maximumFractionDigits: 1 })} tick={{ fontSize: 11 }} width={46} />
                  <ReferenceLine y={0} stroke="#87938d" strokeWidth={1.5} />
                  <Tooltip cursor={{ stroke: "#a8b3ad", strokeDasharray: "4 4" }} content={<SalesTooltip currency={currency} metric="profit" />} />
                  <Line type="linear" dataKey="profit" stroke="#65756e" strokeWidth={2.5} dot={<ProfitDot />} activeDot={<ProfitDot />} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : <p className="text-sm text-muted py-16 text-center">Record daily sales or costs to see profit and loss.</p>}
        <p className="text-xs text-muted mt-2"><span className="text-ok">Green point = profit</span> · <span className="text-danger">Red point = loss</span></p>
      </section>
    </div>
    <div className="grid lg:grid-cols-2 gap-4">
      <section className="card min-w-0">
        <h2 className="font-semibold">Items sold · all time</h2>
        <p className="text-xs text-muted mt-1">Share of {totalItems.toLocaleString("en-IN")} items sold</p>
        {itemChart.length ? <>
          <div className="h-56 mt-2" role="img" aria-label="Pie chart of items sold by product">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={itemChart} dataKey="units" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={84} paddingAngle={2}>
                  {itemChart.map((item, index) => <Cell key={item.productId} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value) => [`${value.toLocaleString("en-IN")} items`, "Sold"]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {itemChart.map((item, index) => <li key={item.productId} className="flex items-center justify-between gap-2 min-w-0">
              <span className="flex items-center gap-2 min-w-0"><span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[index % PIE_COLORS.length] }} /><span className="truncate" title={item.name}>{item.name}</span></span>
              <strong className="shrink-0">{item.units.toLocaleString("en-IN")}</strong>
            </li>)}
          </ul>
        </> : <p className="text-sm text-muted py-16 text-center">Record items sold to see the product share.</p>}
      </section>
    </div>
    <div className="flex flex-wrap gap-3">
      <button className="btn-primary" onClick={() => goTo("sales")}>Enter daily sales</button>
      <button className="btn-ghost" onClick={() => goTo("products")}>Manage products</button>
    </div>
    {ids.length > 0 && <section className="card space-y-3">
      <h2 className="font-semibold">Today by product</h2>
      {ids.map((id) => {
        const values = summarizeSales(todayRows.filter((s) => s.productId === id));
        return <div key={id} className="flex justify-between gap-3 border-t border-border pt-3">
          <span>{productById(id)?.name || "Deleted product"} <span className="text-xs text-muted">({values.units} sold)</span></span>
          <strong className={values.profit < 0 ? "text-danger" : "text-ok"}>{formatMoney(values.profit, currency)}</strong>
        </div>;
      })}
    </section>}
  </div>;
}
