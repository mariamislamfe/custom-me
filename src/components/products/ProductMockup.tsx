"use client";

import { useId } from "react";
import { Artwork, PALETTES, type ArtworkId, type PaletteId } from "@/components/art/artworks";
import type { CategoryId } from "@/data/catalog";
import { SHAPES } from "./shapes";
import { baseColour, fontOf, type Customization, type DesignLayer, type FontId } from "@/config/customization";

/**
 * Product mockups drawn in SVG. Each product's print area is its `art` box
 * (clipped to the product's outline), and a customer's design layers are
 * drawn into it exactly as they'll be printed (see lab/DesignCanvas).
 */

export { SHAPES };

export interface MockupProps {
  category: CategoryId;
  artwork: ArtworkId;
  palette: PaletteId;
  /** Colour of the piece, overriding the palette's (a custom piece brings its own). */
  ground?: string;
  /** A customer's design, drawn on the print area. */
  custom?: Customization | null;
  /** Notebook only: draw the cover alone (no page block / elastic), for opening animations. */
  coverOnly?: boolean;
  /** Accessible description. Decorative when omitted. */
  label?: string;
  className?: string;
}

export function ProductMockup({ category, artwork, palette, ground, custom, coverOnly, label, className }: MockupProps) {
  const raw = useId();
  const uid = raw.replace(/[^a-zA-Z0-9]/g, "");
  const shape = SHAPES[category];
  const [vw, vh] = shape.vb;
  const [ax, ay, aw, ah] = shape.art;
  const colour = ground ?? (custom ? baseColour(custom) : undefined);
  const p = colour ? { ...PALETTES[palette], ground: colour } : PALETTES[palette];
  if (custom?.design) {
    const design = custom.design;
    // A shop design being personalized: its photo is the piece, the customer's layers go on top
    return (
      <div className={`relative ${className ?? ""}`} style={{ aspectRatio: `${vw} / ${vh}` }}>
        <svg
          viewBox={`0 0 ${vw} ${vh}`}
          className="absolute inset-0 h-full w-full overflow-visible"
          role={label ? "img" : undefined}
          aria-label={label}
          aria-hidden={label ? undefined : true}
        >
          <defs>
            <clipPath id={`clip-${uid}`}>
              <path d={shape.body} />
            </clipPath>
          </defs>
          <image href={design.image.src} x={0} y={0} width={vw} height={vh} preserveAspectRatio="xMidYMid meet" />
          <g clipPath={`url(#clip-${uid})`}>
            {custom.layers.map((l) => (
              <SvgLayer key={l.id} layer={l} area={{ x: ax, y: ay, w: aw, h: ah }} />
            ))}
          </g>
        </svg>
      </div>
    );
  }

  return (
    <div className={`relative ${className ?? ""}`} style={{ aspectRatio: `${vw} / ${vh}` }}>
      <svg
        viewBox={`0 0 ${vw} ${vh}`}
        className="absolute inset-0 h-full w-full overflow-visible"
        role={label ? "img" : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
      >
        <defs>
          <clipPath id={`clip-${uid}`}>
            <path d={shape.body} />
          </clipPath>
          <linearGradient id={`sheen-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.22" />
            <stop offset="0.42" stopColor="#fff" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.16" />
          </linearGradient>
          <filter id={`shadow-${uid}`} x="-20%" y="-20%" width="140%" height="160%">
            <feGaussianBlur stdDeviation={Math.min(vw, vh) * 0.03} />
          </filter>
        </defs>

        {/* contact shadow */}
        {!coverOnly && <ellipse
          cx={vw / 2}
          cy={vh - Math.min(vw, vh) * 0.02}
          rx={vw * 0.42}
          ry={Math.min(vw, vh) * 0.03}
          fill="#0B1438"
          opacity={0.28}
          filter={`url(#shadow-${uid})`}
        />}

        {category === "notebooks" && !coverOnly && (
          <g>
            <rect x="26" y="20" width="404" height="572" rx="8" fill="#F1F2F4" stroke="#CBD0DA" />
            <rect x="20" y="16" width="404" height="572" rx="9" fill="#FFFFFF" stroke="#D5D9E2" />
          </g>
        )}

        <g clipPath={`url(#clip-${uid})`}>
          <g transform={`translate(${ax} ${ay})`}>
            <Artwork id={artwork} palette={p} w={aw} h={ah} uid={uid} />
          </g>

          {custom?.layers.map((l) => (
            <SvgLayer key={l.id} layer={l} area={{ x: ax, y: ay, w: aw, h: ah }} />
          ))}

          {/* material */}
          <rect x={ax} y={ay} width={aw} height={ah} fill={`url(#sheen-${uid})`} />
          {category === "notebooks" && (
            <>
              <rect x="10" y="10" width="34" height="572" fill="#000" opacity="0.2" />
              <path d="M38 22V570" stroke="#fff" strokeOpacity="0.5" strokeWidth="2" strokeDasharray="7 6" />
              {!coverOnly && (
                <>
                  <rect x="372" y="10" width="13" height="572" fill="#0B1438" opacity="0.88" />
                  <rect x="372" y="10" width="3" height="572" fill="#fff" opacity="0.18" />
                </>
              )}
            </>
          )}
        </g>

        {/* edges, stitching, hardware */}
        <path d={shape.body} fill="none" stroke="#0B1438" strokeOpacity="0.35" strokeWidth="1.5" />
        {category === "sleeves" && <SleeveHardware />}
        {category === "bags" && <BagHardware />}
        {category === "ruler-cases" && <CaseHardware />}
      </svg>
    </div>
  );
}

/** Lettering as printed (shared with the Lab's hit areas and the dashboard's print file). */
export function textStyle(font: FontId) {
  return {
    fontFamily: fontOf(font).css,
    fontWeight: font === "display" ? 900 : font === "mono" ? 600 : 400,
    fontStretch: font === "display" ? "125%" : undefined,
    whiteSpace: "pre" as const,
  };
}

export const printedText = (font: FontId, text: string) => (font === "display" ? text.toUpperCase() : text);

/** One design layer inside the print area (units: see config/customization.ts). */
export function SvgLayer({ layer, area }: { layer: DesignLayer; area: { x: number; y: number; w: number; h: number } }) {
  const transform = `translate(${area.x + layer.x * area.w} ${area.y + layer.y * area.h}) rotate(${layer.rotation})`;
  if (layer.kind === "image") {
    const w = layer.width * area.w;
    const h = w * layer.aspect;
    return (
      <g transform={transform}>
        <image href={layer.src} x={-w / 2} y={-h / 2} width={w} height={h} preserveAspectRatio="none" />
      </g>
    );
  }
  return (
    <g transform={transform}>
      <text textAnchor="middle" dominantBaseline="central" fontSize={layer.size * area.w} fill={layer.ink} style={textStyle(layer.font)}>
        {printedText(layer.font, layer.text)}
      </text>
    </g>
  );
}

function SleeveHardware() {
  return (
    <g>
      <rect x="26" y="26" width="548" height="368" rx="20" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="6 5" />
      {/* zipper track: top edge, round the corner, down the side */}
      <path d="M56 21H556Q579 21 579 44V236" fill="none" stroke="#0B1438" strokeOpacity="0.55" strokeWidth="10" strokeLinecap="round" />
      <path d="M56 21H556Q579 21 579 44V236" fill="none" stroke="#C9CED8" strokeWidth="4" strokeDasharray="2.5 2.5" />
      <g transform="translate(579 238)">
        <rect x="-8" y="0" width="16" height="22" rx="4" fill="#C9CED8" stroke="#0B1438" strokeOpacity="0.5" />
        <rect x="-5" y="20" width="10" height="34" rx="5" fill="#0B1438" />
        <circle cx="0" cy="45" r="2.5" fill="#3FE0AE" />
      </g>
    </g>
  );
}

function BagHardware() {
  return (
    <g>
      {/* black binding round the body */}
      <path d={SHAPES.bags.body} fill="none" stroke="#111318" strokeWidth="7" />
      {/* shoulder strap with its buckle */}
      <path d="M168 390C176 236 236 24 310 24C384 24 444 236 452 390" fill="none" stroke="#16181F" strokeWidth="22" strokeLinecap="round" />
      <path d="M168 390C176 236 236 24 310 24C384 24 444 236 452 390" fill="none" stroke="#fff" strokeOpacity="0.12" strokeWidth="2" strokeDasharray="5 5" />
      <g transform="translate(433 262) rotate(-14)">
        <rect x="-17" y="-9" width="34" height="18" rx="3" fill="#2A2D36" stroke="#0B0C10" strokeWidth="2" />
        <rect x="-10" y="-4" width="20" height="8" rx="2" fill="#0B0C10" />
      </g>
    </g>
  );
}

function CaseHardware() {
  return (
    <g>
      {/* black binding, and the flap that closes over the top */}
      <path d={SHAPES["ruler-cases"].body} fill="none" stroke="#111318" strokeWidth="6" />
      <path d="M12 132Q70 170 128 132" fill="none" stroke="#111318" strokeWidth="6" strokeLinecap="round" />
      <path d="M22 120Q70 152 118 120" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="5 4" />
      <path d="M22 168V900Q22 916 38 916H102Q118 916 118 900V168" fill="none" stroke="#fff" strokeOpacity="0.3" strokeWidth="1.5" strokeDasharray="6 5" />
    </g>
  );
}
