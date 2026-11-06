"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { categories, defaultSelection, priceFor } from "@/data/catalog";
import { ProductArt } from "@/components/products/ProductArt";
import { useStore } from "@/components/store/StoreProvider";
import { DrawnLine } from "@/components/line/DrawnLine";
import { CrownMark, SparkMark } from "@/components/marks/Marks";
import { priceText } from "@/lib/format";
import { SectionHead } from "./SectionHead";

/** Where each sticker lands on the lid: centre (% of the board), tilt, width (% of the board). */
const SLOTS = [
  { x: 17, y: 25, r: -12, w: 19 },
  { x: 41, y: 19, r: 8, w: 16 },
  { x: 64, y: 27, r: -5, w: 18 },
  { x: 86, y: 21, r: 14, w: 15 },
  { x: 25, y: 60, r: 10, w: 17 },
  { x: 51, y: 55, r: -8, w: 21 },
  { x: 77, y: 63, r: 6, w: 17 },
  { x: 11, y: 84, r: -18, w: 13 },
  { x: 37, y: 85, r: 4, w: 14 },
  { x: 62, y: 86, r: -14, w: 13 },
  { x: 89, y: 83, r: 18, w: 12 },
  { x: 90, y: 45, r: -3, w: 12 },
];

/**
 * "YOUR VIBE." — the stickers slapped onto a laptop lid one after another as
 * the section comes into view, each one lifting off when you point at it.
 * The sticker studio lets you try them on your own laptop, notebook or bottle.
 * Before the first stickers are published the lid shows drawn samples, so the
 * section is always there.
 */
export function StickerWall({ n }: { n: number }) {
  const { inCategory, pricing } = useStore();
  const all = inCategory("stickers");
  const items = all.slice(0, SLOTS.length);
  const empty = items.length === 0;
  const reduced = useReducedMotion() ?? false;

  /** The same slap-on and float for real stickers and the samples. */
  const motionFor = (i: number) => {
    const s = SLOTS[i];
    return {
      li: {
        style: { left: `${s.x}%`, top: `${s.y}%`, width: `calc(var(--k) * ${s.w}%)`, x: "-50%", y: "-50%" },
        initial: reduced ? (false as const) : { opacity: 0, scale: 1.9, rotate: s.r + 28 },
        whileInView: { opacity: 1, scale: 1, rotate: s.r },
        whileHover: { scale: 1.1, rotate: 0, zIndex: 20 },
        viewport: { once: true, amount: 0.4 },
        transition: { type: "spring" as const, stiffness: 420, damping: 17, delay: reduced ? 0 : 0.1 + i * 0.09 },
      },
      float: {
        animate: reduced ? undefined : { y: [0, -4, 0] },
        transition: { duration: 3 + (i % 4) * 0.6, repeat: Infinity, ease: "easeInOut" as const, delay: 1.4 + i * 0.2 },
      },
    };
  };

  return (
    <section className="relative overflow-hidden border-t-2 border-ink py-12 md:py-16" aria-labelledby="stickers-title">
      <SectionHead
        kicker={`${String(n).padStart(2, "0")} — Stickers`}
        title={categories.stickers.phrase}
        titleId="stickers-title"
        intro={categories.stickers.intro}
        href={empty ? "/stickers/studio" : "/shop/stickers"}
        linkLabel={empty ? "Sticker studio →" : `All stickers (${all.length}) →`}
      />

      <div className="gutter mt-8 grid items-center gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-14">
        {/* the lid */}
        <div
          className="relative aspect-[4/5] overflow-visible rounded-[28px] border-2 border-ink bg-deep [--k:1.45] sm:aspect-[16/10] sm:[--k:1]"
          style={{ backgroundImage: "radial-gradient(circle at 30% 20%, rgb(255 255 255 / 0.08), transparent 55%)" }}
        >
          <span aria-hidden className="absolute left-1/2 top-1/2 size-14 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/10" />
          {empty && <span className="sticker absolute -top-3 left-4 z-30">Samples · first drop soon</span>}
          <ul>
            {empty
              ? SAMPLES.map((sample, i) => {
                  const m = motionFor(i);
                  return (
                    <motion.li key={i} className="absolute" aria-hidden {...m.li}>
                      <motion.span className="block" {...m.float}>
                        <SampleSticker {...sample} />
                      </motion.span>
                    </motion.li>
                  );
                })
              : items.map((p, i) => {
                  const m = motionFor(i);
                  const price = priceFor(p, defaultSelection(p, pricing), pricing);
                  return (
                    <motion.li key={p.slug} className="absolute" {...m.li}>
                      <Link href={`/product/${p.slug}`} className="group relative block" aria-label={`${p.name}, ${priceText(price)}`}>
                        <motion.span className="block" {...m.float}>
                          <ProductArt
                            product={p}
                            sizes="(min-width: 1024px) 14vw, 30vw"
                            shadow="none"
                            className="die-cut w-full transition-[filter] group-hover:[filter:drop-shadow(2px_0_0_#fff)_drop-shadow(-2px_0_0_#fff)_drop-shadow(0_2px_0_#fff)_drop-shadow(0_-2px_0_#fff)_drop-shadow(0_18px_16px_rgb(0_0_0/0.45))]"
                          />
                        </motion.span>
                        <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap bg-mint px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-ink opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                          {p.name} · {priceText(price)}
                        </span>
                      </Link>
                    </motion.li>
                  );
                })}
          </ul>
        </div>

        <div>
          <p className="type-condensed text-[2rem] leading-none md:text-5xl">{empty ? "Stickers are dropping soon." : "Try before you stick."}</p>
          <p className="mt-4 max-w-md text-lg leading-snug">
            {empty
              ? "Our first sticker drop is on its way. When it lands, pick your laptop, notebook, bottle or phone in the sticker studio and try every layout before you order."
              : "Pick your laptop, notebook, bottle or phone in the sticker studio, drop the stickers on, move them around until it looks right, then add the whole set to your bag."}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/stickers/studio" className="btn btn-mint">
              Open the sticker studio
            </Link>
            {!empty && (
              <Link href="/shop/stickers" className="btn btn-paper">
                Shop stickers
              </Link>
            )}
          </div>
        </div>
      </div>
      <DrawnLine build={({ x0, h }) => `M${x0} 0V${h}`} />
    </section>
  );
}

type Sample = { kind: "pill" | "round" | "spark" | "crown" | "heart"; text?: string; bg: string; fg: string };

/** Stand-ins on the lid until the first stickers are published: drawn, not product photos. */
const SAMPLES: Sample[] = [
  { kind: "pill", text: "YOUR VIBE.", bg: "#3FE0AE", fg: "#14215A" },
  { kind: "spark", bg: "#FFD23F", fg: "#FFD23F" },
  { kind: "round", text: "CSTM", bg: "#F7A8C8", fg: "#14215A" },
  { kind: "heart", bg: "#D7263D", fg: "#D7263D" },
  { kind: "crown", bg: "#FFD23F", fg: "#FFD23F" },
  { kind: "pill", text: "STAY LOUD", bg: "#FBFBF9", fg: "#14215A" },
  { kind: "round", text: "100% YOU", bg: "#8FCBF2", fg: "#14215A" },
  { kind: "spark", bg: "#3FE0AE", fg: "#3FE0AE" },
  { kind: "pill", text: "ART MODE", bg: "#B9A6F2", fg: "#14215A" },
  { kind: "heart", bg: "#F7A8C8", fg: "#F7A8C8" },
  { kind: "round", text: "NEW", bg: "#FFD23F", fg: "#14215A" },
  { kind: "spark", bg: "#FBFBF9", fg: "#FBFBF9" },
];

const DIE_CUT = "drop-shadow(2px 0 0 #fff) drop-shadow(-2px 0 0 #fff) drop-shadow(0 2px 0 #fff) drop-shadow(0 -2px 0 #fff) drop-shadow(0 10px 10px rgb(0 0 0 / 0.4))";

function SampleSticker({ kind, text, bg, fg }: Sample) {
  if (kind === "pill" || kind === "round")
    return (
      <span
        className={`flex items-center justify-center whitespace-nowrap rounded-full border-[3px] border-white leading-none shadow-[0_10px_14px_rgb(0_0_0/0.4)] [container-type:inline-size] ${kind === "round" ? "aspect-square" : "aspect-[2.6/1]"}`}
        style={{ background: bg, color: fg, fontFamily: "var(--font-display)", fontWeight: 900 }}
      >
        <span style={{ fontSize: kind === "round" ? (text && text.length > 4 ? "17cqw" : "26cqw") : "14cqw" }}>{text}</span>
      </span>
    );
  return (
    <span className="block aspect-square" style={{ color: fg, filter: DIE_CUT }}>
      {kind === "spark" && <SparkMark className="size-full" />}
      {kind === "crown" && <CrownMark filled className="size-full" />}
      {kind === "heart" && (
        <svg viewBox="0 0 24 24" className="size-full" aria-hidden>
          <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.2 0 3.6 1.3 5.2 3.2 1.6-1.9 3-3.2 5.2-3.2 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21Z" fill="currentColor" />
        </svg>
      )}
    </span>
  );
}
