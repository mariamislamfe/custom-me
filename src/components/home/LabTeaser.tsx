"use client";

import Link from "next/link";
import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { PALETTES, type PaletteId } from "@/components/art/artworks";
import { categories, type CategoryId } from "@/data/catalog";
import { lab, type Customization } from "@/config/customization";
import { ProductMockup } from "@/components/products/ProductMockup";
import { fitClass } from "@/components/products/shapes";
import { handOff } from "@/components/lab/handoff";
import { DrawnLine, roundedPolyline } from "@/components/line/DrawnLine";
import { prepareUpload } from "@/lib/image";
import { newImageLayer, type PreparedImage } from "@/lib/layers";
import { ease } from "@/lib/motion";

const QUICK: PaletteId[] = ["navy-mint", "white-navy", "gray-navy", "ink-mint"];

/**
 * A working mini-lab on the home page: drop a design on a product, see it
 * there, carry it (the file itself) into /lab to place it and order.
 */
export function LabTeaser({ n }: { n: number }) {
  const [design, setDesign] = useState<{ file: File; image: PreparedImage } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const [palette, setPalette] = useState<PaletteId>("navy-mint");
  const [category, setCategory] = useState<CategoryId>(lab.categories[0]);
  const input = useRef<HTMLInputElement>(null);
  const href = `/lab?${new URLSearchParams({ category, palette })}`;
  const custom: Customization = {
    baseId: palette,
    layers: design ? [{ ...newImageLayer(category, design.image), id: "teaser" }] : [],
  };

  const take = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      setDesign({ file, image: await prepareUpload(file) });
    } catch (err) {
      setError((err as Error).message);
    }
  };
  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    void take(e.target.files?.[0]);
    e.target.value = "";
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    void take(e.dataTransfer.files[0]);
  };

  return (
    <section className="relative overflow-hidden bg-mint py-24 md:py-32" aria-labelledby="lab-title">
      <div className="gutter relative z-10 grid items-center gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
        <div className="lg:pl-6">
          <p className="type-label">{String(n).padStart(2, "0")} — The Lab</p>
          <h2 id="lab-title" className="type-display mt-3 text-[clamp(2.8rem,8vw,7rem)]">
            Upload your design.
          </h2>
          <p className="mt-6 max-w-md text-lg leading-snug">
            Your artwork, on the product, in seconds. Drag it into place, size it, turn it. You see exactly what gets printed before you buy it.
          </p>

          <div className="mt-8 space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className="btn btn-ink" onClick={() => input.current?.click()}>
                {design ? "Try another design" : "Upload your design"}
              </button>
              <span className="text-sm">
                {design ? <span className="font-semibold">{design.image.name}</span> : `${lab.uploads.acceptLabel}, up to ${lab.uploads.maxMB} MB`}
              </span>
              <input ref={input} type="file" accept={lab.uploads.accept.join(",")} className="sr-only" onChange={onFile} tabIndex={-1} aria-hidden />
            </div>
            {error && (
              <p role="alert" className="border-l-4 border-ink pl-3 text-sm font-semibold">
                {error}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Object">
                {lab.categories.map((c) => (
                  <button key={c} type="button" role="radio" aria-checked={category === c} onClick={() => setCategory(c)} className="chip">
                    {categories[c].singular.replace("Laptop ", "").replace(" Case", "")}
                  </button>
                ))}
              </div>
              <div className="flex gap-2" role="radiogroup" aria-label="Colourway">
                {QUICK.map((p) => (
                  <button
                    key={p}
                    type="button"
                    role="radio"
                    aria-checked={palette === p}
                    aria-label={PALETTES[p].label}
                    onClick={() => setPalette(p)}
                    className={`h-11 w-11 border-2 border-ink transition-transform ${palette === p ? "-translate-y-1 shadow-[3px_3px_0_#14215A]" : ""}`}
                    style={{ background: `linear-gradient(135deg, ${PALETTES[p].ground} 0 58%, ${PALETTES[p].ink} 58%)` }}
                  />
                ))}
              </div>
            </div>
            <div data-anchor="lab-cta" className="inline-block pt-3">
              <Link href={href} className="btn btn-ink" onClick={() => handOff(design?.file ?? null)}>
                {design ? "Place it in the Lab →" : "Open the Lab →"}
              </Link>
            </div>
          </div>
        </div>

        <div
          data-anchor="lab-preview"
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
          className={`drafting relative flex h-[clamp(320px,52vw,560px)] items-center justify-center border-2 border-ink p-8 transition-colors ${over ? "bg-mint-soft" : "bg-sheet"}`}
        >
          <span className="sticker absolute left-3 top-3">Live preview</span>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={category}
              className={fitClass(category) === "w-full" ? "w-[min(100%,560px)]" : "h-[90%]"}
              initial={{ opacity: 0, y: 20, rotate: -4 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              exit={{ opacity: 0, y: -20, rotate: 4 }}
              transition={{ duration: 0.45, ease: ease.snap }}
            >
              <ProductMockup
                category={category}
                artwork="plain"
                palette={palette}
                custom={custom}
                label={`Preview: ${categories[category].singular}${design ? " with your design" : ""}`}
                className={fitClass(category)}
              />
            </motion.div>
          </AnimatePresence>
          {!design && (
            <button
              type="button"
              onClick={() => input.current?.click()}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 border-2 border-dashed border-ink bg-sheet/90 px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider hover:bg-mint-soft"
            >
              Drop your design here
            </button>
          )}
        </div>
      </div>

      <DrawnLine
        end="bottom 85%"
        build={({ x0, rect, h, mobile }) => {
          const r = rect("lab-preview");
          const c = rect("lab-cta");
          if (!r || !c) return `M${x0} 0V${h * 0.5}`;
          if (mobile || r.y > c.y + c.h) {
            // Stacked layout: run down the gutter and point up at the CTA.
            const tx = c.x + c.w * 0.5;
            const ty = c.y + c.h + 10;
            const by = ty + 50;
            return `M${x0} 0 V${by - 20} Q${x0} ${by} ${x0 + 20} ${by} H${tx - 20} Q${tx} ${by} ${tx} ${by - 20} V${ty} M${tx} ${ty} l-10 12 M${tx} ${ty} l10 12`;
          }
          const pad = 16;
          const run = 48; // above the section label, clear of any text
          const bottom = r.y + r.h + pad;
          const right = r.x + r.w + pad;
          const left = r.x - pad;
          const frame = roundedPolyline(
            [
              [x0, 0],
              [x0, run],
              [right, run],
              [right, bottom],
              [left, bottom],
            ],
            26,
          );
          // Swing round under the copy to point at the CTA.
          const tx = c.x + c.w + 18;
          const ty = c.y + c.h / 2;
          const curve = `C${left - 60} ${bottom + 10} ${tx + 140} ${ty + 120} ${tx} ${ty}`;
          const head = `M${tx} ${ty} l16 -12 M${tx} ${ty} l16 12`;
          return `${frame} ${curve} ${head}`;
        }}
      />
    </section>
  );
}
