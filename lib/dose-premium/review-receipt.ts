import {buildReviewIntent,type ReviewMode} from './review-intent';
import {type CenterRow,type DoseCenterView,type Scope,validInstant} from './center-view';
export type ReviewRequest={scope:Scope;day:string;today:string;asOf:string;rows:readonly CenterRow[];mode:ReviewMode;customDay?:string;customHour?:string;reason?:string};
const fingerprint=(r:CenterRow)=>JSON.stringify([r.user_id,r.person_id,r.key,r.medication_id,r.day,r.hour,r.status,r.routine,r.eligible,r.stock,r.origin,r.log_id??null,r.quantityLabel,r.actualAt,r.ignoredReason]);
const scopeEqual=(a:Scope,b:Scope)=>a.user_id===b.user_id&&a.person_id===b.person_id;
/** No persisted locks or second executor. Snapshot is invalidated before delegating to existing review/writer. */
export function freezeReview(request:ReviewRequest){
  const intent=buildReviewIntent(request);
  return {scope:{...request.scope},day:request.day,today:request.today,asOf:request.asOf,mode:request.mode,customDay:request.customDay,customHour:request.customHour,reason:request.reason,items:request.rows.map(r=>({key:r.key,fingerprint:fingerprint(r)})),intent};
}
export type FrozenReview=ReturnType<typeof freezeReview>;
export function revalidateReview(draft:FrozenReview,latest:DoseCenterView,now:{today:string;asOf:string}){
  if(!latest.ready||!scopeEqual(draft.scope,latest.scope)||draft.day!==latest.day||draft.today!==now.today||!validInstant(now.asOf)||Date.parse(now.asOf)<Date.parse(draft.asOf))throw Error('Contexto mudou; reabra a revisão.');
  if(draft.items.length>1&&latest.dataConflict)throw Error('Há conflitos na revisão em lote.');
  const byKey=new Map<string,CenterRow[]>();for(const rows of Object.values(latest.groups))for(const row of rows){const a=byKey.get(row.key);if(a)a.push(row);else byKey.set(row.key,[row]);}
  const rows=draft.items.map(x=>{const a=byKey.get(x.key);if(!a||a.length!==1||fingerprint(a[0])!==x.fingerprint)throw Error('A dose ou o estoque mudou; confira novamente.');return a[0];});
  // Revalidate chronology but preserve the explicitly reviewed actual instant, including the single now instant for a batch.
  buildReviewIntent({...draft,asOf:now.asOf,rows});
  const reviewed=buildReviewIntent({...draft,rows});
  if(JSON.stringify(reviewed)!==JSON.stringify(draft.intent))throw Error('Intenção de revisão divergente.');
  return reviewed;
}
export type WriterOutcome={key:string;status:'confirmed_local'|'failed'|'skipped';logId?:string;reason?:string};
/** Caller supplies actual committed writer results; no network or database action here. */
export function summarizeWriterOutcomes(draft:FrozenReview,outcomes:readonly WriterOutcome[]){
  const keys=new Set(draft.items.map(x=>x.key)),seen=new Set<string>(),ids=new Set<string>();let invalid=false;
  const confirmed:WriterOutcome[]=[],failed:WriterOutcome[]=[],skipped:WriterOutcome[]=[];
  for(const row of outcomes){if(!keys.has(row.key)||seen.has(row.key)){invalid=true;continue;}seen.add(row.key);
    if(row.status==='confirmed_local'&&typeof row.logId==='string'&&row.logId.trim()&& !ids.has(row.logId)){ids.add(row.logId);confirmed.push(row);}
    else if(row.status==='failed')failed.push(row);else if(row.status==='skipped')skipped.push(row);else invalid=true;
  }
  const missing=draft.items.filter(x=>!seen.has(x.key)).map(x=>x.key);
  return {confirmed,failed,skipped,missing,invalid,complete:!invalid&&!missing.length&&!failed.length&&!skipped.length&&confirmed.length===keys.size,synced:false as const};
}
