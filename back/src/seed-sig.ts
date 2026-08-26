/**
 * СІГ (Солар Інвест Груп) supplier update — 2026-08-26
 * Source: SIG.xls — only Deye products. Price column: МЦП ТІ (USD without VAT).
 *
 * Usage (local dev):   npx tsx src/seed-sig.ts
 * Usage (production):  node dist/seed-sig.js
 */

import { prisma } from "./prisma";

const SUPPLIER_NAME = "СІГ (Солар Інвест Груп)";

// Products that don't yet exist in the DB.
const NEW_PRODUCTS = [
  {
    id: "deye-sun-12k-sg01hp3-eu",
    name: "Deye SUN-12K HP3 (високовольт.)",
    category: "inverter",
    price: 1195,
    warranty: "2 роки",
    features: JSON.stringify(["12 кВт", "Трифазний", "Високовольтний"]),
    image: "",
    enabled: true,
    sortOrder: 0,
  },
];

// (productId, price USD, availability) — derived from SIG.xls, МЦП ТІ column.
// Availability: вільний залишок > 0 → in_stock; замовлено > 0 → preorder; else → unavailable.
const PRICES: Array<{ productId: string; price: number; availability: "in_stock" | "preorder" | "unavailable" }> = [
  // ── Deye акумулятори ─────────────────────────────────────────────────────────
  { productId: "deye-deye-bos-b-pro-a3",                     price: 1665, availability: "in_stock"  }, // BOS-B-Pack16-A3-Pro
  { productId: "deye-bms-kontroler-bos-b-pdu-2-a-deye-sht",  price: 1575, availability: "in_stock"  }, // BOS-B-PDU-2-A-Pro+Accessories
  { productId: "deye-deye-bos-g-5-1",                        price: 750,  availability: "in_stock"  }, // BOS-GM5.1-D / BOS-G Pack5.1
  { productId: "deye-bms-kontroler-bos-g-pro-pdu-2-deye-sh", price: 690,  availability: "in_stock"  }, // BOS-G-CONTROL BOX PDU-2
  { productId: "deye-deye-bos-g-pdu2",                       price: 690,  availability: "preorder"  }, // BOS-G-PDU-2
  { productId: "deye-deye-se-f16",                           price: 1770, availability: "preorder"  }, // SE-F16-C — залишок зарезервовано
  { productId: "deye-deye-se-f5-pro-c",                      price: 710,  availability: "preorder"  }, // SE-F5 Pro-C — залишок зарезервовано
  { productId: "deye-deye-se-g5-1-pro-b",                    price: 710,  availability: "preorder"  }, // SE-G5.1 Pro-B — залишок зарезервовано
  // ── Deye інше обладнання ─────────────────────────────────────────────────────
  { productId: "deye-modul-mppt-sun-mppt-l01-eu-am8-deye",   price: 1615, availability: "in_stock"  }, // SUN-MPPT-L01-EU-AM8
  { productId: "deye-sti-ka-dlya-13-batare-deye-bos-g",      price: 350,  availability: "preorder"  }, // 3U-HRACK 13pcs
  // ── Deye гібридні інвертори (високовольтні) ──────────────────────────────────
  { productId: "deye-deye-sun-100k-hp3-v-sokovol-t",         price: 3355, availability: "in_stock"  }, // SUN-100K-PCSL01HP3
  { productId: "deye-deye-sun-125k-hp3-v-sokovol-t",         price: 7100, availability: "in_stock"  }, // SUN-125K-SG02HP3-EU-GM10
  { productId: "deye-sun-12k-sg01hp3-eu",                    price: 1195, availability: "in_stock"  }, // SUN-12K-SG01HP3-EU (NEW)
  { productId: "deye-deye-sun-15k-hp3-v-sokovol-t",          price: 1600, availability: "in_stock"  }, // SUN-15K-SG01HP3-EU-AM2
  { productId: "deye-deye-sun-20k-hp3-v-sokovol-t",          price: 1650, availability: "in_stock"  }, // SUN-20K-SG01HP3-EU-AM2
  { productId: "deye-deye-sun-30k-hp3-v-sokovol-t",          price: 2700, availability: "in_stock"  }, // SUN-30K-SG02HP3-EU
  { productId: "deye-deye-sun-50k-hp3-v-sokovol-t",          price: 4000, availability: "in_stock"  }, // SUN-50K-SG01HP3-EU-BM4
  { productId: "deye-deye-sun-80k-hp3-v-sokovol-t",          price: 5700, availability: "in_stock"  }, // SUN-80K-SG02HP3-EU-EM6
  // ── Deye гібридні інвертори (низьковольтні) ──────────────────────────────────
  { productId: "deye-deye-sun-10k-sg-lp1-1-faza",            price: 1650, availability: "in_stock"  }, // SUN-10K-SG02LP1-EU-AM3 (1ф)
  { productId: "deye-deye-sun-10k-sg05lp3-3-faz",            price: 1600, availability: "unavailable"}, // SUN-10K-SG05LP3-EU
  { productId: "deye-deye-sun-12k-sg-lp1-1-faza",            price: 1500, availability: "preorder"  }, // SUN-12K-SG02LP1-EU
  { productId: "deye-deye-sun-12k-sg05lp3-3-faz",            price: 1710, availability: "preorder"  }, // SUN-12K-SG05LP3-EU
  { productId: "deye-deye-sun-15k-sg05lp3-3-faz",            price: 1820, availability: "preorder"  }, // SUN-15K-SG05LP3-EU
  { productId: "deye-deye-sun-20k-sg05lp3-3-faz",            price: 2390, availability: "preorder"  }, // SUN-20K-SG05LP3-EU
  { productId: "deye-deye-sun-6k-sg-lp1-1-faza",             price: 740,  availability: "preorder"  }, // SUN-6K-SG05LP1-EU
  { productId: "deye-deye-sun-8k-sg-lp1-1-faza",             price: 1080, availability: "preorder"  }, // SUN-8K-SG05LP1-EU-AM2-P
  // ── Deye мережеві інвертори ───────────────────────────────────────────────────
  { productId: "deye-deye-sun-100-kw-merezhev",              price: 2450, availability: "in_stock"  }, // Sun-100KW-G03-String
  { productId: "deye-deye-sun-50-kw-merezhev",               price: 1650, availability: "in_stock"  }, // SUN-50KW-G04-P3-String
  { productId: "deye-deye-sun-6-kw-merezhev",                price: 505,  availability: "in_stock"  }, // SUN-6K-G06P3-EU-AM2-P1
];

async function main() {
  console.log("[seed-sig] Starting…");

  // ── 1. Find supplier ─────────────────────────────────────────────────────────
  const supplier = await prisma.supplier.findFirst({ where: { name: SUPPLIER_NAME } });
  if (!supplier) {
    console.error(`[seed-sig] Supplier "${SUPPLIER_NAME}" not found. Aborting.`);
    process.exit(1);
  }
  console.log(`[seed-sig] Found supplier: ${supplier.name} (${supplier.id})`);

  // ── 2. Activate supplier ─────────────────────────────────────────────────────
  if (!supplier.active) {
    await prisma.supplier.update({ where: { id: supplier.id }, data: { active: true } });
    console.log("[seed-sig] Supplier activated.");
  } else {
    console.log("[seed-sig] Supplier already active.");
  }

  // ── 3. Create missing products ───────────────────────────────────────────────
  for (const p of NEW_PRODUCTS) {
    const exists = await prisma.product.findUnique({ where: { id: p.id } });
    if (exists) {
      console.log(`[seed-sig] Product already exists, skipping: ${p.id}`);
      continue;
    }
    await prisma.product.create({ data: p });
    await prisma.productCategoryLink.create({ data: { productId: p.id, categoryKey: p.category } });
    console.log(`[seed-sig] Created product: ${p.id}`);
  }

  // ── 4. Upsert prices ─────────────────────────────────────────────────────────
  let ok = 0;
  let skipped = 0;
  for (const { productId, price, availability } of PRICES) {
    const productExists = await prisma.product.findUnique({ where: { id: productId } });
    if (!productExists) {
      console.warn(`[seed-sig] Product not found, skipping: ${productId}`);
      skipped++;
      continue;
    }
    await prisma.supplierPrice.upsert({
      where: { supplierId_productId: { supplierId: supplier.id, productId } },
      create: { supplierId: supplier.id, productId, price, currency: "USD", availability },
      update: { price, currency: "USD", availability },
    });
    console.log(`[seed-sig]   ${productId} → $${price} (${availability})`);
    ok++;
  }

  console.log(`\n[seed-sig] Done. Prices upserted: ${ok}, skipped: ${skipped}.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
