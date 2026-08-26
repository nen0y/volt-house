/**
 * Supplier price update template.
 * Copy this file, rename to seed-<supplier>.ts, fill in SUPPLIER_NAME, NEW_PRODUCTS, PRICES.
 *
 * Usage (local dev):   npx tsx src/seed-<supplier>.ts
 * Usage (production):  node dist/seed-<supplier>.js
 */

import { prisma } from "./prisma";

// Exact name as stored in DB (check via: docker exec volthouse-back node -e "...")
const SUPPLIER_NAME = "НАЗВА ПОСТАЧАЛЬНИКА";

// Products that don't exist in the DB yet. Leave empty [] if all products already exist.
const NEW_PRODUCTS: Array<{
  id: string;
  name: string;
  category: string; // inverter | battery | solar | station
  price: number;
  warranty: string;
  features: string;
  image: string;
  enabled: boolean;
  sortOrder: number;
}> = [
  // {
  //   id: "brand-product-slug",
  //   name: "Product Full Name",
  //   category: "battery",
  //   price: 1000,
  //   warranty: "2 роки",
  //   features: JSON.stringify(["Feature 1", "Feature 2"]),
  //   image: "",
  //   enabled: true,
  //   sortOrder: 0,
  // },
];

// Prices from the supplier price list (МЦП ТІ / "Ціна без ПДВ", USD).
// availability: in_stock | preorder | unavailable
const PRICES: Array<{ productId: string; price: number; availability: "in_stock" | "preorder" | "unavailable" }> = [
  // { productId: "existing-product-id", price: 999, availability: "in_stock" },
];

async function main() {
  console.log("[seed] Starting…");

  const supplier = await prisma.supplier.findFirst({ where: { name: SUPPLIER_NAME } });
  if (!supplier) {
    console.error(`[seed] Supplier "${SUPPLIER_NAME}" not found. Aborting.`);
    process.exit(1);
  }
  console.log(`[seed] Found: ${supplier.name} (${supplier.id})`);

  if (!supplier.active) {
    await prisma.supplier.update({ where: { id: supplier.id }, data: { active: true } });
    console.log("[seed] Supplier activated.");
  }

  for (const p of NEW_PRODUCTS) {
    const exists = await prisma.product.findUnique({ where: { id: p.id } });
    if (exists) { console.log(`[seed] Exists, skip: ${p.id}`); continue; }
    await prisma.product.create({ data: p });
    await prisma.productCategoryLink.create({ data: { productId: p.id, categoryKey: p.category } });
    console.log(`[seed] Created: ${p.id}`);
  }

  let ok = 0, skipped = 0;
  for (const { productId, price, availability } of PRICES) {
    const exists = await prisma.product.findUnique({ where: { id: productId } });
    if (!exists) { console.warn(`[seed] Product not found, skip: ${productId}`); skipped++; continue; }
    await prisma.supplierPrice.upsert({
      where: { supplierId_productId: { supplierId: supplier.id, productId } },
      create: { supplierId: supplier.id, productId, price, currency: "USD", availability },
      update: { price, currency: "USD", availability },
    });
    console.log(`[seed]   ${productId} → $${price} (${availability})`);
    ok++;
  }

  console.log(`\n[seed] Done. Prices upserted: ${ok}, skipped: ${skipped}.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
