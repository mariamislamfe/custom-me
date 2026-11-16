"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { saveDeliveryFees, savePricing, type SettingsState } from "@/app/admin/actions";
import { GOVERNORATES, type DeliveryFees } from "@/config/orders";
import { lab } from "@/config/customization";
import { categories, categoryOrder, customSizePrice, optionExtra, sizeGroupOf, type Pricing } from "@/data/catalog";
import { Card } from "./ui";

const money = "h-11 w-28 border-2 border-ink/25 bg-sheet px-3 text-right font-mono text-lg outline-none focus:border-ink";

/** "Saved." after each save, hidden again once something is edited. */
function useSaved(state: SettingsState) {
  const [edited, setEdited] = useState(false);
  const [shown, setShown] = useState(state);
  if (shown !== state) {
    setShown(state);
    setEdited(false);
  }
  return { saved: Boolean(state.saved) && !edited, onInput: () => setEdited(true) };
}

function SaveBar({ label, saving, state, saved, done }: { label: string; saving: boolean; state: SettingsState; saved: boolean; done: string }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-3 border-t-2 border-ink bg-paper/95 px-4 py-3 sm:-mx-5 sm:px-5 sm:py-4 backdrop-blur-sm">
      <button type="submit" className="btn btn-ink" disabled={saving}>
        {saving ? "Saving…" : label}
      </button>
      {state.error && (
        <p role="alert" className="font-semibold text-alert">
          {state.error}
        </p>
      )}
      {saved && !saving && !state.error && (
        <p role="status" className="font-semibold">
          {done}
        </p>
      )}
    </div>
  );
}

export function PricingForm({ pricing }: { pricing: Pricing }) {
  const [state, action, saving] = useActionState<SettingsState, FormData>(savePricing, {});
  const { saved, onInput } = useSaved(state);
  return (
    <form action={action} onInput={onInput} className="grid gap-6">
      <p className="text-sm">
        The price of a custom piece: one designed in the Lab, or a shop design the customer customized (“Customize this”). Both cost the same, a full price for each
        size. Ready-made shop products have their own prices, set on each product under “Sizes &amp; prices”. The sizes themselves, and what a strap or other
        choices add, are set on{" "}
        <Link href="/admin/options" className="font-semibold underline">
          Product options
        </Link>
        .
      </p>
      {categoryOrder.map((c) => {
        const sizes = sizeGroupOf(pricing.options[c], c);
        const noun = categories[c].singular.toLowerCase();
        // What the other choices add, shown so the full picture is on one page
        const added = pricing.options[c]
          .filter((g) => g !== sizes)
          .flatMap((g) => g.values.map((v) => ({ g, v, extra: optionExtra(pricing, c, g.id, v.id) })))
          .filter((x) => x.extra > 0);
        return (
          <Card key={c} title={categories[c].label}>
            {!lab.categories.includes(c) ? (
              <p className="text-sm text-muted">Each {noun} has its own price (and sizes), set on the product. Nothing to set here.</p>
            ) : (
              <div className="grid gap-4">
                {sizes ? (
                  <div>
                    <p className="font-semibold">Custom {noun}: price of each size</p>
                    <p className="text-sm text-muted">What the customer pays in each {sizes.label.toLowerCase()}. Empty = not decided yet: that size shows “Price soon” and can’t be ordered.</p>
                    <ul className="mt-3 grid gap-2">
                      {sizes.values.map((v) => (
                        <li key={v.id}>
                          <label className="flex flex-wrap items-center justify-between gap-3">
                            <span className="font-medium">{v.label}</span>
                            <span className="flex items-center gap-2">
                              <input name={`customSize:${c}:${v.id}`} inputMode="numeric" defaultValue={customSizePrice(pricing, c, v.id) ?? ""} placeholder="—" className={money} />
                              <span className="text-sm font-semibold text-muted">EGP</span>
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <label className="flex flex-wrap items-center justify-between gap-3">
                    <span>
                      <span className="block font-semibold">Custom {noun}</span>
                      <span className="block text-sm text-muted">
                        It comes in one size (mark an option as the sizes on Product options to price each size). Empty = not decided yet: the Lab shows “Price soon” and
                        doesn’t take orders for it.
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <input name={`custom:${c}`} inputMode="numeric" defaultValue={pricing.custom[c] ?? ""} placeholder="—" className={money} />
                      <span className="text-sm font-semibold text-muted">EGP</span>
                    </span>
                  </label>
                )}
                {added.length > 0 && (
                  <p className="text-sm text-muted">
                    Added on top when picked: {added.map((x) => `${x.v.label} +${x.extra} EGP`).join(", ")} (
                    <Link href="/admin/options" className="underline">
                      change
                    </Link>
                    ).
                  </p>
                )}
              </div>
            )}
          </Card>
        );
      })}
      <SaveBar label="Save prices" saving={saving} state={state} saved={saved} done="Saved. The store shows the new prices now." />
    </form>
  );
}

export function DeliveryFeesForm({ fees }: { fees: DeliveryFees }) {
  const [state, action, saving] = useActionState<SettingsState, FormData>(saveDeliveryFees, {});
  const { saved, onInput } = useSaved(state);
  const [all, setAll] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={action} onInput={onInput} className="grid gap-6">
      <Card title="Same fee everywhere?" hint="Fill every governorate at once, then change the ones that differ.">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="fee-all" className="sr-only">
            Fee for every governorate (EGP)
          </label>
          <input id="fee-all" inputMode="numeric" value={all} onChange={(e) => setAll(e.target.value)} placeholder="60" className={money} />
          <span className="font-semibold">EGP</span>
          <button
            type="button"
            className="min-h-11 px-4 font-semibold ring-2 ring-ink/20 hover:ring-ink/50"
            onClick={() => {
              formRef.current?.querySelectorAll<HTMLInputElement>("input[data-fee]").forEach((el) => (el.value = all.trim()));
              onInput();
            }}
          >
            Fill all
          </button>
        </div>
      </Card>

      <Card title="By governorate" hint="Leave a box empty to confirm that governorate's fee with the customer on the phone instead.">
        <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {GOVERNORATES.map((g) => (
            <li key={g} className="flex items-center justify-between gap-3">
              <label htmlFor={`fee-${g}`} className="font-medium">
                {g}
              </label>
              <span className="flex items-center gap-2">
                <input id={`fee-${g}`} name={g} data-fee inputMode="numeric" defaultValue={fees[g] ?? ""} placeholder="—" className={money} />
                <span className="text-sm font-semibold text-muted">EGP</span>
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <SaveBar label="Save delivery fees" saving={saving} state={state} saved={saved} done="Saved. Checkout uses the new fees now." />
    </form>
  );
}
