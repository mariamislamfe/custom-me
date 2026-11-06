"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { saveProduct, type SaveState } from "@/app/admin/actions";
import { PALETTES, type PaletteId } from "@/components/art/artworks";
import { ProductMockup } from "@/components/products/ProductMockup";
import { fitClass } from "@/components/products/shapes";
import { PRODUCT_IMAGE } from "@/config/products";
import { lab } from "@/config/customization";
import { categories, categoryOrder, COLOUR_TAGS, type CategoryId, type Pricing, type Product, type ProductImage } from "@/data/catalog";
import { uploadFile } from "@/lib/upload";
import { Card, Field, FieldError, input, pill, smallButton, Toggle } from "./ui";
import { TemplateEditor } from "./TemplateEditor";

type Upload = { id: string; name: string; error?: string };
/** Rows being edited; prices stay text until saved. */
type SizeRow = { id: string; label: string; price: string; available: boolean };
type ColourRow = { id: string; label: string; hex: string; available: boolean };

const newId = () => Math.random().toString(36).slice(2, 10);

/** `options`: each type's option groups, as set on the Product options page. */
export function ProductForm({ product, options }: { product?: Product; options: Pricing["options"] }) {
  const [state, action, saving] = useActionState<SaveState, FormData>(saveProduct, {});
  const [category, setCategory] = useState<CategoryId>(product?.category ?? categoryOrder[0]);
  const [images, setImages] = useState<ProductImage[]>(product?.images ?? []);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [palette, setPalette] = useState<PaletteId>(product?.palette ?? "navy-mint");
  const [sizes, setSizes] = useState<SizeRow[]>(() => (product?.sizes ?? []).map((z) => ({ ...z, price: z.price == null ? "" : String(z.price) })));
  const [colours, setColours] = useState<ColourRow[]>(product?.colours ?? []);
  const [removeBg, setRemoveBg] = useState(true);
  const [split, setSplit] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [templateBusy, setTemplateBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Hide a field's error as soon as it's edited; a new save brings fresh errors.
  const [edited, setEdited] = useState<{ for: SaveState; keys: string[] }>({ for: state, keys: [] });
  if (edited.for !== state) setEdited({ for: state, keys: [] });
  const errors = Object.fromEntries(Object.entries(state.errors ?? {}).filter(([k]) => !edited.keys.includes(k))) as NonNullable<SaveState["errors"]>;
  const touch = (key: string) => setEdited((e) => (e.keys.includes(key) ? e : { ...e, keys: [...e.keys, key] }));
  const busy = uploads.some((u) => !u.error) || templateBusy;

  const uploadFiles = async (files: FileList | File[]) => {
    const list = [...files].slice(0, PRODUCT_IMAGE.maxPerProduct - images.length);
    // One after another: background removal is heavy work for the server
    for (const file of list) {
      const id = `${file.name}-${Math.random()}`;
      setUploads((u) => [...u, { id, name: file.name }]);
      try {
        const fileId = await uploadFile("product", file);
        const res = await fetch("/api/admin/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileId, name: file.name, removeBackground: removeBg, split: removeBg && split, category }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Upload failed.");
        const added = (json.images as ProductImage[]).slice(0, PRODUCT_IMAGE.maxPerProduct);
        setImages((imgs) => [...imgs, ...added].slice(0, PRODUCT_IMAGE.maxPerProduct));
        touch("images");
        setUploads((u) => u.filter((x) => x.id !== id));
      } catch (err) {
        setUploads((u) => u.map((x) => (x.id === id ? { ...x, error: (err as Error).message } : x)));
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const moveImage = (i: number, dir: -1 | 1) =>
    setImages((imgs) => {
      const j = i + dir;
      if (j < 0 || j >= imgs.length) return imgs;
      const next = [...imgs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  

  return (
    <form action={action} className="grid gap-6" noValidate>
      {product && <input type="hidden" name="id" value={product.id} />}
      <input type="hidden" name="images" value={JSON.stringify(images)} />
      <input type="hidden" name="palette" value={palette} />
      <input type="hidden" name="sizes" value={JSON.stringify(sizes)} />
      <input type="hidden" name="colours" value={JSON.stringify(colours)} />

      {errors.form && (
        <p role="alert" className="bg-alert/10 px-5 py-3 font-semibold text-alert">
          {errors.form}
        </p>
      )}

      <Card title="What is it?" hint="Decides where it shows up: its section on the homepage (the bag and sleeve walls, the T-ruler ring, the notebook desk, the sticker wall) and its shop page.">
        <div role="radiogroup" aria-label="Product type" className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {categoryOrder.map((c) => (
            <label key={c} className="cursor-pointer">
              <input type="radio" name="category" value={c} checked={category === c} onChange={() => setCategory(c)} className="peer sr-only" />
              <span className="flex h-full flex-col items-center gap-3 p-3 ring-2 ring-ink/15 transition-colors peer-checked:bg-mint-soft peer-checked:ring-ink peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-mint hover:ring-ink/40">
                <span className="flex h-20 w-full items-center justify-center">
                  <ProductMockup category={c} artwork="plain" palette={palette} className={fitClass(c) === "w-full" ? "w-full max-w-28" : "h-full"} />
                </span>
                <span className="text-center font-mono text-[11px] font-bold uppercase tracking-wider">{categories[c].singular}</span>
              </span>
            </label>
          ))}
        </div>
        <FieldError msg={errors.category} />
      </Card>

      <Card
        title="Photos"
        hint={`The first photo is the main one. Shoot the product on plain white or light grey paper: the background is removed and the photo cropped to the product, so it floats on the site. Up to ${PRODUCT_IMAGE.maxPerProduct} photos, ${PRODUCT_IMAGE.maxFileMb} MB each; use the original file (not one sent through WhatsApp), ideally 2000 px or more.`}
      >
        <label className="mb-4 flex cursor-pointer items-center gap-3">
          <input type="checkbox" checked={removeBg} onChange={(e) => setRemoveBg(e.target.checked)} className="size-5 accent-ink" />
          <span>
            <span className="font-semibold">Remove the white background</span>
            <span className="block text-sm text-muted">Turn off for photos you want to keep as they are (a styled shot, a scene).</span>
          </span>
        </label>
        <label className={`mb-4 flex cursor-pointer items-center gap-3 ${removeBg ? "" : "opacity-40"}`}>
          <input type="checkbox" checked={split} disabled={!removeBg} onChange={(e) => setSplit(e.target.checked)} className="size-5 accent-ink" />
          <span>
            <span className="font-semibold">Front &amp; back in one photo</span>
            <span className="block text-sm text-muted">A photo showing the product twice side by side (front and back, like mockup exports) becomes the front and the back: in the shop the piece turns round to show its back.</span>
          </span>
        </label>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((img, i) => (
            <li key={img.src} className="relative overflow-hidden ring-2 ring-ink/10" style={{ background: "#E2E5EB" }}>
              <div className="relative aspect-square">
                <Image src={img.src} alt="" fill sizes="220px" quality={90} className="object-contain p-2" />
              </div>
              {i === 0 && <span className="absolute left-2 top-2 bg-ink px-2 py-0.5 text-xs font-bold text-sheet">Main</span>}
              <span className="absolute right-2 top-2 bg-sheet px-2 py-0.5 text-xs font-bold">{img.cutout ? "Background removed" : "Photo"}</span>
              <div className="grid gap-1.5 border-t-2 border-ink/10 bg-sheet p-2 text-sm">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(img.back)}
                    onChange={(e) => setImages((imgs) => imgs.map((x, k) => (k === i ? { ...x, back: e.target.checked || undefined } : x)))}
                    className="size-4 accent-ink"
                  />
                  Back of the product
                </label>
                {colours.length > 0 && (
                  <select
                    aria-label={`Colour shown in photo ${i + 1}`}
                    value={img.colour ?? ""}
                    onChange={(e) => setImages((imgs) => imgs.map((x, k) => (k === i ? { ...x, colour: e.target.value || undefined } : x)))}
                    className="h-9 border-2 border-ink/20 bg-sheet px-2"
                  >
                    <option value="">Any colour</option>
                    {colours.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label || "Unnamed colour"}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="flex justify-between bg-sheet/90 p-1">
                <SmallButton label={`Move photo ${i + 1} left`} onClick={() => moveImage(i, -1)} disabled={i === 0}>
                  ←
                </SmallButton>
                <SmallButton
                  label={`Remove photo ${i + 1}`}
                  onClick={() => {
                    setImages((imgs) => imgs.filter((_, k) => k !== i));
                    touch("images");
                  }}
                >
                  ✕
                </SmallButton>
                <SmallButton label={`Move photo ${i + 1} right`} onClick={() => moveImage(i, 1)} disabled={i === images.length - 1}>
                  →
                </SmallButton>
              </div>
            </li>
          ))}
          {uploads.map((u) => (
            <li key={u.id} className="grid aspect-square place-items-center bg-sheet p-3 text-center text-sm ring-2 ring-ink/10">
              {u.error ? (
                <span>
                  <span className="block font-semibold text-alert">{u.error}</span>
                  <button type="button" className="mt-2 underline" onClick={() => setUploads((x) => x.filter((y) => y.id !== u.id))}>
                    Dismiss
                  </button>
                </span>
              ) : (
                <span className="animate-pulse font-semibold">
                  {removeBg ? "Removing the background from" : "Uploading"} {u.name}…
                </span>
              )}
            </li>
          ))}
          {images.length + uploads.filter((u) => !u.error).length < PRODUCT_IMAGE.maxPerProduct && (
            <li>
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  uploadFiles(e.dataTransfer.files);
                }}
                className={`grid aspect-square cursor-pointer place-items-center border-2 border-dashed p-3 text-center focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-mint ${
                  dragOver ? "border-ink bg-mint-soft" : "border-ink/30 bg-sheet hover:border-ink/60"
                }`}
              >
                <input ref={fileRef} type="file" multiple accept={PRODUCT_IMAGE.accept.join(",")} className="sr-only" onChange={(e) => e.target.files && uploadFiles(e.target.files)} />
                <span>
                  <span className="type-condensed block text-xl">Add photos</span>
                  <span className="text-xs text-muted">PNG, JPG or WebP</span>
                </span>
              </label>
            </li>
          )}
        </ul>
        <FieldError msg={errors.images} />
      </Card>

      <Card title="Details">
        <div className="grid gap-5">
          <Field label="Name" error={errors.name} htmlFor="name">
            <input id="name" name="name" defaultValue={product?.name} maxLength={80} required className={input} aria-invalid={!!errors.name} onChange={() => touch("name")} />
          </Field>
          <Field
            label="Price (EGP)"
            error={errors.price}
            htmlFor="price"
            hint="The product’s price. Sizes below can each have their own. Leave empty while the price isn’t decided: the product shows with “Price soon” and can’t be ordered."
          >
            <input
              id="price"
              name="price"
              inputMode="numeric"
              defaultValue={product?.price ?? ""}
              placeholder="650"
              className={`${input} max-w-48`}
              aria-invalid={!!errors.price}
              onChange={() => touch("price")}
            />
          </Field>
          <Field label="Short line" htmlFor="blurb" hint="One sentence for the homepage and the product page.">
            <textarea id="blurb" name="blurb" defaultValue={product?.blurb} maxLength={240} rows={2} className={`${input} h-auto py-3`} />
          </Field>
          <Field label="Details (optional)" htmlFor="details" hint="One per line: material, closure, care…">
            <textarea id="details" name="details" defaultValue={product?.details.join("\n")} rows={3} className={`${input} h-auto py-3`} />
          </Field>
          <fieldset>
            <legend className="font-semibold">Main colours</legend>
            <p className="text-sm text-muted">For the shop&apos;s colour filter.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {COLOUR_TAGS.map((t) => (
                <label key={t.id} className="cursor-pointer">
                  <input type="checkbox" name="tags" value={t.id} defaultChecked={product?.tags.includes(t.id)} className="peer sr-only" />
                  <span className={pill}>{t.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </Card>

      <SizesCard groups={options[category]} sizes={sizes} setSizes={setSizes} error={errors.sizes} />
      <ColoursCard colours={colours} setColours={setColours} error={errors.colours} />

      {lab.categories.includes(category) && (
        <TemplateEditor
          // A different product type has another print area: start its design afresh
          key={category}
          category={category}
          initial={product?.category === category ? product.template : undefined}
          ground={PALETTES[palette].ground}
          onBusy={setTemplateBusy}
          error={errors.template}
        />
      )}

      <Card title="Showcase colours" hint="The colours this product is staged in on the homepage and its page.">
        <div className="flex flex-wrap gap-3">
          {(Object.keys(PALETTES) as PaletteId[]).map((p) => (
            <label key={p} className="cursor-pointer text-center">
              <input type="radio" name="palette-choice" checked={palette === p} onChange={() => setPalette(p)} className="peer sr-only" />
              <span
                className="mx-auto block size-12 border-2 border-ink transition-transform peer-checked:-translate-y-1 peer-checked:shadow-[3px_3px_0_#14215A] peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-mint"
                style={{ background: `linear-gradient(135deg, ${PALETTES[p].ground} 0 58%, ${PALETTES[p].ink} 58%)` }}
              />
              <span className="mt-1 block text-xs font-medium">{PALETTES[p].label}</span>
            </label>
          ))}
        </div>
      </Card>

      <Card title="Visibility">
        <div className="grid gap-4">
          <Toggle name="published" defaultChecked={product?.published ?? true} label="Published" hint="Show this product in the store." />
          <Toggle name="available" defaultChecked={product?.available ?? true} label="In stock" hint="Off shows “Sold out” and stops orders." />
          {lab.categories.includes(category) && (
            <Toggle
              name="customizable"
              defaultChecked={product?.customizable ?? true}
              label="Customizable"
              hint="Shows “Customize this”, which opens this design in the Lab so the customer can add their name or art on top of it."
            />
          )}
          <Toggle name="isNew" defaultChecked={product?.isNew ?? true} label="New" hint="A “New” sticker in the shop." />
        </div>
      </Card>

      <div className="sticky bottom-0 -mx-5 flex flex-wrap items-center gap-3 border-t-2 border-ink bg-paper/95 px-5 py-4 backdrop-blur-sm">
        <button type="submit" className="btn btn-ink" disabled={saving || busy}>
          {saving ? "Saving…" : busy ? "Waiting for uploads…" : product ? "Save changes" : "Add product"}
        </button>
        <Link href="/admin" className="btn btn-ghost">
          Cancel
        </Link>
        {Object.keys(errors).length > 0 && (
          <p role="alert" className="font-semibold text-alert">
            Check the highlighted fields.
          </p>
        )}
      </div>
    </form>
  );
}

function SizesCard({ groups, sizes, setSizes, error }: { groups: Pricing["options"][CategoryId]; sizes: SizeRow[]; setSizes: (fn: (s: SizeRow[]) => SizeRow[]) => void; error?: string }) {
  const standard = groups.find((g) => g.id === "size" || g.id === "length");
  const edit = (i: number, patch: Partial<SizeRow>) => setSizes((list) => list.map((z, k) => (k === i ? { ...z, ...patch } : z)));
  return (
    <Card
      title="Sizes & prices"
      hint={
        sizes.length
          ? "The customer picks one. A size with no price costs the main price above."
          : standard
            ? `No sizes of its own yet: it comes in the standard sizes (${standard.values.map((v) => v.label).join(", ")}), with the extras from the Product options page. Add sizes here to give this product its own sizes and prices.`
            : "No sizes yet: it comes in one size, at the main price. Add sizes if it comes in more than one."
      }
    >
      {sizes.length > 0 && (
        <ul className="mb-4 grid gap-3">
          {sizes.map((z, i) => (
            <li key={z.id} className="grid grid-cols-[minmax(0,1fr)_7.5rem] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_9rem_auto_auto]">
              <input aria-label={`Size ${i + 1} name`} value={z.label} maxLength={30} placeholder="e.g. A4, Large" className={input} onChange={(e) => edit(i, { label: e.target.value })} />
              <input aria-label={`Size ${i + 1} price (EGP)`} value={z.price} inputMode="numeric" placeholder="Price" className={input} onChange={(e) => edit(i, { price: e.target.value })} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={z.available} onChange={(e) => edit(i, { available: e.target.checked })} className="size-4 accent-ink" />
                In stock
              </label>
              <button type="button" className={smallButton} onClick={() => setSizes((list) => list.filter((_, k) => k !== i))} aria-label={`Remove size ${z.label || i + 1}`}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={smallButton} disabled={sizes.length >= 12} onClick={() => setSizes((list) => [...list, { id: newId(), label: "", price: "", available: true }])}>
          + Add a size
        </button>
        {sizes.length === 0 && standard && (
          <button
            type="button"
            className={smallButton}
            onClick={() => setSizes(() => standard.values.map((v) => ({ id: v.id, label: v.label, price: "", available: v.available !== false })))}
          >
            Start from the standard sizes
          </button>
        )}
      </div>
      <FieldError msg={error} />
    </Card>
  );
}

function ColoursCard({ colours, setColours, error }: { colours: ColourRow[]; setColours: (fn: (c: ColourRow[]) => ColourRow[]) => void; error?: string }) {
  const edit = (i: number, patch: Partial<ColourRow>) => setColours((list) => list.map((c, k) => (k === i ? { ...c, ...patch } : c)));
  return (
    <Card
      title="Colours"
      hint="Only if the customer chooses one, like the same design in black or in pink. Then mark each photo above with the colour it shows: the shop switches photos when the colour changes."
    >
      {colours.length > 0 && (
        <ul className="mb-4 grid gap-3">
          {colours.map((c, i) => (
            <li key={c.id} className="grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[3rem_minmax(0,1fr)_auto_auto]">
              <input type="color" aria-label={`Colour ${i + 1} swatch`} value={c.hex} onChange={(e) => edit(i, { hex: e.target.value })} className="h-12 w-12 cursor-pointer border-2 border-ink/25 bg-sheet p-1" />
              <input aria-label={`Colour ${i + 1} name`} value={c.label} maxLength={30} placeholder="e.g. Pink" className={input} onChange={(e) => edit(i, { label: e.target.value })} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={c.available} onChange={(e) => edit(i, { available: e.target.checked })} className="size-4 accent-ink" />
                In stock
              </label>
              <button type="button" className={smallButton} onClick={() => setColours((list) => list.filter((_, k) => k !== i))} aria-label={`Remove colour ${c.label || i + 1}`}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className={smallButton} disabled={colours.length >= 12} onClick={() => setColours((list) => [...list, { id: newId(), label: "", hex: "#14215a", available: true }])}>
        + Add a colour
      </button>
      <FieldError msg={error} />
    </Card>
  );
}

function SmallButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} disabled={disabled} className="grid size-9 place-items-center font-bold hover:bg-mint-soft disabled:opacity-25">
      {children}
    </button>
  );
}
