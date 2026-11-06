import { Suspense } from "react";
import { AdminBar } from "@/components/admin/AdminBar";
import { OptionsForm } from "@/components/admin/OptionsForm";
import { Loading, PageTitle } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/server/auth";
import { readPricing } from "@/lib/server/settings";

export const metadata = { title: "Product options" };

export default function OptionsPage() {
  return (
    <>
      <AdminBar />
      <main id="main" className="mx-auto max-w-[980px] px-4 py-6 sm:px-5 sm:py-10">
        <PageTitle sub="The choices for each type of product: laptop sizes, the strap, ruler lengths, notebook sizes and pages (lined, dotted, grid…), with what each one adds to the price. Add, rename, reorder, take out of stock or remove any of them. Saving updates the store right away.">
          Product options
        </PageTitle>
        <div className="mt-8">
          <Suspense fallback={<Loading />}>
            <Options />
          </Suspense>
        </div>
      </main>
    </>
  );
}

async function Options() {
  await requireAdmin();
  return <OptionsForm pricing={await readPricing()} />;
}
