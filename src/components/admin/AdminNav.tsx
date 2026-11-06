"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useRef, type ReactNode } from "react";

const LINKS = [
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin", label: "Products" },
  { href: "/admin/finance", label: "Finance" },
  { href: "/admin/options", label: "Options" },
  { href: "/admin/settings", label: "Prices & delivery" },
  { href: "/admin/store", label: "Payments" },
  { href: "/admin/promos", label: "Promo codes" },
  { href: "/admin/notifications", label: "Alerts" },
];

/** Product pages live under /admin/products, so they count as "Products". */
const isCurrent = (path: string, href: string) =>
  href === "/admin" ? path === "/admin" || path.startsWith("/admin/products") : path === href || path.startsWith(`${href}/`);

const link = "px-3 py-2 font-semibold hover:bg-mint-soft aria-[current=page]:bg-ink aria-[current=page]:text-sheet";

/**
 * The dashboard links. Phones: one row that scrolls sideways, with the current page scrolled into view.
 * The current page is only known at request time, so the plain links render first and the highlight streams in.
 */
export function AdminNav({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<NavLinks path={null}>{children}</NavLinks>}>
      <CurrentNav>{children}</CurrentNav>
    </Suspense>
  );
}

function CurrentNav({ children }: { children: ReactNode }) {
  return <NavLinks path={usePathname()}>{children}</NavLinks>;
}

function NavLinks({ path, children }: { path: string | null; children: ReactNode }) {
  const nav = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = nav.current;
    const current = el?.querySelector<HTMLElement>("[aria-current=page]");
    if (!el || !current || el.scrollWidth <= el.clientWidth) return;
    el.scrollLeft = current.offsetLeft - (el.clientWidth - current.offsetWidth) / 2;
  }, [path]);

  return (
    <nav
      ref={nav}
      aria-label="Dashboard"
      className="no-scrollbar -mx-4 flex w-[calc(100%+2rem)] items-center gap-1 overflow-x-auto px-2 pb-1 *:shrink-0 *:whitespace-nowrap sm:-mx-5 sm:w-[calc(100%+2.5rem)] sm:px-3 md:mx-0 md:w-auto md:flex-wrap md:overflow-visible md:px-0 md:pb-0"
    >
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} aria-current={path && isCurrent(path, l.href) ? "page" : undefined} className={link}>
          {l.label}
        </Link>
      ))}
      {children}
    </nav>
  );
}
