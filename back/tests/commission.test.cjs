const {test} = require('node:test');
const assert = require('node:assert/strict');
const {attachCosts, commissionFor} = require('../dist/commission');
const item = (id, price, quantity = 1) => ({id, name:id, price, quantity});
const batches = [{id:'batch',productId:'battery',quantity:2,purchasePrice:1630,arrivalDate:null},{id:'panel-batch',productId:'panel',quantity:5,purchasePrice:100,arrivalDate:null}];
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
test('the highest in-stock purchase price is used and sold-out batches are ignored', () => {
  const options = [...batches,{id:'other',productId:'battery',quantity:3,purchasePrice:1500,arrivalDate:null},{id:'sold-out',productId:'battery',quantity:0,purchasePrice:1900,arrivalDate:null}];
  const automatic = attachCosts([item('battery',1750)],[],options);
  assert.equal(automatic[0].purchasePrice,1630);
  assert.equal(commissionFor(automatic,1750).commission,12);
  const selectedCheaperBatch = attachCosts([{...item('battery',1750),warehouseItemId:'other'}],[],options);
  assert.equal(selectedCheaperBatch[0].purchasePrice,1630);
  assert.equal(commissionFor(selectedCheaperBatch,1750).commission,12);
  assert.equal(commissionFor([item('unknown',500)],500).commission,null);
  assert.throws(()=>attachCosts([{...item('battery',1750),warehouseItemId:'panel-batch'}],[],options));
});

test('installation revenue and cost are included in sale margin', () => {
  const product = attachCosts([item('battery',1750)], [], batches);
  assert.deepEqual(commissionFor(product, 2050, null, {requested:true, price:300, cost:180}), {
    salesTotal:2050,
    purchaseTotal:1810,
    margin:240,
    commission:24,
    missingCostCount:0,
    commissionPercent:10,
    installationPrice:300,
    installationCost:180,
    installationProfit:120,
  });
  assert.equal(commissionFor([],300,null,{requested:true,price:300,cost:180}).margin,120);
  assert.equal(commissionFor(product,2050,null,{requested:true,price:300,cost:null}).margin,null);
});

test('manager cannot change installation cost through the lead API', async () => {
  const {prisma} = require('../dist/prisma');
  const {leadsRouter} = require('../dist/routes/leads');
  const handler = leadsRouter.stack.find(l=>l.route?.path==='/:id' && l.route.methods.patch).route.stack.at(-1).handle;
  prisma.lead.findUnique = async()=>({id:'lead',status:'new',managerId:'manager',items:null,total:0,installationRequested:true,installationPrice:300,installationCost:180});
  const res = {code:200,status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
  await handler({params:{id:'lead'},admin:{role:'manager',id:'manager'},body:{installationCost:1}},res);
  assert.equal(res.code,403);
  assert.match(res.body.error,/адміністратор/);
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
  prisma.warehouseItem.findMany = async({where})=>where.productId && typeof where.productId === 'string' ? batches.filter(batch=>batch.productId===where.productId) : batches;
  const deductions=[];
  prisma.warehouseItem.updateMany = async({where,data})=>{deductions.push([where.id,data.quantity.decrement]);return {count:1};};
  prisma.adminUser.findFirst = async()=>assert.fail('Unchanged inactive manager must not block sale editing');
  let written;
  prisma.lead.updateMany = async({data})=>{written=data;previous={...previous,...data};return {count:1};};
  const res = {code:200,status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
  await handler({params:{id:'lead'},admin:{role:'admin',id:'admin'},body:{status:'won',managerId:'inactive-manager',items:[{...item('battery',1750),serialNumber:' SN-001 ',purchaseLocation:' Склад у Києві '},{...item('panel',150,2),serialNumber:'P-001\nP-002',purchaseLocation:'Постачальник панелей'}],total:1750}},res);
  assert.equal(res.code,200);
  assert.equal(written.soldById,undefined);
  assert.equal(written.total,2050);
  assert.equal(res.body.financials.commission,22);
  assert.equal(res.body.items[0].serialNumber,'SN-001');
  assert.equal(res.body.items[0].purchaseLocation,'Склад у Києві');
  assert.equal(JSON.parse(written.items)[1].serialNumber,'P-001\nP-002');
  assert.deepEqual(deductions,[['panel-batch',2]]);
  await handler({params:{id:'lead'},admin:{role:'admin',id:'admin'},body:{items:res.body.items.map(i=>({...i,serialNumber:'',purchaseLocation:''})),total:2050}},res);
  assert.equal(res.code,200);
  assert.equal(res.body.items[0].serialNumber,'');
  assert.equal(res.body.items[0].purchaseLocation,'');
  assert.equal(res.body.financials.commission,22);
  assert.deepEqual(deductions,[['panel-batch',2]]);

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
