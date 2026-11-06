"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { CartProvider } from "@/lib/cart";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <CartProvider>{children}</CartProvider>
    </MotionConfig>
  );
}
