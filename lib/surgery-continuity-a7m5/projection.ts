/** Clinical pathway projection: no invented event, attendance, diagnosis or expected outcome. */
import {activeEvidenceA7M5,currentIntentsA7M5,type SurgicalIntentA7M5,type SurgeryEvidenceLinkA7M5,
  TARGET_LABEL_A7M5,STAGE_LABEL_A7M5} from './types';
import {contextualActionsA7M5,type ClinicalSituationA7M5} from './context';
export type LinkedFactA7M5={id:string;user_id:string;person_id:string;label:string;route:string;status?:string|null;date?:string|null};
export type ContextInputA7M5={uid:string;pid:string;surgeryId?:string|null;status?:string|null;hasOperationEvent?:boolean;
 explicitReturnIds?:readonly string[];linkedRehabProgramIds?:readonly string[];
 intents:readonly SurgicalIntentA7M5[];links:readonly SurgeryEvidenceLinkA7M5[];
 facts:Partial<Record<'procedure_event_a9'|'exam_order'|'medication'|'health_record',readonly LinkedFactA7M5[]>>};
const urlBase:Record<keyof ContextInputA7M5['facts'],string>={
 procedure_event_a9:'/saude/procedimentos',exam_order:'/saude/exames/pedidos',
 medication:'/saude/medicamentos/detalhes',health_record:'/saude/diario'};
export function projectSurgicalContinuityA7M5(input:ContextInputA7M5){
 const {uid,pid,surgeryId}=input;
 const intents=currentIntentsA7M5(input.intents,uid,pid);
 const evidence=surgeryId?activeEvidenceA7M5(input.links,uid,pid,surgeryId):[];
 const related=evidence.flatMap(link=>{
  const matching=input.facts[link.target_type]?.find(f=>f.id===link.target_id&&f.user_id===uid&&f.person_id===pid);
  if(!matching)return [];
  return [{id:link.id,targetId:link.target_id,label:matching.label||TARGET_LABEL_A7M5[link.target_type],
   type:link.target_type,stage:link.stage,stageLabel:STAGE_LABEL_A7M5[link.stage],date:matching.date||'',
   status:matching.status||'',route:matching.route||`${urlBase[link.target_type]}?id=${encodeURIComponent(link.target_id)}`,
   note:link.note||'',synced:link.synced}];
 });
 const hasSurgery=Boolean(surgeryId);
 const hasDocumentedOperation=hasSurgery&&Boolean(input.hasOperationEvent||input.status==='realizada');
 const situation:ClinicalSituationA7M5=!hasSurgery?'routine_consultation':
 hasDocumentedOperation?'documented_surgery':'planned_surgery';
 const contextual=contextualActionsA7M5({situation,hasExplicitSurgeryLink:hasSurgery,
  hasDocumentedOperation,hasLinkedReturn:Boolean(input.explicitReturnIds?.length),
  hasScheduledReturn:Boolean(input.explicitReturnIds?.length),hasLinkedRehab:Boolean(input.linkedRehabProgramIds?.length),
  hasKnownPlan:intents.some(x=>x.linked_surgery_id===surgeryId)});
 return {intents,evidence:related,contextual};
}
