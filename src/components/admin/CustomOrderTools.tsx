"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { baseColour, lab, type Customization } from "@/config/customization";
import { PRINT_DPI, PRINT_FILE_DEFAULT_WIDTH_PX } from "@/config/orders";
import type { CategoryId } from "@/data/catalog";
import { ProductMockup, printedText } from "@/components/products/ProductMockup";
import { fitClass, SHAPES } from "@/components/products/shapes";

/** The customer's design drawn on the product, as they saw it. */
export function OrderMockup({ custom, category, className }: { custom: Customization; category: CategoryId; className?: string }) {
  return <ProductMockup category={category} artwork="plain" palette="navy-mint" custom={custom} label="The customer's design on the product" className={className} />;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Couldn't load ${src}`));
    img.src = src;
  });
}

const FONT_VAR = { marker: "--font-marker", display: "--font-display", mono: "--font-mono" } as const;
const FONT_WEIGHT = { marker: 400, display: 900, mono: 600 } as const;

/**
 * Builds a print-ready transparent PNG of the whole print area: every image
 * and text layer at its exact position, size and rotation, drawn from the
 * customer's original files. 300 DPI once the print area size is set in
 * config/customization.ts, otherwise 3000 px wide.
 */
async function renderPrintFile(custom: Customization, category: CategoryId) {
  const [, , aw, ah] = SHAPES[category].art;
  const cm = lab.printAreaCm[category];
  const W = cm ? Math.round((cm.width / 2.54) * PRINT_DPI) : PRINT_FILE_DEFAULT_WIDTH_PX;
  const H = Math.round((W * ah) / aw);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  const root = getComputedStyle(document.documentElement);

  for (const layer of custom.layers) {
    ctx.save();
    ctx.translate(layer.x * W, layer.y * H);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    if (layer.kind === "image") {
      const img = await loadImage(layer.src);
      const w = layer.width * W;
      const h = w * layer.aspect;
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
    } else {
      const family = root.getPropertyValue(FONT_VAR[layer.font]).trim() || "sans-serif";
      const size = layer.size * W;
      const font = `${FONT_WEIGHT[layer.font]} ${size}px ${family}`;
      const text = printedText(layer.font, layer.text);
      await document.fonts.load(font, text);
      ctx.font = font;
      if (layer.font === "display" && "fontStretch" in ctx) (ctx as CanvasRenderingContext2D & { fontStretch: string }).fontStretch = "expanded";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = layer.ink;
      ctx.fillText(text, 0, 0);
    }
    ctx.restore();
  }
  return new Promise<{ blob: Blob; W: number; H: number }>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve({ blob: b, W, H }) : reject(new Error("Export failed"))), "image/png"),
  );
}

function download(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("Couldn't read the print file."));
    r.readAsDataURL(blob);
  });

const MOCKUP_WIDTH_PX = 2000;

/**
 * The mockup as a PNG: the product drawing with the finished print file laid
 * over its print area (so fonts and originals match the print exactly).
 */
async function renderMockupFile(custom: Customization, category: CategoryId, print: { blob: Blob; W: number; H: number }) {
  const flat: Customization = {
    base: baseColour(custom),
    // An SVG drawn as a picture can't fetch anything, so the shop design's photo goes in as data
    design: custom.design && {
      ...custom.design,
      image: { ...custom.design.image, src: await blobToDataUrl(await fetch(custom.design.image.src).then((r) => r.blob())) },
    },
    layers: [
      { kind: "image", id: "print", src: await blobToDataUrl(print.blob), name: "print", aspect: print.H / print.W, originalWidth: print.W, originalHeight: print.H, width: 1, x: 0.5, y: 0.5, rotation: 0 },
    ],
  };
  const host = document.createElement("div");
  const root = createRoot(host);
  flushSync(() => root.render(<ProductMockup category={category} artwork="plain" palette="navy-mint" custom={flat} />));
  const svg = host.querySelector("svg")!;
  const [vw, vh] = SHAPES[category].vb;
  // A margin around the outline, so the case handle and the shadow fit
  const m = Math.round(Math.max(vw, vh) * 0.05);
  // Upright pieces get a narrower file so they aren't enormous
  const W = Math.round(MOCKUP_WIDTH_PX * Math.min(1, Math.max(0.3, vw / vh)));
  const H = Math.round((W * (vh + 2 * m)) / (vw + 2 * m));
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("viewBox", `${-m} ${-m} ${vw + 2 * m} ${vh + 2 * m}`);
  svg.setAttribute("width", String(W));
  svg.setAttribute("height", String(H));
  const markup = new XMLSerializer().serializeToString(svg);
  root.unmount();

  const url = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml" }));
  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;
    // White, not transparent: photo galleries show transparency as black
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(img, 0, 0, W, H);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Export failed"))), "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}

const CHECKER =
  "bg-white bg-[length:20px_20px] bg-[position:0_0,10px_10px] bg-[image:linear-gradient(45deg,rgb(20_33_90/0.07)_25%,transparent_25%,transparent_75%,rgb(20_33_90/0.07)_75%),linear-gradient(45deg,rgb(20_33_90/0.07)_25%,transparent_25%,transparent_75%,rgb(20_33_90/0.07)_75%)]";

/**
 * A custom piece's two pictures side by side: the design on the product (as
 * the customer saw it) and the design on its own (the print file), each with
 * a download.
 */
export function DesignFiles({ custom, category, fileName }: { custom: Customization; category: CategoryId; fileName: string }) {
  const [print, setPrint] = useState<{ blob: Blob; W: number; H: number; url: string } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let url = "";
    let live = true;
    renderPrintFile(custom, category)
      .then((p) => {
        url = URL.createObjectURL(p.blob);
        if (live) setPrint({ ...p, url });
        else URL.revokeObjectURL(url);
      })
      .catch((e) => live && setError((e as Error).message || "Couldn't build the print file."));
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [custom, category]);

  const panel = "grid grid-rows-[auto_1fr_auto] gap-3 bg-paper p-4";
  const button = "min-h-11 bg-ink px-4 text-sm font-bold text-sheet disabled:opacity-50";

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <figure className={panel}>
        <figcaption>
          <span className="font-semibold">On the product</span>
          <span className="block text-sm text-muted">What the customer saw</span>
        </figcaption>
        <div className="grid h-72 place-items-center">
          <OrderMockup custom={custom} category={category} className={fitClass(category)} />
        </div>
        <button
          type="button"
          className={button}
          disabled={!print || busy}
          onClick={async () => {
            if (!print) return;
            setBusy(true);
            setError("");
            try {
              download(await renderMockupFile(custom, category, print), fileName.replace(/\.png$/, "-mockup.png"));
            } catch (e) {
              setError((e as Error).message || "Couldn't build the mockup.");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Building mockup…" : "Download mockup (PNG)"}
        </button>
      </figure>

      <figure className={panel}>
        <figcaption>
          <span className="font-semibold">Ready to print</span>
          <span className="block text-sm text-muted">Design only, sized and placed exactly like the customer did</span>
        </figcaption>
        <div className="flex h-72 items-center justify-center">
          {print ? (
            // eslint-disable-next-line @next/next/no-img-element -- generated in the browser
            <img src={print.url} alt={`The customer's design on its own, ${print.W} × ${print.H} px`} className={`max-h-full max-w-full ring-2 ring-ink/10 ${CHECKER}`} />
          ) : (
            !error && <p className="text-sm text-muted">Building the design…</p>
          )}
        </div>
        <button type="button" className={button} disabled={!print} onClick={() => print && download(print.blob, fileName)}>
          Download ready-to-print design
        </button>
      </figure>

      {print && (
        <p className="text-sm text-muted sm:col-span-2">
          The ready-to-print file covers the whole print area ({print.W} × {print.H} px, transparent background), with every picture and line of text already at the size,
          position and angle the customer chose.
          {lab.printAreaCm[category] ? ` ${PRINT_DPI} DPI at the real size.` : " Set the real print-area size in config/customization.ts to export it at 300 DPI."}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm font-semibold text-alert sm:col-span-2">
          {error}
        </p>
      )}
    </div>
  );
}
