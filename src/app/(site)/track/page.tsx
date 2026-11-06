import type { Metadata } from "next";
import { Suspense } from "react";
import { TrackOrder } from "@/components/track/TrackOrder";

export const metadata: Metadata = {
  title: "Track your order",
  description: "See where your order is: received, confirmed, in production, out for delivery or delivered.",
};

export default function TrackPage() {
  return (
    <div className="gutter pb-24 pt-28 md:pt-36">
      <h1 className="type-display text-[clamp(3rem,10vw,7rem)]">Track it.</h1>
      <p className="mt-4 max-w-xl text-lg leading-snug">Your order number (like CM-1001) or the mobile number you ordered with, and you&apos;ll see where it is.</p>
      <Suspense fallback={<div className="mt-10 h-16 max-w-xl animate-pulse bg-fog" aria-busy="true" />}>
        <TrackOrder />
      </Suspense>
    </div>
  );
}
