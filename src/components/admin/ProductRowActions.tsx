"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteProduct, reorderProduct, togglePublished } from "@/app/admin/actions";
import { smallButton } from "./ui";

const icon = "grid size-10 place-items-center hover:bg-mint-soft disabled:opacity-30";

export function ProductRowActions({ id, name, slug, published, first, last }: { id: string; name: string; slug: string; published: boolean; first: boolean; last: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      setError(null);
      try {
        await fn();
      } catch {
        setError("That didn't save. Check your connection and try again.");
      }
    });

  return (
    // Phones: the main actions on one row, reordering and delete on the row below.
    // Wider: one row (the groups dissolve with `contents` and `order` sets the sequence).
    <div
      className={`grid w-full gap-2 border-t-2 border-ink/10 pt-3 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:gap-1 sm:border-0 sm:pt-0 ${pending ? "opacity-60" : ""}`}
    >
      <div className="flex items-center gap-1 sm:contents">
        <Link
          href={`/admin/products/${id}`}
          className="inline-flex min-h-11 flex-1 items-center justify-center bg-ink px-4 text-sm font-semibold text-sheet sm:order-4 sm:min-h-10 sm:flex-none"
        >
          Edit
        </Link>
        {published && (
          <Link href={`/product/${slug}`} target="_blank" className="inline-flex min-h-11 items-center px-3 text-sm font-semibold hover:bg-mint-soft sm:order-3 sm:min-h-10">
            View
          </Link>
        )}
        <button type="button" disabled={pending} onClick={() => run(() => togglePublished(id, !published))} className={`${smallButton} min-h-11 sm:order-2 sm:min-h-10`}>
          {published ? "Unpublish" : "Publish"}
        </button>
      </div>
      <div className="flex items-center justify-between sm:contents">
        <div className="flex items-center gap-1 sm:contents">
          <button type="button" className={`${icon} sm:order-1`} disabled={first || pending} aria-label={`Move ${name} up`} onClick={() => run(() => reorderProduct(id, -1))}>
            <svg viewBox="0 0 24 24" className="size-5" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5m-6 6 6-6 6 6" />
            </svg>
          </button>
          <button type="button" className={`${icon} sm:order-1`} disabled={last || pending} aria-label={`Move ${name} down`} onClick={() => run(() => reorderProduct(id, 1))}>
            <svg viewBox="0 0 24 24" className="size-5" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14m-6-6 6 6 6-6" />
            </svg>
          </button>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (window.confirm(`Delete “${name}”? Its photos are deleted too. This can't be undone.`)) run(() => deleteProduct(id));
          }}
          className="inline-flex min-h-10 items-center px-3 text-sm font-semibold text-alert hover:bg-alert/10 sm:order-5"
        >
          Delete
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm font-semibold text-alert sm:order-6 sm:basis-full">
          {error}
        </p>
      )}
    </div>
  );
}
