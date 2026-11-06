"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { categories, categoryOrder, COLOUR_TAGS, priceFor, defaultSelection, ownPrices, type CategoryId, type Product } from "@/data/catalog";
import { fitClass } from "@/components/products/shapes";
import { ProductArt } from "@/components/products/ProductArt";
import { useStore } from "@/components/store/StoreProvider";
import { Underline } from "@/components/marks/Marks";
import { money, priceText } from "@/lib/format";
import { ease } from "@/lib/motion";

const COLOURS = COLOUR_TAGS;

type Sort = "featured" | "price-asc" | "price-desc";

export function ShopIndex({ category }: { category?: CategoryId }) {
  const [colour, setColour] = useState<string | null>(null);
  const [customOnly, setCustomOnly] = useState(false);
  const [inStock, setInStock] = useState(false);
  const [sort, setSort] = useState<Sort>("featured");

  const { products, pricing } = useStore();
  const list = useMemo(() => {
    let l = products.filter((p) => !category || p.category === category);
    if (colour) l = l.filter((p) => p.tags.includes(colour));
    if (customOnly) l = l.filter((p) => p.customizable);
    if (inStock) l = l.filter((p) => p.available);
    // Products without a price yet go last either way
    const by = (p: Product, dir: 1 | -1) => {
      const price = priceFor(p, defaultSelection(p, pricing), pricing);
      return price == null ? Infinity : dir * price;
    };
    if (sort !== "featured") l = [...l].sort((a, b) => (sort === "price-asc" ? by(a, 1) - by(b, 1) : by(a, -1) - by(b, -1)));
    return l;
  }, [products, pricing, category, colour, customOnly, inStock, sort]);

  const cat = category ? categories[category] : null;
  const filtered = colour || customOnly || inStock;

  return (
    <div className="pb-24 pt-28 md:pt-36">
      <header className="gutter">
        <p className="type-label text-muted">{cat ? `Shop — ${cat.label}` : "Shop — Everything"}</p>
        <h1 className="type-display mt-3 text-[clamp(3rem,11vw,10rem)]">{cat ? cat.phrase : "The archive."}</h1>
        <p className="mt-5 max-w-xl text-lg leading-snug">
          {cat ? cat.intro : "Every design, on every object. Filter by colour, or head to the Lab to make one that isn’t here."}
        </p>
        {category === "stickers" && (
          <Link href="/stickers/studio" className="btn btn-mint mt-6">
            Try them on your laptop →
          </Link>
        )}
      </header>

      {/* category tabs */}
      <nav aria-label="Categories" className="gutter mt-10 border-y-2 border-ink">
        <ul className="no-scrollbar -mx-1 flex overflow-x-auto">
          {[{ href: "/shop", label: "All", active: !category }, ...categoryOrder.map((c) => ({ href: `/shop/${c}`, label: categories[c].label, active: category === c }))].map((t) => (
            <li key={t.href} className="shrink-0">
              <Link
                href={t.href}
                aria-current={t.active ? "page" : undefined}
                className={`type-condensed relative block px-3 py-4 text-xl md:px-5 md:text-2xl ${t.active ? "" : "text-muted hover:text-ink"}`}
              >
                {t.label}
                {t.active && <Underline className="absolute bottom-2 left-3 right-3 h-2.5 w-[calc(100%-1.5rem)] text-mint md:left-5 md:w-[calc(100%-2.5rem)]" strokeWidth={4} />}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* filters */}
      <div className="gutter flex flex-wrap items-center gap-x-6 gap-y-4 py-6">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by colour">
          <span className="type-label mr-1 text-muted">Colour</span>
          {COLOURS.map((c) => (
            <button key={c.id} type="button" className="chip" aria-pressed={colour === c.id} onClick={() => setColour(colour === c.id ? null : c.id)}>
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="chip" aria-pressed={customOnly} onClick={() => setCustomOnly((v) => !v)}>
            Customizable
          </button>
          <button type="button" className="chip" aria-pressed={inStock} onClick={() => setInStock((v) => !v)}>
            In stock
          </button>
        </div>
        <label className="ml-auto flex items-center gap-2">
          <span className="type-label text-muted">Sort</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="chip cursor-pointer pr-8">
            <option value="featured">Featured</option>
            <option value="price-asc">Price: low → high</option>
            <option value="price-desc">Price: high → low</option>
          </select>
        </label>
      </div>

      <p className="gutter type-label text-muted" aria-live="polite">
        {list.length} {list.length === 1 ? "design" : "designs"}
        {filtered && (
          <button
            type="button"
            className="ml-3 underline underline-offset-4 hover:text-ink"
            onClick={() => {
              setColour(null);
              setCustomOnly(false);
              setInStock(false);
            }}
          >
            Clear filters
          </button>
        )}
      </p>

      {list.length === 0 ? (
        <div className="gutter py-20 text-center">
          {filtered ? (
            <>
              <p className="type-display text-4xl">Nothing matches.</p>
              <p className="mt-3 text-muted">Try another colour — or make exactly what you had in mind.</p>
            </>
          ) : (
            <>
              <p className="type-display text-4xl">Designs on the way.</p>
              <p className="mt-3 text-muted">
                {cat ? `Our ${cat.label.toLowerCase()} designs are coming soon. ` : ""}Until then, upload your own design and see it on the product.
              </p>
            </>
          )}
          {category === "stickers" ? null : (
            <Link href={category ? `/lab?category=${category}` : "/lab"} className="btn btn-mint mt-6">
              Upload your design
            </Link>
          )}
        </div>
      ) : (
        <motion.ul layout className="gutter mt-8 grid grid-flow-dense grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4 md:gap-x-8 md:gap-y-14 xl:grid-cols-6">
          <AnimatePresence initial={false}>
            {list.map((p, i) => (
              <motion.li
                key={p.slug}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.35, ease: ease.snap }}
                className={tileSpan(p)}
              >
                <Tile product={p} n={i + 1} />
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}

      <aside className="gutter mt-24">
        <div className="flex flex-col items-start justify-between gap-6 border-2 border-ink bg-mint p-8 md:flex-row md:items-center md:p-10">
          <p className="type-display text-[clamp(2rem,5vw,3.5rem)]">{category === "stickers" ? "Where do they go?" : "Not seeing yours?"}</p>
          {category === "stickers" ? (
            <Link href="/stickers/studio" className="btn btn-ink">
              Try them on in the sticker studio →
            </Link>
          ) : (
            <Link href={category ? `/lab?category=${category}` : "/lab"} className="btn btn-ink">
              Design it in the Lab →
            </Link>
          )}
        </div>
      </aside>
    </div>
  );
}

function tileSpan(p: Product) {
  if (p.category === "sleeves" || p.category === "bags") return "col-span-2";
  if (p.category === "ruler-cases") return "col-span-1 row-span-2";
  return "col-span-1";
}

function Tile({ product: p, n }: { product: Product; n: number }) {
  const { pricing } = useStore();
  const tall = p.category === "ruler-cases";
  const wide = p.category === "sleeves" || p.category === "bags";
  const square = p.category === "stickers";
  // Sizes at different prices: show where they start
  const span = ownPrices(p);
  const fromPrice = span && span.min !== span.max ? span.min : null;
  // Pointing at a piece turns it round to its back
  const [turned, setTurned] = useState(false);
  return (
    <Link
      href={`/product/${p.slug}`}
      className="group block"
      onPointerEnter={(e) => e.pointerType === "mouse" && setTurned(true)}
      onPointerLeave={() => setTurned(false)}
    >
      <div className={`relative flex items-center justify-center overflow-hidden bg-fog transition-colors group-hover:bg-mint-soft ${tall ? "aspect-[1/2.1] px-[22%] py-[8%]" : wide ? "aspect-[4/3] p-[8%]" : square ? "aspect-square p-[14%]" : "aspect-[3/4] p-[12%]"}`}>
        <div className={`flex h-full items-center justify-center transition-transform duration-500 ease-[var(--ease-snap)] group-hover:-translate-y-1.5 group-hover:-rotate-1 ${fitClass(p.category) === "h-full" ? "" : "w-full"}`}>
          <ProductArt
            product={p}
            face={turned ? "back" : "front"}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className={fitClass(p.category)}
            label={p.name}
          />
        </div>
        {!p.available ? (
          <span className="sticker absolute left-3 top-3 -rotate-3">Sold out</span>
        ) : p.isNew ? (
          <span className="sticker absolute left-3 top-3 -rotate-3 bg-mint">New</span>
        ) : null}
        {p.customizable && p.available && (
          <span className="absolute bottom-3 right-3 bg-ink px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-mint opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            Customizable
          </span>
        )}
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted">
            No. {String(n).padStart(2, "0")} · {categories[p.category].singular}
          </p>
          <p className="type-condensed mt-1 text-2xl leading-none">
            <span className="relative">
              {p.name}
              <span className="absolute -bottom-1 left-0 h-0.5 w-full origin-left scale-x-0 bg-ink transition-transform duration-300 group-hover:scale-x-100" />
            </span>
          </p>
        </div>
        <p className="shrink-0 font-mono text-sm font-bold">{fromPrice ? `From ${money(fromPrice)}` : priceText(priceFor(p, defaultSelection(p, pricing), pricing))}</p>
      </div>
    </Link>
  );
}
