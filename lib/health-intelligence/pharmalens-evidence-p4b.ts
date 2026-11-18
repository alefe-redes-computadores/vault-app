/** P6 P4-B: read-only, source-aware PharmaLens review. No registration validation,
 * no clinical inferences, no persistence, no automatic official catalog promotion.
 */
import type { PharmaLensCandidateCI360, PharmaLensDocumentFieldCI360 } from './pharmalens-document-candidate-ci360';
import type { MedicationKnowledgeResolution, MedicationKnowledgeFact } from '@/lib/medication-intelligence/knowledge-resolver-m153p4';

export type PharmaLensReviewFieldP4B = {
  field:PharmaLensDocumentFieldCI360;
  label:string;
  textValue:string;
  declaredValue:string;
  comparison:'coincide_textualmente'|'diverge_textualmente'|'sem_comparacao';
};
export type PharmaLensReviewSourceP4B = {
  label:string;value:string;authority:'official_exact'|'official_inferred';
  source:string;version:string|null;verifiedAt:string|null;
};
export type PharmaLensEvidenceP4B = {
  fields:readonly PharmaLensReviewFieldP4B[];
  catalogFacts:readonly PharmaLensReviewSourceP4B[];
  missing:readonly PharmaLensDocumentFieldCI360[];
  textConflicts:number;
  humanReviewed:boolean;
  origin:'local_ocr'|'manual_transcription';
  regulatoryValidated:false;
  mayAlterPrescription:false;
  mayAlterStock:false;
  mayAlterMedication:false;
  mayInferInteraction:false;
};
export type PharmaLensDeclaredP4B={name:string;strength?:string|null;manufacturer?:string|null};
const fields:readonly {id:PharmaLensDocumentFieldCI360;label:string}[]=[
  {id:'name',label:'Nome no rótulo'},
  {id:'strength',label:'Concentração apresentada'},
  {id:'manufacturer',label:'Fabricante declarado'},
  {id:'batch',label:'Lote'},
  {id:'expiry',label:'Validade'},
  {id:'registration',label:'Número com aparência de registro'},
];
const whitespace=(x:string)=>String(x||'').replace(/\s+/g,' ').trim();
const equivalent=(x:string)=>whitespace(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[\s._-]+/g,'');
const evidenceFact=(fact:MedicationKnowledgeFact):fact is MedicationKnowledgeFact&{authority:'official_exact'|'official_inferred'}=>
  fact.authority==='official_exact'||fact.authority==='official_inferred';

/** A catalog ingredient is NEVER used as proof that a product trade name matches.
 * Presentations containing several alternatives cannot be treated as the exact product.
 */
export function buildPharmaLensEvidenceP4B(candidate:PharmaLensCandidateCI360,declared:PharmaLensDeclaredP4B,knowledge:MedicationKnowledgeResolution):PharmaLensEvidenceP4B{
  const values:Record<PharmaLensDocumentFieldCI360,string>={
    name:whitespace(declared.name),strength:whitespace(declared.strength||''),
    manufacturer:whitespace(declared.manufacturer||''),batch:'',expiry:'',registration:'',
  };
  const rows=fields.map(({id,label})=>{
    const captured=whitespace(candidate[id]);
    const listed=values[id];
    const comparison=!captured||!listed?'sem_comparacao':equivalent(captured)===equivalent(listed)?'coincide_textualmente':'diverge_textualmente';
    return {field:id,label,textValue:captured,declaredValue:listed,comparison} as PharmaLensReviewFieldP4B;
  });
  const catalogFacts=knowledge.facts.filter(evidenceFact).map(f=>({
    label:whitespace(f.label),value:whitespace(f.value),authority:f.authority,
    source:whitespace(f.source?.label||'Fonte não identificada'),
    version:whitespace(f.catalogVersion||'')||null,verifiedAt:whitespace(f.verifiedAt||'')||null,
  }));
  return {
    fields:rows,catalogFacts,missing:rows.filter(r=>!r.textValue).map(r=>r.field),
    textConflicts:rows.filter(r=>r.comparison==='diverge_textualmente').length,
    humanReviewed:candidate.reviewedByPerson===true,
    origin:candidate.origin==='local_ocr'?'local_ocr':'manual_transcription',
    regulatoryValidated:false,mayAlterPrescription:false,mayAlterStock:false,
    mayAlterMedication:false,mayInferInteraction:false,
  };
}

/** Copy explicitly requested by the person. No raw OCR, owner/person IDs, hidden
 * document identifier, acquisition, dosage schedule, or prescription is exported. */
export function formatPharmaLensEvidenceP4B(report:PharmaLensEvidenceP4B):string{
  const lines=[
    'PharmaLens · Conferência documental local',
    'Estado: '+(report.humanReviewed?'campos revisados visualmente nesta sessão':'campos ainda não revisados'),
    'Origem: '+(report.origin==='local_ocr'?'OCR local — sujeito a erros':'transcrição manual'),
    'IMPORTANTE: coincidência textual não comprova autenticidade, aprovação ou situação do registro sanitário.',
    '', 'RÓTULO × CADASTRO',
  ];
  for(const row of report.fields){
    lines.push(row.label+': rótulo '+(row.textValue||'não informado')+' | cadastro '+(row.declaredValue||'não informado')+
      ' | '+({coincide_textualmente:'texto coincide',diverge_textualmente:'texto diverge',sem_comparacao:'comparação indisponível'}[row.comparison]));
  }
  lines.push('', 'FATOS DO CATÁLOGO JÁ VINCULADO (INDEPENDENTES DO RÓTULO)');
  if(!report.catalogFacts.length)lines.push('Nenhum fato oficial vinculado apresentado nesta conferência.');
  for(const fact of report.catalogFacts){
    lines.push(fact.label+': '+fact.value+' | '+(fact.authority==='official_exact'?'referência exata no cadastro':'referência inferida no cadastro')+
      ' | '+fact.source+' | versão '+(fact.version||'não informada')+' | conferência '+(fact.verifiedAt||'não informada'));
  }
  lines.push('','Não confirma lote, aquisição, início de uso, prescrição, estoque, interação ou bioequivalência.','Nenhuma alteração de cadastro ou dado clínico foi realizada por este resumo.');
  return lines.join('\n');
}
