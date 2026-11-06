"use client";

import { useRef } from "react";
import { gsap, ScrollTrigger, useGSAP, prefersReducedMotion } from "@/lib/gsap";

/**
 * THE LINE — CUSTOM ME's signature interaction.
 *
 * Each home section carries one segment of a single pen line. Segments
 * start and end on the section boundary at the same x (`lineX`) and are
 * scrubbed from "top 70%" to "bottom 70%", so as one finishes the next
 * begins — reading as one continuous stroke that draws the page as you go,
 * changing role per section (frame, ruler, loop, arrow).
 *
 * `build` returns path data in section-local pixels, measured from the
 * live DOM, so the line follows the real layout at every breakpoint.
 */

export interface LineCtx {
  w: number;
  h: number;
  x0: number;
  /** Rect of a child (by `data-anchor` name) relative to the section. */
  rect: (name: string) => { x: number; y: number; w: number; h: number } | null;
  mobile: boolean;
}

export function lineX() {
  if (typeof window === "undefined") return 12;
  return Math.round(Math.max(8, Math.min(28, window.innerWidth * 0.018)));
}

export function DrawnLine({
  build,
  tone = "ink",
  start = "top 70%",
  end = "bottom 70%",
  width = 3,
}: {
  build: (c: LineCtx) => string;
  tone?: "ink" | "mint";
  start?: string;
  end?: string;
  width?: number;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const path = useRef<SVGPathElement>(null);
  const nib = useRef<SVGCircleElement>(null);

  useGSAP(
    () => {
      const s = svg.current;
      const p = path.current;
      const n = nib.current;
      const section = s?.parentElement;
      if (!s || !p || !n || !section) return;

      let len = 0;
      // Points along the path, sampled once per layout: reading the path on
      // every scroll frame is slow on long lines.
      let pts: Float32Array = new Float32Array(0);
      const state = { t: 0 };
      // Phones and touch screens get the line already drawn: drawing it along
      // with the scroll repaints a section-sized picture on every frame.
      const reduced = prefersReducedMotion() || window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;

      const draw = (t: number) => {
        if (!len) return;
        p.style.strokeDashoffset = String(len * (1 - t));
        const visible = !reduced && t > 0.002 && t < 0.998;
        n.style.opacity = visible ? "1" : "0";
        if (visible && pts.length) {
          // Between two sampled points
          const f = t * (pts.length / 2 - 1);
          const k = Math.min(pts.length / 2 - 2, Math.floor(f));
          const u = f - k;
          n.setAttribute("cx", String(pts[k * 2] + (pts[k * 2 + 2] - pts[k * 2]) * u));
          n.setAttribute("cy", String(pts[k * 2 + 1] + (pts[k * 2 + 3] - pts[k * 2 + 1]) * u));
        }
      };

      const measure = () => {
        const base = section.getBoundingClientRect();
        const w = base.width;
        const h = base.height;
        s.setAttribute("viewBox", `0 0 ${w} ${h}`);
        const ctx: LineCtx = {
          w,
          h,
          x0: lineX(),
          mobile: w < 768,
          rect: (name) => {
            const el = section.querySelector<HTMLElement>(`[data-anchor="${name}"]`);
            if (!el || !el.getClientRects().length) return null;
            const r = el.getBoundingClientRect();
            return { x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height };
          },
        };
        p.setAttribute("d", build(ctx));
        len = p.getTotalLength();
        p.style.strokeDasharray = `${len} ${len}`;
        if (reduced) {
          draw(1);
          return;
        }
        // One point every 10 px or so is plenty for the pen nib
        const count = Math.max(2, Math.min(240, Math.round(len / 10)));
        pts = new Float32Array(count * 2);
        for (let i = 0; i < count; i++) {
          const pt = p.getPointAtLength((len * i) / (count - 1));
          pts[i * 2] = pt.x;
          pts[i * 2 + 1] = pt.y;
        }
        draw(state.t);
      };

      measure();
      if (reduced) {
        let w = section.offsetWidth;
        const ro = new ResizeObserver(() => {
          // Only a new width moves the line much; heights come and go as labels swap
          if (section.offsetWidth === w) return;
          w = section.offsetWidth;
          measure();
        });
        ro.observe(section);
        return () => ro.disconnect();
      }

      const tween = gsap.to(state, {
        t: 1,
        ease: "none",
        onUpdate: () => draw(state.t),
        scrollTrigger: { trigger: section, start, end, scrub: 0.6 },
      });

      ScrollTrigger.addEventListener("refreshInit", measure);
      // Re-measure only when the section has really changed size and stayed
      // that way: a refresh recalculates every trigger on the page.
      let timer = 0;
      const sizeOf = () => `${section.offsetWidth}x${section.offsetHeight}`;
      let last = sizeOf();
      const ro = new ResizeObserver(() => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          const size = sizeOf();
          if (size === last) return;
          last = size;
          ScrollTrigger.refresh();
        }, 400);
      });
      ro.observe(section);

      return () => {
        ScrollTrigger.removeEventListener("refreshInit", measure);
        ro.disconnect();
        window.clearTimeout(timer);
        tween.scrollTrigger?.kill();
        tween.kill();
      };
    },
    { scope: svg },
  );

  const stroke = tone === "mint" ? "#3FE0AE" : "#14215A";
  return (
    <svg ref={svg} aria-hidden className="pointer-events-none absolute inset-0 z-[5] h-full w-full overflow-visible">
      <path
        ref={path}
        fill="none"
        stroke={stroke}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ strokeDasharray: "0 1e6" }}
      />
      <circle ref={nib} r={7} fill="#3FE0AE" stroke={tone === "mint" ? "#FBFBF9" : "#14215A"} strokeWidth={2.5} style={{ opacity: 0 }} />
    </svg>
  );
}

/* ── path helpers ──────────────────────────────────────────────────── */

/** Rounded orthogonal polyline through points (corner radius r). */
export function roundedPolyline(pts: [number, number][], r = 22) {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1];
    const [cx, cy] = pts[i];
    const [nx, ny] = pts[i + 1];
    const d1 = Math.hypot(cx - px, cy - py);
    const d2 = Math.hypot(nx - cx, ny - cy);
    const rr = Math.min(r, d1 / 2, d2 / 2);
    const ax = cx - ((cx - px) / (d1 || 1)) * rr;
    const ay = cy - ((cy - py) / (d1 || 1)) * rr;
    const bx = cx + ((nx - cx) / (d2 || 1)) * rr;
    const by = cy + ((ny - cy) / (d2 || 1)) * rr;
    d += ` L${ax} ${ay} Q${cx} ${cy} ${bx} ${by}`;
  }
  const last = pts[pts.length - 1];
  return `${d} L${last[0]} ${last[1]}`;
}

/** A hand-drawn-ish ellipse loop around a rect, starting/ending on its left. */
export function loopAround(r: { x: number; y: number; w: number; h: number }, pad = 18) {
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  const rx = r.w / 2 + pad * 1.6;
  const ry = r.h / 2 + pad;
  const k = 0.5523;
  // Start left-middle, go over the top clockwise, overshoot past the start.
  return [
    `L${cx - rx} ${cy}`,
    `C${cx - rx} ${cy - ry * k} ${cx - rx * k} ${cy - ry} ${cx} ${cy - ry}`,
    `C${cx + rx * k} ${cy - ry} ${cx + rx} ${cy - ry * k} ${cx + rx} ${cy}`,
    `C${cx + rx} ${cy + ry * k} ${cx + rx * k} ${cy + ry * 1.05} ${cx} ${cy + ry * 1.05}`,
    `C${cx - rx * k * 1.1} ${cy + ry * 1.05} ${cx - rx * 1.06} ${cy + ry * k} ${cx - rx * 1.04} ${cy - ry * 0.1}`,
    `C${cx - rx * 1.02} ${cy - ry * 0.55} ${cx - rx * 0.8} ${cy - ry * 0.95} ${cx - rx * 0.45} ${cy - ry * 1.12}`,
  ].join(" ");
}
