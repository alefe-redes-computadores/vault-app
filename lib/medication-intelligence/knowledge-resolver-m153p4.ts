import type { MedicationCatalogSnapshot, Medicamento, TipoReceita } from "@/lib/types";
import type { MedicationReference, MedicationReferenceSource } from "@/lib/medication-intelligence/types";

export type KnowledgeAuthority = "declared" | "official_exact" | "official_inferred" | "conflict" | "unknown";
export type KnowledgeFactKind = "prescription_type" | "presentation" | "pharmaceutical_form" | "active_ingredient";
export interface MedicationKnowledgeFact { kind:KnowledgeFactKind;label:string;value:string;authority:KnowledgeAuthority;confidence:"high"|"medium"|"unavailable";source?:MedicationReferenceSource;catalogVersion?:string;verifiedAt?:string;limitation?:string;declaredValue?:string;officialValue?:string }
export interface MedicationKnowledgeResolution {facts:MedicationKnowledgeFact[];conflicts:MedicationKnowledgeFact[];catalogMatched:boolean;catalogMatchKind?:MedicationCatalogSnapshot["match_kind"];coverage:"verified"|"partial"|"declared_only"|"unavailable"}
const prescriptionLabels:Record<TipoReceita,string>={comum:"Receita comum",branca:"Receita de controle especial",azul:"Notificação B · azul",amarela:"Notificação A · amarela"};
function asReference(snapshot?:MedicationCatalogSnapshot|null):MedicationReference|null{if(!snapshot?.reference||typeof snapshot.reference!=="object")return null;const candidate=snapshot.reference as Partial<MedicationReference>;return typeof candidate.canonicalName==="string"&&Array.isArray(candidate.sources)?candidate as MedicationReference:null}
// A product name match is not proof of complete composition or of regulatory applicability.
const officialSource=(s:MedicationReferenceSource|undefined):boolean=>{if(!s||s.authority!=="anvisa"||!s.version?.trim()||!s.url)return false;try{const u=new URL(s.url);return u.protocol==="https:"&&!u.username&&!u.password&&!u.port&&(u.hostname==="anvisa.gov.br"||u.hostname.endsWith(".anvisa.gov.br")||u.hostname==="www.gov.br"&&u.pathname.startsWith("/anvisa/"));}catch{return false}};
const dayValid=(s:string):boolean=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+"T12:00:00Z"))&&new Date(s+"T12:00:00Z").toISOString().slice(0,10)===s;
function activeRule(reference:MedicationReference,day:string){
 if(!dayValid(day)||!Array.isArray(reference.regulatoryRules))return null;
 const rules=reference.regulatoryRules;
 if(rules.some(r=>!r||r.effectiveFrom&&!dayValid(r.effectiveFrom)||r.effectiveUntil&&!dayValid(r.effectiveUntil)||r.effectiveFrom&&r.effectiveUntil&&r.effectiveFrom>r.effectiveUntil))return null;
 const candidates=rules.filter(r=>!(r.effectiveFrom&&r.effectiveFrom>day)&&!(r.effectiveUntil&&r.effectiveUntil<day));
 if(!candidates.length||candidates.some(r=>!r.vaultPrescriptionType||!Object.hasOwn(prescriptionLabels,r.vaultPrescriptionType)||r.hasMalformedExceptions||r.exceptions?.length||!Array.isArray(r.sources)||!r.sources.some(officialSource)))return null;
 const models=new Set(candidates.map(r=>JSON.stringify([r.vaultPrescriptionType,r.prescriptionModelCode??null,r.prescriptionModel??null])));
 return models.size===1?candidates[0]:null;
}
function provenance(reference:MedicationReference,snapshot?:MedicationCatalogSnapshot|null,source=reference.sources.find(officialSource)??reference.sources[0]){return{source,catalogVersion:source?.version||snapshot?.catalog_signature||undefined,verifiedAt:source?.verifiedAt||snapshot?.resolved_at||undefined}}
const formatLabels: Record<string,string> = {
 capsula: "Cápsula", comprimido: "Comprimido", partido: "Comprimido partido (formato visual)",
 oblongo: "Comprimido oblongo", oblongo_sulcado: "Comprimido oblongo sulcado",
 gota: "Gotas", injecao: "Injetável", adesivo: "Adesivo",
};
/** Formato é preferência visual declarada; não confirma apresentação comercial. */
function displayDeclaredFormat(format: string): string {
 return formatLabels[format] || format.replace(/_/g," " ).trim();
}
/** M153 P4: resolve fatos estáveis sem transformar ausência de dado novo em ausência de conhecimento. O declarado continua sendo autoridade operacional. */
export function resolveMedicationKnowledgeM153P4(medication:Pick<Medicamento,"tipo_receita"|"dosagem"|"formato"|"catalog_snapshot">,at=new Date().toISOString().slice(0,10)):MedicationKnowledgeResolution{
 const reference=asReference(medication.catalog_snapshot),facts:MedicationKnowledgeFact[]=[],conflicts:MedicationKnowledgeFact[]=[];
 if(!reference){if(medication.tipo_receita)facts.push({kind:"prescription_type",label:"Receita",value:prescriptionLabels[medication.tipo_receita],authority:"declared",confidence:"high",declaredValue:medication.tipo_receita,limitation:"Informação declarada no cadastro; ainda sem referência oficial vinculada."});if(medication.formato)facts.push({kind:"pharmaceutical_form",label:"Formato informado",value:displayDeclaredFormat(medication.formato),authority:"declared",confidence:"high"});return{facts,conflicts,catalogMatched:false,coverage:facts.length?"declared_only":"unavailable"}}
 const meta=provenance(reference,medication.catalog_snapshot);const inferredAuthority:KnowledgeAuthority=officialSource(meta.source)?"official_inferred":"unknown";const confidence:MedicationKnowledgeFact["confidence"]=inferredAuthority==="official_inferred"?"medium":"unavailable";
 const selectedRule=medication.catalog_snapshot?.match_kind==="exact"&&reference.regulatoryIdentity?.referenceType==="product"?activeRule(reference,at):null;
 const officialPrescription=selectedRule?.vaultPrescriptionType;const regulatoryMeta=selectedRule?provenance(reference,medication.catalog_snapshot,selectedRule.sources.find(officialSource)):meta;
 if(medication.tipo_receita&&officialPrescription&&medication.tipo_receita!==officialPrescription){const conflict:MedicationKnowledgeFact={kind:"prescription_type",label:"Receita — conferir",value:prescriptionLabels[medication.tipo_receita],authority:"conflict",confidence:"medium",declaredValue:medication.tipo_receita,officialValue:officialPrescription,limitation:"O cadastro foi preservado. A referência oficial encontrada é diferente e não foi aplicada automaticamente.",...regulatoryMeta};facts.push(conflict);conflicts.push(conflict)}else if(medication.tipo_receita)facts.push({kind:"prescription_type",label:"Receita",value:prescriptionLabels[medication.tipo_receita],authority:"declared",confidence:"high",declaredValue:medication.tipo_receita,...meta});else if(officialPrescription)facts.push({kind:"prescription_type",label:"Receita",value:prescriptionLabels[officialPrescription],authority:"official_inferred",confidence:"medium",officialValue:officialPrescription,...regulatoryMeta,limitation:"Regra documental; não substitui a conferência da apresentação e da prescrição."});
 const ingredients=reference.activeIngredients?.length?reference.activeIngredients:reference.activeIngredient?[reference.activeIngredient]:[];if(ingredients.length)facts.push({kind:"active_ingredient",label:"Princípio ativo",value:ingredients.join(" + "),authority:inferredAuthority,confidence,...meta,limitation:"Vínculos registrados; a completude da composição não foi certificada."});
 if(medication.formato)facts.push({kind:"pharmaceutical_form",label:"Formato informado",value:displayDeclaredFormat(medication.formato),authority:"declared",confidence:"high",...meta});else if(reference.pharmaceuticalForms?.length)facts.push({kind:"pharmaceutical_form",label:"Forma no catálogo",value:reference.pharmaceuticalForms.join(" · "),authority:inferredAuthority,confidence,...meta});
 const presentations=(reference.presentations||[]).map(item=>item.label).filter(Boolean);if(presentations.length)facts.push({kind:"presentation",label:"Apresentações vinculadas",value:presentations.slice(0,4).join(" · "),authority:inferredAuthority,confidence,...meta,limitation:presentations.length>4?`Mais ${presentations.length-4} apresentações na fonte.`:undefined});
 return{facts,conflicts,catalogMatched:true,catalogMatchKind:medication.catalog_snapshot?.match_kind,coverage:facts.some(f=>f.authority==="official_exact")?"verified":"partial"}
}
export function knowledgeAuthorityLabel(authority:KnowledgeAuthority){return({declared:"Declarado",official_exact:"Fonte oficial · correspondência exata",official_inferred:"Fonte oficial · inferido pelo catálogo",conflict:"Divergência para conferência",unknown:"Sem referência"}as const)[authority]}
