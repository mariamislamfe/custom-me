import { Suspense } from "react";
import { AdminBar } from "@/components/admin/AdminBar";
import { ProductForm } from "@/components/admin/ProductForm";
import { Loading, PageTitle } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/server/auth";
import { readCatalogOptions } from "@/lib/server/settings";

export const metadata = { title: "Add product" };

export default function NewProductPage() {
  return (
    <>
      <AdminBar />
      <main id="main" className="mx-auto max-w-[900px] px-4 py-6 sm:px-5 sm:py-10">
        <PageTitle>Add product</PageTitle>
        <div className="mt-8">
          <Suspense fallback={<Loading />}>
            <Guarded />
          </Suspense>
        </div>
      </main>
    </>
  );
}

async function Guarded() {
  await requireAdmin();
  return <ProductForm options={await readCatalogOptions()} />;
}
