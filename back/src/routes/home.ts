import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAdmin } from "../middleware/auth";
import { parseStringArray } from "../json";

export const homeRouter = Router();

function toDto(s: any) {
  return {
    id: s.id,
    title: s.title,
    subtitle: s.subtitle,
    mode: s.mode,
    category: s.category,
    productIds: parseStringArray(s.productIds),
    ctaLabel: s.ctaLabel,
    ctaHref: s.ctaHref,
    enabled: s.enabled,
    sortOrder: s.sortOrder,
  };
}

// GET /api/home-sections       → enabled, ordered
// GET /api/home-sections?all=1 → include disabled (admin)
homeRouter.get("/", async (req, res) => {
  const includeDisabled = req.query.all === "1";
  const rows = await prisma.homeSection.findMany({
    where: includeDisabled ? {} : { enabled: true },
    orderBy: { sortOrder: "asc" },
  });
  res.json(rows.map(toDto));
});

const schema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  mode: z.enum(["products", "category", "cta"]).optional(),
  category: z.string().optional(),
  productIds: z.array(z.string()).optional(),
  ctaLabel: z.string().optional(),
  ctaHref: z.string().optional(),
  enabled: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

function toData(d: z.infer<typeof schema>) {
  const data: Record<string, unknown> = {};
  if (d.title !== undefined) data.title = d.title;
  if (d.subtitle !== undefined) data.subtitle = d.subtitle;
  if (d.mode !== undefined) data.mode = d.mode;
  if (d.category !== undefined) data.category = d.category;
  if (d.productIds !== undefined) data.productIds = JSON.stringify(d.productIds);
  if (d.ctaLabel !== undefined) data.ctaLabel = d.ctaLabel;
  if (d.ctaHref !== undefined) data.ctaHref = d.ctaHref;
  if (d.enabled !== undefined) data.enabled = d.enabled;
  if (d.sortOrder !== undefined) data.sortOrder = d.sortOrder;
  return data;
}

// POST /api/home-sections  (admin) — create a new section
homeRouter.post("/", requireAdmin, async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const count = await prisma.homeSection.count();
  const saved = await prisma.homeSection.create({
    data: { sortOrder: count, ...(toData(parsed.data) as any) },
  });
  res.status(201).json(toDto(saved));
});

// PUT /api/home-sections/:id  (admin) — update a section
homeRouter.put("/:id", requireAdmin, async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const saved = await prisma.homeSection.update({
      where: { id: req.params.id },
      data: toData(parsed.data) as any,
    });
    res.json(toDto(saved));
  } catch {
    res.status(404).json({ error: "Секцію не знайдено" });
  }
});

// DELETE /api/home-sections/:id  (admin)
homeRouter.delete("/:id", requireAdmin, async (req, res) => {
  try {
    await prisma.homeSection.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: "Секцію не знайдено" });
  }
});
