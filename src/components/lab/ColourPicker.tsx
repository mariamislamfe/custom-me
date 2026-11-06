"use client";

import { useId, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { HEX } from "@/config/customization";
import { clamp } from "@/lib/layers";

type Hsv = { h: number; s: number; v: number };

function hexToHsv(hex: string): Hsv {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s: max ? d / max : 0, v: max };
}

function hsvToHex({ h, s, v }: Hsv) {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return Math.round(255 * (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))));
  };
  return `#${[f(5), f(3), f(1)].map((n) => n.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/**
 * Any colour at all: quick-pick swatches, then the full palette (a
 * saturation/brightness pad and a hue bar) and a hex box for an exact match.
 */
export function ColourPicker({
  label,
  value,
  onChange,
  swatches,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  swatches: readonly { label: string; hex: string }[];
}) {
  const id = useId();
  const pad = useRef<HTMLDivElement>(null);
  // The hue is kept here: greys and black have none, and dragging through them mustn't lose it
  const [hsv, setHsv] = useState(() => hexToHsv(value));
  const [shown, setShown] = useState(value);
  if (!same(shown, value)) {
    setShown(value);
    if (!same(hsvToHex(hsv), value)) setHsv(hexToHsv(value));
  }
  const [text, setText] = useState(value.toUpperCase());
  const [typing, setTyping] = useState(false);
  const [open, setOpen] = useState(() => !swatches.some((s) => same(s.hex, value)));

  const pick = (next: Hsv) => {
    setHsv(next);
    const hex = hsvToHex(next);
    setShown(hex);
    onChange(hex);
  };

  const fromPointer = (x: number, y: number) => {
    const r = pad.current!.getBoundingClientRect();
    pick({ h: hsv.h, s: clamp((x - r.left) / r.width, 0, 1), v: clamp(1 - (y - r.top) / r.height, 0, 1) });
  };

  const onPadDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.focus({ preventScroll: true });
    fromPointer(e.clientX, e.clientY);
    const move = (ev: PointerEvent) => fromPointer(ev.clientX, ev.clientY);
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  };

  const onPadKey = (e: KeyboardEvent) => {
    const step = e.shiftKey ? 0.1 : 0.02;
    const map: Record<string, Partial<Hsv>> = {
      ArrowLeft: { s: clamp(hsv.s - step, 0, 1) },
      ArrowRight: { s: clamp(hsv.s + step, 0, 1) },
      ArrowUp: { v: clamp(hsv.v + step, 0, 1) },
      ArrowDown: { v: clamp(hsv.v - step, 0, 1) },
    };
    if (map[e.key]) {
      e.preventDefault();
      pick({ ...hsv, ...map[e.key] });
    }
  };

  const hexShown = typing ? text : value.toUpperCase();

  return (
    <div>
      <p id={`${id}-l`} className="type-label mb-3 flex items-center gap-2 text-muted">
        {label}
        <span aria-hidden className="inline-block size-4 border-2 border-ink" style={{ background: value }} />
        <span className="text-ink">{swatches.find((s) => same(s.hex, value))?.label ?? value.toUpperCase()}</span>
      </p>
      <div role="radiogroup" aria-labelledby={`${id}-l`} className="flex flex-wrap gap-2.5">
        {swatches.map((s) => {
          const sel = same(s.hex, value);
          return (
            <button
              key={s.hex}
              type="button"
              role="radio"
              aria-checked={sel}
              aria-label={s.label}
              title={s.label}
              onClick={() => {
                setHsv(hexToHsv(s.hex));
                setShown(s.hex);
                onChange(s.hex);
              }}
              className={`size-10 border-2 border-ink transition-transform ${sel ? "-translate-y-0.5 shadow-[3px_3px_0_#14215A]" : "hover:-translate-y-0.5"}`}
              style={{ background: s.hex }}
            />
          );
        })}
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${id}-palette`}
          onClick={() => setOpen((o) => !o)}
          className={`relative size-10 border-2 border-ink transition-transform hover:-translate-y-0.5 ${open ? "-translate-y-0.5 shadow-[3px_3px_0_#14215A]" : ""}`}
          style={{ background: "conic-gradient(from 90deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)" }}
        >
          <span className="sr-only">{open ? "Hide" : "Show"} every colour</span>
          <span aria-hidden className="absolute inset-2.5 rounded-full border-2 border-white" style={{ background: value }} />
        </button>
      </div>

      {open && (
        <div id={`${id}-palette`} className="mt-4 grid max-w-sm gap-3">
          <div
            ref={pad}
            role="slider"
            tabIndex={0}
            aria-label="Colour: left and right for strength, up and down for brightness"
            aria-valuetext={value.toUpperCase()}
            aria-valuenow={Math.round(hsv.s * 100)}
            onPointerDown={onPadDown}
            onKeyDown={onPadKey}
            className="relative h-40 cursor-crosshair touch-none border-2 border-ink"
            style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hsv.h} 100% 50%))` }}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-[0_0_0_2px_#14215A]"
              style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: value }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={359}
            value={Math.round(hsv.h)}
            aria-label="Hue"
            onChange={(e) => pick({ ...hsv, h: Number(e.target.value), s: hsv.s || 1, v: hsv.v || 1 })}
            className="hue-range h-5 w-full cursor-pointer appearance-none border-2 border-ink"
            style={{ background: "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)" }}
          />
          <label className="flex items-center gap-2">
            <span className="type-label text-muted">Hex</span>
            <input
              value={hexShown}
              maxLength={7}
              spellCheck={false}
              autoComplete="off"
              onFocus={() => {
                setText(value.toUpperCase());
                setTyping(true);
              }}
              onBlur={() => setTyping(false)}
              onChange={(e) => {
                const t = `#${e.target.value.replace(/[^0-9a-f]/gi, "").slice(0, 6)}`.toUpperCase();
                setText(t);
                if (HEX.test(t)) {
                  setHsv(hexToHsv(t));
                  setShown(t);
                  onChange(t);
                }
              }}
              className="h-10 w-32 border-2 border-ink bg-sheet px-3 font-mono text-sm uppercase outline-none focus:shadow-[3px_3px_0_#3FE0AE]"
            />
          </label>
        </div>
      )}
    </div>
  );
}
