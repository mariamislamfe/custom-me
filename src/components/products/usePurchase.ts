"use client";

import { useCallback, useState } from "react";
import { defaultSelection, priceFor, selectionLabels, type Product } from "@/data/catalog";
import { productLineKey, useCart } from "@/lib/cart";
import { useStore } from "@/components/store/StoreProvider";

/**
 * Selection + price + add-to-bag for a catalog product.
 * Selection resets to defaults whenever `product` changes.
 * Products without a price yet can't be bought.
 */
export function usePurchase(product: Product) {
  const { add } = useCart();
  const { pricing } = useStore();
  const [state, setState] = useState(() => ({ slug: product.slug, sel: defaultSelection(product, pricing) }));
  const [addedSlug, setAddedSlug] = useState<string | null>(null);

  const selection = state.slug === product.slug ? state.sel : defaultSelection(product, pricing);

  const set = useCallback(
    (group: string, value: string) =>
      setState((s) => ({
        slug: product.slug,
        sel: { ...(s.slug === product.slug ? s.sel : defaultSelection(product, pricing)), [group]: value },
      })),
    [product, pricing],
  );

  const price = priceFor(product, selection, pricing);
  const orderable = product.available && price != null;

  const addToBag = useCallback(() => {
    if (!orderable || price == null) return;
    add({
      key: productLineKey(product.slug, selection),
      kind: "product",
      slug: product.slug,
      name: product.name,
      category: product.category,
      unitPrice: price,
      qty: 1,
      selection,
      summary: selectionLabels(product, selection, pricing),
    });
    setAddedSlug(product.slug);
    window.setTimeout(() => setAddedSlug(null), 1800);
  }, [add, orderable, price, pricing, product, selection]);

  return { selection, set, price, orderable, addToBag, added: addedSlug === product.slug, customizeHref: customizeHref(product.slug, selection) };
}

/** Opens this design in the Lab with the options already picked, ready for a name or art on top. */
export function customizeHref(slug: string, selection: Record<string, string>) {
  const q = new URLSearchParams({ from: slug });
  for (const [k, v] of Object.entries(selection)) q.set(`o.${k}`, v);
  return `/lab?${q}`;
}
