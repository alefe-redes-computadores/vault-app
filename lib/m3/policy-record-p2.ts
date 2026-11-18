/** M3 P2 — política sincronizável por objeto clínico, distinta do evento e do aviso nativo.
 * Não contém dados de diagnóstico, prescrições, doses ou estoque.
 */
export type EventKindP2 = 'consulta'|'cirurgia'|'exame'|'retirada'|'compra'|'retorno'|'checkin';
export const EVENT_KINDS_P2:readonly EventKindP2[] = ['consulta','cirurgia','exame','retirada','compra','retorno','checkin'];
export const EVENT_PRESETS_P2 = [10080,2880,1440,180,60,30,15,0] as const;
export const EVENT_POLICY_CHANGED_P2='vault:m3:p2:event-policies-changed';
export const CHECKIN_DAYS_P2=[1,3,10] as const;
export type CheckinDayP2=typeof CHECKIN_DAYS_P2[number];
export type CheckinAnswerP2='reconheci'|'ja_sabia'|'dispensar'|'adiar';
export type CheckinResponseP2={answer:CheckinAnswerP2;at:string;snoozed_until?:string|null};
export type EventPolicyRecordP2={
  id:string;user_id:string;person_id:string;event_kind:EventKindP2;event_id:string;
  enabled:boolean;offsets:number[]|null;custom_at:string|null;
  consent_at?:string|null;checkin_answers?:Partial<Record<CheckinDayP2,CheckinResponseP2>>;
  created_at:string;updated_at:string;synced:boolean;
};
export type EventPolicyValueP2={enabled:boolean;offsets:number[]|null;custom_at:string|null};
const clock=/^([01]\d|2[0-3]):[0-5]\d$/;
const iso=/^\d{4}-\d{2}-\d{2}$/;
export const eventScopeP2=(value:{userId:string;personId:string;kind:EventKindP2;id:string}):boolean=>
 Boolean(value.userId?.trim()&&value.personId?.trim()&&value.id?.trim()&&value.id.length<=180&&EVENT_KINDS_P2.includes(value.kind));
export function localDateP2(value:string):Date|null{
  if(!iso.test(value))return null;
  const [y,m,d]=value.split('-').map(Number),date=new Date(y,m-1,d,12);
  return date.getFullYear()===y&&date.getMonth()===m-1&&date.getDate()===d?date:null;
}
export function validLocalDateTimeP2(value:string):boolean{
  if(!/^\d{4}-\d{2}-\d{2}T[0-2]\d:[0-5]\d$/.test(value))return false;
  const [day,time]=value.split('T');if(!clock.test(time))return false;
  const at=localDateP2(day);if(!at)return false;
  const [h,m]=time.split(':').map(Number);at.setHours(h,m,0,0);
  return at.getHours()===h&&at.getMinutes()===m;
}
export function normalizePolicyP2(value:EventPolicyValueP2):EventPolicyValueP2{
  if(!value||typeof value.enabled!=='boolean')throw Error('Política de compromisso inválida.');
  const offsets=value.offsets===null?null:
    Array.isArray(value.offsets)&&value.offsets.length<=4&&value.offsets.every(n=>typeof n==='number'&&EVENT_PRESETS_P2.some(k=>k===n))?
      [...new Set(value.offsets)].sort((a,b)=>b-a):undefined;
  if(offsets===undefined)throw Error('Selecione até quatro antecedências válidas.');
  if(value.custom_at!==null&&(typeof value.custom_at!=='string'||!validLocalDateTimeP2(value.custom_at)))throw Error('Data/hora personalizada inválida.');
  return {enabled:value.enabled,offsets,custom_at:value.custom_at};
}
export function isOwnedPolicyP2(row:EventPolicyRecordP2,userId:string,personId:string):boolean{
  return Boolean(userId&&personId&&row.user_id===userId&&row.person_id===personId&&EVENT_KINDS_P2.includes(row.event_kind));
}
export function scopePolicyForEventP2<T extends EventPolicyRecordP2>(rows:readonly T[],userId:string,personId:string,kind:EventKindP2,id:string):T|null{
  if(!userId||!personId||!id)return null;
  return rows.find(row=>isOwnedPolicyP2(row,userId,personId)&&row.event_kind===kind&&row.event_id===id)??null;
}
export type EventQuietP2={enabled:boolean;start:string;end:string;kinds:EventKindP2[]};
export const DEFAULT_EVENT_QUIET_P2:EventQuietP2={enabled:false,start:'22:00',end:'08:00',kinds:[]};
const quietKey=(userId:string,personId:string)=>`vault:m3:p2:quiet:v1:${encodeURIComponent(userId)}:${encodeURIComponent(personId)}`;
export function validQuietP2(value:EventQuietP2):EventQuietP2{
  if(!value||typeof value.enabled!=='boolean'||!clock.test(value.start)||!clock.test(value.end)||value.start===value.end||
    !Array.isArray(value.kinds)||value.kinds.some(k=>!EVENT_KINDS_P2.includes(k)))throw Error('Horário de silêncio inválido.');
  return {...value,kinds:[...new Set(value.kinds)]};
}
export function readEventQuietP2(userId:string,personId:string):EventQuietP2{
  if(typeof window==='undefined'||!userId||!personId)return {...DEFAULT_EVENT_QUIET_P2,kinds:[]};
  try{const raw=window.localStorage.getItem(quietKey(userId,personId));return raw&&raw.length<1500?validQuietP2(JSON.parse(raw)): {...DEFAULT_EVENT_QUIET_P2,kinds:[]};}
  catch{return {...DEFAULT_EVENT_QUIET_P2,kinds:[]};}
}
export function writeEventQuietP2(userId:string,personId:string,value:EventQuietP2):void{
  if(typeof window==='undefined'||!userId||!personId)throw Error('Selecione conta e pessoa.');
  window.localStorage.setItem(quietKey(userId,personId),JSON.stringify(validQuietP2(value)));
  window.dispatchEvent(new Event(EVENT_POLICY_CHANGED_P2));window.dispatchEvent(new Event('vault:health-reminders-reconcile'));
}
export function quietEventP2(at:Date,kind:EventKindP2,quiet:EventQuietP2):boolean{
  if(!quiet.enabled||!quiet.kinds.includes(kind)||!Number.isFinite(at.getTime()))return false;
  const mins=(s:string)=>Number(s.slice(0,2))*60+Number(s.slice(3));
  const begin=mins(quiet.start),end=mins(quiet.end),now=at.getHours()*60+at.getMinutes();
  return begin<end?now>=begin&&now<end:now>=begin||now<end;
}
export type PlannedInstantP2={at:Date;offsetMinutes:number;source:'preset'|'custom'};
export function planInstantsP2(args:{eventAt:Date;now:Date;fallbackOffsets:readonly number[];policy:EventPolicyValueP2|null;quiet:EventQuietP2;kind:EventKindP2}):PlannedInstantP2[]{
  const {eventAt,now,policy,quiet,kind}=args;
  if(!Number.isFinite(eventAt.getTime())||eventAt<=now||policy?.enabled===false)return [];
  const offsets=policy?.offsets??args.fallbackOffsets;
  const all:PlannedInstantP2[]=offsets.filter(n=>EVENT_PRESETS_P2.some(x=>x===n)).map(n=>({at:new Date(eventAt.getTime()-n*60000),offsetMinutes:n,source:'preset'}));
  const custom=policy?.custom_at;
  if(custom&&validLocalDateTimeP2(custom)){
    const [day,time]=custom.split('T'),[hour,minute]=time.split(':').map(Number);
    const at=localDateP2(day)!;at.setHours(hour,minute,0,0);
    if(at<=eventAt)all.push({at,offsetMinutes:-1,source:'custom'});
  }
  const seen=new Set<number>();
  return all.filter(item=>item.at>now&&!quietEventP2(item.at,kind,quiet)&&!seen.has(item.at.getTime())&&Boolean(seen.add(item.at.getTime())))
    .sort((a,b)=>a.at.getTime()-b.at.getTime()).slice(0,5);
}
/** Predictable UUIDv8 from SHA-256, consistent across devices and offline creation. */
export async function deterministicPolicyIdP2(userId:string,personId:string,kind:EventKindP2,eventId:string):Promise<string>{
  if(!eventScopeP2({userId,personId,kind,id:eventId}))throw Error('Compromisso sem escopo válido.');
  if(!globalThis.crypto?.subtle)throw Error('Identidade criptográfica indisponível; nenhuma gravação realizada.');
  const digest=new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(['vault-policy-p2',userId,personId,kind,eventId].join('\0'))));
  const b=digest.slice(0,16);b[6]=(b[6]&15)|0x80;b[8]=(b[8]&63)|0x80;
  const h=[...b].map(n=>n.toString(16).padStart(2,'0')).join('');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;
}
