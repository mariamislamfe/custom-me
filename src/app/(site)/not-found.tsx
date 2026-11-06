import Link from "next/link";

export default function NotFound() {
  return (
    <div className="drafting gutter flex min-h-[80vh] flex-col justify-center pb-20 pt-32">
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
  );
}
