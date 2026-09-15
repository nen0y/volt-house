const { test } = require('node:test');
const assert = require('node:assert/strict');
const { env } = require('../dist/env');
const { prisma } = require('../dist/prisma');
const telegram = require('../dist/telegram');
const { deliverCallbackReminders } = require('../dist/callback-reminders');

test('Telegram reminder includes escaped info, Kyiv time and authenticated CRM link', async () => {
  env.TELEGRAM_BOT_TOKEN = 'test'; env.TELEGRAM_CHAT_ID = 'test'; env.SITE_URL = 'https://example.com';
  let payload;
  global.fetch = async (_url, options) => { payload = JSON.parse(options.body); return { ok: true, json: async () => ({ ok: true }) }; };
  assert.deepEqual(await telegram.sendCallbackTelegram({ id: 'lead-123', name: '<Клієнт>', phone: '+380123', callbackAt: new Date('2026-09-16T07:00:00Z'), callbackNote: 'Обговорити ціну' }), { ok: true });
  assert.match(payload.text, /&lt;Клієнт&gt;/);
  assert.match(payload.text, /10:00:00/);
  assert.equal(payload.disable_notification, false);
  assert.equal(payload.reply_markup.inline_keyboard[0][0].url, 'https://example.com/admin/?tab=crm&lead=lead-123');
});

test('scheduler claims due reminders, marks only successes and respects competing claims/cancellation', async () => {
  env.TELEGRAM_BOT_TOKEN = 'test'; env.TELEGRAM_CHAT_ID = 'test';
  const originalSend = telegram.sendCallbackTelegram;
  const original = { findMany: prisma.lead.findMany, findFirst: prisma.lead.findFirst, updateMany: prisma.lead.updateMany };
  const lead = { id: 'lead-123', callbackAt: new Date('2026-09-16T07:00:00Z') };
  let sends = 0, writes = [], claimCount = 1, current = lead, success = true;
  prisma.lead.findMany = async ({ where }) => { assert.equal(where.callbackSentAt, null); assert.ok(where.callbackAt.lte instanceof Date); assert.ok(where.OR[1].callbackClaimedAt.lt instanceof Date); return [lead]; };
  prisma.lead.findFirst = async () => current;
  prisma.lead.updateMany = async (args) => { writes.push(args); return { count: claimCount }; };
  telegram.sendCallbackTelegram = async () => { sends++; return { ok: success }; };
  try {
    await deliverCallbackReminders();
    assert.equal(sends, 1); assert.equal(writes.length, 2); assert.ok(writes[1].data.callbackSentAt);
    assert.equal(writes[1].where.callbackClaimedAt, writes[0].data.callbackClaimedAt);
    writes = []; success = false; await deliverCallbackReminders(); assert.equal(writes.length, 1);
    claimCount = 0; await deliverCallbackReminders(); assert.equal(sends, 2);
    claimCount = 1; current = null; await deliverCallbackReminders(); assert.equal(sends, 2);
    env.TELEGRAM_BOT_TOKEN = ''; writes = []; await deliverCallbackReminders(); assert.equal(writes.length, 0);
  } finally { Object.assign(prisma.lead, original); telegram.sendCallbackTelegram = originalSend; }
});
