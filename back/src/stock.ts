// Existing active reservations were deducted at creation; found reservations were not.
// New reservations record the exact deducted amount, including zero for preorders.
type ReservationStock = { quantity: number; status: string; deductedQty?: number | null };
type Batch = { quantity: number; arrivalDate: string | null };
export function deductedStock(r: ReservationStock) {
  return r.deductedQty ?? (r.status === "active" ? r.quantity : 0);
}
export const stockInclude = {
  warehouseItems: { select: { quantity: true, arrivalDate: true } },
  reservations: { where: { status: { in: ["active", "found"] as string[] } }, select: { quantity: true, status: true, deductedQty: true } },
} as const;
export function stockSummary(batches: Batch[] = [], reservations: ReservationStock[] = []) {
  const held = reservations.filter((r) => ["active", "found"].includes(r.status));
  const deductedQty = held.reduce((sum, r) => sum + deductedStock(r), 0);
  const reservedQty = held.reduce((sum, r) => sum + r.quantity, 0);
  const remainingQty = batches.filter((b) => !b.arrivalDate).reduce((sum, b) => sum + Math.max(0, b.quantity), 0);
  const expectedQty = batches.filter((b) => b.arrivalDate).reduce((sum, b) => sum + Math.max(0, b.quantity), 0);
  const availableQty = Math.max(0, remainingQty - (reservedQty - deductedQty));
  const arrivalDate = batches.filter((b) => b.arrivalDate && b.quantity > 0).map((b) => b.arrivalDate!).sort()[0] ?? null;
  return { totalQty: remainingQty + deductedQty, reservedQty, availableQty, expectedQty, arrivalDate,
    availability: availableQty > 0 ? "in_stock" : expectedQty > 0 ? "preorder" : "unavailable" };
}
export function productStock(product: { warehouseItems?: Batch[]; reservations?: ReservationStock[] }) {
  return stockSummary(product.warehouseItems, product.reservations);
}

import type { Prisma } from "@prisma/client";

// Consume received stock across batches; expected arrivals are never consumed.
export async function takeReceivedStock(tx: Prisma.TransactionClient, productId: string, quantity: number) {
  let remaining = quantity;
  const batches = await tx.warehouseItem.findMany({ where: { productId, arrivalDate: null, quantity: { gt: 0 } }, orderBy: { createdAt: "asc" } });
  for (const batch of batches) {
    const take = Math.min(remaining, batch.quantity);
    if (!take) break;
    const updated = await tx.warehouseItem.updateMany({ where: { id: batch.id, quantity: { gte: take } }, data: { quantity: { decrement: take } } });
    if (!updated.count) throw new Error("Залишок змінився. Оновіть склад і повторіть дію.");
    remaining -= take;
  }
  return quantity - remaining;
}

export async function restoreReceivedStock(tx: Prisma.TransactionClient, reservation: ReservationStock & { productId: string }) {
  const quantity = deductedStock(reservation);
  if (!quantity) return;
  const batch = await tx.warehouseItem.findFirst({ where: { productId: reservation.productId, arrivalDate: null } });
  if (batch) await tx.warehouseItem.update({ where: { id: batch.id }, data: { quantity: { increment: quantity } } });
  else await tx.warehouseItem.create({ data: { productId: reservation.productId, quantity, notes: "Повернення зі скасованого резерву" } });
}
