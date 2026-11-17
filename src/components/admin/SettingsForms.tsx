"use client";

import { useActionState, useRef, useState } from "react";
import { saveDeliveryFees, savePricing, type SettingsState } from "@/app/admin/actions";
import { GOVERNORATES, type DeliveryFees } from "@/config/orders";
import { lab } from "@/config/customization";
import { categories, categoryOrder, type CategoryId, type Pricing } from "@/data/catalog";
import { Card, input as text, smallButton } from "./ui";

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

type SizeRow = { key: string; id: string; label: string; price: string; custom: string };
type TypeRow = { sizes: SizeRow[]; price: string; custom: string };

const box = (n: number | null) => (n == null ? "" : String(n));
const rowKey = () => Math.random().toString(36).slice(2, 10);

/**
 * Every price in the store, type by type: its sizes (as many as it comes in),
 * each with what a ready-made one costs and what a custom one costs.
 */
export function PricingForm({ pricing }: { pricing: Pricing }) {
  const [state, action, saving] = useActionState<SettingsState, FormData>(savePricing, {});
  const { saved, onInput } = useSaved(state);
  const [types, setTypes] = useState<Record<CategoryId, TypeRow>>(
    () =>
      Object.fromEntries(
        categoryOrder.map((c) => {
          const t = pricing.types[c];
          return [c, { sizes: t.sizes.map((z) => ({ key: rowKey(), id: z.id, label: z.label, price: box(z.price), custom: box(z.custom) })), price: box(t.price), custom: box(t.custom) }];
        }),
      ) as Record<CategoryId, TypeRow>,
  );
  const [strap, setStrap] = useState(String(pricing.strap));
  const change = (c: CategoryId, fn: (t: TypeRow) => TypeRow) => {
    setTypes((all) => ({ ...all, [c]: fn(all[c]) }));
    onInput();
  };
  const editSize = (c: CategoryId, key: string, patch: Partial<SizeRow>) => change(c, (t) => ({ ...t, sizes: t.sizes.map((z) => (z.key === key ? { ...z, ...patch } : z)) }));
  const payload = {
    strap,
    types: Object.fromEntries(categoryOrder.map((c) => [c, { price: types[c].price, custom: types[c].custom, sizes: types[c].sizes.map(({ id, label, price, custom }) => ({ id, label, price, custom })) }])),
  };

  return (
    <form action={action} onInput={onInput} className="grid gap-6">
      <input type="hidden" name="pricing" value={JSON.stringify(payload)} />
      <p className="text-sm">
        Every price in the store is set here. For each type: the sizes it comes in, and for each size what a <strong>ready-made</strong> one costs (a design from the
        shop, as it is) and what a <strong>custom</strong> one costs (designed in the Lab, or a shop design the customer customized). An empty box = not decided yet:
        that size shows “Price soon” and can’t be ordered.
      </p>
      {categoryOrder.map((c) => {
        const t = types[c];
        const noun = categories[c].singular.toLowerCase();
        const customMade = lab.categories.includes(c);
        const cols = customMade ? "sm:grid-cols-[minmax(0,1fr)_8rem_8rem_auto]" : "sm:grid-cols-[minmax(0,1fr)_8rem_auto]";
        return (
          <Card key={c} title={categories[c].label} hint={`${categories[c].sizeLabel}s and prices of every ${noun}.`}>
            {t.sizes.length > 0 ? (
              <ul className="grid gap-3">
                <li aria-hidden className={`hidden gap-2 text-xs font-semibold text-muted sm:grid ${cols}`}>
                  <span>Size</span>
                  <span>Ready-made (EGP)</span>
                  {customMade && <span>Custom (EGP)</span>}
                  <span />
                </li>
                {t.sizes.map((z, i) => (
                  <li key={z.key} className={`grid grid-cols-2 items-center gap-2 border-b border-ink/10 pb-3 sm:border-0 sm:pb-0 ${cols}`}>
                    <input
                      aria-label={`${categories[c].singular} size ${i + 1}`}
                      value={z.label}
                      maxLength={30}
                      placeholder="e.g. 35*50, A4, 14 inch"
                      className={`${text} col-span-2 sm:col-span-1`}
                      onChange={(e) => editSize(c, z.key, { label: e.target.value })}
                    />
                    <label className="grid gap-1">
                      <span className="text-xs font-semibold text-muted sm:sr-only">Ready-made</span>
                      <input aria-label={`Ready-made ${z.label || noun} (EGP)`} value={z.price} inputMode="numeric" placeholder="—" className={money} onChange={(e) => editSize(c, z.key, { price: e.target.value })} />
                    </label>
                    {customMade && (
                      <label className="grid gap-1">
                        <span className="text-xs font-semibold text-muted sm:sr-only">Custom</span>
                        <input aria-label={`Custom ${z.label || noun} (EGP)`} value={z.custom} inputMode="numeric" placeholder="—" className={money} onChange={(e) => editSize(c, z.key, { custom: e.target.value })} />
                      </label>
                    )}
                    <button
                      type="button"
                      className={`${smallButton} col-span-2 justify-self-start sm:col-span-1`}
                      onClick={() => change(c, (x) => ({ ...x, sizes: x.sizes.filter((s) => s.key !== z.key) }))}
                      aria-label={`Remove size ${z.label || i + 1}`}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="grid gap-3">
                <p className="text-sm text-muted">It comes in one size. Add sizes if it comes in more than one.</p>
                <div className="flex flex-wrap gap-4">
                  <label className="grid gap-1">
                    <span className="text-sm font-semibold">Ready-made (EGP)</span>
                    <input value={t.price} inputMode="numeric" placeholder="—" className={money} onChange={(e) => change(c, (x) => ({ ...x, price: e.target.value }))} />
                  </label>
                  {customMade && (
                    <label className="grid gap-1">
                      <span className="text-sm font-semibold">Custom (EGP)</span>
                      <input value={t.custom} inputMode="numeric" placeholder="—" className={money} onChange={(e) => change(c, (x) => ({ ...x, custom: e.target.value }))} />
                    </label>
                  )}
                </div>
              </div>
            )}
            <button
              type="button"
              className={`${smallButton} mt-4`}
              disabled={t.sizes.length >= 12}
              onClick={() => change(c, (x) => ({ ...x, sizes: [...x.sizes, { key: rowKey(), id: "", label: "", price: "", custom: "" }] }))}
            >
              + Add a size
            </button>
            {c === "sleeves" && (
              <label className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t-2 border-ink/10 pt-4">
                <span>
                  <span className="block font-semibold">Strap</span>
                  <span className="block text-sm text-muted">Added to the price when the customer adds a strap (ready-made or custom). 0 = free.</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-semibold">+</span>
                  <input value={strap} inputMode="numeric" className={money} onChange={(e) => (setStrap(e.target.value), onInput())} />
                  <span className="text-sm font-semibold text-muted">EGP</span>
                </span>
              </label>
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
