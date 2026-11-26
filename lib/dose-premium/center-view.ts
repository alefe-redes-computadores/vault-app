import {historicalPharmaceuticalIdentity,type PharmaceuticalSnapshot} from './pharmaceutical-snapshot';
import {describeHistoricalDose,type DoseUnitFields} from './historical-unit';
export type Scope={user_id:string;person_id:string};
export type DoseStatus='confirmed'|'overdue'|'due_now'|'upcoming'|'ignored'|'planned'|'conflict'|'unconfirmed';
/** Host supplies the canonical classification, stock and eligibility; this module only groups and rejects inconsistent evidence. */
export type CanonicalDoseRow=Scope&{key:string;day:string;hour:string;medication_id:string;name:string;format?:string;colors?:string[];status:DoseStatus;routine:boolean;eligible:boolean;stock:'available'|'unavailable'|'unknown';origin:'scheduled'|'temporary_course'|'ad_hoc'|'sos'|'extra'|'unknown';log_id?:string;planned_quantity_label?:string;medicationAvailable?:boolean;concentration?:string;relationColor?:string};
export type HistoricalDose=Partial<DoseUnitFields>&{farmaco_snapshot?:PharmaceuticalSnapshot|null;id?:string;user_id:string;person_id?:string;medicamento_id:string;data:string;horario:string;tomado_em?:string|null;ignorado_em?:string|null;quantidade?:number|null;dose_kind?:'scheduled'|'sos'|'extra'|'planned';motivo?:string;created_at?:string|null;updated_at?:string|null;synced?:boolean};
export type CenterRow=CanonicalDoseRow&{pharmaceuticalSource?:'cadastro_no_registro'|'cadastro_atual';quantityLabel:string;actualAt:string|null;ignoredReason:string|null;scheduledHour:string|null;createdAt:string|null;updatedAt:string|null;localSync:'pending'|'synced'|'unknown';retroactive:boolean|null};
const statuses: DoseStatus[]=['confirmed','overdue','due_now','upcoming','ignored','planned','conflict','unconfirmed'];
export const validHour=(v:string)=>/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(v);
export function validDay(v:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||v.startsWith('0000'))return false;const d=new Date(v+'T00:00:00.000Z');return Number.isFinite(d.valueOf())&&d.toISOString().slice(0,10)===v;}
export function validInstant(v:unknown):v is string{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,6})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(v))return false;return validDay(v.slice(0,10))&&Number.isFinite(Date.parse(v));}
const localDay=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const sameScope=(x:{user_id:string;person_id?:string},s:Scope)=>x.user_id===s.user_id&&x.person_id===s.person_id;
const grouped=(rows:CenterRow[])=>{const m=new Map<string,CenterRow[]>();for(const r of rows){const a=m.get(r.hour);if(a)a.push(r);else m.set(r.hour,[r]);}return [...m.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([hour,items])=>({hour,items}));};
export function doseCenterView(input:{scope:Scope;day:string;today:string;now:string;asOf:string;load:'loading'|'error'|'ready';rows:readonly CanonicalDoseRow[];logs:readonly HistoricalDose[]}){
  const {scope,day,today,now,asOf,load}=input;
  const valid=Boolean(scope.user_id&&scope.person_id)&&validDay(day)&&validDay(today)&&validHour(now)&&validInstant(asOf);
  const buckets=Object.fromEntries(statuses.map(s=>[s,[] as CenterRow[]])) as Record<DoseStatus,CenterRow[]>;
  let conflict=false;
  const base=()=>({day,today,scope:{...scope},load:valid?load:'error' as const,groups:buckets,pending:grouped([...buckets.overdue,...buckets.due_now]),upcoming:grouped(buckets.upcoming),eligibleGroups:[] as ReturnType<typeof grouped>,ready:false,allOnTime:false,empty:false,dataConflict:conflict,dayState:'unavailable' as 'unavailable'|'pending'|'upcoming'|'completed'|'empty'|'review'|'historical'|'future',routineSummary:{total:0,taken:0,ignored:0,unresolved:0,resolved:0,resolutionPercent:null as number|null,adherencePercent:null as number|null}});
  if(!valid||load!=='ready')return base(); // never reveal stale snapshots while loading or failed
  const counts=new Map<string,number>(),routineSlots=new Map<string,number>(),byId=new Map<string,HistoricalDose[]>();
  const slotKey=(x:CanonicalDoseRow)=>JSON.stringify([x.medication_id,x.day,x.hour]);
  const source=input.rows.filter(x=>sameScope(x,scope)&&x.day===day);
  for(const x of source){counts.set(x.key,(counts.get(x.key)??0)+1);if(x.routine){const k=slotKey(x);routineSlots.set(k,(routineSlots.get(k)??0)+1);}}
  for(const l of input.logs){if(!sameScope(l,scope)||l.data!==day||!l.id)continue;const a=byId.get(l.id);if(a)a.push(l);else byId.set(l.id,[l]);}
  const usedLogs=new Map<string,number>();for(const x of source)if(x.log_id)usedLogs.set(x.log_id,(usedLogs.get(x.log_id)??0)+1);
  for(const row of source){
    if(!row.key||!row.medication_id||!validHour(row.hour)||!statuses.includes(row.status)||counts.get(row.key)!==1){conflict=true;continue;}
    let status=row.routine&&(routineSlots.get(slotKey(row))??0)>1?'conflict' as DoseStatus:row.status,actualAt:string|null=null,ignoredReason:string|null=null;
    let createdAt:string|null=null,updatedAt:string|null=null,localSync:CenterRow['localSync']='unknown',retroactive:boolean|null=null;
    let quantityLabel=row.planned_quantity_label?.trim()||'Quantidade prevista não informada';
    const facts= row.log_id?byId.get(row.log_id)??[]:[];
    // No lookup by name/current medication format; exact canonical log identity only.
    if(status==='confirmed'||status==='ignored'){
      const l=facts[0];
      const originMatches=!!l&&(row.origin==='sos'?l.dose_kind==='sos':row.origin==='extra'?l.dose_kind==='extra':row.origin==='ad_hoc'||row.origin==='temporary_course'?l.dose_kind==='planned':row.origin==='scheduled'?(!l.dose_kind||l.dose_kind==='scheduled'):true);
      if(facts.length!==1||usedLogs.get(row.log_id!)!==1||!l||l.medicamento_id!==row.medication_id||(typeof l.horario!=='string'||l.horario.slice(0,5)!==row.hour)||!originMatches||day>today||
        (status==='confirmed'?(!validInstant(l.tomado_em)||Date.parse(l.tomado_em)>Date.parse(asOf)||Boolean(l.ignorado_em)):(!validInstant(l.ignorado_em)||Date.parse(l.ignorado_em)>Date.parse(asOf)||Boolean(l.tomado_em))))status='conflict';
      else {quantityLabel=status==='confirmed'?describeHistoricalDose(l):'Não tomada registrada';actualAt=status==='confirmed'?l.tomado_em!:null;ignoredReason=status==='ignored'?l.motivo?.trim()||null:null;createdAt=validInstant(l.created_at)?l.created_at:null;updatedAt=validInstant(l.updated_at)?l.updated_at:null;localSync=l.synced===true?'synced':l.synced===false?'pending':'unknown';retroactive=actualAt&&createdAt?localDay(new Date(createdAt))>localDay(new Date(actualAt)):null;}
    }
    if((status==='upcoming'&&!(day===today&&row.hour>now))||((status==='overdue'||status==='due_now')&&(day!==today||row.hour>now)))status='unconfirmed';
    if(status==='conflict'||status==='unconfirmed'){conflict=true;quantityLabel='Confira o registro';actualAt=null;ignoredReason=null;}
    const pharma=(status==='confirmed'||status==='ignored')&&facts.length===1?historicalPharmaceuticalIdentity(facts[0]):null;
    const historicalIdentity=pharma?{name:pharma.nome,format:pharma.formato??pharma.forma_farmaceutica??undefined,colors:pharma.cores,concentration:pharma.dosagem??undefined,pharmaceuticalSource:'cadastro_no_registro' as const}:status==='confirmed'||status==='ignored'?{pharmaceuticalSource:'cadastro_atual' as const}:{};
    buckets[status].push({...row,...historicalIdentity,status,quantityLabel,actualAt,ignoredReason,createdAt,updatedAt,localSync,retroactive,scheduledHour:row.origin==='sos'||row.origin==='extra'||(row.origin==='unknown'&&!(row.routine&&facts.length===1&&facts[0].dose_kind==='planned'))?null:row.hour,eligible:row.eligible&&row.routine&&row.stock==='available'&&day===today&&row.hour<=now&&(status==='overdue'||status==='due_now')});
  }
  for(const v of Object.values(buckets))v.sort((a,b)=>a.hour.localeCompare(b.hour));
  const result=base(),pending=[...buckets.overdue,...buckets.due_now],hasRoutine=source.some(x=>x.routine);
  const routineRows=Object.values(buckets).flat().filter(x=>x.routine&&x.origin!=='sos'&&x.origin!=='extra');
  const total=source.filter(x=>x.routine&&x.origin!=='sos'&&x.origin!=='extra').length,taken=routineRows.filter(x=>x.status==='confirmed').length,ignored=routineRows.filter(x=>x.status==='ignored').length,resolved=taken+ignored,unresolved=Math.max(0,total-resolved);
  const routineSummary={total,taken,ignored,resolved,unresolved,resolutionPercent:total&&!conflict?Math.round(resolved*100/total):null,adherencePercent:total&&!conflict?Math.round(taken*100/total):null};
  const dayState:ReturnType<typeof base>['dayState']=day<today?'historical':day>today?'future':conflict?'review':pending.length?'pending':!total?'empty':!unresolved?'completed':buckets.upcoming.length?'upcoming':'review';
  return {...result,dayState,routineSummary,ready:true,dataConflict:conflict,eligibleGroups:conflict?[]:grouped(pending.filter(x=>x.eligible)),allOnTime:day===today&&!conflict&&hasRoutine&&!pending.length&&!buckets.planned.some(x=>x.routine),empty:source.length===0};
}
export type DoseCenterView=ReturnType<typeof doseCenterView>;
/** Recheck exact ordered membership on the latest canonical snapshot before opening the existing review. No writes. */
export function resolveReviewGroup(view:DoseCenterView,request:{scope:Scope;day:string;hour:string;keys:readonly string[]}):CenterRow[]|null{
  if(!view.ready||view.dataConflict||!sameScope(request.scope,view.scope)||request.day!==view.day||new Set(request.keys).size!==request.keys.length||request.keys.length<2)return null;
  const group=view.eligibleGroups.find(x=>x.hour===request.hour);if(!group||group.items.length!==request.keys.length)return null;
  const keys=new Set(request.keys);return group.items.every(x=>keys.has(x.key))?group.items:null;
}

export type DoseHistoryMedication=Scope&{id:string;name:string;format?:string;colors?:string[];concentration?:string;relationColor?:string};
export type DoseCenterTab='pending'|'upcoming'|'history';
export type DoseHistoryNature='all'|'scheduled'|'sos'|'extra'|'unknown';
export type DoseHistoryRange=1|7|30|90;
export type DoseCenterSelection={tab:DoseCenterTab|null;range:DoseHistoryRange;medicationId:string|null;nature:DoseHistoryNature};
export const defaultCenterSelection=():DoseCenterSelection=>({tab:null,range:1,medicationId:null,nature:'all'});
export function restoreCenterSelection(value:unknown):DoseCenterSelection {
  const x=value as Partial<DoseCenterSelection>|null;
  return {tab:x?.tab&&['pending','upcoming','history'].includes(x.tab)?x.tab:null,range:x?.range&&[1,7,30,90].includes(x.range)?x.range:1,medicationId:typeof x?.medicationId==='string'&&/^[\w-]{1,128}$/.test(x.medicationId)?x.medicationId:null,nature:x?.nature&&['all','scheduled','sos','extra','unknown'].includes(x.nature)?x.nature:'all'};
}
export function centerDefaultTab(view:DoseCenterView):DoseCenterTab {
  return view.dayState==='pending'?'pending':view.dayState==='completed'||view.dayState==='historical'?'history':view.dayState==='review'?'pending':view.dayState==='empty'&&(view.groups.confirmed.length||view.groups.ignored.length)?'history':'upcoming';
}
/** Civil range arithmetic, not a fixed 24h duration; independent of DST. */
export function historyRangeStart(end:string,range:DoseHistoryRange):string {
  if(!validDay(end)||![1,7,30,90].includes(range))throw Error('Período inválido.');
  const date=new Date(end+'T12:00:00.000Z');date.setUTCDate(date.getUTCDate()-(range-1));return date.toISOString().slice(0,10);
}
/** Factual history, not a reconstruction of past schedules from current prescriptions.
 * The same scoped log validation used by the day center is reused for each historical day.
 * Current identity is presentation only; never source of historical amount or unit.
 */
export function projectDoseHistory(input:{scope:Scope;today:string;end:string;range:DoseHistoryRange;asOf:string;load:'loading'|'error'|'ready';logs:readonly HistoricalDose[];medications:readonly DoseHistoryMedication[];plannedOrigin:(log:HistoricalDose)=>'temporary_course'|'ad_hoc'|'unknown'}){
  const {scope,today,asOf,load}=input;
  const end=validDay(input.end)&&validDay(today)?(input.end>today?today:input.end):null;
  const start=end?historyRangeStart(end,input.range):null;
  const blank={start,end,rows:[] as CenterRow[],medications:[] as {id:string;name:string}[],unreviewable:0,load};
  if(!scope.user_id||!scope.person_id||!start||!end||!validInstant(asOf))return {...blank,load:'error' as const};
  if(load!=='ready')return blank;
  const medById=new Map<string,DoseHistoryMedication>(),ambiguous=new Set<string>();
  for(const med of input.medications){if(!sameScope(med,scope)||!med.id)continue;if(medById.has(med.id)){ambiguous.add(med.id);medById.delete(med.id);}else if(!ambiguous.has(med.id))medById.set(med.id,med);}
  const days=new Map<string,HistoricalDose[]>(),idCount=new Map<string,number>();let unreviewable=0;
  for(const log of input.logs){if(!sameScope(log,scope)||!validDay(log.data)||log.data<start||log.data>end)continue;if(!log.tomado_em&&!log.ignorado_em)continue;if(!log.id||!log.medicamento_id||typeof log.horario!=='string'||!validHour(log.horario.slice(0,5))){unreviewable++;continue;}idCount.set(log.id,(idCount.get(log.id)??0)+1);const bucket=days.get(log.data)??[];bucket.push(log);days.set(log.data,bucket);}
  const rows:CenterRow[]=[];
  for(const [day,logs] of days){
    const source:CanonicalDoseRow[]=logs.flatMap(log=>{
      if(idCount.get(log.id!)!==1){unreviewable++;return [];}
      const med=medById.get(log.medicamento_id),origin:CanonicalDoseRow['origin']=log.dose_kind==='scheduled'?'scheduled':log.dose_kind==='sos'?'sos':log.dose_kind==='extra'?'extra':log.dose_kind==='planned'?input.plannedOrigin(log):'unknown';
      return [{...scope,key:`log:${log.id}`,day,hour:log.horario.slice(0,5),medication_id:log.medicamento_id,name:med?.name||'Medicamento não disponível',format:med?.format,colors:med?.colors,concentration:med?.concentration,relationColor:med?.relationColor,medicationAvailable:!!med,status:log.tomado_em&&log.ignorado_em?'conflict':log.tomado_em?'confirmed':'ignored',routine:log.dose_kind==='scheduled'||log.dose_kind==='planned',eligible:false,stock:'unknown',origin,log_id:log.id}];
    });
    const view=doseCenterView({scope,day,today,now:'23:59',asOf,load:'ready',rows:source,logs});
    rows.push(...view.groups.confirmed,...view.groups.ignored,...view.groups.conflict,...view.groups.unconfirmed);
  }
  rows.sort((a,b)=>b.day.localeCompare(a.day)||b.hour.localeCompare(a.hour)||a.key.localeCompare(b.key));
  const medicationChoices=new Map<string,string>();for(const row of rows)medicationChoices.set(row.medication_id,row.name);
  return {...blank,rows,unreviewable,medications:[...medicationChoices.entries()].map(([id,name])=>({id,name})).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')||a.id.localeCompare(b.id))};
}
export type DoseHistoryView=ReturnType<typeof projectDoseHistory>;
export function filterDoseHistory(view:DoseHistoryView,selection:DoseCenterSelection):CenterRow[] {
  return view.rows.filter(row=>(!selection.medicationId||selection.medicationId===row.medication_id)&&(selection.nature==='all'||selection.nature==='scheduled'&&row.routine||selection.nature===row.origin));
}
