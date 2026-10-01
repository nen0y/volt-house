import type { Prisma } from "@prisma/client";
import type { LeadItem } from "./json";

export const COMMISSION_PERCENT = 10;
const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
type CostBatch = { id: string; productId: string; quantity: number; purchasePrice: number | null; arrivalDate: string | null };

// Never trust a purchase price submitted by a browser. Preserve the saved sale's
// cost, or obtain it from received warehouse batches. Always use the highest
// purchase price so selecting a cheaper batch cannot inflate the margin.
export function attachCosts(items: LeadItem[], previous: LeadItem[], batches: CostBatch[]): LeadItem[] {
  return items.map((item) => {
    const old = previous.find((p) => p.id === item.id && (p.warehouseItemId || null) === (item.warehouseItemId || null));
    if (old?.purchasePrice != null) return { ...item, purchasePrice: old.purchasePrice, warehouseItemId: old.warehouseItemId };
    const candidates = batches.filter((b) => b.productId === item.id && b.quantity > 0 && !b.arrivalDate && b.purchasePrice != null);
    const highestPrice = candidates.length ? Math.max(...candidates.map((b) => b.purchasePrice!)) : null;
    if (item.warehouseItemId) {
      const batch = candidates.find((b) => b.id === item.warehouseItemId);
      if (!batch) throw new Error(`Для «${item.name}» оберіть отриману партію з ціною закупівлі.`);
      return { ...item, purchasePrice: highestPrice };
    }
    return { ...item, purchasePrice: highestPrice };
  });
}
export async function resolveCosts(db: Pick<Prisma.TransactionClient, "warehouseItem">, items: LeadItem[], previous: LeadItem[] = []) {
  if (!items.length) return [];
  const batches = await db.warehouseItem.findMany({ where: { productId: { in: [...new Set(items.map((i) => i.id))] }, arrivalDate: null, quantity: { gt: 0 } }, select: { id: true, productId: true, quantity: true, purchasePrice: true, arrivalDate: true } });
  return attachCosts(items, previous, batches);
}
export function commissionFor(items: LeadItem[], total: number | null | undefined, manualMargin?: number | null) {
  const salesTotal = round(total ?? items.reduce((sum, item) => sum + item.price * item.quantity, 0));
  if (!items.length && manualMargin != null) {
    const margin = round(manualMargin);
    return { salesTotal, purchaseTotal: null, margin, commission: round(Math.max(0, margin) * COMMISSION_PERCENT / 100), missingCostCount: 0, commissionPercent: COMMISSION_PERCENT };
  }
  const missingCostCount = items.filter((item) => item.purchasePrice == null).length;
  if (!items.length || missingCostCount) return { salesTotal, purchaseTotal: null, margin: null, commission: null, missingCostCount: missingCostCount || 1, commissionPercent: COMMISSION_PERCENT };
  const purchaseTotal = round(items.reduce((sum, item) => sum + item.purchasePrice! * item.quantity, 0));
  const margin = round(salesTotal - purchaseTotal);
  return { salesTotal, purchaseTotal, margin, commission: round(Math.max(0, margin) * COMMISSION_PERCENT / 100), missingCostCount: 0, commissionPercent: COMMISSION_PERCENT };
}
