import { prisma } from "./prisma";

const KYIV_TIME_ZONE = "Europe/Kyiv";
const MARGIN_MULTIPLIER = 1.2;
const AUTOMATIC_RUN_HOUR = 3;
const AUTOMATIC_RUN_SETTING = "retail_price_sync_last_automatic_date";

export type RetailPriceSyncTrigger = "automatic" | "manual" | "cli";

function kyivDateParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("uk-UA", {
    timeZone: KYIV_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  const year = value("year");
  const month = value("month");
  const day = value("day");
  return {
    year,
    month,
    day,
    hour: value("hour"),
    dateKey: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    startOfDayUtc: new Date(Date.UTC(year, month - 1, day)),
  };
}

let activeSync: Promise<Awaited<ReturnType<typeof performRetailPriceSync>>> | null = null;

async function performRetailPriceSync(trigger: RetailPriceSyncTrigger) {
  const startedAt = new Date();
  const { startOfDayUtc } = kyivDateParts(startedAt);
  const [prices, enabledProducts] = await Promise.all([
    prisma.supplierPrice.findMany({
      where: {
        price: { gt: 0 },
        availability: "in_stock",
        OR: [{ arrivalDate: null }, { arrivalDate: { lte: startOfDayUtc } }],
        supplier: { active: true },
        product: { enabled: true },
      },
      select: { productId: true, price: true },
    }),
    prisma.product.count({ where: { enabled: true } }),
  ]);

  const minimumByProduct = new Map<string, number>();
  for (const row of prices) {
    const current = minimumByProduct.get(row.productId);
    if (current === undefined || row.price < current) minimumByProduct.set(row.productId, row.price);
  }

  const updates = [...minimumByProduct].map(([productId, minimumPrice]) =>
    prisma.product.update({
      where: { id: productId },
      data: { price: Math.ceil(minimumPrice * MARGIN_MULTIPLIER) },
    }),
  );
  if (updates.length) await prisma.$transaction(updates);

  const result = {
    trigger,
    marginPercent: 20,
    updatedProducts: updates.length,
    skippedProducts: enabledProducts - updates.length,
    eligibleSupplierPrices: prices.length,
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
  };
  console.log(`[retail-price-sync] ${trigger}: updated ${result.updatedProducts}, skipped ${result.skippedProducts}`);
  return result;
}

export function runRetailPriceSync(trigger: RetailPriceSyncTrigger = "manual") {
  if (!activeSync) activeSync = performRetailPriceSync(trigger).finally(() => { activeSync = null; });
  return activeSync;
}

export function startNightlyRetailPriceSync() {
  const check = async () => {
    const { hour, dateKey } = kyivDateParts();
    if (hour !== AUTOMATIC_RUN_HOUR) return;
    const previous = await prisma.setting.findUnique({ where: { key: AUTOMATIC_RUN_SETTING } });
    if (previous?.value === dateKey) return;
    await runRetailPriceSync("automatic");
    await prisma.setting.upsert({
      where: { key: AUTOMATIC_RUN_SETTING },
      create: { key: AUTOMATIC_RUN_SETTING, value: dateKey },
      update: { value: dateKey },
    });
  };

  void check().catch((error) => console.error("[retail-price-sync] Automatic run failed:", error));
  const timer = setInterval(() => {
    void check().catch((error) => console.error("[retail-price-sync] Automatic run failed:", error));
  }, 60_000);
  timer.unref();
  return timer;
}
