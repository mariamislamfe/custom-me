import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@/config/finance";
import { orderDiscount, type Order } from "@/lib/types";

/** Amounts in EGP; dates as YYYY-MM-DD in Egypt time. */
export type Expense = { id: string; kind: "expense"; date: string; category: ExpenseCategory; amount: number; note: string };
/** An order that didn't come through the website (Instagram, friends, a bazaar…). */
export type OutsideSale = { id: string; kind: "sale"; date: string; note: string; pieces: number; amount: number };
export type FinanceEntry = Expense | OutsideSale;
export type NewFinanceEntry = Omit<Expense, "id"> | Omit<OutsideSale, "id">;

export const ALL_TIME = "all";

/** YYYY-MM-DD for a moment, in Egypt time. */
export const cairoDay = (d: Date | string) => new Date(d).toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });

export const monthOf = (day: string) => day.slice(0, 7);

export const monthLabel = (month: string) =>
  new Date(`${month}-01T12:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

/** Pieces and item sales of a website order, after discounts (delivery fees go to the courier, so they're left out). */
export function orderPieces(order: Order) {
  let pieces = 0;
  let custom = 0;
  for (const l of order.lines) {
    pieces += l.quantity;
    if (l.custom) custom += l.quantity;
  }
  return { pieces, custom, sales: order.subtotal - orderDiscount(order) };
}

export type LedgerRow =
  | { kind: "order"; date: string; order: Order; pieces: number; custom: number; sales: number }
  | { kind: "sale"; date: string; entry: OutsideSale }
  | { kind: "expense"; date: string; entry: Expense };

/**
 * Totals for a month (or all time): website orders count unless cancelled,
 * outside orders and expenses are the ones added on the finance page.
 */
export function summarize(orders: Order[], entries: FinanceEntry[], month: string) {
  const inPeriod = (day: string) => month === ALL_TIME || monthOf(day) === month;
  const rows: LedgerRow[] = [];
  for (const o of orders) {
    const date = cairoDay(o.createdAt);
    if (o.status === "cancelled" || !inPeriod(date)) continue;
    rows.push({ kind: "order", date, order: o, ...orderPieces(o) });
  }
  for (const e of entries) {
    if (!inPeriod(e.date)) continue;
    rows.push(e.kind === "sale" ? { kind: "sale", date: e.date, entry: e } : { kind: "expense", date: e.date, entry: e });
  }
  rows.sort((a, b) => b.date.localeCompare(a.date));

  const t = { websiteOrders: 0, outsideOrders: 0, pieces: 0, custom: 0, sales: 0, expenses: 0 };
  const byCategory = Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c.id, 0])) as Record<ExpenseCategory, number>;
  for (const r of rows) {
    if (r.kind === "expense") {
      t.expenses += r.entry.amount;
      byCategory[r.entry.category] += r.entry.amount;
    } else if (r.kind === "order") {
      t.websiteOrders++;
      t.pieces += r.pieces;
      t.custom += r.custom;
      t.sales += r.sales;
    } else {
      t.outsideOrders++;
      t.pieces += r.entry.pieces;
      t.sales += r.entry.amount;
    }
  }
  return { rows, totals: { ...t, net: t.sales - t.expenses }, byCategory };
}

/** Months that have anything in them, newest first, always including this month. */
export function activeMonths(orders: Order[], entries: FinanceEntry[]) {
  const months = new Set([monthOf(cairoDay(new Date()))]);
  for (const o of orders) months.add(monthOf(cairoDay(o.createdAt)));
  for (const e of entries) months.add(monthOf(e.date));
  return [...months].sort().reverse();
}
