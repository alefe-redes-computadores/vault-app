import {validDay,validHour,type Scope} from './center-view';
export type NativeReviewIntent=Scope&{medicationId:string;day:string;hour:string};
const TTL=5*60_000;
let pending:{token:string;intent:NativeReviewIntent;expiresAt:number}|null=null;
const scoped=(value:string)=>typeof value==='string'&&value.trim()===value&&value.length>0&&value.length<=160;
/** Ephemeral navigation only. Never store a clinical fact, unit, owner or person in a URL or localStorage. */
export function stageNativeDoseReview(intent:NativeReviewIntent,now=Date.now(),makeToken=()=>crypto.randomUUID()):string {
 if(!scoped(intent.user_id)||!scoped(intent.person_id)||!scoped(intent.medicationId)||!validDay(intent.day)||!validHour(intent.hour)||!Number.isFinite(now))throw Error('Contexto da notificação inválido.');
 const token=makeToken();if(!/^[a-zA-Z0-9-]{16,128}$/.test(token))throw Error('Identidade de revisão inválida.');
 pending={token,intent:{...intent},expiresAt:now+TTL};
 return '/hoje?'+new URLSearchParams({data:intent.day,focus:'doses',time:intent.hour,native_review:token}).toString();
}
export function readNativeDoseReview(token:string,scope:Scope,day:string,now=Date.now()):NativeReviewIntent|null {
 if(!pending||pending.token!==token)return null;
 if(!Number.isFinite(now)||now>=pending.expiresAt||pending.intent.user_id!==scope.user_id||pending.intent.person_id!==scope.person_id||pending.intent.day!==day)return null;
 return {...pending.intent};
}
export function discardNativeDoseReview(token:string):void{if(pending?.token===token)pending=null;}
export type NativeReviewItem={medicamentoId?:string;horario:string;tomada:boolean;ignorada:boolean;isDataConflict?:boolean;isSintoma?:boolean;isAvulsa?:boolean;doseKind?:string;logId?:string};
/** The current timeline and slot authority decide whether a stale notification can still open a review. */
export function findNativeReviewItem<T extends NativeReviewItem>(intent:NativeReviewIntent,items:readonly T[],slot:{state:string;records:readonly {id?:string;dose_kind?:string|null}[]}):T|null{
 if(!['absent','pending'].includes(slot.state)||slot.records.length>1)return null;
 const row=slot.records[0];if(slot.state==='pending'&&!row?.id||slot.state==='absent'&&row)return null;
 const eligible=items.filter(item=>item.medicamentoId===intent.medicationId&&item.horario===intent.hour&&!item.tomada&&!item.ignorada&&!item.isDataConflict&&!item.isSintoma&&item.doseKind!=='sos'&&item.doseKind!=='extra'&&(row?.dose_kind==='planned'?item.logId===row.id&&item.doseKind==='planned':!item.isAvulsa&&item.doseKind!=='planned'));
 return eligible.length===1?eligible[0]:null;
}
