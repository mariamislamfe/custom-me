/** Finance page (/admin/finance): what money can go out on. */
export const EXPENSE_CATEGORIES = [
  { id: "materials", label: "Materials" },
  { id: "printing", label: "Printing" },
  { id: "packaging", label: "Packaging" },
  { id: "ads", label: "Ads" },
  { id: "delivery", label: "Delivery" },
  { id: "other", label: "Other" },
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]["id"];
