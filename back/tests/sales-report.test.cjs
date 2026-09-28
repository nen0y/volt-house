const {test} = require('node:test');
const assert = require('node:assert/strict');
const {salesPeriod, summarizeSales} = require('../dist/sales-report');
const {leadsRouter} = require('../dist/routes/leads');
const {prisma} = require('../dist/prisma');
test('defaults to current Kyiv calendar month, including the UTC month boundary', () => {
  const period = salesPeriod(undefined, undefined, new Date('2026-09-30T22:00:00Z'));
  assert.equal(period.fromMonth, '2026-10');
  assert.equal(period.toMonth, '2026-10');
  assert.equal(period.from.toISOString(), '2026-09-30T21:00:00.000Z');
  assert.equal(period.to.toISOString(), '2026-10-31T22:00:00.000Z');
});
test('month range includes full leap month and rolls over December', () => {
  const leap = salesPeriod('2024-02','2024-02');
  assert.equal((leap.to-leap.from)/86400000,29);
  assert.equal(salesPeriod('2026-12','2026-12').to.toISOString(),'2026-12-31T22:00:00.000Z');
  assert.throws(()=>salesPeriod('2026-09','2026-08'));
  assert.throws(()=>salesPeriod('2026-13','2026-13'));
});
test('margin includes losses, separates incomplete costs and includes all sales', () => {
  const lead = (total,cost)=>({total,items:JSON.stringify([{id:'p',name:'P',price:total,quantity:1,purchasePrice:cost}])});
  assert.deepEqual(summarizeSales([lead(100,60),lead(50,70),lead(200,null)],[]),{saleCount:3,salesTotal:350,purchaseTotal:130,margin:20,calculatedCount:2,pendingCostCount:1});
});
test('manager cannot access report; admin query has date bounds and no seller filter', async () => {
  const route=leadsRouter.stack.find(l=>l.route?.path==='/sales-summary').route;
  const response=()=>({code:200,status(code){this.code=code;return this},json(body){this.body=body;return this}});
  const denied=response();let next=false;
  route.stack[1].handle({admin:{role:'manager'}},denied,()=>{next=true});
  assert.equal(denied.code,403);assert.equal(next,false);
  let query;
  prisma.lead.findMany=async(args)=>{query=args;return []};
  const allowed=response();
  await route.stack.at(-1).handle({query:{fromMonth:'2026-09',toMonth:'2026-09'}},allowed);
  assert.equal(allowed.code,200);
  assert.equal(query.where.soldById,undefined);
  assert.equal(query.where.managerId,undefined);
  assert.equal(query.where.OR[0].wonAt.lt.toISOString(),'2026-09-30T21:00:00.000Z');
  assert.equal(allowed.body.margin,0);
});
