"use client";

import Link from "next/link";
import { categories, type CategoryId } from "@/data/catalog";
import { ProductMockup } from "@/components/products/ProductMockup";
import { fitClass } from "@/components/products/shapes";
import { DrawnLine } from "@/components/line/DrawnLine";
import { useStore } from "@/components/store/StoreProvider";
import { SectionHead } from "./SectionHead";

/**
 * A product type with no designs in the store yet (laptop sleeves, for now):
 * it keeps its place on the homepage, says plainly that designs are on the
 * way, and offers the Lab, where it can already be made with your own design.
 * The shape shown is a plain render, labelled as such, not a product photo.
 */
export function ComingShelf({ category, n }: { category: CategoryId; n: number }) {
  const cat = categories[category];
  const sizes = useStore().pricing.options[category].find((g) => g.id === "size");
  return (
    <section className="relative overflow-hidden border-t-2 border-ink py-12 md:py-16" aria-labelledby={`${category}-title`}>
      <SectionHead
        kicker={`${String(n).padStart(2, "0")} — ${cat.label}`}
        title={cat.phrase}
        titleId={`${category}-title`}
        intro={cat.intro}
        href={`/lab?category=${category}`}
        linkLabel="Design yours in the Lab →"
      />
      <div className="gutter mt-8 grid items-center gap-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:gap-14">
        <div className="drafting relative flex aspect-[4/3] items-center justify-center border-2 border-ink p-[8%]">
          <span className="sticker absolute left-3 top-3">Plain preview</span>
          <ProductMockup category={category} artwork="plain" palette="navy-mint" label={`Plain ${cat.singular.toLowerCase()} preview`} className={fitClass(category)} />
        </div>
        <div>
          <p className="type-condensed text-[2rem] leading-none md:text-5xl">Designs on the way.</p>
          <p className="mt-4 max-w-md text-lg leading-snug">
            Our {cat.singular.toLowerCase()} designs are coming soon. Until then, upload your own artwork and see it on the {cat.singular.toLowerCase()} before you order
            {sizes ? ` (${sizes.values.map((v) => v.label).join(", ")})` : ""}.
          </p>
          <Link href={`/lab?category=${category}`} className="btn btn-mint mt-6">
            Upload your design
          </Link>
        </div>
      </div>
      <DrawnLine build={({ x0, h }) => `M${x0} 0V${h}`} />
    </section>
  );
}
