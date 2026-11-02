import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
const advance=(iso,frequency)=>{const[y,m,d]=iso.split('-').map(Number);const target=frequency==='monthly'?new Date(Date.UTC(y,m,1)):frequency==='bimonthly'?new Date(Date.UTC(y,m+1,1)):new Date(Date.UTC(y+1,m-1,1));const last=new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0)).getUTCDate();return [target.getUTCFullYear(),String(target.getUTCMonth()+1).padStart(2,'0'),String(Math.min(d,last)).padStart(2,'0')].join('-')};
const estimate=(bill,payments)=>{if(!bill.variable_amount)return bill.amount;if(bill.received_amount!==null)return bill.received_amount;const history=payments.filter(p=>p.recurring_id===bill.id&&p.occurred_on<bill.next_due_on).sort((a,b)=>b.occurred_on.localeCompare(a.occurred_on)).slice(0,3);return history.length?history.reduce((s,p)=>s+p.amount,0)/history.length:bill.amount};
test('bimonthly recurrence advances two calendar months',()=>{assert.equal(advance('2026-11-15','bimonthly'),'2027-01-15');assert.equal(advance('2026-12-31','bimonthly'),'2027-02-28')});
test('monthly recurrence clamps leap days',()=>{assert.equal(advance('2028-01-31','monthly'),'2028-02-29');assert.equal(advance('2026-01-31','monthly'),'2026-02-28')});
test('variable bill requires received amount to book',()=>{const bill={variable_amount:true,amount:180,received_amount:null};assert.equal(bill.variable_amount?bill.received_amount:bill.amount,null);bill.received_amount=194;assert.equal(bill.variable_amount?bill.received_amount:bill.amount,194)});
test('estimates average last three paid bills',()=>{const b={id:'a',variable_amount:true,received_amount:null,amount:150,next_due_on:'2026-11-15'};const payments=[100,160,190,220].map((amount,i)=>({recurring_id:'a',amount,occurred_on:'2026-0'+(i+5)+'-15'}));assert.equal(estimate(b,payments),190)});
test('received amount overrides historical estimate',()=>{const b={id:'a',variable_amount:true,received_amount:210,amount:150,next_due_on:'2026-11-15'};assert.equal(estimate(b,[]),210)});
test('future paid entries cannot influence current estimate',()=>{const b={id:'a',variable_amount:true,received_amount:null,amount:150,next_due_on:'2026-11-15'};assert.equal(estimate(b,[{recurring_id:'a',amount:999,occurred_on:'2026-12-15'}]),150)});
test('already booked occurrence excluded from projection',()=>{const paid=[{recurring_id:'a',occurred_on:'2026-11-15'}];assert.equal(paid.some(m=>m.recurring_id==='a'&&m.occurred_on==='2026-11-15'),true)});
test('UI uses history to avoid recurrence duplicate forecast',()=>{assert.match(source,/billHistory\.some\(m=>m\.recurring_id===r\.id&&m\.occurred_on===date\)/)});
test('UI prevents booking unreceived variable bill',()=>{assert.match(source,/x\.variable_amount&&x\.received_amount===null/)});
test('UI includes bimonthly option',()=>{assert.match(source,/<option value="bimonthly">Bimestrale<\/option>/)});

test('payment confirmation shows inline feedback and refreshes deleted bills',()=>{assert.match(source,/setPaymentFeedback\('Pagamento registrato correttamente\.'\)/);assert.match(source,/Questa scadenza non esiste più/);assert.match(source,/role="status" className="payment-feedback"/);assert.match(source,/Pagamento non registrato:/);});
