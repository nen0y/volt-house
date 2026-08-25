import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAdmin } from "../middleware/auth";
import { sendLeadTelegram } from "../telegram";
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

const statusSchema = z.object({
  status: z.enum(["new", "contacted", "proposal", "won", "lost", "in_progress", "done"]).optional(),
  notes: z.string().max(5000).optional(),
});

// PATCH /api/leads/:id  (admin) — update status
leadsRouter.patch("/:id", requireAdmin, async (req, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success || (!parsed.data.status && parsed.data.notes === undefined)) {
    return res.status(400).json({ error: "Некоректні дані" });
  }
  try {
    const updated = await prisma.lead.update({
      where: { id: req.params.id },
      data: parsed.data,
    });
    res.json(updated);
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
