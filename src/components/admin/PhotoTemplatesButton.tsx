"use client";

import { useState, useTransition } from "react";
import { makeTemplatesFromPhotos } from "@/app/admin/actions";

/**
 * One press: every product without an editable design gets one made of its
 * own photo, so it can be changed and added to in the dashboard and the Lab.
 */
export function PhotoTemplatesButton({ count }: { count: number }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState<string | null>(null);
  if (!count && !done) return null;
  if (!count) {
    return (
      <p role="status" className="mb-6 bg-mint px-5 py-3 font-semibold">
        {done}
      </p>
    );
  }
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 bg-mint-soft px-5 py-3">
      <p className="min-w-0 flex-1 basis-72">
        <strong>
          {count} {count === 1 ? "product has" : "products have"} no editable design yet.
        </strong>{" "}
        Make one from each product’s photo: the photo becomes the bottom layer, ready to add text and pictures on top in the dashboard, and for customers in the Lab.
      </p>
      <button
        type="button"
        className="btn btn-ink btn-sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            try {
              const r = await makeTemplatesFromPhotos();
              setDone(
                `Made ${r.made} editable ${r.made === 1 ? "design" : "designs"}.${r.skipped.length ? ` Left out (more than one colour, one photo can’t show them all): ${r.skipped.join(", ")}.` : ""}`,
              );
            } catch {
              setDone("That didn't work. Check your connection and try again.");
            }
          })
        }
      >
        {pending ? "Making designs…" : "Make editable designs from photos"}
      </button>
      {done && (
        <p role="status" className="basis-full text-sm font-semibold">
          {done}
        </p>
      )}
    </div>
  );
}
