import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { env } from "./env";
import {
  products,
  testimonials,
  appliances,
  contentBlocks,
  calculatorConfig,
  categories,
  homeSections,
} from "./data";

async function main() {
  console.log("[seed] Starting…");

  // ── Products ──────────────────────────────────────────────────────────────
  let order = 0;
  for (const p of products) {
    const data = {
      name: p.name,
      category: p.category,
      price: p.price,
      originalPrice: p.originalPrice ?? null,
      power: p.power ?? null,
      capacity: p.capacity ?? null,
      efficiency: p.efficiency ?? null,
      warranty: p.warranty,
      badge: p.badge ?? null,
      features: JSON.stringify(p.features),
      image: p.image,
      sortOrder: order++,
    };
    await prisma.product.upsert({
      where: { id: p.id },
      create: { id: p.id, ...data },
      update: data,
    });
  }
  console.log(`[seed] Products: ${products.length} upserted`);

  // ── Categories ────────────────────────────────────────────────────────────
  order = 0;
  for (const c of categories) {
    const so = order++;
    await prisma.category.upsert({
      where: { key: c.key },
      create: {
        key: c.key,
        label: c.label,
        labelSingular: c.labelSingular,
        description: c.description,
        icon: c.icon,
        sortOrder: so,
      },
      update: {}, // keep admin edits; only create if missing
    });
  }
  console.log(`[seed] Categories: ${categories.length} ensured`);

  // ── Testimonials ──────────────────────────────────────────────────────────
  order = 0;
  for (const t of testimonials) {
    const data = {
      name: t.name,
      location: t.location,
      rating: t.rating,
      text: t.text,
      avatar: t.avatar,
      product: t.product,
      sortOrder: order++,
    };
    await prisma.testimonial.upsert({
      where: { id: t.id },
      create: { id: t.id, ...data },
      update: data,
    });
  }
  console.log(`[seed] Testimonials: ${testimonials.length} upserted`);

  // ── Appliances (power calculator) ─────────────────────────────────────────
  order = 0;
  for (const a of appliances) {
    const data = { name: a.name, watts: a.watts, icon: a.icon, group: a.group, sortOrder: order++ };
    await prisma.appliance.upsert({ where: { id: a.id }, create: { id: a.id, ...data }, update: data });
  }
  console.log(`[seed] Appliances: ${appliances.length} upserted`);

  // ── Calculator recommendation rules (Setting) ─────────────────────────────
  // Migrate/normalise to the current config shape (auto-matching rules).
  const existing = await prisma.setting.findUnique({ where: { key: "calculator" } });
  let calcValue = JSON.stringify(calculatorConfig);
  if (existing) {
    try {
      const stored = JSON.parse(existing.value);
      // If it already has the new shape, keep admin edits; otherwise reset.
      if (stored && typeof stored.inverterCategory === "string") {
        calcValue = JSON.stringify({ ...calculatorConfig, ...stored });
      }
    } catch {
      /* fall back to default */
    }
  }
  await prisma.setting.upsert({
    where: { key: "calculator" },
    create: { key: "calculator", value: calcValue },
    update: { value: calcValue },
  });
  console.log("[seed] Calculator config ready");

  // ── Content blocks ────────────────────────────────────────────────────────
  for (const b of contentBlocks) {
    await prisma.contentBlock.upsert({
      where: { key: b.key },
      create: {
        key: b.key,
        heading: b.heading ?? null,
        subheading: b.subheading ?? null,
        body: b.body ?? null,
        productIds: JSON.stringify(b.productIds),
        sortOrder: b.sortOrder,
      },
      update: {}, // keep admin edits; only create if missing
    });
  }
  console.log(`[seed] Content blocks: ${contentBlocks.length} ensured`);

  // ── Home sections (only seed if none exist, to keep admin edits) ──────────
  const sectionCount = await prisma.homeSection.count();
  if (sectionCount === 0) {
    let so = 0;
    for (const s of homeSections) {
      await prisma.homeSection.create({
        data: {
          title: s.title,
          subtitle: s.subtitle,
          mode: s.mode,
          category: s.category,
          productIds: JSON.stringify(s.productIds),
          ctaLabel: s.ctaLabel,
          ctaHref: s.ctaHref,
          sortOrder: so++,
        },
      });
    }
    console.log(`[seed] Home sections: ${homeSections.length} created`);
  } else {
    console.log(`[seed] Home sections: kept (${sectionCount} existing)`);
  }

  // ── Admin user ────────────────────────────────────────────────────────────
  const email = env.ADMIN_EMAIL.toLowerCase();
  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 10);
  await prisma.adminUser.upsert({
    where: { email },
    create: { email, passwordHash },
    update: { passwordHash }, // keep password in sync with env on each seed
  });
  console.log(`[seed] Admin user ready: ${email}`);

  console.log("[seed] Done ✅");
}

main()
  .catch((e) => {
    console.error("[seed] Failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
