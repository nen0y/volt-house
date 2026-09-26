import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAdmin, requireSuperAdmin, AuthedRequest } from "../middleware/auth";

import { stockSummary } from "../stock";

export const warehouseRouter = Router();

// GET /api/warehouse/balance
warehouseRouter.get("/balance", requireAdmin, async (req: AuthedRequest, res) => {
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const category = typeof req.query.category === "string" && req.query.category !== "all" ? req.query.category : null;
  const brand = typeof req.query.brand === "string" && req.query.brand !== "all" ? req.query.brand : null;

  const products = await prisma.product.findMany({
    where: {

      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
      ...(brand ? { brandSlug: brand } : {}),
      ...(category ? { categoryLinks: { some: { categoryKey: category } } } : {}),
    },
    select: {
      id: true, name: true, category: true, image: true, brandSlug: true, price: true, enabled: true,
      brand: { select: { name: true } },
      warehouseItems: { select: { id: true, quantity: true, arrivalDate: true, supplierId: true, purchasePrice: true, notes: true, createdAt: true, supplier: { select: { id: true, name: true } } } },
      reservations: {
        where: { status: { in: ["active", "found"] } },
        select: { id: true, leadId: true, quantity: true, status: true, deductedQty: true, lead: { select: { name: true, phone: true } }, product: { select: { id: true, name: true } } },
      },
    },
    orderBy: { name: "asc" },
  });

  const isAdmin = req.admin!.role === "admin";
  const result = products.map((p) => {
    const warehouseItems = isAdmin ? p.warehouseItems : p.warehouseItems.map(({ purchasePrice, ...item }) => item);
    return {
      product: { id: p.id, name: p.name, category: p.category, image: p.image, brandSlug: p.brandSlug, brandName: p.brand?.name || null, suggestedSalePrice: p.price, enabled: p.enabled },
      ...stockSummary(p.warehouseItems, p.reservations),
      warehouseItems,
      reservations: p.reservations,
    };
  }).filter((p) => p.warehouseItems.length > 0 || p.reservedQty > 0);

  res.json(result);
});

// POST /api/warehouse/balance
warehouseRouter.post("/balance", requireAdmin, requireSuperAdmin, async (req: AuthedRequest, res) => {
  const schema = z.object({
    productId: z.string(),
    quantity: z.number().int().positive(),
    arrivalDate: z.string().date().nullable().optional(),
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
    data: { productId: d.productId, quantity: d.quantity, arrivalDate: d.arrivalDate ?? null, supplierId: d.supplierId || null, purchasePrice: d.purchasePrice ?? null, notes: d.notes },
    include: { product: { select: { id: true, name: true } }, supplier: { select: { id: true, name: true } } },
  });
  res.status(201).json(item);
});

// PUT /api/warehouse/balance/:id
warehouseRouter.put("/balance/:id", requireAdmin, requireSuperAdmin, async (req, res) => {
  const schema = z.object({
    quantity: z.number().int().min(0).optional(),
    arrivalDate: z.string().date().nullable().optional(),
    supplierId: z.string().optional().nullable(),
    purchasePrice: z.number().int().min(0).optional().nullable(),
    notes: z.string().max(500).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Некоректні дані" });
  try {
    const item = await prisma.$transaction(async (tx) => {
      const current = await tx.warehouseItem.findUnique({ where: { id: req.params.id } });
      if (!current) return null;
      const reducing = (parsed.data.quantity !== undefined && parsed.data.quantity < current.quantity) || (!current.arrivalDate && !!parsed.data.arrivalDate);
      if (reducing && await tx.reservation.count({ where: { productId: current.productId, status: { in: ["active", "found"] } } })) {
        throw new Error("Товар має активні резерви. Спочатку звільніть резерви, щоб зменшити партію або перевести її в очікувані.");
      }
      return tx.warehouseItem.update({ where: { id: req.params.id }, data: parsed.data });
    }, { isolationLevel: "Serializable" });
    if (!item) return res.status(404).json({ error: "Запис не знайдено" });
    res.json(item);
  } catch (error) { res.status(409).json({ error: error instanceof Error && !error.message.includes("prisma") ? error.message : "Залишок змінився. Оновіть склад і повторіть дію." }); }
});

// DELETE /api/warehouse/balance/:id
warehouseRouter.delete("/balance/:id", requireAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const deleted = await prisma.$transaction(async (tx) => {
      const item = await tx.warehouseItem.findUnique({ where: { id: req.params.id } });
      if (!item) return false;
      if (item.quantity > 0 && await tx.reservation.count({ where: { productId: item.productId, status: { in: ["active", "found"] } } })) {
        throw new Error("Товар має активні резерви. Спочатку звільніть резерви або видаліть лише порожню партію.");
      }
      await tx.warehouseItem.delete({ where: { id: item.id } });
      return true;
    }, { isolationLevel: "Serializable" });
    if (!deleted) return res.status(404).json({ error: "Запис не знайдено" });
    res.json({ ok: true });
  } catch (error) { res.status(409).json({ error: error instanceof Error && !error.message.includes("prisma") ? error.message : "Не вдалося видалити партію. Оновіть склад і повторіть дію." }); }
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
          data: { status: "found", deductedQty: 0, searchStatus: "found", searcherName: d.searcherName ?? reservation.searcherName, supplierId: d.supplierId !== undefined ? (d.supplierId || null) : reservation.supplierId, notes: d.notes ?? reservation.notes },
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
