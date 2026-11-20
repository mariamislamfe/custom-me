"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { startPixels, track } from "@/lib/pixel";

/** Starts the dashboard's Meta Pixels and counts a page view on every page the customer opens. */
export function MetaPixel({ ids }: { ids: string[] }) {
  const pathname = usePathname();
  const key = ids.join(",");

  useEffect(() => {
    if (!key) return;
    startPixels(key.split(","));
    track("PageView");
  }, [key, pathname]);

  return null;
}
