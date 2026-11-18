/** CI360 P4: três camadas independentes — OCR/transcrição, cadastro e catálogo já vinculado.
 * Nenhuma combinação automática atesta documento, fabricante ou registro.
 */
import type { Medicamento } from '@/lib/types';
import { resolveMedicationKnowledgeM153P4, type MedicationKnowledgeResolution } from '@/lib/medication-intelligence/knowledge-resolver-m153p4';
import type { PharmaLensCandidateCI360, PharmaLensDocumentFieldCI360 } from './pharmalens-document-candidate-ci360';
export type PharmaLensAuditStatusCI360='concorda_com_cadastro'|'diverge_do_cadastro'|'indisponivel'|'conferir_catalogo';
export type PharmaLensAuditRowCI360={field:PharmaLensDocumentFieldCI360;label:string;captured:string;declared:string;catalog:string;catalogAuthority:string;status:PharmaLensAuditStatusCI360;note:string};
export type PharmaLensAuditCI360={rows:PharmaLensAuditRowCI360[];coverage:'declared_only'|'partial'|'verified'|'unavailable';conflicts:number;provenance:string[];hasOfficialExact:boolean};
const norm=(value:string)=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g,' ').trim();
// Fatos oficiais são exibidos por categoria no recibo, nunca como prova de nome
// comercial, concentração exata ou lote a partir de uma linha OCR.
export function auditPharmaLensDocumentCI360(candidate:PharmaLensCandidateCI360,medication:Medicamento,existing?:MedicationKnowledgeResolution):PharmaLensAuditCI360 {
  const knowledge=existing??resolveMedicationKnowledgeM153P4(medication);
  const definitions:Array<[PharmaLensDocumentFieldCI360,string,string,string,MedicationKnowledgeResolution['facts'][number]|null]> =[
    ['name','Nome',candidate.name,medication.nome,null],
    ['strength','Dosagem/apresentação',candidate.strength,medication.dosagem||'',null],
    ['manufacturer','Fabricante',candidate.manufacturer,medication.laboratorio_etiqueta||'',null],
    ['batch','Lote',candidate.batch,'',null],
    ['expiry','Validade',candidate.expiry,'',null],
    ['registration','Registro sanitário',candidate.registration,'',null],
  ];
  const rows:PharmaLensAuditRowCI360[]=definitions.map(([field,label,captured,declared,official])=>{
    const state:PharmaLensAuditStatusCI360=!captured?'indisponivel':declared?(norm(captured)===norm(declared)?'concorda_com_cadastro':'diverge_do_cadastro'):'conferir_catalogo';
    return {field,label,captured,declared,catalog:official?.value||'',catalogAuthority:official?.authority||'sem referência',status:state,
      note:field==='registration'?'Texto numérico não é validação de registro na Anvisa.':field==='batch'||field==='expiry'?'Conferir diretamente na embalagem; não deduzir estoque.':official?'A correspondência textual não confirma bioequivalência ou autorização regulatória.':'Conferir com a embalagem e o cadastro.'};
  });
  const provenance=Array.from(new Set(knowledge.facts.flatMap(f=>[f.source?.label,f.catalogVersion,f.verifiedAt].filter((v):v is string=>Boolean(v)))));
  return {rows,coverage:knowledge.coverage,conflicts:rows.filter(r=>r.status==='diverge_do_cadastro').length+knowledge.conflicts.length,
    provenance,hasOfficialExact:knowledge.facts.some(f=>f.authority==='official_exact')};
}
