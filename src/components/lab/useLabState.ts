"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PALETTES } from "@/components/art/artworks";
import { categories, cleanSelection, defaultSelection, priceFor, productViews, selectionLabels, type CategoryId, type Pricing, type Product } from "@/data/catalog";
import { baseColour, colourName, contrastInk, HEX, lab, type Customization, type DesignBase, type DesignLayer, type FontId } from "@/config/customization";
import { customLineKey, useCart, type CartLine } from "@/lib/cart";
import { prepareUpload } from "@/lib/image";
import { layerId, newImageLayer, newTextLayer } from "@/lib/layers";
import { uploadFile } from "@/lib/upload";
import { useStore } from "@/components/store/StoreProvider";

export interface LabState {
  category: CategoryId;
  selection: Record<string, string>;
  custom: Customization;
  /** Personalizing this shop design (its options and price) instead of designing a plain piece */
  product?: Product;
}

export function initialLab(pricing: Pricing, category: CategoryId = "sleeves", base: string = lab.baseSwatches[0].hex, text = ""): LabState {
  const t = text.trim().slice(0, lab.text.maxLength);
  const b = HEX.test(base) ? base : lab.baseSwatches[0].hex;
  return {
    category,
    selection: defaultSelection(category, pricing),
    custom: { base: b, layers: t ? [newTextLayer(category, t, "marker", contrastInk(b))] : [] },
  };
}

/** A product colour's swatch, when the product comes in colours. */
const colourHex = (product: Product, colour?: string) => (colour ? product.colours.find((c) => c.id === colour)?.hex : undefined);

/** The shop design's front photo for a colour, as the ground the customer's layers sit on. */
function designFor(product: Product, colour?: string): DesignBase | undefined {
  const front = productViews(product, colour).front;
  return front && { productId: product.id, slug: product.slug, name: product.name, image: { src: front.src, width: front.width, height: front.height } };
}

/** Personalize a shop design: the piece as it's sold, ready for a name or more art on top. */
export function labForProduct(pricing: Pricing, product: Product, selection: Record<string, string> = {}, text = ""): LabState {
  const sel = cleanSelection(product, selection, pricing) ?? defaultSelection(product, pricing);
  // The design's editable original: its own pieces open as layers the customer can change
  if (product.template?.layers.length) {
    const t = text.trim().slice(0, lab.text.maxLength);
    const base = colourHex(product, sel.colour) ?? product.template.base;
    const layers: DesignLayer[] = product.template.layers.map((l) => ({ ...l, id: layerId() }));
    if (t && layers.length < lab.maxLayers) layers.push(newTextLayer(product.category, t, "marker", contrastInk(base)));
    return {
      category: product.category,
      selection: sel,
      product,
      custom: { base, template: { productId: product.id, slug: product.slug, name: product.name }, layers },
    };
  }
  const base = PALETTES[product.palette].ground;
  const design = designFor(product, sel.colour);
  // No photo yet: the product is drawn plain in its colour, so that's the starting point
  if (!design) return initialLab(pricing, product.category, base, text);
  const t = text.trim().slice(0, lab.text.maxLength);
  return {
    category: product.category,
    selection: sel,
    product,
    custom: { base, design, layers: t ? [newTextLayer(product.category, t, "marker", contrastInk(base))] : [] },
  };
}

/** ?from=<slug>&o.<group>=<value> | ?category=&palette=&text= -> a starting point. */
export function labFromParams(pricing: Pricing, params: URLSearchParams, find: (slug: string) => Product | undefined): LabState {
  const from = params.get("from");
  const product = from ? find(from) : undefined;
  const text = params.get("text") ?? "";
  if (product && lab.categories.includes(product.category)) {
    const sel = Object.fromEntries([...params].filter(([k]) => k.startsWith("o.")).map(([k, v]) => [k.slice(2), v]));
    return labForProduct(pricing, product, sel, text);
  }
  const cat = params.get("category") as CategoryId | null;
  const pal = params.get("palette");
  return initialLab(pricing, cat && lab.categories.includes(cat) ? cat : "sleeves", pal && pal in PALETTES ? PALETTES[pal as keyof typeof PALETTES].ground : undefined, text);
}

type UploadState = { status: "uploading" | "error"; error?: string; file: File };

const without = <T,>(map: Record<string, T>, key: string) => Object.fromEntries(Object.entries(map).filter(([k]) => k !== key));

export function useLab(start: LabState) {
  const [state, setState] = useState<LabState>(start);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploads, setUploads] = useState<Record<string, UploadState>>({});
  const { add } = useCart();
  const { pricing } = useStore();
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  const { category, selection, custom, product } = state;
  const base = baseColour(custom);

  const setLayers = useCallback((fn: (layers: DesignLayer[]) => DesignLayer[]) => setState((s) => ({ ...s, custom: { ...s.custom, layers: fn(s.custom.layers) } })), []);

  const updateLayer = useCallback(
    (id: string, patch: Partial<DesignLayer>) => setLayers((ls) => ls.map((l) => (l.id === id ? ({ ...l, ...patch } as DesignLayer) : l))),
    [setLayers],
  );

  const removeLayer = useCallback(
    (id: string) => {
      setLayers((ls) => ls.filter((l) => l.id !== id));
      setUploads((u) => without(u, id));
      setSelectedId((s) => (s === id ? null : s));
    },
    [setLayers],
  );

  /** Moves a layer up (+1, towards the front) or down (−1). */
  const reorderLayer = useCallback(
    (id: string, dir: 1 | -1) =>
      setLayers((ls) => {
        const i = ls.findIndex((l) => l.id === id);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= ls.length) return ls;
        const next = [...ls];
        [next[i], next[j]] = [next[j], next[i]];
        return next;
      }),
    [setLayers],
  );

  /** Sends the original file to storage; the layer gets its fileId when it's there. */
  const send = useCallback(
    async (id: string, file: File) => {
      setUploads((u) => ({ ...u, [id]: { status: "uploading", file } }));
      try {
        const fileId = await uploadFile("design", file);
        if (!live.current) return;
        updateLayer(id, { fileId });
        setUploads((u) => without(u, id));
      } catch (err) {
        setUploads((u) => (u[id] ? { ...u, [id]: { status: "error", error: (err as Error).message, file } } : u));
      }
    },
    [updateLayer],
  );

  /** Adds an uploaded image as a new layer. Throws UploadError with a message for the customer. */
  const addImage = useCallback(
    async (file: File) => {
      if (custom.layers.length >= lab.maxLayers) throw new Error(`You can use up to ${lab.maxLayers} layers on one piece.`);
      const prepared = await prepareUpload(file);
      const layer = newImageLayer(category, prepared);
      setLayers((ls) => [...ls, layer]);
      setSelectedId(layer.id);
      void send(layer.id, file);
      return prepared;
    },
    [category, custom.layers.length, send, setLayers],
  );

  const retryUpload = useCallback((id: string) => {
    const u = uploads[id];
    if (u) void send(id, u.file);
  }, [send, uploads]);

  const addText = useCallback(
    (text: string, font: FontId = "marker") => {
      const t = text.trim().slice(0, lab.text.maxLength);
      if (!t || custom.layers.length >= lab.maxLayers) return;
      const layer = newTextLayer(category, t, font, contrastInk(base));
      setLayers((ls) => [...ls, layer]);
      setSelectedId(layer.id);
    },
    [base, category, custom.layers.length, setLayers],
  );

  const setCategory = useCallback((c: CategoryId) => {
    // Layers keep their place: positions are relative to the print area
    setState((s) => (s.category === c ? s : { ...s, category: c, selection: defaultSelection(c, pricing) }));
  }, [pricing]);

  const setBase = useCallback(
    (hex: string) =>
      setState((s) => {
        const ground = hex.toLowerCase();
        // Text that would vanish into the new colour switches to one that reads
        const layers = s.custom.layers.map((l) => (l.kind === "text" && l.ink.toLowerCase() === ground ? { ...l, ink: contrastInk(hex) } : l));
        return { ...s, custom: { ...s.custom, base: hex, baseId: undefined, layers } };
      }),
    [],
  );

  const setOption = useCallback(
    (g: string, v: string) =>
      setState((s) => {
        const selection = { ...s.selection, [g]: v };
        // An editable original in another colour: the piece takes that colour
        if (s.custom.template) return { ...s, selection, custom: { ...s.custom, base: (s.product && g === "colour" && colourHex(s.product, v)) || s.custom.base } };
        // Another colour of a shop design: its own photo becomes the ground
        const design = s.product && g === "colour" ? (designFor(s.product, v) ?? s.custom.design) : s.custom.design;
        return { ...s, selection, custom: { ...s.custom, design } };
      }),
    [],
  );

  /** Back to the starting point: the same shop design, or a plain piece in the same colour. */
  const reset = useCallback(() => {
    setState((s) => (s.product ? labForProduct(pricing, s.product, s.selection) : initialLab(pricing, s.category, baseColour(s.custom))));
    setUploads({});
    setSelectedId(null);
  }, [pricing]);

  /** Leave the shop design for a plain piece of the same type, keeping what was added. */
  const startPlain = useCallback(
    () =>
      setState((s) => ({
        category: s.category,
        selection: defaultSelection(s.category, pricing),
        custom: { base: baseColour(s.custom), layers: s.custom.layers },
      })),
    [pricing],
  );

  const price = useMemo(() => {
    if (!product) return priceFor({ category, price: pricing.custom[category] }, selection, pricing);
    const own = priceFor(product, selection, pricing);
    return own == null ? null : own + (pricing.personalize[category] ?? 0);
  }, [category, product, selection, pricing]);

  const summary = useMemo(
    () =>
      product
        ? [`Design: ${product.name}`, ...selectionLabels(product, selection, pricing), ...(custom.template ? [`Base colour: ${colourName(base)}`] : [])]
        : [...selectionLabels(category, selection, pricing), `Base colour: ${colourName(base)}`],
    [base, category, custom.template, pricing, product, selection],
  );

  const uploading = Object.values(uploads).some((u) => u.status === "uploading");
  const failed = Object.values(uploads).some((u) => u.status === "error");
  const ready = price != null && custom.layers.length > 0 && !uploading && !failed && custom.layers.every((l) => l.kind === "text" || l.fileId);

  const addToBag = useCallback(() => {
    if (!ready || price == null) return false;
    const line: CartLine = {
      key: customLineKey(),
      kind: "custom",
      slug: product?.slug,
      name: product ? `${product.name}, personalized` : `Custom ${categories[category].singular}`,
      category,
      unitPrice: price,
      qty: 1,
      selection,
      summary,
      custom,
    };
    add(line);
    return true;
  }, [add, category, custom, price, product, ready, selection, summary]);

  const status = useMemo(() => Object.fromEntries(Object.entries(uploads).map(([id, u]) => [id, u.status])), [uploads]);

  return {
    category,
    selection,
    custom,
    product,
    base,
    selectedId,
    select: setSelectedId,
    uploads,
    status,
    uploading,
    failed,
    ready,
    price,
    summary,
    setCategory,
    setBase,
    setOption,
    addImage,
    retryUpload,
    addText,
    updateLayer,
    removeLayer,
    reorderLayer,
    reset,
    startPlain,
    addToBag,
  };
}
