import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/product/ProductDetail";
import { getStoreProducts } from "@/lib/server/products";

export async function generateStaticParams() {
  const slugs = (await getStoreProducts()).map((p) => ({ slug: p.slug }));
  // Cache Components needs at least one; a store with no products yet prerenders a 404 for it
  return slugs.length ? slugs : [{ slug: "no-products-yet" }];
}

export async function generateMetadata({ params }: PageProps<"/product/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = (await getStoreProducts()).find((x) => x.slug === slug);
  return p ? { title: p.name, description: p.blurb || undefined } : {};
}

export default function ProductPage({ params }: PageProps<"/product/[slug]">) {
  return (
    <Suspense fallback={<div className="drafting min-h-[80vh] pt-16 md:pt-[72px]" aria-busy="true" />}>
      <Product params={params} />
    </Suspense>
  );
}

async function Product({ params }: { params: PageProps<"/product/[slug]">["params"] }) {
  const { slug } = await params;
  const product = (await getStoreProducts()).find((p) => p.slug === slug);
  if (!product) notFound();
  return <ProductDetail product={product} />;
}
