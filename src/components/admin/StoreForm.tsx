"use client";

import { useActionState, useRef, useState } from "react";
import { saveStoreInfo, type SettingsState } from "@/app/admin/actions";
import type { DepositAmount } from "@/config/payments";
import type { StoreInfo } from "@/lib/server/settings";
import { uploadFile } from "@/lib/upload";
import { Card, Field, input, smallButton } from "./ui";

/** A deposit: an amount, as EGP a piece or a % of the price. */
function DepositField({ name, label, hint, value }: { name: string; label: string; hint: string; value: DepositAmount }) {
  return (
    <div>
      <label htmlFor={`${name}Value`} className="block font-semibold">
        {label}
      </label>
      <p className="text-sm text-muted">{hint}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input id={`${name}Value`} name={`${name}Value`} defaultValue={value.value} inputMode="numeric" className={`${input} max-w-32`} />
        <select aria-label={`${label}: unit`} name={`${name}Unit`} defaultValue={value.unit} className={`${input} w-auto`}>
          <option value="percent">% of the price</option>
          <option value="egp">EGP a piece</option>
        </select>
      </div>
    </div>
  );
}

/** InstaPay details, the deposit and paid-in-full discount, and the shop's social links and WhatsApp. */
export function StoreForm({ info }: { info: StoreInfo }) {
  const [state, action, saving] = useActionState<SettingsState, FormData>(saveStoreInfo, {});
  const pay = info.payments;
  const [qr, setQr] = useState(pay.qr);
  const [qrBusy, setQrBusy] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const qrInput = useRef<HTMLInputElement>(null);
  const [byDelivery, setByDelivery] = useState(pay.depositIsDelivery);
  const [edited, setEdited] = useState(false);
  const [shown, setShown] = useState(state);
  if (shown !== state) {
    setShown(state);
    setEdited(false);
  }

  const uploadQr = async (file?: File) => {
    if (!file) return;
    setQrBusy(true);
    setQrError(null);
    try {
      const fileId = await uploadFile("product", file);
      // Stored like a product photo, kept exactly as it is (no background removal)
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, name: file.name, removeBackground: false, split: false }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed.");
      setQr(json.images[0].src);
      setEdited(true);
    } catch (err) {
      setQrError((err as Error).message);
    } finally {
      setQrBusy(false);
      if (qrInput.current) qrInput.current.value = "";
    }
  };

  return (
    <form action={action} onInput={() => setEdited(true)} className="grid gap-6">
      <input type="hidden" name="qr" value={qr} />
      <Card
        title="InstaPay"
        hint="Fill in your InstaPay address or mobile number and checkout offers InstaPay: a deposit now and the rest on delivery, or the whole order now for a discount. Customers upload a screenshot of the transfer; you check it and mark it received in the order. Leave both empty for cash on delivery only."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="InstaPay address (IPA)" htmlFor="address" hint="e.g. customme@instapay">
            <input id="address" name="address" defaultValue={pay.address} maxLength={80} className={input} />
          </Field>
          <Field label="InstaPay mobile number" htmlFor="phone" hint="The number linked to your InstaPay account.">
            <input id="phone" name="phone" defaultValue={pay.phone} inputMode="tel" maxLength={20} placeholder="01012345678" className={input} />
          </Field>
          <Field label="Account name" htmlFor="accountName" hint="The name customers see in InstaPay when they send the money.">
            <input id="accountName" name="accountName" defaultValue={pay.accountName} maxLength={80} className={input} />
          </Field>
          <Field label="InstaPay payment link (optional)" htmlFor="link" hint="The link inside your InstaPay QR code: a button that opens InstaPay on the phone.">
            <input id="link" name="link" defaultValue={pay.link} maxLength={300} placeholder="https://ipn.eg/…" className={input} />
          </Field>
          <Field label="Discount for paying it all by InstaPay (%)" htmlFor="fullPaymentDiscountPercent" hint="Off the items when the whole order is paid now. 0 turns this choice off.">
            <input id="fullPaymentDiscountPercent" name="fullPaymentDiscountPercent" defaultValue={pay.fullPaymentDiscountPercent} inputMode="numeric" className={`${input} max-w-40`} />
          </Field>
        </div>
        <fieldset className="mt-6 grid gap-5 border-2 border-ink/15 p-4">
          <legend className="px-1 font-semibold">Deposit (paid now by InstaPay, the rest on delivery)</legend>
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" name="depositIsDelivery" checked={byDelivery} onChange={(e) => setByDelivery(e.target.checked)} className="mt-1 size-5 accent-ink" />
            <span>
              <span className="block font-semibold">Ready-made products: the deposit is the delivery fee</span>
              <span className="block text-sm text-muted">
                On: an order of shop products as they’re sold puts down just its delivery fee (once per order). Off: set your own deposit for them below.
              </span>
            </span>
          </label>
          {!byDelivery && (
            <DepositField
              name="readyDeposit"
              label="Deposit for ready-made products"
              hint="For each shop product bought as it is. 0 = no deposit for them."
              value={pay.readyDeposit}
            />
          )}
          <DepositField
            name="customDeposit"
            label="Deposit for custom pieces"
            hint="For each piece designed in the Lab or personalized (“Customize this”). 50% = half now, half on delivery. 0 = no deposit for them."
            value={pay.customDeposit}
          />
          <p className="text-sm text-muted">An order with both puts down both. An order with nothing to put down (say, a governorate with no delivery fee set) just doesn’t offer the deposit choice.</p>
        </fieldset>
        <label className="mt-6 flex cursor-pointer items-start gap-3">
          <input type="checkbox" name="allowCod" defaultChecked={pay.allowCod} className="mt-1 size-5 accent-ink" />
          <span>
            <span className="block font-semibold">Also allow cash on delivery with no deposit</span>
            <span className="block text-sm text-muted">Off: with InstaPay on, every order starts with a deposit (or is paid in full). On: customers can also just pay the courier.</span>
          </span>
        </label>
        <div className="mt-6">
          <p className="font-semibold">InstaPay QR code (optional)</p>
          <p className="text-sm text-muted">Shown at checkout on a computer, so customers can scan it with their phone.</p>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            {qr && (
              // eslint-disable-next-line @next/next/no-img-element -- the uploaded QR code
              <img src={qr} alt="Your InstaPay QR code" className="size-32 border-2 border-ink/15 bg-sheet object-contain p-2" />
            )}
            <button type="button" className={smallButton} onClick={() => qrInput.current?.click()} disabled={qrBusy}>
              {qrBusy ? "Uploading…" : qr ? "Change QR code" : "Upload QR code"}
            </button>
            {qr && (
              <button
                type="button"
                className={`${smallButton} text-alert`}
                onClick={() => {
                  setQr("");
                  setEdited(true);
                }}
              >
                Remove
              </button>
            )}
            <input ref={qrInput} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => uploadQr(e.target.files?.[0])} />
          </div>
          {qrError && <p className="mt-2 text-sm font-semibold text-alert">{qrError}</p>}
        </div>
      </Card>

      <Card title="Social links" hint="Shown in the footer of the store. Leave a link empty to hide it.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Instagram link" htmlFor="instagram">
            <input id="instagram" name="instagram" defaultValue={info.instagram} maxLength={300} placeholder="https://instagram.com/custom.me" className={input} />
          </Field>
          <Field label="Instagram handle" htmlFor="instagramHandle">
            <input id="instagramHandle" name="instagramHandle" defaultValue={info.instagramHandle} maxLength={60} placeholder="@custom.me" className={input} />
          </Field>
          <Field label="Facebook link" htmlFor="facebook">
            <input id="facebook" name="facebook" defaultValue={info.facebook} maxLength={300} placeholder="https://facebook.com/custom.me" className={input} />
          </Field>
          <Field label="TikTok link" htmlFor="tiktok">
            <input id="tiktok" name="tiktok" defaultValue={info.tiktok} maxLength={300} placeholder="https://tiktok.com/@custom.me" className={input} />
          </Field>
        </div>
      </Card>

      <Card
        title="WhatsApp"
        hint="Customers who tap the green “Need help?” button on the store land in a WhatsApp chat with this number. It’s in the footer too. Leave it empty to hide both."
      >
        <Field label="WhatsApp number" htmlFor="whatsapp" hint="Egyptian numbers can be typed as usual (01012345678); other countries with their code (+9715…).">
          <input id="whatsapp" name="whatsapp" defaultValue={info.whatsapp} inputMode="tel" maxLength={20} placeholder="01012345678" className={`${input} max-w-60`} />
        </Field>
      </Card>

      <Card
        title="Meta Pixel (Facebook & Instagram ads)"
        hint="Paste the Pixel ID from Meta Events Manager. The store then reports page views, add to bag, checkout and every order placed (with its total) to it, so your ads can measure sales. One ID per line, up to 5. Leave it empty to turn tracking off."
      >
        <Field label="Pixel IDs" htmlFor="metaPixels" hint="Digits only, e.g. 1234567890123456.">
          <textarea
            id="metaPixels"
            name="metaPixels"
            defaultValue={info.metaPixels.join("\n")}
            rows={3}
            maxLength={400}
            inputMode="numeric"
            spellCheck={false}
            placeholder="1234567890123456"
            className={`${input} max-w-80 font-mono`}
          />
        </Field>
      </Card>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-3 border-t-2 border-ink bg-paper/95 px-4 py-3 sm:-mx-5 sm:px-5 sm:py-4 backdrop-blur-sm">
        <button type="submit" className="btn btn-ink" disabled={saving || qrBusy}>
          {saving ? "Saving…" : "Save"}
        </button>
        {state.error && (
          <p role="alert" className="font-semibold text-alert">
            {state.error}
          </p>
        )}
        {state.saved && !edited && !saving && !state.error && (
          <p role="status" className="font-semibold">
            Saved. Checkout uses the new details now.
          </p>
        )}
      </div>
    </form>
  );
}
