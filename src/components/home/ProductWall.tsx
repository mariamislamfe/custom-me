"use client";

import { startTransition, useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring } from "motion/react";
import { categories, productViews, type Product } from "@/data/catalog";
import { PALETTES } from "@/components/art/artworks";
import { FlipButton, ProductArt } from "@/components/products/ProductArt";
import { shapeRatio } from "@/components/products/shapes";
import { useStore } from "@/components/store/StoreProvider";
import { BuyBox } from "@/components/products/BuyBox";
import { usePurchase } from "@/components/products/usePurchase";
import { InkLoop } from "@/components/marks/Marks";
import { DrawnLine, roundedPolyline } from "@/components/line/DrawnLine";
import { PriceTag } from "@/components/products/PriceTag";
import { FitName } from "@/components/products/FitName";
import { ease, spring } from "@/lib/motion";
import { SectionHead } from "./SectionHead";

/**
 * Art bags ("YOUR ART.") and laptop sleeves ("YOUR WORLD.") hung like an
 * exhibition wall, sized so the piece, the design picker and the buy box
 * share one screen.
 * One piece in the spotlight, neighbours visible at the edges, a colour block
 * and a giant outlined title that change with each design, and a gallery
 * wall label with the buying details.
 */
export function ProductWall({ category, n }: { category: "bags" | "sleeves"; n: number }) {
  const items = useStore().inCategory(category);
  const cat = categories[category];
  const singular = cat.singular.toLowerCase();
  // The piece fills the stage width, or its height for upright pieces like bags
  const width = `min(74cqw, ${Math.round(shapeRatio(category) * 77)}cqh, 700px)`;
  const [index, setIndex] = useState(0);
  const [face, setFace] = useState<"front" | "back">("front");
  const active = items[index];
  const purchase = usePurchase(active);
  const colour = purchase.selection.colour;
  const pal = PALETTES[active.palette];
  const count = items.length;
  // Every new piece arrives facing front
  const go = (i: number) => {
    // A transition: React renders the next piece in small slices, so the page keeps moving meanwhile
    startTransition(() => {
      setIndex(Math.max(0, Math.min(count - 1, i)));
      setFace("front");
    });
  };

  return (
    <section
      className="relative flex min-h-[calc(100svh-var(--header-h))] flex-col overflow-hidden pb-5 pt-6 md:pt-8 lg:h-[calc(100svh-var(--header-h))] lg:min-h-[640px] lg:pb-8"
      aria-labelledby={`${category}-title`}
    >
      <SectionHead
        kicker={`${String(n).padStart(2, "0")} — ${cat.label}`}
        title={cat.phrase}
        titleId={`${category}-title`}
        intro={cat.intro}
        href={`/shop/${category}`}
        linkLabel={`All ${cat.label.toLowerCase()} (${count}) →`}
      />

      <div
        data-anchor="wall"
        className="relative z-10 mt-5 flex min-h-0 flex-1 flex-col gap-3 lg:mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-0 lg:pr-[var(--gutter)] xl:grid-cols-[minmax(0,1fr)_400px]"
      >
        {/* stage + picker */}
        <div
          className="flex min-h-0 min-w-0 flex-col"
          role="group"
          aria-roledescription="carousel"
          aria-label={`${cat.singular} designs`}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") {
              e.preventDefault();
              go(index + 1);
            }
            if (e.key === "ArrowLeft") {
              e.preventDefault();
              go(index - 1);
            }
          }}
        >
          <div className="relative h-[clamp(190px,27svh,300px)] overflow-hidden [container-type:size] lg:h-auto lg:min-h-0 lg:flex-1">
            {/* giant outlined title */}
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.p
                key={active.slug}
                aria-hidden
                className="type-display pointer-events-none absolute left-0 top-[4%] whitespace-nowrap pl-[var(--gutter)] text-[min(16vw,30cqh)] text-transparent"
                style={{ WebkitTextStroke: "2px #C9CED8", willChange: "transform" }}
                initial={{ x: "12%", opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: "-12%", opacity: 0 }}
                transition={{ duration: 0.7, ease: ease.snap }}
              >
                {active.name}
              </motion.p>
            </AnimatePresence>

            {/* colour block — the design's own ink, offset like a misregistered print */}
            <motion.div
              aria-hidden
              className="absolute left-1/2 top-1/2 -translate-x-[46%] -translate-y-[44%]"
              style={{ width, aspectRatio: shapeRatio(category), willChange: "transform" }}
              animate={{
                backgroundColor: pal.ink === "#FBFBF9" ? "#3FE0AE" : pal.ink,
                rotate: [-5, 4, -3, 6, -4, 3][index % 6],
              }}
              transition={spring}
            />

            <Track index={index} items={items} onSelect={go} width={width} singular={singular} face={face} colour={colour} />
            {productViews(active, colour).back && (
              <FlipButton face={face} onFlip={() => setFace((f) => (f === "front" ? "back" : "front"))} className="absolute bottom-2 right-[var(--gutter)] z-20 lg:right-4" />
            )}
          </div>

          <div className="gutter flex items-center gap-3 md:gap-4">
            <div className="flex shrink-0 gap-2">
              <button type="button" className="btn btn-paper btn-sm" onClick={() => go(index - 1)} disabled={index === 0} aria-label={`Previous ${singular}`}>
                ←
              </button>
              <button type="button" className="btn btn-paper btn-sm" onClick={() => go(index + 1)} disabled={index === count - 1} aria-label={`Next ${singular}`}>
                →
              </button>
            </div>
            <ul className="no-scrollbar flex min-w-0 gap-3 overflow-x-auto px-2 py-3" aria-label="Choose a design">
              {items.map((p, i) => (
                <li key={p.slug} className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => go(i)}
                    aria-label={p.name}
                    aria-current={i === index}
                    className="block w-14 p-1 transition-transform hover:-translate-y-0.5 md:w-20"
                  >
                    <ProductArt product={p} sizes="80px" />
                  </button>
                  {i === index && <InkLoop className="pointer-events-none absolute -inset-1.5 h-[calc(100%+12px)] w-[calc(100%+12px)] text-ink" strokeWidth={2.5} />}
                </li>
              ))}
            </ul>
          </div>
          <p className="sr-only" aria-live="polite">
            {active.name}, design {index + 1} of {count}
          </p>
        </div>

        {/* wall label */}
        <div className="gutter relative lg:flex lg:items-center lg:px-0">
          {/* the new label comes in over the old one: the section never changes height mid-swap */}
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={active.slug}
              className="w-full"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10, transition: { duration: 0.14 } }}
              transition={{ duration: 0.35, ease: ease.snap }}
            >
              <Placard product={active} purchase={purchase} index={index} total={count} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <DrawnLine
        build={({ x0, h, rect }) => {
          const r = rect("wall");
          if (!r) return `M${x0} 0V${h}`;
          const top = r.y - 10;
          const bottom = r.y + r.h + 12;
          const right = r.x + r.w - 6;
          return roundedPolyline(
            [
              [x0, 0],
              [x0, top],
              [right, top],
              [right, bottom],
              [x0, bottom],
              [x0, h],
            ],
            24,
          );
        }}
      />
    </section>
  );
}

function Track({
  index,
  items,
  onSelect,
  width,
  singular,
  face,
  colour,
}: {
  index: number;
  items: Product[];
  onSelect: (i: number) => void;
  width: string;
  singular: string;
  face: "front" | "back";
  colour?: string;
}) {
  return (
    <motion.div
      className="absolute inset-0 cursor-grab touch-pan-y active:cursor-grabbing"
      drag="x"
      dragSnapToOrigin
      dragElastic={0.25}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={(_, info) => {
        if (info.offset.x < -60 || info.velocity.x < -500) onSelect(index + 1);
        else if (info.offset.x > 60 || info.velocity.x > 500) onSelect(index - 1);
      }}
      style={{ perspective: 1400 }}
    >
      {items.map((p, i) => {
        const off = i - index;
        const abs = Math.abs(off);
        // Too far away to show: not rendered at all, so the list can grow
        if (abs > 3) return null;
        return (
          <motion.div
            key={p.slug}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ width, zIndex: 10 - abs, pointerEvents: abs > 1 ? "none" : "auto" }}
            initial={false}
            animate={{
              x: `${off * 92}%`,
              scale: off === 0 ? 1 : 0.64,
              rotateY: off * -22,
              rotate: off * 2,
              opacity: abs > 1 ? 0 : off === 0 ? 1 : 0.7,
            }}
            transition={spring}
            onClick={() => off !== 0 && onSelect(i)}
            aria-hidden={off !== 0}
          >
            {/* The same element and photo size whether in front or to the side, so a
                piece that slides into the spotlight keeps its loaded photo. */}
            <Tilt on={off === 0}>
              <ProductArt
                product={p}
                preload={i === 0}
                eager={abs <= 2}
                label={off === 0 ? `${p.name} ${singular}` : undefined}
                colour={off === 0 ? colour : undefined}
                face={off === 0 ? face : "front"}
                sizes="(min-width: 1024px) 50vw, 75vw"
              />
            </Tilt>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

/** Subtle pointer tilt — only for fine pointers and the piece in front; touch gets nothing. */
function Tilt({ on, children }: { on: boolean; children: React.ReactNode }) {
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 180, damping: 20 });
  const sry = useSpring(ry, { stiffness: 180, damping: 20 });
  const fine = useRef(false);
  useEffect(() => {
    fine.current = window.matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)").matches;
  }, []);
  useEffect(() => {
    if (on) return;
    rx.set(0);
    ry.set(0);
  }, [on, rx, ry]);
  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (!fine.current || !on) return;
    const r = e.currentTarget.getBoundingClientRect();
    ry.set(((e.clientX - r.left) / r.width - 0.5) * 10);
    rx.set(-((e.clientY - r.top) / r.height - 0.5) * 8);
  };
  return (
    <motion.div
      onPointerMove={onMove}
      onPointerLeave={() => {
        rx.set(0);
        ry.set(0);
      }}
      style={{ rotateX: srx, rotateY: sry, transformPerspective: 1200 }}
    >
      {children}
    </motion.div>
  );
}

function Placard({ product, purchase, index, total }: { product: Product; purchase: ReturnType<typeof usePurchase>; index: number; total: number }) {
  return (
    <article className="border-2 border-ink bg-sheet p-4 shadow-[5px_5px_0_#14215A] md:p-6" aria-label={`${product.name} details`}>
      <p className="type-label flex justify-between text-muted">
        <span>
          No. {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </span>
        <span>{categories[product.category].singular}</span>
      </p>
      <div className="mt-2 flex items-baseline justify-between gap-4">
        <FitName name={product.name} className="type-condensed flex-1 pb-[0.06em] text-[2rem] leading-none md:text-5xl" />
        <p className="shrink-0 font-mono text-xl font-bold md:text-2xl"><PriceTag value={purchase.price} /></p>
      </div>
      {product.blurb && <p className="mt-3 hidden leading-snug sm:block">{product.blurb}</p>}
      <div className="mt-4 border-t-2 border-dashed border-rule pt-4 md:mt-5 md:pt-5">
        <BuyBox product={product} purchase={purchase} compact />
      </div>
    </article>
  );
}
