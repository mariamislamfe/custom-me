"use client";

import Link from "next/link";
import { CrownMark } from "@/components/marks/Marks";

export function EmptyBag({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="w-full py-10 text-center">
      <CrownMark className="mx-auto h-16 w-20 text-mint" strokeWidth={5} />
      <p className="type-display mt-4 text-4xl">Nothing here yet.</p>
      <p className="mx-auto mt-3 max-w-xs text-muted">Pick a design you love — or start one that doesn’t exist yet.</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href="/shop" onClick={onNavigate} className="btn btn-ink">
          Shop designs
        </Link>
        <Link href="/lab" onClick={onNavigate} className="btn btn-mint">
          Make your own
        </Link>
      </div>
    </div>
  );
}
