"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";
import { money } from "@/lib/format";
import { CartLineRow } from "./CartLineRow";
import { EmptyBag } from "./EmptyBag";
import { PreviewNotice } from "./PreviewNotice";

export function CartView() {
  const { lines, ready, subtotal, count, clear } = useCart();

  return (
    <div className="gutter pb-24 pt-28 md:pt-36">
      <h1 className="type-display text-[clamp(3rem,10vw,8rem)]">Your bag.</h1>

      {!ready ? (
        <div className="mt-10 h-40 animate-pulse bg-fog" aria-busy="true" aria-label="Loading your bag" />
      ) : lines.length === 0 ? (
        <div className="mx-auto max-w-xl">
          <EmptyBag />
        </div>
      ) : (
        <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div>
            <div className="flex items-center justify-between border-b-2 border-ink pb-3">
              <p className="type-label">
                {count} item{count === 1 ? "" : "s"}
              </p>
              <button type="button" onClick={clear} className="type-label text-muted underline-offset-4 hover:text-ink hover:underline">
                Empty bag
              </button>
            </div>
            <ul>
              {lines.map((l) => (
                <CartLineRow key={l.key} line={l} />
              ))}
            </ul>
          </div>
          <aside className="h-fit space-y-5 border-2 border-ink bg-sheet p-6 shadow-[6px_6px_0_#14215A] lg:sticky lg:top-28" aria-label="Order summary">
            <h2 className="type-condensed text-3xl">Summary</h2>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd className="font-mono font-bold">{money(subtotal)}</dd>
              </div>
              <div className="flex justify-between text-muted">
                <dt>Shipping</dt>
                <dd className="text-sm">Confirmed with your order</dd>
              </div>
            </dl>
            <PreviewNotice compact />
            <Link href="/checkout" className="btn btn-ink w-full">
              Continue to checkout
            </Link>
            <Link href="/shop" className="type-label block text-center underline underline-offset-4">
              Keep shopping
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
