import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { AdminBar } from "@/components/admin/AdminBar";
import { ProductRowActions } from "@/components/admin/ProductRowActions";
import { Badge, Loading, PageTitle } from "@/components/admin/ui";
import { categories, categoryOrder, ownPrices } from "@/data/catalog";
import { money } from "@/lib/format";
import { requireAdmin } from "@/lib/server/auth";
import { readProducts } from "@/lib/server/products";

export const metadata = { title: "Products" };

export default function AdminProducts({ searchParams }: PageProps<"/admin">) {
  return (
    <>
      <AdminBar />
      <main id="main" className="mx-auto max-w-[1180px] px-5 py-10">
        <Suspense fallback={<Loading what="Loading products…" />}>
          <ProductList searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}

async function ProductList({ searchParams }: { searchParams: PageProps<"/admin">["searchParams"] }) {
  await requireAdmin();
  const [products, params] = await Promise.all([readProducts(), searchParams]);
  const saved = typeof params.saved === "string" ? params.saved : null;
  const live = products.filter((p) => p.published);
  const emptyCategories = categoryOrder.filter((c) => !live.some((p) => p.category === c));
  const unpriced = live.filter((p) => !ownPrices(p)).length;

  return (
    <>
      {saved && (
        <p role="status" className="mb-6 bg-mint px-5 py-3 font-semibold">
          Saved “{saved}”. The store is updated.
        </p>
      )}
      {unpriced > 0 && (
        <p className="mb-3 bg-amber px-5 py-3">
          <strong>
            {unpriced} live {unpriced === 1 ? "product has" : "products have"} no price yet.
          </strong>{" "}
          The store shows them with “Price soon” and they can&apos;t be ordered until you add a price.
        </p>
      )}
      {emptyCategories.length > 0 && (
        <p className="mb-6 bg-fog px-5 py-3">
          Nothing live yet in {emptyCategories.map((c) => categories[c].label.toLowerCase()).join(", ")}: the homepage skips{" "}
          {emptyCategories.length === 1 ? "that section" : "those sections"} and the shop points customers to the Lab.
        </p>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageTitle sub={`${products.length} ${products.length === 1 ? "product" : "products"}, ${live.length} live in the store. The order here is the order in the shop.`}>
          Products
        </PageTitle>
        <Link href="/admin/products/new" className="btn btn-ink">
          Add product
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="drafting mt-10 flex flex-col items-center gap-4 border-2 border-ink/15 px-6 py-16 text-center">
          <p className="type-condensed text-4xl">No products yet</p>
          <p className="max-w-[44ch] text-muted">
            Add your first art bag, sleeve, T-ruler case or notebook. Shoot it on white paper: the background is removed automatically and it appears in the store as soon as you
            publish it.
          </p>
          <Link href="/admin/products/new" className="btn btn-ink mt-2">
            Add your first product
          </Link>
        </div>
      ) : (
        <ul className="mt-8 grid gap-3">
          {products.map((p, i) => {
            return (
              <li key={p.id} className="flex flex-wrap items-center gap-4 border-2 border-ink/15 bg-sheet p-3 pr-4 sm:flex-nowrap">
                <div className="relative grid size-20 shrink-0 place-items-center overflow-hidden bg-fog">
                  {p.images[0] ? (
                    <Image src={p.images[0].src} alt="" fill sizes="80px" className="object-contain p-1.5" />
                  ) : (
                    <span className="text-xs font-semibold text-muted">
                      No photo
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-semibold">{p.name}</p>
                  <p className="text-sm text-muted">
                    {categories[p.category].singular}, {priceSpan(p)}
                    {p.sizes.length > 0 ? `, ${p.sizes.length} sizes` : ""}
                    {p.colours.length > 0 ? `, ${p.colours.length} colours` : ""}
                    {p.images.length > 1 ? `, ${p.images.length} photos` : ""}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Badge tone={p.published ? "bg-mint" : "bg-fog"}>{p.published ? "Live" : "Draft"}</Badge>
                    {!ownPrices(p) && <Badge tone="bg-amber">No price</Badge>}
                    {!p.available && <Badge tone="bg-amber">Sold out</Badge>}
                    {p.isNew && <Badge tone="bg-mint-soft">New</Badge>}
                    {p.customizable && <Badge tone="bg-fog">Customizable</Badge>}
                  </div>
                </div>
                <ProductRowActions id={p.id} name={p.name} slug={p.slug} published={p.published} first={i === 0} last={i === products.length - 1} />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function priceSpan(p: Parameters<typeof ownPrices>[0]) {
  const span = ownPrices(p);
  if (!span) return "no price yet";
  return span.min === span.max ? money(span.min) : `${money(span.min)}–${money(span.max)}`;
}
