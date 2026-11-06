"use client";

import Link from "next/link";
import { useRef, useState, type DragEvent, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { defaultSelection, priceFor, selectionLabels } from "@/data/catalog";
import { ProductArt } from "@/components/products/ProductArt";
import { useStore } from "@/components/store/StoreProvider";
import { ColourPicker } from "@/components/lab/ColourPicker";
import { VisualRadio } from "@/components/lab/Swatches";
import { lab } from "@/config/customization";
import { MAX_QTY, productLineKey, useCart } from "@/lib/cart";
import { money, priceText } from "@/lib/format";
import { clamp, layerId, normalizeAngle } from "@/lib/layers";
import { ease } from "@/lib/motion";
import { SURFACE_ORDER, SURFACES, SurfaceArt, type SurfaceId } from "./surfaces";

/** A sticker on the surface: centre and width relative to the surface's sticker area. */
type Placed = { id: string; slug: string; x: number; y: number; size: number; rotation: number };

const MAX_STICKERS = 30;
const SIZE: [number, number] = [0.06, 0.9];

/** A random amount between −span/2 and span/2 (only ever called from event handlers). */
const jitter = (span: number) => (Math.random() - 0.5) * span;

/** Run a pointer gesture until release, with window-level listeners. */
function gesture(e: ReactPointerEvent, onMove: (ev: PointerEvent) => void) {
  e.preventDefault();
  e.stopPropagation();
  const end = () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", end);
    window.removeEventListener("pointercancel", end);
  };
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", end);
  window.addEventListener("pointercancel", end);
}

/**
 * Try stickers on before ordering: pick the object (in any colour), drop
 * stickers on it, move, resize and turn them, then add the whole set to the
 * bag in one go.
 */
export function StickerStudio() {
  const { inCategory, get, pricing } = useStore();
  const { add } = useCart();
  const stickers = inCategory("stickers");
  const [surface, setSurface] = useState<SurfaceId>("laptop");
  const [colours, setColours] = useState(() => Object.fromEntries(SURFACE_ORDER.map((s) => [s, SURFACES[s].colour])) as Record<SurfaceId, string>);
  const [placed, setPlaced] = useState<Placed[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const areaRef = useRef<HTMLDivElement>(null);

  const s = SURFACES[surface];
  const [vw, vh] = s.vb;
  const [ax, ay, aw, ah] = s.area;
  const pct = (v: number, of: number) => `${(v / of) * 100}%`;

  const update = (id: string, patch: Partial<Placed>) => setPlaced((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const remove = (id: string) => {
    setPlaced((list) => list.filter((p) => p.id !== id));
    setSelected((x) => (x === id ? null : x));
  };

  const place = (slug: string, at?: { x: number; y: number }) => {
    if (placed.length >= MAX_STICKERS) return;
    const p: Placed = {
      id: layerId(),
      slug,
      // Each new one lands a little off-centre and tilted, like a real one slapped on
      x: at?.x ?? clamp(0.5 + jitter(0.5), 0.1, 0.9),
      y: at?.y ?? clamp(0.5 + jitter(0.5), 0.1, 0.9),
      size: s.start,
      rotation: Math.round(jitter(30)),
    };
    setPlaced((list) => [...list, p]);
    setSelected(p.id);
    setAdded(false);
  };

  const rect = () => areaRef.current!.getBoundingClientRect();

  const startMove = (e: ReactPointerEvent<HTMLDivElement>, p: Placed) => {
    if (e.button !== 0) return;
    setSelected(p.id);
    e.currentTarget.focus({ preventScroll: true });
    // Picked up: it goes on top
    setPlaced((list) => [...list.filter((x) => x.id !== p.id), p]);
    const r = rect();
    const sx = e.clientX;
    const sy = e.clientY;
    gesture(e, (ev) => update(p.id, { x: clamp(p.x + (ev.clientX - sx) / r.width, 0, 1), y: clamp(p.y + (ev.clientY - sy) / r.height, 0, 1) }));
  };

  const centreOf = (p: Placed) => {
    const r = rect();
    return { cx: r.left + p.x * r.width, cy: r.top + p.y * r.height };
  };

  const startResize = (e: ReactPointerEvent, p: Placed) => {
    const { cx, cy } = centreOf(p);
    const d0 = Math.max(8, Math.hypot(e.clientX - cx, e.clientY - cy));
    gesture(e, (ev) => update(p.id, { size: clamp((p.size * Math.hypot(ev.clientX - cx, ev.clientY - cy)) / d0, ...SIZE) }));
  };

  const startRotate = (e: ReactPointerEvent, p: Placed) => {
    const { cx, cy } = centreOf(p);
    gesture(e, (ev) => {
      let a = (Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180) / Math.PI + 90;
      const near = Math.round(a / 45) * 45;
      if (Math.abs(a - near) < 4) a = near;
      update(p.id, { rotation: normalizeAngle(a) });
    });
  };

  const onKey = (e: KeyboardEvent, p: Placed) => {
    const step = e.shiftKey ? 0.05 : 0.01;
    const map: Record<string, () => void> = {
      ArrowLeft: () => update(p.id, { x: clamp(p.x - step, 0, 1) }),
      ArrowRight: () => update(p.id, { x: clamp(p.x + step, 0, 1) }),
      ArrowUp: () => update(p.id, { y: clamp(p.y - step, 0, 1) }),
      ArrowDown: () => update(p.id, { y: clamp(p.y + step, 0, 1) }),
      "+": () => update(p.id, { size: clamp(p.size * 1.06, ...SIZE) }),
      "=": () => update(p.id, { size: clamp(p.size * 1.06, ...SIZE) }),
      "-": () => update(p.id, { size: clamp(p.size / 1.06, ...SIZE) }),
      "[": () => update(p.id, { rotation: normalizeAngle(p.rotation - 5) }),
      "]": () => update(p.id, { rotation: normalizeAngle(p.rotation + 5) }),
      Delete: () => remove(p.id),
      Backspace: () => remove(p.id),
      Escape: () => setSelected(null),
    };
    const fn = map[e.key];
    if (fn) {
      e.preventDefault();
      fn();
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    const slug = e.dataTransfer.getData("text/x-sticker");
    if (!slug || !get(slug)) return;
    const r = rect();
    place(slug, { x: clamp((e.clientX - r.left) / r.width, 0, 1), y: clamp((e.clientY - r.top) / r.height, 0, 1) });
  };

  // What's on the surface, as bag lines
  const counts = new Map<string, number>();
  for (const p of placed) counts.set(p.slug, (counts.get(p.slug) ?? 0) + 1);
  const summary = [...counts].flatMap(([slug, qty]) => {
    const product = get(slug);
    if (!product) return [];
    const selection = defaultSelection(product, pricing);
    const price = priceFor(product, selection, pricing);
    return [{ product, selection, qty: Math.min(MAX_QTY, qty), price, orderable: product.available && price != null }];
  });
  const orderable = summary.filter((l) => l.orderable);
  const total = orderable.reduce((n, l) => n + l.qty * (l.price ?? 0), 0);

  const addAll = () => {
    for (const l of orderable) {
      add({
        key: productLineKey(l.product.slug, l.selection),
        kind: "product",
        slug: l.product.slug,
        name: l.product.name,
        category: l.product.category,
        unitPrice: l.price!,
        qty: l.qty,
        selection: l.selection,
        summary: selectionLabels(l.product, l.selection, pricing),
      });
    }
    setAdded(true);
  };

  return (
    <div className="lg:grid lg:min-h-[calc(100dvh-72px)] lg:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)]">
      {/* ── the surface ─────────────────────────────────────────── */}
      <div className="sticky top-16 z-20 border-b-2 border-ink bg-paper lg:top-[72px] lg:h-[calc(100dvh-72px)] lg:border-b-0 lg:border-r-2">
        <div className="drafting relative h-[46svh] min-h-[300px] overflow-hidden lg:h-full">
          <div className="absolute inset-x-4 bottom-10 top-12 [container-type:size] lg:inset-x-12 lg:bottom-14 lg:top-16">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={surface}
                className="absolute left-1/2 top-1/2"
                style={{ width: `min(100cqw, calc(100cqh * ${vw / vh}))`, aspectRatio: `${vw} / ${vh}`, x: "-50%", y: "-50%" }}
                initial={{ opacity: 0, scale: 0.92, rotate: -3 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.92, rotate: 3 }}
                transition={{ duration: 0.45, ease: ease.snap }}
              >
                <SurfaceArt id={surface} colour={colours[surface]} className="absolute inset-0 size-full" />
                <div
                  ref={areaRef}
                  className="absolute"
                  style={{ left: pct(ax, vw), top: pct(ay, vh), width: pct(aw, vw), height: pct(ah, vh) }}
                  onPointerDown={(e) => e.target === e.currentTarget && setSelected(null)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={onDrop}
                >
                  <AnimatePresence>
                    {placed.map((p) => {
                      const product = get(p.slug);
                      if (!product) return null;
                      const sel = p.id === selected;
                      return (
                        <motion.div
                          key={p.id}
                          role="button"
                          tabIndex={0}
                          aria-pressed={sel}
                          aria-label={`${product.name} sticker. Drag to move.`}
                          aria-describedby="studio-keys"
                          onPointerDown={(e) => startMove(e, p)}
                          onFocus={() => setSelected(p.id)}
                          onKeyDown={(e) => onKey(e, p)}
                          className={`absolute aspect-square cursor-move touch-none select-none outline-offset-4 ${sel ? "z-10 outline-2 outline-dashed outline-mint" : ""}`}
                          style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%`, width: `${p.size * 100}%`, x: "-50%", y: "-50%", rotate: p.rotation }}
                          initial={{ scale: 1.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.4, opacity: 0, transition: { duration: 0.2 } }}
                          transition={{ type: "spring", stiffness: 460, damping: 20 }}
                        >
                          <ProductArt product={product} sizes="(min-width: 1024px) 18vw, 40vw" shadow="none" className="die-cut pointer-events-none size-full" />
                          {sel && (
                            <>
                              <span aria-hidden onPointerDown={(e) => startRotate(e, p)} className="absolute bottom-full left-1/2 mb-1 flex -translate-x-1/2 cursor-grab flex-col items-center">
                                <span className="grid size-8 place-items-center rounded-full bg-ink text-mint shadow-[0_2px_0_rgb(11_20_56/0.35)]">
                                  <svg viewBox="0 0 24 24" className="size-4">
                                    <path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5" stroke="currentColor" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                </span>
                                <span className="h-3 w-0.5 bg-ink" />
                              </span>
                              <span
                                aria-hidden
                                onPointerDown={(e) => startResize(e, p)}
                                className="absolute -bottom-4 -right-4 grid size-8 cursor-nwse-resize place-items-center rounded-full bg-ink text-mint shadow-[0_2px_0_rgb(11_20_56/0.35)]"
                              >
                                <svg viewBox="0 0 24 24" className="size-4">
                                  <path d="M7 17 17 7M11 7h6v6M13 17H7v-6" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </span>
                              <button
                                type="button"
                                aria-label={`Peel off ${product.name}`}
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  remove(p.id);
                                }}
                                className="absolute -right-4 -top-4 grid size-8 place-items-center rounded-full bg-alert text-sheet shadow-[0_2px_0_rgb(11_20_56/0.35)]"
                              >
                                <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden>
                                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                </svg>
                              </button>
                            </>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
            <span className="sticker">Sticker studio</span>
            {placed.length > 0 && (
              <button
                type="button"
                className="sticker hover:bg-mint-soft"
                onClick={() => {
                  setPlaced([]);
                  setSelected(null);
                }}
              >
                Peel them all off
              </button>
            )}
          </div>
          <p className="absolute bottom-2 left-3 right-3 font-mono text-[10px] text-muted lg:bottom-3 lg:text-[11px]">
            {placed.length ? "Drag to move · corner to resize · top knob to turn" : "Tap a sticker (or drag it here) to stick it on."}
          </p>
          <p id="studio-keys" className="sr-only">
            Arrow keys move the sticker, plus and minus resize it, square brackets turn it, Delete peels it off.
          </p>
        </div>
      </div>

      {/* ── controls ────────────────────────────────────────────── */}
      <div className="px-[var(--gutter)] py-8 pb-32 lg:px-10 lg:py-10 lg:pb-10">
        <p className="type-label text-muted">Try before you stick</p>
        <h2 className="type-display mt-2 text-[clamp(2rem,4vw,3rem)]">Your setup.</h2>
        <p className="mt-2 max-w-md text-muted">Pick what they go on and its colour, then tap stickers to slap them on. Move them around until it looks right.</p>

        <div className="mt-8 space-y-8">
          <VisualRadio<SurfaceId>
            label="Stick them on"
            options={SURFACE_ORDER}
            value={surface}
            onChange={setSurface}
            getLabel={(id) => SURFACES[id].label}
            className="grid grid-cols-4 gap-3"
            itemClassName="group"
            render={(id, sel) => (
              <span className={`flex h-full flex-col items-center gap-2 border-2 p-2 transition-colors ${sel ? "border-ink bg-mint-soft" : "border-rule bg-sheet group-hover:border-ink"}`}>
                <span className="flex h-16 w-full items-center justify-center">
                  <SurfaceArt id={id} colour={colours[id]} className="max-h-full max-w-full" />
                </span>
                <span className="text-center font-mono text-[10px] font-bold uppercase leading-tight tracking-wider">{SURFACES[id].label}</span>
              </span>
            )}
          />

          <ColourPicker
            label={`${SURFACES[surface].label} colour`}
            value={colours[surface]}
            onChange={(hex) => setColours((c) => ({ ...c, [surface]: hex }))}
            swatches={[{ label: "Silver", hex: "#C9CED8" }, { label: "Space gray", hex: "#5B606B" }, ...lab.baseSwatches.slice(0, 9)]}
          />

          <div>
            <p className="type-label mb-3 text-muted">Stickers {placed.length >= MAX_STICKERS && `· ${MAX_STICKERS} is the most at once`}</p>
            {stickers.length === 0 ? (
              <p className="border-2 border-dashed border-ink/50 p-5 text-muted">Our stickers are on their way. Check back soon.</p>
            ) : (
              <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {stickers.map((p) => (
                  <li key={p.slug}>
                    <button
                      type="button"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/x-sticker", p.slug);
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => place(p.slug)}
                      disabled={placed.length >= MAX_STICKERS}
                      className="group flex w-full flex-col items-center gap-1.5 border-2 border-rule bg-sheet p-2 transition-colors hover:border-ink disabled:opacity-40"
                      aria-label={`Stick ${p.name} on`}
                    >
                      <span className="block aspect-square w-full p-1 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105">
                        <ProductArt product={p} sizes="120px" shadow="none" className="die-cut size-full" />
                      </span>
                      <span className="w-full truncate text-center text-xs font-semibold">{p.name}</span>
                      <span className="font-mono text-[10px] text-muted">{priceText(priceFor(p, defaultSelection(p, pricing), pricing))}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {summary.length > 0 && (
            <div className="border-2 border-ink bg-sheet p-5 shadow-[5px_5px_0_#14215A]">
              <p className="type-label">On your {SURFACES[surface].label.toLowerCase()}</p>
              <ul className="mt-3 divide-y divide-rule">
                {summary.map((l) => (
                  <li key={l.product.slug} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0 truncate">
                      {l.product.name} <span className="text-muted">× {l.qty}</span>
                    </span>
                    <span className="shrink-0 font-mono">{l.orderable ? money(l.qty * l.price!) : l.product.available ? "Price soon" : "Sold out"}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-baseline justify-between border-t-2 border-ink pt-3">
                <span className="type-label">Total</span>
                <span className="font-mono text-xl font-bold">{money(total)}</span>
              </div>
              <p className="mt-2 text-xs text-muted">Each sticker comes in its first size; pick another on its own page.</p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button type="button" className="btn btn-ink" onClick={addAll} disabled={!orderable.length}>
                  Add {orderable.reduce((n, l) => n + l.qty, 0)} to bag
                </button>
                {added && (
                  <Link href="/checkout" className="btn btn-mint btn-sm">
                    Checkout
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

