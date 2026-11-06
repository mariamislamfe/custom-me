"use client";

import Link from "next/link";
import { categories } from "@/data/catalog";
import { MAX_QTY, useCart, type CartLine } from "@/lib/cart";
import { money } from "@/lib/format";
import { ProductMockup } from "@/components/products/ProductMockup";
import { ProductArt } from "@/components/products/ProductArt";
import { fitClass } from "@/components/products/shapes";
import { useStore } from "@/components/store/StoreProvider";

export function LineThumb({ line, className }: { line: CartLine; className?: string }) {
  const product = useStore().get(line.slug ?? "");
  const fit = fitClass(line.category);
  return (
    <div className={`flex items-center justify-center bg-fog p-2 ${className ?? ""}`}>
      {line.custom ? (
        <ProductMockup category={line.category} artwork="plain" palette="navy-mint" custom={line.custom} className={fit} />
      ) : product ? (
        <ProductArt product={product} colour={line.selection?.colour} sizes="128px" className={fit} />
      ) : null}
    </div>
  );
}

export function QtyStepper({ line, compact }: { line: CartLine; compact?: boolean }) {
  const { setQty } = useCart();
  const size = compact ? "h-9 w-9" : "h-11 w-11";
  return (
    <div className="inline-flex items-stretch border-2 border-ink" role="group" aria-label={`Quantity for ${line.name}`}>
      <button
        type="button"
        className={`${size} grid place-items-center text-lg font-bold hover:bg-mint-soft disabled:opacity-30`}
        onClick={() => setQty(line.key, line.qty - 1)}
        disabled={line.qty <= 1}
        aria-label="Decrease quantity"
      >
        −
      </button>
      <output className={`${size} grid place-items-center border-x-2 border-ink font-mono text-sm font-bold`} aria-live="polite">
        {line.qty}
      </output>
      <button
        type="button"
        className={`${size} grid place-items-center text-lg font-bold hover:bg-mint-soft disabled:opacity-30`}
        onClick={() => setQty(line.key, line.qty + 1)}
        disabled={line.qty >= MAX_QTY}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}

export function CartLineRow({ line, compact, onNavigate }: { line: CartLine; compact?: boolean; onNavigate?: () => void }) {
  const { remove } = useCart();
  const href = line.slug ? `/product/${line.slug}` : null;
  return (
    <li className="flex gap-4 border-b border-rule py-5 last:border-b-0">
      <LineThumb line={line} className={compact ? "h-24 w-24 shrink-0" : "h-32 w-32 shrink-0"} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="type-label text-muted">{line.kind === "custom" ? "Custom · " : ""}{categories[line.category].singular}</p>
            {href ? (
              <Link href={href} onClick={onNavigate} className="type-condensed block text-xl hover:underline">
                {line.name}
              </Link>
            ) : (
              <p className="type-condensed text-xl">{line.name}</p>
            )}
          </div>
          <p className="shrink-0 font-mono text-sm font-bold">{money(line.unitPrice * line.qty)}</p>
        </div>
        <ul className="mt-1 space-y-0.5 text-sm text-muted">
          {line.summary.map((s) => (
            <li key={s}>{s}</li>
          ))}
          {line.custom?.layers.map((l) => (
            <li key={l.id} className="truncate">
              {l.kind === "image" ? `Your design: ${l.name}` : `Text: “${l.text}”`}
            </li>
          ))}
        </ul>
        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
          <QtyStepper line={line} compact={compact} />
          <button type="button" onClick={() => remove(line.key)} className="type-label text-muted underline-offset-4 hover:text-ink hover:underline">
            Remove
          </button>
        </div>
      </div>
    </li>
  );
}
