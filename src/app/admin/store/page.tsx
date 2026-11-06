import { Suspense } from "react";
import { AdminBar } from "@/components/admin/AdminBar";
import { StoreForm } from "@/components/admin/StoreForm";
import { Loading, PageTitle } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/server/auth";
import { readStoreInfo } from "@/lib/server/settings";

export const metadata = { title: "Store & payments" };

export default function StorePage() {
  return (
    <>
      <AdminBar />
      <main id="main" className="mx-auto max-w-[900px] px-4 py-6 sm:px-5 sm:py-10">
        <PageTitle sub="Your InstaPay details, the deposit, the discount for paying it all up front, and your Instagram. Saving updates checkout right away.">Store &amp; payments</PageTitle>
        <div className="mt-8">
          <Suspense fallback={<Loading />}>
            <Store />
          </Suspense>
        </div>
      </main>
    </>
  );
}

async function Store() {
  await requireAdmin();
  return <StoreForm info={await readStoreInfo()} />;
}
