"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * A product name on one line, whatever its length: a long name is set
 * smaller until it fits, inside a line that keeps the full size's height,
 * so swapping designs never changes the label's height (and nothing under
 * it jumps).
 */
export function FitName({ name, className, as: Tag = "h3" }: { name: string; className?: string; as?: "h1" | "h2" | "h3" | "p" }) {
  const box = useRef<HTMLHeadingElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = box.current;
    const t = text.current;
    if (!el || !t) return;
    const fit = () => {
      t.style.fontSize = "";
      const room = el.clientWidth;
      const need = t.scrollWidth;
      if (need > room && room > 0) {
        const size = parseFloat(getComputedStyle(el).fontSize);
        // Never smaller than 40%: past that the end is cut instead
        t.style.fontSize = `${Math.max(size * 0.4, Math.floor((size * room) / need))}px`;
      }
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    // The display font may arrive after the first measure
    document.fonts?.ready.then(fit);
    return () => ro.disconnect();
  }, [name]);
  return (
    <Tag ref={box} className={`min-w-0 overflow-hidden text-ellipsis whitespace-nowrap ${className ?? ""}`} title={name}>
      <span ref={text} className="inline-block">
        {name}
      </span>
    </Tag>
  );
}
