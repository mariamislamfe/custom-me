"use client";

import { useEffect, useRef, useState } from "react";
import { DesignCanvas, layerTitle } from "@/components/lab/DesignCanvas";
import { ColourPicker } from "@/components/lab/ColourPicker";
import { SHAPES } from "@/components/products/shapes";
import { contrastInk, fontOf, lab, luminance, type DesignLayer, type DesignTemplate, type FontId } from "@/config/customization";
import { categories, type CategoryId } from "@/data/catalog";
import { prepareUpload } from "@/lib/image";
import { fitWidth, newImageLayer, newTextLayer } from "@/lib/layers";
import { uploadFile } from "@/lib/upload";
import { Card, FieldError, input, smallButton } from "./ui";

type Status = Record<string, "uploading" | "error">;

/**
 * The design's editable original, for "Customize this": upload the design's
 * own files (the full artwork, or its pieces as separate transparent PNGs:
 * background, drawings, lettering) and any text, and arrange them on the
 * piece. Customers then open exactly this and can move, resize, delete or
 * recolour every piece, change the text, and add their own.
 * Each original is stored untouched for print; the shop shows a WebP copy.
 */
export function TemplateEditor({
  category,
  initial,
  ground,
  onBusy,
  error,
}: {
  category: CategoryId;
  initial?: DesignTemplate;
  /** Starting colour of the piece when there's no template yet */
  ground: string;
  onBusy: (busy: boolean) => void;
  error?: string;
}) {
  const [base, setBase] = useState(initial?.base ?? ground);
  const [layers, setLayers] = useState<DesignLayer[]>(initial?.layers ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [font, setFont] = useState<FontId>("display");
  const fileRef = useRef<HTMLInputElement>(null);

  const uploading = Object.values(status).includes("uploading");
  useEffect(() => {
    onBusy(uploading);
    return () => onBusy(false);
  }, [onBusy, uploading]);

  const update = (id: string, patch: Partial<DesignLayer>) => setLayers((ls) => ls.map((l) => (l.id === id ? ({ ...l, ...patch } as DesignLayer) : l)));
  const remove = (id: string) => {
    setLayers((ls) => ls.filter((l) => l.id !== id));
    setStatus((s) => Object.fromEntries(Object.entries(s).filter(([k]) => k !== id)));
    setSelectedId((s) => (s === id ? null : s));
  };
  const move = (id: string, dir: 1 | -1) =>
    setLayers((ls) => {
      const i = ls.findIndex((l) => l.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= ls.length) return ls;
      const next = [...ls];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const addFiles = async (files: FileList | File[]) => {
    setProblem(null);
    let count = layers.length;
    for (const file of [...files]) {
      if (count >= lab.maxLayers) {
        setProblem(`Up to ${lab.maxLayers} layers in one design.`);
        break;
      }
      let layer;
      try {
        // Checks the file and shows it straight away, while the original uploads
        layer = newImageLayer(category, await prepareUpload(file));
      } catch (err) {
        setProblem((err as Error).message);
        continue;
      }
      const id = layer.id;
      // The first piece usually is the whole artwork: it covers the piece
      if (count === 0) layer = { ...layer, width: fitWidth(category, layer.aspect, "cover") };
      count++;
      setLayers((ls) => [...ls, layer]);
      setSelectedId(id);
      setStatus((s) => ({ ...s, [id]: "uploading" }));
      try {
        const fileId = await uploadFile("design", file);
        const res = await fetch("/api/admin/template", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileId, name: file.name }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error ?? "Upload failed.");
        update(id, { fileId, src: json.src, aspect: json.aspect, originalWidth: json.originalWidth, originalHeight: json.originalHeight });
        setStatus((s) => Object.fromEntries(Object.entries(s).filter(([k]) => k !== id)));
      } catch (err) {
        setStatus((s) => ({ ...s, [id]: "error" }));
        setProblem(`${file.name}: ${(err as Error).message}`);
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const addText = () => {
    const t = text.trim().slice(0, lab.text.maxLength);
    if (!t || !lab.text.allowedPattern.test(t) || layers.length >= lab.maxLayers) return;
    const layer = newTextLayer(category, t, font, contrastInk(base));
    setLayers((ls) => [...ls, layer]);
    setSelectedId(layer.id);
    setText("");
  };

  // Only finished layers are saved: an upload that failed is left out
  const saved: DesignTemplate = { base, layers: layers.filter((l) => l.kind === "text" || (l.fileId && !status[l.id] && !l.src.startsWith("data:"))) };
  const selected = layers.find((l) => l.id === selectedId) ?? null;
  const [vw, vh] = SHAPES[category].vb;
  const cat = categories[category];

  return (
    <Card
      title="Editable design (for “Customize”)"
      hint={`Upload the original design file here, not a photo, so a customer who presses “Customize this” gets the design itself and can change it. For the most freedom upload its pieces separately as transparent PNGs (background, each drawing, the lettering) and add the words as text: the customer can then move, resize, delete or recolour each one, and type their own name. Leave this empty to keep the old way (the customer adds things on top of the product photo).`}
    >
      <input type="hidden" name="template" value={saved.layers.length ? JSON.stringify(saved) : ""} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="drafting flex min-h-72 items-center justify-center border-2 border-ink p-6">
          <div style={{ width: `min(100%, calc(440px * ${vw / vh}))`, aspectRatio: `${vw} / ${vh}` }}>
            <DesignCanvas
              category={category}
              custom={{ base, layers }}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onUpdate={update}
              onRemove={remove}
              status={status}
              showArea
              title={`Editable ${cat.singular.toLowerCase()} design`}
            />
          </div>
        </div>

        <div className="grid content-start gap-5">
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn btn-ink btn-sm" onClick={() => fileRef.current?.click()} disabled={layers.length >= lab.maxLayers}>
              Upload design files
            </button>
            <span className="text-xs text-muted">
              {lab.uploads.acceptLabel}, up to {lab.uploads.maxMB} MB each
            </span>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept={lab.uploads.accept.join(",")}
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => e.target.files && addFiles(e.target.files)}
            />
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-0 flex-1 basis-40">
              <span className="mb-1 block text-sm font-semibold">Text on the design</span>
              <input
                value={text}
                maxLength={lab.text.maxLength}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addText();
                  }
                }}
                placeholder="e.g. a name the customer can change"
                className={input}
              />
            </label>
            <select aria-label="Lettering" value={font} onChange={(e) => setFont(e.target.value as FontId)} className="h-12 border-2 border-ink/20 bg-sheet px-2 text-sm">
              {lab.text.fonts.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
            <button type="button" className={smallButton} onClick={addText} disabled={!text.trim() || !lab.text.allowedPattern.test(text) || layers.length >= lab.maxLayers}>
              Add text
            </button>
          </div>

          <ColourPicker label="Colour of the piece" value={base} onChange={setBase} swatches={lab.baseSwatches} />

          {problem && (
            <p role="alert" className="text-sm font-semibold text-alert">
              {problem}
            </p>
          )}
          <FieldError msg={error} />
        </div>
      </div>

      {layers.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-sm font-semibold">Layers (top one last). Drag them on the piece; the corner knob resizes, the top knob turns.</p>
          <ol className="divide-y-2 divide-ink/10 ring-2 ring-ink/10">
            {layers.map((l, i) => (
              <li key={l.id} className={`flex items-center gap-3 px-3 py-2 ${l.id === selectedId ? "bg-mint-soft" : "bg-sheet"}`}>
                <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setSelectedId(l.id)} aria-pressed={l.id === selectedId}>
                  <span className="grid size-10 shrink-0 place-items-center overflow-hidden bg-fog">
                    {l.kind === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element -- preview of a dashboard upload
                      <img src={l.src} alt="" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <span style={{ fontFamily: fontOf(l.font).css, color: l.ink, background: luminance(l.ink) > 0.7 ? "#14215A" : undefined }}>Aa</span>
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{l.kind === "image" ? l.name : `“${l.text}”`}</span>
                    <span className={`block text-xs ${status[l.id] === "error" ? "font-semibold text-alert" : "text-muted"}`}>
                      {status[l.id] === "uploading"
                        ? "Uploading the original…"
                        : status[l.id] === "error"
                          ? "Upload failed: remove it and try again"
                          : l.kind === "image"
                            ? `${l.originalWidth} × ${l.originalHeight} px original`
                            : `${fontOf(l.font).label} lettering`}
                    </span>
                  </span>
                </button>
                <button type="button" className="grid size-9 place-items-center font-bold hover:bg-mint-soft disabled:opacity-25" disabled={i === layers.length - 1} onClick={() => move(l.id, 1)} aria-label={`Bring ${layerTitle(l)} forward`}>
                  ↑
                </button>
                <button type="button" className="grid size-9 place-items-center font-bold hover:bg-mint-soft disabled:opacity-25" disabled={i === 0} onClick={() => move(l.id, -1)} aria-label={`Send ${layerTitle(l)} back`}>
                  ↓
                </button>
                <button type="button" className="grid size-9 place-items-center font-bold text-alert hover:bg-mint-soft" onClick={() => remove(l.id)} aria-label={`Remove ${layerTitle(l)}`}>
                  ✕
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}

      {selected && (
        <div className="mt-4 grid gap-4 border-2 border-ink/15 bg-sheet p-4">
          <div className="flex flex-wrap gap-2">
            <button type="button" className={smallButton} onClick={() => update(selected.id, { x: 0.5, y: 0.5 })}>
              Center
            </button>
            <button type="button" className={smallButton} onClick={() => update(selected.id, { rotation: 0 })}>
              Straighten
            </button>
            {selected.kind === "image" && (
              <>
                <button type="button" className={smallButton} onClick={() => update(selected.id, { width: fitWidth(category, selected.aspect, "fit"), x: 0.5, y: 0.5, rotation: 0 })}>
                  Fit inside
                </button>
                <button type="button" className={smallButton} onClick={() => update(selected.id, { width: fitWidth(category, selected.aspect, "cover"), x: 0.5, y: 0.5, rotation: 0 })}>
                  Cover the whole piece
                </button>
              </>
            )}
          </div>
          {selected.kind === "text" && (
            <>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold">Text</span>
                <input
                  value={selected.text}
                  maxLength={lab.text.maxLength}
                  onChange={(e) => {
                    const t = e.target.value.slice(0, lab.text.maxLength);
                    if (t.trim() && lab.text.allowedPattern.test(t)) update(selected.id, { text: t });
                  }}
                  className={input}
                />
              </label>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Lettering">
                {lab.text.fonts.map((f) => (
                  <button key={f.id} type="button" role="radio" aria-checked={selected.font === f.id} className="chip" style={{ fontFamily: f.css }} onClick={() => update(selected.id, { font: f.id })}>
                    {f.label}
                  </button>
                ))}
              </div>
              <ColourPicker label="Text colour" value={selected.ink} onChange={(ink) => update(selected.id, { ink })} swatches={lab.text.inks} />
            </>
          )}
        </div>
      )}
    </Card>
  );
}
