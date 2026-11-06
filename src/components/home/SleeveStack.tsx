"use client";

import { startTransition, useEffect, useState } from "react";
import { AnimatePresence, animate, motion, useMotionValue, type Easing } from "motion/react";
import { categories, productViews, type Product } from "@/data/catalog";
import { FlipButton, ProductArt, usePreloadArt } from "@/components/products/ProductArt";
import { useStore } from "@/components/store/StoreProvider";
import { BuyBox } from "@/components/products/BuyBox";
import { usePurchase } from "@/components/products/usePurchase";
import { PriceTag } from "@/components/products/PriceTag";
import { shapeRatio } from "@/components/products/shapes";
import { DrawnLine } from "@/components/line/DrawnLine";
import { FitName } from "@/components/products/FitName";
import { ease, spring } from "@/lib/motion";
import { SectionHead } from "./SectionHead";

/** Sleeve size on screen per laptop size, relative to the 15.6" one. */
const SIZE_SCALE: Record<string, number> = { "13": 0.86, "14": 0.92, "15": 1 };
const INCHES: Record<string, string> = { "13": "13″", "14": "14″", "15": "15.6″" };
/** How many sleeves show behind the one on top. */
const DEPTH = 4;
/** A loose pile: each sleeve sits a little askew. */
const TILT = [-4, 3, -2, 5, -3, 2];
const SHIFT = [-3, 4, -5, 2, 5, -2];
const SIZES = "(min-width: 1024px) 40vw, 80vw";

/**
 * "YOUR WORLD." — laptop sleeves in a loose pile, like records in a crate:
 * the one on top shows in full, the next ones peek out behind it. Flip
 * through with the arrows, a swipe or the list; the sleeve on top grows to
 * the laptop size picked, measured corner to corner like a laptop screen.
 */
export function SleeveStack({ n: sectionNo }: { n: number }) {
  const items = useStore().inCategory("sleeves");
  const n = items.length;
  const [index, setIndex] = useState(0);
  const [face, setFace] = useState<"front" | "back">("front");
  const active = items[index];
  const purchase = usePurchase(active);
  const colour = purchase.selection.colour;
  const size = purchase.selection.size ?? "15";
  const cat = categories.sleeves;
  usePreloadArt(items.slice(0, DEPTH + 2), SIZES);

  const go = (i: number) => {
    const next = ((i % n) + n) % n;
    if (next === index) return;
    // A transition: React renders the next piece in small slices, so the page keeps moving meanwhile
    startTransition(() => {
      setIndex(next);
      setFace("front");
    });
  };

  return (
    <section
      className="relative flex min-h-[calc(100svh-var(--header-h))] flex-col overflow-hidden bg-mint-soft pb-8 pt-6 md:pt-8 lg:min-h-[max(640px,calc(100svh-var(--header-h)))]"
      aria-labelledby="sleeves-title"
    >
      <SectionHead
        kicker={`${String(sectionNo).padStart(2, "0")} — ${cat.label}`}
        title={cat.phrase}
        titleId="sleeves-title"
        intro={cat.intro}
        href="/shop/sleeves"
        linkLabel={`All laptop sleeves (${n}) →`}
      />

      <div className="gutter relative z-10 mt-4 flex min-h-0 flex-1 flex-col gap-4 lg:mt-6 lg:grid lg:grid-cols-[200px_minmax(0,1fr)_360px] lg:gap-8 xl:grid-cols-[230px_minmax(0,1fr)_400px]">
        {/* the list, like the index of a record crate */}
        <ol className="no-scrollbar order-2 -mx-[var(--gutter)] flex gap-2 overflow-x-auto px-[var(--gutter)] lg:order-none lg:mx-0 lg:flex-col lg:justify-center lg:gap-0 lg:overflow-visible lg:px-0" aria-label="Choose a sleeve">
          {items.map((p, i) => {
            const on = i === index;
            return (
              <li key={p.slug} className="shrink-0">
                <button
                  type="button"
                  onClick={() => go(i)}
                  aria-current={on}
                  className={`flex w-full items-baseline gap-2.5 border-2 px-3 py-2 text-left transition-colors lg:border-0 lg:border-b lg:border-ink/15 lg:px-1 lg:py-1.5 ${
                    on ? "border-ink bg-sheet lg:bg-transparent" : "border-ink/15 hover:border-ink/40 lg:hover:bg-sheet/60"
                  }`}
                >
                  <span className={`font-mono text-[11px] font-bold ${on ? "text-ink" : "text-muted"}`}>{String(i + 1).padStart(2, "0")}</span>
                  <span className={`type-condensed whitespace-nowrap text-base leading-tight lg:truncate ${on ? "text-ink" : "text-ink/70"}`}>{p.name}</span>
                  {on && <motion.span layoutId="sleeve-pick" className="ml-auto hidden size-2.5 shrink-0 self-center rounded-full bg-mint ring-2 ring-ink lg:block" transition={spring} />}
                </button>
              </li>
            );
          })}
        </ol>

        {/* the pile */}
        <div className="relative order-1 flex min-h-0 flex-col lg:order-none">
          <div
            role="group"
            aria-roledescription="carousel"
            aria-label="Laptop sleeve designs"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                e.preventDefault();
                go(index + 1);
              } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                e.preventDefault();
                go(index - 1);
              }
            }}
            className="relative h-[clamp(250px,36svh,400px)] [container-type:size] lg:h-auto lg:min-h-[380px] lg:flex-1"
          >
            {items.map((p, i) => (
              <Card
                key={p.slug}
                product={p}
                depth={(i - index + n) % n}
                i={i}
                scale={SIZE_SCALE[size] ?? 1}
                colour={i === index ? colour : undefined}
                face={i === index ? face : "front"}
                onPick={() => go(i)}
                onSwipe={(d) => go(index + d)}
              />
            ))}
            <Diagonal inches={INCHES[size] ?? ""} scale={SIZE_SCALE[size] ?? 1} />
          </div>
          <div className="mt-2 flex items-center justify-center gap-3">
            <button type="button" className="btn btn-paper btn-sm" onClick={() => go(index - 1)} aria-label="Previous sleeve">
              ←
            </button>
            <p className="type-label min-w-[4.5rem] text-center" aria-live="polite">
              <span className="sr-only">{active.name}, </span>
              {String(index + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
            </p>
            <button type="button" className="btn btn-paper btn-sm" onClick={() => go(index + 1)} aria-label="Next sleeve">
              →
            </button>
            {productViews(active, colour).back && <FlipButton face={face} onFlip={() => setFace((f) => (f === "front" ? "back" : "front"))} />}
          </div>
        </div>

        {/* the label */}
        <div className="relative order-3 lg:order-none lg:flex lg:items-center">
          {/* the new label comes in over the old one: the section never changes height mid-swap */}
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.article
              key={active.slug}
              className="w-full border-2 border-ink bg-sheet p-4 shadow-[5px_5px_0_#14215A] md:p-6"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8, transition: { duration: 0.14 } }}
              transition={{ duration: 0.3, ease: ease.snap }}
              aria-label={`${active.name} details`}
            >
              <p className="type-label flex justify-between text-muted">
                <span>No. {String(index + 1).padStart(2, "0")}</span>
                <span>Laptop sleeve</span>
              </p>
              <div className="mt-2 flex items-baseline justify-between gap-4">
                <FitName name={active.name} className="type-condensed flex-1 pb-[0.06em] text-[2rem] leading-none md:text-5xl" />
                <PriceTag value={purchase.price} className="shrink-0 font-mono text-xl font-bold md:text-2xl" />
              </div>
              {active.blurb && <p className="mt-3 hidden leading-snug sm:block">{active.blurb}</p>}
              <div className="mt-4 border-t-2 border-dashed border-rule pt-4 md:mt-5 md:pt-5">
                <BuyBox product={active} purchase={purchase} compact />
              </div>
            </motion.article>
          </AnimatePresence>
        </div>
      </div>

      <DrawnLine build={({ x0, h }) => `M${x0} 0V${h}`} />
    </section>
  );
}

type Via = "pile" | "out" | "in";

/** Width of the sleeve on top: as wide as the pile allows, leaving room for the ones behind. */
const CARD_W = `min(88cqw, ${Math.round(shapeRatio("sleeves") * 72)}cqh)`;

function Card({
  product,
  depth,
  i,
  scale,
  colour,
  face,
  onPick,
  onSwipe,
}: {
  product: Product;
  depth: number;
  i: number;
  scale: number;
  colour?: string;
  face: "front" | "back";
  onPick: () => void;
  onSwipe: (d: 1 | -1) => void;
}) {
  const top = depth === 0;
  const shown = depth <= DEPTH;
  // How it got to this place: the one on top slides out to the right and is
  // tucked in at the back; one brought back from the back slides in the same way.
  const [track, setTrack] = useState<{ depth: number; via: Via }>({ depth, via: "pile" });
  if (track.depth !== depth) setTrack({ depth, via: track.depth === 0 ? "out" : top && track.depth > DEPTH ? "in" : "pile" });
  const via = track.depth === depth ? track.via : "pile";

  const pose = {
    x: top ? "0%" : `${SHIFT[i % SHIFT.length]}%`,
    y: top ? "0%" : `${-depth * 9}%`,
    scale: (top ? 1 : 1 - depth * 0.07) * scale,
    rotate: top ? 0 : TILT[i % TILT.length],
    opacity: shown ? 1 : 0,
  };
  // Stacking order follows the move: over the pile while it's out to the side, under it once tucked in
  const z = useMotionValue(20 - depth);
  useEffect(() => {
    const final = 20 - depth;
    if (via === "pile") {
      z.set(final);
      return;
    }
    const c = animate(z, via === "out" ? [40, 40, 1, final] : [1, 1, 40, final], { duration: 0.8, times: [0, 0.44, 0.46, 1], ease: "linear" });
    return () => c.stop();
  }, [depth, via, z]);
  const back = { x: `${SHIFT[i % SHIFT.length]}%`, y: `${-(DEPTH + 1) * 9}%`, scale: (1 - (DEPTH + 1) * 0.07) * scale, rotate: TILT[i % TILT.length] };
  const side = { x: "82%", y: "-6%", scale: 0.94 * scale, rotate: 10 };
  const target =
    via === "out"
      ? {
          x: ["0%", side.x, side.x, pose.x],
          y: ["0%", side.y, side.y, pose.y],
          scale: [scale, side.scale, side.scale, pose.scale],
          rotate: [0, side.rotate, side.rotate, pose.rotate],
          opacity: [1, 1, 1, pose.opacity],
        }
      : via === "in"
        ? {
            x: [back.x, side.x, side.x, "0%"],
            y: [back.y, side.y, side.y, "0%"],
            scale: [back.scale, side.scale, side.scale, scale],
            rotate: [back.rotate, side.rotate, side.rotate, 0],
            opacity: [0, 1, 1, 1],
          }
        : pose;
  const transition = via === "pile" ? spring : { duration: 0.8, times: [0, 0.42, 0.5, 1], ease: ["easeOut", "linear", "easeInOut"] as Easing[] };

  return (
    <motion.div
      className="absolute left-1/2 top-[56%] -translate-x-1/2 -translate-y-1/2"
      style={{ width: CARD_W, zIndex: z, pointerEvents: shown ? "auto" : "none" }}
      initial={false}
      animate={target}
      transition={transition}
      drag={top ? "x" : false}
      dragSnapToOrigin
      dragElastic={0.3}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={(_, info) => {
        if (info.offset.x < -60 || info.velocity.x < -450) onSwipe(1);
        else if (info.offset.x > 60 || info.velocity.x > 450) onSwipe(-1);
      }}
      onClick={() => !top && onPick()}
      aria-hidden={!top}
    >
      {/* the ones behind sit in the shade of the one on top */}
      <div
        className={`${top ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
        style={{ filter: top ? undefined : `brightness(${1 - Math.min(0.4, depth * 0.1)})` }}
      >
        <ProductArt product={product} colour={colour} face={face} eager={depth <= DEPTH} sizes={SIZES} label={top ? `${product.name} laptop sleeve` : undefined} />
      </div>
    </motion.div>
  );
}

/** Laptop sizes are measured corner to corner: so is the sleeve on top. */
function Diagonal({ inches, scale }: { inches: string; scale: number }) {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-[56%] z-30 -translate-x-1/2 -translate-y-1/2"
      style={{ width: CARD_W, aspectRatio: shapeRatio("sleeves") }}
      initial={false}
      animate={{ scale }}
      transition={spring}
    >
      <svg className="absolute inset-[3%] h-[94%] w-[94%] overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
        <line x1="2" y1="98" x2="98" y2="2" stroke="#3FE0AE" strokeWidth="2" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
        <circle cx="2" cy="98" r="1.4" fill="#3FE0AE" />
        <circle cx="98" cy="2" r="1.4" fill="#3FE0AE" />
      </svg>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={inches}
          className="absolute left-[76%] top-[24%] -translate-x-1/2 -translate-y-1/2 bg-ink px-2.5 py-1 font-mono text-sm font-bold text-mint"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.25 }}
        >
          {inches}
        </motion.span>
      </AnimatePresence>
    </motion.div>
  );
}
