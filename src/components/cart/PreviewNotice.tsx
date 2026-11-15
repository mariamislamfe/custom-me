"use client";

import { depositEnabled, depositText } from "@/config/payments";
import { useStore } from "@/components/store/StoreProvider";

/** How paying works, shown in the bag and the Lab. */
export function PreviewNotice({ compact }: { compact?: boolean }) {
  const pay = useStore().store.payments;
  return (
    <p className={`border-2 border-dashed border-ink/40 bg-mint-soft/60 text-ink ${compact ? "px-3 py-2 text-xs" : "px-4 py-3 text-sm"}`}>
      <strong className="font-mono uppercase tracking-wide">Cash on delivery.</strong>{" "}
      {!depositEnabled(pay)
        ? "You pay when your order arrives."
        : pay.allowCod
          ? `Pay when it arrives, or by InstaPay${pay.fullPaymentDiscountPercent ? ` (${pay.fullPaymentDiscountPercent}% off when you pay it all now)` : ""}.`
          : `A deposit by InstaPay confirms your order (${[
              pay.depositIsDelivery ? "the delivery fee for ready-made products" : pay.readyDeposit.value > 0 && `${depositText(pay.readyDeposit)} for ready-made products`,
              pay.customDeposit.value > 0 && `${depositText(pay.customDeposit)} for custom pieces`,
            ]
              .filter(Boolean)
              .join(", ")}); the rest is paid on delivery.`}{" "}
      The delivery fee for your governorate is added at checkout.
    </p>
  );
}
