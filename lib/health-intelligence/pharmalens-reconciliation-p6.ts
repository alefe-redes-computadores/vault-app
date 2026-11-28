/** VAULT CI360 P6/P5 MACRO2 — evidências existentes, sem atualizar qualquer entidade.
 * Documento explícito não comprova classificação regulatória, validade nem ingestão.
 */
import type { Document, Medicamento, Renovacao, TipoReceita } from '@/lib/types';
import type { MedicationRegulatoryVisual } from '@/lib/medication-regulatory-visual';
import type { MedicationReference } from '@/lib/medication-intelligence/types';

export type EvidenceKindP6 = 'document' | 'prescription_event' | 'declared' | 'official' | 'review';
export type PrescriptionEvidenceP6 = {
  kind: EvidenceKindP6;
  id: string;
  label: string;
  note: string;
  href?: string;
  date?: string;
};
export type MedicationReconciliationP6 = {
  medicationId: string;
  records: PrescriptionEvidenceP6[];
  directDocumentCount: number;
  sourceDocumentCount: number;
  declaredType: TipoReceita | null;
  regulatoryStatus: 'official_exact' | 'official_partial' | 'declared_only' | 'not_confirmed';
  regulatoryLabel: string;
  hasDocumentEvidence: boolean;
  hasRegulatoryConflict: boolean;
  needsReview: boolean;
  limitations: string[];
};

const prescriptionName: Record<TipoReceita,string> = {
  comum:'Receita comum', branca:'Receita de controle especial', azul:'Notificação azul', amarela:'Notificação amarela',
};
const validDay = (value?:string|null):string|undefined => {
  const s = typeof value === 'string' ? value.slice(0,10) : '';
  if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return undefined;
  const d = new Date(`${s}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0,10)===s ? s:undefined;
};
const owned = (row:{user_id:string;person_id?:string},userId:string,personId:string)=>row.user_id===userId && row.person_id===personId;
const makeDocHref=(id:string)=>`/documentos/detalhes?id=${encodeURIComponent(id)}`;

/** O documento é aceito SOMENTE por relação explícita e tipo receita; nunca por nome parecido. */
export function reconcileMedicationP6(input:{
 medication:Medicamento; documents:readonly Document[]; renewals:readonly Renovacao[];
 userId:string; personId:string; regulatory?:MedicationRegulatoryVisual|null;
}):MedicationReconciliationP6 {
 const {medication:med,documents,renewals,userId,personId,regulatory}=input;
 const empty:MedicationReconciliationP6={medicationId:med.id||'',records:[],directDocumentCount:0,sourceDocumentCount:0,declaredType:null,regulatoryStatus:'not_confirmed',regulatoryLabel:'Classificação não confirmada',hasDocumentEvidence:false,hasRegulatoryConflict:false,needsReview:false,limitations:[]};
 if(!userId||!personId||!med.id||!owned(med,userId,personId))return {...empty,limitations:['Conta, pessoa ou medicamento não correspondem ao escopo ativo.'],needsReview:true};
 const rows=renewals.filter(r=>r.id && owned(r,userId,personId) && r.medicamento_id===med.id);
 const ids=new Set<string>();
 if(med.document_id)ids.add(med.document_id);
 for(const r of rows)if(r.document_id)ids.add(r.document_id);
 const matches=documents.filter(d=>d.id && owned(d,userId,personId) && d.type==='receita' && (ids.has(d.id) || (d.entidade_tipo==='medicamento'&&d.entidade_id===med.id)));
 const byId=new Map<string,Document>();
 for(const d of matches)if(!byId.has(d.id!))byId.set(d.id!,d);
 const records:PrescriptionEvidenceP6[]=[...byId.values()].map(d=>({kind:'document',id:`document:${d.id}`,label:'Receita vinculada',note:d.title || 'Documento de receita',href:makeDocHref(d.id!),date:validDay(d.created_at)}));
 const rxEvents=rows.filter(r=>r.id && r.tipo_aquisicao == null && !r.data_aquisicao && r.quantidade == null && r.preco == null);
 for(const r of rxEvents)records.push({kind:'prescription_event',id:`rx:${r.id}`,label:'Emissão registrada',note:'Evento de receita existente; não comprova aquisição ou validade atual.',date:validDay(r.data)});
 if(med.tipo_receita)records.push({kind:'declared',id:`declared:${med.id}`,label:'Tipo informado',note:prescriptionName[med.tipo_receita]});
 const ref=med.catalog_snapshot?.reference as Partial<MedicationReference>|undefined;
 const exact=med.catalog_snapshot?.match_kind==='exact' && ref?.regulatoryIdentity?.referenceType==='product';
 const official=regulatory?.verified===true&&regulatory.referenceIdentity!=='possible_divergence';
 const catalogClass=regulatory?.referenceIdentity!=='possible_divergence' ? regulatory?.classEvidence : undefined;
 const technicalReview=Boolean(regulatory?.reviewReasons?.length);
 let regulatoryStatus:MedicationReconciliationP6['regulatoryStatus']= official?(exact&&!technicalReview?'official_exact':'official_partial'):med.tipo_receita?'declared_only':'not_confirmed';
 const regulatoryLabel=official?(regulatory?.label||'Classificação regulatória encontrada'):med.tipo_receita?`${prescriptionName[med.tipo_receita]} · informada`:'Classificação não confirmada';
 if(official)records.push({kind:'official',id:`official:${med.id}`,label:exact&&!technicalReview?'Referência regulatória exata':'Referência regulatória parcial',note:`${regulatoryLabel}. Não substitui a receita individual.`});
 if(catalogClass&&technicalReview)records.push({kind:'review',id:'catalog-review:'+med.id,label:'Classe conhecida no catálogo',note:catalogClass.label+' · '+catalogClass.sourceLabel+' · Conferir aplicabilidade; não confirma receita pessoal.'});
 const missing=[...ids].filter(id=>!byId.has(id));
 const clinicalDay=new Date().toISOString().slice(0,10);
 const safelyComparable=(ref?.regulatoryRules||[]).filter(rule=>
  !rule.hasMalformedExceptions && !(rule.exceptions?.length) &&
  (!rule.effectiveFrom || rule.effectiveFrom<=clinicalDay) && (!rule.effectiveUntil || rule.effectiveUntil>=clinicalDay) &&
  Boolean(rule.vaultPrescriptionType));
 const hasRegulatoryConflict=Boolean(official&&exact&&med.tipo_receita&&safelyComparable.length===1&&
  safelyComparable[0].vaultPrescriptionType!==med.tipo_receita);
 const limitations:string[]=[];
 if(missing.length)limitations.push(`${missing.length} vínculo(s) de documento ainda não resolvido(s) na pessoa ativa.`);
 if(!official)limitations.push('Tipo informado e documento existente não comprovam o regime regulatório oficial.');
 if(technicalReview)limitations.push('Referência em conferência técnica: conhecimento descritivo preservado; não confirma a apresentação ou prescrição individual.');
 if(hasRegulatoryConflict)limitations.push('Cadastro e referência regulatória divergem; nenhuma informação foi alterada.');
 if(records.length===0)limitations.push('Nenhum documento de receita ou classificação confirmada foi localizado pelos IDs conhecidos.');
 return {medicationId:med.id,records,directDocumentCount:byId.size,sourceDocumentCount:rxEvents.length,
   declaredType:med.tipo_receita||null,regulatoryStatus,regulatoryLabel,hasDocumentEvidence:byId.size>0,
   hasRegulatoryConflict,needsReview:missing.length>0||hasRegulatoryConflict||!official||technicalReview,limitations};
}

export function medicationListEvidenceLabelP6(summary:MedicationReconciliationP6,official?:MedicationRegulatoryVisual|null):string|null {
 if(official?.verified) return null; // mantém trilho oficial da lista
 if(summary.hasDocumentEvidence)return 'Rec. vinc.'; // documento existente NÃO é validação regulatória
 if(summary.declaredType)return 'Rec. inf.'; // tipo informado NÃO é regra oficial
 return null;
}

export function medicationReconciliationBriefP6(summary:MedicationReconciliationP6):string {
 return ['RECONCILIAÇÃO DOCUMENTAL — LEITURA SOMENTE',
 `Documentos de receita vinculados: ${summary.directDocumentCount}.`,
 `Emissões registradas sem comprovação de aquisição: ${summary.sourceDocumentCount}.`,
 `Tipo informado: ${summary.declaredType?prescriptionName[summary.declaredType]:'Não informado'}.`,
 `Referência regulatória: ${summary.regulatoryLabel}.`,
 ...summary.limitations.map(m=>`Limitação: ${m}`),
 'Não são inferidos validade, autenticidade do documento, prescrição vigente ou classe regulatória sem fonte.'].join('\n');
}

/** Indicadores agregados do que o VAULT já sabe, sem atualizar os registros. */
export function auditMedicationEvidenceP6(input:{
 medications:readonly Medicamento[];documents:readonly Document[];renewals:readonly Renovacao[];
 userId:string;personId:string;profiles:Readonly<Record<string,MedicationRegulatoryVisual>>;
}){
 const {medications,documents,renewals,userId,personId,profiles}=input;
 const summaries=medications.filter(m=>m.id&&userId&&personId&&owned(m,userId,personId)).map(m=>
  reconcileMedicationP6({medication:m,documents,renewals,userId,personId,regulatory:profiles[m.id!]})
 );
 return {total:summaries.length,
  documented:summaries.filter(s=>s.directDocumentCount>0).length,
  officialExact:summaries.filter(s=>s.regulatoryStatus==='official_exact').length,
  officialPartial:summaries.filter(s=>s.regulatoryStatus==='official_partial').length,
  declaredOnly:summaries.filter(s=>s.regulatoryStatus==='declared_only').length,
  needsReview:summaries.filter(s=>s.needsReview).length,
  withoutLinkedPrescription:summaries.filter(s=>s.directDocumentCount===0).length};
}
