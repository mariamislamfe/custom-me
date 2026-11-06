"use client";

import { useActionState, useState } from "react";
import { saveOrderAdmin, type OrderUpdateState } from "@/app/admin/orders/actions";
import { DEPOSIT_STATUSES, ORDER_STATUSES } from "@/config/orders";
import type { Order } from "@/lib/types";
import { input, pill } from "./ui";

export function OrderAdminForm({ order }: { order: Order }) {
  const [state, action, pending] = useActionState<OrderUpdateState, FormData>(saveOrderAdmin.bind(null, order.id), {});
  // "Saved." shows after each save and hides again once something is edited
  const [edited, setEdited] = useState(false);
  const [shown, setShown] = useState(state);
  if (shown !== state) {
    setShown(state);
    setEdited(false);
  }
  return (
    <form action={action} onInput={() => setEdited(true)} className="grid gap-4">
      <fieldset>
        <legend className="font-semibold">Order status</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {ORDER_STATUSES.map((s) => (
            <label key={s.id} className="cursor-pointer">
              <input type="radio" name="status" value={s.id} defaultChecked={order.status === s.id} className="peer sr-only" />
              <span className={`${pill} h-10 text-sm`}>{s.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {order.deposit && (
        <fieldset>
          <legend className="font-semibold">InstaPay deposit</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {DEPOSIT_STATUSES.map((s) => (
              <label key={s.id} className="cursor-pointer">
                <input type="radio" name="depositStatus" value={s.id} defaultChecked={order.deposit!.status === s.id} className="peer sr-only" />
                <span className={`${pill} h-10 text-sm`}>{s.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <div>
        <label htmlFor="trackingRef" className="font-semibold">
          Courier / tracking number
        </label>
        <input id="trackingRef" name="trackingRef" defaultValue={order.trackingRef} placeholder="Once it's shipped" className={`${input} mt-1.5`} />
      </div>
      <div>
        <label htmlFor="adminNote" className="font-semibold">
          Private note
        </label>
        <textarea id="adminNote" name="adminNote" defaultValue={order.adminNote} rows={3} placeholder="Only the team sees this" className={`${input} mt-1.5 h-auto py-3`} />
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" className="btn btn-ink" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
        <p role="status" className={`font-semibold ${state.error ? "text-alert" : ""}`}>
          {state.error ?? (state.saved && !pending && !edited ? "Saved." : "")}
        </p>
      </div>
    </form>
  );
}
