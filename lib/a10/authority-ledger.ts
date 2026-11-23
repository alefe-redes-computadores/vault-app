/** VAULT A10.0 — registry of existing readers. This file NEVER creates a clinical writer. */
import { A10_AUTHORITIES, type A10Authority, type A10Domain, type A10Datasets } from './longitudinal';
export type A10Contract = Readonly<{
  authority:A10Authority; domain:A10Domain|null; writer:string;
  personScoped:true; category:'event'|'context';
  statement:string;
}>;
export const A10_CONTRACTS:readonly A10Contract[]=[
 {authority:'consultas',domain:'consultations',writer:'useConsultas / consulta canônica',personScoped:true,category:'event',statement:'Agendada não comprova comparecimento'},
 {authority:'cirurgias',domain:'surgery',writer:'Cirurgia canônica',personScoped:true,category:'event',statement:'Agendada não comprova realização'},
 {authority:'a1_treatment_phases',domain:'treatment',writer:'Ledger A1/A4',personScoped:true,category:'event',statement:'Fase não reescreve dose passada'},
 {authority:'hospitalizations_a5',domain:'hospitalization',writer:'Internação A5',personScoped:true,category:'event',statement:'Internação não implica cirurgia'},
 {authority:'hospitalization_events_a5',domain:'hospitalization',writer:'Eventos A5',personScoped:true,category:'event',statement:'Evolução depende de origem declarada'},
 {authority:'surgery_journey_events_a7',domain:'surgery',writer:'Jornada A7',personScoped:true,category:'event',statement:'Relação depende de ID'},
 {authority:'surgical_intents_a7m5',domain:'surgery',writer:'Intenção cirúrgica A7/M5',personScoped:true,category:'event',statement:'Encaminhamento não é cirurgia'},
 {authority:'rehab_programs_m5',domain:'rehabilitation',writer:'Programa M5',personScoped:true,category:'context',statement:'Programa é contexto, não sessão'},
 {authority:'rehab_sessions_m5',domain:'rehabilitation',writer:'Sessões M5',personScoped:true,category:'event',statement:'Data agendada não é data efetiva'},
 {authority:'rehab_milestones_m5',domain:'rehabilitation',writer:'Marcos M5',personScoped:true,category:'event',statement:'Progresso relatado não é alta inferida'},
 {authority:'vaccination_courses_a8',domain:'vaccination',writer:'Carteira A8',personScoped:true,category:'context',statement:'Curso não é aplicação'},
 {authority:'vaccination_events_a8',domain:'vaccination',writer:'Eventos A8',personScoped:true,category:'event',statement:'Plano não é dose administrada'},
 {authority:'procedure_events_a9',domain:'procedure',writer:'Procedimentos A9',personScoped:true,category:'event',statement:'Procedimento não duplica cirurgia'},
 {authority:'sensitivity_events_a9',domain:'sensitivity',writer:'Sensibilidades A9',personScoped:true,category:'event',statement:'Relato não é diagnóstico nem causalidade'},
 {authority:'exam_orders',domain:'exams',writer:'Pedidos M1',personScoped:true,category:'event',statement:'Pedido não equivale a resultado'},
 {authority:'exam_order_items',domain:'exams',writer:'Itens M1',personScoped:true,category:'event',statement:'Item pertence a pedido; sem sessão automática'},
 {authority:'careflow_events_m2',domain:'health',writer:'CareFlow M2',personScoped:true,category:'event',statement:'Plano de pressão não é medição'},
 {authority:'registros_saude',domain:'health',writer:'Registros de saúde canônicos',personScoped:true,category:'event',statement:'Sensor e registro manual distintos'},
 {authority:'doseLogs',domain:'doses',writer:'DoseLogs canônicos',personScoped:true,category:'event',statement:'Previsto não é tomado; SOS não altera aderência'},
 {authority:'medicamentos',domain:null,writer:'Medicamentos canônicos',personScoped:true,category:'context',statement:'Cadastro é contexto; não evento de prescrição'},
 {authority:'tratamentos',domain:null,writer:'Tratamentos canônicos',personScoped:true,category:'context',statement:'Tratamento contextual não substitui fase A4'},
 {authority:'hospitalization_relations_a5',domain:null,writer:'Relações A5',personScoped:true,category:'context',statement:'Relação por ID não é causalidade'},
 {authority:'rehab_origin_links_m5',domain:null,writer:'Origens M5',personScoped:true,category:'context',statement:'Encaminhamento por ID, sem melhora presumida'},
 {authority:'surgery_evidence_links_a7m5',domain:null,writer:'Evidência A7/M5',personScoped:true,category:'context',statement:'Vínculo tem revisão e desvinculação explícitas'},
 {authority:'clinical_asset_links',domain:null,writer:'Vínculos privados M3',personScoped:true,category:'context',statement:'Arquivo com vínculo não comprova realização'},
 {authority:'clinical_assets',domain:null,writer:'Metadados privados M3',personScoped:true,category:'context',statement:'Arquivo não é compartilhado automaticamente'},
] as const;
export type A10Coverage = {expected:number;provided:number;empty:number;unknown:string[];missing:string[];hiddenContext:string[]};
export function auditAuthorityCoverageA10(data:A10Datasets):A10Coverage {
 const expected=new Set<string>(A10_AUTHORITIES), provided:string[]=[],empty:string[]=[],unknown:string[]=[],missing:string[]=[],hiddenContext:string[]=[];
 for(const key of Object.keys(data)){
  if(!expected.has(key)){unknown.push(key);continue;}
  if(Array.isArray(data[key as A10Authority])){provided.push(key);if(data[key as A10Authority]?.length===0)empty.push(key);}
 }
 for(const a of A10_CONTRACTS){if(!provided.includes(a.authority))missing.push(a.authority);if(a.category==='context')hiddenContext.push(a.authority);}
 return {expected:expected.size,provided:provided.length,empty:empty.length,unknown,missing,hiddenContext};
}
export function isCanonicalAuthorityA10(value:string):value is A10Authority {
 return (A10_AUTHORITIES as readonly string[]).includes(value);
}
