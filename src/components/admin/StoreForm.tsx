"use client";

import { useActionState, useRef, useState } from "react";
import { saveStoreInfo, type SettingsState } from "@/app/admin/actions";
import type { StoreInfo } from "@/lib/server/settings";
import { uploadFile } from "@/lib/upload";
import { Card, Field, input, smallButton } from "./ui";

/** InstaPay details, the deposit and paid-in-full discount, and the shop's Instagram. */
export function StoreForm({ info }: { info: StoreInfo }) {
  const [state, action, saving] = useActionState<SettingsState, FormData>(saveStoreInfo, {});
  const pay = info.payments;
  const [qr, setQr] = useState(pay.qr);
  const [qrBusy, setQrBusy] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const qrInput = useRef<HTMLInputElement>(null);
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
          <Field label="Deposit per piece (EGP)" htmlFor="depositPerPiece" hint="Paid now by InstaPay for each piece in the bag; the rest on delivery. 0 = no deposit choice (only paying it all now).">
            <input id="depositPerPiece" name="depositPerPiece" defaultValue={pay.depositPerPiece} inputMode="numeric" className={`${input} max-w-40`} />
          </Field>
          <Field label="Discount for paying it all by InstaPay (%)" htmlFor="fullPaymentDiscountPercent" hint="Off the items when the whole order is paid now. 0 turns this choice off.">
            <input id="fullPaymentDiscountPercent" name="fullPaymentDiscountPercent" defaultValue={pay.fullPaymentDiscountPercent} inputMode="numeric" className={`${input} max-w-40`} />
          </Field>
        </div>
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

      <Card title="Instagram" hint="Shown in the footer of the store. Leave the link empty to hide it.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Instagram link" htmlFor="instagram">
            <input id="instagram" name="instagram" defaultValue={info.instagram} maxLength={300} placeholder="https://instagram.com/custom.me" className={input} />
          </Field>
          <Field label="Handle" htmlFor="instagramHandle">
            <input id="instagramHandle" name="instagramHandle" defaultValue={info.instagramHandle} maxLength={60} placeholder="@custom.me" className={input} />
          </Field>
        </div>
      </Card>

      <div className="sticky bottom-0 -mx-5 flex flex-wrap items-center gap-3 border-t-2 border-ink bg-paper/95 px-5 py-4 backdrop-blur-sm">
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
