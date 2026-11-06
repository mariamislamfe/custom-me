"use client";

import { useId } from "react";
import type { OptionGroup, OptionValue } from "@/data/catalog";
import { InkLoop } from "@/components/marks/Marks";
import { money } from "@/lib/format";

/**
 * Radio group rendered as chips. The selected chip gets a pen circle drawn
 * around it — the same "loop = chosen" mark used across the site.
 */
export function OptionPicker({
  group,
  value,
  onChange,
  extra,
  tone = "light",
  compact = false,
  ownPrice,
}: {
  group: OptionGroup;
  value: string;
  onChange: (v: string) => void;
  /** What a value adds to the price (dashboard prices); defaults to the catalog value. */
  extra?: (valueId: string) => number;
  tone?: "light" | "dark";
  /** Tighter chips, and price differences shown without the currency. */
  compact?: boolean;
  /** A product's own sizes: each one's full price, shown on its chip. */
  ownPrice?: (v: OptionValue) => number | null;
}) {
  const id = useId();
  const current = group.values.find((v) => v.id === value);
  const move = (dir: 1 | -1) => {
    const avail = group.values.filter((v) => v.available !== false);
    const i = avail.findIndex((v) => v.id === value);
    const next = avail[(i + dir + avail.length) % avail.length];
    onChange(next.id);
    requestAnimationFrame(() => document.getElementById(`${id}-${next.id}`)?.focus());
  };

  return (
    <div>
      <p id={`${id}-label`} className={`type-label mb-2.5 ${tone === "dark" ? "text-sheet/70" : "text-muted"}`}>
        {group.label}
      </p>
      <div
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        className="flex flex-wrap gap-2.5"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowDown") {
            e.preventDefault();
            move(1);
          } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
            e.preventDefault();
            move(-1);
          }
        }}
      >
        {group.values.map((v) => {
          const checked = v.id === value;
          const delta = extra ? extra(v.id) : (v.priceDelta ?? 0);
          const own = ownPrice?.(v);
          return (
            <button
              key={v.id}
              id={`${id}-${v.id}`}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              disabled={v.available === false}
              onClick={() => onChange(v.id)}
              className={compact ? "chip max-sm:px-3" : "chip"}
            >
              {v.swatch && <span aria-hidden className="mr-2 inline-block size-4 shrink-0 rounded-full border-2 border-ink/70 align-[-3px]" style={{ background: v.swatch }} />}
              {v.label}
              {own != null ? (
                <span className="ml-1.5 text-[0.7rem] text-muted">{compact ? own : money(own)}</span>
              ) : delta ? (
                <span className="ml-1.5 text-[0.7rem] text-muted">
                  {compact ? (
                    <>
                      <span aria-hidden>+{delta}</span>
                      <span className="sr-only">plus {money(delta)}</span>
                    </>
                  ) : (
                    <>+{money(delta)}</>
                  )}
                </span>
              ) : null}
              {checked && (
                <InkLoop
                  key={v.id}
                  className={`pointer-events-none absolute -inset-x-3 -inset-y-2.5 h-[calc(100%+20px)] w-[calc(100%+24px)] ${tone === "dark" ? "text-mint" : "text-ink"}`}
                  strokeWidth={2.5}
                />
              )}
            </button>
          );
        })}
      </div>
      {current?.note && <p className={`mt-2 text-xs ${tone === "dark" ? "text-sheet/60" : "text-muted"}`}>{current.note}</p>}
    </div>
  );
}
