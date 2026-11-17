/** CI360 P6 P2 R2: revisão explícita. A proximidade temporal não cria vínculos. */
import type { Consulta, Medicamento } from '@/lib/types';

type Owner = { user_id: string; person_id?: string };
type Med = Pick<Medicamento, 'id'|'user_id'|'person_id'|'nome'|'tratamento_ids'>;
export type CandidateP6R2 = { id:string; name:string; origin:'shared_explicit_treatment' };
const MAX = 64;
const uniq = (values: readonly string[] = []) => [...new Set(values.filter(v=>typeof v==='string' && v.length>0))];

/** Só sugere medicamento com tratamento explicitamente vinculado a ambos os registros. */
export function historicalLinkCandidatesP6R2(consultation:Pick<Consulta,'user_id'|'person_id'|'tratamento_ids'|'medicamento_ids'|'revisao_vinculos_rejeitados'>, medications:readonly Med[]):CandidateP6R2[] {
  if(!consultation.user_id || !consultation.person_id)return [];
  const linked = new Set(consultation.medicamento_ids??[]);
  const rejected = new Set(consultation.revisao_vinculos_rejeitados??[]);
  const treatmentIds = new Set(consultation.tratamento_ids??[]);
  if(!treatmentIds.size)return [];
  const out:CandidateP6R2[]=[];const seen=new Set<string>();
  for(const med of medications){
    if(!med.id || seen.has(med.id) || med.user_id!==consultation.user_id || med.person_id!==consultation.person_id || linked.has(med.id) || rejected.has(med.id))continue;
    if(!(med.tratamento_ids??[]).some(id=>treatmentIds.has(id)))continue;
    out.push({id:med.id,name:med.nome,origin:'shared_explicit_treatment'});seen.add(med.id);
    if(out.length===MAX)break;
  }
  return out;
}

/** Sem escrita automática: o resultado só é persistido após o toque de confirmação. */
export function applyLinkReviewDecisionP6R2(input:{consultation:Pick<Consulta,'user_id'|'person_id'|'medicamento_ids'|'revisao_vinculos_rejeitados'>, medication:Owner&{id?:string}, action:'accept'|'reject'}):{medicamento_ids:string[],revisao_vinculos_rejeitados:string[]}{
  const {consultation,medication,action}=input;
  const id=medication.id;
  if(!consultation.user_id || !consultation.person_id || !id || medication.user_id!==consultation.user_id || medication.person_id!==consultation.person_id)throw new Error('Vínculo fora da conta ou pessoa ativa.');
  const accepted=uniq(consultation.medicamento_ids??[]),rejected=uniq(consultation.revisao_vinculos_rejeitados??[]);
  if(accepted.length>MAX||rejected.length>MAX)throw new Error('Limite de vínculos excedido.');
  if(action==='reject'){
    if(accepted.includes(id))throw new Error('Vínculo já aceito; remova-o explicitamente na edição da consulta.');
    if(rejected.includes(id))return {medicamento_ids:accepted,revisao_vinculos_rejeitados:rejected};
    if(rejected.length===MAX)throw new Error('Limite de revisões atingido.');
    return {medicamento_ids:accepted,revisao_vinculos_rejeitados:[...rejected,id]};
  }
  if(accepted.includes(id))return {medicamento_ids:accepted,revisao_vinculos_rejeitados:rejected.filter(x=>x!==id)};
  if(accepted.length===MAX)throw new Error('Limite de vínculos atingido.');
  return {medicamento_ids:[...accepted,id],revisao_vinculos_rejeitados:rejected.filter(x=>x!==id)};
}
