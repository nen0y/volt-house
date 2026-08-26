import fs from "fs";
import path from "path";
import { prisma } from "./prisma";
import { uploadDir, ensureUploadDir } from "./upload";
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
      update: {}, // preserve storefront edits and migrated production data
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
        parentKey: c.parentKey ?? null,
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
      update: {}, // preserve migrated/admin-edited reviews
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
      update: { productIds: JSON.stringify(b.productIds) }, // sync product list on every deploy
    });
  }
  console.log(`[seed] Content blocks: ${contentBlocks.length} ensured`);

  // ── Home sections — upsert by title so product lists stay current ─────────
  let so = 0;
  for (const s of homeSections) {
    const existing = await prisma.homeSection.findFirst({ where: { title: s.title } });
    const data = {
      title: s.title,
      subtitle: s.subtitle,
      mode: s.mode,
      category: s.category,
      productIds: JSON.stringify(s.productIds),
      ctaLabel: s.ctaLabel,
      ctaHref: s.ctaHref,
      sortOrder: so++,
    };
    if (existing) {
      await prisma.homeSection.update({ where: { id: existing.id }, data });
    } else {
      await prisma.homeSection.create({ data });
    }
  }
  console.log(`[seed] Home sections: ${homeSections.length} upserted`);

  // ── Suppliers ─────────────────────────────────────────────────────────────
  const supplierNames = [
    "SolarFlow",
    "EnergyEvolution",
    "PriceListNew",
    "SunEnergy",
    "Сучасна Енергія",
    "Pulsar",
    "KeyVolt",
    "RiseUp",
  ];
  for (const name of supplierNames) {
    const existing = await prisma.supplier.findFirst({ where: { name } });
    if (!existing) {
      await prisma.supplier.create({ data: { name } });
    }
  }
  console.log(`[seed] Suppliers: ${supplierNames.length} ensured`);

  await prisma.brand.upsert({
    where: { slug: "deye" },
    create: {
      slug: "deye",
      name: "Deye",
      country: "Китай",
      description: "Інвертори, акумулятори та системи накопичення енергії Deye.",
    },
    update: {},
  });
  console.log("[seed] Brand Deye ensured");

  // ── Deye products ─────────────────────────────────────────────────────────
  // Auto-generated from base.xlsx. Retail price = min supplier price + 20% markup.
  const deyeProducts: Array<{
    id: string;
    name: string;
    category: string;
    price: number;
    power: string | null;
    model: string;
    prices: Record<string, number>;
  }> = [
    { id: "deye-deye-sun-8k-sg-lp1-1-faza", name: "Deye SUN-8K SG..LP1 (1 фаза)", category: "inverter", price: 1030, power: "8 кВт", model: "SUN-8K-SG05LP1-EUAM2-P", prices: { SolarFlow: 1030, PriceListNew: 1091, EnergyEvolution: 1080, SunEnergy: 1090, KeyVolt: 1095, Pulsar: 1450, "Сучасна Енергія": 1090 } },
    { id: "deye-deye-sun-12k-sg05lp3-3-faz", name: "Deye SUN-12K SG05LP3 (3 фази)", category: "inverter", price: 988, power: "12 кВт", model: "SUN-12K-SG05LP3-EU", prices: { SolarFlow: 1600, PriceListNew: 1700, EnergyEvolution: 988, SunEnergy: 1620, KeyVolt: 1750, "Сучасна Енергія": 1700 } },
    { id: "deye-deye-sun-6k-sg-lp1-1-faza", name: "Deye SUN-6K SG..LP1 (1 фаза)", category: "inverter", price: 742, power: "6 кВт", model: "SUN-6K-SG05LP1-EU", prices: { SolarFlow: 750, PriceListNew: 742, EnergyEvolution: 800, SunEnergy: 750, KeyVolt: 780, "Сучасна Енергія": 760 } },
    { id: "deye-deye-sun-10k-sg-lp1-1-faza", name: "Deye SUN-10K SG..LP1 (1 фаза)", category: "inverter", price: 1360, power: "10 кВт", model: "SUN-10K-SG02LP1-EU", prices: { SolarFlow: 1360, PriceListNew: 1449, EnergyEvolution: 1460, SunEnergy: 1500, "Сучасна Енергія": 1500 } },
    { id: "deye-deye-sun-12k-sg-lp1-1-faza", name: "Deye SUN-12K SG..LP1 (1 фаза)", category: "inverter", price: 1550, power: "12 кВт", model: "SUN-12K-SG02LP1-EU", prices: { SolarFlow: 1550, PriceListNew: 1574, EnergyEvolution: 1570, SunEnergy: 1550, "Сучасна Енергія": 1600 } },
    { id: "deye-deye-sun-15k-sg05lp3-3-faz", name: "Deye SUN-15K SG05LP3 (3 фази)", category: "inverter", price: 1800, power: "15 кВт", model: "SUN-15K-SG05LP3-EU-SM2", prices: { SolarFlow: 1800, PriceListNew: 1926, EnergyEvolution: 1840, SunEnergy: 1880, "Сучасна Енергія": 1930 } },
    { id: "deye-deye-sun-30k-hp3-v-sokovol-t", name: "Deye SUN-30K HP3 (високовольт.)", category: "inverter", price: 2650, power: "30 кВт", model: "SUN-30K-SG02HP3-EU-BM3", prices: { SolarFlow: 2650, PriceListNew: 2858, EnergyEvolution: 2800, SunEnergy: 2650, "Сучасна Енергія": 2900 } },
    { id: "deye-deye-sun-50k-hp3-v-sokovol-t", name: "Deye SUN-50K HP3 (високовольт.)", category: "inverter", price: 4100, power: "50 кВт", model: "SUN-50K-SG01HP3-EU-BM4", prices: { SolarFlow: 4200, PriceListNew: 4224, EnergyEvolution: 4180, SunEnergy: 4100, "Сучасна Енергія": 4200 } },
    { id: "deye-deye-sun-80k-hp3-v-sokovol-t", name: "Deye SUN-80K HP3 (високовольт.)", category: "inverter", price: 5700, power: "80 кВт", model: "SUN-80K-SG02HP3-EU-EM6", prices: { SolarFlow: 5750, PriceListNew: 6034, EnergyEvolution: 5930, SunEnergy: 5700, "Сучасна Енергія": 5700 } },
    { id: "deye-deye-sun-16k-sg-lp1-1-faza", name: "Deye SUN-16K SG..LP1 (1 фаза)", category: "inverter", price: 1832, power: "16 кВт", model: "Deye SUN-16K-SG01LP1-EU", prices: { PriceListNew: 1832, EnergyEvolution: 1895, SunEnergy: 1950, "Сучасна Енергія": 1970 } },
    { id: "deye-deye-sun-20k-hp3-v-sokovol-t", name: "Deye SUN-20K HP3 (високовольт.)", category: "inverter", price: 1680, power: "20 кВт", model: "SUN-20K-SG01HP3-EU-BM4", prices: { SolarFlow: 1790, PriceListNew: 1714, EnergyEvolution: 1680, "Сучасна Енергія": 1750 } },
    { id: "deye-deye-sun-20k-sg05lp3-3-faz", name: "Deye SUN-20K SG05LP3 (3 фази)", category: "inverter", price: 2380, power: "20 кВт", model: "SUN-20K-SG05LP3-EU-SM2", prices: { SolarFlow: 2380, PriceListNew: 2550, EnergyEvolution: 2480, "Сучасна Енергія": 2450 } },
    { id: "deye-deye-sun-100-kw-merezhev", name: "Deye SUN-100 kW мережевий", category: "inverter", price: 2520, power: "100 кВт", model: "DEYE SUN-100К-G03", prices: { PriceListNew: 2520, RiseUp: 2600, EnergyEvolution: 2680, SunEnergy: 2600 } },
    { id: "deye-deye-sun-20-kw-merezhev", name: "Deye SUN-20 kW мережевий", category: "inverter", price: 672, power: "20 кВт", model: "DEYE SUN-20K-G05", prices: { PriceListNew: 672, RiseUp: 800, EnergyEvolution: 800, SunEnergy: 850 } },
    { id: "deye-deye-sun-30-kw-merezhev", name: "Deye SUN-30 kW мережевий", category: "inverter", price: 945, power: "30 кВт", model: "DEYE SUN-30K-G04", prices: { PriceListNew: 945, RiseUp: 1065, EnergyEvolution: 1120, SunEnergy: 1050 } },
    { id: "deye-deye-sun-50-kw-merezhev", name: "Deye SUN-50 kW мережевий", category: "inverter", price: 1502, power: "50 кВт", model: "DEYE SUN-50K-G04", prices: { PriceListNew: 1502, RiseUp: 1510, EnergyEvolution: 1580, SunEnergy: 1690 } },
    { id: "deye-deye-sun-10k-sg05lp3-3-faz", name: "Deye SUN-10K SG05LP3 (3 фази)", category: "inverter", price: 1570, power: "10 кВт", model: "Deye SUN-10K-SG05LP3-EU", prices: { PriceListNew: 1642, EnergyEvolution: 1570, "Сучасна Енергія": 1650 } },
    { id: "deye-deye-sun-125k-hp3-v-sokovol-t", name: "Deye SUN-125K HP3 (високовольт.)", category: "inverter", price: 7100, power: "125 кВт", model: "Deye SUN-125K-SG02HP3-EU-GM10", prices: { PriceListNew: 7222, EnergyEvolution: 7100, SunEnergy: 7100 } },
    { id: "deye-deye-sun-5k-sg-lp1-1-faza", name: "Deye SUN-5K SG..LP1 (1 фаза)", category: "inverter", price: 750, power: "5 кВт", model: "Deye SUN-5KSG03LP1-EU", prices: { PriceListNew: 902, EnergyEvolution: 750, SunEnergy: 750 } },
    { id: "deye-deye-sun-10-kw-merezhev", name: "Deye SUN-10 kW мережевий", category: "inverter", price: 522, power: "10 кВт", model: "Deye SUN-10K-G04", prices: { PriceListNew: 522, EnergyEvolution: 606, SunEnergy: 650 } },
    { id: "deye-deye-sun-15-kw-merezhev", name: "Deye SUN-15 kW мережевий", category: "inverter", price: 651, power: "15 кВт", model: "Deye SUN-15K-G04", prices: { PriceListNew: 651, EnergyEvolution: 690, SunEnergy: 690 } },
    { id: "deye-deye-sun-100k-hp3-v-sokovol-t", name: "Deye SUN-100K HP3 (високовольт.)", category: "inverter", price: 6800, power: "100 кВт", model: "Deye SUN-100K-SG02HP3-EU-GM10", prices: { EnergyEvolution: 6800, SunEnergy: 6800 } },
    { id: "deye-deye-sun-60k-hp3-v-sokovol-t", name: "Deye SUN-60K HP3 (високовольт.)", category: "inverter", price: 5280, power: "60 кВт", model: "Deye SUN-60K-SG02HP3-EU-EM6", prices: { EnergyEvolution: 5280, SunEnergy: 5400 } },
    { id: "deye-deye-sun-25k-hp3-v-sokovol-t", name: "Deye SUN-25K HP3 (високовольт.)", category: "inverter", price: 1843, power: "25 кВт", model: "Deye SUN-25K-SG01HP3-EU-AM2", prices: { PriceListNew: 1843, SunEnergy: 1980 } },
    { id: "deye-deye-sun-6-kw-merezhev", name: "Deye SUN-6 kW мережевий", category: "inverter", price: 411, power: "6 кВт", model: "SUN-06K-G Deye WiFi", prices: { PriceListNew: 411, EnergyEvolution: 450 } },
    { id: "deye-deye-sun-15k-hp3-v-sokovol-t", name: "Deye SUN-15K HP3 (високовольт.)", category: "inverter", price: 1456, power: "15 кВт", model: "SUN-15K-SG01HP3-EU", prices: { PriceListNew: 1456 } },
    { id: "deye-deye-sun-16k-sg05lp3-3-faz", name: "Deye SUN-16K SG05LP3 (3 фази)", category: "inverter", price: 1895, power: "16 кВт", model: "SUN-16K-SG05LP3-EU-SM2", prices: { EnergyEvolution: 1895 } },
    { id: "deye-deye-sun-40k-hp3-v-sokovol-t", name: "Deye SUN-40K HP3 (високовольт.)", category: "inverter", price: 3930, power: "40 кВт", model: "SUN-40K-SG01HP3-EU-BM4", prices: { EnergyEvolution: 3930 } },
    { id: "deye-deye-sun-75k-hp3-v-sokovol-t", name: "Deye SUN-75K HP3 (високовольт.)", category: "inverter", price: 5740, power: "75 кВт", model: "SUN-75K-SG02HP3-EU-EM6", prices: { EnergyEvolution: 5740 } },
    { id: "deye-k-ta-deye-sun-20-sg05lp3-eu-sm2-nov-nk", name: "Deye SUN-20 SG05LP3 (НОВИНКА)", category: "inverter", price: 2420, power: "20 кВт", model: "Deye SUN-20-SG05LP3-EU-SM2", prices: { SunEnergy: 2420 } },
    { id: "deye-deye-sun-125-kw-merezhev", name: "Deye SUN-125 kW мережевий", category: "inverter", price: 3440, power: "125 кВт", model: "SUN-125K-G Deye WiFi", prices: { EnergyEvolution: 3440 } },
    { id: "deye-deye-sun-12-kw-merezhev", name: "Deye SUN-12 kW мережевий", category: "inverter", price: 600, power: "12 кВт", model: "SUN-12K-G06 Deye WiFi", prices: { EnergyEvolution: 600 } },
    { id: "deye-deye-sun-135-kw-merezhev", name: "Deye SUN-135 kW мережевий", category: "inverter", price: 4180, power: "135 кВт", model: "SUN-135K-G Deye WiFi", prices: { EnergyEvolution: 4180 } },
    { id: "deye-deye-sun-25-kw-merezhev", name: "Deye SUN-25 kW мережевий", category: "inverter", price: 820, power: "25 кВт", model: "SUN-25K-G04 Deye WiFi", prices: { EnergyEvolution: 820 } },
    { id: "deye-deye-sun-33-kw-merezhev", name: "Deye SUN-33 kW мережевий", category: "inverter", price: 1460, power: "33 кВт", model: "SUN-33K-G", prices: { PriceListNew: 1460 } },
    { id: "deye-deye-sun-60-kw-merezhev", name: "Deye SUN-60 kW мережевий", category: "inverter", price: 2550, power: "60 кВт", model: "Deye SUN-60K-G04", prices: { SunEnergy: 2550 } },
    { id: "deye-deye-sun-80-kw-merezhev", name: "Deye SUN-80 kW мережевий", category: "inverter", price: 2280, power: "80 кВт", model: "SUN-80K-G Deye WiFi", prices: { EnergyEvolution: 2280 } },
    { id: "deye-deye-sun-8-kw-merezhev", name: "Deye SUN-8 kW мережевий", category: "inverter", price: 570, power: "8 кВт", model: "SUN-08K-G Deye WiFi", prices: { EnergyEvolution: 570 } },
    { id: "deye-deye-bos-g-5-1", name: "Deye BOS-G-5.1", category: "battery", price: 640, power: null, model: "BOS-G Pro 5,12kWh", prices: { SolarFlow: 750, PriceListNew: 640, RiseUp: 760, EnergyEvolution: 860, SunEnergy: 750, KeyVolt: 820, "Сучасна Енергія": 770 } },
    { id: "deye-deye-se-f5-pro-c", name: "Deye SE-F5-PRO-C", category: "battery", price: 742, power: null, model: "SE-F5 Pro-C", prices: { SolarFlow: 750, PriceListNew: 742, RiseUp: 760, EnergyEvolution: 850, SunEnergy: 750, KeyVolt: 820, "Сучасна Енергія": 760 } },
    { id: "deye-deye-se-g5-1-pro-b", name: "Deye SE-G5.1-PRO-B", category: "battery", price: 750, power: null, model: "SE-G 5.1PRO B", prices: { SolarFlow: 750, PriceListNew: 910, RiseUp: 800, EnergyEvolution: 870, KeyVolt: 820, Pulsar: 860, "Сучасна Енергія": 780 } },
    { id: "deye-deye-rack-h", name: "Deye RACK-H", category: "battery", price: 320, power: null, model: "3U-HRACK", prices: { SolarFlow: 380, PriceListNew: 370, RiseUp: 405, EnergyEvolution: 380, SunEnergy: 320, KeyVolt: 350 } },
    { id: "deye-deye-se-f12", name: "Deye SE-F12", category: "battery", price: 1331, power: null, model: "Deye SE-F12 C", prices: { PriceListNew: 1331, RiseUp: 1565, EnergyEvolution: 1630, SunEnergy: 1450, "Сучасна Енергія": 1485 } },
    { id: "deye-deye-se-f16", name: "Deye SE-F16", category: "battery", price: 1701, power: null, model: "SE-F16C", prices: { SolarFlow: 1780, PriceListNew: 1701, EnergyEvolution: 1900, SunEnergy: 1760, "Сучасна Енергія": 1800 } },
    { id: "deye-deye-bos-g-pdu2", name: "Deye BOS-G-PDU2", category: "battery", price: 740, power: null, model: "BOS-G-PDU-2 Deye", prices: { RiseUp: 775, EnergyEvolution: 740, KeyVolt: 800, "Сучасна Енергія": 760 } },
    { id: "deye-deye-rack-l", name: "Deye RACK-L", category: "battery", price: 249, power: null, model: "BOS-G-3U-LRACK Deye", prices: { PriceListNew: 249, RiseUp: 380, EnergyEvolution: 360 } },
    { id: "deye-deye-bos-b-pack16", name: "Deye BOS-B-PACK16", category: "battery", price: 1903, power: null, model: "Deye HV BOS-B-Pack16-A3-Pro", prices: { PriceListNew: 1903, "Сучасна Енергія": 26500 } },
    { id: "deye-deye-se-f5-pro-l", name: "Deye SE-F5-PRO-L", category: "battery", price: 785, power: null, model: "Deye SE-F5 Pro-L", prices: { RiseUp: 785, EnergyEvolution: 840, "Сучасна Енергія": 800 } },
    { id: "deye-bos-a-pdu2-deye", name: "BOS-A-PDU2 Deye", category: "battery", price: 975, power: null, model: "BOS-A-PDU2 Deye", prices: { EnergyEvolution: 975, SunEnergy: 1120 } },
    { id: "deye-deye-rw-m6-1-b", name: "Deye RW-M6.1-B", category: "battery", price: 850, power: null, model: "Deye RW-M6.1-B", prices: { RiseUp: 850, "Сучасна Енергія": 1050 } },
    { id: "deye-deye-ess-ge-f60-60-kw-h", name: "Deye ESS GE-F60 (60 kWh)", category: "battery", price: 13138, power: null, model: "Deye ESS GE-F60", prices: { PriceListNew: 13138, KeyVolt: 24600 } },
    { id: "deye-akumulyator-deye-lfp-102-4v-40a-gb-lm4-0", name: "Акумулятор Deye LFP 102.4В 40A GB-LM4.0", category: "battery", price: 850, power: null, model: "GB-LM4.0", prices: { SunEnergy: 850 } },
    { id: "deye-bos-a-rack-11-deye", name: "BOS-A-RACK-11 Deye", category: "battery", price: 360, power: null, model: "BOS-A-RACK-11 Deye", prices: { EnergyEvolution: 360 } },
    { id: "deye-bos-a-rack14-deye-14-sht", name: "BOS-A-Rack14 Deye (14 шт.)", category: "battery", price: 440, power: null, model: "BOS-A-Rack14 Deye", prices: { EnergyEvolution: 440 } },
    { id: "deye-bms-kontroler-bos-g-pro-pdu-2-deye-sh", name: "BMS Контролер BOS-G-Pro-PDU-2 Deye", category: "battery", price: 786, power: null, model: "BOS-G-Pro-PDU-2", prices: { PriceListNew: 786 } },
    { id: "deye-sti-ka-dlya-13-batare-deye-bos-g", name: "Стійка для 13 батарей DEYE BOS-G", category: "battery", price: 390, power: null, model: "Стійка DEYE BOS-G 13 шт.", prices: { "Сучасна Енергія": 390 } },
    { id: "deye-sti-ka-dlya-8-1-batare-deye-bos-g", name: "Стійка для 8+1 батарей DEYE BOS-G", category: "battery", price: 360, power: null, model: "Стійка DEYE BOS-G 8+1 шт.", prices: { "Сучасна Енергія": 360 } },
    { id: "deye-bms-kontroler-deye-bos-g-120-750-vdc-100", name: "BMS Контролер Deye BOS-G 120-750Vdc 100A", category: "battery", price: 760, power: null, model: "HVB750V100A", prices: { SunEnergy: 760 } },
    { id: "deye-bos-a-pack7-68-deye-high-voltage-lifepo", name: "BOS-A-Pack7.68 Deye HV LiFePO4", category: "battery", price: 1200, power: null, model: "BOS-A-Pack7.68", prices: { EnergyEvolution: 1200 } },
    { id: "deye-bms-kontroler-bos-b-pdu-2-a-deye-sht", name: "BMS Контролер BOS-B-PDU-2-A Deye", category: "battery", price: 935, power: null, model: "BOS-B-PDU-2-A", prices: { PriceListNew: 935 } },
    { id: "deye-deye-bos-a-lifepo4-hv-38-4v-200ah", name: "DEYE BOS-A LiFePO4 HV 38.4V 200AH", category: "battery", price: 1260, power: null, model: "BOS-A LiFePO4 HV 38.4V 200AH", prices: { SunEnergy: 1260 } },
    { id: "deye-deye-bos-b-pro-a3", name: "Deye BOS-B PRO A3", category: "battery", price: 27200, power: null, model: "Deye BOS-B PRO A3", prices: { SunEnergy: 27200 } },
    { id: "deye-komplekt-deye-bos-b-pro-sti-ka-bms-a", name: "Комплект Deye BOS-B PRO Стійка + БМС + АКБ", category: "battery", price: 27000, power: null, model: "BOS-B PRO Kit", prices: { SunEnergy: 27000 } },
    { id: "deye-komplekt-deye-bos-b-sti-ka-bms-akb-l", name: "Комплект Deye BOS-B Стійка + БМС + АКБ LV", category: "battery", price: 24500, power: null, model: "BOS-B Kit LV", prices: { SunEnergy: 24500 } },
    { id: "deye-deye-se-g5-3", name: "Deye SE-G5.3", category: "battery", price: 906, power: null, model: "SE-G5.3", prices: { PriceListNew: 906 } },
    { id: "deye-akumulyator-lifepo4-deye-se-g5-3-51-2v-1", name: "Акумулятор LiFePO4 Deye SE-G5.3 51.2V/104Ah", category: "battery", price: 700, power: null, model: "SE-G5.3", prices: { Pulsar: 700 } },
    { id: "deye-akumulyatorna-batareya-deye-al-w10-2kwh-lv", name: "Акумуляторна батарея DEYE AL-W10.2kWh LV", category: "battery", price: 2300, power: null, model: "AL-W10.2kWh LV", prices: { SunEnergy: 2300 } },
    { id: "deye-akumulyator-deye-lfp-100a-51-2v-se-g5-1", name: "Акумулятор Deye LFP 100A 51.2V SE-G5.1 Pro", category: "battery", price: 760, power: null, model: "SE-G5.1 Pro", prices: { SunEnergy: 760 } },
    { id: "deye-deye-sun-125k-pcs", name: "Deye SUN-125K-PCS", category: "solar", price: 4002, power: "125 кВт", model: "SUN-125K-PCS01HP3", prices: { PriceListNew: 4002, SunEnergy: 5412 } },
    { id: "deye-modul-mppt-sun-mppt-l01-eu-am8-deye", name: "Модуль МППТ SUN-MPPT-L01-EU-AM8 Deye", category: "solar", price: 1635, power: null, model: "SUN-MPPT-L01-EU-AM8", prices: { PriceListNew: 1635 } },
    { id: "deye-aio-modul-bmu-osnova-gb-lb-lbase-deye", name: "AIO Модуль BMU + основа GB-LB+Lbase Deye", category: "solar", price: 505, power: null, model: "GB-LB+Lbase", prices: { PriceListNew: 505 } },
    { id: "deye-ai-w5-1-12k-sg04lpp3-eu-deye-ess-12-kw", name: "Deye ESS AI-W5.1-12K (12 кВт, 3 фази)", category: "station", price: 1870, power: "12 кВт", model: "AI-W5.1-12K-SG04LPP3-EU", prices: { EnergyEvolution: 1870 } },
    { id: "deye-ai-w5-1-8k-sg01lp1-eu-deye-ess-8-kw-1", name: "Deye ESS AI-W5.1-8K (8 кВт, 1 фаза)", category: "station", price: 1180, power: "8 кВт", model: "AI-W5.1-8K-SG01LP1-EU", prices: { EnergyEvolution: 1180 } },
    { id: "deye-s-stema-nakop-chennya-deye-bess-bos-b-240", name: "Система накопичення Deye BESS BOS-B 240 кВт", category: "station", price: 27500, power: "240 кВт", model: "BESS BOS-B 240", prices: { RiseUp: 27500 } },
  ];

  // Fetch supplier name→id map once
  const supplierRows = await prisma.supplier.findMany({ select: { id: true, name: true } });
  const supplierMap = Object.fromEntries(supplierRows.map((s) => [s.name, s.id]));

  // ── Deye catalogue enrichment (characteristics + official images) ─────────
  // Runs ONLY when the seed is invoked with `--enrich` (npm run seed:enrich /
  // seed:enrich:prod, or SEED_ENRICH=1). A normal deploy NEVER writes products'
  // features/images, so whatever is set here survives every future deploy.
  const ENRICH = process.argv.includes("--enrich") || process.env.SEED_ENRICH === "1";
  const seedAssetsDir = path.join(process.cwd(), "seed-assets", "deye");
  const copySeedImage = (file: string): string | null => {
    const src = path.join(seedAssetsDir, file);
    if (!fs.existsSync(src)) {
      console.warn(`[seed:enrich] ⚠ image not found, skipping: ${src}`);
      return null;
    }
    ensureUploadDir();
    fs.copyFileSync(src, path.join(uploadDir, file));
    return `/uploads/${file}`;
  };
  // id → { img: filename inside seed-assets/deye, features: characteristics (one per line) }
  const deyeEnrichment: Record<string, { img: string; features: string[] }> = {
    "deye-deye-se-g5-1-pro-b": {
      img: "deye-deye-se-g5-1-pro-b.jpg",
      features: [
        "Модель: SE-G5.1 Pro-B",
        "Тип: акумулятор LiFePO₄ (літій-залізо-фосфат)",
        "Ємність: 5,12 кВт·год (100 Ач)",
        "Номінальна напруга: 51,2 В",
        "Макс. струм заряду/розряду: 100 А",
        "Ресурс: понад 6000 циклів",
        "Масштабування: до 16 модулів паралельно",
        "Комунікація: RS485 / CAN, вбудована BMS",
      ],
    },
    "deye-deye-sun-8k-sg-lp1-1-faza": {
      img: "deye-deye-sun-8k-sg-lp1-1-faza.png",
      features: [
        "Модель: SUN-8K-SG05LP1-EU-AM2-P",
        "Тип: гібридний інвертор, 1 фаза",
        "Номінальна потужність: 8 кВт",
        "MPPT: 2 трекери",
        "Акумулятор: низьковольтний, 48 В",
        "Макс. струм заряду/розряду АКБ: 190 А",
        "Паралельна робота: до 16 інверторів",
        "Режими: on-grid / off-grid, підтримка генератора, AC-coupling",
        "Дисплей: кольоровий сенсорний LCD, захист IP65",
      ],
    },
    "deye-deye-sun-12k-sg05lp3-3-faz": {
      img: "deye-deye-sun-12k-sg05lp3-3-faz.png",
      features: [
        "Модель: SUN-12K-SG05LP3-EU",
        "Тип: гібридний інвертор, 3 фази",
        "Номінальна потужність: 12 кВт",
        "MPPT: 2 трекери",
        "Акумулятор: низьковольтний, 48 В",
        "Макс. струм заряду/розряду АКБ: 240 А",
        "Паралельна робота: до 10 інверторів",
        "100% несиметричне навантаження по фазах",
        "Режими: on-grid / off-grid, підтримка генератора; IP65",
      ],
    },
    "deye-deye-sun-16k-sg05lp3-3-faz": {
      img: "deye-deye-sun-16k-sg05lp3-3-faz.png",
      features: [
        "Модель: SUN-16K-SG05LP3-EU-SM2",
        "Тип: гібридний інвертор, 3 фази",
        "Номінальна потужність: 16 кВт",
        "MPPT: 2 трекери",
        "Акумулятор: низьковольтний, 48 В",
        "Макс. струм заряду/розряду АКБ: 240 А",
        "Паралельна робота: до 10 інверторів",
        "100% несиметричне навантаження по фазах",
        "Режими: on-grid / off-grid, підтримка генератора; IP65",
      ],
    },
    "deye-deye-sun-30-kw-merezhev": {
      img: "deye-deye-sun-30-kw-merezhev.png",
      features: [
        "Модель: SUN-30K-G04",
        "Тип: мережевий (grid-tie) інвертор, 3 фази",
        "Номінальна потужність: 30 кВт",
        "MPPT: 3 трекери",
        "Макс. ККД: до 98,6%",
        "Підключення: 3 фази, 380/400 В",
        "Моніторинг: Wi-Fi; захист IP65",
        "Без акумулятора — прямий продаж енергії в мережу",
      ],
    },
  };

  let deyeCreated = 0;
  let deyeEnriched = 0;
  let deyePrices = 0;
  for (const p of deyeProducts) {
    const supplierPriceValues = Object.values(p.prices).filter((v) => v > 0);
    const minSupplierPrice = supplierPriceValues.length ? Math.min(...supplierPriceValues) : p.price;
    const retailPrice = Math.round(minSupplierPrice * 1.2);
    const enrich = deyeEnrichment[p.id];
    const createData = {
      name: p.name,
      category: p.category,
      brandSlug: "deye",
      price: retailPrice,
      warranty: "1 рік",
      power: p.power ?? null,
      features: JSON.stringify(enrich ? enrich.features : [p.model]),
      image: "/placeholder.jpg",
      images: "[]",
    };
    // Deploy-safe: these are synced on every run. features/image/images are
    // intentionally absent so a normal deploy never wipes descriptions/photos.
    const updateData: {
      name: string;
      category: string;
      brandSlug: string;
      price: number;
      power: string | null;
      features?: string;
      image?: string;
      images?: string;
    } = {
      name: p.name,
      category: p.category,
      brandSlug: "deye",
      price: retailPrice,
      power: p.power ?? null,
    };
    if (ENRICH && enrich) {
      updateData.features = JSON.stringify(enrich.features);
      const url = copySeedImage(enrich.img);
      if (url) {
        updateData.image = url;
        updateData.images = JSON.stringify([url]);
        createData.image = url;
        createData.images = JSON.stringify([url]);
      }
      deyeEnriched++;
    }
    await prisma.product.upsert({ where: { id: p.id }, create: { id: p.id, ...createData }, update: updateData });
    deyeCreated++;

    for (const [supplierName, supplierPrice] of Object.entries(p.prices)) {
      const supplierId = supplierMap[supplierName];
      if (!supplierId) continue;
      await prisma.supplierPrice.upsert({
        where: { supplierId_productId: { supplierId, productId: p.id } },
        create: { supplierId, productId: p.id, price: supplierPrice, currency: "USD", availability: "in_stock" },
        update: { price: supplierPrice, availability: "in_stock" },
      });
      deyePrices++;
    }
  }
  await prisma.product.updateMany({ where: { id: { startsWith: "deye-" } }, data: { brandSlug: "deye" } });
  console.log(
    `[seed] Deye products: ${deyeCreated} upserted, ${deyePrices} supplier prices linked` +
      (ENRICH ? `, ${deyeEnriched} enriched (characteristics + image)` : " (enrichment skipped — pass --enrich to apply)"),
  );

  const productsWithoutCategoryLinks = await prisma.product.findMany({
    where: { categoryLinks: { none: {} } },
    select: { id: true, category: true },
  });
  if (productsWithoutCategoryLinks.length) {
    await prisma.productCategoryLink.createMany({
      data: productsWithoutCategoryLinks.map((p) => ({ productId: p.id, categoryKey: p.category })),
      skipDuplicates: true,
    });
  }
  console.log(`[seed] Product category links: ${productsWithoutCategoryLinks.length} backfilled`);

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
