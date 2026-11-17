const { test } = require('node:test');
const assert = require('node:assert/strict');
const { prisma } = require('../dist/prisma');
const { financeRouter } = require('../dist/routes/finance');

const handler = (path, method) => financeRouter.stack.find((layer) => layer.route?.path === path && layer.route.methods[method]).route.stack.at(-1).handle;
const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
const participants = ['Юра', 'Міша', 'Коля'].map((name, index) => ({ id: `person-${index + 1}`, name }));

test('legacy finance ledger receives safe defaults without losing expenses', async () => {
  const legacyCurrent = { participants, incomes: [], expenses: [{ id: 'expense-1', participantId: 'person-2', purpose: 'Facebook', amount: 100, date: '2026-11-10', notes: '', currency: 'USD', exchangeRate: 1 }], transfers: [] };
  prisma.setting.findUnique = async () => ({ value: JSON.stringify(legacyCurrent) });
  const res = response();
  await handler('/', 'get')({}, res);
  assert.deepEqual(res.body.commissionManagerIds, []);
  assert.equal(res.body.expenses[0].category, 'other');
  assert.equal(res.body.expenses[0].purpose, 'Facebook');
});

test('selected managers and advertising category are persisted', async () => {
  let stored = { participants, commissionManagerIds: [], incomes: [], expenses: [], transfers: [] };
  prisma.setting.findUnique = async () => ({ value: JSON.stringify(stored) });
  prisma.setting.upsert = async ({ update }) => { stored = JSON.parse(update.value); return stored; };
  prisma.adminUser.findMany = async () => [{ id: 'manager-1' }];
  const managers = response();
  await handler('/commission-managers', 'put')({ body: { managerIds: ['manager-1'] } }, managers);
  assert.deepEqual(stored.commissionManagerIds, ['manager-1']);

  const expense = response();
  await handler('/expenses', 'post')({ body: { participantId: 'person-2', category: 'advertising', purpose: 'Facebook ads', amount: 528, currency: 'UAH', exchangeRate: 44, date: '2026-11-11', notes: '' } }, expense);
  assert.equal(expense.code, 201);
  assert.equal(stored.expenses[0].category, 'advertising');
});
