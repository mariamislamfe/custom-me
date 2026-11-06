"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { LIMITS, type Customization, type DesignLayer } from "@/config/customization";
import type { CategoryId } from "@/data/catalog";
import { ProductMockup, printedText, textStyle } from "@/components/products/ProductMockup";
import { SHAPES } from "@/components/products/shapes";
import { clamp, normalizeAngle } from "@/lib/layers";

type Props = {
  category: CategoryId;
  custom: Customization;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdate: (id: string, patch: Partial<DesignLayer>) => void;
  onRemove: (id: string) => void;
  /** Layers still uploading or failed, by id (shown on the layer). */
  status?: Record<string, "uploading" | "error">;
  showArea: boolean;
  title: string;
};

export const layerTitle = (layer: DesignLayer) => (layer.kind === "image" ? `Your design “${layer.name}”` : `Text “${layer.text}”`);

/** Run a pointer gesture until release, with window-level listeners. */
function gesture(e: ReactPointerEvent, onMove: (ev: PointerEvent) => void, onEnd?: () => void) {
  e.preventDefault();
  e.stopPropagation();
  const move = (ev: PointerEvent) => onMove(ev);
  const end = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", end);
    window.removeEventListener("pointercancel", end);
    onEnd?.();
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", end);
  window.addEventListener("pointercancel", end);
}

const SNAP = 0.02;

/**
 * The product with the customer's layers on it, and a hit area over the
 * print area to move (drag), resize (corner knob) and rotate (top knob) each
 * layer. Positions are stored relative to the print area (see
 * config/customization.ts), so what you place here is what's printed.
 * Fills the box it's given; the Lab sizes that box to the product's shape.
 */
export function DesignCanvas({ category, custom, selectedId, onSelect, onUpdate, onRemove, status = {}, showArea, title }: Props) {
  const areaRef = useRef<HTMLDivElement>(null);
  const [guides, setGuides] = useState({ v: false, h: false });
  const [vw, vh] = SHAPES[category].vb;
  const [ax, ay, aw, ah] = SHAPES[category].art;

  const rect = () => areaRef.current!.getBoundingClientRect();

  const startMove = (e: ReactPointerEvent<HTMLDivElement>, layer: DesignLayer) => {
    if (e.button !== 0) return;
    onSelect(layer.id);
    e.currentTarget.focus({ preventScroll: true });
    const r = rect();
    const sx = e.clientX;
    const sy = e.clientY;
    gesture(
      e,
      (ev) => {
        let x = layer.x + (ev.clientX - sx) / r.width;
        let y = layer.y + (ev.clientY - sy) / r.height;
        const v = Math.abs(x - 0.5) < SNAP;
        const h = Math.abs(y - 0.5) < SNAP;
        if (v) x = 0.5;
        if (h) y = 0.5;
        setGuides({ v, h });
        onUpdate(layer.id, { x: clamp(x, 0, 1), y: clamp(y, 0, 1) });
      },
      () => setGuides({ v: false, h: false }),
    );
  };

  const centerOf = (layer: DesignLayer) => {
    const r = rect();
    return { cx: r.left + layer.x * r.width, cy: r.top + layer.y * r.height };
  };

  const startResize = (e: ReactPointerEvent, layer: DesignLayer) => {
    const { cx, cy } = centerOf(layer);
    const d0 = Math.max(8, Math.hypot(e.clientX - cx, e.clientY - cy));
    const s0 = layer.kind === "image" ? layer.width : layer.size;
    gesture(e, (ev) => {
      const f = Math.hypot(ev.clientX - cx, ev.clientY - cy) / d0;
      if (layer.kind === "image") onUpdate(layer.id, { width: clamp(s0 * f, ...LIMITS.imageWidth) });
      else onUpdate(layer.id, { size: clamp(s0 * f, ...LIMITS.textSize) });
    });
  };

  const startRotate = (e: ReactPointerEvent, layer: DesignLayer) => {
    const { cx, cy } = centerOf(layer);
    gesture(e, (ev) => {
      let a = (Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180) / Math.PI + 90;
      if (ev.shiftKey) a = Math.round(a / 15) * 15;
      else {
        const near = Math.round(a / 45) * 45;
        if (Math.abs(a - near) < 4) a = near;
      }
      onUpdate(layer.id, { rotation: normalizeAngle(a) });
    });
  };

  const onKey = (e: KeyboardEvent, layer: DesignLayer) => {
    const step = e.shiftKey ? 0.05 : 0.01;
    const grow = (f: number) =>
      layer.kind === "image"
        ? onUpdate(layer.id, { width: clamp(layer.width * f, ...LIMITS.imageWidth) })
        : onUpdate(layer.id, { size: clamp(layer.size * f, ...LIMITS.textSize) });
    const turn = e.shiftKey ? 15 : 5;
    const map: Record<string, () => void> = {
      ArrowLeft: () => onUpdate(layer.id, { x: clamp(layer.x - step, 0, 1) }),
      ArrowRight: () => onUpdate(layer.id, { x: clamp(layer.x + step, 0, 1) }),
      ArrowUp: () => onUpdate(layer.id, { y: clamp(layer.y - step, 0, 1) }),
      ArrowDown: () => onUpdate(layer.id, { y: clamp(layer.y + step, 0, 1) }),
      "+": () => grow(1.05),
      "=": () => grow(1.05),
      "-": () => grow(1 / 1.05),
      "[": () => onUpdate(layer.id, { rotation: normalizeAngle(layer.rotation - turn) }),
      "]": () => onUpdate(layer.id, { rotation: normalizeAngle(layer.rotation + turn) }),
      Delete: () => onRemove(layer.id),
      Backspace: () => onRemove(layer.id),
      Escape: () => onSelect(null),
    };
    const fn = map[e.key];
    if (fn) {
      e.preventDefault();
      fn();
    }
  };

  const pct = (v: number, of: number) => `${(v / of) * 100}%`;
  const knob = "grid size-8 place-items-center rounded-full bg-ink text-mint shadow-[0_2px_0_rgb(11_20_56/0.35)]";

  return (
    <div className="relative size-full">
      <ProductMockup category={category} artwork="plain" palette="navy-mint" custom={custom} label={title} className="absolute inset-0 size-full" />

      {/* Hit area, aligned to the print area */}
      <div
        ref={areaRef}
        className="absolute [container-type:inline-size]"
        style={{ left: pct(ax, vw), top: pct(ay, vh), width: pct(aw, vw), height: pct(ah, vh) }}
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) onSelect(null);
        }}
      >
        {showArea && <div aria-hidden className="print-area-box pointer-events-none absolute inset-0 border-2 border-dashed border-mint/80 mix-blend-difference" />}
        {guides.v && <div aria-hidden className="pointer-events-none absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-mint" />}
        {guides.h && <div aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-mint" />}

        {custom.layers.map((layer) => {
          const selected = layer.id === selectedId;
          const state = status[layer.id];
          return (
            <div
              key={layer.id}
              role="button"
              tabIndex={0}
              aria-pressed={selected}
              aria-label={`${layerTitle(layer)}. Drag to move.`}
              aria-describedby="canvas-keys"
              data-layer={layer.kind}
              onPointerDown={(e) => startMove(e, layer)}
              onFocus={() => onSelect(layer.id)}
              onKeyDown={(e) => onKey(e, layer)}
              className={`absolute cursor-move touch-none select-none outline-offset-4 focus-visible:shadow-none ${
                selected ? "z-10 outline-2 outline-mint" : "outline-1 outline-transparent hover:outline-ink/50"
              }`}
              style={{
                left: `${layer.x * 100}%`,
                top: `${layer.y * 100}%`,
                transform: `translate(-50%, -50%) rotate(${layer.rotation}deg)`,
                outlineStyle: selected ? "solid" : "dashed",
                ...(layer.kind === "image"
                  ? { width: `${layer.width * 100}%`, aspectRatio: `1 / ${layer.aspect}` }
                  : { ...textStyle(layer.font), fontSize: `${layer.size * 100}cqw`, lineHeight: 1, color: "transparent" }),
              }}
            >
              {layer.kind === "text" ? printedText(layer.font, layer.text) : null}
              {state && (
                <span
                  className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${state === "error" ? "bg-alert text-sheet" : "bg-ink text-mint"}`}
                  style={{ transform: `translate(-50%, -50%) rotate(${-layer.rotation}deg)` }}
                >
                  {state === "error" ? "Upload failed" : "Uploading…"}
                </span>
              )}
              {selected && (
                <>
                  {/* rotate knob */}
                  <span aria-hidden onPointerDown={(e) => startRotate(e, layer)} className="absolute bottom-full left-1/2 mb-1 flex -translate-x-1/2 cursor-grab flex-col items-center" style={{ fontSize: 16 }}>
                    <span className={knob}>
                      <svg viewBox="0 0 24 24" className="size-4">
                        <path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5" stroke="currentColor" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span className="h-4 w-0.5 bg-ink" />
                  </span>
                  {/* resize knob */}
                  <span aria-hidden onPointerDown={(e) => startResize(e, layer)} className={`absolute -bottom-4 -right-4 cursor-nwse-resize ${knob}`} style={{ fontSize: 16 }}>
                    <svg viewBox="0 0 24 24" className="size-4">
                      <path d="M7 17 17 7M11 7h6v6M13 17H7v-6" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  {/* remove */}
                  <button
                    type="button"
                    aria-label={`Remove ${layerTitle(layer)}`}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(layer.id);
                    }}
                    className="absolute -right-4 -top-4 grid size-8 place-items-center rounded-full bg-alert text-sheet shadow-[0_2px_0_rgb(11_20_56/0.35)]"
                    style={{ fontSize: 16 }}
                  >
                    <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden>
                      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
      <p id="canvas-keys" className="sr-only">
        Arrow keys move the layer, hold Shift for bigger steps. Plus and minus resize. Square brackets rotate. Delete removes it.
      </p>
    </div>
  );
}
