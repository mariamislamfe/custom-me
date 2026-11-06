import Link from "next/link";
import { Suspense } from "react";
import { AdminBar } from "@/components/admin/AdminBar";
import { Badge, Loading, PageTitle } from "@/components/admin/ui";
import { DEPOSIT_STATUSES, ORDER_STATUSES } from "@/config/orders";
import { formatDate, money } from "@/lib/format";
import { requireAdmin } from "@/lib/server/auth";
import { readOrders } from "@/lib/server/orders";

export const metadata = { title: "Orders" };

export default function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  return (
    <>
      <AdminBar />
      <main id="main" className="mx-auto max-w-[1180px] px-4 py-6 sm:px-5 sm:py-10">
        <Suspense fallback={<Loading what="Loading orders…" />}>
          <OrderList searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}

async function OrderList({ searchParams }: { searchParams: PageProps<"/admin/orders">["searchParams"] }) {
  await requireAdmin();
  const [orders, params] = await Promise.all([readOrders(), searchParams]);
  const filter = typeof params.status === "string" ? params.status : params.custom === "1" ? "custom" : "all";
  const shown =
    filter === "all" ? orders : filter === "custom" ? orders.filter((o) => o.lines.some((l) => l.custom)) : orders.filter((o) => o.status === filter);
  const count = (id: string) => orders.filter((o) => o.status === id).length;
  const customCount = orders.filter((o) => o.lines.some((l) => l.custom)).length;

  return (
    <>
      <PageTitle sub={`${orders.length} ${orders.length === 1 ? "order" : "orders"}, ${count("new")} new. Open one for the customer's details, the design files and its status.`}>
        Orders
      </PageTitle>

      {params.deleted === "1" && (
        <p role="status" className="mt-4 bg-mint px-4 py-3 font-semibold">
          Order deleted.
        </p>
      )}

      <nav aria-label="Filter orders" className="mt-6 flex flex-wrap gap-2">
        {[
          { id: "all", label: "All", n: orders.length, href: "/admin/orders" },
          { id: "custom", label: "Custom designs", n: customCount, href: "/admin/orders?custom=1" },
          ...ORDER_STATUSES.map((s) => ({ id: s.id, label: s.label, n: count(s.id), href: `/admin/orders?status=${s.id}` })),
        ].map((f) => (
          <Link
            key={f.id}
            href={f.href}
            aria-current={filter === f.id ? "page" : undefined}
            className="inline-flex min-h-10 items-center gap-1.5 px-4 text-sm font-semibold ring-2 ring-ink/15 hover:ring-ink/40 aria-[current=page]:bg-ink aria-[current=page]:text-sheet aria-[current=page]:ring-ink"
          >
            {f.label} <span className="tabular-nums opacity-70">{f.n}</span>
          </Link>
        ))}
      </nav>

      {shown.length === 0 ? (
        <div className="drafting mt-10 flex flex-col items-center gap-3 border-2 border-ink/15 px-6 py-16 text-center">
          <p className="type-condensed text-4xl">{orders.length ? "Nothing here" : "No orders yet"}</p>
          <p className="max-w-[44ch] text-muted">{orders.length ? "No orders match this filter." : "When a customer checks out, the order shows up here right away."}</p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {shown.map((o) => {
            const status = ORDER_STATUSES.find((s) => s.id === o.status) ?? ORDER_STATUSES[0];
            const deposit = o.deposit ? DEPOSIT_STATUSES.find((s) => s.id === o.deposit!.status) : null;
            const items = o.lines.reduce((n, l) => n + l.quantity, 0);
            const hasCustom = o.lines.some((l) => l.custom);
            return (
              <li key={o.id}>
                {/* Phones: number and total on top, customer below, then the badges. Wider: one row. */}
                <Link
                  href={`/admin/orders/${o.id}`}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border-2 border-ink/15 bg-sheet p-4 transition-colors hover:border-ink md:flex md:flex-wrap md:gap-x-6"
                >
                  <div className="min-w-0 md:min-w-[8rem]">
                    <p className="font-mono text-lg font-bold">{o.number}</p>
                    <p className="text-sm text-muted">{formatDate(o.createdAt)}</p>
                  </div>
                  <p className="text-right font-mono font-bold md:order-last md:ml-auto">{money(o.total)}</p>
                  <div className="col-span-2 min-w-0 md:flex-1">
                    <p className="truncate font-semibold">{o.customer.name}</p>
                    <p className="truncate text-sm text-muted">
                      {o.customer.phone}, {o.customer.governorate}
                    </p>
                  </div>
                  <div className="col-span-2 flex flex-wrap items-center gap-2">
                    <span className="text-sm">
                      {items} {items === 1 ? "piece" : "pieces"}
                    </span>
                    {hasCustom && <span className="bg-mint px-2 py-0.5 text-xs font-bold">Custom design</span>}
                    {o.promo && <Badge tone="bg-mint-soft">{o.promo.code}</Badge>}
                    {deposit && (
                      <Badge tone={deposit.tone}>
                        {o.payment === "instapay-full" ? "Paid in full" : "Deposit"}: {deposit.label.toLowerCase()}
                      </Badge>
                    )}
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
