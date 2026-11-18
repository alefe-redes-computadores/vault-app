/** Fronteira de interações: aceita apenas fontes externas CURADAS, nunca coincidência nominal.
 * Nenhuma regra é embarcada automaticamente; base não carregada => resultado INDETERMINADO.
 */
export type CitedInteractionP6={
 ingredientA:string;ingredientB:string;
 sourceUrl:string;sourceName:string;reviewedAt:string;sourceDocumentSha256:string;
 clinicalStatement:string;severity:'information'|'review'|'important';
 reviewedBy:string;status:'verified'|'draft'|'rejected';
};
export type InteractionAssessmentP6={status:'not_evaluated'|'supported_findings';findings:CitedInteractionP6[];limitation:string};
const norm=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
export function assessDocumentedInteractionsP6(ingredients:readonly string[],rules:readonly CitedInteractionP6[],today:string):InteractionAssessmentP6{
 const empty:InteractionAssessmentP6={status:'not_evaluated',findings:[],limitation:'Sem base de interações clínicas revisada e aplicável; não é possível afirmar ausência de interações.'};
 if(!/^\d{4}-\d{2}-\d{2}$/.test(today))return empty;
 const owned=new Set(ingredients.map(norm).filter(Boolean));
 const findings=rules.filter(r=>r.status==='verified' && !!r.reviewedBy.trim()&&
  /^https:\/\//.test(r.sourceUrl)&&/^[a-f\d]{64}$/i.test(r.sourceDocumentSha256)&&
  /^\d{4}-\d{2}-\d{2}$/.test(r.reviewedAt)&&r.reviewedAt<=today&&
  r.clinicalStatement.trim().length>18 &&
  norm(r.ingredientA)!==norm(r.ingredientB)&&owned.has(norm(r.ingredientA))&&owned.has(norm(r.ingredientB)));
 return findings.length?{status:'supported_findings',findings,limitation:'Alertas extraídos de fontes revisadas, sujeitos a contexto clínico e conferência profissional.'}:empty;
}
