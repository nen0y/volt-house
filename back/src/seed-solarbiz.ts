/**
 * SOLAR BIZ supplier update — 2026-08-27
 * Source: прайс SOLAR BIZ (зображення). Ціни в USD (формат "1 132,000" = $1132).
 *
 * Usage (local dev):   npx tsx src/seed-solarbiz.ts
 * Usage (production):  node dist/seed-solarbiz.js
 */

import { prisma } from "./prisma";

const SUPPLIER_NAME = "SOLAR BIZ";

// Нові товари яких немає в БД (Deye brand).
const NEW_PRODUCTS = [
  {
    id: "deye-wd-12100",
    name: "Deye WD-12100 LiFePO4 12.8V/100Ah",
    category: "battery",
    price: 0,
    capacity: "1.28 кВт·год",
    warranty: "",
    features: JSON.stringify(["12.8V", "100Ah", "LiFePO4", "1.28 кВт·год"]),
    image: "",
    enabled: true,
    sortOrder: 0,
    brandSlug: "deye",
  },
  {
    id: "deye-se-f12-c",
    name: "Deye SE-F12-C LiFePO4 51.2V/230Ah",
    category: "battery",
    price: 0,
    capacity: "11.78 кВт·год",
    warranty: "",
    features: JSON.stringify(["51.2V", "230Ah", "LiFePO4", "≈12 кВт·год"]),
    image: "",
    enabled: true,
    sortOrder: 0,
    brandSlug: "deye",
  },
  {
    id: "deye-rw-m5-3-pro",
    name: "Deye RW-M5.3 pro LiFePO4 51.2V/104Ah",
    category: "battery",
    price: 0,
    capacity: "5.3 кВт·год",
    warranty: "",
    features: JSON.stringify(["51.2V", "104Ah", "LiFePO4", "5.3 кВт·год"]),
    image: "",
    enabled: true,
    sortOrder: 0,
    brandSlug: "deye",
  },
  {
    id: "deye-rw-f16",
    name: "Deye RW-F16 LiFePO4 51.2V/314Ah",
    category: "battery",
    price: 0,
    capacity: "16 кВт·год",
    warranty: "",
    features: JSON.stringify(["51.2V", "314Ah", "LiFePO4", "16 кВт·год"]),
    image: "",
    enabled: true,
    sortOrder: 0,
    brandSlug: "deye",
  },
];

// (productId, price USD, availability)
// Формат прайсу: "1 132,000" = $1132 (кома — десяткова крапка, три нулі = .000).
// Availability: вільний залишок > 0 → in_stock; очікуємо/замовлено > 0 → preorder; інакше → unavailable.
const PRICES: Array<{ productId: string; price: number; availability: "in_stock" | "preorder" | "unavailable" }> = [
  // ── Гібридні інвертори однофазні (LP1) ───────────────────────────────────────
  { productId: "deye-deye-sun-5k-sg-lp1-1-faza",   price:  902, availability: "unavailable" }, // SUN-5K-SG03LP1-EU (901,600)
  { productId: "deye-deye-sun-6k-sg-lp1-1-faza",   price:  857, availability: "in_stock"   }, // SUN-6K-SG05LP1-EU-P (2 на складі)
  { productId: "deye-deye-sun-8k-sg-lp1-1-faza",   price: 1132, availability: "in_stock"   }, // SUN-8K-SG05LP1-EU-AM2-P (1 на складі)
  { productId: "deye-deye-sun-10k-sg-lp1-1-faza",  price: 1535, availability: "preorder"   }, // SUN-10K-SG02LP1-EU-AM3 (очікуємо 28.08)
  { productId: "deye-deye-sun-12k-sg-lp1-1-faza",  price: 1731, availability: "preorder"   }, // SUN-12K-SG02LP1-EU-AM3 (очікуємо 04.09)
  { productId: "deye-deye-sun-16k-sg-lp1-1-faza",  price: 2015, availability: "in_stock"   }, // SUN-16K-SG01LP1-EU (5 на складі)
  // ── Гібридні інвертори трифазні (LP3) ────────────────────────────────────────
  { productId: "deye-deye-sun-10k-sg05lp3-3-faz",  price: 1642, availability: "preorder"   }, // SUN-10K-SG05LP3-EU-SM2 (очікуємо 04.09)
  { productId: "deye-deye-sun-12k-sg05lp3-3-faz",  price: 1700, availability: "in_stock"   }, // SUN-12K-SG05LP3-EU-SM2 (більше 30)
  { productId: "deye-deye-sun-15k-sg05lp3-3-faz",  price: 1926, availability: "in_stock"   }, // SUN-15K-SG05LP3-EU-SM2 (більше 30)
  { productId: "deye-deye-sun-20k-sg05lp3-3-faz",  price: 2550, availability: "in_stock"   }, // SUN-20K-SG05LP3-EU-SM2 (6 на складі)
  // ── Гібридні інвертори високовольтні (HP3) ───────────────────────────────────
  { productId: "deye-deye-sun-15k-hp3-v-sokovol-t", price: 1456, availability: "in_stock"  }, // SUN-15K-SG01HP3-EU-AM2 (11 на складі)
  // ── Акумулятори LiFePO4 ───────────────────────────────────────────────────────
  { productId: "deye-akumulyator-deye-lfp-100a-51-2v-se-g5-1", price:  927, availability: "unavailable" }, // SE-G5.1 pro
  { productId: "deye-deye-se-g5-1-pro-b",                      price:  910, availability: "unavailable" }, // SE-G5.1 pro B
  { productId: "deye-wd-12100",                                 price:  226, availability: "unavailable" }, // WD-12100 (NEW)
  { productId: "deye-deye-se-f5-pro-c",                        price:  857, availability: "in_stock"   }, // SE-F5 Pro-C (6 на складі)
  { productId: "deye-deye-se-f12",                             price: 1331, availability: "unavailable" }, // SE-F12
  { productId: "deye-se-f12-c",                                price: 1472, availability: "unavailable" }, // SE-F12-C (NEW)
  { productId: "deye-deye-se-f16",                             price: 1957, availability: "in_stock"   }, // SE-F16-C (більше 30)
  { productId: "deye-rw-m5-3-pro",                             price:  933, availability: "unavailable" }, // RW-M5.3 pro (NEW)
  { productId: "deye-deye-se-g5-3",                            price:  906, availability: "unavailable" }, // SE-G5.3
  { productId: "deye-deye-rw-m6-1-b",                         price: 1421, availability: "unavailable" }, // RW-M6.1-B
  { productId: "deye-rw-f16",                                  price: 1701, availability: "unavailable" }, // RW-F16 314Ah (NEW)
  { productId: "deye-akumulyator-deye-lfp-102-4v-40a-gb-lm4-0", price: 1126, availability: "unavailable" }, // GB-LM4.0/AX-LFP-40/102.4-HV
];

async function main() {
  console.log("[seed-solarbiz] Starting…");

  // ── 1. Find supplier ─────────────────────────────────────────────────────────
  const supplier = await prisma.supplier.findFirst({ where: { name: SUPPLIER_NAME } });
  if (!supplier) {
    console.error(`[seed-solarbiz] Supplier "${SUPPLIER_NAME}" not found. Aborting.`);
    process.exit(1);
  }
  console.log(`[seed-solarbiz] Found supplier: ${supplier.name} (${supplier.id})`);

  // ── 2. Activate supplier ─────────────────────────────────────────────────────
  if (!supplier.active) {
    await prisma.supplier.update({ where: { id: supplier.id }, data: { active: true } });
    console.log("[seed-solarbiz] Supplier activated.");
  } else {
    console.log("[seed-solarbiz] Supplier already active.");
  }

  // ── 3. Create missing products ───────────────────────────────────────────────
  for (const p of NEW_PRODUCTS) {
    const exists = await prisma.product.findUnique({ where: { id: p.id } });
    if (exists) {
      console.log(`[seed-solarbiz] Product already exists, skipping: ${p.id}`);
      continue;
    }
    await prisma.product.create({ data: p });
    await prisma.productCategoryLink.create({ data: { productId: p.id, categoryKey: p.category } });
    console.log(`[seed-solarbiz] Created product: ${p.id}`);
  }

  // ── 4. Upsert prices ─────────────────────────────────────────────────────────
  let ok = 0;
  let skipped = 0;
  for (const { productId, price, availability } of PRICES) {
    const productExists = await prisma.product.findUnique({ where: { id: productId } });
    if (!productExists) {
      console.warn(`[seed-solarbiz] Product not found, skipping: ${productId}`);
      skipped++;
      continue;
    }
    await prisma.supplierPrice.upsert({
      where: { supplierId_productId: { supplierId: supplier.id, productId } },
      create: { supplierId: supplier.id, productId, price, currency: "USD", availability },
      update: { price, currency: "USD", availability },
    });
    console.log(`[seed-solarbiz]   ${productId} → $${price} (${availability})`);
    ok++;
  }

  console.log(`\n[seed-solarbiz] Done. Prices upserted: ${ok}, skipped: ${skipped}.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
