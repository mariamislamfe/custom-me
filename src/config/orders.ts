/**
 * Checkout and order settings.
 *
 * Orders are cash on delivery (plus an InstaPay deposit once it's set up in
 * ./payments.ts). Every order is saved and shows up in the dashboard.
 */

export type OrderStatus = "new" | "confirmed" | "production" | "shipped" | "delivered" | "cancelled";

/**
 * Delivery destinations: the 27 governorates, plus the areas couriers often
 * price on their own, each listed after its governorate.
 */
export const GOVERNORATES = [
  "Cairo", "Giza", "Alexandria", "Qalyubia", "Sharqia", "Dakahlia", "Gharbia",
  "Monufia", "Beheira", "Kafr El Sheikh", "Damietta", "Port Said", "Ismailia",
  "Suez", "Ain Sokhna", "North Sinai", "South Sinai", "Sharm El Sheikh", "Red Sea", "Hurghada",
  "Faiyum", "Beni Suef", "Minya", "Asyut", "Sohag", "Qena", "Luxor", "Aswan",
  "Matrouh", "North Coast", "New Valley",
] as const;

export type Governorate = (typeof GOVERNORATES)[number];

/**
 * Delivery fee per governorate in EGP, set in the dashboard (Delivery) and
 * added to the order total. A governorate without a fee is confirmed on the
 * phone instead.
 */
export type DeliveryFees = Partial<Record<Governorate, number>>;

export const ORDER_STATUSES: { id: OrderStatus; label: string; tone: string }[] = [
  { id: "new", label: "New", tone: "bg-amber" },
  { id: "confirmed", label: "Confirmed", tone: "bg-[#cfe0ff]" },
  { id: "production", label: "In production", tone: "bg-[#e3d9ff]" },
  { id: "shipped", label: "Shipped", tone: "bg-mint-soft" },
  { id: "delivered", label: "Delivered", tone: "bg-mint" },
  { id: "cancelled", label: "Cancelled", tone: "bg-fog" },
];

export const DEPOSIT_STATUSES = [
  { id: "pending", label: "Waiting to check", tone: "bg-amber" },
  { id: "received", label: "Received", tone: "bg-mint" },
  { id: "rejected", label: "Not received", tone: "bg-alert/20" },
] as const;

export type DepositStatus = (typeof DEPOSIT_STATUSES)[number]["id"];

/** Most pieces of one item, and most lines, in a bag */
export const MAX_QTY = 10;
export const MAX_LINES = 30;

/** Print file exported from the dashboard when the print area size is unknown */
export const PRINT_FILE_DEFAULT_WIDTH_PX = 3000;
export const PRINT_DPI = 300;
