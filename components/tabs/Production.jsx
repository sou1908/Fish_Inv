"use client";

import { useEffect, useState } from "react";
import { ChefHat, Trash2, Plus } from "lucide-react";
import { useStore } from "../store";
import { api } from "@/lib/client";
import { today, prettyDate } from "@/lib/date";
import { NumberInput, EmptyState, Spinner } from "../ui";

export default function Production() {
  const { products, productById } = useStore();
  const [date, setDate] = useState(today());
  const [productId, setProductId] = useState("");
  const [batches, setBatches] = useState(1);
  const [units, setUnits] = useState(0);
  const [note, setNote] = useState("");
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const activeProducts = products.filter((p) => p.isActive);
  const selected = productById(Number(productId));

  // default units = batches * yield, editable
  useEffect(() => {
    if (selected) setUnits(Math.round(batches * selected.batchYield));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, batches]);

  async function load() {
    setLoading(true);
    setRuns(await api.get(`/api/production?date=${date}`));
    setLoading(false);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  async function save() {
    if (!productId) return setErr("Pick a product");
    setBusy(true);
    setErr("");
    try {
      await api.post("/api/production", {
        date,
        productId: Number(productId),
        batches,
        unitsProduced: units,
        note: note || null,
      });
      setProductId("");
      setBatches(1);
      setUnits(0);
      setNote("");
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function del(id) {
    await api.del(`/api/production/${id}`);
    await load();
  }

  const totalUnits = runs.reduce((s, r) => s + r.unitsProduced, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-bold">Production</h1>
        <input type="date" className="field w-auto py-2" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      {activeProducts.length === 0 ? (
        <EmptyState icon={ChefHat} title="No active products" hint="Add products first." />
      ) : (
        <div className="card space-y-3">
          <div>
            <label className="label">Product</label>
            <select className="field" value={productId} onChange={(e) => setProductId(e.target.value)}>
              <option value="">— pick —</option>
              {activeProducts.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Batches</label>
              <NumberInput value={batches} onChange={setBatches} step="0.5" />
            </div>
            <div>
              <label className="label">
                Units made {selected && <span className="text-muted">(≈{Math.round(batches * selected.batchYield)})</span>}
              </label>
              <NumberInput value={units} onChange={setUnits} />
            </div>
          </div>
          <div>
            <label className="label">Note (optional)</label>
            <input className="field" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          {err && <p className="text-sm text-danger">{err}</p>}
          <button className="btn-primary w-full" onClick={save} disabled={busy}>
            <Plus size={18} /> {busy ? "Saving…" : "Log production"}
          </button>
        </div>
      )}

      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            {prettyDate(date)} — sheet
          </h2>
          {totalUnits > 0 && <span className="text-sm text-muted">{totalUnits} units</span>}
        </div>
        {loading ? (
          <Spinner label="" />
        ) : runs.length === 0 ? (
          <p className="text-sm text-muted">No production logged.</p>
        ) : (
          <div className="card divide-y divide-border p-0">
            {runs.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-3">
                <div className="flex-1">
                  <div className="font-medium">{productById(r.productId)?.name || "—"}</div>
                  <div className="text-xs text-muted">
                    {r.batches} batch(es){r.note ? ` · ${r.note}` : ""}
                  </div>
                </div>
                <div className="font-semibold">{r.unitsProduced} u</div>
                <button className="p-2 text-muted" onClick={() => del(r.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
