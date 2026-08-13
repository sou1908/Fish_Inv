"use client";

import { useState } from "react";
import { Plus, Package, Pencil, Wand2, AlertTriangle, Trash2 } from "lucide-react";
import { useStore } from "../store";
import { api } from "@/lib/client";
import { formatMoney, margin, priceForMargin, toRupees } from "@/lib/money";
import { MoneyInput, NumberInput, Modal, EmptyState, Badge, SectionTitle } from "../ui";

const CATEGORIES = ["Momo", "Cutlet", "Roll", "Pakora", "Fry", "Other"];

export default function Products() {
  const { products, reloadProducts, settings, currency } = useStore();
  const [editing, setEditing] = useState(null); // product or {} for new
  const target = settings?.targetMarginPercent ?? 40;

  const active = products.filter((p) => p.isActive);
  const inactive = products.filter((p) => !p.isActive);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-bold">Products</h1>
        <button className="btn-primary py-2 px-3" onClick={() => setEditing({})}>
          <Plus size={18} /> Add
        </button>
      </div>

      {active.length === 0 && inactive.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products yet"
          hint="Add your fish snacks to start tracking margins."
        />
      ) : (
        <div className="space-y-3">
          {active.map((p) => (
            <ProductCard
              key={p.id}
              p={p}
              currency={currency}
              target={target}
              onEdit={() => setEditing(p)}
            />
          ))}
        </div>
      )}

      {inactive.length > 0 && (
        <>
          <SectionTitle>Inactive</SectionTitle>
          <div className="space-y-3 opacity-60">
            {inactive.map((p) => (
              <ProductCard
                key={p.id}
                p={p}
                currency={currency}
                target={target}
                onEdit={() => setEditing(p)}
              />
            ))}
          </div>
        </>
      )}

      {editing && (
        <ProductForm
          initial={editing}
          currency={currency}
          target={target}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            await reloadProducts();
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function ProductCard({ p, currency, target, onEdit }) {
  const { profitPerUnit, marginPercent } = margin(p.sellingPrice, p.costPrice);
  const below = marginPercent < target;
  return (
    <div className={`card card-hover ${below ? "border-amber-300 bg-amber-50/40" : ""}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold flex items-center gap-2">
            {p.name}
            {p.category && <Badge tone="teal">{p.category}</Badge>}
            {!p.isActive && <Badge tone="gray">inactive</Badge>}
          </div>
          <div className="text-sm text-muted mt-0.5">
            Sell {formatMoney(p.sellingPrice, currency)} · Cost{" "}
            {formatMoney(p.costPrice, currency)}
          </div>
        </div>
        <button className="p-2 text-muted" onClick={onEdit}>
          <Pencil size={18} />
        </button>
      </div>
      <div className="flex items-center gap-4 mt-3">
        <div>
          <div className="text-xs text-muted">Profit / unit</div>
          <div className="font-bold">{formatMoney(profitPerUnit, currency)}</div>
        </div>
        <div>
          <div className="text-xs text-muted">Margin</div>
          <div className={`font-bold ${below ? "text-warn" : "text-ok"}`}>
            {marginPercent.toFixed(1)}%
          </div>
        </div>
        {below && (
          <span className="ml-auto text-xs text-warn flex items-center gap-1">
            <AlertTriangle size={14} /> below {target}%
          </span>
        )}
      </div>
    </div>
  );
}

function ProductForm({ initial, currency, target, onClose, onSaved }) {
  const isNew = !initial.id;
  const [name, setName] = useState(initial.name || "");
  const [category, setCategory] = useState(initial.category || "");
  const [sellingPrice, setSellingPrice] = useState(initial.sellingPrice || 0);
  const [costPrice, setCostPrice] = useState(initial.costPrice || 0);
  const [batchYield, setBatchYield] = useState(initial.batchYield || 1);
  const [isActive, setIsActive] = useState(initial.isActive ?? true);
  const [desiredMargin, setDesiredMargin] = useState(target);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const m = margin(sellingPrice, costPrice);
  const priceChanged =
    !isNew && (sellingPrice !== initial.sellingPrice || costPrice !== initial.costPrice);
  const suggested = priceForMargin(costPrice, desiredMargin);

  async function save() {
    if (!name.trim()) return setErr("Name is required");
    setBusy(true);
    setErr("");
    try {
      const payload = { name, category: category || null, sellingPrice, costPrice, batchYield, isActive };
      if (isNew) await api.post("/api/products", payload);
      else await api.put(`/api/products/${initial.id}`, payload);
      await onSaved();
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete "${initial.name}"? This can't be undone. (Tip: uncheck Active instead to keep it in reports.)`)) return;
    setBusy(true);
    setErr("");
    try {
      await api.del(`/api/products/${initial.id}`);
      await onSaved();
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={isNew ? "New product" : "Edit product"}>
      <div className="space-y-3">
        <div>
          <label className="label">Name</label>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Fish Momo" />
        </div>
        <div>
          <label className="label">Category</label>
          <select className="field" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">— none —</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Selling price / unit</label>
            <MoneyInput value={sellingPrice} onChange={setSellingPrice} />
          </div>
          <div>
            <label className="label">Cost price / unit</label>
            <MoneyInput value={costPrice} onChange={setCostPrice} />
          </div>
        </div>

        {/* live margin */}
        <div className="rounded-xl bg-bg p-3 text-sm flex items-center justify-between">
          <span className="text-muted">Profit / unit</span>
          <span className="font-semibold">{formatMoney(m.profitPerUnit, currency)}</span>
          <span className="text-muted">Margin</span>
          <span className={`font-semibold ${m.marginPercent < target ? "text-warn" : "text-ok"}`}>
            {m.marginPercent.toFixed(1)}%
          </span>
        </div>

        {/* target-margin helper */}
        <div className="rounded-xl border border-dashed border-border p-3">
          <div className="flex items-center gap-2 text-sm font-medium mb-2">
            <Wand2 size={16} className="text-brand" /> Target-margin helper
          </div>
          <div className="flex items-center gap-2">
            <input
              className="field w-20"
              type="number"
              inputMode="decimal"
              value={desiredMargin}
              onChange={(e) => setDesiredMargin(Number(e.target.value) || 0)}
            />
            <span className="text-sm text-muted">% margin →</span>
            <span className="font-semibold">
              sell at {formatMoney(suggested, currency)}
            </span>
            <button
              className="btn-ghost py-1.5 px-2 ml-auto text-sm"
              onClick={() => setSellingPrice(suggested)}
              disabled={!costPrice}
            >
              Use
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Batch yield (units)</label>
            <NumberInput value={batchYield} onChange={setBatchYield} />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm py-3">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              Active
            </label>
          </div>
        </div>

        {priceChanged && (
          <p className="text-xs text-warn flex items-start gap-1.5">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            Price changes apply to <b>future</b> records only. Past sales and
            production keep their snapshotted prices.
          </p>
        )}
        {err && <p className="text-sm text-danger">{err}</p>}

        <div className="flex gap-2 pt-1">
          {!isNew && (
            <button className="btn-danger" onClick={remove} disabled={busy}>
              <Trash2 size={18} /> Delete
            </button>
          )}
          <button className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
          <button className="btn-primary flex-1" onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
