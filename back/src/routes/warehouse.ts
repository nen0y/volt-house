import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAdmin, requireSuperAdmin, AuthedRequest } from "../middleware/auth";

export const warehouseRouter = Router();

// GET /api/warehouse/balance
warehouseRouter.get("/balance", requireAdmin, async (req, res) => {
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const category = typeof req.query.category === "string" && req.query.category !== "all" ? req.query.category : null;
  const brand = typeof req.query.brand === "string" && req.query.brand !== "all" ? req.query.brand : null;

  const products = await prisma.product.findMany({
    where: {
      enabled: true,
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
      ...(brand ? { brandSlug: brand } : {}),
      ...(category ? { categoryLinks: { some: { categoryKey: category } } } : {}),
    },
    select: {
      id: true, name: true, category: true, image: true, brandSlug: true, price: true,
      brand: { select: { name: true } },
      warehouseItems: { select: { id: true, quantity: true, supplierId: true, purchasePrice: true, notes: true, createdAt: true, supplier: { select: { id: true, name: true } } } },
      reservations: {
        where: { status: { in: ["active", "found"] } },
        select: { id: true, leadId: true, quantity: true, status: true, lead: { select: { name: true, phone: true } }, product: { select: { id: true, name: true } } },
      },
    },
    orderBy: { name: "asc" },
  });

  const result = products.map((p) => {
    const totalQty = p.warehouseItems.reduce((sum, item) => sum + item.quantity, 0);
    const reservedQty = p.reservations.reduce((sum, r) => sum + r.quantity, 0);
    return {
      product: { id: p.id, name: p.name, category: p.category, image: p.image, brandSlug: p.brandSlug, brandName: p.brand?.name || null, suggestedSalePrice: p.price },
      totalQty,
      reservedQty,
      availableQty: Math.max(0, totalQty - reservedQty),
      warehouseItems: p.warehouseItems,
      reservations: p.reservations,
    };
  }).filter((p) => p.totalQty > 0 || p.reservedQty > 0);

  res.json(result);
});

// POST /api/warehouse/balance
warehouseRouter.post("/balance", requireAdmin, requireSuperAdmin, async (req: AuthedRequest, res) => {
  const schema = z.object({
    productId: z.string(),
    quantity: z.number().int().positive(),
    supplierId: z.string().optional().nullable(),
    purchasePrice: z.number().int().min(0).optional().nullable(),
    notes: z.string().max(500).default(""),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Некоректні дані" });
  const d = parsed.data;
  const product = await prisma.product.findUnique({ where: { id: d.productId } });
  if (!product) return res.status(404).json({ error: "Товар не знайдено" });
  const item = await prisma.warehouseItem.create({
    data: { productId: d.productId, quantity: d.quantity, supplierId: d.supplierId || null, purchasePrice: d.purchasePrice ?? null, notes: d.notes },
    include: { product: { select: { id: true, name: true } }, supplier: { select: { id: true, name: true } } },
  });
  res.status(201).json(item);
});

// PUT /api/warehouse/balance/:id
warehouseRouter.put("/balance/:id", requireAdmin, requireSuperAdmin, async (req, res) => {
  const schema = z.object({
    quantity: z.number().int().min(0).optional(),
    supplierId: z.string().optional().nullable(),
    purchasePrice: z.number().int().min(0).optional().nullable(),
    notes: z.string().max(500).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Некоректні дані" });
  try {
    const item = await prisma.warehouseItem.update({ where: { id: req.params.id }, data: parsed.data });
    res.json(item);
  } catch { res.status(404).json({ error: "Запис не знайдено" }); }
});

// DELETE /api/warehouse/balance/:id
warehouseRouter.delete("/balance/:id", requireAdmin, requireSuperAdmin, async (req, res) => {
  try { await prisma.warehouseItem.delete({ where: { id: req.params.id } }); res.json({ ok: true }); }
  catch { res.status(404).json({ error: "Запис не знайдено" }); }
});

// GET /api/warehouse/reservations
warehouseRouter.get("/reservations", requireAdmin, async (req, res) => {
  const status = typeof req.query.status === "string" && req.query.status !== "all" ? req.query.status : undefined;
  const reservations = await prisma.reservation.findMany({
    where: { ...(status ? { status } : { status: { notIn: ["cancelled", "completed"] } }) },
    include: {
      lead: { select: { id: true, name: true, phone: true, status: true } },
      product: { select: { id: true, name: true, category: true, image: true } },
      supplier: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(reservations);
});

// PATCH /api/warehouse/reservations/:id
warehouseRouter.patch("/reservations/:id", requireAdmin, requireSuperAdmin, async (req: AuthedRequest, res) => {
  const schema = z.object({
    searcherName: z.string().max(200).optional(),
    searchStatus: z.enum(["searching", "not_found", "found"]).optional(),
    supplierId: z.string().optional().nullable(),
    notes: z.string().max(1000).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Некоректні дані" });
  try {
    const reservation = await prisma.reservation.findUniqueOrThrow({ where: { id: req.params.id } });
    const d = parsed.data;
    if (d.searchStatus === "found" && reservation.searchStatus !== "found") {
      await prisma.$transaction(async (tx) => {
        await tx.warehouseItem.create({
          data: { productId: reservation.productId, quantity: reservation.quantity, supplierId: d.supplierId || null, notes: `Знайдено для резерву клієнта` },
        });
        await tx.reservation.update({
          where: { id: req.params.id },
          data: { status: "found", searchStatus: "found", searcherName: d.searcherName ?? reservation.searcherName, supplierId: d.supplierId !== undefined ? (d.supplierId || null) : reservation.supplierId, notes: d.notes ?? reservation.notes },
        });
      });
    } else {
      await prisma.reservation.update({
        where: { id: req.params.id },
        data: {
          ...(d.searcherName !== undefined ? { searcherName: d.searcherName } : {}),
          ...(d.searchStatus !== undefined ? { searchStatus: d.searchStatus } : {}),
          ...(d.supplierId !== undefined ? { supplierId: d.supplierId || null } : {}),
          ...(d.notes !== undefined ? { notes: d.notes } : {}),
        },
      });
    }
    const updated = await prisma.reservation.findUnique({
      where: { id: req.params.id },
      include: {
        lead: { select: { id: true, name: true, phone: true, status: true } },
        product: { select: { id: true, name: true, category: true, image: true } },
        supplier: { select: { id: true, name: true } },
      },
    });
    res.json(updated);
  } catch { res.status(404).json({ error: "Резерв не знайдено" }); }
});
