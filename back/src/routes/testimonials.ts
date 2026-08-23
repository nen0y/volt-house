import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAdmin } from "../middleware/auth";

export const testimonialsRouter = Router();

function toDto(t: any) {
  return {
    id: t.id,
    name: t.name,
    location: t.location,
    rating: t.rating,
    text: t.text,
    avatar: t.avatar,
    product: t.product,
  };
}

// GET /api/testimonials
testimonialsRouter.get("/", async (_req, res) => {
  const rows = await prisma.testimonial.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  res.json(rows.map(toDto));
});

const schema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  location: z.string().default(""),
  rating: z.number().int().min(1).max(5).default(5),
  text: z.string().min(1),
  avatar: z.string().default(""),
  product: z.string().default(""),
  sortOrder: z.number().int().optional(),
});

// POST /api/testimonials  (admin)
testimonialsRouter.post("/", requireAdmin, async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const d = parsed.data;
  const saved = await prisma.testimonial.upsert({
    where: { id: d.id },
    create: { ...d, sortOrder: d.sortOrder ?? 0 },
    update: { ...d, sortOrder: d.sortOrder ?? 0 },
  });
  res.status(201).json(toDto(saved));
});

// DELETE /api/testimonials/:id  (admin)
testimonialsRouter.delete("/:id", requireAdmin, async (req, res) => {
  try {
    await prisma.testimonial.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: "Відгук не знайдено" });
  }
});
