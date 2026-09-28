import { attachCosts, commissionFor } from "./commission";
import { parseItems } from "./json";

export function currentKyivMonth(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Kyiv", year: "numeric", month: "2-digit" }).formatToParts(now);
  return `${parts.find((p) => p.type === "year")!.value}-${parts.find((p) => p.type === "month")!.value}`;
}
function kyivMonthStart(year: number, month: number) {
  const target = Date.UTC(year, month, 1);
  let result = target;
  const format = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Kyiv", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  for (let i = 0; i < 3; i++) {
    const parts = format.formatToParts(new Date(result));
    const n = (type: string) => Number(parts.find((p) => p.type === type)!.value);
    result += target - Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second"));
  }
  return new Date(result);
}
export function salesPeriod(from: unknown, to: unknown, now = new Date()) {
  const fromMonth = from ?? currentKyivMonth(now);
  const toMonth = to ?? fromMonth;
  const valid = (value: unknown): value is string => typeof value === "string" && /^(20\d{2})-(0[1-9]|1[0-2])$/.test(value);
  if (!valid(fromMonth) || !valid(toMonth) || fromMonth > toMonth) throw new Error("Оберіть коректний початковий і кінцевий місяць");
  const [fy, fm] = fromMonth.split("-").map(Number);
  const [ty, tm] = toMonth.split("-").map(Number);
  return { fromMonth, toMonth, from: kyivMonthStart(fy, fm - 1), to: kyivMonthStart(ty, tm) };
}
export function summarizeSales(leads: Array<{items: unknown; total: number | null}>, batches: Parameters<typeof attachCosts>[2]) {
  const rows = leads.map((lead) => {
    const items = parseItems(lead.items) || [];
    // Invalid/deleted legacy references are unresolved, never zero-cost sales.
    try { return commissionFor(attachCosts(items, items, batches), lead.total); }
    catch { return commissionFor(items.map((item) => ({ ...item, purchasePrice: null })), lead.total); }
  });
  const sum = (key: "salesTotal" | "purchaseTotal" | "margin") => Math.round(rows.reduce((total, row) => total + (row[key] ?? 0), 0) * 100) / 100;
  return { saleCount: rows.length, salesTotal: sum("salesTotal"), purchaseTotal: sum("purchaseTotal"), margin: sum("margin"), calculatedCount: rows.filter((r) => r.margin != null).length, pendingCostCount: rows.filter((r) => r.margin == null).length };
}
