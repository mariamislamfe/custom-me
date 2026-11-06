"use server";

import { redirect } from "next/navigation";
import { DEPOSIT_STATUSES, ORDER_STATUSES, type DepositStatus, type OrderStatus } from "@/config/orders";
import { requireAdmin } from "@/lib/server/auth";
import { removeOrder, updateOrder } from "@/lib/server/orders";

export type OrderUpdateState = { saved?: number; error?: string };

export async function saveOrderAdmin(id: string, prev: OrderUpdateState, form: FormData): Promise<OrderUpdateState> {
  await requireAdmin();
  const status = String(form.get("status") ?? "") as OrderStatus;
  if (!ORDER_STATUSES.some((s) => s.id === status)) return { error: "Choose a status." };
  const rawDeposit = form.get("depositStatus");
  const depositStatus = rawDeposit == null ? undefined : (String(rawDeposit) as DepositStatus);
  if (depositStatus && !DEPOSIT_STATUSES.some((s) => s.id === depositStatus)) return { error: "Choose the deposit status." };
  const updated = await updateOrder(id, {
    status,
    depositStatus,
    trackingRef: String(form.get("trackingRef") ?? ""),
    adminNote: String(form.get("adminNote") ?? ""),
  });
  if (!updated) return { error: "This order no longer exists." };
  return { saved: (prev.saved ?? 0) + 1 };
}

export async function deleteOrder(id: string) {
  await requireAdmin();
  await removeOrder(id);
  redirect("/admin/orders?deleted=1");
}
