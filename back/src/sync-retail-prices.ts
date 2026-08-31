import { prisma } from "./prisma";
import { runRetailPriceSync } from "./retail-price-sync";

runRetailPriceSync("cli")
  .then((result) => console.log(JSON.stringify(result, null, 2)))
  .catch((error) => {
    console.error("[retail-price-sync] Failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
