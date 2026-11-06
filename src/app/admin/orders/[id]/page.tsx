import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminBar } from "@/components/admin/AdminBar";
import { CopyButton } from "@/components/admin/CopyButton";
import { DesignFiles, OrderMockup } from "@/components/admin/CustomOrderTools";
import { fitClass } from "@/components/products/shapes";
import { DeleteOrderButton } from "@/components/admin/DeleteOrderButton";
import { OrderAdminForm } from "@/components/admin/OrderAdminForm";
import { Badge, Card, Loading, Row } from "@/components/admin/ui";
import { baseColour, colourName, fontOf, lab, type DesignLayer } from "@/config/customization";
import { DEPOSIT_STATUSES, ORDER_STATUSES } from "@/config/orders";
import { PAYMENT_LABELS } from "@/config/payments";
import { categories, type CategoryId } from "@/data/catalog";
import { formatDate, money } from "@/lib/format";
import { requireAdmin } from "@/lib/server/auth";
import { readOrder } from "@/lib/server/orders";
import type { Order, OrderLine } from "@/lib/types";

export const metadata = { title: "Order" };

export default function OrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  return (
    <>
      <AdminBar />
      <main id="main" className="mx-auto max-w-[1180px] px-5 py-10">
        <Suspense fallback={<Loading what="Loading order…" />}>
          <OrderDetail params={params} />
        </Suspense>
      </main>
    </>
  );
}

async function OrderDetail({ params }: { params: PageProps<"/admin/orders/[id]">["params"] }) {
  await requireAdmin();
  const { id } = await params;
  const order = await readOrder(id);
  if (!order) notFound();
  const status = ORDER_STATUSES.find((s) => s.id === order.status) ?? ORDER_STATUSES[0];
  const deposit = order.deposit ? DEPOSIT_STATUSES.find((s) => s.id === order.deposit!.status) : null;
  const c = order.customer;
  const fullAddress = [c.address, c.city, c.governorate].filter(Boolean).join(", ");

  return (
    <>
      <Link href="/admin/orders" className="text-sm font-semibold underline-offset-4 hover:underline">
        ← All orders
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="type-display font-mono text-[clamp(2.4rem,6vw,4rem)]">{order.number}</h1>
          <p className="mt-1 text-muted">
            {formatDate(order.createdAt)} · {PAYMENT_LABELS[order.payment] ?? order.payment}
          </p>
        </div>
        <Badge tone={`${status.tone} px-4 py-1.5 text-sm`}>{status.label}</Badge>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="grid h-fit gap-6">
          {order.lines.map((line, i) => (
            <LineCard key={i} line={line} index={i} order={order} />
          ))}
        </div>

        <div className="grid h-fit gap-6">
          <Card title="Customer">
            <dl className="grid gap-2">
              <Row label="Name" value={c.name} />
              <Row label="Phone" value={c.phone} href={`tel:${c.phone}`} />
              <Row label="WhatsApp" value="Open chat" href={`https://wa.me/2${c.phone}`} />
              {c.email && <Row label="Email" value={c.email} href={`mailto:${c.email}`} />}
              <Row label="Governorate" value={c.governorate} />
              <Row label="City / area" value={c.city} />
              <Row label="Address" value={c.address} />
              {c.notes && <Row label="Notes" value={c.notes} />}
            </dl>
            <div className="mt-4 flex items-center justify-between gap-3 bg-paper p-3 text-sm">
              <span className="min-w-0">{fullAddress}</span>
              <CopyButton value={`${c.name}\n${c.phone}\n${fullAddress}`} label="name, phone and full address" />
            </div>
          </Card>

          <Card title="Payment">
            <dl className="grid gap-1.5">
              <Money label="Subtotal" value={money(order.subtotal)} />
              {order.promo && <Money label={`Promo ${order.promo.code}`} value={`− ${money(order.promo.amount)}`} />}
              {!!order.instapayDiscount && <Money label="Paid-in-full discount (InstaPay)" value={`− ${money(order.instapayDiscount)}`} />}
              <Money label="Delivery" value={order.shipping == null ? "Confirm on the call" : money(order.shipping)} />
              <Money label="Total" value={money(order.total)} />
              {order.deposit && <Money label={order.payment === "instapay-full" ? "Paid by InstaPay" : "Deposit (InstaPay)"} value={money(order.deposit.amount)} />}
              <Money label={order.shipping == null ? "Cash on delivery (+ delivery)" : "Cash on delivery"} value={money(order.codBalance)} strong />
            </dl>
            {order.deposit && deposit && (
              <div className="mt-4 bg-paper p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{order.payment === "instapay-full" ? "InstaPay payment" : "Deposit"}</p>
                  <Badge tone={deposit.tone}>{deposit.label}</Badge>
                </div>
                <dl className="mt-2 grid gap-1 text-sm">
                  <Row label="Paid from" value={order.deposit.payer} />
                  {order.deposit.reference && <Row label="Reference" value={order.deposit.reference} />}
                </dl>
                <a href={`/api/admin/receipts/${order.deposit.receiptFileId}`} target="_blank" rel="noopener" className="mt-3 block">
                  {/* eslint-disable-next-line @next/next/no-img-element -- private, login-protected file */}
                  <img src={`/api/admin/receipts/${order.deposit.receiptFileId}`} alt="Screenshot of the InstaPay transfer" className="max-h-80 w-full bg-sheet object-contain ring-2 ring-ink/10" />
                  <span className="mt-1 block text-sm font-semibold underline underline-offset-4">Open full size</span>
                </a>
              </div>
            )}
          </Card>

          <Card title="Status & notes">
            <OrderAdminForm order={order} />
          </Card>

          <DeleteOrderButton id={order.id} number={order.number} />
        </div>
      </div>
    </>
  );
}

function LineCard({ line, index, order }: { line: OrderLine; index: number; order: Order }) {
  return (
    <section className="border-2 border-ink/15 bg-sheet p-5">
      <div className="flex flex-wrap items-start gap-4">
        <div className="relative grid h-36 w-28 shrink-0 place-items-center overflow-hidden bg-paper p-2">
          {line.custom ? (
            <OrderMockup custom={line.custom} category={line.category} className={fitClass(line.category)} />
          ) : line.image ? (
            <Image src={line.image.src} alt="" fill sizes="112px" className="object-contain p-2" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-muted">
            Item {index + 1}, {categories[line.category].singular}
            {line.custom && <span className="ml-2 bg-mint px-2 py-0.5 text-xs font-bold text-ink">{line.custom.design ? "Personalized shop design" : line.custom.template ? `Edited design “${line.custom.template.name}”` : "Custom design"}</span>}
          </p>
          <h2 className="type-condensed mt-1 text-3xl leading-tight">{line.name}</h2>
          <dl className="mt-2 grid gap-1">
            {line.options.map((o) => {
              const [k, ...v] = o.split(": ");
              return <Row key={o} label={k} value={v.join(": ")} />;
            })}
            <Row label="Quantity" value={String(line.quantity)} />
            <Row label="Price" value={`${money(line.unitPrice)} each, ${money(line.unitPrice * line.quantity)} total`} />
          </dl>
          {line.slug && (
            <div className="mt-3 flex flex-wrap gap-2 text-sm font-semibold">
              <Link href={`/product/${line.slug}`} target="_blank" className="px-3 py-1.5 ring-2 ring-ink/15 hover:ring-ink/40">
                View product
              </Link>
              {line.image && (
                <a href={line.image.src} download className="px-3 py-1.5 ring-2 ring-ink/15 hover:ring-ink/40">
                  Download photo
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {line.custom && (
        <div className="mt-5 border-t-2 border-dashed border-ink/15 pt-5">
          <DesignFiles custom={line.custom} category={line.category} fileName={`${order.number}-item${index + 1}-print.png`} />
          <h3 className="mt-6 flex flex-wrap items-center gap-2 font-semibold">
            Layers, bottom to top ·{" "}
            {line.custom.design ? (
              <>printed on top of the design “{line.custom.design.name}”</>
            ) : (
              <>
                base colour <span aria-hidden className="inline-block size-4 border-2 border-ink" style={{ background: baseColour(line.custom) }} />
                {colourName(baseColour(line.custom))}
                <CopyButton value={baseColour(line.custom)} label="colour code" />
              </>
            )}
          </h3>
          <ol className="mt-2 grid gap-3">
            {line.custom.layers.map((layer, k) => (
              <li key={layer.id} className="bg-paper p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">
                    Layer {k + 1}: {layer.kind === "image" ? `Image “${layer.name}”` : `Text “${layer.text}”`}
                  </p>
                  {layer.kind === "image" && layer.fileId && (
                    <a
                      href={`/api/admin/designs/${layer.fileId}?download=${encodeURIComponent(`${order.number}-${layer.name.replace(/\.[^.]+$/, "")}.${layer.fileId.split(".").pop()}`)}`}
                      className="bg-ink px-3 py-1.5 text-xs font-bold text-sheet"
                      title="The file exactly as uploaded, before the customer resized or moved it"
                    >
                      Download original upload
                    </a>
                  )}
                  {layer.kind === "text" && <CopyButton value={layer.text} label="text" />}
                </div>
                <dl className="mt-1.5 grid gap-0.5 text-sm">
                  {describePlacement(layer, line.category).map((r) => (
                    <Row key={r.k} label={r.k} value={r.v} />
                  ))}
                </dl>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

const pct = (v: number) => `${Math.round(v * 100)}%`;
const cm = (v: number) => `${(Math.round(v * 10) / 10).toFixed(1)} cm`;

/** Where a layer sits, in the terms production needs (centimetres once the print area size is set). */
function describePlacement(layer: DesignLayer, category: CategoryId) {
  const area = lab.printAreaCm[category];
  const size = layer.kind === "image" ? layer.width : layer.size;
  const sizeLabel = layer.kind === "image" ? "Width" : "Text height";
  const rows: { k: string; v: string }[] = [];
  if (area) {
    rows.push({ k: "Centre", v: `${cm(layer.x * area.width)} from left, ${cm(layer.y * area.height)} from top` });
    rows.push({ k: sizeLabel, v: cm(size * area.width) });
  } else {
    rows.push({ k: "Centre", v: `${pct(layer.x)} from left, ${pct(layer.y)} from top of the print area` });
    rows.push({ k: sizeLabel, v: `${pct(size)} of the print area's width` });
  }
  rows.push({ k: "Rotation", v: `${Math.round(layer.rotation)}°` });
  if (layer.kind === "text") {
    rows.push({ k: "Lettering", v: `${fontOf(layer.font).label}, ${colourName(layer.ink)}${colourName(layer.ink) === layer.ink.toUpperCase() ? "" : ` (${layer.ink.toUpperCase()})`}` });
  } else {
    rows.push({ k: "Original", v: `${layer.originalWidth} × ${layer.originalHeight} px` });
  }
  return rows;
}

function Money({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? "mt-1 text-lg font-bold" : ""}`}>
      <dt>{label}</dt>
      <dd className="font-mono">{value}</dd>
    </div>
  );
}
