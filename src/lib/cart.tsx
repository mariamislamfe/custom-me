"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from "react";
import type { Customization } from "@/config/customization";
import { MAX_QTY } from "@/config/orders";
import type { CategoryId } from "@/data/catalog";

/**
 * Cart state. Lives in the browser (localStorage); checkout sends it to
 * /api/orders, which works every price out again on the server.
 */

export interface CartLine {
  key: string;
  kind: "product" | "custom";
  /** Shop products */
  slug?: string;
  name: string;
  category: CategoryId;
  /** Shown in the bag; the server recalculates it at checkout */
  unitPrice: number;
  qty: number;
  selection: Record<string, string>;
  /** Human-readable option lines, e.g. "Laptop size: 14"". */
  summary: string[];
  /** Designed in the Lab: base colour + layers (uploaded images carry their stored fileId) */
  custom?: Customization;
}

type Action =
  | { type: "hydrate"; lines: CartLine[] }
  | { type: "add"; line: CartLine }
  | { type: "qty"; key: string; qty: number }
  | { type: "remove"; key: string }
  | { type: "clear" };

export { MAX_QTY };

interface State {
  lines: CartLine[];
  ready: boolean;
}

function reducer(s: State, a: Action): State {
  return a.type === "hydrate" ? { lines: a.lines, ready: true } : { ...s, lines: linesReducer(s.lines, a) };
}

function linesReducer(state: CartLine[], a: Exclude<Action, { type: "hydrate" }>): CartLine[] {
  switch (a.type) {
    case "add": {
      const existing = state.find((l) => l.key === a.line.key);
      if (existing) {
        return state.map((l) => (l.key === a.line.key ? { ...l, qty: Math.min(MAX_QTY, l.qty + a.line.qty) } : l));
      }
      return [...state, a.line];
    }
    case "qty":
      return state.map((l) => (l.key === a.key ? { ...l, qty: Math.max(1, Math.min(MAX_QTY, a.qty)) } : l));
    case "remove":
      return state.filter((l) => l.key !== a.key);
    case "clear":
      return [];
  }
}

// v2: custom pieces carry their design layers (v1 bags are dropped)
const STORAGE_KEY = "customme.cart.v2";

function load(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((l) => l && typeof l.key === "string" && l.qty > 0 && (l.kind === "product" ? typeof l.slug === "string" : Array.isArray(l.custom?.layers)))
      : [];
  } catch {
    return [];
  }
}

function save(lines: CartLine[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    /* storage unavailable (private mode) — cart stays in memory */
  }
}

interface CartCtx {
  lines: CartLine[];
  ready: boolean;
  count: number;
  subtotal: number;
  open: boolean;
  setOpen: (v: boolean) => void;
  /** The line most recently added, for confirmation feedback. */
  lastAdded: CartLine | null;
  add: (line: CartLine) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
}

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [{ lines, ready }, dispatch] = useReducer(reducer, { lines: [], ready: false });
  const [open, setOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState<CartLine | null>(null);

  useEffect(() => {
    dispatch({ type: "hydrate", lines: load() });
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) dispatch({ type: "hydrate", lines: load() });
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (ready) save(lines);
  }, [lines, ready]);

  const add = useCallback((line: CartLine) => {
    dispatch({ type: "add", line });
    setLastAdded(line);
    setOpen(true);
  }, []);
  const setQty = useCallback((key: string, qty: number) => dispatch({ type: "qty", key, qty }), []);
  const remove = useCallback((key: string) => dispatch({ type: "remove", key }), []);
  const clear = useCallback(() => dispatch({ type: "clear" }), []);

  const value = useMemo<CartCtx>(
    () => ({
      lines,
      ready,
      count: lines.reduce((n, l) => n + l.qty, 0),
      subtotal: lines.reduce((n, l) => n + l.qty * l.unitPrice, 0),
      open,
      setOpen,
      lastAdded,
      add,
      setQty,
      remove,
      clear,
    }),
    [lines, ready, open, lastAdded, add, setQty, remove, clear],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used inside <CartProvider>");
  return c;
}

export function productLineKey(slug: string, selection: Record<string, string>) {
  const sel = Object.keys(selection)
    .sort()
    .map((k) => `${k}=${selection[k]}`)
    .join("&");
  return `p:${slug}?${sel}`;
}

export function customLineKey() {
  return `c:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
