import type { Prisma } from "@prisma/client";
import type { LeadItem } from "./json";

export const COMMISSION_PERCENT = 10;
const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
type CostBatch = { id: string; productId: string; quantity: number; purchasePrice: number | null; arrivalDate: string | null };

// Catalogue costs always come from received warehouse batches. A custom item has
// no warehouse record, so its explicitly entered cost is kept as a sale snapshot.
// Route authorization ensures that only an administrator can submit that cost.
export function attachCosts(items: LeadItem[], previous: LeadItem[], batches: CostBatch[]): LeadItem[] {
  return items.map((item) => {
    const old = previous.find((p) => p.id === item.id && (p.warehouseItemId || null) === (item.warehouseItemId || null));
    if (item.custom) {
      const submitted = Object.prototype.hasOwnProperty.call(item, "purchasePrice");
      return { ...item, warehouseItemId: null, purchasePrice: submitted ? (item.purchasePrice ?? null) : (old?.purchasePrice ?? null) };
    }
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
export type InstallationFinancials = {
  requested?: boolean;
  price?: number | null;
  cost?: number | null;
};

export function commissionFor(items: LeadItem[], total: number | null | undefined, manualMargin?: number | null, installation: InstallationFinancials = {}) {
  const salesTotal = round(total ?? items.reduce((sum, item) => sum + item.price * item.quantity, 0));
  const installationRequested = installation.requested === true;
  const installationPrice = installationRequested ? round(installation.price ?? 0) : 0;
  const installationCost = installationRequested && installation.cost != null ? round(installation.cost) : null;
  const installationProfit = installationCost == null ? null : round(installationPrice - installationCost);
  const installationDetails = installationRequested ? { installationPrice, installationCost, installationProfit } : {};
  if (!items.length && !installationRequested && manualMargin != null) {
    const margin = round(manualMargin);
    return { salesTotal, purchaseTotal: null, margin, commission: round(Math.max(0, margin) * COMMISSION_PERCENT / 100), missingCostCount: 0, commissionPercent: COMMISSION_PERCENT };
  }
  const missingProductCostCount = items.filter((item) => item.purchasePrice == null).length;
  const missingCostCount = missingProductCostCount + (installationRequested && installationCost == null ? 1 : 0);
  if ((!items.length && !installationRequested) || missingCostCount) return { salesTotal, purchaseTotal: null, margin: null, commission: null, missingCostCount: missingCostCount || 1, commissionPercent: COMMISSION_PERCENT, ...installationDetails };
  const purchaseTotal = round(items.reduce((sum, item) => sum + item.purchasePrice! * item.quantity, 0) + (installationCost ?? 0));
  const margin = round(salesTotal - purchaseTotal);
  return { salesTotal, purchaseTotal, margin, commission: round(Math.max(0, margin) * COMMISSION_PERCENT / 100), missingCostCount: 0, commissionPercent: COMMISSION_PERCENT, ...installationDetails };
}
