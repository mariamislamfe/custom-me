import Link from "next/link";
import { Suspense } from "react";
import { AdminBar } from "@/components/admin/AdminBar";
import { DeliveryFeesForm, PricingForm } from "@/components/admin/SettingsForms";
import { Loading, PageTitle } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/server/auth";
import { pricingSaved, readDeliveryFees, readPricing } from "@/lib/server/settings";

export const metadata = { title: "Prices & delivery" };

export default function SettingsPage({ searchParams }: PageProps<"/admin/settings">) {
  return (
    <>
      <AdminBar />
      <main id="main" className="mx-auto max-w-[900px] px-5 py-10">
        <PageTitle sub="What custom pieces cost, what personalizing a shop design adds, and the delivery fee for each governorate. Saving updates the store right away.">Prices & delivery</PageTitle>
        <Suspense fallback={<Loading />}>
          <Settings searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}

async function Settings({ searchParams }: { searchParams: PageProps<"/admin/settings">["searchParams"] }) {
  await requireAdmin();
  const [pricing, saved, fees, params] = await Promise.all([readPricing(), pricingSaved(), readDeliveryFees(), searchParams]);
  const tab = params.tab === "delivery" ? "delivery" : "prices";
  return (
    <>
      <nav aria-label="Settings" className="mt-6 flex gap-2">
        {[
          { id: "prices", label: "Prices", href: "/admin/settings" },
          { id: "delivery", label: "Delivery fees", href: "/admin/settings?tab=delivery" },
        ].map((t) => (
          <Link
            key={t.id}
            href={t.href}
            aria-current={tab === t.id ? "page" : undefined}
            className="inline-flex min-h-10 items-center px-4 font-semibold ring-2 ring-ink/15 hover:ring-ink/40 aria-[current=page]:bg-ink aria-[current=page]:text-sheet aria-[current=page]:ring-ink"
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <div className="mt-6">
        {tab === "prices" ? (
          <>
            {!saved && (
              <p className="mb-6 bg-amber px-5 py-3">
                <strong>These are starting values, not your prices yet.</strong> Check every box and press Save prices before you take orders.
              </p>
            )}
            <PricingForm pricing={pricing} />
          </>
        ) : (
          <DeliveryFeesForm fees={fees} />
        )}
      </div>
    </>
  );
}
