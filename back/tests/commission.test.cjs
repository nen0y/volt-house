const {test} = require('node:test');
const assert = require('node:assert/strict');
const {attachCosts, commissionFor} = require('../dist/commission');
const item = (id, price, quantity = 1) => ({id, name:id, price, quantity});
const batches = [{id:'batch',productId:'battery',purchasePrice:1630,arrivalDate:null},{id:'panel-batch',productId:'panel',purchasePrice:100,arrivalDate:null}];
test('10% is calculated from margin and recalculated for upsell and sale price changes', () => {
  const initial = attachCosts([item('battery',1750)], [], batches);
  assert.equal(commissionFor(initial,1750).commission,12);
  const upsell = attachCosts([...initial,item('panel',150,2)],initial,batches);
  assert.deepEqual(commissionFor(upsell,2050), {salesTotal:2050,purchaseTotal:1830,margin:220,commission:22,missingCostCount:0,commissionPercent:10});
  assert.equal(commissionFor(upsell,2150).commission,32);
  assert.equal(commissionFor(upsell,1800).commission,0);
});
test('snapshot cannot be forged and stays stable when a warehouse batch changes or is deleted', () => {
  const saved = attachCosts([{...item('battery',1750),warehouseItemId:'batch',purchasePrice:1}],[],batches);
  assert.equal(saved[0].purchasePrice,1630);
  const edited = attachCosts([{...item('battery',1800),warehouseItemId:'batch',purchasePrice:0}],saved,[]);
  assert.equal(edited[0].purchasePrice,1630);
  assert.equal(commissionFor(edited,1800).commission,17);
});
test('ambiguous or missing costs never inflate commission; a selected batch resolves ambiguity', () => {
  const options = [...batches,{id:'other',productId:'battery',purchasePrice:1500,arrivalDate:null}];
  assert.equal(commissionFor(attachCosts([item('battery',1750)],[],options),1750).commission,null);
  assert.equal(commissionFor(attachCosts([{...item('battery',1750),warehouseItemId:'other'}],[],options),1750).commission,25);
  assert.equal(commissionFor([item('unknown',500)],500).commission,null);
  assert.throws(()=>attachCosts([{...item('battery',1750),warehouseItemId:'panel-batch'}],[],options));
});

test('admin can edit a won lead with inactive assigned manager, add a product, and retain credited seller', async () => {
  const {prisma} = require('../dist/prisma');
  const telegram = require('../dist/telegram');
  telegram.sendLeadTelegram = async () => ({skipped:true});
  telegram.sendUnavailableProductTelegram = async () => ({skipped:true});
  const {leadsRouter} = require('../dist/routes/leads');
  const handler = leadsRouter.stack.find(l=>l.route?.path==='/:id' && l.route.methods.patch).route.stack.at(-1).handle;
  let previous = {id:'lead',status:'won',managerId:'inactive-manager',soldById:'seller',total:1750,items:JSON.stringify(attachCosts([item('battery',1750)],[],batches))};
  prisma.$transaction = async(fn)=>fn(prisma);
  prisma.lead.findUnique = async()=>previous;
  prisma.lead.findUniqueOrThrow = async()=>previous;
  prisma.warehouseItem.findMany = async()=>batches;
  prisma.adminUser.findFirst = async()=>assert.fail('Unchanged inactive manager must not block sale editing');
  let written;
  prisma.lead.updateMany = async({data})=>{written=data;previous={...previous,...data};return {count:1};};
  const res = {code:200,status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
  await handler({params:{id:'lead'},admin:{role:'admin',id:'admin'},body:{status:'won',managerId:'inactive-manager',items:[item('battery',1750),item('panel',150,2)],total:1750}},res);
  assert.equal(res.code,200);
  assert.equal(written.soldById,undefined);
  assert.equal(written.total,2050);
  assert.equal(res.body.financials.commission,22);
});

test('manager statistics use current successful-lead margin and flag missing purchase costs', async () => {
  const {prisma} = require('../dist/prisma');
  const {leadsRouter} = require('../dist/routes/leads');
  const handler = leadsRouter.stack.find(l=>l.route?.path==='/manager-stats').route.stack.at(-1).handle;
  let total = 1750;
  prisma.adminUser.findMany = async()=>[{id:'m',commissionPercent:30,soldLeads:[{total,items:JSON.stringify([{...item('battery',1750),purchasePrice:1630}])},{total:500,items:JSON.stringify([item('unknown',500)])}]}];
  prisma.warehouseItem.findMany = async()=>batches;
  const get = async()=>{const res={json(body){this.body=body;}};await handler({query:{month:'2026-09'}},res);return res.body.managers[0];};
  assert.equal((await get()).salary,12);
  assert.equal((await get()).pendingCostCount,1);
  total = 1800;
  assert.equal((await get()).salary,17);
  assert.equal((await get()).commissionPercent,10);
});
