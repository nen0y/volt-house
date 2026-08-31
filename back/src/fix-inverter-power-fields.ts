/**
 * One-time repair for inverter products whose power was accidentally entered
 * into the capacity field.
 *
 * Preview: npx tsx src/fix-inverter-power-fields.ts
 * Apply:   npx tsx src/fix-inverter-power-fields.ts --apply
 */
import { prisma } from "./prisma";

const shouldApply = process.argv.includes("--apply");

function looksLikePower(value: string) {
  const normalized = value.trim().toLowerCase();
  const looksLikeEnergy = /(kwh|wh|квт\s*[·./-]?\s*год|вт\s*[·./-]?\s*год|квтг|втг)/iu.test(normalized);
  const hasPowerUnit = /(kw|\bw\b|kva|\bva\b|квт|\bвт\b|ква|\bва\b)/iu.test(normalized);
  return hasPowerUnit && !looksLikeEnergy;
}

async function main() {
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { category: { startsWith: "inverter" } },
        { categoryLinks: { some: { categoryKey: { startsWith: "inverter" } } } },
      ],
    },
    select: { id: true, name: true, power: true, capacity: true },
    orderBy: { name: "asc" },
  });

  const candidates = products.filter((product) =>
    !product.power?.trim() && product.capacity?.trim() && looksLikePower(product.capacity)
  );
  const ambiguous = products.filter((product) => product.power?.trim() && product.capacity?.trim());

  console.log(`[inverter-power-fix] Mode: ${shouldApply ? "APPLY" : "PREVIEW"}`);
  console.log(`[inverter-power-fix] Will move capacity → power for ${candidates.length} product(s):`);
  for (const product of candidates) {
    console.log(`  ${product.id} | ${product.name} | "${product.capacity}"`);
  }

  if (ambiguous.length) {
    console.log(`\n[inverter-power-fix] Skipped ${ambiguous.length} product(s) with both fields filled; review manually:`);
    for (const product of ambiguous) {
      console.log(`  ${product.id} | power="${product.power}" | capacity="${product.capacity}"`);
    }
  }

  if (!shouldApply) {
    console.log("\n[inverter-power-fix] No data changed. Run again with --apply after reviewing this list.");
    return;
  }

  if (candidates.length) {
    await prisma.$transaction(
      candidates.map((product) => prisma.product.update({
        where: { id: product.id },
        data: { power: product.capacity!.trim(), capacity: null },
      })),
    );
  }
  console.log(`\n[inverter-power-fix] Complete. Updated ${candidates.length} product(s).`);
}

main()
  .catch((error) => {
    console.error("[inverter-power-fix] Failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
