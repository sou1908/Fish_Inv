"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { toPaise, toRupees, formatMoney } from "@/lib/money";

/** Money input shown in rupees, reports value up in paise. */
export function MoneyInput({ value, onChange, placeholder = "0.00", className = "" }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">₹</span>
      <input
        className={`field pl-7 ${className}`}
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        value={value === 0 || value ? toRupees(value) : ""}
        placeholder={placeholder}
        onChange={(e) =>
          onChange(e.target.value === "" ? 0 : toPaise(e.target.value))
        }
      />
    </div>
  );
}

/** Plain numeric field for quantities/counts. */
export function NumberInput({ value, onChange, placeholder = "0", step = "1", className = "" }) {
  return (
    <input
      className={`field ${className}`}
      type="number"
      inputMode="decimal"
      step={step}
      min="0"
      value={value === 0 || value ? value : ""}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
    />
  );
}

export function KpiCard({ label, value, sub, tone = "default" }) {
  const toneClass =
    tone === "good" ? "text-ok" : tone === "bad" ? "text-danger" : "text-text";
  return (
    <div className="kpi">
      <div className="eyebrow">{label}</div>
      <div className={`num text-2xl font-bold mt-1.5 ${toneClass}`}>{value}</div>
      {sub && <div className="text-xs text-muted mt-1">{sub}</div>}
    </div>
  );
}

export function MoneyKpi({ label, paise, currency, tone }) {
  return <KpiCard label={label} value={formatMoney(paise, currency)} tone={tone} />;
}

export function Badge({ children, tone = "gray" }) {
  const tones = {
    gray: "bg-black/5 text-muted",
    green: "bg-ok/12 text-ok",
    red: "bg-danger/12 text-danger",
    amber: "bg-warn/15 text-warn",
    teal: "bg-ink/8 text-ink",
    gold: "bg-brand/18 text-brand-strong",
  };
  return <span className={`chip ${tones[tone]}`}>{children}</span>;
}

export function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  // Portal to <body> so the modal can't be trapped by an ancestor with
  // transform/filter/backdrop-filter (which would break `position: fixed`).
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" onClick={onClose} />
      <div className="relative card w-full sm:max-w-md max-h-[85vh] overflow-y-auto rounded-b-none sm:rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold pr-4">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 -mr-1 rounded-lg text-muted hover:bg-black/5 shrink-0"
          >
            <X size={22} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}

export function EmptyState({ icon: Icon, title, hint }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4 text-muted">
      {Icon && <Icon size={40} className="mb-3 opacity-40" />}
      <p className="font-medium text-text">{title}</p>
      {hint && <p className="text-sm mt-1">{hint}</p>}
    </div>
  );
}

export function Spinner({ label = "Loading…" }) {
  return (
    <div className="flex items-center justify-center py-16 text-muted gap-3">
      <div className="h-5 w-5 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      {label}
    </div>
  );
}

export function SectionTitle({ children, action }) {
  return (
    <div className="flex items-center justify-between mt-6 mb-2 first:mt-0">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
        {children}
      </h2>
      {action}
    </div>
  );
}
