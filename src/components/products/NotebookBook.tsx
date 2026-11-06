"use client";

import { motion } from "motion/react";
import type { CSSProperties } from "react";
import { PALETTES, type ArtworkId, type PaletteId } from "@/components/art/artworks";
import { ProductMockup } from "./ProductMockup";
import { spring } from "@/lib/motion";

export const PAPER: Record<string, CSSProperties> = {
  lined: {
    backgroundImage:
      "linear-gradient(to right, transparent 13%, rgb(63 224 174 / .9) 13%, rgb(63 224 174 / .9) calc(13% + 2px), transparent calc(13% + 2px)), repeating-linear-gradient(to bottom, transparent 0 21px, #C3CCE3 21px 22px)",
    backgroundPosition: "0 0, 0 34px",
  },
  dotted: { backgroundImage: "radial-gradient(#8E97B5 1.1px, transparent 1.4px)", backgroundSize: "16px 16px", backgroundPosition: "8px 8px" },
  grid: {
    backgroundImage: "linear-gradient(to right, #D2D8E8 1px, transparent 1px), linear-gradient(to bottom, #D2D8E8 1px, transparent 1px)",
    backgroundSize: "16px 16px",
  },
  blank: {},
};

/**
 * A notebook whose cover swings open (3D, hinged at the spine) to show the
 * page type inside. Used on the home page and the product page.
 */
export function NotebookBook({
  artwork,
  palette,
  paper,
  open,
  peek,
  label,
}: {
  artwork: ArtworkId;
  palette: PaletteId;
  paper: string;
  open: boolean;
  peek?: boolean;
  label: string;
}) {
  const p = PALETTES[palette];
  return (
    <div className="relative" style={{ perspective: 1800 }} role="img" aria-label={`${label} — ${open ? `open, showing ${paper} pages` : "closed"}`}>
      <motion.div className="relative" initial={false} animate={{ x: open ? "48%" : "0%" }} transition={spring}>
        <div style={{ aspectRatio: "440 / 600" }} className="relative">
          {/* page block */}
          <div className="absolute inset-[1.6%_4.4%_1.6%_2.2%] overflow-hidden rounded-r-[6px] bg-sheet shadow-[inset_8px_0_14px_-8px_rgb(11_20_56/.35),0_14px_30px_-12px_rgb(11_20_56/.45)]">
            <div className="absolute inset-0" style={PAPER[paper]} />
            <div className="absolute inset-x-[16%] bottom-[12%] font-marker text-[clamp(0.9rem,2.4vw,1.4rem)] leading-tight text-ink/70">
              your design
              <br />
              goes here →
            </div>
            <span className="absolute right-[6%] top-[4%] font-mono text-[10px] font-bold uppercase tracking-widest text-muted">{paper}</span>
          </div>

          {/* cover */}
          <motion.div
            className="absolute inset-0 origin-left"
            style={{ transformStyle: "preserve-3d" }}
            initial={false}
            animate={{ rotateY: open ? -168 : peek ? -24 : 0 }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          >
            <div className="absolute inset-0" style={{ backfaceVisibility: "hidden" }}>
              <ProductMockup category="notebooks" artwork={artwork} palette={palette} coverOnly className="h-full w-full" />
            </div>
            <div
              className="absolute inset-[1.6%_3.6%_1.6%_2.2%] flex items-end rounded-l-[8px] p-[8%]"
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", background: p.ground }}
            >
              <p className="w-full font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: p.ink }}>
                This notebook belongs to
                <span className="mt-3 block h-px w-full" style={{ background: p.ink }} />
              </p>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
