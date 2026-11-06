"use client";

import Link from "next/link";
import { startTransition, useEffect, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { categories, type CategoryId, type Product } from "@/data/catalog";
import { ProductArt, usePreloadArt } from "@/components/products/ProductArt";
import { useStore } from "@/components/store/StoreProvider";
import { CrownMark } from "@/components/marks/Marks";
import { DrawnLine } from "@/components/line/DrawnLine";
import { ease } from "@/lib/motion";

/** The brand line's order: each phrase belongs to one product type. */
const ORDER: CategoryId[] = ["sleeves", "bags", "notebooks", "ruler-cases"];
const STEP_MS = 3800;
const SIZES = "(min-width: 1024px) 45vw, 90vw";
const TAB: Record<CategoryId, string> = { sleeves: "Sleeves", bags: "Art bags", notebooks: "Notebooks", "ruler-cases": "Ruler cases", stickers: "Stickers" };

/**
 * Hero: "YOUR ___." — the second word rolls through the brand line (world,
 * art, design, rulers) and each word brings its own object: a real piece
 * from that range on a mint disc with the crown over it, like the logo.
 * It turns on its own until you pick a range; every pass shows the next
 * design of each range.
 */
export function Hero() {
  const { inCategory } = useStore();
  const slots = ORDER.filter((c) => inCategory(c).length > 0);
  const root = useRef<HTMLElement>(null);
  const inView = useInView(root, { amount: 0.3 });
  const reduced = useReducedMotion() ?? false;
  const [turn, setTurn] = useState(0);
  // Always turning while on screen; picking a range just restarts the clock from there
  const playing = inView && !reduced && slots.length > 1;

  useEffect(() => {
    if (!playing) return;
    const id = window.setTimeout(() => startTransition(() => setTurn((t) => t + 1)), STEP_MS);
    return () => window.clearTimeout(id);
  }, [playing, turn]);

  const at = (t: number) => {
    const c = slots[t % slots.length];
    const items = inCategory(c);
    return { category: c, product: items[Math.floor(t / slots.length) % items.length] };
  };
  const pick = (k: number) => startTransition(() => setTurn((t) => Math.floor(t / slots.length) * slots.length + k));

  const n = slots.length;
  const now = n ? at(turn) : null;
  usePreloadArt(n ? [at(turn + 1).product] : [], SIZES);
  const word = now ? categories[now.category].phrase.replace(/^Your /i, "") : "world.";

  return (
    <section
      ref={root}
      className="hero-anim drafting relative overflow-hidden pb-10 pt-[calc(var(--header-h)+1.25rem)] lg:pt-[calc(var(--header-h)+2rem)]"
      aria-labelledby="hero-title"
    >
      {/* Phones: line, object, picker, copy. Wide screens: line, copy and picker on the left, the object on the right.
          At least a screen tall on wide screens, and taller rather than overlapping when the screen is short. */}
      <div className="gutter relative z-10 grid gap-y-5 [grid-template-areas:'line'_'stage'_'pick'_'copy'] lg:min-h-[max(560px,calc(100svh-var(--header-h)-4.5rem))] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:grid-rows-[auto_auto_1fr] lg:gap-x-12 lg:gap-y-7 lg:[grid-template-areas:'line_stage'_'copy_stage'_'pick_stage']">
        {/* the line */}
        <div className="[grid-area:line]">
          <p className="hero-fade type-label text-muted" style={{ "--d": "0s" } as CSSProperties}>
            Art bags <span aria-hidden>·</span> Laptop sleeves <span aria-hidden>·</span> T-ruler cases <span aria-hidden>·</span> Notebooks
          </p>
          <h1 id="hero-title" className="type-display mt-4 text-[clamp(3rem,15.5vw,6rem)] leading-[0.92] lg:mt-6 lg:text-[min(7.8vw,8.5rem)]">
            <span className="sr-only">Your world. Your art. Your design. Your rulers.</span>
            <span aria-hidden className="hero-word block">
              <span className="inline-block" style={{ "--d": "0.05s" } as CSSProperties}>
                Your
              </span>
            </span>
            <span aria-hidden className="relative block h-[1.08em] overflow-hidden">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={word}
                  className="relative inline-block"
                  initial={{ y: "105%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "-105%" }}
                  transition={{ duration: reduced ? 0 : 0.6, ease: ease.snap }}
                >
                  <span
                    className="absolute -inset-x-[0.05em] bottom-[0.1em] top-[0.42em] -z-10 origin-left -rotate-1 bg-mint"
                    style={{ animation: `swipe 0.55s var(--ease-ink) ${turn === 0 ? 0.6 : 0.2}s both` }}
                  />
                  {word}
                </motion.span>
              </AnimatePresence>
            </span>
          </h1>
        </div>

        {/* the object: on a mint disc with a navy ring printed a little off, and the crown on top */}
        <div className="hero-fade relative [grid-area:stage]" style={{ "--d": "0.25s" } as CSSProperties}>
          <div className="relative h-[clamp(250px,38svh,400px)] [container-type:size] lg:h-[calc(100%-2.5rem)]">
            <motion.div
              key={`disc-${turn}`}
              aria-hidden
              className="absolute left-1/2 top-1/2 aspect-square h-[min(86cqh,92cqw)] -translate-x-1/2 -translate-y-1/2"
              initial={reduced ? false : { scale: 0.92 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 14 }}
            >
              <span className="absolute inset-0 rounded-full bg-mint" />
              <span className="absolute inset-0 translate-x-[3%] translate-y-[2.5%] rounded-full border-[3px] border-ink" />
            </motion.div>
            <CrownMark key={`crown-${turn}`} delay={0.3} className="pointer-events-none absolute right-[12%] top-0 z-10 h-[14%] w-[17%] rotate-12 text-ink" strokeWidth={6} />
            <AnimatePresence mode="popLayout" initial={false}>
              {now && (
                <motion.div
                  key={now.product.slug}
                  className="absolute inset-0 flex items-center justify-center will-change-transform"
                  initial={{ opacity: 0, scale: 0.86, rotate: -5, y: 24 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, rotate: 5, y: -18 }}
                  transition={{ duration: reduced ? 0 : 0.6, ease: ease.snap }}
                >
                  <Link href={`/product/${now.product.slug}`} className="flex size-full items-center justify-center" aria-label={`${now.product.name}, ${categories[now.category].singular}`}>
                    <Piece product={now.product} first={turn === 0} />
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {now && (
            <Link href={`/product/${now.product.slug}`} className="type-label mt-2 flex items-center justify-center gap-2 whitespace-nowrap text-muted hover:text-ink">
              <span className="min-w-0 truncate text-ink">{now.product.name}</span>
              <span aria-hidden>·</span>
              {categories[now.category].singular} →
            </Link>
          )}
        </div>

        {/* the picker: one tab per range, showing the piece it would bring up */}
        {n > 1 && (
          <div className="hero-fade grid grid-cols-4 gap-2 [grid-area:pick] lg:gap-3 lg:self-end" role="group" aria-label="Show a product type" style={{ "--d": "0.6s" } as CSSProperties}>
            {slots.map((c, k) => {
              const on = k === turn % n;
              const shows = at(on ? turn : Math.floor(turn / n) * n + k).product;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => pick(k)}
                  aria-pressed={on}
                  className={`group relative border-t-2 pt-2 text-left transition-colors ${on ? "border-ink text-ink" : "border-ink/20 text-muted hover:text-ink"}`}
                >
                  {on && (
                    <span
                      key={turn}
                      aria-hidden
                      className="absolute -top-0.5 left-0 h-0.5 w-full origin-left bg-mint"
                      style={playing ? { animation: `hero-progress ${STEP_MS}ms linear both` } : undefined}
                    />
                  )}
                  {/* pictures only where the screen is tall enough to keep the hero on one screen */}
                  <span
                    className={`mb-2 hidden h-16 items-end transition duration-300 group-hover:-translate-y-1 xl:h-20 [@media(min-width:1024px)_and_(min-height:800px)]:flex ${on ? "" : "opacity-60 group-hover:opacity-100"}`}
                  >
                    <Thumb product={shows} />
                  </span>
                  <span className="block font-mono text-[11px] font-bold">{String(k + 1).padStart(2, "0")}</span>
                  <span className="type-condensed block text-base leading-tight md:text-xl">{TAB[c]}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* the copy */}
        <div className="flex flex-col gap-6 [grid-area:copy] md:flex-row md:items-end md:justify-between lg:flex-col lg:items-start">
          <p className="hero-fade max-w-md text-lg leading-snug md:text-xl" style={{ "--d": "0.7s" } as CSSProperties}>
            Everyday objects with original graphic designs. Carry ours, or put your own design on one in the Lab.
          </p>
          <div className="hero-fade flex flex-wrap items-center gap-4" style={{ "--d": "0.8s" } as CSSProperties}>
            <Link href="/shop" className="btn btn-ink">
              Shop the designs
            </Link>
            <Link href="/lab" className="btn btn-mint">
              Upload your design
            </Link>
          </div>
        </div>
      </div>

      <DrawnLine start="top top" end="bottom 70%" build={({ x0, h }) => `M${x0} ${h * 0.55} V${h}`} />
    </section>
  );
}

/** The piece as big as the stage allows; a T-ruler case lies across it, tilted. */
function Piece({ product, first }: { product: Product; first: boolean }) {
  // Only the very first piece is fetched ahead of everything; the next ones are preloaded while this one shows
  const load = first ? { preload: true } : { eager: true };
  const c = product.category;
  if (c === "ruler-cases") {
    return (
      <div className="relative aspect-[940/140] w-[92cqw] -rotate-[14deg] [container-type:size]">
        <div className="absolute left-1/2 top-1/2 h-[100cqw] w-[100cqh] -translate-x-1/2 -translate-y-1/2 -rotate-90">
          <ProductArt product={product} {...load} sizes="200px" shadow="none" className="size-full" />
        </div>
      </div>
    );
  }
  const box = c === "sleeves" ? "w-[min(86cqw,120cqh)]" : c === "bags" ? "h-[84cqh]" : "h-[78cqh]";
  return <ProductArt product={product} {...load} sizes={SIZES} className={`${box} max-h-[90cqh] max-w-[90cqw]`} />;
}

/** Small picture of a piece for the picker; a T-ruler case lies flat. */
function Thumb({ product }: { product: Product }) {
  if (product.category === "ruler-cases") {
    return (
      <span className="relative block aspect-[940/140] w-full -rotate-6 [container-type:size]">
        <span className="absolute left-1/2 top-1/2 block h-[100cqw] w-[100cqh] -translate-x-1/2 -translate-y-1/2 -rotate-90">
          <ProductArt product={product} sizes="40px" shadow="none" className="size-full" />
        </span>
      </span>
    );
  }
  return <ProductArt product={product} sizes="120px" shadow="none" className={product.category === "sleeves" ? "w-full max-w-28" : "h-full"} />;
}
