"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { PAYMENT_LABELS } from "@/config/payments";
import type { OrderStatus } from "@/config/orders";
import { formatDate, money } from "@/lib/format";
import { ease } from "@/lib/motion";
import type { TrackedOrder } from "@/lib/server/orders";
import type { TrackResult } from "@/app/api/track/route";

/** The road an order takes, in the customer's words. */
const ROAD: { id: OrderStatus; label: string; note: string }[] = [
  { id: "new", label: "Received", note: "We have your order and will call to confirm it." },
  { id: "confirmed", label: "Confirmed", note: "Confirmed with you. It goes into production next." },
  { id: "production", label: "Processing", note: "Your piece is being made." },
  { id: "shipped", label: "Out for delivery", note: "On its way with the courier." },
  { id: "delivered", label: "Delivered", note: "Delivered. Enjoy it!" },
];

const PAYMENT_STATUS = { pending: "Transfer being checked", received: "Transfer received ✓", rejected: "Transfer not received, we'll call you" } as const;

export function TrackOrder() {
  const params = useSearchParams();
  const initial = params.get("q") ?? "";
  const [query, setQuery] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<TrackedOrder[] | null>(null);
  const first = useRef(true);

  const look = async (q: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: q }) });
      const json = (await res.json()) as TrackResult;
      if (json.ok) setOrders(json.orders);
      else {
        setOrders(null);
        setError(json.error);
      }
    } catch {
      setError("We couldn't look that up. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  // Coming from checkout (?q=CM-1001): show it straight away
  useEffect(() => {
    if (first.current && initial) void look(initial);
    first.current = false;
  }, [initial]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) void look(query);
  };

  return (
    <div className="mt-10">
      <form onSubmit={onSubmit} className="flex max-w-xl flex-wrap gap-3">
        <label htmlFor="track-q" className="sr-only">
          Order number or mobile number
        </label>
        <input
          id="track-q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="CM-1001 or 01012345678"
          autoComplete="off"
          inputMode="text"
          className="h-[52px] min-w-0 flex-1 basis-60 border-2 border-ink bg-sheet px-4 font-mono outline-none focus:shadow-[4px_4px_0_#3FE0AE]"
        />
        <button type="submit" className="btn btn-ink" disabled={busy || !query.trim()}>
          {busy ? "Looking…" : "Track"}
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-4 max-w-xl border-l-4 border-alert pl-3 font-semibold text-alert">
          {error}
        </p>
      )}

      <div aria-live="polite">
        {orders && orders.length === 0 && (
          <div className="mt-10 max-w-xl border-2 border-dashed border-ink/50 p-6">
            <p className="type-condensed text-2xl">No order found.</p>
            <p className="mt-2 text-muted">Check the number, or use the mobile number you ordered with. Still stuck? Message us and we&apos;ll find it.</p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {orders?.map((o, i) => (
            <motion.div key={o.number} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: i * 0.08, ease: ease.snap }}>
              <OrderCard order={o} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function OrderCard({ order }: { order: TrackedOrder }) {
  const cancelled = order.status === "cancelled";
  const at = ROAD.findIndex((s) => s.id === order.status);
  const now = ROAD[Math.max(0, at)];
  return (
    <article className="mt-10 max-w-3xl border-2 border-ink bg-sheet p-5 shadow-[8px_8px_0_#14215A] md:p-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="type-label text-muted">Order</p>
          <h2 className="type-display font-mono text-[clamp(2rem,6vw,3rem)]">{order.number}</h2>
          <p className="mt-1 text-sm text-muted">Placed {formatDate(order.createdAt)}</p>
        </div>
        <span className={`sticker ${cancelled ? "bg-fog" : order.status === "delivered" ? "bg-mint" : "bg-amber"}`}>{cancelled ? "Cancelled" : now.label}</span>
      </header>

      {cancelled ? (
        <p className="mt-6 border-l-4 border-alert pl-3 font-semibold">This order was cancelled. If that&apos;s a surprise, message us with the order number.</p>
      ) : (
        <>
          <ol className="mt-8 grid grid-cols-5 gap-1" aria-label="Order progress">
            {ROAD.map((s, k) => {
              const done = k <= at;
              return (
                <li key={s.id} className="min-w-0" aria-current={k === at ? "step" : undefined}>
                  <div className="relative h-2 overflow-hidden bg-fog">
                    <motion.div
                      className="absolute inset-0 origin-left bg-ink"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: done ? 1 : 0 }}
                      transition={{ duration: 0.5, delay: 0.2 + k * 0.18, ease: ease.snap }}
                    />
                  </div>
                  <p className={`mt-2 font-mono text-[10px] font-bold uppercase leading-tight tracking-wider sm:text-[11px] ${done ? "text-ink" : "text-muted/60"}`}>{s.label}</p>
                </li>
              );
            })}
          </ol>
          <p className="mt-5 text-lg">{now.note}</p>
          {order.trackingRef && (order.status === "shipped" || order.status === "delivered") && (
            <p className="mt-2 text-sm">
              Courier tracking number: <strong className="font-mono">{order.trackingRef}</strong>
            </p>
          )}
        </>
      )}

      <ul className="mt-8 divide-y divide-rule border-y-2 border-ink">
        {order.lines.map((l, k) => (
          <li key={k} className="flex items-center gap-4 py-3">
            <span className="relative grid size-14 shrink-0 place-items-center bg-fog">
              {l.image && <Image src={l.image} alt="" fill sizes="56px" className="object-contain p-1" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{l.name}</span>
              <span className="block truncate text-xs text-muted">{l.options.join(" · ")}</span>
            </span>
            <span className="font-mono text-sm">× {l.quantity}</span>
          </li>
        ))}
      </ul>

      <dl className="mt-4 grid gap-1.5 font-mono text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Payment</dt>
          <dd className="text-right">
            {PAYMENT_LABELS[order.payment]}
            {order.paymentStatus && <span className="block text-xs text-muted">{PAYMENT_STATUS[order.paymentStatus]}</span>}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Total</dt>
          <dd>{money(order.total)}</dd>
        </div>
        <div className="flex justify-between gap-3 text-base font-bold">
          <dt>Pay on delivery</dt>
          <dd>{order.codBalance || order.shipping == null ? `${money(order.codBalance)}${order.shipping == null ? " + delivery" : ""}` : "Nothing"}</dd>
        </div>
      </dl>
      <p className="mt-6 text-sm text-muted">
        Last update {formatDate(order.updatedAt)}.{" "}
        <Link href="/shop" className="underline underline-offset-4 hover:text-ink">
          Keep browsing
        </Link>
      </p>
    </article>
  );
}
