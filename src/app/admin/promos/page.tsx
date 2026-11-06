import { Suspense } from "react";
import { AdminBar } from "@/components/admin/AdminBar";
import { NewPromoForm, PromoRowActions } from "@/components/admin/PromoForms";
import { Badge, Card, Loading, PageTitle } from "@/components/admin/ui";
import Link from "next/link";
import { cairoDay } from "@/lib/finance";
import { money } from "@/lib/format";
import { promoLabel, promoProblem } from "@/lib/promo";
import { requireAdmin } from "@/lib/server/auth";
import { readPromoCodes, readStoreInfo } from "@/lib/server/settings";

export const metadata = { title: "Promo codes" };

export default function PromosPage() {
  return (
    <>
      <AdminBar />
      <main id="main" className="mx-auto max-w-[900px] px-5 py-10">
        <PageTitle sub="Codes customers type at checkout for money off their items (delivery is never discounted). Pause a code to stop it without losing it.">
          Promo codes
        </PageTitle>
        <Suspense fallback={<Loading />}>
          <Promos />
        </Suspense>
      </main>
    </>
  );
}

async function Promos() {
  await requireAdmin();
  const [codes, { payments }] = await Promise.all([readPromoCodes(), readStoreInfo()]);
  const today = cairoDay(new Date());
  return (
    <div className="mt-8 grid gap-6">
      <Card title="New code">
        <NewPromoForm />
      </Card>

      <Card title="Your codes" hint={codes.length ? undefined : "No codes yet. Add one above."}>
        {codes.length > 0 && (
          <ul className="grid gap-3">
            {codes.map((p) => {
              // Why it can't be used right now, ignoring the order size
              const problem = promoProblem({ ...p, minSubtotal: null }, 0, today);
              return (
                <li key={p.code} className="flex flex-wrap items-center justify-between gap-3 bg-paper p-4">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xl font-bold">{p.code}</span>
                      <span className="font-semibold">{promoLabel(p)}</span>
                      <Badge tone={problem ? "bg-fog" : "bg-mint"}>{problem ? problem.replace("That code ", "").replace(/\.$/, "") : "Active"}</Badge>
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      Used {p.uses}
                      {p.maxUses != null ? ` of ${p.maxUses}` : ""} {p.uses === 1 ? "time" : "times"}
                      {p.minSubtotal != null ? ` · orders of ${money(p.minSubtotal)} or more` : ""}
                      {p.expires ? ` · until ${p.expires}` : " · no end date"}
                    </p>
                  </div>
                  <PromoRowActions code={p.code} active={p.active} />
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <p className="text-sm text-muted">
        Paying the whole order by InstaPay gives {payments.fullPaymentDiscountPercent}% off on top of any code. Change it, and your InstaPay details, on{" "}
        <Link href="/admin/store" className="font-semibold underline">
          Store &amp; payments
        </Link>
        .
      </p>
    </div>
  );
}
