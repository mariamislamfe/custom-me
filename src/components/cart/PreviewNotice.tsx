"use client";

import { depositEnabled } from "@/config/payments";
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
          : pay.depositPerPiece > 0
            ? `A deposit of EGP ${pay.depositPerPiece} per piece by InstaPay confirms your order; the rest is paid on delivery.`
            : "Your order is paid by InstaPay when you place it."}{" "}
      The delivery fee for your governorate is added at checkout.
    </p>
  );
}
