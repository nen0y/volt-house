import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAdmin } from "../middleware/auth";

export const brandsRouter = Router();

const schema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9_-]+$/, "лише латиниця, цифри, - та _"),
  name: z.string().min(1),
  logo: z.string().default(""),
  description: z.string().default(""),
  country: z.string().default(""),
  enabled: z.boolean().default(true),
});

brandsRouter.get("/", async (req, res) => {
  const includeDisabled = req.query.all === "1";
  const rows = await prisma.brand.findMany({
    where: includeDisabled ? {} : { enabled: true },
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });
  res.json(rows);
});

brandsRouter.post("/", requireAdmin, async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const row = await prisma.brand.upsert({
    where: { slug: parsed.data.slug },
    create: parsed.data,
    update: parsed.data,
  });
  res.status(201).json(row);
});

brandsRouter.put("/:slug", requireAdmin, async (req, res) => {
  const parsed = schema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { slug: _slug, ...data } = parsed.data;
  try {
    const row = await prisma.brand.update({ where: { slug: req.params.slug }, data });
    res.json(row);
  } catch {
    res.status(404).json({ error: "Бренд не знайдено" });
  }
});

brandsRouter.delete("/:slug", requireAdmin, async (req, res) => {
  try {
    await prisma.brand.delete({ where: { slug: req.params.slug } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: "Бренд не знайдено" });
  }
});
