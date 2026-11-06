"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { useCart } from "@/lib/cart";
import { money } from "@/lib/format";
import { uploadFile } from "@/lib/upload";
import { GOVERNORATES, type Governorate } from "@/config/orders";
import { orderTotals, paymentMethods, type PaymentMethod } from "@/config/payments";
import { promoDiscount } from "@/lib/promo";
import { LineThumb } from "@/components/cart/CartLineRow";
import { EmptyBag } from "@/components/cart/EmptyBag";
import { PreviewNotice } from "@/components/cart/PreviewNotice";
import { useStore } from "@/components/store/StoreProvider";
import { ease } from "@/lib/motion";
import type { PlaceOrderResult } from "@/app/api/orders/route";
import type { PromoCheck } from "@/app/api/promo/route";

type Fields = { name: string; phone: string; email: string; governorate: string; city: string; address: string; notes: string };
type Errors = Partial<Record<keyof Fields | "form" | "payer" | "receipt" | "promo", string>>;
type AppliedPromo = Extract<PromoCheck, { ok: true }>;
const EMPTY: Fields = { name: "", phone: "", email: "", governorate: "", city: "", address: "", notes: "" };

function validate(c: Fields, withDeposit: boolean, payer: string, receipt: string | null) {
  const e: Errors = {};
  if (c.name.trim().length < 2) e.name = "Enter your full name.";
  if (!/^(\+?20|0)?1[0125]\d{8}$/.test(c.phone.replace(/[\s-]/g, ""))) e.phone = "Enter an Egyptian mobile number, like 01012345678.";
  if (c.email && !/^\S+@\S+\.\S+$/.test(c.email.trim())) e.email = "Enter an email like name@example.com, or leave it empty.";
  if (!c.governorate) e.governorate = "Choose your governorate.";
  if (c.city.trim().length < 2) e.city = "Enter your city or area.";
  if (c.address.trim().length < 5) e.address = "Enter your street address, building and apartment.";
  if (withDeposit) {
    if (payer.trim().length < 2) e.payer = "Enter the name or InstaPay number you paid from.";
    if (!receipt) e.receipt = "Upload a screenshot of your InstaPay transfer.";
  }
  return e;
}

export function Checkout() {
  const { lines, ready, subtotal, clear } = useCart();
  const { deliveryFees, store } = useStore();
  const pay = store.payments;
  const [form, setForm] = useState<Fields>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<Extract<PlaceOrderResult, { ok: true }> | null>(null);
  const methods = paymentMethods(pay);
  const [payment, setPayment] = useState<PaymentMethod>(methods[0]);
  // Paying by InstaPay (a deposit or everything): the transfer's screenshot comes with the order
  const withDeposit = payment !== "cod";
  const [promoText, setPromoText] = useState("");
  const [promo, setPromo] = useState<AppliedPromo | null>(null);
  const [promoBusy, setPromoBusy] = useState(false);
  const [payer, setPayer] = useState("");
  const [reference, setReference] = useState("");
  const [receipt, setReceipt] = useState<{ fileId: string; name: string } | null>(null);
  const [receiptBusy, setReceiptBusy] = useState(false);
  const receiptInput = useRef<HTMLInputElement>(null);

  const fee = form.governorate ? deliveryFees[form.governorate as Governorate] : undefined;
  const pieces = lines.reduce((n, l) => n + l.qty, 0);
  const promoOff = promo ? promoDiscount(promo, subtotal) : 0;
  const totals = (method: PaymentMethod) => orderTotals({ subtotal, promo: promoOff, shipping: fee ?? null, pieces, payment: method, pay });
  const { instapayDiscount, total, paidNow, codBalance } = totals(payment);

  const applyPromo = async () => {
    setPromoBusy(true);
    setErrors((e) => ({ ...e, promo: undefined }));
    try {
      const res = await fetch("/api/promo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: promoText, subtotal }) });
      const json = (await res.json()) as PromoCheck;
      if (json.ok) {
        setPromo(json);
        setPromoText("");
      } else setErrors((e) => ({ ...e, promo: json.error }));
    } catch {
      setErrors((e) => ({ ...e, promo: "Couldn't check the code. Check your connection and try again." }));
    } finally {
      setPromoBusy(false);
    }
  };

  const set = (k: keyof Fields) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    const e = validate(form, withDeposit, payer, receipt?.fileId ?? null);
    setErrors(e);
    const first = Object.keys(e)[0];
    if (first) {
      document.getElementById(`co-${first}`)?.focus();
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: form,
          lines: lines.map((l) => ({ kind: l.kind, slug: l.slug, category: l.category, qty: l.qty, selection: l.selection, custom: l.custom })),
          deposit: withDeposit ? { payer, reference, receiptFileId: receipt?.fileId } : undefined,
          payment,
          promo: promo?.code,
        }),
      });
      const json = (await res.json()) as PlaceOrderResult;
      if (json.ok) {
        setDone(json);
        clear();
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setErrors(json.errors);
        // A code that stopped working is taken off, so the totals shown are right again
        if (json.errors.promo) setPromo(null);
        const k = Object.keys(json.errors)[0];
        if (k && k !== "form") document.getElementById(`co-${k}`)?.focus();
      }
    } catch {
      setErrors({ form: "Your order didn’t go through. Check your connection and try again." });
    } finally {
      setSending(false);
    }
  };

  const onReceipt = async (file: File | undefined) => {
    if (!file) return;
    setReceiptBusy(true);
    setErrors((e) => ({ ...e, receipt: undefined }));
    try {
      setReceipt({ fileId: await uploadFile("receipt", file), name: file.name });
    } catch (err) {
      setErrors((e) => ({ ...e, receipt: (err as Error).message }));
    } finally {
      setReceiptBusy(false);
    }
  };

  if (!ready) return <div className="gutter pb-24 pt-36"><div className="h-60 animate-pulse bg-fog" aria-busy="true" aria-label="Loading checkout" /></div>;

  if (done) {
    return (
      <div className="gutter pb-24 pt-28 md:pt-36">
        <motion.div role="status" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: ease.snap }} className="mx-auto max-w-2xl border-2 border-ink bg-sheet p-6 shadow-[8px_8px_0_#14215A] md:p-10">
          <p className="type-label text-muted">Order placed</p>
          <h1 className="type-display mt-2 text-[clamp(2.6rem,8vw,5rem)]">Thank you.</h1>
          <p className="mt-4 text-lg">
            Your order number is <strong className="font-mono">{done.number}</strong>. Keep it handy if you contact us.
          </p>
          <dl className="mt-6 grid gap-1.5 border-t-2 border-dashed border-rule pt-4 font-mono text-sm">
            {done.discount > 0 && <Row k="You saved" v={money(done.discount)} />}
            <Row k="Total" v={money(done.total)} />
            <Row k="Delivery" v={done.shipping == null ? "Confirmed with you on the phone" : money(done.shipping)} />
            {done.deposit > 0 && <Row k={done.payment === "instapay-full" ? "Paid by InstaPay" : "Deposit (InstaPay)"} v={money(done.deposit)} />}
            <Row k="Pay on delivery" v={done.codBalance || done.shipping == null ? money(done.codBalance) + (done.shipping == null ? " + delivery" : "") : "Nothing"} strong />
          </dl>
          <p className="mt-6 text-sm text-muted">Follow it any time with your order number or your mobile number.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href={`/track?q=${encodeURIComponent(done.number)}`} className="btn btn-mint btn-sm">
              Track your order
            </Link>
            <Link href="/shop" className="btn btn-ink btn-sm">
              Keep browsing
            </Link>
            <Link href="/lab" className="btn btn-paper btn-sm">
              Design another
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="gutter pb-24 pt-28 md:pt-36">
        <h1 className="type-display text-[clamp(3rem,10vw,7rem)]">Checkout.</h1>
        <div className="mx-auto max-w-xl">
          <EmptyBag />
        </div>
      </div>
    );
  }

  return (
    <div className="gutter pb-24 pt-28 md:pt-36">
      <h1 className="type-display text-[clamp(3rem,10vw,7rem)]">Checkout.</h1>
      <p className="mt-4 max-w-xl text-lg leading-snug">Your details and where to deliver. Your order (and any design you uploaded) comes straight to us.</p>

      <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_400px]">
        <form onSubmit={onSubmit} noValidate className="space-y-8">
          <fieldset className="grid gap-5 sm:grid-cols-2">
            <legend className="type-label mb-4 text-muted">Your details</legend>
            <Field id="name" label="Full name" value={form.name} onChange={set("name")} error={errors.name} autoComplete="name" />
            <Field id="phone" label="Mobile" value={form.phone} onChange={set("phone")} error={errors.phone} autoComplete="tel" type="tel" inputMode="tel" placeholder="01012345678" />
            <Field id="email" label="Email (optional)" value={form.email} onChange={set("email")} error={errors.email} autoComplete="email" type="email" className="sm:col-span-2" />
          </fieldset>

          <fieldset className="grid gap-5 sm:grid-cols-2">
            <legend className="type-label mb-4 text-muted">Delivery</legend>
            <div>
              <label htmlFor="co-governorate" className="type-label mb-2 block">
                Governorate
              </label>
              <select
                id="co-governorate"
                value={form.governorate}
                onChange={(e) => set("governorate")(e.target.value)}
                aria-invalid={!!errors.governorate}
                className={`h-[52px] w-full border-2 bg-sheet px-3 outline-none focus:shadow-[4px_4px_0_#3FE0AE] ${errors.governorate ? "border-alert" : "border-ink"}`}
              >
                <option value="">Choose…</option>
                {GOVERNORATES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              {errors.governorate && <p className="mt-1.5 text-sm font-semibold text-alert">{errors.governorate}</p>}
            </div>
            <Field id="city" label="City / area" value={form.city} onChange={set("city")} error={errors.city} autoComplete="address-level2" />
            <Field id="address" label="Street, building, apartment" value={form.address} onChange={set("address")} error={errors.address} autoComplete="street-address" className="sm:col-span-2" />
            <Field id="notes" label="Notes (optional)" value={form.notes} onChange={set("notes")} textarea className="sm:col-span-2" />
          </fieldset>

          {methods.length > 1 && (
            <fieldset>
              <legend className="type-label mb-4 text-muted">How you pay</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {methods.map((m) => {
                  const t = totals(m);
                  return (
                    <label key={m} className="cursor-pointer">
                      <input type="radio" name="payment" value={m} checked={payment === m} onChange={() => setPayment(m)} className="peer sr-only" />
                      <span className="relative flex h-full flex-col border-2 border-rule bg-sheet p-4 transition-colors peer-checked:border-ink peer-checked:bg-mint-soft peer-checked:shadow-[4px_4px_0_#14215A] peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-mint">
                        {m === "instapay-full" && <span className="sticker absolute -top-3 right-3 rotate-3 bg-mint">{pay.fullPaymentDiscountPercent}% off</span>}
                        <span className="font-semibold">{m === "instapay-full" ? "Pay it all now by InstaPay" : m === "instapay-deposit" ? "Deposit now, rest on delivery" : "Cash on delivery"}</span>
                        <span className="mt-1 text-sm text-muted">
                          {m === "instapay-full"
                            ? `${money(t.paidNow)} now${t.instapayDiscount ? `, you save ${money(t.instapayDiscount)}` : ""}. Nothing to pay at the door${fee == null ? " but delivery" : ""}.`
                            : m === "instapay-deposit"
                              ? `${money(t.paidNow)} now by InstaPay, ${money(t.codBalance)} cash on delivery.`
                              : "Pay the courier when it arrives."}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          {withDeposit && (
            <fieldset className="space-y-5 border-2 border-ink bg-sheet p-5">
              <legend className="type-label px-1">
                {payment === "instapay-full" ? "InstaPay payment" : "InstaPay deposit"} · {money(paidNow)}
              </legend>
              <p className="text-sm leading-snug">
                Send {money(paidNow)} by InstaPay to{" "}
                <strong className="font-mono">{[pay.address, pay.phone].filter(Boolean).join(" or ")}</strong>
                {pay.accountName ? ` (${pay.accountName})` : ""}, then add the screenshot below.{" "}
                {payment === "instapay-full"
                  ? fee == null
                    ? "Only the delivery fee is paid on delivery."
                    : "Nothing is left to pay on delivery."
                  : `The rest (${money(codBalance)}) is paid on delivery.`}
              </p>
              {pay.link && (
                <a href={pay.link} target="_blank" rel="noopener" className="btn btn-mint btn-sm">
                  Open InstaPay
                </a>
              )}
              {pay.qr && (
                // On a computer: scan the shop's InstaPay QR code with the phone
                // eslint-disable-next-line @next/next/no-img-element -- the QR code uploaded on the dashboard
                <img src={pay.qr} alt="InstaPay QR code" className="hidden size-40 border-2 border-ink bg-sheet object-contain p-2 md:block" />
              )}
              <div className="grid gap-5 sm:grid-cols-2">
                <Field id="payer" label="Paid from (name or number)" value={payer} onChange={setPayer} error={errors.payer} />
                <Field id="reference" label="Reference (optional)" value={reference} onChange={setReference} />
              </div>
              <div>
                <button id="co-receipt" type="button" className="btn btn-paper btn-sm" onClick={() => receiptInput.current?.click()} disabled={receiptBusy}>
                  {receiptBusy ? "Uploading…" : receipt ? "Change screenshot" : "Upload the transfer screenshot"}
                </button>
                {receipt && <span className="ml-3 text-sm">✓ {receipt.name}</span>}
                <input ref={receiptInput} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => onReceipt(e.target.files?.[0])} />
                {errors.receipt && <p className="mt-1.5 text-sm font-semibold text-alert">{errors.receipt}</p>}
              </div>
            </fieldset>
          )}

          <PreviewNotice />
          {errors.form && (
            <p role="alert" className="border-l-4 border-alert pl-3 font-semibold text-alert">
              {errors.form}
            </p>
          )}
          <button type="submit" className="btn btn-ink w-full sm:w-auto" disabled={sending || receiptBusy}>
            {sending ? "Placing your order…" : `Place order · ${money(total)}`}
          </button>
        </form>

        <aside className="h-fit border-2 border-ink bg-sheet p-6 lg:sticky lg:top-28" aria-label="Order summary">
          <h2 className="type-condensed text-3xl">Your order</h2>
          <ul className="mt-4 divide-y divide-rule">
            {lines.map((l) => (
              <li key={l.key} className="flex gap-3 py-3">
                <LineThumb line={l} className="h-16 w-16 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{l.name}</p>
                  <p className="truncate text-xs text-muted">{l.summary.join(" · ")}</p>
                  <p className="text-xs text-muted">Qty {l.qty}</p>
                </div>
                <p className="font-mono text-sm font-bold">{money(l.qty * l.unitPrice)}</p>
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t-2 border-dashed border-rule pt-4">
            {promo ? (
              <div className="flex items-center justify-between gap-3 bg-mint-soft px-3 py-2">
                <p className="text-sm">
                  <strong className="font-mono">{promo.code}</strong> · {promo.label}
                </p>
                <button type="button" onClick={() => setPromo(null)} className="type-label text-muted underline-offset-4 hover:text-ink hover:underline">
                  Remove
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (promoText.trim()) void applyPromo();
                }}
              >
                <label htmlFor="co-promo" className="type-label mb-2 block text-muted">
                  Promo code
                </label>
                <div className="flex gap-2">
                  <input
                    id="co-promo"
                    value={promoText}
                    onChange={(e) => {
                      setPromoText(e.target.value);
                      if (errors.promo) setErrors((x) => ({ ...x, promo: undefined }));
                    }}
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    placeholder="e.g. WELCOME10"
                    aria-invalid={!!errors.promo}
                    className={`h-11 min-w-0 flex-1 border-2 bg-paper px-3 font-mono uppercase outline-none focus:shadow-[3px_3px_0_#3FE0AE] ${errors.promo ? "border-alert" : "border-ink"}`}
                  />
                  <button type="submit" className="btn btn-paper btn-sm" disabled={promoBusy || !promoText.trim()}>
                    {promoBusy ? "…" : "Apply"}
                  </button>
                </div>
                {errors.promo && <p className="mt-1.5 text-sm font-semibold text-alert">{errors.promo}</p>}
              </form>
            )}
          </div>
          <dl className="mt-4 space-y-1.5 border-t-2 border-ink pt-4">
            <Row k="Subtotal" v={money(subtotal)} />
            {promo && <Row k={`Promo ${promo.code}`} v={`− ${money(promoOff)}`} />}
            {instapayDiscount > 0 && <Row k={`Paying in full (${pay.fullPaymentDiscountPercent}% off)`} v={`− ${money(instapayDiscount)}`} />}
            <Row k="Delivery" v={!form.governorate ? "Choose your governorate" : fee == null ? "Confirmed on the phone" : money(fee)} />
            <Row k="Total" v={money(total)} strong />
            {withDeposit && <Row k={payment === "instapay-full" ? "Now (InstaPay)" : "Deposit now (InstaPay)"} v={money(paidNow)} />}
          </dl>
          <Link href="/cart" className="type-label mt-5 inline-block underline underline-offset-4">
            Edit bag
          </Link>
        </aside>
      </div>
    </div>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? "text-lg font-bold" : ""}`}>
      <dt className={strong ? "type-label self-center" : "text-sm text-muted"}>{k}</dt>
      <dd className="text-right font-mono">{v}</dd>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  textarea,
  className,
  ...rest
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  textarea?: boolean;
  className?: string;
  autoComplete?: string;
  type?: string;
  inputMode?: "tel" | "text";
  placeholder?: string;
}) {
  const cls = `w-full border-2 bg-sheet px-4 py-3 outline-none focus:shadow-[4px_4px_0_#3FE0AE] ${error ? "border-alert" : "border-ink"}`;
  return (
    <div className={className}>
      <label htmlFor={`co-${id}`} className="type-label mb-2 block">
        {label}
      </label>
      {textarea ? (
        <textarea id={`co-${id}`} value={value} onChange={(e) => onChange(e.target.value)} rows={3} className={cls} />
      ) : (
        <input
          id={`co-${id}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? `co-${id}-err` : undefined}
          className={cls}
          {...rest}
        />
      )}
      {error && (
        <p id={`co-${id}-err`} className="mt-1.5 text-sm font-semibold text-alert">
          {error}
        </p>
      )}
    </div>
  );
}
