import Link from "next/link";
import { Suspense } from "react";
import { AdminBar } from "@/components/admin/AdminBar";
import { DeleteEntryButton, ExpenseForm, OutsideSaleForm } from "@/components/admin/FinanceForms";
import { Card, Loading, PageTitle } from "@/components/admin/ui";
import { EXPENSE_CATEGORIES } from "@/config/finance";
import { activeMonths, ALL_TIME, cairoDay, monthLabel, summarize, type LedgerRow } from "@/lib/finance";
import { money } from "@/lib/format";
import { requireAdmin } from "@/lib/server/auth";
import { readOrders } from "@/lib/server/orders";
import { readFinanceEntries } from "@/lib/server/settings";

export const metadata = { title: "Finance" };

export default function FinancePage({ searchParams }: PageProps<"/admin/finance">) {
  return (
    <>
      <AdminBar />
      <main id="main" className="mx-auto max-w-[1180px] px-5 py-10">
        <PageTitle sub="Sales are what customers paid for the pieces (delivery fees go to the courier): every website order that isn't cancelled, plus the outside orders you add here. Expenses come off the top.">
          Finance
        </PageTitle>
        <Suspense fallback={<Loading />}>
          <Finance searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}

async function Finance({ searchParams }: { searchParams: PageProps<"/admin/finance">["searchParams"] }) {
  await requireAdmin();
  const [orders, entries, params] = await Promise.all([readOrders(), readFinanceEntries(), searchParams]);
  const months = activeMonths(orders, entries);
  const month = typeof params.month === "string" && months.includes(params.month) ? params.month : ALL_TIME;
  const { rows, totals, byCategory } = summarize(orders, entries, month);
  const period = month === ALL_TIME ? "All time" : monthLabel(month);
  const today = cairoDay(new Date());
  const stat = "border-2 border-ink/15 bg-sheet p-5";

  return (
    <>
      <nav aria-label="Period" className="mt-6 flex flex-wrap gap-2">
        {[ALL_TIME, ...months].map((m) => (
          <Link
            key={m}
            href={m === ALL_TIME ? "/admin/finance" : `/admin/finance?month=${m}`}
            aria-current={m === month ? "page" : undefined}
            className="inline-flex min-h-10 items-center px-4 text-sm font-semibold ring-2 ring-ink/15 hover:ring-ink/40 aria-[current=page]:bg-ink aria-[current=page]:text-sheet aria-[current=page]:ring-ink"
          >
            {m === ALL_TIME ? "All time" : monthLabel(m)}
          </Link>
        ))}
      </nav>

      <h2 className="sr-only">{period} totals</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <section className={`border-2 border-ink p-5 sm:col-span-2 lg:col-span-1 ${totals.net >= 0 ? "bg-mint" : "bg-alert/15"}`}>
          <h3 className="font-semibold">Net</h3>
          <p className="type-condensed mt-1 font-mono text-4xl">
            {totals.net < 0 ? "−" : ""}
            {money(Math.abs(totals.net))}
          </p>
          <p className="mt-1 text-sm">Sales minus expenses</p>
        </section>
        <section className={stat}>
          <h3 className="font-semibold">Sales</h3>
          <p className="mt-1 font-mono text-3xl font-bold">{money(totals.sales)}</p>
          <p className="mt-1 text-sm text-muted">
            {totals.pieces} {totals.pieces === 1 ? "piece" : "pieces"}, {totals.custom} custom
          </p>
        </section>
        <section className={stat}>
          <h3 className="font-semibold">Expenses</h3>
          <p className="mt-1 font-mono text-3xl font-bold">{money(totals.expenses)}</p>
          <dl className="mt-1 grid gap-0.5 text-sm">
            {EXPENSE_CATEGORIES.filter((c) => byCategory[c.id]).map((c) => (
              <div key={c.id} className="flex justify-between gap-2">
                <dt className="text-muted">{c.label}</dt>
                <dd className="font-mono">{money(byCategory[c.id])}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className={stat}>
          <h3 className="font-semibold">Orders</h3>
          <p className="mt-1 font-mono text-3xl font-bold">{totals.websiteOrders + totals.outsideOrders}</p>
          <p className="mt-1 text-sm text-muted">
            {totals.websiteOrders} on the website, {totals.outsideOrders} outside
          </p>
        </section>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div className="grid h-fit gap-6">
          <Card title="Add an expense" hint="Materials, printing, packaging, ads… anything you paid for.">
            <ExpenseForm today={today} />
          </Card>
          <Card title="Add an outside order" hint="An order that didn't come through the website, e.g. on Instagram or at a bazaar.">
            <OutsideSaleForm today={today} />
          </Card>
        </div>

        <Card title={period}>
          {rows.length === 0 ? (
            <p className="text-muted">Nothing yet for this period.</p>
          ) : (
            <ul className="divide-y-2 divide-ink/5">
              {rows.map((r) => (
                <LedgerItem key={r.kind === "order" ? r.order.id : r.entry.id} row={r} />
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

const shortDay = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

function LedgerItem({ row }: { row: LedgerRow }) {
  let title: React.ReactNode;
  let detail: string;
  let amount: number;
  if (row.kind === "order") {
    title = (
      <Link href={`/admin/orders/${row.order.id}`} className="underline-offset-4 hover:underline">
        {row.order.number}, {row.order.customer.name}
      </Link>
    );
    detail = `Website · ${row.pieces} ${row.pieces === 1 ? "piece" : "pieces"}${row.custom ? `, ${row.custom} custom` : ""}`;
    amount = row.sales;
  } else if (row.kind === "sale") {
    title = row.entry.note || "Outside order";
    detail = `Outside order${row.entry.pieces ? ` · ${row.entry.pieces} ${row.entry.pieces === 1 ? "piece" : "pieces"}` : ""}`;
    amount = row.entry.amount;
  } else {
    const category = EXPENSE_CATEGORIES.find((c) => c.id === row.entry.category)?.label ?? "Expense";
    title = row.entry.note || category;
    detail = `Expense · ${category}`;
    amount = row.entry.amount;
  }
  const out = row.kind === "expense";

  return (
    <li className="flex items-center gap-3 py-3">
      <span className="w-14 shrink-0 text-sm font-semibold tabular-nums text-muted">{shortDay(row.date)}</span>
      <span className="min-w-0 flex-1">
        <span className="block break-words font-semibold">{title}</span>
        <span className="block text-sm text-muted">{detail}</span>
      </span>
      <span className={`shrink-0 font-mono font-bold ${out ? "text-alert" : ""}`}>
        {out ? "−" : "+"}
        {money(amount)}
      </span>
      {row.kind !== "order" && <DeleteEntryButton id={row.entry.id} />}
    </li>
  );
}
