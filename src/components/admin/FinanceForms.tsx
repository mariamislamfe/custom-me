"use client";

import { useActionState, useState, useTransition } from "react";
import { addExpense, addOutsideSale, deleteFinanceEntry, type FinanceFormState } from "@/app/admin/finance/actions";
import { EXPENSE_CATEGORIES } from "@/config/finance";
import { input } from "./ui";

const field = `${input} mt-1.5 min-w-0`;
const label = "text-sm font-semibold";

function Status({ state, pending, what }: { state: FinanceFormState; pending: boolean; what: string }) {
  if (state.error)
    return (
      <p role="alert" className="text-sm font-semibold text-alert">
        {state.error}
      </p>
    );
  if (state.saved && !pending)
    return (
      <p role="status" className="text-sm font-semibold">
        {what} added.
      </p>
    );
  return null;
}

export function ExpenseForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState<FinanceFormState, FormData>(addExpense, {});
  return (
    // keyed on the save count so the boxes empty after each save
    <form key={state.saved ?? 0} action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
      <div>
        <label htmlFor="ex-category" className={label}>
          For
        </label>
        <select id="ex-category" name="category" defaultValue="materials" className={field}>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="ex-amount" className={label}>
          Amount (EGP)
        </label>
        <input id="ex-amount" name="amount" inputMode="numeric" required placeholder="500" className={field} />
      </div>
      <div>
        <label htmlFor="ex-date" className={label}>
          Date
        </label>
        <input id="ex-date" name="date" type="date" defaultValue={today} max={today} required className={field} />
      </div>
      <div>
        <label htmlFor="ex-note" className={label}>
          Note <span className="font-normal text-muted">(optional)</span>
        </label>
        <input id="ex-note" name="note" maxLength={200} placeholder="Fabric, 20 m" className={field} />
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button type="submit" className="btn btn-ink btn-sm" disabled={pending}>
          {pending ? "Adding…" : "Add expense"}
        </button>
        <Status state={state} pending={pending} what="Expense" />
      </div>
    </form>
  );
}

export function OutsideSaleForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState<FinanceFormState, FormData>(addOutsideSale, {});
  return (
    <form key={state.saved ?? 0} action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
      <div>
        <label htmlFor="sale-amount" className={label}>
          Paid (EGP)
        </label>
        <input id="sale-amount" name="amount" inputMode="numeric" required placeholder="650" className={field} />
      </div>
      <div>
        <label htmlFor="sale-pieces" className={label}>
          Pieces
        </label>
        <input id="sale-pieces" name="pieces" inputMode="numeric" placeholder="1" className={field} />
      </div>
      <div>
        <label htmlFor="sale-date" className={label}>
          Date
        </label>
        <input id="sale-date" name="date" type="date" defaultValue={today} max={today} required className={field} />
      </div>
      <div>
        <label htmlFor="sale-note" className={label}>
          Note <span className="font-normal text-muted">(optional)</span>
        </label>
        <input id="sale-note" name="note" maxLength={200} placeholder="Sara, from Instagram" className={field} />
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button type="submit" className="btn btn-ink btn-sm" disabled={pending}>
          {pending ? "Adding…" : "Add order"}
        </button>
        <Status state={state} pending={pending} what="Order" />
      </div>
    </form>
  );
}

export function DeleteEntryButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);
  const name = failed ? "Not deleted, try again" : "Delete entry";
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("Delete this entry? This can't be undone.")) return;
        start(async () => {
          setFailed(false);
          try {
            await deleteFinanceEntry(id);
          } catch {
            setFailed(true);
          }
        });
      }}
      aria-label={name}
      title={name}
      className={`grid size-10 shrink-0 place-items-center hover:bg-alert/10 disabled:opacity-40 ${failed ? "text-alert ring-2 ring-alert" : ""}`}
    >
      <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
        <path d="M5 7h14M10 7V5h4v2m-7 0 1 12h8l1-12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
