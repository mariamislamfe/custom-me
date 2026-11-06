/**
 * Illustrative artwork library.
 *
 * These are procedural SVG compositions built from the CUSTOM ME mark
 * vocabulary. They stand in for product artwork until real product
 * photography / print files are supplied, and they power the Customization
 * Lab (every artwork can be re-coloured with any palette).
 *
 * Every artwork draws into a (0,0,w,h) box so the same design works on a
 * landscape sleeve, a tall T-ruler case or a portrait notebook cover.
 * Randomness is seeded, so server and client renders are identical.
 */

import type { ReactNode } from "react";
import { MARKS } from "@/components/marks/paths";

export const COLORS = {
  navy: "#14215A",
  deep: "#0B1438",
  mint: "#3FE0AE",
  white: "#FBFBF9",
  gray: "#E2E5EB",
} as const;

export interface Palette {
  ground: string;
  ink: string;
  accent: string;
  label: string;
}

export const PALETTES = {
  "navy-mint": { ground: COLORS.navy, ink: COLORS.mint, accent: COLORS.white, label: "Navy × Mint" },
  "navy-white": { ground: COLORS.navy, ink: COLORS.white, accent: COLORS.mint, label: "Navy × White" },
  "mint-navy": { ground: COLORS.mint, ink: COLORS.navy, accent: COLORS.white, label: "Mint × Navy" },
  "white-navy": { ground: COLORS.white, ink: COLORS.navy, accent: COLORS.mint, label: "White × Navy" },
  "gray-navy": { ground: COLORS.gray, ink: COLORS.navy, accent: COLORS.mint, label: "Gray × Navy" },
  "ink-mint": { ground: COLORS.deep, ink: COLORS.mint, accent: COLORS.white, label: "Midnight × Mint" },
} satisfies Record<string, Palette>;

export type PaletteId = keyof typeof PALETTES;

interface Ctx {
  w: number;
  h: number;
  p: Palette;
  uid: string;
}

/* ── helpers ─────────────────────────────────────────────────────────── */

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r2 = (n: number) => Math.round(n * 100) / 100;

function Crown({
  x, y, s, rot = 0, fill = "none", stroke, sw = 4, band = true,
}: { x: number; y: number; s: number; rot?: number; fill?: string; stroke?: string; sw?: number; band?: boolean }) {
  const k = s / 100;
  return (
    <g transform={`translate(${r2(x)} ${r2(y)}) rotate(${r2(rot)}) scale(${r2(k)}) translate(-50 -40)`}>
      <path d={MARKS.crown.d} fill={fill} stroke={stroke} strokeWidth={sw / k} strokeLinejoin="round" />
      {band && <path d={MARKS.crown.band} fill="none" stroke={stroke ?? fill} strokeWidth={sw / k} strokeLinecap="round" />}
    </g>
  );
}

function Spark({ x, y, s, fill, rot = 0 }: { x: number; y: number; s: number; fill: string; rot?: number }) {
  const k = s / 100;
  return (
    <path
      d={MARKS.spark.d}
      fill={fill}
      transform={`translate(${r2(x)} ${r2(y)}) rotate(${r2(rot)}) scale(${r2(k)}) translate(-50 -50)`}
    />
  );
}

function Arrow({ x, y, s, rot = 0, stroke, sw = 4 }: { x: number; y: number; s: number; rot?: number; stroke: string; sw?: number }) {
  const k = s / 120;
  return (
    <g
      transform={`translate(${r2(x)} ${r2(y)}) rotate(${r2(rot)}) scale(${r2(k)}) translate(-60 -35)`}
      fill="none"
      stroke={stroke}
      strokeWidth={sw / k}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={MARKS.arrow.d} />
      <path d={MARKS.arrow.head} />
    </g>
  );
}

function Loop({ x, y, s, rot = 0, stroke, sw = 4 }: { x: number; y: number; s: number; rot?: number; stroke: string; sw?: number }) {
  const k = s / 120;
  return (
    <path
      d={MARKS.loop.d}
      fill="none"
      stroke={stroke}
      strokeWidth={sw / k}
      strokeLinecap="round"
      transform={`translate(${r2(x)} ${r2(y)}) rotate(${r2(rot)}) scale(${r2(k)}) translate(-60 -40)`}
    />
  );
}

function Grid({ w, h, step, stroke, opacity, sw = 1 }: { w: number; h: number; step: number; stroke: string; opacity: number; sw?: number }) {
  let d = "";
  for (let x = step; x < w; x += step) d += `M${r2(x)} 0V${h}`;
  for (let y = step; y < h; y += step) d += `M0 ${r2(y)}H${w}`;
  return <path d={d} stroke={stroke} strokeOpacity={opacity} strokeWidth={sw} fill="none" />;
}

/** A smooth hand-ish scribble through random points. */
function scribblePath(rand: () => number, w: number, h: number, n: number) {
  const pts: [number, number][] = [];
  let x = rand() * w;
  let y = rand() * h;
  for (let i = 0; i < n; i++) {
    x = Math.min(w * 1.05, Math.max(-w * 0.05, x + (rand() - 0.5) * w * 0.7));
    y = Math.min(h * 1.05, Math.max(-h * 0.05, y + (rand() - 0.5) * h * 0.7));
    pts.push([x, y]);
  }
  let d = `M${r2(pts[0][0])} ${r2(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    d += ` Q${r2(x1)} ${r2(y1)} ${r2((x1 + x2) / 2)} ${r2((y1 + y2) / 2)}`;
  }
  return d;
}

/** A pen "testing the nib" scribble: loops travelling along a line. */
function loopScribble(x: number, y: number, len: number, r: number, loops: number) {
  const steps = loops * 16;
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = t * loops * Math.PI * 2;
    const px = x + t * len + r * 0.9 * Math.cos(a + Math.PI);
    const py = y + r * Math.sin(a) * (1 + 0.15 * Math.sin(t * 9));
    d += `${i ? "L" : "M"}${r2(px)} ${r2(py)}`;
  }
  return d;
}

const FONT = {
  display: { fontFamily: "var(--font-display), 'Arial Black', sans-serif", fontWeight: 900, fontStretch: "125%" },
  marker: { fontFamily: "var(--font-marker), 'Comic Sans MS', cursive" },
  mono: { fontFamily: "var(--font-mono), monospace", fontWeight: 600 },
} as const;

/* ── artworks ────────────────────────────────────────────────────────── */

type ArtworkFn = (c: Ctx) => ReactNode;

const art = {
  plain: ({ w, h, p }) => <rect width={w} height={h} fill={p.ground} />,

  "crown-riot": ({ w, h, p }) => {
    const rand = rng(11);
    const m = Math.min(w, h);
    const cell = m / 3.6;
    const crowns: ReactNode[] = [];
    let i = 0;
    for (let row = -1, y = cell * 0.4; y < h + cell; y += cell * 0.82, row++) {
      for (let x = (row % 2) * cell * 0.5; x < w + cell; x += cell) {
        const filled = i % 7 === 3;
        crowns.push(
          <Crown
            key={i++}
            x={x + (rand() - 0.5) * cell * 0.15}
            y={y}
            s={cell * 0.48}
            rot={(rand() - 0.5) * 28}
            stroke={p.ink}
            fill={filled ? p.ink : "none"}
            sw={m * 0.011}
          />,
        );
      }
    }
    return (
      <>
        <rect width={w} height={h} fill={p.ground} />
        <g opacity={0.6}>{crowns}</g>
        <Crown x={w * 0.72} y={h * 0.68} s={m * 0.95} rot={-9} fill={p.ground} stroke={p.accent} sw={m * 0.022} />
        <Spark x={w * 0.2} y={h * 0.22} s={m * 0.16} fill={p.accent} rot={8} />
      </>
    );
  },

  blueprint: ({ w, h, p }) => {
    const m = Math.min(w, h);
    const g = m / 12;
    const cx = w * 0.64;
    const cy = h * 0.56;
    const r = m * 0.3;
    const y0 = h * 0.16;
    const x0 = w * 0.1;
    const x1 = w * 0.55;
    const tick = m * 0.03;
    return (
      <>
        <rect width={w} height={h} fill={p.ground} />
        <Grid w={w} h={h} step={g} stroke={p.ink} opacity={0.12} />
        <Grid w={w} h={h} step={g * 4} stroke={p.ink} opacity={0.26} />
        <g fill="none" stroke={p.ink} strokeWidth={m * 0.006} strokeLinecap="round">
          <circle cx={cx} cy={cy} r={r} />
          <circle cx={cx} cy={cy} r={r * 0.62} strokeDasharray={`${m * 0.02} ${m * 0.015}`} />
          <path d={`M${cx - r * 1.3} ${cy}H${cx + r * 1.3}M${cx} ${cy - r * 1.3}V${cy + r * 1.3}`} strokeOpacity={0.6} />
          <path d={`M${x0} ${y0}H${x1}M${x0} ${y0 - tick}V${y0 + tick}M${x1} ${y0 - tick}V${y0 + tick}`} />
          <path d={`M${x0 + tick * 1.6} ${y0 - tick * 0.7}L${x0} ${y0}L${x0 + tick * 1.6} ${y0 + tick * 0.7}M${x1 - tick * 1.6} ${y0 - tick * 0.7}L${x1} ${y0}L${x1 - tick * 1.6} ${y0 + tick * 0.7}`} />
          <path d={`M${w * 0.06} ${h * 0.94}L${cx} ${cy}`} strokeDasharray={`${m * 0.04} ${m * 0.02}`} strokeOpacity={0.7} />
        </g>
        <text x={(x0 + x1) / 2} y={y0 - tick * 1.6} textAnchor="middle" fontSize={m * 0.045} fill={p.ink} style={FONT.mono}>
          YOUR / DESIGN
        </text>
        <Crown x={cx} y={cy} s={r * 0.8} stroke={p.accent} sw={m * 0.012} />
        <text x={w * 0.06} y={h * 0.88} fontSize={m * 0.035} fill={p.ink} fillOpacity={0.7} style={FONT.mono}>
          FIG. 01 — CUSTOM ME
        </text>
      </>
    );
  },

  "big-type": ({ w, h, p }) => {
    const fs = Math.min(h * 1.05, w * 0.82);
    const m = Math.min(w, h);
    return (
      <>
        <rect width={w} height={h} fill={p.ground} />
        <text
          x={w * 0.5}
          y={h * 0.5 + fs * 0.36}
          textAnchor="middle"
          fontSize={fs}
          fill={p.ink}
          letterSpacing={-fs * 0.04}
          style={FONT.display}
        >
          ME
        </text>
        <Spark x={w * 0.86} y={h * 0.18} s={m * 0.22} fill={p.accent} rot={-6} />
        <Spark x={w * 0.12} y={h * 0.84} s={m * 0.12} fill={p.accent} rot={12} />
      </>
    );
  },

  "off-grid": ({ w, h, p }) => {
    const m = Math.min(w, h);
    const g = m / 7;
    const rand = rng(4);
    const cells: ReactNode[] = [];
    for (let i = 0; i < 4; i++) {
      const cx = Math.floor(rand() * (w / g)) * g;
      const cy = Math.floor(rand() * (h / g)) * g;
      cells.push(<rect key={i} x={cx} y={cy} width={g} height={g} fill={p.accent} />);
    }
    return (
      <>
        <rect width={w} height={h} fill={p.ground} />
        {cells}
        <Grid w={w} h={h} step={g} stroke={p.ink} opacity={0.55} sw={m * 0.004} />
        <Spark x={w * 0.74} y={h * 0.3} s={m * 0.34} fill={p.ink} rot={10} />
        <Loop x={w * 0.3} y={h * 0.62} s={m * 0.5} stroke={p.ink} sw={m * 0.014} rot={-8} />
        <Arrow x={w * 0.5} y={h * 0.82} s={m * 0.36} stroke={p.ink} sw={m * 0.014} rot={-14} />
      </>
    );
  },

  scribble: ({ w, h, p }) => {
    const m = Math.min(w, h);
    const rand = rng(23);
    return (
      <>
        <rect width={w} height={h} fill={p.ground} />
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d={scribblePath(rand, w, h, 14)} stroke={p.ink} strokeWidth={m * 0.022} />
          <path d={scribblePath(rand, w, h, 10)} stroke={p.ink} strokeOpacity={0.45} strokeWidth={m * 0.012} />
          <path d={scribblePath(rand, w, h, 8)} stroke={p.accent} strokeWidth={m * 0.008} />
        </g>
        <Crown x={w * 0.5} y={h * 0.48} s={m * 0.3} stroke={p.accent} sw={m * 0.014} rot={-6} />
      </>
    );
  },

  stickers: ({ w, h, p }) => {
    const m = Math.min(w, h);
    const rand = rng(7);
    const cols = Math.max(2, Math.round(w / (m * 0.42)));
    const rows = Math.max(2, Math.round(h / (m * 0.42)));
    const cw = w / cols;
    const ch = h / rows;
    const out: ReactNode[] = [];
    let i = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = cw * (c + 0.5) + (rand() - 0.5) * cw * 0.3;
        const y = ch * (r + 0.5) + (rand() - 0.5) * ch * 0.3;
        const s = Math.min(cw, ch) * 0.74;
        const rot = (rand() - 0.5) * 30;
        const kind = i % 4;
        const shadow = m * 0.012;
        out.push(
          <g key={i++} transform={`translate(${r2(x)} ${r2(y)}) rotate(${r2(rot)})`}>
            {kind === 0 && (
              <>
                <circle cx={shadow} cy={shadow} r={s * 0.5} fill={p.ink} fillOpacity={0.18} />
                <circle r={s * 0.5} fill={COLORS.white} stroke={p.ink} strokeWidth={m * 0.008} />
                <Crown x={0} y={s * 0.02} s={s * 0.62} fill={p.ink} stroke={p.ink} sw={m * 0.006} band={false} />
              </>
            )}
            {kind === 1 && (
              <>
                <rect x={-s * 0.55 + shadow} y={-s * 0.3 + shadow} width={s * 1.1} height={s * 0.6} rx={s * 0.12} fill={p.ink} fillOpacity={0.18} />
                <rect x={-s * 0.55} y={-s * 0.3} width={s * 1.1} height={s * 0.6} rx={s * 0.12} fill={p.ink} />
                <text y={s * 0.12} textAnchor="middle" fontSize={s * 0.34} fill={COLORS.mint} style={FONT.display}>
                  ME
                </text>
              </>
            )}
            {kind === 2 && (
              <>
                <circle r={s * 0.46} fill={COLORS.mint} stroke={p.ink} strokeWidth={m * 0.008} />
                <Spark x={0} y={0} s={s * 0.56} fill={p.ink} />
              </>
            )}
            {kind === 3 && (
              <>
                <rect x={-s * 0.5} y={-s * 0.36} width={s} height={s * 0.72} rx={s * 0.08} fill={COLORS.white} stroke={p.ink} strokeWidth={m * 0.008} />
                <Arrow x={0} y={0} s={s * 0.7} stroke={p.ink} sw={m * 0.012} />
              </>
            )}
          </g>,
        );
      }
    }
    return (
      <>
        <rect width={w} height={h} fill={p.ground} />
        {out}
      </>
    );
  },

  measure: ({ w, h, p }) => {
    const m = Math.min(w, h);
    const vertical = h > w;
    const len = vertical ? h : w;
    const step = m / 18;
    const bands = vertical ? [w * 0.32, w * 0.68] : [h * 0.25, h * 0.75];
    let d = "";
    const labels: ReactNode[] = [];
    bands.forEach((b, bi) => {
      const dir = bi === 0 ? 1 : -1;
      for (let i = 0, t = step; t < len; t += step, i++) {
        const l = i % 10 === 9 ? m * 0.12 : i % 5 === 4 ? m * 0.08 : m * 0.045;
        d += vertical ? `M${r2(b)} ${r2(t)}h${r2(l * dir)}` : `M${r2(t)} ${r2(b)}v${r2(l * dir)}`;
        if (i % 10 === 9 && bi === 0) {
          labels.push(
            <text
              key={`${bi}-${i}`}
              x={vertical ? b + l + m * 0.03 : t}
              y={vertical ? t + m * 0.025 : b + l + m * 0.07}
              textAnchor={vertical ? "start" : "middle"}
              fontSize={m * 0.06}
              fill={p.ink}
              style={FONT.mono}
            >
              {(i + 1) / 10}
            </text>,
          );
        }
      }
    });
    return (
      <>
        <rect width={w} height={h} fill={p.ground} />
        <path d={d} stroke={p.ink} strokeWidth={m * 0.008} />
        {labels}
        <Crown x={w * 0.5} y={vertical ? m * 0.36 : h * 0.5} s={m * 0.32} stroke={p.accent} sw={m * 0.016} />
      </>
    );
  },

  "your-rules": ({ w, h, p }) => {
    const m = Math.min(w, h);
    const vertical = h > w * 1.4;
    return (
      <>
        <rect width={w} height={h} fill={p.ground} />
        {vertical ? (
          <g transform={`translate(${w * 0.5} ${h * 0.58}) rotate(-90)`}>
            <text textAnchor="middle" y={w * 0.13} fontSize={w * 0.38} fill={p.ink} letterSpacing={-w * 0.01} style={FONT.display}>
              YOUR RULES.
            </text>
          </g>
        ) : (
          <text x={w * 0.07} y={h * 0.52} fontSize={m * 0.34} fill={p.ink} style={FONT.display}>
            <tspan x={w * 0.07}>YOUR</tspan>
            <tspan x={w * 0.07} dy={m * 0.32}>RULES.</tspan>
          </text>
        )}
        <Spark x={w * 0.5} y={vertical ? m * 0.42 : h * 0.2} s={m * 0.28} fill={p.accent} />
      </>
    );
  },

  linework: ({ w, h, p }) => {
    const m = Math.min(w, h);
    const vertical = h > w;
    const n = 9;
    const out: ReactNode[] = [];
    for (let i = 0; i < n; i++) {
      const t = ((i + 0.5) / n) * (vertical ? w : h);
      const accent = i === 4;
      const sw = accent ? m * 0.035 : m * 0.012;
      const d = vertical ? `M${r2(t)} ${m * 0.1}V${h - m * 0.1}` : `M${m * 0.1} ${r2(t)}H${w - m * 0.1}`;
      out.push(<path key={i} d={d} stroke={accent ? p.accent : p.ink} strokeWidth={sw} strokeLinecap="round" />);
    }
    return (
      <>
        <rect width={w} height={h} fill={p.ground} />
        {out}
        <Arrow x={w * 0.5} y={vertical ? h * 0.82 : h * 0.5} s={m * 0.5} rot={vertical ? 90 : 0} stroke={p.ink} sw={m * 0.02} />
        <Crown x={w * 0.5} y={vertical ? m * 0.42 : h * 0.3} s={m * 0.3} fill={p.ground} stroke={p.ink} sw={m * 0.016} />
      </>
    );
  },

  "crown-column": ({ w, h, p }) => {
    const m = Math.min(w, h);
    const s = m * 0.42;
    const out: ReactNode[] = [];
    let i = 0;
    for (let y = s * 0.7; y < h + s; y += s * 0.95, i++) {
      out.push(
        <Crown key={i} x={w * 0.5} y={y} s={s} stroke={p.ink} fill={i % 3 === 1 ? p.ink : "none"} sw={m * 0.016} />,
      );
    }
    return (
      <>
        <rect width={w} height={h} fill={p.ground} />
        <path d={`M${w * 0.12} 0V${h}M${w * 0.88} 0V${h}`} stroke={p.accent} strokeOpacity={0.6} strokeWidth={m * 0.008} />
        {out}
      </>
    );
  },

  "first-draft": ({ w, h, p }) => {
    const m = Math.min(w, h);
    return (
      <>
        <rect width={w} height={h} fill={p.ground} />
        <rect x={w * 0.1} y={h * 0.62} width={w * 0.62} height={m * 0.14} fill={p.accent} transform={`rotate(-3 ${w * 0.4} ${h * 0.68})`} />
        <path d={loopScribble(w * 0.14, h * 0.32, w * 0.72, m * 0.13, 7)} fill="none" stroke={p.ink} strokeWidth={m * 0.018} strokeLinecap="round" strokeLinejoin="round" />
        <text x={w * 0.12} y={h * 0.72} fontSize={m * 0.14} fill={p.ink} style={FONT.marker} transform={`rotate(-3 ${w * 0.4} ${h * 0.68})`}>
          first draft
        </text>
        <text x={w * 0.12} y={h * 0.9} fontSize={m * 0.045} fill={p.ink} style={FONT.mono}>
          NO. 001 — UNFINISHED ON PURPOSE
        </text>
      </>
    );
  },

  margin: ({ w, h, p }) => {
    const m = Math.min(w, h);
    const i = m * 0.1;
    const wob = m * 0.012;
    const d = `M${i} ${i + wob} L${w - i} ${i - wob} L${w - i + wob} ${h - i} L${i - wob} ${h - i + wob} Z`;
    return (
      <>
        <rect width={w} height={h} fill={p.ground} />
        <path d={d} fill="none" stroke={p.ink} strokeWidth={m * 0.012} strokeLinejoin="round" />
        <Spark x={w * 0.5} y={h * 0.42} s={m * 0.42} fill={p.accent} rot={6} />
        <Crown x={w * 0.5} y={h - i - m * 0.12} s={m * 0.16} fill={p.ink} stroke={p.ink} sw={m * 0.006} band={false} />
      </>
    );
  },

  arrows: ({ w, h, p }) => {
    const m = Math.min(w, h);
    const rand = rng(31);
    const out: ReactNode[] = [];
    for (let i = 0; i < 9; i++) {
      out.push(
        <Arrow
          key={i}
          x={w * (0.12 + rand() * 0.76)}
          y={h * (0.1 + rand() * 0.8)}
          s={m * (0.2 + rand() * 0.18)}
          rot={rand() * 360}
          stroke={p.ink}
          sw={m * 0.012}
        />,
      );
    }
    return (
      <>
        <rect width={w} height={h} fill={p.ground} />
        {out}
        <Arrow x={w * 0.52} y={h * 0.55} s={m * 0.7} rot={-20} stroke={p.accent} sw={m * 0.03} />
      </>
    );
  },

  intentionally: ({ w, h, p }) => {
    const m = Math.min(w, h);
    return (
      <>
        <rect width={w} height={h} fill={p.ground} />
        <text x={w * 0.1} y={h * 0.2} fontSize={m * 0.05} fill={p.accent} style={FONT.mono}>
          THIS PAGE
        </text>
        <text x={w * 0.1} y={h * 0.36} fontSize={m * 0.115} fill={p.ink} style={FONT.display}>
          <tspan x={w * 0.1}>INTEN-</tspan>
          <tspan x={w * 0.1} dy={m * 0.12}>TIONALLY</tspan>
          <tspan x={w * 0.1} dy={m * 0.12}>YOURS.</tspan>
        </text>
        <Crown x={w * 0.76} y={h * 0.82} s={m * 0.24} stroke={p.ink} sw={m * 0.012} rot={8} />
      </>
    );
  },
} satisfies Record<string, ArtworkFn>;

export type ArtworkId = keyof typeof art;

export const ARTWORK_LABELS: Record<ArtworkId, string> = {
  plain: "Plain",
  "crown-riot": "Crown Riot",
  blueprint: "Blueprint",
  "big-type": "Big ME",
  "off-grid": "Off the Grid",
  scribble: "Scribble",
  stickers: "Sticker Bomb",
  measure: "Measure",
  "your-rules": "Your Rules",
  linework: "Linework",
  "crown-column": "Crown Column",
  "first-draft": "First Draft",
  margin: "Margin",
  arrows: "Arrow Theory",
  intentionally: "Intentionally Yours",
};

export function Artwork({ id, palette, w, h, uid }: { id: ArtworkId; palette: Palette; w: number; h: number; uid: string }) {
  const fn: ArtworkFn = art[id] ?? art.plain;
  return <>{fn({ w, h, p: palette, uid })}</>;
}
