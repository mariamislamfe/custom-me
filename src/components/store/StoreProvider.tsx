"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { DeliveryFees } from "@/config/orders";
import type { CategoryId, Pricing, Product } from "@/data/catalog";
import type { StoreInfo } from "@/lib/server/settings";

type Store = {
  products: Product[];
  pricing: Pricing;
  deliveryFees: DeliveryFees;
  /** InstaPay details and the shop's links, from the Store & payments page */
  store: StoreInfo;
  get: (slug: string) => Product | undefined;
  inCategory: (c: CategoryId) => Product[];
};

const StoreContext = createContext<Store | null>(null);

/** Products and prices from the dashboard, provided once by the storefront layout. */
export function StoreProvider({
  products,
  pricing,
  deliveryFees,
  store,
  children,
}: {
  products: Product[];
  pricing: Pricing;
  deliveryFees: DeliveryFees;
  store: StoreInfo;
  children: ReactNode;
}) {
  const value = useMemo<Store>(
    () => ({
      products,
      pricing,
      deliveryFees,
      store,
      get: (slug) => products.find((p) => p.slug === slug),
      inCategory: (c) => products.filter((p) => p.category === c),
    }),
    [products, pricing, deliveryFees, store],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}
