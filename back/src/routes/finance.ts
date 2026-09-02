import { randomUUID } from "crypto";
import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../middleware/auth";
import { prisma } from "../prisma";

export const financeRouter = Router();
financeRouter.use(requireAdmin);

const SETTING_KEY = "finance_ledger";
const participantSchema = z.object({ id: z.string().min(1), name: z.string().trim().min(1).max(100) });
const expenseSchema = z.object({
  id: z.string().min(1).optional(),
  participantId: z.string().min(1),
  purpose: z.string().trim().min(1).max(300),
  amount: z.number().nonnegative().finite(),
});
const shareSchema = z.object({ participantId: z.string().min(1), percent: z.number().min(0).max(100).finite() });
const saleInputSchema = z.object({
  item: z.string().trim().min(1).max(300),
  customer: z.string().trim().max(200).default(""),
  revenue: z.number().nonnegative().finite(),
  soldAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(2000).default(""),
  expenses: z.array(expenseSchema).max(100).default([]),
  shares: z.array(shareSchema).length(3),
});
const ledgerSchema = z.object({
  participants: z.array(participantSchema).length(3),
  sales: z.array(saleInputSchema.extend({ id: z.string().min(1), expenses: z.array(expenseSchema.extend({ id: z.string().min(1) })) })).max(5000),
});
type Ledger = z.infer<typeof ledgerSchema>;

const emptyLedger = (): Ledger => ({
  participants: ["Юра", "Міша", "Коля"].map((name, index) => ({ id: `person-${index + 1}`, name })),
  sales: [],
});

async function readLedger(): Promise<Ledger> {
  const row = await prisma.setting.findUnique({ where: { key: SETTING_KEY } });
  if (!row) return emptyLedger();
  try {
    return ledgerSchema.parse(JSON.parse(row.value));
  } catch {
    return emptyLedger();
  }
}

async function writeLedger(ledger: Ledger) {
  await prisma.setting.upsert({
    where: { key: SETTING_KEY },
    create: { key: SETTING_KEY, value: JSON.stringify(ledger) },
    update: { value: JSON.stringify(ledger) },
  });
}

financeRouter.get("/", async (_req, res) => res.json(await readLedger()));

financeRouter.put("/participants", async (req, res) => {
  const parsed = z.object({ participants: z.array(participantSchema).length(3) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Вкажіть імена трьох учасників" });
  const ledger = await readLedger();
  const expectedIds = new Set(ledger.participants.map((person) => person.id));
  if (parsed.data.participants.some((person) => !expectedIds.has(person.id))) {
    return res.status(400).json({ error: "Некоректні учасники" });
  }
  ledger.participants = parsed.data.participants;
  await writeLedger(ledger);
  res.json(ledger);
});

financeRouter.post("/sales", async (req, res) => {
  const parsed = saleInputSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Перевірте дані продажу та витрат" });
  const ledger = await readLedger();
  const participantIds = new Set(ledger.participants.map((person) => person.id));
  if (parsed.data.expenses.some((expense) => !participantIds.has(expense.participantId)) || parsed.data.shares.some((share) => !participantIds.has(share.participantId))) {
    return res.status(400).json({ error: "Оберіть учасника для кожної витрати" });
  }
  if (new Set(parsed.data.shares.map((share) => share.participantId)).size !== 3 || Math.abs(parsed.data.shares.reduce((sum, share) => sum + share.percent, 0) - 100) > 0.01) {
    return res.status(400).json({ error: "Частки трьох учасників мають разом становити 100%" });
  }
  const sale = { ...parsed.data, id: randomUUID(), expenses: parsed.data.expenses.map((expense) => ({ ...expense, id: randomUUID() })) };
  ledger.sales.unshift(sale);
  await writeLedger(ledger);
  res.status(201).json(sale);
});

financeRouter.put("/sales/:id", async (req, res) => {
  const parsed = saleInputSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Перевірте дані продажу та витрат" });
  const ledger = await readLedger();
  const index = ledger.sales.findIndex((sale) => sale.id === req.params.id);
  if (index < 0) return res.status(404).json({ error: "Продаж не знайдено" });
  const participantIds = new Set(ledger.participants.map((person) => person.id));
  if (parsed.data.expenses.some((expense) => !participantIds.has(expense.participantId)) || parsed.data.shares.some((share) => !participantIds.has(share.participantId))) {
    return res.status(400).json({ error: "Оберіть учасника для кожної витрати" });
  }
  if (new Set(parsed.data.shares.map((share) => share.participantId)).size !== 3 || Math.abs(parsed.data.shares.reduce((sum, share) => sum + share.percent, 0) - 100) > 0.01) {
    return res.status(400).json({ error: "Частки трьох учасників мають разом становити 100%" });
  }
  const sale = { ...parsed.data, id: req.params.id, expenses: parsed.data.expenses.map((expense) => ({ ...expense, id: expense.id || randomUUID() })) };
  ledger.sales[index] = sale;
  await writeLedger(ledger);
  res.json(sale);
});

financeRouter.delete("/sales/:id", async (req, res) => {
  const ledger = await readLedger();
  const nextSales = ledger.sales.filter((sale) => sale.id !== req.params.id);
  if (nextSales.length === ledger.sales.length) return res.status(404).json({ error: "Продаж не знайдено" });
  ledger.sales = nextSales;
  await writeLedger(ledger);
  res.json({ ok: true });
});
