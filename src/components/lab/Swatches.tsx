"use client";

import { useId, type ReactNode } from "react";
import { PALETTES, type PaletteId } from "@/components/art/artworks";
import { InkLoop } from "@/components/marks/Marks";

/** Keyboard-navigable radio group whose options are arbitrary visuals. */
export function VisualRadio<T extends string>({
  label,
  options,
  value,
  onChange,
  render,
  getLabel,
  className,
  itemClassName,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  render: (v: T, selected: boolean) => ReactNode;
  getLabel: (v: T) => string;
  className?: string;
  itemClassName?: string;
}) {
  const id = useId();
  const move = (dir: 1 | -1) => {
    const i = options.indexOf(value);
    const next = options[(i + dir + options.length) % options.length];
    onChange(next);
    requestAnimationFrame(() => document.getElementById(`${id}-${next}`)?.focus());
  };
  return (
    <div>
      <p id={`${id}-l`} className="type-label mb-3 text-muted">
        {label}
      </p>
      <div
        role="radiogroup"
        aria-labelledby={`${id}-l`}
        className={className ?? "flex flex-wrap gap-3"}
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
        {options.map((o) => {
          const sel = o === value;
          return (
            <button
              key={o}
              id={`${id}-${o}`}
              type="button"
              role="radio"
              aria-checked={sel}
              aria-label={getLabel(o)}
              tabIndex={sel ? 0 : -1}
              onClick={() => onChange(o)}
              className={`relative ${itemClassName ?? ""}`}
            >
              {render(o, sel)}
              {sel && <InkLoop key={o} className="pointer-events-none absolute -inset-2.5 h-[calc(100%+20px)] w-[calc(100%+20px)] text-ink" strokeWidth={2.5} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function PaletteChip({ id }: { id: PaletteId }) {
  const p = PALETTES[id];
  return (
    <span className="block h-12 w-12 overflow-hidden border-2 border-ink" style={{ background: `linear-gradient(135deg, ${p.ground} 0 58%, ${p.ink} 58% 100%)` }} />
  );
}
