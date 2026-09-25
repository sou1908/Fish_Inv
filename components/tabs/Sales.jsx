"use client";
import { useEffect, useState } from "react";
import { Pencil, Trash2, Receipt } from "lucide-react";
import { useStore } from "../store";
import { api } from "@/lib/client";
import { formatMoney } from "@/lib/money";
import { today, prettyDate } from "@/lib/date";
import { saleTotals, summarizeSales, validateSale } from "@/lib/profit";
import { MoneyInput, NumberInput, EmptyState, Spinner, Modal, MoneyKpi } from "../ui";

export default function Sales() {
  const { products, currency, productById } = useStore();
  const [date, setDate] = useState(today());
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-xl font-bold">Daily sales</h1>
      <label><span className="sr-only">Sales date</span><input type="date" className="field w-auto" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} /></label>
    </div>
    <DailySales key={date} date={date} products={products} currency={currency} productById={productById} />
  </div>;
}

function DailySales({ date, products, currency, productById }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let cancelled = false;
    api.get(`/api/sales?date=${date}`).then((data) => {
      if (!cancelled) { setRows(data); setError(""); }
    }).catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [date, version]);
  const totals = summarizeSales(rows);
  const available = products.filter((p) => p.isActive && !rows.some((r) => r.productId === p.id));
  async function remove(row) {
    if (!confirm("Delete this daily sales entry?")) return;
    setBusy(true); setError("");
    try { await api.del(`/api/sales/${row.id}`); setRows((old) => old.filter((s) => s.id !== row.id)); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  if (loading) return <Spinner />;
  return <div className="space-y-4">
    <p className="text-sm text-muted">Enter quantity sold and the total cost for each product on {prettyDate(date)}. Profit = sales revenue − total daily cost.</p>
    {error && <div role="alert" className="card text-danger">{error} <button className="btn-ghost" onClick={() => { setLoading(true); setVersion((v) => v + 1); }}>Retry</button></div>}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <MoneyKpi label="Sales revenue" paise={totals.revenue} currency={currency} />
      <MoneyKpi label="Total daily cost" paise={totals.cost} currency={currency} />
      <MoneyKpi label="Daily profit / loss" paise={totals.profit} currency={currency} tone={totals.profit < 0 ? "bad" : "good"} />
    </div>
    {!error && <button className="btn-primary" disabled={!available.length || busy} onClick={() => setEditing({})}>Add daily sales</button>}
    {!error && !available.length && <p className="text-sm text-muted">{products.some((p) => p.isActive) ? "All active products have an entry for this day. Edit an entry below to correct it." : "Add a product in Products to start."}</p>}
    {!rows.length ? <EmptyState icon={Receipt} title="Nothing recorded for this day" /> :
      rows.map((row) => {
        const values = saleTotals(row);
        const name = productById(row.productId)?.name || "Deleted product";
        return <div className="card space-y-3" key={row.id}>
          <div className="flex items-center justify-between gap-2">
            <div><h2 className="font-semibold">{name}</h2><p className="text-xs text-muted">{row.quantity} items × {formatMoney(row.unitPrice, currency)}</p></div>
            <div className="flex gap-1">
              <button className="btn-ghost" aria-label={`Edit sales for ${name}`} disabled={busy} onClick={() => setEditing(row)}><Pencil size={16} /></button>
              <button className="btn-ghost text-danger" aria-label={`Delete sales for ${name}`} disabled={busy} onClick={() => remove(row)}><Trash2 size={16} /></button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div><p className="text-muted text-xs">Revenue</p>{formatMoney(values.revenue, currency)}</div>
            <div><p className="text-muted text-xs">Total cost</p>{formatMoney(values.cost, currency)}</div>
            <div><p className="text-muted text-xs">Profit / loss</p><span className={values.profit < 0 ? "text-danger font-bold" : "text-ok font-bold"}>{formatMoney(values.profit, currency)}</span></div>
          </div>
        </div>;
      })}
    {editing && <SaleForm initial={editing} available={available} products={products} date={date} currency={currency} onClose={() => setEditing(null)} onSaved={(row) => {
      setRows((old) => [row, ...old.filter((r) => r.id !== row.id)]); setEditing(null);
    }} />}
  </div>;
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
