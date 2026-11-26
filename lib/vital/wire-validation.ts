/** Validate shape at the sync boundary. SQL has separate ownership/constraint guards.
 * This is not a writer; never fill missing values in a remote record. */
import {TABLES,type TableName} from './model';
import {EXERCISE_IDENTITIES,NUTRITION_MODALITIES,getExercise} from './catalog';
import {civil,fail,number,nutrients,oneOf,requireBoolean,requireId,text,time,instant,uniqueIds} from './validation';
const obj=(v:unknown):Record<string,unknown>=>{if(!v||typeof v!=='object'||Array.isArray(v))fail('Objeto Vital inválido.');return v as Record<string,unknown>;};
const arr=(v:unknown,max:number)=>{if(!Array.isArray(v)||v.length>max)fail('Itens Vital inválidos.');return v;};
const label=(v:unknown,max=120)=>{if(typeof v!=='string'||text(v,max,true)!==v)fail('Nome Vital inválido.');};
const optional=(v:unknown,max=500)=>{if(v!==null&&typeof v!=='string')fail('Texto Vital inválido.');text(v,max);};
const optId=(v:unknown)=>{if(v!==null)requireId(v);};
const optNum=(v:unknown,max:number,integer=false)=>{if(v!==null&&typeof v!=='number')fail('Número Vital inválido.');return number(v,max,integer);};
const allowed=(v:unknown,values:readonly string[])=>oneOf(v,values);
const day=(v:unknown)=>civil(v);
const kinds=Object.keys(EXERCISE_IDENTITIES),modalities=NUTRITION_MODALITIES.map(x=>x.id);
const unique=(v:unknown,max:number)=>{const rows=arr(v,max).map(obj);uniqueIds(rows.map(r=>({id:requireId(r.id)})));return rows;};
function clock(v:unknown){if(v===null)return;const c=obj(v);for(const k of ['started_ms','elapsed_active_ms']){if(typeof c[k]!=='number')fail('Cronômetro inválido.');optNum(c[k],Number.MAX_SAFE_INTEGER,true);}for(const k of ['running_since_ms','stopped_ms'])optNum(c[k],Number.MAX_SAFE_INTEGER,true);if(c.stopped_ms!==null&&c.running_since_ms!==null||typeof c.stopped_ms==='number'&&c.stopped_ms<Number(c.started_ms)||typeof c.running_since_ms==='number'&&c.running_since_ms<Number(c.started_ms))fail('Cronômetro inconsistente.');}
function exercise(v:unknown){const r=obj(v);label(r.name);allowed(r.kind,kinds);optional(r.region,80);optional(r.equipment,100);if(r.source==='catalog'){const e=typeof r.id==='string'?getExercise(r.id):undefined;if(!e||e.kind!==r.kind)fail('Identidade de catálogo inválida.');}else if(r.source==='custom')requireId(r.id);else fail('Origem de exercício inválida.');}
function load(v:unknown,u:unknown){optNum(v,100000);if(v===null?u!==null:!['kg','lb'].includes(String(u)))fail('Carga e unidade incompatíveis.');}
function source(v:unknown,n:unknown){const values=nutrients(n);if(Object.keys(values).length){allowed(v,['declared','label']);}else if(v!==null)fail('Fonte sem nutrientes.');}
export function validateVitalWireShape(table:TableName,r:Record<string,unknown>){
 switch(table){
 case 'vital_exercises':label(r.name);allowed(r.kind,kinds);optional(r.region,80);optional(r.equipment,100);arr(r.aliases,20).forEach(x=>label(x,80));requireBoolean(r.favorite);requireBoolean(r.active);break;
 case 'vital_foods':label(r.name);requireBoolean(r.favorite);requireBoolean(r.active);optional(r.notes);break;
 case 'vital_nutrition_modalities':label(r.name);optional(r.description);arr(r.aliases,20).forEach(x=>label(x,80));allowed(r.category,['pattern','preference','custom']);allowed(r.identity_id,modalities);requireBoolean(r.active);break;
 case 'vital_training_plans':case 'vital_nutrition_plans':label(r.name);day(r.starts_on);if(r.ends_on!==null&&day(r.ends_on)<String(r.starts_on))fail('Datas do plano inválidas.');if(table==='vital_nutrition_plans')optId(r.professional_id);break;
 case 'vital_training_plan_versions':case 'vital_nutrition_plan_versions':{
  requireId(r.plan_id);if(typeof r.version!=='number'||optNum(r.version,2147483647,true)!<1||r.revision!==1||r.deleted_at!==null)fail('Versão inválida.');day(r.effective_on);label(r.plan_name);allowed(r.status,['active','paused','ended']);
  if(table==='vital_training_plan_versions'){optional(r.goal);for(const i of unique(r.items,200)){exercise(i.exercise);label(i.label,80);if(typeof i.weekday!=='number')fail('Dia da ficha inválido.');optNum(i.weekday,6,true);optNum(i.target_seconds,86400);optNum(i.target_sets,1000,true);optNum(i.target_reps,10000,true);load(i.target_load,i.target_load_unit);}}
  else{optId(r.professional_id);const ids=arr(r.modality_ids,20),snapshots=arr(r.modalities,20).map(obj);if(!ids.length||new Set(ids).size!==ids.length||snapshots.length!==ids.length)fail('Modalidades inválidas.');for(const id of ids){if(typeof id!=='string')fail('Identidade alimentar inválida.');if(!modalities.includes(id))requireId(id);const m=snapshots.filter(x=>x.id===id);if(m.length!==1)fail('Snapshot alimentar inválido.');label(m[0].name);allowed(m[0].identity_id,modalities);allowed(m[0].category,['pattern','preference','professional','custom']);}optional(r.custom_modality,120);for(const x of unique(r.rules,100)){label(x.label);optional(x.detail);}nutrients(r.targets);allowed(r.origin,['user','professional']);if(r.origin==='professional'&&r.professional_id===null)fail('Vincule o profissional existente.');optional(r.notes);}
  break;
 }
 case 'vital_workout_sessions':{
  day(r.day);label(r.title);allowed(r.modality,['strength','cardio','mixed','outdoor','free','custom']);optional(r.custom_modality,120);allowed(r.status,['planned','in_progress','completed','cancelled','draft']);const start=instant(r.started_at),end=instant(r.ended_at);if(start&&end&&end<start)fail('Horários da sessão inválidos.');const total=optNum(r.duration_seconds,604800,true),active=optNum(r.active_seconds,604800,true),pause=optNum(r.pause_seconds,604800,true);if(total===null&&(active!==null||pause!==null)||total!==null&&(active??0)+(pause??0)>total)fail('Duração da sessão inválida.');if(r.duration_source!==null)allowed(r.duration_source,['declared','measured']);if(r.status==='planned'&&(end||active!==null||pause!==null||r.clock!==null))fail('Planejamento contém realização.');for(const k of ['location_id','plan_version_id','rehab_program_id'])optId(r[k]);optional(r.location_label,120);optional(r.notes);clock(r.clock);const sets=new Set<string>();for(const i of unique(r.items,200)){exercise(i.exercise);const elapsed=optNum(i.duration_seconds,604800);if(r.status==='completed'&&elapsed!==null&&total!==null&&elapsed>total)fail('Tempo por aparelho excede sessão.');optNum(i.distance_m,10000000);optional(i.intensity,80);allowed(i.laterality,['left','right','bilateral','not_reported']);optional(i.adaptation);clock(i.clock??null);clock(i.rest_clock??null);optNum(i.rest_seconds??null,604800,true);for(const x of unique(i.sets,100)){const id=requireId(x.id);if(sets.has(id))fail('Série duplicada.');sets.add(id);optNum(x.reps,10000,true);load(x.load,x.load_unit);optNum(x.seconds,86400);optNum(x.rest_seconds,86400,true);}}
  break;
 }
 case 'vital_meals':day(r.day);time(r.time);allowed(r.kind,['breakfast','lunch','snack','dinner','supper','custom']);optional(r.custom_label,80);optId(r.plan_version_id);optional(r.notes);{const rows=unique(r.items,200);if(!rows.length)fail('Refeição vazia.');for(const i of rows){optId(i.food_id);label(i.name);const q=optNum(i.quantity,1000000);optional(i.unit,40);if(q===0||(q===null)!==(i.unit===null))fail('Porção incompatível.');source(i.nutrient_source,i.nutrients);}}break;
 case 'vital_training_checkins':day(r.day);allowed(r.status,['trained','rest','absent']);optional(r.reason);break;
 case 'vital_nutrition_checkins':day(r.day);if(r.status!==null)allowed(r.status,['followed','partial','outside']);optional(r.energy,120);optional(r.satiety,120);optional(r.adaptation);source(r.daily_source,r.daily_totals);if(r.status===null&&r.daily_source===null&&!r.energy&&!r.satiety&&!r.adaptation)fail('Registro diário vazio.');break;
 case 'vital_exercise_favorites':if(typeof r.exercise_id!=='string'||!getExercise(r.exercise_id))fail('Favorito desconhecido.');break;
 case 'vital_audit':label(r.reason,500);requireId(r.target_id);if(r.target_table==='vital_audit'||typeof r.target_table!=='string'||!TABLES.includes(r.target_table as TableName)||typeof r.previous_revision!=='number'||optNum(r.previous_revision,Number.MAX_SAFE_INTEGER,true)!<1||r.revision!==1||r.deleted_at!==null)fail('Auditoria imutável ou inválida.');obj(r.previous);break;
 }
}
