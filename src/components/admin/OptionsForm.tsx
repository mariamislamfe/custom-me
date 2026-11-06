"use client";

import { useActionState, useState } from "react";
import { saveOptions, type SettingsState } from "@/app/admin/actions";
import { categories, categoryOrder, type CategoryId, type Pricing } from "@/data/catalog";
import { Card, input, smallButton } from "./ui";

type ValueRow = { key: string; id: string; label: string; note: string; extra: string; available: boolean };
type GroupRow = { key: string; id: string; label: string; values: ValueRow[] };

const LIMITS = { groups: 6, values: 20 };
const key = () => Math.random().toString(36).slice(2, 10);
/** A new option or choice gets its id once, so saving again keeps it (orders and bags refer to it). */
const newId = () => `o-${key()}`;
const money = "h-11 w-24 border-2 border-ink/25 bg-sheet px-3 text-right font-mono outline-none focus:border-ink";

function swap<T>(list: T[], i: number, dir: -1 | 1) {
  const j = i + dir;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/**
 * The choices for each product type — laptop size, strap, ruler length,
 * notebook size and pages (lined, dotted…) — with what each adds to the
 * price. Products can still set their own sizes and colours on the product.
 */
export function OptionsForm({ pricing }: { pricing: Pricing }) {
  const [state, action, saving] = useActionState<SettingsState, FormData>(saveOptions, {});
  const [groups, setGroups] = useState<Record<CategoryId, GroupRow[]>>(
    () =>
      Object.fromEntries(
        categoryOrder.map((c) => [
          c,
          pricing.options[c].map((g) => ({
            key: key(),
            id: g.id,
            label: g.label,
            values: g.values.map((v) => ({
              key: key(),
              id: v.id,
              label: v.label,
              note: v.note ?? "",
              extra: String(pricing.extras[c]?.[`${g.id}:${v.id}`] ?? 0),
              available: v.available !== false,
            })),
          })),
        ]),
      ) as Record<CategoryId, GroupRow[]>,
  );
  const [edited, setEdited] = useState(false);
  const [shown, setShown] = useState(state);
  if (shown !== state) {
    setShown(state);
    setEdited(false);
  }

  const change = (c: CategoryId, fn: (list: GroupRow[]) => GroupRow[]) => {
    setGroups((all) => ({ ...all, [c]: fn(all[c]) }));
    setEdited(true);
  };
  const changeGroup = (c: CategoryId, gk: string, fn: (g: GroupRow) => GroupRow) => change(c, (list) => list.map((g) => (g.key === gk ? fn(g) : g)));
  const changeValue = (c: CategoryId, gk: string, vk: string, patch: Partial<ValueRow>) =>
    changeGroup(c, gk, (g) => ({ ...g, values: g.values.map((v) => (v.key === vk ? { ...v, ...patch } : v)) }));

  const payload = Object.fromEntries(
    categoryOrder.map((c) => [c, groups[c].map((g) => ({ id: g.id, label: g.label, values: g.values.map(({ id, label, note, extra, available }) => ({ id, label, note, extra, available })) }))]),
  );

  return (
    <form action={action} className="grid gap-6">
      <input type="hidden" name="options" value={JSON.stringify(payload)} />
      {categoryOrder.map((c) => (
        <Card
          key={c}
          title={categories[c].label}
          hint={
            c === "stickers"
              ? "Stickers usually get their sizes or packs on each sticker. Add options here only if every sticker comes the same ways."
              : `What a customer picks for every ${categories[c].singular.toLowerCase()} (and in the Lab). A product with its own sizes (set on the product) shows those instead of the “${c === "ruler-cases" ? "length" : "size"}” option here.`
          }
        >
          {groups[c].length === 0 && <p className="mb-4 text-sm text-muted">No options: it comes one way.</p>}
          <div className="grid gap-5">
            {groups[c].map((g, gi) => (
              <fieldset key={g.key} className="border-2 border-ink/15 p-4">
                <legend className="sr-only">{g.label || `Option ${gi + 1}`}</legend>
                <div className="flex flex-wrap items-end gap-2">
                  <label className="min-w-0 flex-1 basis-52">
                    <span className="mb-1 block text-sm font-semibold">Option name</span>
                    <input value={g.label} maxLength={40} placeholder="e.g. Pages, Strap, Size" className={input} onChange={(e) => changeGroup(c, g.key, (x) => ({ ...x, label: e.target.value }))} />
                  </label>
                  <button type="button" className={smallButton} disabled={gi === 0} onClick={() => change(c, (l) => swap(l, gi, -1))} aria-label={`Move ${g.label} up`}>
                    ↑
                  </button>
                  <button type="button" className={smallButton} disabled={gi === groups[c].length - 1} onClick={() => change(c, (l) => swap(l, gi, 1))} aria-label={`Move ${g.label} down`}>
                    ↓
                  </button>
                  <button
                    type="button"
                    className={`${smallButton} text-alert`}
                    onClick={() => {
                      if (window.confirm(`Remove “${g.label || "this option"}” from every ${categories[c].singular.toLowerCase()}?`)) change(c, (l) => l.filter((x) => x.key !== g.key));
                    }}
                  >
                    Remove option
                  </button>
                </div>

                <ul className="mt-4 grid gap-3">
                  <li aria-hidden className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_6rem_5.5rem_auto] gap-2 text-xs font-semibold text-muted sm:grid">
                    <span>Choice</span>
                    <span>Note under it (optional)</span>
                    <span className="text-right">Extra (EGP)</span>
                    <span>Offered</span>
                    <span />
                  </li>
                  {g.values.map((v, vi) => (
                    <li key={v.key} className="grid grid-cols-2 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_6rem_5.5rem_auto]">
                      <input aria-label="Choice" value={v.label} maxLength={40} placeholder="e.g. Dotted" className={`${input} col-span-2 sm:col-span-1`} onChange={(e) => changeValue(c, g.key, v.key, { label: e.target.value })} />
                      <input aria-label={`Note under ${v.label}`} value={v.note} maxLength={120} placeholder="e.g. fits MacBook Air 13" className={`${input} col-span-2 sm:col-span-1`} onChange={(e) => changeValue(c, g.key, v.key, { note: e.target.value })} />
                      <span className="flex items-center gap-1">
                        <span className="text-muted">+</span>
                        <input aria-label={`Extra for ${v.label} (EGP)`} value={v.extra} inputMode="numeric" className={money} onChange={(e) => changeValue(c, g.key, v.key, { extra: e.target.value })} />
                      </span>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={v.available} onChange={(e) => changeValue(c, g.key, v.key, { available: e.target.checked })} className="size-4 accent-ink" />
                        In stock
                      </label>
                      <span className="col-span-2 flex justify-end gap-1 sm:col-span-1">
                        <button type="button" className="grid size-9 place-items-center font-bold hover:bg-mint-soft disabled:opacity-25" disabled={vi === 0} onClick={() => changeGroup(c, g.key, (x) => ({ ...x, values: swap(x.values, vi, -1) }))} aria-label={`Move ${v.label} up`}>
                          ↑
                        </button>
                        <button type="button" className="grid size-9 place-items-center font-bold hover:bg-mint-soft disabled:opacity-25" disabled={vi === g.values.length - 1} onClick={() => changeGroup(c, g.key, (x) => ({ ...x, values: swap(x.values, vi, 1) }))} aria-label={`Move ${v.label} down`}>
                          ↓
                        </button>
                        <button type="button" className="grid size-9 place-items-center font-bold text-alert hover:bg-mint-soft disabled:opacity-25" disabled={g.values.length === 1} onClick={() => changeGroup(c, g.key, (x) => ({ ...x, values: x.values.filter((y) => y.key !== v.key) }))} aria-label={`Remove ${v.label}`}>
                          ✕
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className={`${smallButton} mt-3`}
                  disabled={g.values.length >= LIMITS.values}
                  onClick={() => changeGroup(c, g.key, (x) => ({ ...x, values: [...x.values, { key: key(), id: newId(), label: "", note: "", extra: "0", available: true }] }))}
                >
                  + Add a choice
                </button>
              </fieldset>
            ))}
          </div>
          <button
            type="button"
            className={`${smallButton} mt-4`}
            disabled={groups[c].length >= LIMITS.groups}
            onClick={() => change(c, (l) => [...l, { key: key(), id: newId(), label: "", values: [{ key: key(), id: newId(), label: "", note: "", extra: "0", available: true }] }])}
          >
            + Add an option
          </button>
        </Card>
      ))}

      <div className="sticky bottom-0 -mx-5 flex flex-wrap items-center gap-3 border-t-2 border-ink bg-paper/95 px-5 py-4 backdrop-blur-sm">
        <button type="submit" className="btn btn-ink" disabled={saving}>
          {saving ? "Saving…" : "Save options"}
        </button>
        {state.error && (
          <p role="alert" className="font-semibold text-alert">
            {state.error}
          </p>
        )}
        {state.saved && !edited && !saving && !state.error && (
          <p role="status" className="font-semibold">
            Saved. The store shows the new options now.
          </p>
        )}
      </div>
    </form>
  );
}
