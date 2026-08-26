import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAdmin } from "../middleware/auth";
import { parseStringArray } from "../json";

export const crmRouter = Router();

crmRouter.use(requireAdmin);

const supplierSchema = z.object({
  name: z.string().min(1),
  contactName: z.string().nullish(),
  phone: z.string().nullish(),
  email: z.string().email().nullish().or(z.literal("")),
  website: z.string().nullish(),
  resourceUrl: z.string().nullish(),
  supplierTypes: z.array(z.string()).default([]),
  rating: z.string().nullish(),
  brands: z.array(z.string()).default([]),
  currencies: z.array(z.string()).default([]),
  countries: z.array(z.string()).default([]),
  locations: z.array(z.string()).default([]),
  equipmentCategories: z.array(z.string()).default([]),
  lastContactAt: z.coerce.date().nullish(),
  notes: z.string().default(""),
  active: z.boolean().default(true),
});

function supplierData(d: z.infer<typeof supplierSchema> | Partial<z.infer<typeof supplierSchema>>) {
  return {
    ...d,
    ...(d.email !== undefined ? { email: d.email || null } : {}),
    ...(d.website !== undefined ? { website: d.website || null } : {}),
    ...(d.resourceUrl !== undefined ? { resourceUrl: d.resourceUrl || null } : {}),
    ...(d.rating !== undefined ? { rating: d.rating || null } : {}),
    ...(d.supplierTypes !== undefined ? { supplierTypes: JSON.stringify(d.supplierTypes) } : {}),
    ...(d.brands !== undefined ? { brands: JSON.stringify(d.brands) } : {}),
    ...(d.currencies !== undefined ? { currencies: JSON.stringify(d.currencies) } : {}),
    ...(d.countries !== undefined ? { countries: JSON.stringify(d.countries) } : {}),
    ...(d.locations !== undefined ? { locations: JSON.stringify(d.locations) } : {}),
    ...(d.equipmentCategories !== undefined ? { equipmentCategories: JSON.stringify(d.equipmentCategories) } : {}),
  };
}

function supplierDto(row: any) {
  return {
    ...row,
    supplierTypes: parseStringArray(row.supplierTypes),
    brands: parseStringArray(row.brands),
    currencies: parseStringArray(row.currencies),
    countries: parseStringArray(row.countries),
    locations: parseStringArray(row.locations),
    equipmentCategories: parseStringArray(row.equipmentCategories),
    lastContactAt: row.lastContactAt ? row.lastContactAt.toISOString().slice(0, 10) : null,
  };
}

crmRouter.get("/suppliers", async (_req, res) => {
  const rows = await prisma.supplier.findMany({
    include: { _count: { select: { prices: true } } },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  res.json(rows.map(supplierDto));
});

crmRouter.post("/suppliers", async (req, res) => {
  const parsed = supplierSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const row = await prisma.supplier.create({ data: supplierData(parsed.data) as any });
  res.status(201).json(supplierDto(row));
});

crmRouter.put("/suppliers/:id", async (req, res) => {
  const parsed = supplierSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const row = await prisma.supplier.update({
      where: { id: req.params.id },
      data: supplierData(parsed.data) as any,
    });
    res.json(supplierDto(row));
  } catch {
    res.status(404).json({ error: "Постачальника не знайдено" });
  }
});

crmRouter.delete("/suppliers/:id", async (req, res) => {
  try {
    await prisma.supplier.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: "Постачальника не знайдено" });
  }
});

const priceSchema = z.object({
  supplierId: z.string().min(1),
  productId: z.string().min(1),
  price: z.number().int().nonnegative(),
  currency: z.enum(["USD", "EUR", "UAH"]).default("USD"),
  availability: z.enum(["in_stock", "preorder", "unavailable"]).default("in_stock"),
  leadTimeDays: z.number().int().nonnegative().nullish(),
  minOrderQty: z.number().int().positive().default(1),
});

crmRouter.put("/prices", async (req, res) => {
  const parsed = priceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const d = parsed.data;
  const row = await prisma.supplierPrice.upsert({
    where: { supplierId_productId: { supplierId: d.supplierId, productId: d.productId } },
    create: d,
    update: {
      price: d.price,
      currency: d.currency,
      availability: d.availability,
      leadTimeDays: d.leadTimeDays ?? null,
      minOrderQty: d.minOrderQty,
    },
  });
  res.json(row);
});

crmRouter.delete("/prices", async (req, res) => {
  const parsed = z.object({ supplierId: z.string(), productId: z.string() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Некоректні дані" });
  await prisma.supplierPrice.deleteMany({ where: parsed.data });
  res.json({ ok: true });
});

crmRouter.get("/price-matrix", async (_req, res) => {
  const [products, suppliers, prices, categories] = await Promise.all([
    prisma.product.findMany({ include: { brand: true, categoryLinks: { select: { categoryKey: true } } }, orderBy: [{ category: "asc" }, { name: "asc" }] }),
    prisma.supplier.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.supplierPrice.findMany(),
    prisma.category.findMany({ select: { key: true, label: true } }),
  ]);

  const bestByProduct: Record<string, number> = {};
  for (const row of prices) {
    if (row.availability === "unavailable" || row.price === 0) continue;
    const current = bestByProduct[row.productId];
    if (current === undefined || row.price < current) bestByProduct[row.productId] = row.price;
  }

  res.json({
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      categoryKeys: p.categoryLinks.length ? p.categoryLinks.map((link) => link.categoryKey) : [p.category],
      categoryLabel: categories.find((c) => c.key === p.category)?.label || "Без категорії",
      brandLabel: p.brand?.name || "Без бренду",
      retailPrice: p.price,
    })),
    suppliers: suppliers.map((s) => ({ id: s.id, name: s.name })),
    categories: categories.map((c) => ({ key: c.key, label: c.label })),
    prices,
    bestByProduct,
  });
});
