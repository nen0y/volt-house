import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAdmin } from "../middleware/auth";

export const categoriesRouter = Router();

function toDto(c: any) {
  return {
    key: c.key,
    label: c.label,
    labelSingular: c.labelSingular,
    description: c.description,
    icon: c.icon,
    sortOrder: c.sortOrder,
    enabled: c.enabled,
    parentKey: c.parentKey ?? null,
  };
}

// GET /api/categories       → enabled categories, ordered
// GET /api/categories?all=1 → include disabled (for admin)
categoriesRouter.get("/", async (req, res) => {
  const includeDisabled = req.query.all === "1";
  const rows = await prisma.category.findMany({
    where: includeDisabled ? {} : { enabled: true },
    orderBy: { sortOrder: "asc" },
  });
  res.json(rows.map(toDto));
});

const schema = z.object({
  key: z.string().min(1).regex(/^[a-z0-9_-]+$/, "лише латиниця, цифри, - та _"),
  label: z.string().min(1),
  labelSingular: z.string().optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  sortOrder: z.number().int().optional(),
  enabled: z.boolean().optional(),
  parentKey: z.string().nullable().optional(),
});

const reorderSchema = z.object({
  keys: z.array(z.string().min(1)).min(1),
});

// POST /api/categories  (admin) — create/upsert
categoriesRouter.post("/", requireAdmin, async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const d = parsed.data;
  const data = {
    label: d.label,
    labelSingular: d.labelSingular ?? "",
    description: d.description ?? "",
    icon: d.icon ?? "📦",
    sortOrder: d.sortOrder ?? 0,
    enabled: d.enabled ?? true,
    parentKey: d.parentKey || null,
  };
  const saved = await prisma.category.upsert({
    where: { key: d.key },
    create: { key: d.key, ...data },
    update: data,
  });
  res.status(201).json(toDto(saved));
});

// PUT /api/categories/reorder (admin) — atomically persist the full UI order.
categoriesRouter.put("/reorder", requireAdmin, async (req, res) => {
  const parsed = reorderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const keys = parsed.data.keys;
  if (new Set(keys).size !== keys.length) {
    return res.status(400).json({ error: "Категорії в порядку не повинні повторюватися" });
  }

  const existing = await prisma.category.findMany({ select: { key: true } });
  const existingKeys = new Set(existing.map((category) => category.key));
  if (keys.length !== existingKeys.size || keys.some((key) => !existingKeys.has(key))) {
    return res.status(400).json({ error: "Передайте повний актуальний список категорій" });
  }

  await prisma.$transaction(
    keys.map((key, sortOrder) => prisma.category.update({ where: { key }, data: { sortOrder } })),
  );

  const rows = await prisma.category.findMany({ orderBy: { sortOrder: "asc" } });
  res.json(rows.map(toDto));
});

// PUT /api/categories/:key  (admin) — partial update
categoriesRouter.put("/:key", requireAdmin, async (req, res) => {
  const parsed = schema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const exists = await prisma.category.findUnique({ where: { key: req.params.key } });
  if (!exists) return res.status(404).json({ error: "Категорію не знайдено" });
  const { key: _k, ...rest } = parsed.data;
  const saved = await prisma.category.update({ where: { key: req.params.key }, data: rest as any });
  res.json(toDto(saved));
});

// DELETE /api/categories/:key  (admin)
categoriesRouter.delete("/:key", requireAdmin, async (req, res) => {
  try {
    await prisma.category.delete({ where: { key: req.params.key } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: "Категорію не знайдено" });
  }
});
