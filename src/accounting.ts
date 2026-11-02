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

export type MonthlyRow={wallet_id:string;month:string;income:number;expense:number};
export type DatedMovement={wallet_id:string;occurred_on:string;kind:'income'|'expense';amount:number;transfer_id?:string|null};
export function reconcileMonthlyRows(rows:MonthlyRow[],movements:DatedMovement[],today:string,includeFuture:boolean,walletIds:ReadonlySet<string>):MonthlyRow[]{
 const futureByKey=new Map<string,{income:number;expense:number}>();
 if(!includeFuture)for(const m of movements){
  if(m.occurred_on<=today||m.transfer_id||!walletIds.has(m.wallet_id))continue;
  const key=m.wallet_id+'|'+m.occurred_on.slice(0,7);
  const amounts=futureByKey.get(key)||{income:0,expense:0};
  amounts[m.kind]+=Number(m.amount);
  futureByKey.set(key,amounts);
 }
 return rows.filter(r=>walletIds.has(r.wallet_id)).map(r=>{
  const future=futureByKey.get(r.wallet_id+'|'+r.month);
  return { ...r,income:Number(r.income)-(future?.income||0),expense:Number(r.expense)-(future?.expense||0)};
 });
}

export type WalletBalanceRow={id:string;opening_balance:number};
export function reconcileWalletBalances(wallets:WalletBalanceRow[],totals:{wallet_id:string;net_movements:number}[],future:{wallet_id:string;future_net:number}[]){
 const net=new Map(totals.map(x=>[x.wallet_id,Number(x.net_movements)]));
 const scheduled=new Map(future.map(x=>[x.wallet_id,Number(x.future_net)]));
 return wallets.map(w=>({wallet_id:w.id,posted:Number(w.opening_balance)+(net.get(w.id)||0)-(scheduled.get(w.id)||0),booked:Number(w.opening_balance)+(net.get(w.id)||0)}));
}

export type ForecastEntry={date:string;kind:'income'|'expense';amount:number};
export function buildSixMonthForecast(today:string,openingBalance:number,entries:ForecastEntry[]){
 const [y,m]=today.split('-').map(Number);
 let running=openingBalance;
 return Array.from({length:6},(_,i)=>{
  const start=new Date(Date.UTC(y,m-1+i,1)).toISOString().slice(0,10);
  const end=new Date(Date.UTC(y,m+i,0)).toISOString().slice(0,10);
  const current=entries.filter(e=>e.date>today&&e.date>=start&&e.date<=end);
  const income=current.filter(e=>e.kind==='income').reduce((s,e)=>s+Number(e.amount),0);
  const expense=current.filter(e=>e.kind==='expense').reduce((s,e)=>s+Number(e.amount),0);
  running+=income-expense;
  return {month:start.slice(0,7),end,income,expense,balance:running,negative:running<0};
 });
}

export type DuplicateCandidate={description:string;category:string;created_by:string};
export function isPotentialDuplicate(candidates:DuplicateCandidate[],description:string,category:string,creatorId:string):boolean{
 const normalized=description.trim().normalize('NFKC').toLocaleLowerCase();
 return candidates.some(x=>x.created_by===creatorId&&x.category===category&&x.description.trim().normalize('NFKC').toLocaleLowerCase()===normalized);
}
export function validPositiveAmount(raw:string):boolean{return raw.trim()!==''&&Number.isFinite(Number(raw))&&Number(raw)>0;}
export function validISODate(raw:string):boolean{return /^\d{4}-\d{2}-\d{2}$/.test(raw)&&!Number.isNaN(Date.parse(raw))&&new Date(raw).toISOString().slice(0,10)===raw;}
