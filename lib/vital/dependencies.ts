import {type TableName} from './model';
import {vitalTable} from './cloud-transport';
import {requireId,fail} from './validation';
export type VitalDependency={table:TableName|'persons'|'locais'|'medicos'|'rehab_programs_m5';id:string};
/** Return all explicit references, including the structured children, for the existing outbox. */
export function vitalDependencies(table:TableName,p:Record<string,unknown>):VitalDependency[]{
 const result=new Map<string,VitalDependency>();
 const add=(t:VitalDependency['table'],v:unknown)=>{if(v==null)return;const id=requireId(v);result.set(`${t}:${id}`,{table:t,id});};
 const items=()=>{if(!Array.isArray(p.items))fail('Itens Vital inválidos.');return p.items as Record<string,unknown>[];};
 add('persons',p.person_id);
 switch(table){
  case 'vital_training_plan_versions':add('vital_training_plans',p.plan_id);break;
  case 'vital_nutrition_plans':add('medicos',p.professional_id);break;
  case 'vital_nutrition_plan_versions':add('vital_nutrition_plans',p.plan_id);add('medicos',p.professional_id);if(!Array.isArray(p.modality_ids))fail('Modalidades inválidas.');for(const id of p.modality_ids){if(typeof id!=='string')fail('Modalidade inválida.');if(/^[0-9a-f-]{36}$/i.test(id))add('vital_nutrition_modalities',id);}break;
  case 'vital_workout_sessions':add('locais',p.location_id);add('rehab_programs_m5',p.rehab_program_id);add('vital_training_plan_versions',p.plan_version_id);break;
  case 'vital_meals':add('vital_nutrition_plan_versions',p.plan_version_id);for(const item of items())add('vital_foods',item.food_id);break;
  case 'vital_audit':if(!vitalTable(p.target_table)||p.target_table==='vital_audit')fail('Alvo de auditoria inválido.');add(p.target_table,p.target_id);break;
 }
 if(table==='vital_workout_sessions'||table==='vital_training_plan_versions')for(const item of items()){
  const ref=item.exercise as Record<string,unknown>|undefined;if(!ref||!['catalog','custom'].includes(String(ref.source)))fail('Identidade de exercício inválida.');if(ref.source==='custom')add('vital_exercises',ref.id);
 }
 return [...result.values()];
}
/** A later immutable version cannot overtake an earlier queued version of the same plan. */
export function vitalEarlierVersion(table:TableName,p:Record<string,unknown>,entries:readonly {table:string;payload:Record<string,unknown>}[]){
 if(!table.endsWith('_plan_versions'))return null;
 if(!Number.isSafeInteger(p.version)||Number(p.version)<1)fail('Versão inválida.');
 return entries.find(e=>e.table===table&&e.payload.plan_id===p.plan_id&&e.payload.user_id===p.user_id&&e.payload.person_id===p.person_id&&Number(e.payload.version)<Number(p.version))??null;
}
