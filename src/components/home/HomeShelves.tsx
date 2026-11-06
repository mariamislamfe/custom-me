"use client";

import { categoryOrder, type CategoryId } from "@/data/catalog";
import { lab } from "@/config/customization";
import { useStore } from "@/components/store/StoreProvider";
import { ProductWall } from "./ProductWall";
import { SleeveStack } from "./SleeveStack";
import { RulerShowcase } from "./RulerShowcase";
import { NotebookDesk } from "./NotebookDesk";
import { LabTeaser } from "./LabTeaser";
import { ComingShelf } from "./ComingShelf";
import { StickerWall } from "./StickerWall";

const SECTION: Record<CategoryId, (n: number) => React.ReactNode> = {
  bags: (n) => <ProductWall category="bags" n={n} />,
  sleeves: (n) => <SleeveStack n={n} />,
  "ruler-cases": (n) => <RulerShowcase n={n} />,
  notebooks: (n) => <NotebookDesk n={n} />,
  stickers: (n) => <StickerWall n={n} />,
};

/**
 * One section per product type, numbered in shop order. A type with no
 * designs published yet gets a short "designs on the way" shelf pointing to
 * the Lab (if the Lab makes it); stickers always show their wall. The Lab
 * teaser closes the run.
 */
export function HomeShelves() {
  const { inCategory } = useStore();
  // Stickers always keep their wall: with none published yet it shows sample stickers and the studio
  const always = (c: CategoryId) => c === "stickers";
  const shown = categoryOrder.filter((c) => inCategory(c).length > 0 || lab.categories.includes(c) || always(c));
  return (
    <>
      {shown.map((c, i) => (
        <div key={c} className="contents">
          {inCategory(c).length > 0 || always(c) ? SECTION[c](i + 1) : <ComingShelf category={c} n={i + 1} />}
        </div>
      ))}
      <LabTeaser n={shown.length + 1} />
    </>
  );
}
