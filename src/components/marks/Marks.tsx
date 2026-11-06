"use client";

import { motion } from "motion/react";
import { MARKS } from "./paths";
import { dur, ease } from "@/lib/motion";

interface DrawProps {
  className?: string;
  /** Animate the stroke being drawn. */
  draw?: boolean;
  /** Draw when scrolled into view instead of on mount. */
  inView?: boolean;
  delay?: number;
  strokeWidth?: number;
}

function drawProps({ draw = true, inView, delay = 0 }: DrawProps) {
  if (!draw) return {};
  const target = { pathLength: 1, opacity: 1 };
  return {
    initial: { pathLength: 0, opacity: 0 },
    ...(inView ? { whileInView: target, viewport: { once: true, margin: "-10% 0px" } } : { animate: target }),
    transition: {
      pathLength: { duration: dur.draw, ease: ease.ink, delay },
      opacity: { duration: 0.01, delay },
    },
  };
}

/** Hand-drawn underline. Sits under a word; inherit colour via `currentColor`. */
export function Underline({ className, strokeWidth = 7, ...p }: DrawProps) {
  return (
    <svg viewBox={MARKS.under.viewBox} preserveAspectRatio="none" className={className} aria-hidden fill="none">
      <motion.path d={MARKS.under.d} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" vectorEffect="non-scaling-stroke" {...drawProps(p)} />
    </svg>
  );
}

/** Pen circle drawn around a selected thing. */
export function InkLoop({ className, strokeWidth = 3, ...p }: DrawProps) {
  return (
    <svg viewBox={MARKS.loop.viewBox} preserveAspectRatio="none" className={className} aria-hidden fill="none">
      <motion.path d={MARKS.loop.d} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" vectorEffect="non-scaling-stroke" {...drawProps(p)} />
    </svg>
  );
}

export function ArrowMark({ className, strokeWidth = 5, ...p }: DrawProps) {
  const dp = drawProps(p);
  return (
    <svg viewBox={MARKS.arrow.viewBox} className={className} aria-hidden fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <motion.path d={MARKS.arrow.d} strokeWidth={strokeWidth} {...dp} />
      <motion.path
        d={MARKS.arrow.head}
        strokeWidth={strokeWidth}
        {...dp}
        transition={p.draw === false ? undefined : { pathLength: { duration: 0.3, ease: ease.ink, delay: (p.delay ?? 0) + dur.draw * 0.85 }, opacity: { duration: 0.01, delay: (p.delay ?? 0) + dur.draw * 0.85 } }}
      />
    </svg>
  );
}

export function CrownMark({ className, filled, strokeWidth = 5, ...p }: DrawProps & { filled?: boolean }) {
  const dp = drawProps(p);
  return (
    <svg viewBox={MARKS.crown.viewBox} className={className} aria-hidden fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <motion.path d={MARKS.crown.d} strokeWidth={strokeWidth} fill={filled ? "currentColor" : "none"} {...dp} />
      <motion.path d={MARKS.crown.band} strokeWidth={strokeWidth} {...dp} />
    </svg>
  );
}

export function SparkMark({ className }: { className?: string }) {
  return (
    <svg viewBox={MARKS.spark.viewBox} className={className} aria-hidden>
      <path d={MARKS.spark.d} fill="currentColor" />
    </svg>
  );
}
