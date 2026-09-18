const assert = require('node:assert/strict');
const C = require('./demos/core.js');
let checks = 0;
function check(name, fn) { fn(); console.log('PASS ' + name); checks++; }
check('CSV quoted commas, quotes, accents, multiline fields and BOM', () => {
  assert.deepEqual(C.parseCSV('\uFEFFid,name\r\n001,"López, Ana"\r\n002,"A ""quoted""\nname"\r\n',['id','name']), [{id:'001',name:'López, Ana'},{id:'002',name:'A "quoted"\nname'}]);
  assert.throws(() => C.parseCSV('id,name\n1,"bad',['id','name']), /unclosed/);
  assert.throws(() => C.parseCSV('id,id\n1,2',['id','name']), /unique/);
  assert.throws(() => C.parseCSV('id,name\n1,x,y',['id','name']), /columns/);
});
check('Dates validate real calendars and explicit conventions', () => {
  assert.equal(C.normalizeDate('03/09/2026','DMY'),'2026-09-03');
  assert.equal(C.normalizeDate('03/09/2026','MDY'),'2026-03-09');
  assert.equal(C.normalizeDate('2024-02-29'),'2024-02-29');
  assert.equal(C.normalizeDate('2026-02-29'),null);
  assert.equal(C.normalizeDate('1900-02-29'),null);
  assert.equal(C.normalizeDate('2026-13-01'),null);
});
check('Cleanup preserves identity and conflicting records while removing exact duplicates', () => {
  const source='record_id,customer_name,signup_date,city\n001, Ana   López ,03/09/2026, Monterrey \n001,Ana López,2026-09-03,Monterrey\n001,Ana López,2026-09-04,Monterrey\n002,,31/02/2026,Austin\n';
  const r=C.cleanCustomers(source);
  assert.equal(r.inputCount,4); assert.equal(r.rows.length,3); assert.equal(r.removed,1);
  assert.equal(r.rows[0].record_id,'001'); assert.equal(r.rows[0].customer_name,'Ana López');
  assert.equal(r.rows[2].signup_date,'31/02/2026'); assert.equal(r.rows[2].customer_name,'');
  assert.equal(r.issues.length,3); assert.ok(r.changes.some(x=>x.change.includes('duplicate')));
});
check('CSV exports neutralize formula-like strings without losing quotes', () => {
  const out=C.csv(['value'],[{value:'=1+1'},{value:'@SUM(A1)'},{value:'safe, "text"'},{value:-3}]);
  assert.equal(out,'value\r\n\'=1+1\r\n\'@SUM(A1)\r\n"safe, ""text"""\r\n-3\r\n');
});
check('Quote arithmetic separates support and rounds one-time discount in cents', () => {
  const r=C.quote({base:'500',units:'8',unitRate:'35',discount:'10',monthly:'60',months:'3'});
  assert.equal(r.subtotal,78000); assert.equal(r.discount,7800); assert.equal(r.supportTotal,18000); assert.equal(r.total,88200);
  assert.equal(C.quote({base:'0.05',units:0,unitRate:0,discount:10,monthly:0,months:0}).total,4);
  assert.equal(C.quote({base:10,units:1,unitRate:5,discount:100,monthly:8,months:2}).total,1600);
  assert.equal(C.quote({base:'999999.99',units:9999,unitRate:'999999.99',discount:'99.99',monthly:0,months:0}).total,99999999);
  for(const [key,value] of [['base','-1'],['units','0.5'],['discount','101'],['months','37'],['unitRate','0.001']]) assert.throws(()=>C.quote({base:500,units:8,unitRate:35,discount:10,monthly:60,months:3,[key]:value}));
});
check('Merge upserts deterministically, preserves omissions, and validates all sources', () => {
  const header='order_id,date,channel,amount\n';
  const master=header+'A,2026-09-01,Direct,180.00\nB,2026-09-02,Partner,200.00\n';
  const batches=[header+'B,2026-09-02,Partner,220.00\nC,2026-09-03,Direct,90.00\n',header+'D,2026-09-04,Online,150.00\n',header+'C,2026-09-03,Direct,120.00\n'];
  const r=C.mergeReports(master,batches);
  assert.equal(r.rows.length,4); assert.equal(r.totalCents,67000); assert.equal(r.inserted,2); assert.equal(r.updated,2);
  assert.equal(r.rows[0].order_id,'A'); assert.equal(r.rows[2].amount,'120.00');
  assert.throws(()=>C.mergeReports(master,[batches[0],batches[1],header+'E,2026-02-30,X,1.00\n']),/valid/);
  assert.throws(()=>C.mergeReports(master,[batches[0],header+'D,2026-09-04,X,1\nD,2026-09-04,X,2\n',header]),/duplicate/);
  assert.equal(C.mergeReports(master,batches).totalCents,67000);
  const same=C.mergeReports(C.csv(C.mergeHeaders,r.rows),[header,header,batches[2]]);
  assert.equal(same.updated,0); assert.equal(same.inserted,0); assert.equal(same.unchanged,1);
});
console.log(checks + ' behavior checks passed.');
