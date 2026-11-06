"use client";

import Image, { getImageProps } from "next/image";
import { memo, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { productViews, type Product, type ProductImage } from "@/data/catalog";
import { ProductMockup } from "./ProductMockup";
import { SHAPES } from "./shapes";

/** The turn when a product is shown from the back. */
const FLIP = { type: "spring", stiffness: 75, damping: 15, mass: 1 } as const;

/**
 * A product as the shop shows it: its photo for the chosen colour when it
 * has one (cut-outs float on whatever is behind them), otherwise a plain
 * render of the product. Either way it takes the shape of that product type,
 * so layouts built around the renders keep working with real photos.
 * With a back photo, `face="back"` turns the piece round in 3D.
 */
// Memoised: carousels re-render on every turn, and only the pieces whose props changed need to
export const ProductArt = memo(function ProductArt({
  product,
  label,
  className,
  sizes = "(min-width: 1024px) 50vw, 90vw",
  preload,
  eager,
  colour,
  face = "front",
  shadow = "floor",
}: {
  product: Product;
  /** Accessible description. Decorative when omitted. */
  label?: string;
  className?: string;
  sizes?: string;
  /** Above the fold: fetched before anything else. */
  preload?: boolean;
  /** Load now rather than when scrolled near, e.g. the next pieces of a carousel. */
  eager?: boolean;
  /** Chosen colour (ProductColour id); its photos are shown when it has some. */
  colour?: string;
  face?: "front" | "back";
  /**
   * Cut-outs: "floor" lays a soft shadow under the piece (cheap, for anything
   * that moves); "drop" follows its outline (a filter: for a still, single piece).
   */
  shadow?: "floor" | "drop" | "none";
}) {
  const reduced = useReducedMotion();
  const { front, back } = productViews(product, colour);
  const turned = face === "back" && Boolean(back);
  // The 3D set-up (and the back photo) only while the piece turns or shows its back:
  // dozens of pieces sit still on a page, and each 3D one costs the browser layers to sort every frame
  const [spinning, setSpinning] = useState(false);
  const [wasTurned, setWasTurned] = useState(turned);
  if (wasTurned !== turned) {
    setWasTurned(turned);
    setSpinning(true);
  }
  const live = Boolean(back) && (turned || spinning);
  if (!front) {
    return <ProductMockup category={product.category} artwork="plain" palette={product.palette} label={label} className={className} />;
  }
  const [vw, vh] = SHAPES[product.category].vb;
  const photo = { sizes, preload, eager, drop: shadow === "drop" };
  return (
    <div
      className={`relative ${className ?? ""}`}
      style={{ aspectRatio: `${vw} / ${vh}`, perspective: live ? 1600 : undefined }}
      role={label ? "img" : undefined}
      aria-label={label ? `${label}${turned ? ", back" : ""}` : undefined}
    >
      {shadow === "floor" && front.cutout && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-[8%] -bottom-[3%] h-[7%]"
          style={{ background: "radial-gradient(closest-side, rgb(11 20 56 / 0.28), rgb(11 20 56 / 0))" }}
        />
      )}
      {/* The same elements whether still or turning, so the front photo is never reloaded */}
      <motion.div
        className="absolute inset-0"
        style={{ transformStyle: live ? "preserve-3d" : undefined }}
        initial={false}
        animate={{ rotateY: turned ? 180 : 0 }}
        transition={reduced ? { duration: 0 } : FLIP}
        onAnimationComplete={() => !turned && setSpinning(false)}
      >
        <Face img={front} {...photo} live={live} />
        {/* Pieces up front have the back photo loaded and waiting, out of the way */}
        {back && (live || eager || preload) && <Face img={back} {...photo} live={live} hidden={!live} turned />}
      </motion.div>
    </div>
  );
});

/** One side of the piece. A new photo (another colour) fades in over the old one. */
function Face({
  img,
  turned,
  live,
  hidden,
  ...photo
}: {
  img: ProductImage;
  turned?: boolean;
  /** Turning in 3D: hide this side while it faces away. */
  live: boolean;
  hidden?: boolean;
  sizes: string;
  preload?: boolean;
  eager?: boolean;
  drop: boolean;
}) {
  return (
    <div
      className="absolute inset-0"
      style={
        hidden
          ? { display: "none" }
          : live
            ? { backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: turned ? "rotateY(180deg)" : undefined }
            : undefined
      }
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={img.src}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          <Photo img={img} {...photo} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** Fades in once loaded instead of popping in line by line (preloaded, above-the-fold photos just show). */
function Photo({ img, sizes, preload, eager, drop }: { img: ProductImage; sizes: string; preload?: boolean; eager?: boolean; drop: boolean }) {
  const [loaded, setLoaded] = useState(Boolean(preload));
  return (
    <Image
      src={img.src}
      alt=""
      fill
      sizes={sizes}
      quality={90}
      preload={preload}
      loading={preload || eager ? "eager" : undefined}
      draggable={false}
      onLoad={() => setLoaded(true)}
      className={`object-contain transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"} ${drop && img.cutout ? "drop-shadow-[0_14px_18px_rgb(11_20_56/0.22)]" : ""}`}
    />
  );
}

/** "Turn it round" control for a piece that has a back photo. */
export function FlipButton({
  face,
  onFlip,
  tone = "light",
  className = "",
}: {
  face: "front" | "back";
  onFlip: () => void;
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onFlip}
      aria-pressed={face === "back"}
      className={`btn btn-sm ${tone === "dark" ? "btn-ghost text-sheet" : "btn-paper"} gap-2 ${className}`}
    >
      <motion.span aria-hidden className="inline-block" animate={{ rotate: face === "back" ? 180 : 0 }} transition={FLIP}>
        ↻
      </motion.span>
      {face === "back" ? "Front" : "Back"}
    </button>
  );
}

/**
 * Fetch products' photos ahead of time at the size a stage shows them, so
 * picking another one swaps instantly instead of loading then.
 */
export function usePreloadArt(products: Product[], sizes: string) {
  const srcs = products
    .flatMap((p) => {
      const { front, back } = productViews(p);
      return [front, back];
    })
    .filter((i): i is ProductImage => Boolean(i))
    .map((i) => i.src)
    .join(" ");
  useEffect(() => {
    if (!srcs) return;
    // After the page has settled: the photos on screen come first
    const id = window.setTimeout(() => {
      for (const src of srcs.split(" ")) {
        const { props } = getImageProps({ src, alt: "", fill: true, sizes, quality: 90 });
        const img = new window.Image();
        img.sizes = sizes;
        if (props.srcSet) img.srcset = props.srcSet;
        img.src = props.src;
      }
    }, 1200);
    return () => window.clearTimeout(id);
  }, [srcs, sizes]);
}
