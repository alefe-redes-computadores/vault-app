/**
 * PharmaLens P4-C — auditoria descritiva de versões já VINCULADAS à medicação.
 * Read-only. A data de importação do catálogo NÃO é verificação de vigência
 * sanitária. Uma correspondência textual não determina produto ou apresentação.
 * Sem consulta à rede, sem mutação de medicamentos, prescrições ou estoque.
 */
import type {MedicationCatalogSnapshot} from '@/lib/types';
import type {MedicationReference,MedicationReferenceSource,MedicationRegulatoryReference} from '@/lib/medication-intelligence/types';
import {exactOfficialProductId,safeOfficialUrl} from '@/lib/medication-catalog/use-evidence-macro1';

export type SourceReviewStateP4C='documented'|'needs_review'|'missing_version'|'invalid_date'|'future_date';
export type SourceTrailRowP4C={
  key:string;title:string;authority:string;version:string|null;capturedOn:string|null;
  state:SourceReviewStateP4C;url:string|null;note:string;
};
export type RuleTrailRowP4C={
  key:string;title:string;range:string;state:'recorded'|'historical'|'future'|'unresolved';
  sources:string[];hasConditionalExceptions:boolean;
};
export type SourceTrailReportP4C={
  identity:'exact_product'|'nonexact_reference'|'no_reference';
  productName:string|null;productIdInternal:string|null;capturedAt:string|null;
  snapshotSignature:string|null;sources:SourceTrailRowP4C[];rules:RuleTrailRowP4C[];
  historicalProducts:number;currentProductNamed:boolean;
  reviewRequired:boolean;warnings:string[];
};
const DAY=/^\d{4}-\d{2}-\d{2}$/;
const normalizeDay=(raw:string|undefined|null):string|null=>{
  if(!raw)return null;
  if(typeof raw!=='string')return null;
  const value=raw.slice(0,10);
  if(!DAY.test(value))return null;
  const d=new Date(value+'T12:00:00Z');
  return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value?value:null;
};
const days=(from:string,to:string)=>Math.floor((Date.parse(to+'T12:00:00Z')-Date.parse(from+'T12:00:00Z'))/86400000);
const label=(s:string|undefined|null,max=150)=>typeof s==='string'?s.trim().slice(0,max):'';
const signature=(s:unknown):string|null=>typeof s==='string'&&s.trim()?s.trim().slice(0,80):null;
function asReference(snapshot:MedicationCatalogSnapshot|null|undefined):MedicationReference|null {
  if(!snapshot?.reference||typeof snapshot.reference!=='object')return null;
  const r=snapshot.reference as Partial<MedicationReference>;
  return typeof r.canonicalName==='string'&&Array.isArray(r.sources)?r as MedicationReference:null;
}
function singleSource(source:MedicationReferenceSource,index:number,today:string,threshold:number):SourceTrailRowP4C {
  if(!source||typeof source!=='object')return {key:`${index}:invalida`,title:'Fonte incompleta',authority:'Origem não identificada',version:null,capturedOn:null,state:'needs_review',url:null,note:'Referência malformada no catálogo; conferir antes de utilizar.'};
  const captured=normalizeDay(source.verifiedAt);
  const version=label(source.version,100)||null;
  const validToday=normalizeDay(today);
  const state:SourceReviewStateP4C=!version?'missing_version':source.verifiedAt&&!captured?'invalid_date':
    captured&&validToday&&captured>validToday?'future_date':
    !captured||!validToday||days(captured,validToday)>threshold?'needs_review':'documented';
  const url=source.url&&safeOfficialUrl(source.url)?source.url:null;
  const authority=source.authority==='anvisa'?'Anvisa (origem declarada no catálogo)':
    source.authority==='ministerio_saude'?'Ministério da Saúde (origem declarada no catálogo)':
    source.authority==='catalogo_local'?'Catálogo local':'Fonte externa não classificada';
  const note=state==='documented'?'Referência datada no catálogo; não confirma situação sanitária atual.':
    state==='missing_version'?'Versão da referência não informada.':
    state==='invalid_date'?'Data registrada em formato inválido.':
    state==='future_date'?'Data registrada posterior ao dia selecionado.':
    'Data ausente ou referência antiga: recomendável conferir novamente na fonte oficial.';
  return {key:`${index}:${source.id||'sem-id'}`,title:label(source.label)||'Fonte sem identificação',authority,version,
    capturedOn:captured,state,url,note};
}
function ruleRows(rules:readonly MedicationRegulatoryReference[],today:string):RuleTrailRowP4C[]{
  const validToday=normalizeDay(today);
  return rules.slice(0,30).map((rule,i)=>{
    if(!rule||typeof rule!=='object')return {key:`rule:${i}`,title:'Regra incompleta',range:'não informado',state:'unresolved' as const,sources:[],hasConditionalExceptions:true};
    const from=rule.effectiveFrom?normalizeDay(rule.effectiveFrom):null;
    const until=rule.effectiveUntil?normalizeDay(rule.effectiveUntil):null;
    const malformed=Boolean((rule.effectiveFrom&&!from)||(rule.effectiveUntil&&!until)||(from&&until&&from>until));
    const state:RuleTrailRowP4C['state']=malformed||!validToday?'unresolved':from&&from>validToday?'future':until&&until<validToday?'historical':'recorded';
    return {key:`rule:${i}`,title:label(rule.prescriptionModel)||'Regra administrativa registrada',
      range:`${from||'início não informado'} — ${until||'fim não informado'}`,state,
      sources:(Array.isArray(rule.sources)?rule.sources:[]).map(x=>label(x?.label)).filter(Boolean).slice(0,4),
      hasConditionalExceptions:Boolean(rule.hasMalformedExceptions||rule.exceptions?.length)};
  });
}
export function auditCatalogSourcesP4C(snapshot:MedicationCatalogSnapshot|null|undefined,today:string,reviewAfterDays=730):SourceTrailReportP4C{
  const reference=asReference(snapshot),validToday=normalizeDay(today);
  const threshold=Math.min(3650,Math.max(30,Number.isFinite(reviewAfterDays)?reviewAfterDays:730));
  // Uma fotografia remota malformada jamais é promovida a identidade exata.
  let exactId:string|null=null;
  try{exactId=exactOfficialProductId(snapshot);}catch{exactId=null;}
  const identity:SourceTrailReportP4C['identity']=!reference?'no_reference':exactId?'exact_product':'nonexact_reference';
  const sources=reference?.sources.slice(0,30).map((row,i)=>singleSource(row,i,today,threshold))||[];
  const rawRules=Array.isArray(reference?.regulatoryRules)?reference.regulatoryRules:[];
  const rules=ruleRows(rawRules,today);
  const capturedAt=normalizeDay(snapshot?.resolved_at);
  const warnings:string[]=[];
  if(!validToday)warnings.push('Data selecionada inválida: não é possível conferir a cronologia.');
  if(!reference)warnings.push('Nenhuma referência vinculada; o cadastro continua sendo apenas informação declarada.');
  else if(!exactId)warnings.push('A identidade exata de produto Anvisa não está comprovada. Nomes semelhantes não podem ser usados como equivalentes.');
  if(reference&&!reference.sources.length)warnings.push('Referência sem fonte rastreável.');
  if(snapshot?.resolved_at&&!capturedAt)warnings.push('Data da captura do catálogo inválida.');
  if(capturedAt&&validToday&&capturedAt>validToday)warnings.push('Captura do catálogo com data posterior ao dia selecionado.');
  if((reference?.sources.length||0)>30)warnings.push('Exibição limitada às 30 primeiras fontes; consultar o catálogo para auditoria completa.');
  if(sources.some(s=>s.state!=='documented'))warnings.push('Há fonte sem versão, sem data válida ou que merece nova conferência.');
  if(rules.some(r=>r.state==='unresolved'||r.hasConditionalExceptions))warnings.push('Regra com vigência ou exceções que exigem revisão humana contextual.');
  // Diferentes modelos de receita simultâneos só indicam possível ambiguidade
  // documental; não concluem que o cadastro ou o profissional estejam errados.
  const simultaneouslyRecorded=rules.filter(r=>r.state==='recorded').map(r=>r.title);
  if(new Set(simultaneouslyRecorded).size>1)warnings.push('Há modelos regulatórios registrados simultaneamente; não selecionar um automaticamente.');
  const historical=Array.isArray(reference?.commercialIdentity?.historicalProducts)?reference.commercialIdentity.historicalProducts:[];
  if(historical.length)warnings.push('Existe histórico de registros comerciais. Registros antigos não são promovidos ao produto atual.');
  if(rawRules.length>30)warnings.push('Exibição limitada às 30 primeiras regras; consultar o catálogo para uma auditoria integral.');
  return {identity,productName:reference?label(reference.canonicalName):null,productIdInternal:exactId,capturedAt,
    snapshotSignature:signature(snapshot?.catalog_signature),sources,rules,
    historicalProducts:historical.length,currentProductNamed:Boolean(reference?.commercialIdentity?.currentProduct?.name),
    reviewRequired:Boolean(warnings.length||sources.length===0||rules.some(r=>r.state==='unresolved')),
    warnings};
}
