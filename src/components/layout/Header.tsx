"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Logo } from "@/components/brand/Logo";
import { Underline } from "@/components/marks/Marks";
import { useCart } from "@/lib/cart";
import { ease } from "@/lib/motion";
import { site } from "@/config/site";
import { NAV } from "@/config/nav";

const noop = () => () => {};

/** The header for the current page (reads the URL, so the layout streams it in a Suspense boundary). */
export function Header() {
  return <HeaderView pathname={usePathname()} />;
}

/** Same header without a current page: the prerendered stand-in until the URL is known. */
export function HeaderView({ pathname }: { pathname: string }) {
  const cart = useCart();
  const { setOpen } = cart;
  // This header can hydrate after the bag has loaded (it streams in), so it shows
  // the count only once it has mounted, matching the server-rendered 0.
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const ready = cart.ready && mounted;
  const count = ready ? cart.count : 0;
  // The menu is open only for the route it was opened on, so navigating closes it.
  const [menuAt, setMenuAt] = useState<string | null>(null);
  const menu = menuAt === pathname;
  const [scrolled, setScrolled] = useState(false);
  const menuBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  const isActive = (href: string) => (href === "/shop" ? pathname === "/shop" : pathname.startsWith(href));

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-mint focus:px-4 focus:py-2 focus:font-bold">
        Skip to content
      </a>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color] duration-300 ${
          scrolled || menu ? "border-b-2 border-ink bg-paper" : "border-b-2 border-transparent"
        }`}
      >
        <div className="gutter flex h-16 items-center justify-between gap-6 md:h-[72px]">
          <Link href="/" className="relative z-10 block h-12 shrink-0 md:h-14" aria-label={`${site.name} — home`}>
            <Logo className="h-full" />
          </Link>

          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-7">
              {NAV.map((n) => (
                <li key={n.href} className="relative">
                  <Link href={n.href} className="type-label py-2 text-[0.8rem] text-ink" aria-current={isActive(n.href) ? "page" : undefined}>
                    {n.label}
                  </Link>
                  {isActive(n.href) && <Underline key={pathname} className="absolute -bottom-1.5 left-0 h-2.5 w-full text-mint" strokeWidth={4} />}
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-2 md:gap-3">
            <Link
              href="/lab"
              className={`btn btn-mint btn-sm hidden sm:inline-flex ${pathname.startsWith("/lab") ? "pointer-events-none" : ""}`}
              aria-current={pathname.startsWith("/lab") ? "page" : undefined}
            >
              The Lab
            </Link>
            <button type="button" className="btn btn-paper btn-sm" onClick={() => setOpen(true)} aria-label={`Open bag, ${count} item${count === 1 ? "" : "s"}`}>
              Bag
              <span className="grid h-6 min-w-6 place-items-center bg-ink px-1 font-mono text-xs text-sheet" aria-hidden>
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={ready ? count : "x"}
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 10, opacity: 0 }}
                    transition={{ duration: 0.25, ease: ease.snap }}
                  >
                    {ready ? count : 0}
                  </motion.span>
                </AnimatePresence>
              </span>
            </button>
            <button
              ref={menuBtn}
              type="button"
              className="btn btn-ink btn-sm lg:hidden"
              aria-expanded={menu}
              aria-controls="mobile-menu"
              onClick={() => setMenuAt(menu ? null : pathname)}
            >
              {menu ? "Close" : "Menu"}
            </button>
          </div>
        </div>
      </header>

      <MobileMenu open={menu} onClose={() => { setMenuAt(null); menuBtn.current?.focus(); }} isActive={isActive} />
    </>
  );
}

function MobileMenu({ open, onClose, isActive }: { open: boolean; onClose: () => void; isActive: (h: string) => boolean }) {
  const first = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const links = [...NAV, { href: "/stickers/studio", label: "Sticker studio" }, { href: "/lab", label: "The Lab" }, { href: "/track", label: "Track your order" }, { href: "/cart", label: "Your bag" }];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className="fixed inset-x-0 bottom-0 top-16 z-40 overflow-y-auto bg-ink text-sheet lg:hidden"
          initial={{ clipPath: "inset(0 0 100% 0)" }}
          animate={{ clipPath: "inset(0 0 0% 0)" }}
          exit={{ clipPath: "inset(0 0 100% 0)" }}
          transition={{ duration: 0.55, ease: ease.ink }}
        >
          <nav aria-label="Mobile" className="gutter flex min-h-full flex-col justify-between py-8">
            <ul className="space-y-1">
              {links.map((l, i) => (
                <motion.li
                  key={l.href}
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.05, duration: 0.45, ease: ease.snap }}
                >
                  <Link
                    ref={i === 0 ? first : undefined}
                    href={l.href}
                    onClick={onClose}
                    className={`type-display block py-2 text-[clamp(2.2rem,11vw,4rem)] ${isActive(l.href) ? "text-mint" : ""}`}
                    aria-current={isActive(l.href) ? "page" : undefined}
                  >
                    {l.label}
                  </Link>
                </motion.li>
              ))}
            </ul>
            <p className="type-marker mt-10 text-2xl text-mint">{site.line.join(" ")}</p>
          </nav>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
