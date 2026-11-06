import { site } from "@/config/site";

const fmt = new Intl.NumberFormat(site.currency.locale, {
  style: "currency",
  currency: site.currency.code,
  maximumFractionDigits: 0,
});

export function money(amount: number) {
  return fmt.format(amount);
}

/** A product's price, or a plain note while it has none yet. */
export function priceText(amount: number | null) {
  return amount == null ? "Price soon" : fmt.format(amount);
}

/** Order timestamps, shown in Egypt time. */
export const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Cairo" });
