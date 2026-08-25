import fs from "fs";
import { PrismaClient as LegacyClient } from "@legacy/client";
import { prisma } from "./prisma";
import { env } from "./env";

const SOURCES = [
  { marker: "migration.sqliteImported.v1", url: env.LEGACY_SQLITE_URL, label: "legacy volume" },
  { marker: "migration.catalogSqliteImported.v1", url: "file:/app/prisma/prisma/volthouse.db", label: "Git catalogue" },
];

function sqlitePath(url: string) {
  return url.startsWith("file:") ? url.slice(5) : "";
}

async function upsertRows(model: any, rows: any[], key: string) {
  for (const row of rows) {
    await model.upsert({ where: { [key]: row[key] }, create: row, update: row });
  }
}

async function importSource(source: (typeof SOURCES)[number]) {
  const marker = await prisma.setting.findUnique({ where: { key: source.marker } });
  if (marker) {
    console.log(`[migration] ${source.label} was already imported; skipping`);
    return;
  }

  const sourcePath = sqlitePath(source.url);
  if (!sourcePath || !fs.existsSync(sourcePath)) {
    console.log(`[migration] ${source.label} SQLite file not found; skipping`);
    return;
  }

  const legacy = new LegacyClient({ datasources: { db: { url: source.url } } });
  console.log(`[migration] Importing ${source.label} database ${sourcePath}`);

  try {
    const [
      categories,
      products,
      sections,
      testimonials,
      leads,
      admins,
      blocks,
      appliances,
      settings,
      suppliers,
      supplierPrices,
    ] = await Promise.all([
      legacy.category.findMany(),
      legacy.product.findMany(),
      legacy.homeSection.findMany(),
      legacy.testimonial.findMany(),
      legacy.lead.findMany(),
      legacy.adminUser.findMany(),
      legacy.contentBlock.findMany(),
      legacy.appliance.findMany(),
      legacy.setting.findMany(),
      legacy.supplier.findMany(),
      legacy.supplierPrice.findMany(),
    ]);

    await upsertRows(prisma.category, categories.map((row: any) => ({ ...row, parentKey: null })), "key");
    await upsertRows(prisma.product, products, "id");
    await upsertRows(prisma.homeSection, sections, "id");
    await upsertRows(prisma.testimonial, testimonials, "id");
    await upsertRows(prisma.lead, leads, "id");
    await upsertRows(prisma.adminUser, admins, "id");
    await upsertRows(prisma.contentBlock, blocks, "key");
    await upsertRows(prisma.appliance, appliances, "id");
    await upsertRows(prisma.setting, settings, "key");
    const supplierIds = new Map<string, string>();
    for (const row of suppliers) {
      const sameName = await prisma.supplier.findFirst({ where: { name: row.name } });
      const targetId = sameName?.id ?? row.id;
      await prisma.supplier.upsert({
        where: { id: targetId },
        create: { ...row, id: targetId },
        update: { ...row, id: targetId },
      });
      supplierIds.set(row.id, targetId);
    }
    for (const row of supplierPrices) {
      const supplierId = supplierIds.get(row.supplierId) ?? row.supplierId;
      const { id: _legacyId, ...data } = row;
      await prisma.supplierPrice.upsert({
        where: { supplierId_productId: { supplierId, productId: row.productId } },
        create: { ...data, id: row.id, supplierId },
        update: { ...data, supplierId },
      });
    }

    const counts = {
      categories: categories.length,
      products: products.length,
      sections: sections.length,
      testimonials: testimonials.length,
      leads: leads.length,
      admins: admins.length,
      blocks: blocks.length,
      appliances: appliances.length,
      settings: settings.length,
      suppliers: suppliers.length,
      supplierPrices: supplierPrices.length,
    };
    await prisma.setting.upsert({
      where: { key: source.marker },
      create: { key: source.marker, value: JSON.stringify(counts) },
      update: { value: JSON.stringify(counts) },
    });
    console.log(`[migration] ${source.label} SQLite import completed`, counts);
  } finally {
    await legacy.$disconnect();
  }
}

async function main() {
  for (const source of SOURCES) await importSource(source);
}

main()
  .catch((error) => {
    console.error("[migration] Failed", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
