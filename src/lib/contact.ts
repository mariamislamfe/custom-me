/**
 * A WhatsApp number as wa.me wants it: country code and digits only.
 * Egyptian mobiles typed the local way (01012345678) get the 20 in front.
 */
export function whatsappNumber(raw: string) {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  else if (d.length === 11 && d.startsWith("01")) d = `2${d}`;
  return d;
}

/** Opens a chat with the number, the message already typed. */
export const whatsappLink = (raw: string, text?: string) => `https://wa.me/${whatsappNumber(raw)}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
