import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAdmin } from "../middleware/auth";
import { parseStringArray } from "../json";

export const contentRouter = Router();

function toDto(b: any) {
  return {
    key: b.key,
    heading: b.heading ?? "",
    subheading: b.subheading ?? "",
    body: b.body ?? "",
    productIds: parseStringArray(b.productIds),
    enabled: b.enabled,
    sortOrder: b.sortOrder,
  };
}

// GET /api/content  → all blocks keyed by `key` (handy for the frontend)
contentRouter.get("/", async (_req, res) => {
  const rows = await prisma.contentBlock.findMany({ orderBy: { sortOrder: "asc" } });
  const map: Record<string, ReturnType<typeof toDto>> = {};
  for (const r of rows) map[r.key] = toDto(r);
  res.json(map);
});

// GET /api/content/:key
contentRouter.get("/:key", async (req, res) => {
  const b = await prisma.contentBlock.findUnique({ where: { key: req.params.key } });
  if (!b) return res.status(404).json({ error: "Блок не знайдено" });
  res.json(toDto(b));
});

const schema = z.object({
  key: z.string().min(1),
  heading: z.string().nullish(),
  subheading: z.string().nullish(),
  body: z.string().nullish(),
  productIds: z.array(z.string()).optional(),
  enabled: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

// POST /api/content  (admin) — create or upsert a block
contentRouter.post("/", requireAdmin, async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const d = parsed.data;
  const data = {
    heading: d.heading ?? null,
    subheading: d.subheading ?? null,
    body: d.body ?? null,
    productIds: JSON.stringify(d.productIds ?? []),
    enabled: d.enabled ?? true,
    sortOrder: d.sortOrder ?? 0,
  };
  const saved = await prisma.contentBlock.upsert({
    where: { key: d.key },
    create: { key: d.key, ...data },
    update: data,
  });
  res.status(201).json(toDto(saved));
});

// PUT /api/content/:key  (admin) — partial update
contentRouter.put("/:key", requireAdmin, async (req, res) => {
  const parsed = schema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const exists = await prisma.contentBlock.findUnique({ where: { key: req.params.key } });
  if (!exists) return res.status(404).json({ error: "Блок не знайдено" });

  const { key: _k, productIds, ...rest } = parsed.data;
  const data: Record<string, unknown> = { ...rest };
  if (productIds !== undefined) data.productIds = JSON.stringify(productIds);

  const saved = await prisma.contentBlock.update({ where: { key: req.params.key }, data: data as any });
  res.json(toDto(saved));
});

// DELETE /api/content/:key  (admin)
contentRouter.delete("/:key", requireAdmin, async (req, res) => {
  try {
    await prisma.contentBlock.delete({ where: { key: req.params.key } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: "Блок не знайдено" });
  }
});
