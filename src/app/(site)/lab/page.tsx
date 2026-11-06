import type { Metadata } from "next";
import { Suspense } from "react";
import { LabFromQuery } from "./LabFromQuery";

export const metadata: Metadata = {
  title: "The Lab — design your own",
  description: "Upload your own design onto an art bag, laptop sleeve, T-ruler case or notebook, place it exactly where you want it and order it.",
};

export default function LabPage() {
  return (
    <div className="pt-16 md:pt-[72px]">
      <h1 className="sr-only">The Customization Lab</h1>
      <Suspense fallback={<div className="drafting h-[60vh]" aria-busy="true" />}>
        <LabFromQuery />
      </Suspense>
    </div>
  );
}
