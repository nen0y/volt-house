import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAdmin } from "../middleware/auth";
import { calculatorConfig as defaultConfig } from "../data";

export const calculatorRouter = Router();

function applianceDto(a: any) {
  return { id: a.id, name: a.name, watts: a.watts, icon: a.icon, group: a.group };
}

async function getConfig() {
  const row = await prisma.setting.findUnique({ where: { key: "calculator" } });
  if (!row) return defaultConfig;
  try {
    return { ...defaultConfig, ...JSON.parse(row.value) };
  } catch {
    return defaultConfig;
  }
}

// GET /api/calculator  → { appliances, recommendation }
calculatorRouter.get("/", async (_req, res) => {
  const [rows, recommendation] = await Promise.all([
    prisma.appliance.findMany({ orderBy: { sortOrder: "asc" } }),
    getConfig(),
  ]);
  res.json({ appliances: rows.map(applianceDto), recommendation });
});

// ── Recommendation rules ──────────────────────────────────────────────────
const configSchema = z.object({
  autonomyHours: z.number().positive(),
  powerReservePct: z.number().min(0),
  inverterCategory: z.string().min(1),
  batteryCategory: z.string().min(1),
  stationCategory: z.string(), // "" disables all-in-one suggestions
});

// PUT /api/calculator  (admin) — update recommendation rules
calculatorRouter.put("/", requireAdmin, async (req, res) => {
  const current = await getConfig();
  const parsed = configSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  // Only keep the fields the current config defines (drops any legacy keys).
  const merged: Record<string, unknown> = {
    autonomyHours: current.autonomyHours,
    powerReservePct: current.powerReservePct,
    inverterCategory: current.inverterCategory,
    batteryCategory: current.batteryCategory,
    stationCategory: current.stationCategory,
    ...parsed.data,
  };
  await prisma.setting.upsert({
    where: { key: "calculator" },
    create: { key: "calculator", value: JSON.stringify(merged) },
    update: { value: JSON.stringify(merged) },
  });
  res.json(merged);
});

// ── Appliances CRUD ─────────────────────────────────────────────────────────
const applianceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  watts: z.number().int().nonnegative(),
  icon: z.string().default("🔌"),
  group: z.enum(["essential", "kitchen", "heavy"]),
  sortOrder: z.number().int().optional(),
});

// POST /api/calculator/appliances  (admin) — create/upsert
calculatorRouter.post("/appliances", requireAdmin, async (req, res) => {
  const parsed = applianceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const d = parsed.data;
  const data = { name: d.name, watts: d.watts, icon: d.icon, group: d.group, sortOrder: d.sortOrder ?? 0 };
  const saved = await prisma.appliance.upsert({
    where: { id: d.id },
    create: { id: d.id, ...data },
    update: data,
  });
  res.status(201).json(applianceDto(saved));
});

// DELETE /api/calculator/appliances/:id  (admin)
calculatorRouter.delete("/appliances/:id", requireAdmin, async (req, res) => {
  try {
    await prisma.appliance.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: "Прилад не знайдено" });
  }
});
