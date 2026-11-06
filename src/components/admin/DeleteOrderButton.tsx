"use client";

import { useState, useTransition } from "react";
import { deleteOrder } from "@/app/admin/orders/actions";

/** Deletes the order, its design files and transfer screenshot, after a confirm. */
export function DeleteOrderButton({ id, number }: { id: string; number: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="justify-self-start">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(`Delete order ${number}? Its design files are deleted too. This can't be undone.`)) return;
          start(async () => {
            setError(null);
            try {
              await deleteOrder(id);
            } catch {
              setError("The order wasn't deleted. Check your connection and try again.");
            }
          });
        }}
        className="inline-flex min-h-11 items-center px-4 font-semibold text-alert ring-2 ring-alert/30 hover:bg-alert/10 disabled:opacity-50"
      >
        {pending ? "Deleting…" : "Delete this order"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm font-semibold text-alert">
          {error}
        </p>
      )}
    </div>
  );
}
