import type { Metadata } from "next";
import { StickerStudio } from "@/components/stickers/StickerStudio";

export const metadata: Metadata = {
  title: "Sticker studio — try them on",
  description: "Pick your laptop, notebook, bottle or phone, drop our stickers on it, arrange them and add the whole set to your bag.",
};

export default function StickerStudioPage() {
  return (
    <div className="pt-16 md:pt-[72px]">
      <h1 className="sr-only">Sticker studio</h1>
      <StickerStudio />
    </div>
  );
}
