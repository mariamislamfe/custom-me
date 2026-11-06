import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ShopIndex } from "@/components/shop/ShopIndex";
import { categories, categoryOrder, type CategoryId } from "@/data/catalog";

export function generateStaticParams() {
  return categoryOrder.map((category) => ({ category }));
}

export async function generateMetadata({ params }: PageProps<"/shop/[category]">): Promise<Metadata> {
  const { category } = await params;
  const cat = categories[category as CategoryId];
  return cat ? { title: cat.label, description: cat.intro } : {};
}

export default function CategoryPage({ params }: PageProps<"/shop/[category]">) {
  return (
    <Suspense fallback={<div className="min-h-[80vh] pt-28" aria-busy="true" />}>
      <Category params={params} />
    </Suspense>
  );
}

async function Category({ params }: { params: PageProps<"/shop/[category]">["params"] }) {
  const { category } = await params;
  if (!(category in categories)) notFound();
  return <ShopIndex category={category as CategoryId} />;
}
