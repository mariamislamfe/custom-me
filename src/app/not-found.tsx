import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

/** Unknown addresses (outside the shop's own layout, so it brings its own way home). */
export default function NotFound() {
  return (
    <div className="drafting flex min-h-dvh flex-col">
      <Link href="/" className="gutter block h-16 w-44 py-4" aria-label="CUSTOM ME home">
        <Logo className="h-full w-full text-[0.9rem]" />
      </Link>
      <div className="gutter flex flex-1 flex-col justify-center pb-20">
        <p className="type-label text-muted">404</p>
        <h1 className="type-display mt-3 text-[clamp(3rem,12vw,10rem)]">Off the grid.</h1>
        <p className="mt-5 max-w-md text-lg">This page doesn’t exist — but the one you design might.</p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/shop" className="btn btn-ink">
            Shop the designs
          </Link>
          <Link href="/lab" className="btn btn-mint">
            Open the Lab
          </Link>
        </div>
      </div>
    </div>
  );
}
