/**
 * Solar Flow supplier update — 2026-08-26
 * Adds missing products and upserts supplier prices from the latest price list.
 *
 * Usage (local dev):   npx tsx src/seed-solarflow.ts
 * Usage (production):  node dist/seed-solarflow.js
 */

import { prisma } from "./prisma";

// ── Availability mapping ──────────────────────────────────────────────────────
// В наявності   → in_stock
// Очікуємо / Передзамовлення / В резерві → preorder

const SUPPLIER_NAME = "SOLAR FLOW";

// Products to create if they don't exist yet.
// brandSlug omitted — Felicity brand can be linked manually in admin.
const NEW_PRODUCTS = [
  {
    id: "felicity-fla48314-eu",
    name: "Felicity FLA48314-EU 16kWh 51.2V",
    category: "battery",
    price: 1640,
    warranty: "2 роки",
    features: JSON.stringify(["16 кВт·год", "51.2V", "LiFePO4"]),
    image: "",
    enabled: true,
    sortOrder: 0,
  },
  {
    id: "felicity-flb48314tg1-h",
    name: "Felicity FLB48314TG1-H 16kWh 51.2V (підігрів)",
    category: "battery",
    price: 1750,
    warranty: "2 роки",
    features: JSON.stringify(["16 кВт·год", "51.2V", "LiFePO4", "Підігрів"]),
    image: "",
    enabled: true,
    sortOrder: 0,
  },
];

// Prices to upsert — (productId, price USD, availability)
// Products without a price in the supplier list are omitted.
const PRICES: Array<{ productId: string; price: number; availability: "in_stock" | "preorder" | "unavailable" }> = [
  // ── DEYE Batteries ──────────────────────────────────────────────────────────
  { productId: "deye-deye-se-g5-1-pro-b",                    price: 750,   availability: "preorder"  }, // SE-G 5.1PRO B — Очікуємо
  { productId: "deye-deye-se-f5-pro-c",                      price: 750,   availability: "preorder"  }, // SE-F5 Pro-C — Очікуємо 26.08
  { productId: "deye-deye-rw-m6-1-b",                        price: 850,   availability: "in_stock"  }, // RW-M6.1-B — В наявності
  { productId: "deye-deye-se-f12",                           price: 1440,  availability: "preorder"  }, // SE-F12C — Передзамовлення 30.08
  { productId: "deye-deye-se-f16",                           price: 1780,  availability: "preorder"  }, // SE-F16C — Очікуємо 21.09
  { productId: "deye-s-stema-nakop-chennya-deye-bess-bos-b-240", price: 26450, availability: "in_stock" }, // BOS-B-Pro-Pack16 — В наявності
  { productId: "deye-deye-bos-g-5-1",                        price: 750,   availability: "in_stock"  }, // BOS-G Pro 5.12kWh — В наявності
  { productId: "deye-deye-bos-g-pdu2",                       price: 730,   availability: "in_stock"  }, // BOS-G Pro PDU — В наявності
  { productId: "deye-sti-ka-dlya-8-1-batare-deye-bos-g",     price: 320,   availability: "preorder"  }, // RACK 9 floors (8+1) — Очікуємо
  { productId: "deye-sti-ka-dlya-13-batare-deye-bos-g",      price: 380,   availability: "in_stock"  }, // 3U-HRACK (12+1) — В наявності
  // ── Felicity Batteries ──────────────────────────────────────────────────────
  { productId: "felicity-fla48314-eu",                       price: 1640,  availability: "preorder"  }, // FLA48314-EU — Очікуємо 26.08
  { productId: "felicity-flb48314tg1-h",                     price: 1750,  availability: "preorder"  }, // FLB48314TG1-H — Очікуємо 26.08
  // ── DEYE Inverters — low voltage ────────────────────────────────────────────
  { productId: "deye-deye-sun-5k-sg-lp1-1-faza",             price: 740,   availability: "preorder"  }, // SUN-5K-SG05LP1-EU-AM2-PLUS — Очікуємо 27.08
  { productId: "deye-deye-sun-6k-sg-lp1-1-faza",             price: 770,   availability: "preorder"  }, // SUN-6K-SG05LP1-EU — В резерві
  { productId: "deye-deye-sun-8k-sg-lp1-1-faza",             price: 1030,  availability: "preorder"  }, // SUN-8K-SG05LP1-EUAM2-P — В резерві
  { productId: "deye-deye-sun-10k-sg-lp1-1-faza",            price: 1360,  availability: "preorder"  }, // SUN-10K-SG02LP1-EU — В резерві
  { productId: "deye-deye-sun-12k-sg-lp1-1-faza",            price: 1550,  availability: "preorder"  }, // SUN-12K-SG02LP1-EU — Очікуємо 31.08
  { productId: "deye-deye-sun-12k-sg05lp3-3-faz",            price: 1550,  availability: "preorder"  }, // SUN-12K-SG05LP3-EU — Очікуємо 12.09
  { productId: "deye-deye-sun-15k-sg05lp3-3-faz",            price: 1800,  availability: "in_stock"  }, // SUN-15K-SG05LP3-EU-SM2 — В наявності
  { productId: "deye-k-ta-deye-sun-20-sg05lp3-eu-sm2-nov-nk", price: 2380, availability: "in_stock"  }, // SUN-20K-SG05LP3-EU-SM2 — В наявності
  // ── DEYE Inverters — high voltage ───────────────────────────────────────────
  { productId: "deye-deye-sun-20k-hp3-v-sokovol-t",          price: 1700,  availability: "preorder"  }, // SUN-20K-SG01HP3-EU-BM4 — Очікуємо
  { productId: "deye-deye-sun-30k-hp3-v-sokovol-t",          price: 2450,  availability: "preorder"  }, // SUN-30K-SG02HP3-EU-AM3 — Очікуємо
  { productId: "deye-deye-sun-50k-hp3-v-sokovol-t",          price: 4000,  availability: "in_stock"  }, // SUN-50K-SG01HP3-EU-BM4 — В наявності
  { productId: "deye-deye-sun-80k-hp3-v-sokovol-t",          price: 5550,  availability: "in_stock"  }, // SUN-80K-SG02HP3-EU-EM6 — В наявності
  { productId: "deye-deye-sun-125k-hp3-v-sokovol-t",         price: 6999,  availability: "preorder"  }, // SUN-125K-SG02HP3-EU-GM10 — Очікуємо 17.09
];

async function main() {
  console.log("[seed-solarflow] Starting…");

  // ── 1. Find supplier ─────────────────────────────────────────────────────────
  const supplier = await prisma.supplier.findFirst({ where: { name: SUPPLIER_NAME } });
  if (!supplier) {
    console.error(`[seed-solarflow] Supplier "${SUPPLIER_NAME}" not found. Aborting.`);
    process.exit(1);
  }
  console.log(`[seed-solarflow] Found supplier: ${supplier.name} (${supplier.id})`);

  // ── 2. Activate supplier ─────────────────────────────────────────────────────
  if (!supplier.active) {
    await prisma.supplier.update({ where: { id: supplier.id }, data: { active: true } });
    console.log("[seed-solarflow] Supplier activated.");
  } else {
    console.log("[seed-solarflow] Supplier already active.");
  }

  // ── 3. Create missing products ───────────────────────────────────────────────
  for (const p of NEW_PRODUCTS) {
    const exists = await prisma.product.findUnique({ where: { id: p.id } });
    if (exists) {
      console.log(`[seed-solarflow] Product already exists, skipping: ${p.id}`);
      continue;
    }
    await prisma.product.create({ data: p });
    await prisma.productCategoryLink.create({ data: { productId: p.id, categoryKey: p.category } });
    console.log(`[seed-solarflow] Created product: ${p.id}`);
  }

  // ── 4. Upsert prices ─────────────────────────────────────────────────────────
  let ok = 0;
  let skipped = 0;
  for (const { productId, price, availability } of PRICES) {
    const productExists = await prisma.product.findUnique({ where: { id: productId } });
    if (!productExists) {
      console.warn(`[seed-solarflow] Product not found, skipping price: ${productId}`);
      skipped++;
      continue;
    }
    await prisma.supplierPrice.upsert({
      where: { supplierId_productId: { supplierId: supplier.id, productId } },
      create: { supplierId: supplier.id, productId, price, currency: "USD", availability },
      update: { price, currency: "USD", availability },
    });
    console.log(`[seed-solarflow]   ${productId} → $${price} (${availability})`);
    ok++;
  }

  console.log(`\n[seed-solarflow] Done. Prices upserted: ${ok}, skipped: ${skipped}.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
