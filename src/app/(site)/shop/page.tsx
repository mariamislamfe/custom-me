import type { Metadata } from "next";
import { ShopIndex } from "@/components/shop/ShopIndex";

export const metadata: Metadata = {
  title: "Shop",
  description: "Art bags, laptop sleeves, T-ruler cases and notebooks with original CUSTOM ME graphic designs.",
};

export default function ShopPage() {
  return <ShopIndex />;
}
