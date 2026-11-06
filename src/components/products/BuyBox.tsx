"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { optionExtra, optionsFor, type Product } from "@/data/catalog";
import { useStore } from "@/components/store/StoreProvider";
import { PriceTag } from "./PriceTag";
import { ease } from "@/lib/motion";
import { OptionPicker } from "./OptionPicker";
import type { usePurchase } from "./usePurchase";

/** Price, options and actions for one product. Shared by every presentation. */
export function BuyBox({
  product,
  purchase,
  tone = "light",
  showDetailsLink = true,
  compact = false,
}: {
  product: Product;
  purchase: ReturnType<typeof usePurchase>;
  tone?: "light" | "dark";
  showDetailsLink?: boolean;
  /** One-screen layouts: the caller shows the price, actions sit in one row. */
  compact?: boolean;
}) {
  const { selection, set, price, orderable, addToBag, added, customizeHref } = purchase;
  const { pricing } = useStore();
  const groups = optionsFor(product, pricing);
  const unpriced = price == null;
  const label = !product.available ? "Sold out" : unpriced ? "Not on sale yet" : added ? "Added ✓" : "Add to bag";
  const dark = tone === "dark";
  const details = showDetailsLink && (
    <Link
      href={`/product/${product.slug}`}
      className={`type-label inline-block underline decoration-2 underline-offset-4 ${dark ? "text-sheet hover:text-mint" : "hover:text-muted"}`}
    >
      {compact ? "Details →" : "Full details →"}
    </Link>
  );

  return (
    <div className={compact ? "space-y-4" : "space-y-5"}>
      {!compact && (
        <p className="flex items-baseline gap-3">
          <PriceTag value={price} className="font-mono text-2xl font-bold" />
          {!product.available && <span className="sticker">Sold out</span>}
        </p>
      )}
      {groups.map((g) => (
        <OptionPicker
          key={g.id}
          group={g}
          value={selection[g.id]}
          onChange={(v) => set(g.id, v)}
          extra={(v) => (g.own ? 0 : optionExtra(pricing, product.category, g.id, v))}
          // Sizes with prices of their own: every chip shows what it costs
          ownPrice={g.own && g.values.some((v) => v.price != null) ? (v) => v.price ?? product.price : undefined}
          tone={tone}
          compact={compact}
        />
      ))}
      {unpriced && product.available && (
        <p className={`text-sm leading-snug ${dark ? "text-sheet/80" : "text-muted"}`}>
          The price for this design is on its way. You can already put your own design on one in the Lab.
        </p>
      )}
      <div className={`flex flex-wrap items-center pt-1 ${compact ? "gap-x-3 gap-y-3" : "gap-3"}`}>
        <button
          type="button"
          onClick={addToBag}
          disabled={!orderable}
          className={`btn ${dark ? "btn-mint" : "btn-ink"} overflow-hidden ${compact ? "max-sm:min-h-10 max-sm:px-4 max-sm:text-[0.8rem] sm:min-w-[9.5rem]" : "min-w-[11rem]"}`}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={label}
              initial={{ y: "120%" }}
              animate={{ y: 0 }}
              exit={{ y: "-120%" }}
              transition={{ duration: 0.25, ease: ease.snap }}
              className="block"
            >
              {label}
            </motion.span>
          </AnimatePresence>
        </button>
        {product.customizable && (
          <Link href={customizeHref} className={`btn ${dark ? "btn-ghost text-sheet" : "btn-mint"} ${compact ? "max-sm:min-h-10 max-sm:px-4 max-sm:text-[0.8rem]" : ""}`}>
            Customize
            {compact ? <span className="sr-only"> this design</span> : " this"}
          </Link>
        )}
        {compact && details}
      </div>
      {!compact && details}
    </div>
  );
}
