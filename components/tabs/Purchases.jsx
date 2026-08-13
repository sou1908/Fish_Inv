"use client";

import { useEffect, useState } from "react";
import { ShoppingCart, Trash2, Plus } from "lucide-react";
import { useStore } from "../store";
import { api } from "@/lib/client";
import { formatMoney, toPaise, toRupees } from "@/lib/money";
import { today, prettyDate, monthKey } from "@/lib/date";
import { MoneyInput, NumberInput, EmptyState, Spinner, Badge } from "../ui";

export default function Purchases() {
  const { rawMaterials, reloadRaw, currency } = useStore();
  const [date, setDate] = useState(today());
  const [supplier, setSupplier] = useState("");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [rows, setRows] = useState([{ rawMaterialId: "", quantity: 0, rate: 0 }]);
  const [otherCharges, setOtherCharges] = useState(0);
  const [note, setNote] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function loadHistory() {
    setLoading(true);
    setHistory(await api.get(`/api/purchases?month=${monthKey(date)}`));
    setLoading(false);
  }
  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const setRow = (i, k, v) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const addRow = () => setRows((rs) => [...rs, { rawMaterialId: "", quantity: 0, rate: 0 }]);
  const rmRow = (i) => setRows((rs) => rs.filter((_, idx) => idx !== i));

  const itemsTotal = rows.reduce((s, r) => s + Math.round((r.quantity || 0) * (r.rate || 0)), 0);
  const total = itemsTotal + otherCharges;

  async function save() {
    const items = rows
      .filter((r) => r.rawMaterialId && r.quantity > 0)
      .map((r) => ({
        rawMaterialId: Number(r.rawMaterialId),
        quantity: r.quantity,
        rate: r.rate,
        amount: Math.round(r.quantity * r.rate),
      }));
    if (items.length === 0) return setErr("Add at least one item");
    setBusy(true);
    setErr("");
    try {
      await api.post("/api/purchases", { date, supplier: supplier || null, paymentMode, items, otherCharges, note: note || null });
      setRows([{ rawMaterialId: "", quantity: 0, rate: 0 }]);
      setSupplier("");
      setOtherCharges(0);
      setNote("");
      await Promise.all([loadHistory(), reloadRaw()]);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  const rmById = (id) => rawMaterials.find((r) => r.id === id);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-bold">Purchases</h1>
        <input type="date" className="field w-auto py-2" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      {rawMaterials.length === 0 ? (
        <EmptyState icon={ShoppingCart} title="No raw materials" hint="Add materials in Raw Stock first." />
      ) : (
        <div className="card space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Supplier (optional)</label>
              <input className="field" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
            </div>
            <div>
              <label className="label">Payment</label>
              <select className="field" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="credit">Credit</option>
              </select>
            </div>
          </div>

          <label className="label">Items</label>
          {rows.map((r, i) => (
            <div
              key={i}
              className="rounded-xl border border-border p-2.5 sm:border-0 sm:p-0 sm:grid sm:grid-cols-12 sm:gap-2 sm:items-center"
            >
              <select
                className="field w-full mb-2 sm:mb-0 sm:col-span-5 px-2"
                value={r.rawMaterialId}
                onChange={(e) => setRow(i, "rawMaterialId", e.target.value)}
              >
                <option value="">Select material</option>
                {rawMaterials.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <div className="flex gap-2 sm:contents">
                <input
                  className="field flex-1 sm:col-span-3 px-2"
                  type="number" inputMode="decimal" placeholder="qty" step="0.01" min="0"
                  value={r.quantity || ""}
                  onChange={(e) => setRow(i, "quantity", Number(e.target.value) || 0)}
                />
                <input
                  className="field flex-1 sm:col-span-3 px-2"
                  type="number" inputMode="decimal" placeholder="₹/unit" step="0.01" min="0"
                  value={r.rate ? toRupees(r.rate) : ""}
                  onChange={(e) => setRow(i, "rate", e.target.value === "" ? 0 : toPaise(e.target.value))}
                />
                <button
                  className="text-muted flex items-center justify-center px-2 sm:col-span-1 shrink-0"
                  onClick={() => rmRow(i)}
                  aria-label="Remove item"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          <button className="btn-ghost py-2 text-sm" onClick={addRow}>
            <Plus size={16} /> Add item
          </button>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Other charges</label>
              <MoneyInput value={otherCharges} onChange={setOtherCharges} />
            </div>
            <div>
              <label className="label">Note</label>
              <input className="field" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-bg p-3">
            <span className="text-muted text-sm">Total</span>
            <span className="text-lg font-bold">{formatMoney(total, currency)}</span>
          </div>
          {err && <p className="text-sm text-danger">{err}</p>}
          <button className="btn-primary w-full" onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save purchase"}
          </button>
        </div>
      )}

      <div className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-2">
          {monthKey(date)} — history
        </h2>
        {loading ? (
          <Spinner label="" />
        ) : history.length === 0 ? (
          <p className="text-sm text-muted">No purchases this month.</p>
        ) : (
          <div className="space-y-2">
            {history.map((p) => (
              <div key={p.id} className="card py-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{prettyDate(p.date)}</div>
                  <div className="font-bold">{formatMoney(p.total, currency)}</div>
                </div>
                <div className="text-xs text-muted mt-1 flex items-center gap-2 flex-wrap">
                  {p.supplier && <span>{p.supplier}</span>}
                  <Badge tone={p.paymentMode === "credit" ? "amber" : "gray"}>{p.paymentMode}</Badge>
                  <span>
                    {p.items.map((it) => rmById(it.rawMaterialId)?.name || "?").join(", ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
