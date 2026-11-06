"use client";

import { useState } from "react";

/** Copies a value to the clipboard, handy when booking the courier. */
export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        } catch {
          /* clipboard blocked: the text is still selectable */
        }
      }}
      className="shrink-0 px-3 py-1 text-xs font-bold ring-2 ring-ink/15 hover:ring-ink/40"
      aria-label={`Copy ${label}`}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
