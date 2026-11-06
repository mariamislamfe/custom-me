import Link from "next/link";

/**
 * The compact title row of a one-screen home section: kicker + phrase on the
 * left, intro and "see all" link on the right. Kept to a single line of
 * display type so the product, the picker and the buy box share the screen.
 */
export function SectionHead({
  kicker,
  title,
  titleId,
  intro,
  href,
  linkLabel,
  dark = false,
  titleAnchor,
}: {
  kicker: string;
  title: React.ReactNode;
  titleId: string;
  intro: string;
  href: string;
  linkLabel: string;
  dark?: boolean;
  /** `data-anchor` for the signature line to find the title. */
  titleAnchor?: string;
}) {
  return (
    <header className="gutter relative z-10 flex items-end justify-between gap-6">
      <div className="min-w-0">
        <p className={`type-label ${dark ? "text-mint" : "text-muted"}`}>{kicker}</p>
        <h2 id={titleId} className="type-display mt-1.5 whitespace-nowrap text-[clamp(1.7rem,7.6vw,3.4rem)] md:text-[clamp(3rem,5.6vw,6rem)]">
          <span data-anchor={titleAnchor} className="inline-block">
            {title}
          </span>
        </h2>
      </div>
      <div className="hidden max-w-xs pb-2 md:block">
        <p className={`leading-snug ${dark ? "text-sheet/80" : ""}`}>{intro}</p>
        <Link
          href={href}
          className={`type-label mt-3 inline-block underline decoration-2 underline-offset-4 ${dark ? "hover:text-mint" : "hover:text-muted"}`}
        >
          {linkLabel}
        </Link>
      </div>
      <Link
        href={href}
        aria-label={linkLabel}
        className={`type-label shrink-0 pb-2 underline decoration-2 underline-offset-4 md:hidden ${dark ? "text-sheet" : ""}`}
      >
        All →
      </Link>
    </header>
  );
}
