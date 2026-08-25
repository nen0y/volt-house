import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAdmin } from "../middleware/auth";

export const crmRouter = Router();

crmRouter.use(requireAdmin);

const supplierSchema = z.object({
  name: z.string().min(1),
  contactName: z.string().nullish(),
  phone: z.string().nullish(),
  email: z.string().email().nullish().or(z.literal("")),
  website: z.string().nullish(),
  notes: z.string().default(""),
  active: z.boolean().default(true),
});

crmRouter.get("/suppliers", async (_req, res) => {
  const rows = await prisma.supplier.findMany({
    include: { _count: { select: { prices: true } } },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  res.json(rows);
});

crmRouter.post("/suppliers", async (req, res) => {
  const parsed = supplierSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const row = await prisma.supplier.create({ data: { ...parsed.data, email: parsed.data.email || null } });
  res.status(201).json(row);
});

crmRouter.put("/suppliers/:id", async (req, res) => {
  const parsed = supplierSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const row = await prisma.supplier.update({
      where: { id: req.params.id },
      data: { ...parsed.data, ...(parsed.data.email === "" ? { email: null } : {}) },
    });
    res.json(row);
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
    prisma.product.findMany({ include: { brand: true }, orderBy: [{ category: "asc" }, { name: "asc" }] }),
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
      categoryLabel: categories.find((c) => c.key === p.category)?.label || "Без категорії",
      brandLabel: p.brand?.name || "Без бренду",
      retailPrice: p.price,
    })),
    suppliers: suppliers.map((s) => ({ id: s.id, name: s.name })),
    prices,
    bestByProduct,
  });
});
