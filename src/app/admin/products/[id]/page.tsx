import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminBar } from "@/components/admin/AdminBar";
import { ProductForm } from "@/components/admin/ProductForm";
import { Loading, PageTitle } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/server/auth";
import { readProducts } from "@/lib/server/products";
import { readCatalogOptions } from "@/lib/server/settings";

export const metadata = { title: "Edit product" };

export default function EditProductPage({ params }: PageProps<"/admin/products/[id]">) {
  return (
    <>
      <AdminBar />
      <main id="main" className="mx-auto max-w-[900px] px-5 py-10">
        <Suspense fallback={<Loading />}>
          <EditForm params={params} />
        </Suspense>
      </main>
    </>
  );
}

async function EditForm({ params }: { params: PageProps<"/admin/products/[id]">["params"] }) {
  await requireAdmin();
  const { id } = await params;
  const [products, options] = await Promise.all([readProducts(), readCatalogOptions()]);
  const product = products.find((p) => p.id === id);
  if (!product) notFound();
  return (
    <>
      <PageTitle>Edit {product.name}</PageTitle>
      <div className="mt-8">
        <ProductForm product={product} options={options} />
      </div>
    </>
  );
}
