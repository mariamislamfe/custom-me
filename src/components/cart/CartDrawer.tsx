"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useCart } from "@/lib/cart";
import { money } from "@/lib/format";
import { ease } from "@/lib/motion";
import { CartLineRow } from "./CartLineRow";
import { EmptyBag } from "./EmptyBag";
import { PreviewNotice } from "./PreviewNotice";

export function CartDrawer() {
  const { open, setOpen, lines, subtotal, count } = useCart();
  const panel = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    returnFocus.current = document.activeElement;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "Tab" && panel.current) {
        const f = panel.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input,[tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const firstEl = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      (returnFocus.current as HTMLElement | null)?.focus?.();
    };
  }, [open, setOpen]);

  const close = () => setOpen(false);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60]">
          <motion.button
            type="button"
            aria-label="Close bag"
            tabIndex={-1}
            className="absolute inset-0 cursor-default bg-deep/50"
            onClick={close}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="bag-title"
            className="absolute inset-y-0 right-0 flex w-full max-w-[460px] flex-col border-l-2 border-ink bg-paper"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.5, ease: ease.snap }}
          >
            <div className="flex items-center justify-between border-b-2 border-ink px-5 py-4">
              <h2 id="bag-title" className="type-display text-3xl">
                Bag <span className="font-mono text-base align-top">({count})</span>
              </h2>
              <button ref={closeBtn} type="button" onClick={close} className="btn btn-ghost btn-sm">
                Close
              </button>
            </div>

            {lines.length === 0 ? (
              <div className="flex flex-1 items-center px-5">
                <EmptyBag onNavigate={close} />
              </div>
            ) : (
              <>
                <ul className="flex-1 overflow-y-auto px-5">
                  {lines.map((l) => (
                    <CartLineRow key={l.key} line={l} compact onNavigate={close} />
                  ))}
                </ul>
                <div className="space-y-3 border-t-2 border-ink bg-sheet px-5 py-5">
                  <div className="flex items-baseline justify-between">
                    <span className="type-label">Subtotal</span>
                    <span className="font-mono text-xl font-bold">{money(subtotal)}</span>
                  </div>
                  <p className="text-sm text-muted">Shipping is confirmed with your order.</p>
                  <PreviewNotice compact />
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <Link href="/cart" onClick={close} className="btn btn-paper">
                      View bag
                    </Link>
                    <Link href="/checkout" onClick={close} className="btn btn-ink">
                      Checkout
                    </Link>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
