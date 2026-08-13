"use client";

import { useEffect, useState } from "react";
import { ClipboardCheck, Lock, Unlock, Plus, Trash2, AlertTriangle } from "lucide-react";
import { useStore } from "../store";
import { api } from "@/lib/client";
import { formatMoney } from "@/lib/money";
import { today, prettyDate } from "@/lib/date";
import { NumberInput, MoneyInput, Spinner, MoneyKpi } from "../ui";

export default function DayClose() {
  const { products, currency, settings, productById } = useStore();
  const [date, setDate] = useState(today());
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]); // {productId, produced, sold, leftover, wasted}
  const [overheads, setOverheads] = useState([]);
  const [locked, setLocked] = useState(false);
  const [sales, setSales] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const wasteThreshold = settings?.wastageThresholdPercent ?? 10;

  async function load() {
    setLoading(true);
    const [prod, sale, close] = await Promise.all([
      api.get(`/api/production?date=${date}`),
      api.get(`/api/sales?date=${date}`),
      api.get(`/api/day-close?date=${date}`),
    ]);
    setSales(sale);

    const producedBy = {};
    prod.forEach((r) => (producedBy[r.productId] = (producedBy[r.productId] || 0) + r.unitsProduced));
    const soldBy = {};
    sale.forEach((s) => (soldBy[s.productId] = (soldBy[s.productId] || 0) + s.quantity));

    const ids = new Set([...Object.keys(producedBy), ...Object.keys(soldBy)].map(Number));
    products.filter((p) => p.isActive).forEach((p) => ids.add(p.id));

    const saved = close?.entries || [];
    const built = [...ids].map((pid) => {
      const prev = saved.find((e) => e.productId === pid);
      const produced = producedBy[pid] || 0;
      const sold = soldBy[pid] || 0;
      return {
        productId: pid,
        produced,
        sold,
        leftover: prev ? prev.leftover : Math.max(0, produced - sold),
        wasted: prev ? prev.wasted : 0,
      };
    });
    setEntries(built);
    setOverheads(close?.overheads || []);
    setLocked(!!close?.isLocked);
    setLoading(false);
  }
  useEffect(() => {
    load();
    setMsg("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, products]);

  const setEntry = (pid, k, v) =>
    setEntries((es) => es.map((e) => (e.productId === pid ? { ...e, [k]: v } : e)));

  // P&L from actual sales snapshots
  const revenue = sales.reduce((s, x) => s + x.quantity * x.unitPrice, 0);
  const cogs = sales.reduce((s, x) => s + x.quantity * x.costPriceSnapshot, 0);
  const grossProfit = revenue - cogs;
  const overheadTotal = overheads.reduce((s, o) => s + (o.amount || 0), 0);
  const netProfit = grossProfit - overheadTotal;
  const wastageValue = entries.reduce(
    (s, e) => s + e.wasted * (productById(e.productId)?.costPrice || 0),
    0
  );

  async function persist(lock) {
    setBusy(true);
    setMsg("");
    try {
      await api.put("/api/day-close", { date, entries, overheads, isLocked: lock });
      setLocked(lock);
      setMsg(lock ? "Day closed & locked" : "Saved");
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-bold">Day Close</h1>
        <input type="date" className="field w-auto py-2" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <>
          {locked && (
            <div className="card border-brand/40 bg-teal-50/50 mb-3 flex items-center gap-2 text-brand text-sm">
              <Lock size={16} /> {prettyDate(date)} is closed. Reopen to edit.
            </div>
          )}

          {/* P&L */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <MoneyKpi label="Revenue" paise={revenue} currency={currency} />
            <MoneyKpi label="COGS" paise={cogs} currency={currency} />
            <MoneyKpi label="Gross profit" paise={grossProfit} currency={currency} tone={grossProfit >= 0 ? "good" : "bad"} />
            <MoneyKpi label="Net profit" paise={netProfit} currency={currency} tone={netProfit >= 0 ? "good" : "bad"} />
          </div>

          {/* reconciliation */}
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-2">
            Produced / Sold / Leftover / Wasted
          </h2>
          <div className="card p-0 divide-y divide-border">
            {entries.length === 0 && <div className="p-3 text-sm text-muted">No products.</div>}
            {entries.map((e) => {
              const diff = e.produced - e.sold - e.leftover - e.wasted;
              const wastePct = e.produced > 0 ? (e.wasted / e.produced) * 100 : 0;
              const overWaste = wastePct > wasteThreshold;
              return (
                <div key={e.productId} className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{productById(e.productId)?.name || "—"}</span>
                    {diff !== 0 && (
                      <span className="text-xs text-warn flex items-center gap-1">
                        <AlertTriangle size={13} /> off by {diff}
                      </span>
                    )}
                    {overWaste && (
                      <span className="text-xs text-danger">waste {wastePct.toFixed(0)}%</span>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    <Cell label="Made"><div className="field bg-bg text-center">{e.produced}</div></Cell>
                    <Cell label="Sold"><div className="field bg-bg text-center">{e.sold}</div></Cell>
                    <Cell label="Left">
                      <NumberInput value={e.leftover} onChange={(v) => setEntry(e.productId, "leftover", v)} className="text-center" />
                    </Cell>
                    <Cell label="Waste">
                      <NumberInput value={e.wasted} onChange={(v) => setEntry(e.productId, "wasted", v)} className="text-center" />
                    </Cell>
                  </div>
                </div>
              );
            })}
          </div>

          {/* overheads */}
          <div className="flex items-center justify-between mt-6 mb-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Overheads</h2>
            <span className="text-sm text-muted">{formatMoney(overheadTotal, currency)}</span>
          </div>
          <div className="card space-y-2">
            {overheads.map((o, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  className="field flex-1"
                  placeholder="Gas / packaging / labour"
                  value={o.label}
                  onChange={(e) =>
                    setOverheads((os) => os.map((x, idx) => (idx === i ? { ...x, label: e.target.value } : x)))
                  }
                />
                <div className="w-32">
                  <MoneyInput
                    value={o.amount}
                    onChange={(v) => setOverheads((os) => os.map((x, idx) => (idx === i ? { ...x, amount: v } : x)))}
                  />
                </div>
                <button className="text-muted p-1" onClick={() => setOverheads((os) => os.filter((_, idx) => idx !== i))}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button className="btn-ghost py-2 text-sm" onClick={() => setOverheads((os) => [...os, { label: "", amount: 0 }])}>
              <Plus size={16} /> Add overhead
            </button>
          </div>

          {wastageValue > 0 && (
            <p className="text-sm text-muted mt-3">
              Wastage value today: <b className="text-danger">{formatMoney(wastageValue, currency)}</b>
            </p>
          )}
          {msg && <p className="text-sm text-brand mt-3 text-center">{msg}</p>}

          <div className="flex gap-2 mt-4">
            {locked ? (
              <button className="btn-ghost flex-1" onClick={() => persist(false)} disabled={busy}>
                <Unlock size={18} /> Reopen
              </button>
            ) : (
              <>
                <button className="btn-ghost flex-1" onClick={() => persist(false)} disabled={busy}>
                  Save draft
                </button>
                <button className="btn-primary flex-1" onClick={() => persist(true)} disabled={busy}>
                  <ClipboardCheck size={18} /> Close Day
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Cell({ label, children }) {
  return (
    <div>
      <div className="text-[11px] text-muted text-center mb-1">{label}</div>
      {children}
    </div>
  );
}
