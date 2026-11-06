"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { categories, optionExtra, optionsFor, type CategoryId } from "@/data/catalog";
import { colourName, fontOf, lab, LIMITS, luminance, type DesignLayer, type FontId, type ImageLayer } from "@/config/customization";
import { ProductMockup } from "@/components/products/ProductMockup";
import { fitClass, SHAPES } from "@/components/products/shapes";
import { OptionPicker } from "@/components/products/OptionPicker";
import { PreviewNotice } from "@/components/cart/PreviewNotice";
import { useStore } from "@/components/store/StoreProvider";
import { priceText } from "@/lib/format";
import { ease } from "@/lib/motion";
import { fitWidth, normalizeAngle } from "@/lib/layers";
import { DesignCanvas, layerTitle } from "./DesignCanvas";
import { hasHandoff, takeHandoff } from "./handoff";
import { useLab, type LabState } from "./useLabState";
import { VisualRadio } from "./Swatches";
import { ColourPicker } from "./ColourPicker";

type StepId = "object" | "base" | "design" | "review";
type Step = { id: StepId; label: string };

const STEPS: Step[] = [
  { id: "object", label: "Object" },
  { id: "base", label: "Size & colour" },
  { id: "design", label: "Your design" },
  { id: "review", label: "Review" },
];

/** Personalizing a shop design: the object and its look are already chosen. */
const DESIGN_STEPS: Step[] = [
  { id: "base", label: "Options" },
  { id: "design", label: "Add yours" },
  { id: "review", label: "Review" },
];

type L = ReturnType<typeof useLab>;

export function Lab({ start }: { start: LabState }) {
  const L = useLab(start);
  const steps = L.product ? DESIGN_STEPS : STEPS;
  // A shop design to personalize, or a design dropped on the home page, opens straight on "Your design"
  const [step, setStep] = useState(() => {
    const list = start.product ? DESIGN_STEPS : STEPS;
    return start.product || start.custom.layers.length || hasHandoff() ? list.findIndex((s) => s.id === "design") : 0;
  });
  const [handoffError, setHandoffError] = useState<string | null>(null);
  const { addImage } = L;
  useEffect(() => {
    const file = takeHandoff();
    if (file) addImage(file).catch((err: Error) => setHandoffError(err.message));
  }, [addImage]);
  const [dir, setDir] = useState(1);
  const [showArea, setShowArea] = useState(true);
  const [confirmReset, setConfirmReset] = useState(false);
  const [added, setAdded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const goto = (i: number) => {
    const next = Math.max(0, Math.min(steps.length - 1, i));
    setDir(next > step ? 1 : -1);
    setStep(next);
    setAdded(false);
    requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true }));
  };

  const at = Math.min(step, steps.length - 1);
  const id: StepId = steps[at].id;
  const n = at + 1;
  const cat = categories[L.category];
  const [vw, vh] = SHAPES[L.category].vb;

  const onAdd = () => {
    if (L.addToBag()) setAdded(true);
  };

  return (
    <div className="lg:grid lg:min-h-[calc(100dvh-72px)] lg:grid-cols-[minmax(0,1.1fr)_minmax(440px,0.9fr)]">
      {/* ── the piece: drag, resize and rotate right on it ───────── */}
      <div className="sticky top-16 z-20 border-b-2 border-ink bg-paper lg:top-[72px] lg:h-[calc(100dvh-72px)] lg:border-b-0 lg:border-r-2">
        <div className="drafting relative h-[42svh] min-h-[270px] overflow-hidden lg:h-full">
          <div className="absolute inset-x-4 bottom-11 top-12 [container-type:size] lg:inset-x-12 lg:bottom-14 lg:top-16">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={L.category}
                className="absolute left-1/2 top-1/2"
                style={{ width: `min(100cqw, calc(100cqh * ${vw / vh}))`, aspectRatio: `${vw} / ${vh}`, x: "-50%", y: "-50%" }}
                initial={{ opacity: 0, scale: 0.92, rotate: -3 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.92, rotate: 3 }}
                transition={{ duration: 0.45, ease: ease.snap }}
              >
                <DesignCanvas
                  category={L.category}
                  custom={L.custom}
                  selectedId={L.selectedId}
                  onSelect={L.select}
                  onUpdate={L.updateLayer}
                  onRemove={L.removeLayer}
                  status={L.status}
                  showArea={showArea}
                  title={L.product ? `Preview of ${L.product.name} with your additions` : `Preview of your custom ${cat.singular.toLowerCase()}`}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
            <span className="sticker">Live preview</span>
            <button type="button" onClick={() => setShowArea((v) => !v)} aria-pressed={showArea} className="sticker hover:bg-mint-soft">
              {showArea ? "Hide" : "Show"} print area
            </button>
          </div>
          <p className="absolute bottom-2 left-3 right-3 font-mono text-[10px] text-muted lg:bottom-3 lg:text-[11px]">
            {L.custom.layers.length ? "Drag to move · corner to resize · top knob to rotate" : "Illustration of the product. Colours on screen vary slightly from print."}
          </p>
        </div>
      </div>

      {/* ── controls ────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-col pb-28 lg:pb-0">
        <nav aria-label="Lab steps" className="no-scrollbar overflow-x-auto border-b-2 border-ink">
          <ol className="flex min-w-max">
            {steps.map((s, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => goto(i)}
                  aria-current={i === at ? "step" : undefined}
                  className={`relative flex h-14 items-center gap-2 px-4 font-mono text-xs font-bold uppercase tracking-wider transition-colors md:px-5 ${
                    i === at ? "bg-ink text-sheet" : i < at ? "text-ink hover:bg-mint-soft" : "text-muted hover:bg-mint-soft"
                  }`}
                >
                  <span className={`grid h-6 w-6 place-items-center border-2 ${i === at ? "border-mint text-mint" : "border-current"}`}>{i + 1}</span>
                  {s.label}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <div ref={panelRef} className="relative flex-1 overflow-hidden px-[var(--gutter)] py-8 lg:px-10 lg:py-10">
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div
              key={id}
              custom={dir}
              initial={{ opacity: 0, x: 28 * dir }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -28 * dir }}
              transition={{ duration: 0.3, ease: ease.snap }}
            >
              {id === "object" && <StepObject L={L} n={n} total={steps.length} />}
              {id === "base" && <StepBase L={L} n={n} total={steps.length} />}
              {id === "design" && <StepDesign L={L} n={n} total={steps.length} initialError={handoffError} />}
              {id === "review" && <StepReview L={L} n={n} total={steps.length} goto={(k) => goto(steps.findIndex((s) => s.id === k))} added={added} onAdd={onAdd} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* action bar: fixed on phones, inline on desktop */}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-ink bg-sheet px-[var(--gutter)] py-3 lg:static lg:px-10 lg:py-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="type-label truncate text-muted">{L.product ? `${L.product.name} · personalized` : `Custom ${cat.singular}`}</p>
              <p className="font-mono text-lg font-bold">{priceText(L.price)}</p>
            </div>
            <div className="flex items-center gap-2">
              {confirmReset ? (
                <>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmReset(false)}>
                    Keep
                  </button>
                  <button
                    type="button"
                    className="btn btn-paper btn-sm"
                    onClick={() => {
                      L.reset();
                      setConfirmReset(false);
                      goto(0);
                    }}
                  >
                    Reset all
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="type-label hidden px-2 text-muted underline-offset-4 hover:text-ink hover:underline sm:block" onClick={() => setConfirmReset(true)}>
                    Reset
                  </button>
                  {at > 0 && (
                    <button type="button" className="btn btn-paper btn-sm" onClick={() => goto(at - 1)}>
                      Back
                    </button>
                  )}
                  {at < steps.length - 1 ? (
                    <button type="button" className="btn btn-ink btn-sm" onClick={() => goto(at + 1)}>
                      {/* one flex item, so the button's gap doesn't split "Next" from its colon */}
                      <span>
                        Next<span className="hidden sm:inline">: {steps[at + 1].label}</span>
                      </span>
                    </button>
                  ) : (
                    <button type="button" className="btn btn-ink btn-sm" onClick={onAdd} disabled={!L.ready}>
                      {L.uploading ? "Uploading…" : "Add to bag"}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type StepProps = { L: L; n: number; total: number };

function StepHead({ n, total, title, hint }: { n: number; total: number; title: string; hint: string }) {
  return (
    <div className="mb-8">
      <p className="type-label text-muted">
        Step {n} of {total}
      </p>
      <h2 tabIndex={-1} className="type-display mt-2 text-[clamp(2rem,4vw,3rem)] outline-none">
        {title}
      </h2>
      <p className="mt-2 max-w-md text-muted">{hint}</p>
    </div>
  );
}

function StepObject({ L, n, total }: StepProps) {
  return (
    <>
      <StepHead n={n} total={total} title="Pick the object." hint="Your design is placed on its print area, so the shape decides the canvas." />
      <VisualRadio<CategoryId>
        label="Product"
        options={lab.categories}
        value={L.category}
        onChange={L.setCategory}
        getLabel={(c) => categories[c].singular}
        className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4"
        itemClassName="group"
        render={(c, sel) => (
          <span className={`flex h-full flex-col items-center gap-3 border-2 p-3 transition-colors sm:p-4 ${sel ? "border-ink bg-mint-soft" : "border-rule bg-sheet group-hover:border-ink"}`}>
            <span className="flex h-28 w-full items-center justify-center sm:h-36">
              <ProductMockup category={c} artwork="plain" palette="navy-mint" ground={L.base} className={fitClass(c)} />
            </span>
            <span className="text-center font-mono text-[11px] font-bold uppercase leading-tight tracking-wider sm:text-xs">{categories[c].singular}</span>
          </span>
        )}
      />
    </>
  );
}

function StepBase({ L, n, total }: StepProps) {
  const { pricing } = useStore();
  if (L.product) {
    const product = L.product;
    const groups = optionsFor(product, pricing);
    // The design's editable original: the piece's colour is the customer's to pick too (unless the design comes in set colours)
    const editable = Boolean(L.custom.template);
    return (
      <>
        <StepHead
          n={n}
          total={total}
          title="Your pick."
          hint={
            editable
              ? "This is the design you chose, ready to change. Pick its options and colour, then make it yours: move, resize or delete any part of it, change the text, add your name or your own art."
              : "This is the design you chose. Pick its options, then add your name or your own art on top of it."
          }
        />
        <div className="space-y-8">
          {groups.map((g) => (
            <OptionPicker
              key={g.id}
              group={g}
              value={L.selection[g.id]}
              onChange={(v) => L.setOption(g.id, v)}
              extra={(v) => (g.own ? 0 : optionExtra(pricing, product.category, g.id, v))}
              ownPrice={g.own && g.values.some((v) => v.price != null) ? (v) => v.price ?? product.price : undefined}
            />
          ))}
          {editable && !product.colours.length && <ColourPicker label="Colour of the piece" value={L.base} onChange={L.setBase} swatches={lab.baseSwatches} />}
          {!groups.length && !editable && <p className="text-muted">This design comes one way only. Go on to add yours.</p>}
          <div className="border-2 border-dashed border-ink/50 p-4 text-sm">
            <p>
              Starting from <strong>{product.name}</strong>.{" "}
              {pricing.personalize[product.category] ? `Personalizing it adds ${pricing.personalize[product.category]} EGP.` : ""}
            </p>
            <button type="button" onClick={L.startPlain} className="type-label mt-2 underline decoration-2 underline-offset-4 hover:text-muted">
              Use a plain {categories[product.category].singular.toLowerCase()} instead
            </button>
          </div>
        </div>
      </>
    );
  }
  const groups = pricing.options[L.category];
  return (
    <>
      <StepHead n={n} total={total} title="Size & colour." hint="Pick the fit, then the colour of the piece your design is printed on: any colour you like." />
      <div className="space-y-8">
        {groups.map((g) => (
          <OptionPicker key={g.id} group={g} value={L.selection[g.id]} onChange={(v) => L.setOption(g.id, v)} extra={(v) => optionExtra(pricing, L.category, g.id, v)} />
        ))}
        <ColourPicker label="Base colour" value={L.base} onChange={L.setBase} swatches={lab.baseSwatches} />
      </div>
    </>
  );
}

function StepDesign({ L, n, total, initialError }: StepProps & { initialError: string | null }) {
  const [error, setError] = useState<string | null>(initialError);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [text, setText] = useState("");
  const [font, setFont] = useState<FontId>("marker");
  const input = useRef<HTMLInputElement>(null);
  const full = L.custom.layers.length >= lab.maxLayers;
  const selected = L.custom.layers.find((l) => l.id === L.selectedId) ?? null;

  const take = async (files: FileList | File[] | null) => {
    const list = [...(files ?? [])];
    setError(null);
    for (const f of list) {
      setBusy(true);
      try {
        await L.addImage(f);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setBusy(false);
      }
    }
  };

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? [...e.target.files] : [];
    e.target.value = "";
    void take(files);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    void take(e.dataTransfer.files);
  };

  return (
    <>
      <StepHead
        n={n}
        total={total}
        title={L.product ? (L.custom.template ? "Make it yours." : "Add yours.") : "Your design."}
        hint={
          L.custom.template
            ? "Every part of the design is a layer: tap one on the piece to move it, resize it from the corner, turn it from the top knob or delete it. Change the text, or add your name and your own pictures."
            : L.product
            ? "Type your name (or anything) and pick its colour, or upload a picture. Drag it into place on the design, resize it from the corner, turn it from the top knob."
            : "Upload your artwork: it lands on the piece. Drag it into place, resize it from the corner, turn it from the top knob."
        }
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed p-5 transition-colors ${over ? "border-ink bg-mint-soft" : "border-ink/50 bg-sheet"}`}
      >
        <div className="flex flex-wrap items-center gap-4">
          <button type="button" className="btn btn-ink" onClick={() => input.current?.click()} disabled={full || busy}>
            {busy ? "Reading…" : L.custom.layers.some((l) => l.kind === "image") ? "Add another image" : "Upload your design"}
          </button>
          <p className="text-sm text-muted">
            or drop it here. {lab.uploads.acceptLabel}, up to {lab.uploads.maxMB} MB.
          </p>
        </div>
        <input ref={input} type="file" multiple accept={lab.uploads.accept.join(",")} className="sr-only" onChange={onFile} tabIndex={-1} aria-hidden />
        <p className="mt-4 text-xs leading-relaxed text-muted">
          Your original file is uploaded as it is and sent with your order for printing. For a crisp print use at least {lab.uploads.recommendedPx} px on the long
          side; a PNG with a transparent background prints without a box around it.
        </p>
        {error && (
          <p role="alert" className="mt-3 border-l-4 border-alert pl-3 text-sm font-semibold text-alert">
            {error}
          </p>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1 basis-56">
          <label htmlFor="lab-text" className="type-label mb-2 block text-muted">
            Add text (optional)
          </label>
          <input
            id="lab-text"
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, lab.text.maxLength))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && text.trim()) {
                e.preventDefault();
                L.addText(text, font);
                setText("");
              }
            }}
            maxLength={lab.text.maxLength}
            placeholder="A name, initials, a line"
            autoComplete="off"
            className="w-full border-2 border-ink bg-sheet px-4 py-3 outline-none focus:shadow-[4px_4px_0_#3FE0AE]"
          />
        </div>
        <label className="sr-only" htmlFor="lab-font">
          Lettering
        </label>
        <select id="lab-font" value={font} onChange={(e) => setFont(e.target.value as FontId)} className="h-[52px] border-2 border-ink bg-sheet px-3 font-mono text-xs font-bold uppercase">
          {lab.text.fonts.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-paper"
          disabled={!text.trim() || full || !lab.text.allowedPattern.test(text)}
          onClick={() => {
            L.addText(text, font);
            setText("");
          }}
        >
          Add text
        </button>
      </div>
      {text && !lab.text.allowedPattern.test(text) && <p className="mt-2 text-sm font-semibold text-alert">Some of those characters can’t be printed. Use letters, numbers and basic punctuation.</p>}

      {L.custom.layers.length > 0 && (
        <div className="mt-8">
          <p className="type-label mb-3 text-muted">On your piece (top layer last)</p>
          <ol className="divide-y-2 divide-dashed divide-rule border-y-2 border-ink">
            {L.custom.layers.map((l, i) => (
              <LayerRow key={l.id} L={L} layer={l} index={i} />
            ))}
          </ol>
        </div>
      )}

      {selected && <LayerControls L={L} layer={selected} />}
    </>
  );
}

function LayerRow({ L, layer, index }: { L: L; layer: DesignLayer; index: number }) {
  const up = L.uploads[layer.id];
  const selected = L.selectedId === layer.id;
  const lowRes = layer.kind === "image" && Math.max(layer.originalWidth, layer.originalHeight) < lab.uploads.recommendedPx;
  const n = L.custom.layers.length;
  const small = "grid size-9 place-items-center border-2 border-transparent font-bold hover:border-ink disabled:opacity-25";
  return (
    <li className={`flex items-center gap-3 py-2.5 ${selected ? "bg-mint-soft/60" : ""}`}>
      <button type="button" onClick={() => L.select(layer.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-pressed={selected}>
        <span className="grid size-11 shrink-0 place-items-center overflow-hidden border-2 border-ink bg-fog">
          {layer.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element -- a local preview of the customer's file
            <img src={layer.src} alt="" className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-lg leading-none" style={{ fontFamily: fontOf(layer.font).css, color: layer.ink, background: luminance(layer.ink) > 0.7 ? "#14215A" : undefined }}>
              Aa
            </span>
          )}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-semibold">{layer.kind === "image" ? layer.name : `“${layer.text}”`}</span>
          <span className={`block text-xs ${up?.status === "error" ? "font-semibold text-alert" : "text-muted"}`}>
            {up?.status === "uploading"
              ? "Uploading the original…"
              : up?.status === "error"
                ? up.error
                : layer.kind === "image"
                  ? `${layer.originalWidth} × ${layer.originalHeight} px${lowRes ? " · may print soft" : " · uploaded ✓"}`
                  : `${fontOf(layer.font).label} lettering`}
          </span>
        </span>
      </button>
      {up?.status === "error" && (
        <button type="button" className="btn btn-paper btn-sm" onClick={() => L.retryUpload(layer.id)}>
          Retry
        </button>
      )}
      <button type="button" className={small} disabled={index === n - 1} onClick={() => L.reorderLayer(layer.id, 1)} aria-label={`Bring ${layerTitle(layer)} forward`}>
        ↑
      </button>
      <button type="button" className={small} disabled={index === 0} onClick={() => L.reorderLayer(layer.id, -1)} aria-label={`Send ${layerTitle(layer)} back`}>
        ↓
      </button>
      <button type="button" className={`${small} text-alert`} onClick={() => L.removeLayer(layer.id)} aria-label={`Remove ${layerTitle(layer)}`}>
        ✕
      </button>
    </li>
  );
}

function Slider({ label, value, min, max, step, onChange, display }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; display: string }) {
  return (
    <label className="block">
      <span className="type-label flex justify-between text-muted">
        {label} <span className="text-ink">{display}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-2 w-full accent-[#14215A]" />
    </label>
  );
}

function LayerControls({ L, layer }: { L: L; layer: DesignLayer }) {
  const set = (patch: Partial<DesignLayer>) => L.updateLayer(layer.id, patch);
  const img = layer.kind === "image" ? (layer as ImageLayer) : null;
  return (
    <div className="mt-6 border-2 border-ink bg-sheet p-4 shadow-[5px_5px_0_#14215A]">
      <p className="type-label">Adjust: {layer.kind === "image" ? "your design" : "text"}</p>
      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        {img ? (
          <Slider label="Size" value={img.width} min={LIMITS.imageWidth[0]} max={LIMITS.imageWidth[1]} step={0.01} onChange={(width) => set({ width })} display={`${Math.round(img.width * 100)}%`} />
        ) : (
          layer.kind === "text" && (
            <Slider label="Size" value={layer.size} min={LIMITS.textSize[0]} max={LIMITS.textSize[1]} step={0.005} onChange={(size) => set({ size })} display={`${Math.round(layer.size * 100)}`} />
          )
        )}
        <Slider label="Rotate" value={layer.rotation} min={-180} max={180} step={1} onChange={(r) => set({ rotation: normalizeAngle(r) })} display={`${Math.round(layer.rotation)}°`} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Chip onClick={() => set({ x: 0.5, y: 0.5 })}>Center</Chip>
        <Chip onClick={() => set({ rotation: 0 })}>Straighten</Chip>
        {img && (
          <>
            <Chip onClick={() => set({ width: fitWidth(L.category, img.aspect, "fit"), x: 0.5, y: 0.5, rotation: 0 })}>Fit inside</Chip>
            <Chip onClick={() => set({ width: fitWidth(L.category, img.aspect, "cover"), x: 0.5, y: 0.5, rotation: 0 })}>Cover the whole piece</Chip>
          </>
        )}
      </div>
      {layer.kind === "text" && (
        <div className="mt-5 grid gap-4">
          <label className="block">
            <span className="type-label mb-2 block text-muted">Text</span>
            <input
              value={layer.text}
              maxLength={lab.text.maxLength}
              onChange={(e) => {
                const t = e.target.value.slice(0, lab.text.maxLength);
                if (t.trim() && lab.text.allowedPattern.test(t)) set({ text: t });
              }}
              className="w-full border-2 border-ink bg-paper px-3 py-2 outline-none"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Lettering">
            {lab.text.fonts.map((f) => (
              <button key={f.id} type="button" role="radio" aria-checked={layer.font === f.id} className="chip" onClick={() => set({ font: f.id })} style={{ fontFamily: f.css }}>
                {f.label}
              </button>
            ))}
          </div>
          <ColourPicker label="Text colour" value={layer.ink} onChange={(ink) => set({ ink })} swatches={lab.text.inks} />
        </div>
      )}
    </div>
  );
}

function Chip({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className="chip" onClick={onClick}>
      {children}
    </button>
  );
}

function StepReview({ L, n, total, goto, added, onAdd }: StepProps & { goto: (step: StepId) => void; added: boolean; onAdd: () => void }) {
  const { pricing } = useStore();
  const images = L.custom.layers.filter((l) => l.kind === "image");
  const texts = L.custom.layers.filter((l) => l.kind === "text");
  const rows: { k: string; v: string; step: StepId }[] = [
    ...(L.product
      ? [{ k: "Design", v: L.product.name, step: "base" as const }]
      : [{ k: "Object", v: categories[L.category].singular, step: "object" as const }]),
    ...optionsFor(L.product ?? L.category, pricing).map((g) => ({ k: g.label, v: g.values.find((v) => v.id === L.selection[g.id])?.label ?? "—", step: "base" as const })),
    ...(L.product && !L.custom.template ? [] : [{ k: "Base colour", v: colourName(L.base), step: "base" as const }]),
    { k: L.product ? "Your picture" : "Your design", v: images.length ? images.map((l) => l.name).join(", ") : "No image", step: "design" },
    { k: "Text", v: texts.length ? texts.map((l) => `“${l.text}”`).join(", ") : "No text", step: "design" },
  ];
  return (
    <>
      <StepHead n={n} total={total} title="Review it." hint="This is exactly what goes to print: every layer at the size, place and angle you set." />
      <dl className="divide-y-2 divide-dashed divide-rule border-y-2 border-ink">
        {rows.map((r) => (
          <div key={r.k} className="flex items-start justify-between gap-4 py-3.5">
            <div className="min-w-0">
              <dt className="type-label text-muted">{r.k}</dt>
              <dd className="mt-1 break-words font-semibold">{r.v}</dd>
            </div>
            <button type="button" onClick={() => goto(r.step)} className="type-label shrink-0 underline decoration-2 underline-offset-4 hover:text-muted">
              Edit
            </button>
          </div>
        ))}
      </dl>
      <div className="mt-6 flex items-baseline justify-between">
        <span className="type-label">Price</span>
        <span className="font-mono text-2xl font-bold">{priceText(L.price)}</span>
      </div>
      {L.price == null && (
        <p role="status" className="mt-4 border-l-4 border-ink pl-3 text-sm font-semibold">
          The price of a custom {categories[L.category].singular.toLowerCase()} is on its way, so it can’t be ordered just yet.
        </p>
      )}
      {!L.custom.layers.length && (
        <p role="status" className="mt-4 border-l-4 border-alert pl-3 text-sm font-semibold">
          {L.product ? "Add your name or a picture first." : "Add your design (or a line of text) first."}
        </p>
      )}
      {L.uploading && <p className="mt-4 border-l-4 border-ink pl-3 text-sm">Your design is still uploading. One moment…</p>}
      {L.failed && <p className="mt-4 border-l-4 border-alert pl-3 text-sm font-semibold text-alert">An upload failed. Go back a step and press Retry.</p>}
      <div className="mt-5">
        <PreviewNotice compact />
      </div>
      <div className="mt-6 hidden flex-wrap gap-3 lg:flex">
        <button type="button" className="btn btn-ink" onClick={onAdd} disabled={!L.ready}>
          {L.uploading ? "Uploading…" : "Add to bag"}
        </button>
      </div>
      <AnimatePresence>
        {added && (
          <motion.div role="status" className="mt-6 flex flex-wrap items-center gap-3 border-2 border-ink bg-mint-soft p-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <p className="flex-1 font-semibold">Added to your bag.</p>
            <Link href="/checkout" className="btn btn-ink btn-sm">
              Checkout
            </Link>
            <button
              type="button"
              className="btn btn-paper btn-sm"
              onClick={() => {
                L.reset();
                goto(L.product ? "design" : "object");
              }}
            >
              Design another
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
