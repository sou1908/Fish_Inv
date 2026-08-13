"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  Package,
  ChefHat,
  Receipt,
  ClipboardCheck,
  BarChart3,
  Settings as SettingsIcon,
  MoreHorizontal,
  LogOut,
  Fish,
} from "lucide-react";
import { StoreProvider, useStore } from "./store";
import { Spinner } from "./ui";
import Guide from "./Guide";

import Dashboard from "./tabs/Dashboard";
import Purchases from "./tabs/Purchases";
import RawStock from "./tabs/RawStock";
import Products from "./tabs/Products";
import Production from "./tabs/Production";
import Sales from "./tabs/Sales";
import DayClose from "./tabs/DayClose";
import Reports from "./tabs/Reports";
import SettingsTab from "./tabs/Settings";

const TABS = {
  dashboard: { label: "Dashboard", icon: LayoutDashboard, Comp: Dashboard },
  sales: { label: "Sales", icon: Receipt, Comp: Sales },
  production: { label: "Production", icon: ChefHat, Comp: Production },
  dayclose: { label: "Day Close", icon: ClipboardCheck, Comp: DayClose },
  purchases: { label: "Purchases", icon: ShoppingCart, Comp: Purchases },
  rawstock: { label: "Raw Stock", icon: Boxes, Comp: RawStock },
  products: { label: "Products", icon: Package, Comp: Products },
  reports: { label: "Reports", icon: BarChart3, Comp: Reports },
  settings: { label: "Settings", icon: SettingsIcon, Comp: SettingsTab },
};

// full nav order for the desktop sidebar
const NAV = [
  "dashboard",
  "sales",
  "production",
  "dayclose",
  "purchases",
  "rawstock",
  "products",
  "reports",
  "settings",
];
// bottom-bar layout for mobile
const PRIMARY = ["dashboard", "sales", "production", "dayclose"];
const MORE = ["purchases", "rawstock", "products", "reports", "settings"];

function Shell() {
  const { settings, loading, error } = useStore();
  const [tab, setTab] = useState("dashboard");
  const [moreOpen, setMoreOpen] = useState(false);

  const Active = TABS[tab].Comp;
  const businessName = settings?.businessName || "Fish Snacks Studio";

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen bg-bg md:flex">
      {/* ---- desktop sidebar (dark ledger) ---- */}
      <aside
        className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 text-white/90 border-r border-black/20"
        style={{ background: "linear-gradient(180deg, var(--ink) 0%, var(--ink-2) 100%)" }}
      >
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-white/10">
          <div className="h-9 w-9 rounded-xl bg-brand text-ink flex items-center justify-center shrink-0 shadow">
            <Fish size={20} />
          </div>
          <span className="font-display font-bold text-white truncate">{businessName}</span>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {NAV.map((id) => {
            const { label, icon: Icon } = TABS[id];
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  active
                    ? "bg-brand text-ink font-semibold shadow-sm"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                <Icon size={19} />
                {label}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/10">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition"
          >
            <LogOut size={19} /> Log out
          </button>
        </div>
      </aside>

      {/* ---- content column ---- */}
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
        {/* mobile top header (ink) */}
        <header
          className="md:hidden sticky top-0 z-20 text-white px-4 py-3 flex items-center justify-between"
          style={{ background: "linear-gradient(180deg, var(--ink) 0%, var(--ink-2) 100%)" }}
        >
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-brand text-ink flex items-center justify-center">
              <Fish size={18} />
            </div>
            <span className="font-display font-bold truncate">{businessName}</span>
          </div>
          <div className="flex items-center gap-1">
            <Guide id={tab} className="text-white/85 hover:bg-white/10" />
            <button onClick={logout} className="opacity-90 p-1" title="Log out">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* desktop top bar */}
        <header className="hidden md:flex sticky top-0 z-10 h-16 items-center gap-2 px-8 bg-bg/85 backdrop-blur border-b border-border">
          <h1 className="text-lg font-bold">{TABS[tab].label}</h1>
          <Guide id={tab} className="text-muted hover:text-brand-strong hover:bg-black/5" />
        </header>

        <main className="flex-1 p-4 pb-28 md:p-8 md:pb-8">
          <div className="mx-auto w-full max-w-6xl">
            {loading ? (
              <Spinner />
            ) : error ? (
              <div className="card border-danger/40 text-danger">
                <p className="font-semibold">Could not load data</p>
                <p className="text-sm mt-1">{error}</p>
                <p className="text-sm mt-2 text-muted">
                  Check that DATABASE_URL is set and the schema has been pushed
                  (npm run db:push).
                </p>
              </div>
            ) : (
              <div key={tab} className="animate-in">
                <Active goTo={setTab} />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ---- mobile bottom nav ---- */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-surface/95 backdrop-blur border-t border-border pb-safe">
        <div className="grid grid-cols-5">
          {PRIMARY.map((id) => {
            const { label, icon: Icon } = TABS[id];
            const active = tab === id;
            return <NavItem key={id} icon={Icon} label={label} active={active} onClick={() => setTab(id)} />;
          })}
          <NavItem
            icon={MoreHorizontal}
            label="More"
            active={MORE.includes(tab)}
            onClick={() => setMoreOpen(true)}
          />
        </div>
      </nav>

      {/* mobile "more" sheet */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMoreOpen(false)} />
          <div className="relative bg-surface w-full rounded-t-2xl p-4 pb-8">
            <div className="h-1 w-10 bg-border rounded-full mx-auto mb-4" />
            <div className="grid grid-cols-3 gap-3">
              {MORE.map((id) => {
                const { label, icon: Icon } = TABS[id];
                return (
                  <button
                    key={id}
                    onClick={() => {
                      setTab(id);
                      setMoreOpen(false);
                    }}
                    className="flex flex-col items-center gap-2 py-4 rounded-xl border border-border"
                  >
                    <Icon size={24} className="text-brand" />
                    <span className="text-xs">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NavItem({ icon: Icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 pt-2 pb-1.5">
      <span
        className={`flex items-center justify-center h-8 w-14 rounded-full transition-all duration-200 ${
          active ? "bg-brand/18 text-brand-strong" : "text-muted"
        }`}
      >
        <Icon size={20} />
      </span>
      <span className={`text-[11px] ${active ? "text-brand-strong font-semibold" : "text-muted"}`}>
        {label}
      </span>
    </button>
  );
}

export default function AppShell() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
