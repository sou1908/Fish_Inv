"use client";
import { useEffect, useState } from "react";
import { Pencil, Trash2, Receipt } from "lucide-react";
import { useStore } from "../store";
import { api } from "@/lib/client";
import { formatMoney } from "@/lib/money";
import { today, prettyDate } from "@/lib/date";
import { saleTotals, validateSale } from "@/lib/profit";
import { buildReportData } from "@/lib/report";
import { balanceForDate, buildDailyBalances } from "@/lib/balance";
import DailySalesTable from "../DailySalesTable";
import BalanceFlow from "../BalanceFlow";
import { MoneyInput, NumberInput, EmptyState, Spinner, Modal, MoneyKpi, KpiCard } from "../ui";

const HISTORY_PERIODS = ["Day", "Month", "Year", "All time"];

function historyBounds(period, day, month, year, rows, fallback) {
  if (period === "Day") return { start: day, end: day };
  if (period === "Month") {
    const [y, m] = month.split("-").map(Number);
    const last = String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, "0");
    return { start: `${month}-01`, end: `${month}-${last}` };
  }
  if (period === "Year") return { start: `${year}-01-01`, end: `${year}-12-31` };
  const dates = rows.map((row) => row.date).sort();
  return { start: dates[0] || fallback, end: dates[dates.length - 1] || fallback };
}

export default function Sales() {
  const { products, currency, productById, settings } = useStore();
  const initialBalance = settings?.allocatedBudget ?? 0;
  const [date, setDate] = useState(today());
  const [view, setView] = useState("entry");
  const [historyVersion, setHistoryVersion] = useState(0);
  function openDay(selectedDate) {
    setDate(selectedDate);
    setView("entry");
  }
  return <div className="min-w-0 space-y-4">
    <h1 className="text-xl font-bold">Sales</h1>
    <div className="grid grid-cols-2 gap-2">
      <button type="button" className={view === "entry" ? "btn-primary py-2 text-sm" : "btn-ghost py-2 text-sm"} aria-pressed={view === "entry"} onClick={() => setView("entry")}>Record sales</button>
      <button type="button" className={view === "history" ? "btn-primary py-2 text-sm" : "btn-ghost py-2 text-sm"} aria-pressed={view === "history"} onClick={() => setView("history")}>Sales history</button>
    </div>
    <div className={view === "entry" ? "space-y-4" : "hidden"}>
      <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        <h2 className="text-lg font-bold">Record daily sales</h2>
        <label><span className="sr-only">Sales date</span><input type="date" className="field w-full sm:w-auto" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} /></label>
      </div>
      <DailySales key={date} date={date} products={products} currency={currency} productById={productById} initialBalance={initialBalance} onChanged={() => setHistoryVersion((value) => value + 1)} />
    </div>
    <div className={view === "history" ? "" : "hidden"}>
      <SalesHistory currency={currency} productById={productById} initialBalance={initialBalance} refreshVersion={historyVersion} onSelectDate={openDay} />
    </div>
  </div>;
}

function DailySales({ date, products, currency, productById, initialBalance, onChanged }) {
  const [allRows, setAllRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let cancelled = false;
    api.get("/api/sales").then((data) => {
      if (!cancelled) { setAllRows(data); setError(""); }
    }).catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [date, version]);
  const rows = allRows.filter((row) => row.date === date);
  const dailyBalance = balanceForDate(allRows, initialBalance, date);
  const available = products.filter((p) => p.isActive && !rows.some((r) => r.productId === p.id));
  async function remove(row) {
    if (!confirm("Delete this daily sales entry?")) return;
    setBusy(true); setError("");
    try {
      await api.del(`/api/sales/${row.id}`);
      setAllRows((old) => old.filter((s) => s.id !== row.id));
      onChanged();
    }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  if (loading) return <Spinner />;
  return <div className="space-y-4">
    <p className="text-sm text-muted">Enter quantity sold and the total cost for each product on {prettyDate(date)}. Profit = sales revenue − total daily cost.</p>
    {error && <div role="alert" className="card text-danger">{error} <button className="btn-ghost" onClick={() => { setLoading(true); setVersion((v) => v + 1); }}>Retry</button></div>}
    <BalanceFlow balance={dailyBalance} currency={currency} title={`Balance for ${prettyDate(date)}`} />
    {!error && <button className="btn-primary w-full sm:w-auto" disabled={!available.length || busy} onClick={() => setEditing({})}>Add daily sales</button>}
    {!error && !available.length && <p className="text-sm text-muted">{products.some((p) => p.isActive) ? "All active products have an entry for this day. Edit an entry below to correct it." : "Add a product in Products to start."}</p>}
    {!rows.length ? <EmptyState icon={Receipt} title="Nothing recorded for this day" /> :
      rows.map((row) => {
        const values = saleTotals(row);
        const name = productById(row.productId)?.name || "Deleted product";
        return <div className="card space-y-3" key={row.id}>
          <div className="flex min-w-0 items-center justify-between gap-2">
            <div className="min-w-0"><h2 className="break-words font-semibold">{name}</h2><p className="text-xs text-muted">{row.quantity} items × {formatMoney(row.unitPrice, currency)}</p></div>
            <div className="flex gap-1">
              <button className="btn-ghost" aria-label={`Edit sales for ${name}`} disabled={busy} onClick={() => setEditing(row)}><Pencil size={16} /></button>
              <button className="btn-ghost text-danger" aria-label={`Delete sales for ${name}`} disabled={busy} onClick={() => remove(row)}><Trash2 size={16} /></button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div><p className="text-muted text-xs">Revenue</p>{formatMoney(values.revenue, currency)}</div>
            <div><p className="text-muted text-xs">Total cost</p>{formatMoney(values.cost, currency)}</div>
            <div className="col-span-2 sm:col-span-1"><p className="text-muted text-xs">Profit / loss</p><span className={values.profit < 0 ? "text-danger font-bold" : "text-ok font-bold"}>{formatMoney(values.profit, currency)}</span></div>
          </div>
        </div>;
      })}
    {editing && <SaleForm initial={editing} available={available} products={products} date={date} currency={currency} onClose={() => setEditing(null)} onSaved={(row) => {
      setAllRows((old) => [row, ...old.filter((r) => r.id !== row.id)]); setEditing(null); onChanged();
    }} />}
  </div>;
}

function SalesHistory({ currency, productById, initialBalance, refreshVersion, onSelectDate }) {
  const current = today();
  const [period, setPeriod] = useState("Month");
  const [day, setDay] = useState(current);
  const [month, setMonth] = useState(current.slice(0, 7));
  const [year, setYear] = useState(Number(current.slice(0, 4)));
  const [reloadVersion, setReloadVersion] = useState(0);
  const [state, setState] = useState({ loading: true, rows: [], error: "" });
  useEffect(() => {
    let cancelled = false;
    api.get("/api/sales").then((rows) => {
      if (!cancelled) setState({ loading: false, rows, error: "" });
    }).catch((error) => {
      if (!cancelled) setState({ loading: false, rows: [], error: error.message });
    });
    return () => { cancelled = true; };
  }, [refreshVersion, reloadVersion]);

  function retry() {
    setState((previous) => ({ ...previous, loading: true, error: "" }));
    setReloadVersion((value) => value + 1);
  }

  const periodRows = state.rows.filter((row) => {
    if (period === "Day") return row.date === day;
    if (period === "Month") return row.date.startsWith(month + "-");
    if (period === "Year") return row.date.startsWith(year + "-");
    return true;
  });
  const report = buildReportData(periodRows);
  const balanceByDate = new Map(buildDailyBalances(state.rows, initialBalance).map((entry) => [entry.date, entry]));
  const days = report.daily.map((entry) => ({ ...entry, ...balanceByDate.get(entry.date) })).reverse();
  const bounds = historyBounds(period, day, month, year, state.rows, current);
  const openingBalance = balanceForDate(state.rows, initialBalance, bounds.start).openingBalance;
  const closingBalance = balanceForDate(state.rows, initialBalance, bounds.end).closingBalance;
  return <section className="min-w-0 space-y-4">
    <div>
      <h2 className="text-lg font-bold">Sales history</h2>
      <p className="text-sm text-muted mt-1">Review daily totals for one day, month, year, or all recorded sales.</p>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {HISTORY_PERIODS.map((value) => <button key={value} type="button" className={period === value ? "btn-primary py-2 text-sm" : "btn-ghost py-2 text-sm"} aria-pressed={period === value} onClick={() => setPeriod(value)}>{value}</button>)}
    </div>
    {period === "Day" && <label className="block w-full sm:max-w-xs"><span className="label">Day</span><input type="date" className="field" value={day} onChange={(event) => event.target.value && setDay(event.target.value)} /></label>}
    {period === "Month" && <label className="block w-full sm:max-w-xs"><span className="label">Month</span><input type="month" className="field" value={month} onChange={(event) => event.target.value && setMonth(event.target.value)} /></label>}
    {period === "Year" && <label className="block w-full sm:max-w-xs"><span className="label">Year</span><input type="number" className="field" min="2000" max="9999" step="1" value={year} onChange={(event) => Number.isInteger(event.target.valueAsNumber) && setYear(event.target.valueAsNumber)} /></label>}
    {state.loading ? <Spinner label="Loading sales history…" /> : state.error ? <p role="alert" className="card text-danger">{state.error} <button type="button" className="btn-ghost" onClick={retry}>Retry</button></p> : <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <MoneyKpi label="Opening balance" paise={openingBalance} currency={currency} />
        <MoneyKpi label="Total cost" paise={report.totals.cost} currency={currency} />
        <MoneyKpi label="Revenue" paise={report.totals.revenue} currency={currency} />
        <MoneyKpi label="Closing balance" paise={closingBalance} currency={currency} tone={closingBalance < 0 ? "bad" : "good"} />
        <KpiCard label="Items sold" value={report.totals.units.toLocaleString("en-IN")} />
        <MoneyKpi label="Profit / loss" paise={report.totals.profit} currency={currency} tone={report.totals.profit < 0 ? "bad" : "good"} />
      </div>
      {days.length ? <DailySalesTable days={days} sales={state.rows} currency={currency} productById={productById} onSelectDate={onSelectDate} /> : <EmptyState icon={Receipt} title="No sales in this period" />}
    </>}
  </section>;
}

function SaleForm({ initial, available, products, date, currency, onClose, onSaved }) {
  const [productId, setProductId] = useState(initial.productId || available[0]?.id);
  const [quantity, setQuantity] = useState(initial.quantity ?? 0);
  const [totalCost, setTotalCost] = useState(initial.id ? saleTotals(initial).cost : 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const product = products.find((p) => p.id === productId);
  const unitPrice = initial.id ? initial.unitPrice : product?.sellingPrice ?? 0;
  const profit = quantity * unitPrice - totalCost;
  async function save(e) {
    e.preventDefault();
    const problem = validateSale({ quantity, totalCost });
    if (problem) return setError(problem);
    setBusy(true); setError("");
    try {
      const payload = { date, productId, quantity, totalCost };
      const row = initial.id ? await api.put(`/api/sales/${initial.id}`, payload) : await api.post("/api/sales", payload);
      onSaved(row);
    } catch (e) { setError(e.message); setBusy(false); }
  }
  return <Modal open title={initial.id ? "Edit daily sales" : "Add daily sales"} onClose={() => !busy && onClose()}>
    <form className="space-y-4" onSubmit={save}>
      {initial.id ? <p className="font-semibold">{product?.name || "Deleted product"}</p> :
        <label className="block"><span className="label">Product</span><select className="field" value={productId} onChange={(e) => setProductId(Number(e.target.value))}>
          {available.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select></label>}
      <p className="text-sm text-muted">{prettyDate(date)} · {formatMoney(unitPrice, currency)} per item</p>
      <label className="block"><span className="label">Quantity sold</span><NumberInput value={quantity} onChange={setQuantity} /></label>
      <label className="block"><span className="label">Total daily cost for this product</span><MoneyInput value={totalCost} onChange={setTotalCost} /></label>
      <p className="text-xs text-muted">Enter the full cost for this product for the day, including any unsold items. You can enter zero sold when there was still a cost.</p>
      <div className="rounded-xl bg-bg p-3 flex justify-between"><span>Profit / loss</span><strong className={profit < 0 ? "text-danger" : "text-ok"}>{formatMoney(profit, currency)}</strong></div>
      {error && <p className="text-danger text-sm" role="alert">{error}</p>}
      <div className="flex gap-2"><button type="button" className="btn-ghost" disabled={busy} onClick={onClose}>Cancel</button><button className="btn-primary flex-1" disabled={busy}>{busy ? "Saving…" : "Save daily sales"}</button></div>
    </form>
  </Modal>;
}
