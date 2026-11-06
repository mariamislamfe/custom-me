"use client";

import { useActionState, useState, useTransition } from "react";
import { createPromo, deletePromo, setPromoActive, type PromoState } from "@/app/admin/promos/actions";
import { input, pill, smallButton } from "./ui";

export function NewPromoForm() {
  const [state, action, saving] = useActionState<PromoState, FormData>(createPromo, {});
  const [kind, setKind] = useState<"percent" | "fixed">("percent");
  return (
    // A fresh form after each save
    <form key={state.saved ?? 0} action={action} className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="font-semibold">Code</span>
          <input name="code" required maxLength={24} placeholder="WELCOME10" autoCapitalize="characters" spellCheck={false} className={`${input} font-mono uppercase`} />
        </label>
        <fieldset className="grid gap-1.5">
          <legend className="mb-1.5 font-semibold">Discount</legend>
          <div className="flex flex-wrap items-center gap-2">
            {(["percent", "fixed"] as const).map((k) => (
              <label key={k} className="cursor-pointer">
                <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="peer sr-only" />
                <span className={pill}>{k === "percent" ? "% off" : "EGP off"}</span>
              </label>
            ))}
            <input name="value" required inputMode="numeric" placeholder={kind === "percent" ? "10" : "100"} aria-label={kind === "percent" ? "Percent off" : "EGP off"} className={`${input} w-28`} />
          </div>
        </fieldset>
        <label className="grid gap-1.5">
          <span className="font-semibold">Minimum order (optional)</span>
          <span className="text-sm text-muted">Items must come to at least this, in EGP.</span>
          <input name="minSubtotal" inputMode="numeric" placeholder="Any order" className={input} />
        </label>
        <label className="grid gap-1.5">
          <span className="font-semibold">Orders that can use it (optional)</span>
          <span className="text-sm text-muted">Stops working after this many orders.</span>
          <input name="maxUses" inputMode="numeric" placeholder="No limit" className={input} />
        </label>
        <label className="grid gap-1.5">
          <span className="font-semibold">Last day (optional)</span>
          <span className="text-sm text-muted">Works until the end of this day, Egypt time.</span>
          <input name="expires" type="date" className={input} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-ink" disabled={saving}>
          {saving ? "Saving…" : "Add promo code"}
        </button>
        {state.error && (
          <p role="alert" className="font-semibold text-alert">
            {state.error}
          </p>
        )}
        {state.saved && !state.error && (
          <p role="status" className="font-semibold">
            Added. Customers can use it at checkout now.
          </p>
        )}
      </div>
    </form>
  );
}

export function PromoRowActions({ code, active }: { code: string; active: boolean }) {
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className={smallButton} disabled={pending} onClick={() => start(() => setPromoActive(code, !active))}>
        {active ? "Pause" : "Turn on"}
      </button>
      {confirm ? (
        <>
          <button type="button" className={`${smallButton} text-alert`} disabled={pending} onClick={() => start(() => deletePromo(code))}>
            Delete {code}
          </button>
          <button type="button" className={smallButton} onClick={() => setConfirm(false)}>
            Keep
          </button>
        </>
      ) : (
        <button type="button" className={smallButton} onClick={() => setConfirm(true)}>
          Delete
        </button>
      )}
    </div>
  );
}
