"use client";

import { useEffect, useState } from "react";
import { Receipt, Trash2, Check } from "lucide-react";
import { useStore } from "../store";
import { api } from "@/lib/client";
import { formatMoney } from "@/lib/money";
import { today, prettyDate } from "@/lib/date";
import { NumberInput, EmptyState, Spinner, Badge } from "../ui";

export default function Sales() {
  const { products, currency, productById } = useStore();
  const [date, setDate] = useState(today());
  const [qty, setQty] = useState({}); // productId -> qty being entered
  const [existing, setExisting] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const activeProducts = products.filter((p) => p.isActive);

  async function load() {
    setLoading(true);
    setExisting(await api.get(`/api/sales?date=${date}`));
    setLoading(false);
  }
  useEffect(() => {
    load();
    setQty({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const pending = activeProducts
    .map((p) => ({ p, q: qty[p.id] || 0 }))
    .filter((x) => x.q > 0);
  const pendingRevenue = pending.reduce((s, x) => s + x.q * x.p.sellingPrice, 0);
  const savedRevenue = existing.reduce((s, x) => s + x.quantity * x.unitPrice, 0);

  async function saveAll() {
    if (pending.length === 0) return;
    setSaving(true);
    setMsg("");
    try {
      for (const { p, q } of pending) {
        await api.post("/api/sales", { date, productId: p.id, quantity: q });
      }
      setQty({});
      await load();
      setMsg(`Saved ${pending.length} product(s)`);
    } catch (e) {
      setMsg(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function del(id) {
    await api.del(`/api/sales/${id}`);
    await load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-bold">Sales</h1>
        <input
          type="date"
          className="field w-auto py-2"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {activeProducts.length === 0 ? (
        <EmptyState icon={Receipt} title="No active products" hint="Add products first." />
      ) : (
        <>
          <div className="card divide-y divide-border p-0 overflow-hidden">
            {activeProducts.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{p.name}</div>
                  <div className="text-xs text-muted">{formatMoney(p.sellingPrice, currency)} each</div>
                </div>
                <div className="w-28">
                  <NumberInput
                    value={qty[p.id] || 0}
                    onChange={(v) => setQty((s) => ({ ...s, [p.id]: v }))}
                    placeholder="qty"
                  />
                </div>
                <div className="w-20 text-right font-semibold text-sm">
                  {formatMoney((qty[p.id] || 0) * p.sellingPrice, currency)}
                </div>
              </div>
            ))}
          </div>

          <div className="sticky bottom-24 mt-3">
            <button
              className="btn-primary w-full shadow-lg"
              onClick={saveAll}
              disabled={saving || pending.length === 0}
            >
              <Check size={18} />
              {saving
                ? "Saving…"
                : `Save ${pending.length} · ${formatMoney(pendingRevenue, currency)}`}
            </button>
          </div>
          {msg && <p className="text-sm text-brand mt-2 text-center">{msg}</p>}
        </>
      )}

      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            {prettyDate(date)} — recorded
          </h2>
          {savedRevenue > 0 && <Badge tone="green">{formatMoney(savedRevenue, currency)}</Badge>}
        </div>
        {loading ? (
          <Spinner label="" />
        ) : existing.length === 0 ? (
          <p className="text-sm text-muted">Nothing recorded yet.</p>
        ) : (
          <div className="card divide-y divide-border p-0">
            {existing.map((s) => (
              <div key={s.id} className="flex items-center gap-3 p-3">
                <div className="flex-1">
                  <div className="font-medium">{productById(s.productId)?.name || "—"}</div>
                  <div className="text-xs text-muted">
                    {s.quantity} × {formatMoney(s.unitPrice, currency)}
                    {s.paymentMode === "credit" && " · credit"}
                  </div>
                </div>
                <div className="font-semibold text-sm">
                  {formatMoney(s.quantity * s.unitPrice, currency)}
                </div>
                <button className="p-2 text-muted" onClick={() => del(s.id)}>
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
