import { useId } from "react";

/**
 * Things to try stickers on, drawn in SVG: viewBox size, the area stickers
 * can be placed in [x, y, w, h], a starting colour and the drawing itself.
 */
export type SurfaceId = "laptop" | "notebook" | "bottle" | "phone";

type Surface = {
  label: string;
  vb: readonly [number, number];
  area: readonly [number, number, number, number];
  colour: string;
  /** Sticker width a new one starts at, as a fraction of the area's width */
  start: number;
};

export const SURFACES: Record<SurfaceId, Surface> = {
  laptop: { label: "Laptop", vb: [640, 440], area: [40, 36, 560, 368], colour: "#C9CED8", start: 0.2 },
  notebook: { label: "Notebook", vb: [440, 600], area: [58, 32, 300, 526], colour: "#14215A", start: 0.34 },
  bottle: { label: "Water bottle", vb: [260, 640], area: [52, 190, 156, 400], colour: "#3FE0AE", start: 0.6 },
  phone: { label: "Phone", vb: [320, 640], area: [26, 172, 268, 440], colour: "#16181F", start: 0.4 },
};

export const SURFACE_ORDER: SurfaceId[] = ["laptop", "notebook", "bottle", "phone"];

/** The object itself, in its colour. Fills the box it's given (the box takes the viewBox's shape). */
export function SurfaceArt({ id, colour, className }: { id: SurfaceId; colour: string; className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [vw, vh] = SURFACES[id].vb;
  const sheen = (
    <linearGradient id={`sheen-${uid}`} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#fff" stopOpacity="0.25" />
      <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
      <stop offset="1" stopColor="#000" stopOpacity="0.18" />
    </linearGradient>
  );
  const edge = { stroke: "#0B1438", strokeOpacity: 0.4, strokeWidth: 2 };
  return (
    <svg viewBox={`0 0 ${vw} ${vh}`} className={className} aria-hidden>
      <defs>{sheen}</defs>
      {id === "laptop" && (
        <g>
          <rect x="10" y="10" width="620" height="420" rx="26" fill={colour} {...edge} />
          <rect x="10" y="10" width="620" height="420" rx="26" fill={`url(#sheen-${uid})`} />
          <rect x="60" y="418" width="520" height="8" rx="4" fill="#000" opacity="0.22" />
        </g>
      )}
      {id === "notebook" && (
        <g>
          <rect x="26" y="20" width="404" height="572" rx="8" fill="#F1F2F4" stroke="#CBD0DA" />
          <rect x="20" y="16" width="404" height="572" rx="9" fill="#FFFFFF" stroke="#D5D9E2" />
          <rect x="10" y="10" width="404" height="572" rx="8" fill={colour} {...edge} />
          <rect x="10" y="10" width="404" height="572" rx="8" fill={`url(#sheen-${uid})`} />
          <rect x="10" y="10" width="34" height="572" fill="#000" opacity="0.2" />
          <rect x="372" y="10" width="13" height="572" fill="#0B1438" opacity="0.88" />
        </g>
      )}
      {id === "bottle" && (
        <g>
          <rect x="88" y="12" width="84" height="64" rx="12" fill="#16181F" />
          <rect x="96" y="74" width="68" height="40" fill={colour} {...edge} />
          <path d="M40 176Q40 124 92 112H168Q220 124 220 176V600Q220 630 190 630H70Q40 630 40 600Z" fill={colour} {...edge} />
          <path d="M40 176Q40 124 92 112H168Q220 124 220 176V600Q220 630 190 630H70Q40 630 40 600Z" fill={`url(#sheen-${uid})`} />
          <rect x="58" y="160" width="10" height="440" rx="5" fill="#fff" opacity="0.28" />
        </g>
      )}
      {id === "phone" && (
        <g>
          <rect x="10" y="10" width="300" height="620" rx="50" fill={colour} {...edge} />
          <rect x="10" y="10" width="300" height="620" rx="50" fill={`url(#sheen-${uid})`} />
          <rect x="30" y="30" width="126" height="126" rx="32" fill="#000" opacity="0.25" />
          {[
            [66, 66],
            [120, 66],
            [66, 120],
          ].map(([cx, cy]) => (
            <g key={`${cx}-${cy}`}>
              <circle cx={cx} cy={cy} r="20" fill="#0B0C10" />
              <circle cx={cx} cy={cy} r="9" fill="#2A3350" />
            </g>
          ))}
          <circle cx="120" cy="120" r="7" fill="#FFE08A" opacity="0.9" />
        </g>
      )}
    </svg>
  );
}
