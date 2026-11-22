/** Read-only contextual action policy. No diagnosis, no surgery suggestion based on profile. */
export type ClinicalSituationA7M5='routine_consultation'|'surgery_intent'|'planned_surgery'|'documented_surgery'|'rehab_program'|'non_surgical_procedure';
export type ClinicalContextA7M5={
 situation:ClinicalSituationA7M5; hasExplicitSurgeryLink:boolean; hasDocumentedOperation:boolean;
 hasLinkedReturn:boolean; hasLinkedRehab:boolean; hasKnownPlan:boolean; hasScheduledReturn:boolean;
};
export type ContextualActionA7M5={key:string;label:string;reason:string;kind:'navigate'|'review'|'optional_record'};
export function contextualActionsA7M5(ctx:ClinicalContextA7M5):ContextualActionA7M5[]{
 // When a person only registered a routine consult, there is no surgical evidence to present.
 if(ctx.situation==='routine_consultation'||ctx.situation==='non_surgical_procedure')return [];
 if(ctx.situation==='rehab_program')return ctx.hasLinkedRehab?
  [{key:'review_rehab',label:'Ver sessões e evolução registradas',reason:'Há um programa de reabilitação documentado',kind:'review'}]:[];
 if(ctx.situation==='surgery_intent')return ctx.hasKnownPlan?
  [{key:'review_intent',label:'Rever encaminhamento informado',reason:'Existe um pedido registrado por você',kind:'review'}]:[];
 if(!ctx.hasExplicitSurgeryLink)return [];
 if(ctx.situation==='planned_surgery')return [{key:'review_pre',label:'Ver preparo e avaliações cadastradas',reason:'Há uma cirurgia cadastrada com planejamento',kind:'review'}];
 if(ctx.situation==='documented_surgery'&&ctx.hasDocumentedOperation){
  const result:ContextualActionA7M5[]=[];
  if(ctx.hasLinkedReturn)result.push({key:'open_return',label:'Abrir retorno vinculado',reason:'Consulta de retorno relacionada por ID',kind:'navigate'});
  else result.push({key:'link_return',label:'Vincular um retorno, se houver',reason:'Nenhum retorno explicitamente vinculado',kind:'optional_record'});
  if(ctx.hasLinkedRehab)result.push({key:'open_rehab',label:'Ver reabilitação vinculada',reason:'Programa M5 relacionado por ID',kind:'navigate'});
  return result;
 }
 return [];
}
/** A phase is relevant only if the person explicitly has clinical evidence in that phase. */
export function visibleSurgeryStagesA7M5<T extends string>(stages:readonly T[],counts:Partial<Record<T,number>>):T[]{
 return stages.filter(s=>Number(counts[s]||0)>0);
}
