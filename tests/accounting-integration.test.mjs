import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const js=ts.transpileModule(readFileSync(new URL('../src/accounting.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const module={exports:{}};
new Function('module','exports',js)(module,module.exports);
const {pendingRecurringAmount,monthlyAmounts,reconcileMonthlyRows}=module.exports;
const wallets=new Set(['wallet-a']);
const recurring=[{id:'salary',wallet_id:'wallet-a',kind:'income',amount:2000,next_due_on:'2026-11-10'},{id:'rent',wallet_id:'wallet-a',kind:'expense',amount:700,next_due_on:'2026-11-05'},{id:'other',wallet_id:'wallet-b',kind:'income',amount:900,next_due_on:'2026-11-10'}];
const rows=[{wallet_id:'wallet-a',month:'2026-11',income:300,expense:50}];
test('current month includes only accessible pending recurring transactions',()=>{assert.deepEqual(monthlyAmounts(rows,recurring,[],'2026-11','2026-11-01',wallets,true),{income:2300,expense:750})});
test('toggle off excludes all unconfirmed recurring amounts',()=>{assert.deepEqual(monthlyAmounts(rows,recurring,[],'2026-11','2026-11-01',wallets,false),{income:300,expense:50})});
test('confirmation does not double-count recurring income',()=>{const recorded=[{recurring_id:'salary',occurred_on:'2026-11-10'}];const updated=[{wallet_id:'wallet-a',month:'2026-11',income:2300,expense:50}];assert.deepEqual(monthlyAmounts(updated,recurring,recorded,'2026-11','2026-11-01',wallets,true),{income:2300,expense:750})});
test('recurring not included in past or future months',()=>{assert.deepEqual(monthlyAmounts(rows,recurring,[],'2026-10','2026-11-01',wallets,true),{income:0,expense:0});assert.equal(pendingRecurringAmount(recurring,[],'2026-12','income',wallets,true),0)});
test('same-day pending recurring is included and wallet scope is enforced',()=>{const sameDay=[{...recurring[0],next_due_on:'2026-11-01'}];assert.equal(pendingRecurringAmount(sameDay,[],'2026-11','income',wallets,true),2000);assert.equal(pendingRecurringAmount(sameDay,[],'2026-11','income',new Set(),true),0)});

test('confirmation advances recurrence to next month without duplicating current month',()=>{const advanced=[{...recurring[0],next_due_on:'2026-12-10'},recurring[1]];const recorded=[{recurring_id:'salary',occurred_on:'2026-11-10'}];const booked=[{wallet_id:'wallet-a',month:'2026-11',income:2300,expense:50}];assert.deepEqual(monthlyAmounts(booked,advanced,recorded,'2026-11','2026-11-01',wallets,true),{income:2300,expense:750});});
test('recurrence confirmed on its due date does not count twice',()=>{const recorded=[{recurring_id:'salary',occurred_on:'2026-11-10'}];assert.equal(pendingRecurringAmount(recurring,recorded,'2026-11','income',wallets,true),0)});
test('a recurrence belonging to another wallet never leaks into a family report',()=>{assert.equal(pendingRecurringAmount(recurring,[],'2026-11','income',new Set(['wallet-b']),true),900)});

test('reconciliation excludes future entries and internal transfers when viewing posted totals',()=>{
 const data=[{wallet_id:'wallet-a',month:'2026-11',income:500,expense:250}];
 const entries=[{wallet_id:'wallet-a',occurred_on:'2026-11-20',kind:'income',amount:200,transfer_id:null},{wallet_id:'wallet-a',occurred_on:'2026-11-22',kind:'expense',amount:50,transfer_id:null},{wallet_id:'wallet-a',occurred_on:'2026-11-25',kind:'expense',amount:100,transfer_id:'transfer-1'}];
 assert.deepEqual(reconcileMonthlyRows(data,entries,'2026-11-01',false,wallets),[{wallet_id:'wallet-a',month:'2026-11',income:300,expense:200}]);
 assert.deepEqual(reconcileMonthlyRows(data,entries,'2026-11-01',true,wallets),data);
});
test('reconciliation isolates wallets and does not subtract current-day movements',()=>{
 const data=[{wallet_id:'wallet-a',month:'2026-11',income:400,expense:100},{wallet_id:'wallet-b',month:'2026-11',income:900,expense:0}];
 const entries=[{wallet_id:'wallet-a',occurred_on:'2026-11-01',kind:'income',amount:100},{wallet_id:'wallet-a',occurred_on:'2026-11-03',kind:'income',amount:300},{wallet_id:'wallet-b',occurred_on:'2026-11-03',kind:'income',amount:900}];
 assert.deepEqual(reconcileMonthlyRows(data,entries,'2026-11-01',false,wallets),[{wallet_id:'wallet-a',month:'2026-11',income:100,expense:100}]);
});
