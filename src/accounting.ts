export type RecurringForAccounting={id:string;wallet_id:string;kind:'income'|'expense';amount:number;next_due_on:string};
export type MovementForAccounting={recurring_id:string|null;occurred_on:string};
export function pendingRecurringAmount(recurring:RecurringForAccounting[],movements:MovementForAccounting[],month:string,kind:'income'|'expense',walletIds:ReadonlySet<string>,enabled:boolean):number{
 if(!enabled)return 0;
 return recurring.filter(r=>r.kind===kind&&r.next_due_on.startsWith(month)&&walletIds.has(r.wallet_id)&&!movements.some(m=>m.recurring_id===r.id&&m.occurred_on===r.next_due_on)).reduce((sum,r)=>sum+Number(r.amount),0);
}
export function monthlyAmounts(rows:{wallet_id:string;month:string;income:number;expense:number}[],recurring:RecurringForAccounting[],movements:MovementForAccounting[],month:string,today:string,walletIds:ReadonlySet<string>,includeFuture:boolean){
 const current=rows.filter(r=>r.month===month&&walletIds.has(r.wallet_id));
 const recurringEnabled=includeFuture&&month===today.slice(0,7);
 return {income:current.reduce((s,r)=>s+Number(r.income),0)+pendingRecurringAmount(recurring,movements,month,'income',walletIds,recurringEnabled),expense:current.reduce((s,r)=>s+Number(r.expense),0)+pendingRecurringAmount(recurring,movements,month,'expense',walletIds,recurringEnabled)};
}
