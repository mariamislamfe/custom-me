"use client";

import { startTransition, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { categories, productViews } from "@/data/catalog";
import { FlipButton, ProductArt, usePreloadArt } from "@/components/products/ProductArt";
import { useStore } from "@/components/store/StoreProvider";
import { BuyBox } from "@/components/products/BuyBox";
import { usePurchase } from "@/components/products/usePurchase";
import { PriceTag } from "@/components/products/PriceTag";
import { FitName } from "@/components/products/FitName";
import { InkLoop } from "@/components/marks/Marks";
import { DrawnLine } from "@/components/line/DrawnLine";
import { ease, spring } from "@/lib/motion";
import { SectionHead } from "./SectionHead";

/** Case length on screen per ruler length (cm), relative to the 100 cm case. */
const LENGTH_SCALE: Record<string, number> = { "60": 0.8, "80": 0.9, "100": 1 };
/** One photo size for the case on the stage, so switching designs reuses what's loaded. */
const CASE_SIZES = "(min-width: 1024px) 200px, 120px";

/**
 * "YOUR RULERS." — one T-ruler case at a time, as big as the screen allows:
 * lying flat across the stage on wide screens, standing on phones, with a
 * live dimension line at the length you pick. The other designs sit in a
 * rack of spines underneath; tap one, swipe the stage or use the arrows.
 */
export function RulerShowcase({ n: sectionNo }: { n: number }) {
  const items = useStore().inCategory("ruler-cases");
  const n = items.length;
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [face, setFace] = useState<"front" | "back">("front");
  const active = items[index];
  const purchase = usePurchase(active);
  const colour = purchase.selection.colour;
  const length = purchase.selection.length ?? "100";
  const scale = LENGTH_SCALE[length] ?? 1;
  usePreloadArt(items, CASE_SIZES);

  const go = (i: number) => {
    const next = ((i % n) + n) % n;
    if (next === index) return;
    // A transition: React renders the next piece in small slices, so the page keeps moving meanwhile
    startTransition(() => {
      setDir(i > index ? 1 : -1);
      setIndex(next);
      setFace("front");
    });
  };

  return (
    <section
      className="relative flex min-h-[calc(100svh-var(--header-h))] flex-col overflow-hidden bg-ink pb-6 pt-6 text-sheet md:pt-8"
      aria-labelledby="rulers-title"
    >
      <SectionHead
        dark
        kicker={`${String(sectionNo).padStart(2, "0")} — T-ruler cases`}
        title={
          <>
            Your rulers<span className="text-mint">.</span>
          </>
        }
        titleId="rulers-title"
        intro={categories["ruler-cases"].intro}
        href="/shop/ruler-cases"
        linkLabel={`All cases (${n}) →`}
      />

      <div className="relative z-10 mt-4 flex flex-1 flex-col lg:mt-6">
        {/* the stage */}
        <div
          role="group"
          aria-roledescription="carousel"
          aria-label="T-ruler case designs"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") {
              e.preventDefault();
              go(index + 1);
            } else if (e.key === "ArrowLeft") {
              e.preventDefault();
              go(index - 1);
            }
          }}
          className="relative h-[clamp(380px,60svh,600px)] overflow-hidden [container-type:size] lg:h-[clamp(270px,36svh,390px)]"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(ellipse 60% 55% at 50% 50%, rgb(63 224 174 / 0.16), rgb(63 224 174 / 0) 70%)" }}
          />
          <AnimatePresence mode="popLayout" initial={false} custom={dir}>
            <motion.div
              key={active.slug}
              custom={dir}
              className="absolute inset-0 flex cursor-grab touch-pan-y items-center justify-center will-change-transform active:cursor-grabbing"
              variants={{
                enter: (d: number) => ({ opacity: 0, x: `${d * 18}%` }),
                center: { opacity: 1, x: 0 },
                exit: (d: number) => ({ opacity: 0, x: `${d * -18}%` }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.45, ease: ease.snap }}
              drag="x"
              dragSnapToOrigin
              dragElastic={0.2}
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={(_, info) => {
                if (info.offset.x < -50 || info.velocity.x < -400) go(index + 1);
                else if (info.offset.x > 50 || info.velocity.x > 400) go(index - 1);
              }}
            >
              <motion.div className="relative" initial={false} animate={{ scale }} transition={spring}>
                {/* Phones: standing. Wide screens: the same case laid flat (turned a quarter). */}
                <div className="relative aspect-[140/940] h-[86cqh] [container-type:size] lg:aspect-[940/140] lg:h-auto lg:w-[min(90cqw,1250px,370cqh)]">
                  <div className="absolute inset-0 lg:inset-auto lg:left-1/2 lg:top-1/2 lg:h-[100cqw] lg:w-[100cqh] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:-rotate-90">
                    <ProductArt
                      product={active}
                      colour={colour}
                      face={face}
                      eager
                      sizes={CASE_SIZES}
                      shadow="none"
                      className="size-full"
                      label={`${active.name} T-ruler case`}
                    />
                  </div>
                  <Dimension length={length} />
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>
          {productViews(active, colour).back && (
            <FlipButton
              face={face}
              onFlip={() => setFace((f) => (f === "front" ? "back" : "front"))}
              tone="dark"
              className="absolute bottom-3 right-[var(--gutter)] z-10"
            />
          )}
        </div>

        {/* the rack */}
        <div className="gutter mt-2 flex items-center gap-3">
          <button type="button" className="btn btn-ghost btn-sm shrink-0 text-sheet" onClick={() => go(index - 1)} aria-label="Previous case">
            ←
          </button>
          <ul className="no-scrollbar flex min-w-0 flex-1 items-end gap-1 overflow-x-auto px-2 pb-2 pt-4 lg:justify-center" aria-label="Choose a case">
            {items.map((p, i) => {
              const sel = i === index;
              return (
                <li key={p.slug} className="relative shrink-0">
                  <motion.button
                    type="button"
                    onClick={() => go(i)}
                    aria-label={p.name}
                    aria-current={sel}
                    className="block px-3"
                    initial={false}
                    animate={{ y: sel ? -8 : 0, opacity: sel ? 1 : 0.6 }}
                    whileHover={{ y: -5, opacity: 1 }}
                    transition={spring}
                  >
                    <ProductArt product={p} sizes="60px" className="h-32 md:h-40" />
                  </motion.button>
                  {sel && <InkLoop className="pointer-events-none absolute -inset-x-1 -bottom-1 -top-3 h-[calc(100%+16px)] w-[calc(100%+8px)] text-mint" strokeWidth={2.5} />}
                </li>
              );
            })}
          </ul>
          <button type="button" className="btn btn-ghost btn-sm shrink-0 text-sheet" onClick={() => go(index + 1)} aria-label="Next case">
            →
          </button>
        </div>
        <p className="sr-only" aria-live="polite">
          {active.name}, design {index + 1} of {n}
        </p>

        {/* the label */}
        <div className="gutter relative mt-4 lg:mt-6">
          {/* the new label comes in over the old one: the section never changes height mid-swap */}
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={active.slug}
              className="grid gap-4 border-t border-sheet/20 pt-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:gap-12 lg:pt-6"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8, transition: { duration: 0.14 } }}
              transition={{ duration: 0.28, ease: ease.snap }}
            >
              <div>
                <p className="type-label text-sheet/60">
                  No. {String(index + 1).padStart(2, "0")} / {String(n).padStart(2, "0")} · T-ruler case
                </p>
                <div className="mt-2 flex items-baseline justify-between gap-4">
                  <FitName name={active.name} className="type-condensed flex-1 pb-[0.06em] text-[2rem] leading-none md:text-5xl" />
                  <PriceTag value={purchase.price} className="shrink-0 font-mono text-xl font-bold md:text-2xl" />
                </div>
                {active.blurb && <p className="mt-3 max-w-md leading-snug text-sheet/85">{active.blurb}</p>}
              </div>
              <BuyBox product={active} purchase={purchase} tone="dark" compact />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <DrawnLine
        tone="mint"
        width={2}
        build={({ x0, h, mobile }) => {
          const stepPx = 24;
          let d = `M${x0} 0`;
          for (let y = stepPx, i = 1; y < h; y += stepPx, i++) {
            const t = i % 10 === 0 ? (mobile ? 10 : 22) : i % 5 === 0 ? (mobile ? 7 : 14) : mobile ? 3 : 7;
            d += ` V${y} h${t} h${-t}`;
          }
          return `${d} V${h}`;
        }}
      />
    </section>
  );
}

/** The measuring line beside (phones) or under (wide screens) the case. */
function Dimension({ length }: { length: string }) {
  const label = (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span key={length} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="block">
        {length} CM
      </motion.span>
    </AnimatePresence>
  );
  return (
    <div aria-hidden className="pointer-events-none font-mono text-xs font-bold text-mint">
      {/* standing: to the right */}
      <div className="absolute inset-y-0 left-full ml-3 w-4 lg:hidden">
        <span className="absolute inset-x-0 top-0 h-0.5 bg-mint" />
        <span className="absolute bottom-0 left-[7px] top-0 w-0.5 bg-mint" />
        <span className="absolute inset-x-0 bottom-0 h-0.5 bg-mint" />
        <span className="absolute left-4 top-1/2 origin-left -translate-y-1/2 -rotate-90 whitespace-nowrap">{label}</span>
      </div>
      {/* laid flat: underneath */}
      <div className="absolute inset-x-0 top-full mt-4 hidden h-4 lg:block">
        <span className="absolute inset-y-0 left-0 w-0.5 bg-mint" />
        <span className="absolute left-0 right-0 top-[7px] h-0.5 bg-mint" />
        <span className="absolute inset-y-0 right-0 w-0.5 bg-mint" />
        <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap bg-ink px-2">{label}</span>
      </div>
    </div>
  );
}
