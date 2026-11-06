import { Suspense } from "react";
import { AdminBar } from "@/components/admin/AdminBar";
import { PushSetup, RemoveDeviceButton } from "@/components/admin/PushSetup";
import { formatDate } from "@/lib/format";
import { requireAdmin } from "@/lib/server/auth";
import { getVapidKeys, readPushSubscriptions } from "@/lib/server/settings";

export const metadata = { title: "Order notifications" };

export default function NotificationsPage() {
  return (
    <>
      <AdminBar />
      <main id="main" className="mx-auto max-w-[760px] px-4 py-6 sm:px-5 sm:py-10">
        <h1 className="type-condensed text-5xl">Order notifications</h1>
        <p className="mt-2 max-w-[60ch] opacity-75">
          Get a CUSTOM ME notification on your phone the moment someone places an order. Tapping it opens the order. Set it up once on
          every phone that should get them.
        </p>
        <div className="mt-8">
          <Suspense fallback={<p className="py-20 text-center text-muted">Loading…</p>}>
            <Setup />
          </Suspense>
        </div>
      </main>
    </>
  );
}

async function Setup() {
  await requireAdmin();
  const [{ publicKey }, devices] = await Promise.all([getVapidKeys(), readPushSubscriptions()]);
  const step = "border-2 border-ink/15 bg-sheet p-5 ring-2 ring-ink/15 md:p-6";
  const num = "grid size-9 shrink-0 place-items-center bg-ink font-bold text-mint";

  return (
    <div className="grid gap-4">
      <ol className="grid gap-4">
        <li className={step}>
          <div className="flex gap-4">
            <span className={num}>1</span>
            <div className="min-w-0">
              <h2 className="type-condensed text-2xl">Add the dashboard to your home screen</h2>
              <ul className="mt-2 grid gap-2">
                <li>
                  <strong>iPhone:</strong> open the dashboard in <strong>Safari</strong>, tap <strong>Share</strong> (the square with an
                  arrow), then <strong>Add to Home Screen</strong>.
                </li>
                <li>
                  <strong>Android:</strong> open the dashboard in <strong>Chrome</strong>, tap <strong>⋮</strong>, then{" "}
                  <strong>Add to Home screen</strong> (or <strong>Install app</strong>).
                </li>
              </ul>
              <p className="mt-2 text-sm text-muted">You get a navy CUSTOM ME icon that opens straight to your orders.</p>
            </div>
          </div>
        </li>

        <li className={step}>
          <div className="flex gap-4">
            <span className={num}>2</span>
            <div className="min-w-0 flex-1">
              <h2 className="type-condensed text-2xl">Turn notifications on</h2>
              <p className="mt-1 text-muted">
                Open CUSTOM ME from your home screen, log in, come to <strong>Notifications</strong> and tap the button. Allow
                notifications when your phone asks.
              </p>
              <PushSetup publicKey={publicKey} knownEndpoints={devices.map((d) => d.subscription.endpoint)} />
            </div>
          </div>
        </li>
      </ol>

      <section className={step}>
        <h2 className="type-condensed text-2xl">Getting notifications</h2>
        {devices.length === 0 ? (
          <p className="mt-2 text-muted">No phones yet.</p>
        ) : (
          <ul className="mt-2 divide-y-2 divide-ink/5">
            {devices.map((d) => (
              <li key={d.subscription.endpoint} className="flex items-center justify-between gap-3 py-2">
                <span>
                  <span className="font-semibold">{d.label}</span>
                  <span className="block text-sm text-muted">Added {formatDate(d.addedAt)}</span>
                </span>
                <RemoveDeviceButton endpoint={d.subscription.endpoint} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
