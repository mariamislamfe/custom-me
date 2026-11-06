"use client";

import { startTransition, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { categories, productViews } from "@/data/catalog";
import { FlipButton, ProductArt, usePreloadArt } from "@/components/products/ProductArt";
import { useStore } from "@/components/store/StoreProvider";
import { BuyBox } from "@/components/products/BuyBox";
import { usePurchase } from "@/components/products/usePurchase";
import { InkLoop } from "@/components/marks/Marks";
import { DrawnLine, loopAround } from "@/components/line/DrawnLine";
import { PriceTag } from "@/components/products/PriceTag";
import { FitName } from "@/components/products/FitName";
import { ease, spring } from "@/lib/motion";
import { SectionHead } from "./SectionHead";

const BOOK_SIZES = "(min-width: 1024px) 30vw, 50vw";

/**
 * "YOUR DESIGN." — loud covers, quiet pages. The selected notebook stands
 * on the desk; covers sit in a fanned stack under it, so the book, the
 * choice and the buy box share one screen.
 */
export function NotebookDesk({ n }: { n: number }) {
  const items = useStore().inCategory("notebooks");
  const [index, setIndex] = useState(0);
  const [face, setFace] = useState<"front" | "back">("front");
  // Which way the covers moved, so the new book slides in from that side
  const [dir, setDir] = useState(1);
  const active = items[index];
  const purchase = usePurchase(active);
  const colour = purchase.selection.colour;
  const paper = purchase.selection.paper ?? "lined";
  const size = purchase.selection.size ?? "a5";
  usePreloadArt(items, BOOK_SIZES);
  const pick = (i: number) => {
    if (i === index) return;
    // A transition: React renders the next piece in small slices, so the page keeps moving meanwhile
    startTransition(() => {
      setDir(i > index ? 1 : -1);
      setIndex(i);
      setFace("front");
    });
  };

  return (
    <section
      className="relative flex min-h-[calc(100svh-var(--header-h))] flex-col overflow-hidden bg-sheet pb-5 pt-6 md:pt-8 lg:h-[calc(100svh-var(--header-h))] lg:min-h-[640px] lg:pb-8"
      aria-labelledby="design-title"
    >
      <SectionHead
        kicker={`${String(n).padStart(2, "0")} — Notebooks`}
        title="Your design."
        titleId="design-title"
        titleAnchor="design-word"
        intro={categories.notebooks.intro}
        href="/shop/notebooks"
        linkLabel={`All notebooks (${items.length}) →`}
      />

      <div className="gutter relative z-10 mt-6 flex min-h-0 flex-1 flex-col gap-4 lg:mt-7 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12 xl:grid-cols-[minmax(0,1fr)_400px]">
        {/* the book + the covers */}
        <div className="drafting relative flex min-h-0 flex-col border-2 border-ink">
          <div className="relative h-[clamp(190px,27svh,320px)] [container-type:size] lg:h-auto lg:min-h-0 lg:flex-1">
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div className="relative w-[min(40cqw,56cqh)]" initial={false} animate={{ scale: size === "a4" ? 1.1 : 1 }} transition={spring}>
                <AnimatePresence mode="popLayout" initial={false} custom={dir}>
                  <motion.div
                    key={active.slug}
                    className="will-change-transform"
                    custom={dir}
                    variants={{
                      enter: (d: number) => ({ opacity: 0, x: `${d * 28}%`, rotate: d * 6 }),
                      center: { opacity: 1, x: 0, rotate: 0 },
                      exit: (d: number) => ({ opacity: 0, x: `${d * -22}%`, rotate: d * -5 }),
                    }}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={spring}
                  >
                    <ProductArt
                      product={active}
                      preload={index === 0}
                      colour={colour}
                      face={face}
                      sizes={BOOK_SIZES}
                      label={`${active.name} notebook`}
                    />
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            </div>
            <span className="sticker absolute left-3 top-3">
              {size.toUpperCase()} · {paper}
            </span>
            {productViews(active, colour).back && (
              <FlipButton face={face} onFlip={() => setFace((f) => (f === "front" ? "back" : "front"))} className="absolute bottom-3 right-3 z-10" />
            )}
          </div>

          <div className="flex items-center gap-4 border-t-2 border-dashed border-ink/30 px-4 pb-2 pt-4">
            <p className="type-label hidden shrink-0 text-muted sm:block">Covers</p>
            <ul className="flex items-end pl-2" aria-label="Notebook covers">
              {items.map((p, i) => {
                const sel = i === index;
                return (
                  <li key={p.slug} className="relative -ml-2 first:ml-0 sm:-ml-1" style={{ zIndex: sel ? 10 : i }}>
                    <motion.button
                      type="button"
                      onClick={() => pick(i)}
                      aria-pressed={sel}
                      aria-label={`${p.name}${p.available ? "" : " (sold out)"}`}
                      className="block w-11 sm:w-14"
                      initial={false}
                      animate={{ y: sel ? -8 : 0, rotate: sel ? 0 : (i - 2) * 4 }}
                      whileHover={{ y: -6 }}
                      transition={spring}
                    >
                      <ProductArt product={p} sizes="56px" eager />
                    </motion.button>
                    {sel && <InkLoop className="pointer-events-none absolute -inset-x-2.5 -bottom-2 -top-4 h-[calc(100%+24px)] w-[calc(100%+20px)] text-ink" strokeWidth={2.5} />}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* label + buy */}
        <div className="relative lg:flex lg:items-center">
          {/* the new label comes in over the old one: the section never changes height mid-swap */}
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={active.slug}
              className="w-full"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10, transition: { duration: 0.14 } }}
              transition={{ duration: 0.35, ease: ease.snap }}
            >
              <p className="type-label text-muted">
                No. {String(index + 1).padStart(2, "0")} · Notebook
              </p>
              <div className="mt-2 flex items-baseline justify-between gap-4">
                <FitName name={active.name} className="type-condensed flex-1 pb-[0.06em] text-[2rem] leading-none md:text-5xl" />
                <p className="shrink-0 font-mono text-xl font-bold md:text-2xl"><PriceTag value={purchase.price} /></p>
              </div>
              {active.blurb && <p className="mt-3 hidden max-w-md leading-snug sm:block">{active.blurb}</p>}
              <div className="mt-4 border-t-2 border-dashed border-rule pt-4 lg:mt-6 lg:pt-6">
                <BuyBox product={active} purchase={purchase} compact />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <DrawnLine
        build={({ x0, h, rect, mobile }) => {
          const r = rect("design-word");
          // On phones the title fills the width; there's no room to circle it.
          if (!r || mobile) return `M${x0} 0V${h}`;
          const cy = r.y + r.h / 2;
          const below = r.y + r.h + 26;
          return `M${x0} 0 L${x0} ${cy} ${loopAround({ x: r.x - 6, y: r.y + 8, w: r.w + 12, h: r.h - 16 }, 10)} C${x0 + 24} ${cy} ${x0} ${below} ${x0} ${below + 60} L${x0} ${h}`;
        }}
      />
    </section>
  );
}
