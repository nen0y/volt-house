import { prisma } from "./prisma";
import { replacementSuppliers } from "./supplier-reset-data";

const CONFIRM_FLAG = "--confirm-supplier-reset";

async function main() {
  if (!process.argv.includes(CONFIRM_FLAG)) {
    throw new Error(
      `Refusing to reset production data without ${CONFIRM_FLAG}. This command deletes all suppliers and supplier prices and sets every product price to 0.`,
    );
  }

  const before = await prisma.$transaction(async (tx) => ({
    suppliers: await tx.supplier.count(),
    supplierPrices: await tx.supplierPrice.count(),
    products: await tx.product.count(),
  }));

  await prisma.$transaction(async (tx) => {
    // SupplierPrice is also cascaded by Supplier deletion, but deleting it
    // explicitly makes the operation and its scope obvious in logs/reviews.
    await tx.supplierPrice.deleteMany();
    await tx.supplier.deleteMany();

    // Only commerce pricing is reset. Product identity, media, descriptions,
    // category links, brands, orders/leads and all other records are untouched.
    await tx.product.updateMany({ data: { price: 0, originalPrice: null } });

    for (const supplier of replacementSuppliers) {
      await tx.supplier.create({
        data: {
          name: supplier.name,
          contactName: supplier.contactName || null,
          phone: supplier.phone || null,
          email: supplier.email || null,
          website: supplier.website || null,
          resourceUrl: supplier.resourceUrl || null,
          supplierTypes: JSON.stringify(supplier.supplierTypes ?? []),
          rating: supplier.rating || null,
          brands: JSON.stringify(supplier.brands ?? []),
          currencies: JSON.stringify(supplier.currencies ?? []),
          countries: JSON.stringify(supplier.countries ?? []),
          locations: JSON.stringify(supplier.locations ?? []),
          equipmentCategories: JSON.stringify(supplier.equipmentCategories ?? []),
          lastContactAt: supplier.lastContactAt ? new Date(`${supplier.lastContactAt}T00:00:00.000Z`) : null,
          notes: supplier.notes ?? "",
          active: false,
        },
      });
    }
  });

  console.log(
    `[supplier-reset] Complete: removed ${before.suppliers} supplier(s) and ${before.supplierPrices} supplier price(s); ` +
      `set ${before.products} product price(s) to 0; created ${replacementSuppliers.length} inactive supplier(s).`,
  );
}

main()
  .catch((error) => {
    console.error("[supplier-reset] Failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
