"use client";

import { useId, useRef, useState, useSyncExternalStore, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
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

const toHex = (r: number, g: number, b: number) => `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`.toUpperCase();

type Picture = { src: string; name: string };

/** The browser's own eyedropper (Chrome, Edge): picks a colour from anywhere on screen. */
type EyeDropperCtor = new () => { open: () => Promise<{ sRGBHex: string }> };
const nativeDropper = () => (typeof window !== "undefined" && "EyeDropper" in window ? (window as unknown as { EyeDropper: EyeDropperCtor }).EyeDropper : null);
const never = () => () => {};

/** A hex from rgb(…) or #rrggbb (what the eyedropper gives back). */
function parseColour(c: string) {
  if (HEX.test(c)) return c.toUpperCase();
  const m = c.match(/\d+/g);
  return m && m.length >= 3 ? toHex(+m[0], +m[1], +m[2]) : null;
}

/** Reads one pixel of a picture: tap it to pick, hover (or drag) to look. */
function Sampler({ pictures, onPick, onClose }: { pictures: Picture[]; onPick: (hex: string) => void; onClose: () => void }) {
  const [at, setAt] = useState(0);
  const [hover, setHover] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const img = useRef<HTMLImageElement>(null);
  const pixels = useRef<{ src: string; data: ImageData } | null>(null);
  const pic = pictures[Math.min(at, pictures.length - 1)];

  // The picture drawn once at a modest size; each pick reads from it
  const read = () => {
    const el = img.current;
    if (!el || !el.naturalWidth) return null;
    if (pixels.current?.src !== pic.src) {
      const scale = Math.min(1, 1200 / Math.max(el.naturalWidth, el.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(el.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(el.naturalHeight * scale));
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(el, 0, 0, canvas.width, canvas.height);
      try {
        pixels.current = { src: pic.src, data: ctx.getImageData(0, 0, canvas.width, canvas.height) };
      } catch {
        setError("Colours can’t be read from this picture. Try another one.");
        return null;
      }
    }
    return pixels.current!.data;
  };

  const colourAt = (x: number, y: number) => {
    const data = read();
    const el = img.current;
    if (!data || !el) return null;
    const r = el.getBoundingClientRect();
    const px = Math.floor(clamp((x - r.left) / r.width, 0, 0.9999) * data.width);
    const py = Math.floor(clamp((y - r.top) / r.height, 0, 0.9999) * data.height);
    const i = (py * data.width + px) * 4;
    // A see-through pixel shows the piece, not the picture: nothing to pick there
    if (data.data[i + 3] < 24) return null;
    return toHex(data.data[i], data.data[i + 1], data.data[i + 2]);
  };

  return (
    <div className="mt-4 max-w-sm border-2 border-ink bg-sheet p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="type-label">Tap a colour in your picture</p>
        <button type="button" onClick={onClose} className="type-label text-muted underline-offset-4 hover:text-ink hover:underline">
          Done
        </button>
      </div>
      {pictures.length > 1 && (
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto" role="tablist" aria-label="Pictures">
          {pictures.map((p, i) => (
            <button
              key={`${p.src.slice(-40)}-${i}`}
              type="button"
              role="tab"
              aria-selected={i === at}
              aria-label={p.name}
              onClick={() => {
                setAt(i);
                setError(null);
              }}
              className={`grid size-12 shrink-0 place-items-center overflow-hidden border-2 bg-fog ${i === at ? "border-ink" : "border-rule"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- the customer's own picture */}
              <img src={p.src} alt="" className="max-h-full max-w-full object-contain" />
            </button>
          ))}
        </div>
      )}
      <div className="mt-3 flex justify-center bg-[repeating-conic-gradient(#E2E5EB_0_25%,#fff_0_50%)] bg-[length:16px_16px]">
        {/* eslint-disable-next-line @next/next/no-img-element -- the customer's own picture, read pixel by pixel */}
        <img
          ref={img}
          key={pic.src}
          src={pic.src}
          alt={`${pic.name}: tap to pick a colour`}
          crossOrigin={pic.src.startsWith("data:") || pic.src.startsWith("blob:") ? undefined : "anonymous"}
          draggable={false}
          className="max-h-56 max-w-full cursor-crosshair touch-none select-none"
          onPointerMove={(e) => setHover(colourAt(e.clientX, e.clientY))}
          onPointerLeave={() => setHover(null)}
          onPointerDown={(e) => {
            e.preventDefault();
            const hex = colourAt(e.clientX, e.clientY);
            setHover(hex);
            if (hex) onPick(hex);
          }}
        />
      </div>
      <p className="mt-2 flex items-center gap-2 text-xs text-muted" aria-live="polite">
        {error ?? (
          <>
            <span aria-hidden className="inline-block size-4 border-2 border-ink" style={{ background: hover ?? "transparent" }} />
            {hover ? hover : "Move over the picture to see its colours"}
          </>
        )}
      </p>
    </div>
  );
}

/**
 * Any colour at all: quick-pick swatches, then the full palette (a
 * saturation/brightness pad and a hue bar), a hex box for an exact match,
 * and an eyedropper to take a colour from a picture.
 */
export function ColourPicker({
  label,
  value,
  onChange,
  swatches,
  pickFrom = [],
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  swatches: readonly { label: string; hex: string }[];
  /** Pictures to pick a colour from (the customer's uploads), where the browser has no eyedropper of its own */
  pickFrom?: Picture[];
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
  const [sampling, setSampling] = useState(false);
  // Known only in the browser (false on the server, so both render the same markup first)
  const native = useSyncExternalStore(never, () => Boolean(nativeDropper()), () => false);
  const canDrop = native || pickFrom.length > 0;

  const take = (hex: string) => {
    setHsv(hexToHsv(hex));
    setShown(hex);
    onChange(hex);
  };

  const dropper = async () => {
    const Dropper = nativeDropper();
    if (!Dropper) return setSampling((s) => !s);
    try {
      const hex = parseColour((await new Dropper().open()).sRGBHex);
      if (hex) take(hex);
    } catch {
      // Closed with Esc: nothing picked
    }
  };

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
        {canDrop && (
          <button
            type="button"
            onClick={dropper}
            aria-pressed={sampling}
            title={native ? "Pick a colour from anywhere on the screen, like your picture on the piece" : "Pick a colour from your picture"}
            className={`grid size-10 place-items-center border-2 border-ink bg-sheet transition-transform hover:-translate-y-0.5 ${sampling ? "-translate-y-0.5 shadow-[3px_3px_0_#14215A]" : ""}`}
          >
            <span className="sr-only">Pick a colour from your picture</span>
            <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
              <path d="M14.5 4.5l5 5M17.5 2.5a2.1 2.1 0 0 1 3 3l-2.5 2.5-3-3z" fill="currentColor" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M15 6l3 3-9.5 9.5H5.5v-3z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              <path d="M3.5 21.5l2-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {sampling && pickFrom.length > 0 && <Sampler pictures={pickFrom} onPick={take} onClose={() => setSampling(false)} />}

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
