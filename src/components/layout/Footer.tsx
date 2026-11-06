import Link from "next/link";
import { site } from "@/config/site";
import { Logo } from "@/components/brand/Logo";
import { NAV } from "@/config/nav";

export function Footer({ instagram, instagramHandle }: { instagram: string; instagramHandle: string }) {
  return (
    <footer className="grain relative overflow-hidden bg-ink text-sheet">
      <div className="gutter relative z-[2] grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr] md:py-20">
        <div>
          <div className="h-24">
            <Logo tone="paper" className="h-full" />
          </div>
          <p className="type-display mt-8 text-[clamp(2rem,5vw,3.6rem)]">
            {site.line.map((l, i) => (
              <span key={l} className={`block ${i === 2 ? "text-mint" : ""}`}>
                {l}
              </span>
            ))}
          </p>
        </div>
        <nav aria-label="Footer">
          <p className="type-label text-mint">Shop</p>
          <ul className="mt-4 space-y-2">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="hover:text-mint">
                  {n.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/stickers/studio" className="hover:text-mint">
                Sticker studio
              </Link>
            </li>
            <li>
              <Link href="/lab" className="hover:text-mint">
                Customization Lab
              </Link>
            </li>
          </ul>
        </nav>
        <div>
          <p className="type-label text-mint">Studio</p>
          <ul className="mt-4 space-y-2">
            <li>
              <Link href="/track" className="hover:text-mint">
                Track your order
              </Link>
            </li>
            <li>
              <Link href="/cart" className="hover:text-mint">
                Your bag
              </Link>
            </li>
            {instagram && (
              <li>
                <a href={instagram} target="_blank" rel="noreferrer" className="hover:text-mint">
                  Instagram {instagramHandle}
                </a>
              </li>
            )}
          </ul>
          <p className="mt-8 max-w-xs text-sm text-sheet/70">
            Product visuals on this site are illustrative renders of each design.
          </p>
        </div>
      </div>
      <div className="gutter relative z-[2] flex flex-wrap items-center justify-between gap-3 border-t border-sheet/15 py-6 font-mono text-xs text-sheet/60">
        <span>© {site.name}</span>
        <span>
          Designed and developed by{" "}
          <a href="https://www.instagram.com/websity.eg" target="_blank" rel="noopener" className="font-bold text-sheet underline decoration-mint decoration-2 underline-offset-4 hover:text-mint">
            Websity
          </a>
        </span>
      </div>
    </footer>
  );
}
