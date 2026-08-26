import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAdmin } from "../middleware/auth";
import { parseStringArray } from "../json";
import { upload, deleteUploadByUrl } from "../upload";

export const productsRouter = Router();
const productIncludes = { brand: true, categoryLinks: { select: { categoryKey: true } } } as const;

// Shape the storefront expects (drops internal columns like sortOrder/timestamps).
function toDto(p: any) {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    categoryKeys: p.categoryLinks?.length ? p.categoryLinks.map((link: any) => link.categoryKey) : [p.category],
    brandSlug: p.brandSlug ?? undefined,
    brand: p.brand ? { slug: p.brand.slug, name: p.brand.name, logo: p.brand.logo, country: p.brand.country } : undefined,
    price: p.price,
    originalPrice: p.originalPrice ?? undefined,
    power: p.power ?? undefined,
    capacity: p.capacity ?? undefined,
    efficiency: p.efficiency ?? undefined,
    warranty: p.warranty,
    badge: p.badge ?? undefined,
    features: parseStringArray(p.features),
    image: p.image,
    images: parseStringArray(p.images),
    enabled: p.enabled,
  };
}

// GET /api/products?category=inverter
productsRouter.get("/", async (req, res) => {
  const category = typeof req.query.category === "string" ? req.query.category : undefined;
  let categoryKeys: string[] = [];
  if (category && category !== "all") {
    const categories = await prisma.category.findMany({ select: { key: true, parentKey: true } });
    categoryKeys = [category];
    for (let i = 0; i < categoryKeys.length; i++) {
      categories.filter((c) => c.parentKey === categoryKeys[i]).forEach((c) => {
        if (!categoryKeys.includes(c.key)) categoryKeys.push(c.key);
      });
    }
  }
  const where = categoryKeys.length
    ? { enabled: true, OR: [{ category: { in: categoryKeys } }, { categoryLinks: { some: { categoryKey: { in: categoryKeys } } } }] }
    : { enabled: true };
  const rows = await prisma.product.findMany({
    where,
    include: productIncludes,
    orderBy: [{ sortOrder: "asc" }, { price: "asc" }],
  });
  res.json(rows.map(toDto));
});

// GET /api/products/admin/all — includes disabled products for management.
productsRouter.get("/admin/all", requireAdmin, async (_req, res) => {
  const rows = await prisma.product.findMany({
    include: productIncludes,
    orderBy: [{ enabled: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
  });
  res.json(rows.map(toDto));
});

// GET /api/products/:id
productsRouter.get("/:id", async (req, res) => {
  const p = await prisma.product.findFirst({ where: { id: req.params.id, enabled: true }, include: productIncludes });
  if (!p) return res.status(404).json({ error: "Товар не знайдено" });
  res.json(toDto(p));
});

const productSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  categoryKeys: z.array(z.string().min(1)).optional(),
  brandSlug: z.string().nullable().optional(),
  price: z.number().int().nonnegative(),
  originalPrice: z.number().int().nonnegative().nullish(),
  power: z.string().nullish(),
  capacity: z.string().nullish(),
  efficiency: z.string().nullish(),
  warranty: z.string().min(1),
  badge: z.string().nullish(),
  features: z.array(z.string()).default([]),
  image: z.string().default(""),
  enabled: z.boolean().default(true),
  sortOrder: z.number().int().optional(),
});

// POST /api/products  (admin) — create or upsert
productsRouter.post("/", requireAdmin, async (req, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const d = parsed.data;
  const data = {
    name: d.name,
    category: d.category,
    brandSlug: d.brandSlug || null,
    price: d.price,
    originalPrice: d.originalPrice ?? null,
    power: d.power ?? null,
    capacity: d.capacity ?? null,
    efficiency: d.efficiency ?? null,
    warranty: d.warranty,
    badge: d.badge ?? null,
    features: JSON.stringify(d.features),
    image: d.image,
    enabled: d.enabled,
    sortOrder: d.sortOrder ?? 0,
  };
  const saved = await prisma.product.upsert({
    where: { id: d.id },
    create: { id: d.id, ...data },
    update: data,
  });
  const categoryKeys = Array.from(new Set([d.category, ...(d.categoryKeys ?? [])]));
  await prisma.productCategoryLink.deleteMany({ where: { productId: saved.id } });
  await prisma.productCategoryLink.createMany({ data: categoryKeys.map((categoryKey) => ({ productId: saved.id, categoryKey })) });
  const result = await prisma.product.findUnique({ where: { id: saved.id }, include: productIncludes });
  res.status(201).json(toDto(result));
});

// PUT /api/products/:id  (admin)
productsRouter.put("/:id", requireAdmin, async (req, res) => {
  const parsed = productSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const exists = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!exists) return res.status(404).json({ error: "Товар не знайдено" });

  const { id: requestedId, features, ...rest } = parsed.data;
  const nextId = requestedId?.trim() || req.params.id;
  if (nextId !== req.params.id) {
    const collision = await prisma.product.findUnique({ where: { id: nextId }, select: { id: true } });
    if (collision) return res.status(409).json({ error: "Товар із таким slug уже існує" });
  }
  const categoryKeysInput = rest.categoryKeys;
  delete rest.categoryKeys;
  const data: Record<string, unknown> = { ...rest, ...(nextId !== req.params.id ? { id: nextId } : {}) };
  if (features !== undefined) data.features = JSON.stringify(features);

  const saved = await prisma.$transaction(async (tx) => {
    const updated = await tx.product.update({ where: { id: req.params.id }, data: data as any });

    if (nextId !== req.params.id) {
      const [homeSections, contentBlocks] = await Promise.all([
        tx.homeSection.findMany({ select: { id: true, productIds: true } }),
        tx.contentBlock.findMany({ select: { key: true, productIds: true } }),
      ]);
      for (const section of homeSections) {
        const ids = parseStringArray(section.productIds);
        if (ids.includes(req.params.id)) {
          await tx.homeSection.update({
            where: { id: section.id },
            data: { productIds: JSON.stringify(ids.map((id) => (id === req.params.id ? nextId : id))) },
          });
        }
      }
      for (const block of contentBlocks) {
        const ids = parseStringArray(block.productIds);
        if (ids.includes(req.params.id)) {
          await tx.contentBlock.update({
            where: { key: block.key },
            data: { productIds: JSON.stringify(ids.map((id) => (id === req.params.id ? nextId : id))) },
          });
        }
      }
    }

    if (categoryKeysInput !== undefined || parsed.data.category !== undefined) {
      const primary = parsed.data.category ?? exists.category;
      const categoryKeys = Array.from(new Set([primary, ...(categoryKeysInput ?? [])]));
      await tx.productCategoryLink.deleteMany({ where: { productId: updated.id } });
      await tx.productCategoryLink.createMany({ data: categoryKeys.map((categoryKey) => ({ productId: updated.id, categoryKey })) });
    }
    return updated;
  });
  const result = await prisma.product.findUnique({ where: { id: saved.id }, include: productIncludes });
  res.json(toDto(result));
});

// DELETE /api/products/:id  (admin)
productsRouter.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (product) parseStringArray(product.images).forEach(deleteUploadByUrl);
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: "Товар не знайдено" });
  }
});

// ── Product images ──────────────────────────────────────────────────────────
// multer wrapper that returns a clean 400 instead of a 500 on upload errors
function uploadImages(req: any, res: any, next: any) {
  upload.array("images", 10)(req, res, (err: any) => {
    if (err) return res.status(400).json({ error: err.message || "Помилка завантаження" });
    next();
  });
}

// POST /api/products/:id/images  (admin) — upload one or more images
productsRouter.post("/:id/images", requireAdmin, uploadImages, async (req, res) => {
  const product = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!product) return res.status(404).json({ error: "Товар не знайдено" });
  const files = (req.files as Express.Multer.File[]) || [];
  if (!files.length) return res.status(400).json({ error: "Файли не надіслано" });
  const images = [...parseStringArray(product.images), ...files.map((f) => `/uploads/${f.filename}`)];
  const saved = await prisma.product.update({
    where: { id: product.id },
    data: { images: JSON.stringify(images) },
  });
  res.status(201).json(toDto(saved));
});

// DELETE /api/products/:id/images  (admin) — remove one image (body: { url })
productsRouter.delete("/:id/images", requireAdmin, async (req, res) => {
  const product = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!product) return res.status(404).json({ error: "Товар не знайдено" });
  const url = typeof req.body?.url === "string" ? req.body.url : "";
  const current = parseStringArray(product.images);
  const images = current.filter((u) => u !== url);
  if (images.length !== current.length) deleteUploadByUrl(url);
  const saved = await prisma.product.update({
    where: { id: product.id },
    data: { images: JSON.stringify(images) },
  });
  res.json(toDto(saved));
});
