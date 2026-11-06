import Image from "next/image";
import { site } from "@/config/site";
import { MARKS } from "@/components/marks/paths";

/**
 * The CUSTOM ME logo.
 *
 * When `site.logo` is configured the original artwork is rendered untouched.
 * Otherwise a PLACEHOLDER wordmark is shown (flagged with
 * `data-placeholder-logo`) — it is not the brand's logo.
 */
export function Logo({ className, tone = "ink" }: { className?: string; tone?: "ink" | "paper" }) {
  const art = tone === "paper" ? (site.logoOnDark ?? site.logo) : site.logo;
  if (art) {
    const img = (
      <Image
        src={art.src}
        width={art.width}
        height={art.height}
        alt={site.logoAlt}
        preload
        className={`h-full w-auto object-contain object-left ${className ?? ""}`}
      />
    );
    // The navy and mint artwork would vanish on navy: give it a paper plate
    if (tone === "paper" && !site.logoOnDark) return <span className="inline-flex h-full rounded-md bg-sheet px-3 py-2">{img}</span>;
    return img;
  }

  return (
    <span
      className={`inline-flex items-end gap-[0.18em] whitespace-nowrap font-marker leading-none ${tone === "ink" ? "text-ink" : "text-sheet"} ${className ?? ""}`}
      role="img"
      aria-label={site.logoAlt}
      title={`${site.logoAlt} (placeholder wordmark)`}
      data-placeholder-logo="true"
    >
      <span aria-hidden className="text-[1.6em]">CUSTOM</span>
      <span aria-hidden className={`relative text-[1.6em] ${tone === "ink" ? "" : "text-mint"}`}>
        ME
        <svg viewBox={MARKS.crown.viewBox} className="absolute -top-[0.55em] left-[0.1em] h-[0.55em] w-[0.75em] -rotate-6 text-mint" fill="none" stroke="currentColor" strokeWidth="9" strokeLinejoin="round">
          <path d={MARKS.crown.d} />
        </svg>
      </span>
    </span>
  );
}
