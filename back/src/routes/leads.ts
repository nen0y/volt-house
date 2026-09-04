import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAdmin } from "../middleware/auth";
import { sendLeadTelegram, sendUnavailableProductTelegram } from "../telegram";
import { leadsLimiter } from "../middleware/rateLimit";
import { parseItems } from "../json";

export const leadsRouter = Router();

// items is stored as a JSON string (SQLite) — expose it as an array to clients.
function toDto(l: any) {
  return { ...l, items: parseItems(l.items) };
}

const itemSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
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
    items: parseItems(lead.items),
    total: lead.total,
    createdAt: lead.createdAt,
  });

  res.status(201).json({
    ok: true,
    id: lead.id,
    telegram: tg.skipped ? false : tg.ok,
  });
});

// GET /api/leads?type=order&status=new  (admin)
leadsRouter.get("/", requireAdmin, async (req, res) => {
  const type = typeof req.query.type === "string" && req.query.type !== "all" ? req.query.type : undefined;
  const status =
    typeof req.query.status === "string" && req.query.status !== "all" ? req.query.status : undefined;
  const rows = await prisma.lead.findMany({
    where: { ...(type ? { type } : {}), ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
  });
  res.json(rows.map(toDto));
});

// Product picker for CRM leads, including the best known supplier availability.
leadsRouter.get("/product-options", requireAdmin, async (_req, res) => {
  const products = await prisma.product.findMany({
    where: { enabled: true },
    select: { id: true, name: true, price: true, supplierPrices: { select: { availability: true, price: true } } },
    orderBy: { name: "asc" },
  });
  res.json(products.map((product) => {
    const available = product.supplierPrices.filter((row) => row.price > 0);
    const availability = available.some((row) => row.availability === "in_stock") ? "in_stock"
      : available.some((row) => row.availability === "preorder") ? "preorder" : "unavailable";
    return { id: product.id, name: product.name, price: product.price, availability };
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

const manualLeadSchema = leadSchema.extend({
  status: z.enum(["new", "contacted", "proposal", "won", "lost"]).default("new"),
  paymentStatus: z.enum(["unpaid", "partial", "paid"]).default("unpaid"),
  deliveryStatus: z.enum(["not_sent", "preparing", "sent", "received", "returned"]).default("not_sent"),
  notes: z.string().max(5000).default(""),
});

// POST /api/leads/admin — create a client manually in CRM.
leadsRouter.post("/admin", requireAdmin, async (req, res) => {
  const parsed = manualLeadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Некоректні дані", details: parsed.error.flatten() });
  const d = parsed.data;
  const lead = await prisma.lead.create({
    data: {
      type: d.type,
      name: d.name,
      phone: d.phone,
      email: d.email || null,
      interest: d.interest || null,
      message: d.message || null,
      items: d.items?.length ? JSON.stringify(d.items) : null,
      total: d.total ?? null,
      status: d.status,
      paymentStatus: d.paymentStatus,
      deliveryStatus: d.deliveryStatus,
      notes: d.notes,
    },
  });

  // Manual CRM orders use a separate endpoint from storefront orders, so notify
  // Telegram here as well. Delivery failures must not roll back the saved order.
  if (lead.type === "order") {
    await sendLeadTelegram({
      id: lead.id,
      type: lead.type,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      interest: lead.interest,
      message: lead.message,
      items: parseItems(lead.items),
      total: lead.total,
      createdAt: lead.createdAt,
    });
  }

  for (const item of d.items || []) {
    if (item.custom || item.availability === "unavailable") await sendUnavailableProductTelegram({ id: lead.id, name: lead.name, phone: lead.phone, productName: item.name });
  }
  res.status(201).json(toDto(lead));
});

const statusSchema = z.object({
  type: z.enum(["order", "consultation", "callback"]).optional(),
  name: z.string().min(1, "Вкажіть ім'я").optional(),
  phone: z.string().min(3, "Вкажіть телефон").optional(),
  email: z.string().email().optional().or(z.literal("")),
  interest: z.string().optional(),
  message: z.string().optional(),
  status: z.enum(["new", "contacted", "proposal", "won", "lost", "in_progress", "done"]).optional(),
  paymentStatus: z.enum(["unpaid", "partial", "paid"]).optional(),
  deliveryStatus: z.enum(["not_sent", "preparing", "sent", "received", "returned"]).optional(),
  notes: z.string().max(5000).optional(),
  items: z.array(itemSchema).optional(),
});

// PATCH /api/leads/:id  (admin) — update CRM fields
leadsRouter.patch("/:id", requireAdmin, async (req, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return res.status(400).json({ error: "Некоректні дані" });
  }
  try {
    const previous = await prisma.lead.findUnique({ where: { id: req.params.id } });
    if (!previous) return res.status(404).json({ error: "Заявку не знайдено" });
    const { items, email, interest, message, ...fields } = parsed.data;
    const data = {
      ...fields,
      ...(email !== undefined ? { email: email || null } : {}),
      ...(interest !== undefined ? { interest: interest || null } : {}),
      ...(message !== undefined ? { message: message || null } : {}),
      ...(items !== undefined ? {
        items: items.length ? JSON.stringify(items) : null,
        total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      } : {}),
    };
    const updated = await prisma.lead.update({
      where: { id: req.params.id },
      data,
    });
    if (parsed.data.items) {
      const previousMissing = new Set((parseItems(previous.items) || []).filter((item: any) => item.custom || item.availability === "unavailable").map((item: any) => `${item.id}:${item.name}`));
      for (const item of parsed.data.items) {
        if ((item.custom || item.availability === "unavailable") && !previousMissing.has(`${item.id}:${item.name}`)) await sendUnavailableProductTelegram({ id: updated.id, name: updated.name, phone: updated.phone, productName: item.name });
      }
    }
    res.json(toDto(updated));
  } catch {
    res.status(404).json({ error: "Заявку не знайдено" });
  }
});

// DELETE /api/leads/:id  (admin)
leadsRouter.delete("/:id", requireAdmin, async (req, res) => {
  try {
    await prisma.lead.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: "Заявку не знайдено" });
  }
});
