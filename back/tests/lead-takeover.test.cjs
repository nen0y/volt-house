const { test } = require('node:test');
const assert = require('node:assert/strict');
const { prisma } = require('../dist/prisma');
const { leadsRouter } = require('../dist/routes/leads');
const handler = leadsRouter.stack.find((layer) => layer.route?.path === '/:id' && layer.route.methods.patch).route.stack.at(-1).handle;

test('manager takeover is explicit, atomic and preserves the credited seller', async () => {
  const originalTransaction = prisma.$transaction;
  prisma.$transaction = async (fn) => fn(prisma);
  const originalLead = { ...prisma.lead };
  const originalFind = prisma.adminUser.findFirst;
  let previous, writes, count;
  prisma.lead.findUnique = async () => previous;
  prisma.lead.findUniqueOrThrow = async () => previous;
  prisma.adminUser.findFirst = async () => ({ id: 'new-manager' });
  prisma.lead.updateMany = async (args) => { writes.push(args); return { count }; };
  async function patch(body, owner = 'old-manager', status = 'won', writeCount = 1) {
    previous = { id: 'lead', managerId: owner, status, soldById: 'old-manager', items: null };
    writes = []; count = writeCount;
    const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
    await handler({ params: { id: 'lead' }, admin: { id: 'new-manager', role: 'manager' }, body }, res);
    return res;
  }
  try {
    assert.equal((await patch({ managerId: 'new-manager', expectedManagerId: 'old-manager' })).code, 200);
    assert.equal(writes[0].where.managerId, 'old-manager');
    assert.equal(writes[0].data.managerId, 'new-manager');
    assert.equal(writes[0].data.soldById, undefined);
    assert.equal(writes[0].data.expectedManagerId, undefined);
    assert.equal((await patch({ managerId: 'new-manager' })).code, 409);
    assert.equal(writes.length, 0);
    assert.equal((await patch({ managerId: 'new-manager', expectedManagerId: 'stale-manager' })).code, 409);
    assert.equal((await patch({ notes: 'stale edit' })).code, 409);
    assert.equal((await patch({ managerId: 'someone-else' })).code, 403);
    assert.equal((await patch({ managerId: 'new-manager', expectedManagerId: null }, null, 'new')).code, 200);
    assert.equal(writes[0].where.managerId, null);
    assert.equal((await patch({ notes: 'concurrent edit' }, 'new-manager', 'new', 0)).code, 409);
    assert.equal((await patch({ managerId: 'new-manager', expectedManagerId: 'old-manager' }, 'old-manager', 'new', 0)).code, 409);
  } finally {
    prisma.$transaction = originalTransaction;
    Object.assign(prisma.lead, originalLead);
    prisma.adminUser.findFirst = originalFind;
  }
});
