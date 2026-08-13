"use client";

import { useState } from "react";
import { Plus, Boxes, Pencil, SlidersHorizontal, AlertTriangle } from "lucide-react";
import { useStore } from "../store";
import { api } from "@/lib/client";
import { formatMoney } from "@/lib/money";
import { today } from "@/lib/date";
import { MoneyInput, NumberInput, Modal, EmptyState, Badge, SectionTitle } from "../ui";

const CATEGORIES = ["Fish", "Vegetable", "Flour & Grain", "Oil & Fat", "Spice", "Packaging", "Other"];
const UNITS = ["kg", "litre", "piece", "packet"];
const REASONS = [
  { v: "spoilage", label: "Spoilage" },
  { v: "count", label: "Recount" },
  { v: "used", label: "Used" },
  { v: "other", label: "Other" },
];

export default function RawStock() {
  const { rawMaterials, reloadRaw, currency } = useStore();
  const [editing, setEditing] = useState(null);
  const [adjusting, setAdjusting] = useState(null);

  const lowStock = rawMaterials.filter(
    (r) => r.reorderLevel > 0 && r.currentStock <= r.reorderLevel
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-bold">Raw Stock</h1>
        <button className="btn-primary py-2 px-3" onClick={() => setEditing({})}>
          <Plus size={18} /> Add
        </button>
      </div>

      {lowStock.length > 0 && (
        <div className="card border-amber-300 bg-amber-50/50 mb-3">
          <div className="flex items-center gap-2 text-warn font-medium text-sm">
            <AlertTriangle size={16} /> {lowStock.length} item(s) at/below reorder level
          </div>
          <div className="text-sm text-muted mt-1">
            {lowStock.map((r) => r.name).join(", ")}
          </div>
        </div>
      )}

      {rawMaterials.length === 0 ? (
        <EmptyState icon={Boxes} title="No raw materials yet" hint="Add fish, spices, oil, packaging…" />
      ) : (
        <div className="space-y-3">
          {rawMaterials.map((r) => {
            const low = r.reorderLevel > 0 && r.currentStock <= r.reorderLevel;
            return (
              <div key={r.id} className={`card ${low ? "border-amber-300" : ""}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      {r.name}
                      <Badge tone="gray">{r.category}</Badge>
                      {low && <Badge tone="amber">reorder</Badge>}
                    </div>
                    <div className="text-sm text-muted mt-0.5">
                      Last rate {formatMoney(r.lastRate, currency)}/{r.unit}
                      {r.reorderLevel > 0 && ` · reorder @ ${r.reorderLevel}`}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button className="p-2 text-muted" onClick={() => setAdjusting(r)} title="Adjust stock">
                      <SlidersHorizontal size={18} />
                    </button>
                    <button className="p-2 text-muted" onClick={() => setEditing(r)}>
                      <Pencil size={18} />
                    </button>
                  </div>
                </div>
                <div className="mt-2 text-lg font-bold">
                  {r.currentStock} <span className="text-sm font-normal text-muted">{r.unit}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <MaterialForm
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            await reloadRaw();
            setEditing(null);
          }}
        />
      )}
      {adjusting && (
        <AdjustForm
          material={adjusting}
          onClose={() => setAdjusting(null)}
          onSaved={async () => {
            await reloadRaw();
            setAdjusting(null);
          }}
        />
      )}
    </div>
  );
}

function MaterialForm({ initial, onClose, onSaved }) {
  const isNew = !initial.id;
  const [f, setF] = useState({
    name: initial.name || "",
    category: initial.category || "Fish",
    unit: initial.unit || "kg",
    currentStock: initial.currentStock ?? 0,
    lastRate: initial.lastRate ?? 0,
    reorderLevel: initial.reorderLevel ?? 0,
    isPerishable: initial.isPerishable ?? true,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  async function save() {
    if (!f.name.trim()) return setErr("Name is required");
    setBusy(true);
    try {
      if (isNew) await api.post("/api/raw-materials", f);
      else await api.put(`/api/raw-materials/${initial.id}`, f);
      await onSaved();
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  }
  async function remove() {
    if (!confirm(`Delete ${initial.name}?`)) return;
    setBusy(true);
    try {
      await api.del(`/api/raw-materials/${initial.id}`);
      await onSaved();
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={isNew ? "New material" : "Edit material"}>
      <div className="space-y-3">
        <div>
          <label className="label">Name</label>
          <input className="field" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Rohu fish" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Category</label>
            <select className="field" value={f.category} onChange={(e) => set("category", e.target.value)}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Unit</label>
            <select className="field" value={f.unit} onChange={(e) => set("unit", e.target.value)}>
              {UNITS.map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Current stock</label>
            <NumberInput value={f.currentStock} onChange={(v) => set("currentStock", v)} step="0.01" />
          </div>
          <div>
            <label className="label">Last rate / {f.unit}</label>
            <MoneyInput value={f.lastRate} onChange={(v) => set("lastRate", v)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Reorder level</label>
            <NumberInput value={f.reorderLevel} onChange={(v) => set("reorderLevel", v)} step="0.01" />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm py-3">
              <input type="checkbox" checked={f.isPerishable} onChange={(e) => set("isPerishable", e.target.checked)} />
              Perishable
            </label>
          </div>
        </div>
        {err && <p className="text-sm text-danger">{err}</p>}
        <div className="flex gap-2 pt-1">
          {!isNew && (
            <button className="btn-danger" onClick={remove} disabled={busy}>Delete</button>
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

function AdjustForm({ material, onClose, onSaved }) {
  const [reason, setReason] = useState("spoilage");
  const [amount, setAmount] = useState(0);
  const [direction, setDirection] = useState(-1); // spoilage/used reduce
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const delta = direction * Math.abs(amount);
  const newStock = material.currentStock + delta;

  async function save() {
    if (!amount) return setErr("Enter a quantity");
    setBusy(true);
    try {
      await api.post("/api/stock-adjustments", {
        date: today(),
        rawMaterialId: material.id,
        quantityDelta: delta,
        reason,
        note: note || null,
      });
      await onSaved();
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={`Adjust: ${material.name}`}>
      <div className="space-y-3">
        <div className="text-sm text-muted">
          Current stock: <b className="text-text">{material.currentStock} {material.unit}</b>
        </div>
        <div>
          <label className="label">Reason</label>
          <select
            className="field"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setDirection(e.target.value === "count" ? 1 : -1);
            }}
          >
            {REASONS.map((r) => <option key={r.v} value={r.v}>{r.label}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Change direction</label>
            <select className="field" value={direction} onChange={(e) => setDirection(Number(e.target.value))}>
              <option value={-1}>Reduce (−)</option>
              <option value={1}>Add (+)</option>
            </select>
          </div>
          <div>
            <label className="label">Quantity ({material.unit})</label>
            <NumberInput value={amount} onChange={setAmount} step="0.01" />
          </div>
        </div>
        <div className="rounded-xl bg-bg p-3 text-sm flex justify-between">
          <span className="text-muted">New stock</span>
          <span className={`font-semibold ${newStock < 0 ? "text-danger" : ""}`}>
            {newStock} {material.unit}
          </span>
        </div>
        <div>
          <label className="label">Note (optional)</label>
          <input className="field" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        {err && <p className="text-sm text-danger">{err}</p>}
        <div className="flex gap-2 pt-1">
          <button className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
          <button className="btn-primary flex-1" onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Apply"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
