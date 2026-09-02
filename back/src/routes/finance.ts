import { randomUUID } from "crypto";
import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../middleware/auth";
import { prisma } from "../prisma";

export const financeRouter = Router();
financeRouter.use(requireAdmin);

const SETTING_KEY = "finance_ledger";
const participantSchema = z.object({ id: z.string().min(1), name: z.string().trim().min(1).max(100) });
const shareSchema = z.object({ participantId: z.string().min(1), percent: z.number().min(0).max(100).finite() });
const incomeInputSchema = z.object({
  purpose: z.string().trim().min(1).max(300), customer: z.string().trim().max(200).default(""),
  amount: z.number().nonnegative().finite(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(2000).default(""), shares: z.array(shareSchema).length(3),
});
const expenseInputSchema = z.object({
  participantId: z.string().min(1), purpose: z.string().trim().min(1).max(300),
  amount: z.number().nonnegative().finite(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(2000).default(""),
});
const ledgerSchema = z.object({
  participants: z.array(participantSchema).length(3),
  incomes: z.array(incomeInputSchema.extend({ id: z.string().min(1) })).max(5000),
  expenses: z.array(expenseInputSchema.extend({ id: z.string().min(1) })).max(5000),
});
type Ledger = z.infer<typeof ledgerSchema>;

const emptyLedger = (): Ledger => ({
  participants: ["Юра", "Міша", "Коля"].map((name, index) => ({ id: `person-${index + 1}`, name })), incomes: [], expenses: [],
});

function migrateLedger(value: unknown): Ledger {
  const current = ledgerSchema.safeParse(value);
  if (current.success) return current.data;
  const legacy = value as any;
  if (!legacy || !Array.isArray(legacy.participants) || !Array.isArray(legacy.sales)) return emptyLedger();
  const migrated = {
    participants: legacy.participants,
    incomes: legacy.sales.map((sale: any) => ({ id: sale.id, purpose: sale.item, customer: sale.customer || "", amount: Number(sale.revenue), date: sale.soldAt, notes: sale.notes || "", shares: sale.shares })),
    expenses: legacy.sales.flatMap((sale: any) => (sale.expenses || []).map((expense: any) => ({ id: expense.id || randomUUID(), participantId: expense.participantId, purpose: expense.purpose, amount: Number(expense.amount), date: sale.soldAt, notes: `Перенесено з надходження: ${sale.item}` }))),
  };
  const parsed = ledgerSchema.safeParse(migrated);
  return parsed.success ? parsed.data : emptyLedger();
}

async function readLedger(): Promise<Ledger> {
  const row = await prisma.setting.findUnique({ where: { key: SETTING_KEY } });
  if (!row) return emptyLedger();
  try { return migrateLedger(JSON.parse(row.value)); } catch { return emptyLedger(); }
}

async function writeLedger(ledger: Ledger) {
  await prisma.setting.upsert({ where: { key: SETTING_KEY }, create: { key: SETTING_KEY, value: JSON.stringify(ledger) }, update: { value: JSON.stringify(ledger) } });
}

function validShares(shares: z.infer<typeof shareSchema>[], participantIds: Set<string>) {
  return shares.every((share) => participantIds.has(share.participantId)) && new Set(shares.map((share) => share.participantId)).size === 3 && Math.abs(shares.reduce((sum, share) => sum + share.percent, 0) - 100) <= 0.01;
}

financeRouter.get("/", async (_req, res) => res.json(await readLedger()));

financeRouter.put("/participants", async (req, res) => {
  const parsed = z.object({ participants: z.array(participantSchema).length(3) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Вкажіть імена трьох учасників" });
  const ledger = await readLedger();
  const expectedIds = new Set(ledger.participants.map((person) => person.id));
  if (parsed.data.participants.some((person) => !expectedIds.has(person.id))) return res.status(400).json({ error: "Некоректні учасники" });
  ledger.participants = parsed.data.participants;
  await writeLedger(ledger);
  res.json(ledger);
});

financeRouter.post("/incomes", async (req, res) => {
  const parsed = incomeInputSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Перевірте дані надходження" });
  const ledger = await readLedger();
  if (!validShares(parsed.data.shares, new Set(ledger.participants.map((person) => person.id)))) return res.status(400).json({ error: "Частки трьох учасників мають разом становити 100%" });
  const income = { ...parsed.data, id: randomUUID() };
  ledger.incomes.unshift(income); await writeLedger(ledger); res.status(201).json(income);
});

financeRouter.put("/incomes/:id", async (req, res) => {
  const parsed = incomeInputSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Перевірте дані надходження" });
  const ledger = await readLedger();
  const index = ledger.incomes.findIndex((income) => income.id === req.params.id);
  if (index < 0) return res.status(404).json({ error: "Надходження не знайдено" });
  if (!validShares(parsed.data.shares, new Set(ledger.participants.map((person) => person.id)))) return res.status(400).json({ error: "Частки трьох учасників мають разом становити 100%" });
  ledger.incomes[index] = { ...parsed.data, id: req.params.id }; await writeLedger(ledger); res.json(ledger.incomes[index]);
});

financeRouter.delete("/incomes/:id", async (req, res) => {
  const ledger = await readLedger(); const next = ledger.incomes.filter((income) => income.id !== req.params.id);
  if (next.length === ledger.incomes.length) return res.status(404).json({ error: "Надходження не знайдено" });
  ledger.incomes = next; await writeLedger(ledger); res.json({ ok: true });
});

financeRouter.post("/expenses", async (req, res) => {
  const parsed = expenseInputSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Перевірте дані витрати" });
  const ledger = await readLedger();
  if (!ledger.participants.some((person) => person.id === parsed.data.participantId)) return res.status(400).json({ error: "Оберіть, хто оплатив витрату" });
  const expense = { ...parsed.data, id: randomUUID() }; ledger.expenses.unshift(expense); await writeLedger(ledger); res.status(201).json(expense);
});

financeRouter.put("/expenses/:id", async (req, res) => {
  const parsed = expenseInputSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Перевірте дані витрати" });
  const ledger = await readLedger(); const index = ledger.expenses.findIndex((expense) => expense.id === req.params.id);
  if (index < 0) return res.status(404).json({ error: "Витрату не знайдено" });
  if (!ledger.participants.some((person) => person.id === parsed.data.participantId)) return res.status(400).json({ error: "Оберіть, хто оплатив витрату" });
  ledger.expenses[index] = { ...parsed.data, id: req.params.id }; await writeLedger(ledger); res.json(ledger.expenses[index]);
});

financeRouter.delete("/expenses/:id", async (req, res) => {
  const ledger = await readLedger(); const next = ledger.expenses.filter((expense) => expense.id !== req.params.id);
  if (next.length === ledger.expenses.length) return res.status(404).json({ error: "Витрату не знайдено" });
  ledger.expenses = next; await writeLedger(ledger); res.json({ ok: true });
});
