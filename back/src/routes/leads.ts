import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAdmin, requireSuperAdmin, AuthedRequest } from "../middleware/auth";
import { sendLeadTelegram, sendUnavailableProductTelegram } from "../telegram";
import { leadsLimiter } from "../middleware/rateLimit";
import { parseItems } from "../json";

import { stockInclude, productStock, deductedStock, takeReceivedStock, restoreReceivedStock } from "../stock";

import { resolveCosts, commissionFor, COMMISSION_PERCENT } from "../commission";

export const leadsRouter = Router();

// items is stored as a JSON string (SQLite) — expose it as an array to clients.
function toDto(l: any, isAdmin = true) {
  const { reservations, ...rest } = l;
  const items = parseItems(l.items) || [];
  const safeItems = isAdmin ? items : items.map(({ purchasePrice, warehouseItemId, ...item }) => item);
  return { ...rest, items: safeItems, financials: isAdmin ? commissionFor(items, l.total) : null, reservations: reservations || [] };
}

const itemSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number().int().nonnegative(),
  warehouseItemId: z.string().nullish(),
  quantity: z.number().int().positive(),
  availability: z.enum(["in_stock", "preorder", "unavailable"]).optional(),
  custom: z.boolean().optional(),
});

const leadSchema = z.object({
  type: z.enum(["order", "consultation", "callback"]),
  name: z.string().min(1, "Вкажіть ім'я"),
  phone: z.string().min(3, "Вкажіть телефон"),
  email: z.string().email().optional().or(z.literal("")),
  interest: z.string().optional(),
  message: z.string().optional(),
  items: z.array(itemSchema).optional(),
  total: z.number().optional(),
});

// POST /api/leads — public. Saves the lead and notifies the administrator.
leadsRouter.post("/", leadsLimiter, async (req, res) => {
  const parsed = leadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Некоректні дані", details: parsed.error.flatten() });
  }
  const d = parsed.data;

  const lead = await prisma.lead.create({
    data: {
      type: d.type,
      name: d.name,
      phone: d.phone,
      email: d.email || null,
      interest: d.interest || null,
      message: d.message || null,
      items: d.items && d.items.length ? JSON.stringify(d.items) : null,
      total: d.total ?? null,
    },
  });

  // Notify the admin's Telegram group; failure never blocks the response.
  const tg = await sendLeadTelegram({
    id: lead.id,
    type: lead.type,
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    interest: lead.interest,
    message: lead.message,
    items: d.items?.length ? d.items : null,
    total: d.total ?? null,
    createdAt: lead.createdAt,
  });

  res.status(201).json({
    ok: true,
    id: lead.id,
    telegram: tg.skipped ? false : tg.ok,
  });
});

// GET /api/leads?type=order&status=new  (admin)
const managerSelect = { id: true, name: true, email: true } as const;
const leadInclude = {
  manager: { select: { id: true, name: true, email: true } },
  soldBy: { select: { id: true, name: true, email: true } },
  reservations: {
    where: { status: { notIn: ["cancelled", "completed" as string] } },
    include: { product: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" as const },
  },
};

leadsRouter.get("/", requireAdmin, async (req: AuthedRequest, res) => {
  const type = typeof req.query.type === "string" && req.query.type !== "all" ? req.query.type : undefined;
  const status =
    typeof req.query.status === "string" && req.query.status !== "all" ? req.query.status : undefined;
  const requestedManager = typeof req.query.managerId === "string" ? req.query.managerId : undefined;
  const managerWhere = requestedManager === "unassigned" ? { managerId: null }
      : requestedManager && requestedManager !== "all" ? { managerId: requestedManager } : {};
  const rows = await prisma.lead.findMany({
    where: { ...(type ? { type } : {}), ...(status ? { status } : {}), ...managerWhere },
    include: leadInclude,
    orderBy: { createdAt: "desc" },
  });
  const isAdmin = req.admin!.role === "admin";
  res.json(rows.map((r) => toDto(r, isAdmin)));
});

// Product picker for CRM leads, including the best known supplier availability.
leadsRouter.get("/product-options", requireAdmin, async (req: AuthedRequest, res) => {
  const products = await prisma.product.findMany({
    where: { enabled: true },
    select: { ...stockInclude, warehouseItems: { select: { id: true, quantity: true, arrivalDate: true, purchasePrice: true, supplier: { select: { name: true } } } }, id: true, name: true, price: true, supplierPrices: { where: { supplier: { active: true } }, select: { availability: true, price: true, arrivalDate: true } } },
    orderBy: { name: "asc" },
  });
  res.json(products.map((product) => {
    const available = product.supplierPrices.filter((row) => row.price > 0);
    const supplierAvailability = available.some((row) => row.availability === "in_stock" && (!row.arrivalDate || row.arrivalDate <= new Date())) ? "in_stock"
      : available.some((row) => row.availability === "preorder") ? "preorder" : "unavailable";
    const stock = productStock(product);
    const availability = stock.availability === "unavailable" ? supplierAvailability : stock.availability;
    const isAdmin = req.admin!.role === "admin";
    return { id: product.id, name: product.name, price: product.price, availability, supplierAvailability, stock, batches: isAdmin ? product.warehouseItems.map((b) => ({ id: b.id, quantity: b.quantity, arrivalDate: b.arrivalDate, purchasePrice: b.purchasePrice, supplierName: b.supplier?.name || "Без постачальника" })) : [] };
  }));
});

// GET /api/leads/stats  (admin)
leadsRouter.get("/stats", requireAdmin, async (_req, res) => {
  const [total, orders, consultations, callbacks, fresh] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { type: "order" } }),
    prisma.lead.count({ where: { type: "consultation" } }),
    prisma.lead.count({ where: { type: "callback" } }),
    prisma.lead.count({ where: { status: "new" } }),
  ]);
  res.json({ total, orders, consultations, callbacks, new: fresh });
});

leadsRouter.get("/managers", requireAdmin, async (_req, res) => {
  const managers = await prisma.adminUser.findMany({
    where: { role: "manager", active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  res.json(managers);
});

const manualLeadSchema = leadSchema.extend({
  status: z.enum(["new", "no_answer", "contacted", "sourcing", "proposal", "won", "lost"]).default("new"),
  paymentStatus: z.enum(["unpaid", "partial", "paid"]).default("unpaid"),
  deliveryStatus: z.enum(["not_sent", "preparing", "sent", "received", "returned"]).default("not_sent"),
  callbackAt: z.string().datetime({ offset: true }).nullable().optional(),
  callbackNote: z.string().trim().max(1000).default(""),
  waitingForStock: z.boolean().default(false),
  waitingProduct: z.string().trim().max(500).default(""),
  notes: z.string().max(5000).default(""),
  managerId: z.string().nullable().optional(),
});

// POST /api/leads/admin — create a client manually in CRM.
leadsRouter.post("/admin", requireAdmin, async (req: AuthedRequest, res) => {
  const parsed = manualLeadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Некоректні дані", details: parsed.error.flatten() });
  const d = parsed.data;
  if (d.callbackAt && new Date(d.callbackAt).getTime() <= Date.now()) return res.status(400).json({ error: "Оберіть майбутню дату й час передзвону" });
  if (d.managerId && req.admin!.role !== "admin") return res.status(403).json({ error: "Менеджера може призначати лише адміністратор" });
  if (d.managerId) {
    const manager = await prisma.adminUser.findFirst({ where: { id: d.managerId, role: "manager", active: true } });
    if (!manager) return res.status(400).json({ error: "Оберіть активного менеджера" });
  }
  let costedItems;
  try { costedItems = await resolveCosts(prisma, d.items || []); }
  catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : "Перевірте складську партію" }); }
  const lead = await prisma.lead.create({
    data: {
      type: d.type,
      name: d.name,
      phone: d.phone,
      email: d.email || null,
      interest: d.interest || null,
      message: d.message || null,
      items: costedItems.length ? JSON.stringify(costedItems) : null,
      total: d.total ?? null,
      status: d.status,
      paymentStatus: d.paymentStatus,
      deliveryStatus: d.deliveryStatus,
      notes: d.notes,
      callbackAt: d.callbackAt ? new Date(d.callbackAt) : null,
      callbackNote: d.callbackNote,
      waitingForStock: d.waitingForStock,
      waitingProduct: d.waitingProduct,
      managerId: req.admin!.role === "manager" ? req.admin!.id : (d.managerId || null),
      ...(d.status === "won" ? { soldById: d.managerId || req.admin!.id, wonAt: new Date() } : {}),
    },
  });

  // Manual CRM entries use a separate endpoint from storefront leads, so notify
  // Telegram for every type here as well. Delivery failures must not roll back
  // the saved entry.
  await sendLeadTelegram({
    id: lead.id,
    type: lead.type,
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    interest: lead.interest,
    message: lead.message,
    items: d.items?.length ? d.items : null,
    total: d.total ?? null,
    createdAt: lead.createdAt,
  });

  for (const item of d.items || []) {
    if (item.custom || item.availability === "unavailable") await sendUnavailableProductTelegram({ id: lead.id, name: lead.name, phone: lead.phone, productName: item.name });
  }
  const created = await prisma.lead.findUnique({ where: { id: lead.id }, include: leadInclude });
  res.status(201).json(toDto(created, req.admin!.role === "admin"));
});

leadsRouter.get("/manager-stats", requireAdmin, requireSuperAdmin, async (req, res) => {
  const month = typeof req.query.month === "string" && /^\d{4}-\d{2}$/.test(req.query.month) ? req.query.month : new Date().toISOString().slice(0, 7);
  const [year, monthNumber] = month.split("-").map(Number);
  const from = new Date(Date.UTC(year, monthNumber - 1, 1));
  const to = new Date(Date.UTC(year, monthNumber, 1));
  const managers = await prisma.adminUser.findMany({
    where: { role: "manager" },
    select: {
      id: true, name: true, email: true, active: true, commissionPercent: true,
      soldLeads: { where: { status: "won", wonAt: { gte: from, lt: to } }, select: { total: true, items: true } },
    },
    orderBy: { name: "asc" },
  });
  const result = await Promise.all(managers.map(async ({ soldLeads, ...manager }) => {
    const values = await Promise.all(soldLeads.map(async (lead) => {
      const items = parseItems(lead.items) || [];
      return commissionFor(await resolveCosts(prisma, items, items), lead.total);
    }));
    const sum = (key: "salesTotal" | "purchaseTotal" | "margin" | "commission") => Math.round(values.reduce((total, row) => total + (row[key] ?? 0), 0) * 100) / 100;
    return { ...manager, commissionPercent: COMMISSION_PERCENT, wonCount: soldLeads.length, salesTotal: sum("salesTotal"), purchaseTotal: sum("purchaseTotal"), margin: sum("margin"), salary: sum("commission"), pendingCostCount: values.filter((row) => row.commission == null).length };
  }));
  res.json({ month, managers: result });
});

const statusSchema = z.object({
  type: z.enum(["order", "consultation", "callback"]).optional(),
  name: z.string().min(1, "Вкажіть ім'я").optional(),
  phone: z.string().min(3, "Вкажіть телефон").optional(),
  email: z.string().email().optional().or(z.literal("")),
  interest: z.string().optional(),
  message: z.string().optional(),
  status: z.enum(["new", "no_answer", "contacted", "sourcing", "proposal", "won", "lost", "in_progress", "done"]).optional(),
  paymentStatus: z.enum(["unpaid", "partial", "paid"]).optional(),
  deliveryStatus: z.enum(["not_sent", "preparing", "sent", "received", "returned"]).optional(),
  callbackAt: z.string().datetime({ offset: true }).nullable().optional(),
  callbackNote: z.string().trim().max(1000).optional(),
  waitingForStock: z.boolean().optional(),
  waitingProduct: z.string().trim().max(500).optional(),
  notes: z.string().max(5000).optional(),
  items: z.array(itemSchema).optional(),
  managerId: z.string().nullable().optional(),
  expectedManagerId: z.string().nullable().optional(),
  total: z.number().min(0).optional(),
  reservedProducts: z.array(z.object({ productId: z.string(), quantity: z.number().int().positive() })).optional(),
});

// PATCH /api/leads/:id  (admin) — update CRM fields
leadsRouter.patch("/:id", requireAdmin, async (req: AuthedRequest, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return res.status(400).json({ error: "Некоректні дані" });
  }
  try {
    const previous = await prisma.lead.findUnique({ where: { id: req.params.id } });
    if (!previous) return res.status(404).json({ error: "Заявку не знайдено" });
    const { items, email, interest, message, managerId, expectedManagerId, total, callbackAt, reservedProducts, ...fields } = parsed.data;
    if (callbackAt && new Date(callbackAt).getTime() !== previous.callbackAt?.getTime() && new Date(callbackAt).getTime() <= Date.now()) return res.status(400).json({ error: "Оберіть майбутню дату й час передзвону" });
    if (req.admin!.role === "manager") {
      if (managerId !== undefined && managerId !== req.admin!.id) return res.status(403).json({ error: "Ви можете призначити заявку лише собі" });
      if (previous.managerId !== req.admin!.id) {
        if (managerId !== req.admin!.id) return res.status(409).json({ error: "Спочатку візьміть заявку собі" });
        if (previous.managerId && expectedManagerId !== previous.managerId) return res.status(409).json({ error: "Відповідальний менеджер змінився. Оновіть список і натисніть «Перебрати собі»" });
        if (expectedManagerId !== undefined && expectedManagerId !== previous.managerId) return res.status(409).json({ error: "Відповідальний менеджер змінився. Оновіть список заявок" });
      }
    }
    if (managerId && managerId !== previous.managerId) {
      const manager = await prisma.adminUser.findFirst({ where: { id: managerId, role: "manager", active: true } });
      if (!manager) return res.status(400).json({ error: "Оберіть активного менеджера" });
    }
    // Expected batches can be reserved but cannot be sold before receipt.
    if (fields.status === "won" && previous.status !== "won") {
      const reservations = await prisma.reservation.findMany({ where: { leadId: previous.id, status: { notIn: ["cancelled", "completed"] } } });
      const productIds = [...new Set([...(items ?? parseItems(previous.items) ?? []).map((item) => item.id), ...reservations.map((r) => r.productId)])];
      for (const productId of productIds) {
        const batches = await prisma.warehouseItem.findMany({ where: { productId } });
        if (batches.some((batch) => batch.arrivalDate && batch.quantity > 0) && !batches.some((batch) => !batch.arrivalDate && batch.quantity > 0) && !reservations.some((r) => r.productId === productId && deductedStock(r) > 0)) {
          return res.status(409).json({ error: "Товар очікується на складі — доступне лише бронювання. Спочатку підтвердьте надходження партії." });
        }
      }
    }
    const effectiveManagerId = managerId !== undefined ? managerId : previous.managerId;
    const enteringWon = fields.status === "won" && previous.status !== "won";
    const correctingWonSeller = req.admin!.role === "admin" && previous.status === "won" && managerId !== undefined && managerId !== previous.managerId && !!managerId;
    const salesChanged = items !== undefined && JSON.stringify(items.map(({ id, price, quantity }) => ({ id, price, quantity }))) !== JSON.stringify((parseItems(previous.items) || []).map(({ id, price, quantity }) => ({ id, price, quantity })));
    const data = {
      ...fields,
      ...(callbackAt !== undefined && (callbackAt ? new Date(callbackAt).getTime() : null) !== (previous.callbackAt?.getTime() ?? null) ? {
        callbackAt: callbackAt ? new Date(callbackAt) : null, callbackSentAt: null, callbackClaimedAt: null,
      } : {}),
      ...(managerId !== undefined ? { managerId } : {}),
      ...(enteringWon ? { soldById: effectiveManagerId || req.admin!.id, wonAt: new Date() } : {}),
      ...(correctingWonSeller ? { soldById: managerId, ...(!previous.wonAt ? { wonAt: new Date() } : {}) } : {}),
      ...(email !== undefined ? { email: email || null } : {}),
      ...(interest !== undefined ? { interest: interest || null } : {}),
      ...(message !== undefined ? { message: message || null } : {}),
      ...(items !== undefined ? {
        items: items.length ? JSON.stringify(items) : null,
      } : {}),
      ...(total !== undefined && !(salesChanged && total === previous.total) ? { total } : items !== undefined ? { total: items.reduce((sum, item) => sum + item.price * item.quantity, 0) } : {}),
    };
    // Compare ownership in the write itself so a former manager cannot save
    // a stale card after another manager has taken it over.
    await prisma.$transaction(async (tx) => {
      if (items !== undefined) {
        const costedItems = await resolveCosts(tx, items, parseItems(previous.items) || []);
        data.items = costedItems.length ? JSON.stringify(costedItems) : null;
      }
      const runStockChange = async (fn: (client: typeof tx) => Promise<void>) => fn(tx);
    const saved = await tx.lead.updateMany({
      where: { id: req.params.id, ...(req.admin!.role === "manager" ? { managerId: previous.managerId } : {}) },
      data,
    });
    if (!saved.count) throw new Error("Відповідальний менеджер змінився. Оновіть список заявок");

    // Reservation logic after lead status change
    const RESERVE_STATUSES = ["contacted", "sourcing", "proposal"];
    if (fields.status && fields.status !== previous.status) {
      const existingReservations = await tx.reservation.findMany({
        where: { leadId: req.params.id, status: { notIn: ["cancelled", "completed"] } },
      });

      if (RESERVE_STATUSES.includes(fields.status)) {
        if (!existingReservations.length) {
          // Create new reservations for each product in the list
          if (reservedProducts && reservedProducts.length > 0) {
            const reservationStatus = fields.status === "sourcing" ? "searching" : "active";
            await runStockChange(async (tx) => {
              for (const { productId, quantity } of reservedProducts) {
                const reservation = await tx.reservation.create({ data: { leadId: req.params.id, productId, quantity, status: reservationStatus, deductedQty: 0, searchStatus: reservationStatus === "searching" ? "searching" : "found" } });
                if (reservationStatus === "active") {
                  const deductedQty = await takeReceivedStock(tx, productId, quantity);
                  await tx.reservation.update({ where: { id: reservation.id }, data: { deductedQty } });
                }
              }
            });
          }
        } else {
          // Update all existing reservations for the new status
          const newResStatus = fields.status === "sourcing" ? "searching" : "active";
          await runStockChange(async (tx) => {
            for (const r of existingReservations) {
              if (r.status === newResStatus || r.status === "found") continue;
              if (r.status === "active" && newResStatus === "searching") {
                await tx.reservation.update({ where: { id: r.id }, data: { status: "searching", searchStatus: "searching", deductedQty: 0 } });
                await restoreReceivedStock(tx, r);
              } else if (r.status === "searching" && newResStatus === "active") {
                await tx.reservation.update({ where: { id: r.id }, data: { status: "active", deductedQty: 0 } });
                const deductedQty = await takeReceivedStock(tx, r.productId, r.quantity);
                await tx.reservation.update({ where: { id: r.id }, data: { deductedQty } });
              }
            }
          });
        }
      } else if (fields.status === "won") {
        await runStockChange(async (tx) => {
          for (const r of existingReservations) {
            const remaining = r.quantity - deductedStock(r);
            if (remaining > 0) {
              const deducted = await takeReceivedStock(tx, r.productId, remaining);
              if (deducted < remaining) throw new Error("Недостатньо товару на складі для завершення продажу. Спочатку прийміть партію.");
            }
          }
          if (existingReservations.length) {
            await tx.reservation.updateMany({ where: { leadId: req.params.id, status: { notIn: ["cancelled", "completed"] } }, data: { status: "completed" } });
          }
          // Deduct items that were never reserved (e.g. lead won directly without reservation flow)
          const reservedProductIds = new Set(existingReservations.map((r) => r.productId));
          const currentItems = items ?? parseItems(previous.items) ?? [];
          for (const item of currentItems) {
            if (!item.custom && !reservedProductIds.has(item.id)) {
              await takeReceivedStock(tx, item.id, item.quantity);
            }
          }
        });
      } else if (fields.status === "lost" && existingReservations.length) {
        await runStockChange(async (tx) => {
          await tx.reservation.updateMany({ where: { leadId: req.params.id, status: { notIn: ["cancelled", "completed"] } }, data: { status: "cancelled" } });
          for (const r of existingReservations.filter((r) => r.status === "active" || r.status === "found")) {
            await restoreReceivedStock(tx, r);
          }
        });
      }
    }

    }, { isolationLevel: "Serializable" });

    const updated = await prisma.lead.findUniqueOrThrow({ where: { id: req.params.id } });
    const previousItems = parseItems(previous.items) || [];
    const productsChanged = items !== undefined && JSON.stringify(previousItems) !== JSON.stringify(items);

    // When products are added or changed on an existing CRM card, send the
    // refreshed entry to Telegram. Other edits (status, notes, etc.) stay quiet.
    if (productsChanged) {
      await sendLeadTelegram({
        id: updated.id,
        type: updated.type,
        name: updated.name,
        phone: updated.phone,
        email: updated.email,
        interest: updated.interest,
        message: updated.message,
        items: items.length ? items : null,
        total: updated.total,
        createdAt: updated.createdAt,
      });
    }
    if (parsed.data.items) {
      const previousMissing = new Set(previousItems.filter((item: any) => item.custom || item.availability === "unavailable").map((item: any) => `${item.id}:${item.name}`));
      for (const item of parsed.data.items) {
        if ((item.custom || item.availability === "unavailable") && !previousMissing.has(`${item.id}:${item.name}`)) await sendUnavailableProductTelegram({ id: updated.id, name: updated.name, phone: updated.phone, productName: item.name });
      }
    }
    const result = await prisma.lead.findUnique({ where: { id: updated.id }, include: leadInclude });
    res.json(toDto(result, req.admin!.role === "admin"));
  } catch (error) {
    res.status(409).json({ error: error instanceof Error && !error.message.includes("prisma") ? error.message : "Не вдалося оновити заявку. Оновіть дані й повторіть дію." });
  }
});

// DELETE /api/leads/:id  (admin) — restore warehouse stock before deleting
leadsRouter.delete("/:id", requireAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const activeReservations = await prisma.reservation.findMany({
      where: { leadId: req.params.id, status: { in: ["active", "found"] } },
    });
    await prisma.$transaction(async (tx) => {
      for (const r of activeReservations) {
        await restoreReceivedStock(tx, r);
      }
      await tx.lead.delete({ where: { id: req.params.id } });
    });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: "Заявку не знайдено" });
  }
});
