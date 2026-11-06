"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { saveDeliveryFees, savePricing, type SettingsState } from "@/app/admin/actions";
import { GOVERNORATES, type DeliveryFees } from "@/config/orders";
import { lab } from "@/config/customization";
import { categories, categoryOrder, type Pricing } from "@/data/catalog";
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
        What bigger sizes, a strap or other choices add to the price is set with the choices themselves, on{" "}
        <Link href="/admin/options" className="font-semibold underline">
          Product options
        </Link>
        .
      </p>
      {categoryOrder.map((c) => (
        <Card key={c} title={categories[c].label}>
          <div className="grid gap-4">
            {!lab.categories.includes(c) && (
              <p className="text-sm text-muted">Each {categories[c].singular.toLowerCase()} has its own price (and sizes), set on the product. Nothing to set here.</p>
            )}
            {lab.categories.includes(c) && (
              <>
                <label className="flex flex-wrap items-center justify-between gap-3">
                  <span>
                    <span className="block font-semibold">Custom {categories[c].singular.toLowerCase()} (designed in the Lab)</span>
                    <span className="block text-sm text-muted">Smallest size. Empty = not decided yet: the Lab shows “Price soon” and doesn’t take orders for it. Shop products have their own price, set on each product.</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <input name={`custom:${c}`} inputMode="numeric" defaultValue={pricing.custom[c] ?? ""} className={money} />
                    <span className="text-sm font-semibold text-muted">EGP</span>
                  </span>
                </label>
                <label className="flex flex-wrap items-center justify-between gap-3">
                  <span>
                    <span className="block font-semibold">Personalizing a shop design</span>
                    <span className="block text-sm text-muted">Added to the design’s own price when a customer presses “Customize this” and adds a name or art to it. 0 = free.</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-muted">+</span>
                    <input name={`personalize:${c}`} inputMode="numeric" defaultValue={pricing.personalize[c] ?? 0} className={money} />
                    <span className="text-sm font-semibold text-muted">EGP</span>
                  </span>
                </label>
              </>
            )}
          </div>
        </Card>
      ))}
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
