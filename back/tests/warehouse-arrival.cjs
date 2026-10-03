const { test } = require('node:test');
const assert = require('node:assert/strict');
const { prisma } = require('../dist/prisma');
const { warehouseRouter } = require('../dist/routes/warehouse');
const { leadsRouter } = require('../dist/routes/leads');
const handler = (router, path, method) => router.stack.find(layer => layer.route?.path === path && layer.route.methods[method]).route.stack.at(-1).handle;
prisma.$transaction = async (fn) => fn(prisma);
const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });

test('expected batches stay visible but never count as received, including overdue dates', async () => {
  prisma.product.findMany = async () => [
    { id: 'expected', warehouseItems: [{ quantity: 5, arrivalDate: '2020-01-01' }], reservations: [] },
    { id: 'mixed', warehouseItems: [{ quantity: 3, arrivalDate: null }, { quantity: 7, arrivalDate: '2030-01-01' }], reservations: [] },
    { id: 'empty', warehouseItems: [], reservations: [] },
  ];
  const res = response();
  await handler(warehouseRouter, '/balance', 'get')({ query: {}, admin: { id: 'admin', role: 'admin' } }, res);
  assert.deepEqual(res.body.map(({ totalQty, expectedQty, availableQty }) => ({ totalQty, expectedQty, availableQty })), [
    { totalQty: 0, expectedQty: 5, availableQty: 0 },
    { totalQty: 3, expectedQty: 7, availableQty: 3 },
  ]);
});

test('rejects invalid calendar dates and accepts explicit receipt', async () => {
  const invalid = response();
  await handler(warehouseRouter, '/balance', 'post')({ body: { productId: 'p', quantity: 1, arrivalDate: '2026-02-30' } }, invalid);
  assert.equal(invalid.code, 400);
  prisma.warehouseItem.findUnique = async () => ({ id: 'batch', productId: 'p', quantity: 2, arrivalDate: '2030-01-01' });
  prisma.warehouseItem.update = async ({ data }) => data;
  const received = response();
  await handler(warehouseRouter, '/balance/:id', 'put')({ params: { id: 'batch' }, body: { arrivalDate: null } }, received);
  assert.equal(received.body.arrivalDate, null);
});

test('blocks closing a sale of an expected-only product before updating the lead', async () => {
  prisma.lead.findUnique = async () => ({ id: 'lead', status: 'proposal', items: JSON.stringify([{ id: 'p', quantity: 1, price: 1, name: 'Product' }]) });
  prisma.reservation.findMany = async () => [];
  prisma.warehouseItem.findMany = async () => [{ quantity: 5, arrivalDate: '2030-01-01' }, { quantity: 0, arrivalDate: null }];
  prisma.lead.updateMany = async () => { assert.fail('Expected stock must not be sold'); };
  const res = response();
  await handler(leadsRouter, '/:id', 'patch')({ params: { id: 'lead' }, admin: { id: 'admin', role: 'admin' }, body: { status: 'won' } }, res);
  assert.equal(res.code, 409);
});

const { stockSummary, takeReceivedStock, restoreReceivedStock, addedSaleStock } = require('../dist/stock');
test('already deducted reserves are not subtracted twice; expected reserves do not invent stock', () => {
  const stock = stockSummary([{quantity: 4, arrivalDate: null}], [{quantity: 1, status: 'active', deductedQty: 1}]);
  assert.equal(stock.totalQty, 5);
  assert.equal(stock.availableQty, 4);
  const expected = stockSummary([{quantity: 5, arrivalDate: '2030-01-01'}], [{quantity: 2, status: 'active', deductedQty: 0}]);
  assert.equal(expected.totalQty, 0);
  assert.equal(expected.availableQty, 0);
  const received = stockSummary([{quantity: 5, arrivalDate: null}], [{quantity: 2, status: 'active', deductedQty: 0}]);
  assert.equal(received.availableQty, 3);
});
test('empty batch can be deleted, nonempty reserved stock cannot', async () => {
  let quantity = 0, deleted = false;
  prisma.warehouseItem.findUnique = async () => ({ id: 'batch', productId: 'p', quantity });
  prisma.reservation.count = async () => 1;
  prisma.warehouseItem.delete = async () => { deleted = true; };
  const empty = response();
  await handler(warehouseRouter, '/balance/:id', 'delete')({ params: { id: 'batch' } }, empty);
  assert.equal(deleted, true);
  quantity = 2; deleted = false;
  const reserved = response();
  await handler(warehouseRouter, '/balance/:id', 'delete')({ params: { id: 'batch' } }, reserved);
  assert.equal(reserved.code, 409);
  assert.equal(deleted, false);
});
test('stock is consumed across batches, never below zero', async () => {
  const changes = [];
  const tx = { warehouseItem: {
    findMany: async ({where}) => { assert.equal(where.arrivalDate, null); return [{id:'a',quantity:1},{id:'b',quantity:3}]; },
    updateMany: async ({where,data}) => { changes.push([where.id, data.quantity.decrement]); return {count:1}; },
  }};
  assert.equal(await takeReceivedStock(tx, 'p', 3), 3);
  assert.deepEqual(changes, [['a',1],['b',2]]);
});
test('cancelling an expected reservation does not add fictitious stock', async () => {
  await restoreReceivedStock({ warehouseItem: { findFirst: async () => assert.fail('Nothing to restore') } }, { productId:'p', quantity:3, status:'active', deductedQty:0 });
});

test('successful sale edits consume only added catalogue quantities', () => {
  const previous = [{id:'p',name:'Product',price:100,quantity:1},{id:'custom',name:'Custom',price:1,quantity:1,custom:true}];
  const next = [{...previous[0],price:120,quantity:3},{...previous[1],quantity:5},{id:'q',name:'Other',price:50,quantity:2}];
  assert.deepEqual(addedSaleStock(previous,next),[{productId:'p',quantity:2},{productId:'q',quantity:2}]);
  assert.deepEqual(addedSaleStock(next,next.map(item=>({...item,price:item.price+1}))),[]);
});

test('creating a lead directly as won consumes its catalogue items in the same transaction', async () => {
  const telegram = require('../dist/telegram');
  telegram.sendLeadTelegram = async () => ({skipped:true});
  telegram.sendUnavailableProductTelegram = async () => ({skipped:true});
  const create = handler(leadsRouter, '/admin', 'post');
  const deductions = [];
  const created = {id:'won-lead',type:'order',name:'Buyer',phone:'123',email:null,interest:null,message:null,createdAt:new Date(),status:'won'};
  prisma.$transaction = async (fn) => fn(prisma);
  prisma.warehouseItem.findMany = async ({where}) => where.productId && typeof where.productId === 'string'
    ? [{id:'batch',productId:where.productId,quantity:5,purchasePrice:10,arrivalDate:null}]
    : [{id:'batch',productId:'p',quantity:5,purchasePrice:10,arrivalDate:null}];
  prisma.warehouseItem.updateMany = async ({where,data}) => { deductions.push([where.id,data.quantity.decrement]); return {count:1}; };
  prisma.lead.create = async () => created;
  prisma.lead.findUnique = async () => ({...created,items:JSON.stringify([{id:'p',name:'Product',price:20,quantity:2,purchasePrice:10}]),reservations:[]});
  const res = response();
  await create({admin:{id:'admin',role:'admin'},body:{type:'order',name:'Buyer',phone:'123',status:'won',items:[{id:'p',name:'Product',price:20,quantity:2},{id:'custom',name:'Custom',price:5,quantity:4,custom:true}]}},res);
  assert.equal(res.code,201);
  assert.deepEqual(deductions,[['batch',2]]);
});
