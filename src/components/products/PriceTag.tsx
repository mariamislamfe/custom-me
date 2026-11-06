"use client";

import { AnimatePresence, motion } from "motion/react";
import { priceText } from "@/lib/format";
import { ease } from "@/lib/motion";

/** A price that rolls to its new value when a size or colour changes it. */
export function PriceTag({ value, className }: { value: number | null; className?: string }) {
  const text = priceText(value);
  return (
    <span className={`relative inline-flex overflow-hidden ${className ?? ""}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={text}
          className="block"
          initial={{ y: "70%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-70%", opacity: 0 }}
          transition={{ duration: 0.28, ease: ease.snap }}
        >
          {text}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
