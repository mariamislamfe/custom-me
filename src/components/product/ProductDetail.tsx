"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { categories, productViews, type Product, type ProductImage } from "@/data/catalog";
import { FlipButton, ProductArt } from "@/components/products/ProductArt";
import { fitClass } from "@/components/products/shapes";
import { useStore } from "@/components/store/StoreProvider";
import { BuyBox } from "@/components/products/BuyBox";
import { usePurchase } from "@/components/products/usePurchase";
import { CrownMark } from "@/components/marks/Marks";

export function ProductDetail({ product }: { product: Product }) {
  const purchase = usePurchase(product);
  const cat = categories[product.category];
  const related = useStore().inCategory(product.category).filter((p) => p.slug !== product.slug);

  return (
    <div className="pt-16 md:pt-[72px]">
      <div className="grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        {/* visual */}
        <div className="drafting relative flex h-[40svh] min-h-[260px] items-center justify-center overflow-hidden border-b-2 border-ink px-6 py-8 lg:min-h-0 lg:py-14 lg:sticky lg:top-[72px] lg:h-[calc(100dvh-72px)] lg:border-b-0 lg:border-r-2">
          {product.images.length > 0 ? (
            <Gallery key={purchase.selection.colour ?? ""} product={product} colour={purchase.selection.colour} />
          ) : (
            <ProductArt product={product} label={product.name} className={`rise-in ${fitClass(product.category) === "h-full" ? "h-[80%]" : "w-[min(88%,720px)]"}`} />
          )}
        </div>

        {/* info */}
        <div className="gutter py-6 lg:px-12 lg:py-14">
          <nav aria-label="Breadcrumb" className="type-label text-muted">
            <ol className="flex flex-wrap gap-2">
              <li>
                <Link href="/shop" className="hover:text-ink">
                  Shop
                </Link>{" "}
                /
              </li>
              <li>
                <Link href={`/shop/${product.category}`} className="hover:text-ink">
                  {cat.label}
                </Link>{" "}
                /
              </li>
              <li aria-current="page" className="text-ink">
                {product.name}
              </li>
            </ol>
          </nav>
          <h1 className={`type-display mt-3 lg:mt-6 [overflow-wrap:anywhere] ${product.name.length > 18 ? "text-[clamp(2rem,3.2vw,3.4rem)]" : "text-[clamp(2.3rem,4.2vw,4.4rem)]"}`}>{product.name}</h1>
          <p className="mt-3 font-mono text-xs font-bold uppercase tracking-wider text-muted">
            {cat.singular}
          </p>
          <p className="mt-4 max-w-md text-lg leading-snug lg:mt-6">{product.blurb}</p>

          <div className="mt-5 border-t-2 border-ink pt-5 lg:mt-8 lg:pt-8">
            <BuyBox product={product} purchase={purchase} showDetailsLink={false} />
          </div>

          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            <div>
              <p className="type-label text-muted">Details</p>
              <ul className="mt-3 space-y-2">
                {product.details.map((d) => (
                  <li key={d} className="flex gap-2">
                    <CrownMark draw={false} className="mt-1 h-3.5 w-4 shrink-0 text-mint" strokeWidth={9} />
                    {d}
                  </li>
                ))}
              </ul>
            </div>
            {product.customizable && (
              <div className="border-2 border-dashed border-ink/50 p-5">
                <p className="type-label">Make it yours</p>
                <p className="mt-2 text-sm leading-snug">Love this one but want it yours? Open it in the Lab and add your name, initials or your own art on top of it.</p>
                <Link href={purchase.customizeHref} className="btn btn-mint btn-sm mt-4">
                  Customize this design
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="gutter border-t-2 border-ink py-16 md:py-20" aria-labelledby="related-title">
          <div className="flex items-end justify-between gap-4">
            <h2 id="related-title" className="type-display text-[clamp(2rem,5vw,3.5rem)]">
              More {cat.label.toLowerCase()}
            </h2>
            <Link href={`/shop/${product.category}`} className="type-label shrink-0 underline decoration-2 underline-offset-4">
              See all →
            </Link>
          </div>
          <ul className="no-scrollbar -mx-[var(--gutter)] mt-8 flex snap-x gap-6 overflow-x-auto px-[var(--gutter)] pb-4">
            {related.map((p) => (
              <li key={p.slug} className={`shrink-0 snap-start ${p.category === "sleeves" || p.category === "bags" ? "w-[min(72vw,300px)]" : p.category === "ruler-cases" ? "w-[150px]" : "w-[200px]"}`}>
                <Link href={`/product/${p.slug}`} className="group block">
                  <div className={`flex items-center justify-center bg-fog p-5 transition-colors group-hover:bg-mint-soft ${fitClass(p.category) === "h-full" ? "h-[300px]" : ""}`}>
                    <ProductArt product={p} sizes="340px" className={fitClass(p.category)} />
                  </div>
                  <p className="type-condensed mt-3 text-xl">{p.name}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/**
 * Real photos for the chosen colour: the piece large, turning round to its
 * back; any other photos (a styled shot, a detail) fade in over it.
 */
function Gallery({ product, colour }: { product: Product; colour?: string }) {
  const { front, back, pool } = productViews(product, colour);
  const extras = pool.filter((i) => i !== front && i !== back);
  const [shown, setShown] = useState<"front" | "back" | number>("front");
  const extra = typeof shown === "number" ? extras[shown] : undefined;
  const face = shown === "back" ? "back" : "front";
  const thumbs: { img: ProductImage; view: "front" | "back" | number; label: string }[] = [
    { img: front, view: "front", label: "Front view" },
    ...(back ? [{ img: back, view: "back" as const, label: "Back view" }] : []),
    ...extras.map((img, k) => ({ img, view: k, label: `Photo ${k + 1}` })),
  ];
  const tall = fitClass(product.category) === "h-full";

  return (
    <div className="absolute inset-0 flex items-center justify-center px-6 pb-16 pt-8 lg:px-14 lg:pb-24 lg:pt-14">
      <AnimatePresence initial={false} mode="popLayout">
        {extra ? (
          <motion.div
            key={extra.src}
            className="absolute inset-0 px-6 pb-16 pt-8 lg:px-14 lg:pb-24 lg:pt-14"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.35 }}
          >
            <div className="relative size-full">
              <Image src={extra.src} alt={extra.alt || product.name} fill quality={90} sizes="(min-width: 1024px) 55vw, 100vw" className="object-contain" />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="piece"
            className={`rise-in flex items-center justify-center ${tall ? "h-full" : "w-[min(100%,760px)]"}`}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.35 }}
          >
            <ProductArt product={product} colour={colour} face={face} shadow="drop" preload label={product.name} sizes="(min-width: 1024px) 55vw, 100vw" className={tall ? "h-full max-w-full" : "w-full"} />
          </motion.div>
        )}
      </AnimatePresence>
      {back && !extra && (
        <FlipButton face={face} onFlip={() => setShown(face === "back" ? "front" : "back")} className="absolute right-4 top-4 z-10" />
      )}
      {thumbs.length > 1 && (
        <ul className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2" aria-label="Photos">
          {thumbs.map((t) => (
            <li key={t.img.src}>
              <button
                type="button"
                onClick={() => setShown(t.view)}
                aria-label={t.label}
                aria-current={t.view === shown}
                className={`relative block size-11 border-2 bg-sheet transition-colors lg:size-14 ${t.view === shown ? "border-ink" : "border-rule hover:border-ink"}`}
              >
                <Image src={t.img.src} alt="" fill sizes="56px" className="object-contain p-1" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
