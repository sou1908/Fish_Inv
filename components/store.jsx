"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "@/lib/client";

const StoreContext = createContext(null);

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export function StoreProvider({ children }) {
  const [settings, setSettings] = useState(null);
  const [products, setProducts] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reloadProducts = useCallback(async () => {
    setProducts(await api.get("/api/products"));
  }, []);
  const reloadRaw = useCallback(async () => {
    setRawMaterials(await api.get("/api/raw-materials"));
  }, []);
  const reloadSettings = useCallback(async () => {
    setSettings(await api.get("/api/settings"));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [s, p] = await Promise.all([
          api.get("/api/settings"),
          api.get("/api/products"),
        ]);
        setSettings(s);
        setProducts(p);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const currency = settings?.currency || "₹";
  const productById = (id) => products.find((p) => p.id === id);

  const value = {
    settings,
    products,
    rawMaterials,
    loading,
    error,
    currency,
    productById,
    reloadProducts,
    reloadRaw,
    reloadSettings,
    setSettings,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
