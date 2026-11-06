"use client";

import { useSearchParams } from "next/navigation";
import { Lab } from "@/components/lab/Lab";
import { labFromParams } from "@/components/lab/useLabState";
import { useStore } from "@/components/store/StoreProvider";

export function LabFromQuery() {
  const params = useSearchParams();
  const { get, pricing } = useStore();
  // Re-mount when the starting point in the URL changes.
  return <Lab key={params.toString()} start={labFromParams(pricing, new URLSearchParams(params.toString()), get)} />;
}
