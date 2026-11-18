/** MACRO 1 — leitura verificável, sem prescrição, posologia ou inferência automática.
 * Integra-se ao catálogo existente: nunca transforma nome/substância em produto exato.
 */
import type { MedicationCatalogSnapshot } from '@/lib/types';
import type { MedicationReference } from '@/lib/medication-intelligence/types';

export type UseFactKind = 'food_relation'|'fasting'|'drowsiness'|'refrigeration'|'light_protection'|'after_open'|'administration_route';
export type UseFactStatus = 'verified'|'draft'|'rejected'|'superseded';
export type MedicationUseFactM1 = {
  id:string; product_id:string; presentation_id:string|null; fact_kind:UseFactKind;
  statement:string; qualification:string|null; source_url:string; source_section:string;
  source_document_sha256:string; source_version:string; reviewed_at:string;
  source_published_at:string|null; effective_from:string|null; effective_until:string|null;
  review_status:UseFactStatus;
};
export type UseEvidenceState = 'verified'|'unavailable'|'needs_exact_identity'|'no_verified_facts'|'conflict'|'stale';
export type UseEvidenceSelection = {state:UseEvidenceState;facts:MedicationUseFactM1[];limitations:string[]};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY=/^\d{4}-\d{2}-\d{2}$/;
const KIND:ReadonlySet<string>=new Set(['food_relation','fasting','drowsiness','refrigeration','light_protection','after_open','administration_route']);
const isDay=(v:string):boolean=>DAY.test(v)&&!Number.isNaN(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
const daysBetween=(a:string,b:string)=>Math.floor((Date.parse(b+'T12:00:00Z')-Date.parse(a+'T12:00:00Z'))/86400000);
export const useFactLabels:Record<UseFactKind,string>={
 food_relation:'Relação com alimentos',fasting:'Orientação sobre jejum',drowsiness:'Atenção à sonolência',
 refrigeration:'Conservação e temperatura',light_protection:'Proteção da luz',
 after_open:'Após abertura',administration_route:'Via de administração',
};
export function safeOfficialUrl(url:string):boolean{
 try{const u=new URL(url);const h=u.hostname.toLowerCase();
 return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&
 (h==='anvisa.gov.br'||h.endsWith('.anvisa.gov.br')||h==='www.gov.br'&&u.pathname.startsWith('/anvisa/'));
 }catch{return false;}
}
/** Somente ID exato do produto ANVISA. Igualdade de texto/forma não basta. */
export function exactOfficialProductId(snapshot:MedicationCatalogSnapshot|null|undefined):string|null{
 if(!snapshot||snapshot.match_kind!=='exact'||!snapshot.reference||typeof snapshot.reference!=='object')return null;
 const r=snapshot.reference as Partial<MedicationReference>;
 if(r.regulatoryIdentity?.referenceType!=='product'||!UUID.test(r.regulatoryIdentity.productId))return null;
 if(!Array.isArray(r.sources)||!r.sources.some(s=>s.authority==='anvisa'))return null;
 return r.regulatoryIdentity.productId;
}
export function selectVerifiedUseFactsM1(input:{productId:string|null;presentationId?:string|null;rows:readonly MedicationUseFactM1[];today:string;maxAgeDays?:number}):UseEvidenceSelection{
 const {productId,rows,today}=input;
 if(!productId||!UUID.test(productId))return {state:'needs_exact_identity',facts:[],limitations:['Identidade de produto exata não confirmada; nenhuma orientação é atribuída por nome parecido.']};
 if(!isDay(today))return {state:'unavailable',facts:[],limitations:['Data atual inválida; não é seguro avaliar a vigência da evidência.']};
 const presentationId=input.presentationId&&UUID.test(input.presentationId)?input.presentationId:null;
 const eligible=rows.filter(r=>r.product_id===productId&&r.review_status==='verified'&&KIND.has(r.fact_kind)&&
  (r.presentation_id===null||Boolean(presentationId&&r.presentation_id===presentationId))&&
  r.statement.trim().length>0&&r.statement.length<=520&&
  safeOfficialUrl(r.source_url)&&/^[0-9a-f]{64}$/i.test(r.source_document_sha256)&&
  Boolean(r.source_section.trim())&&Boolean(r.source_version.trim())&&
  isDay(r.reviewed_at.slice(0,10))&&
  (!r.effective_from||r.effective_from<=today)&&(!r.effective_until||r.effective_until>=today));
 if(!eligible.length)return{state:'no_verified_facts',facts:[],limitations:['Nenhuma orientação específica confirmada para este produto; isso NÃO significa ausência de restrições.']};
 const byKind=new Map<UseFactKind,MedicationUseFactM1[]>();
 for(const r of eligible){const arr=byKind.get(r.fact_kind)||[];arr.push(r);byKind.set(r.fact_kind,arr);}
 // Se fontes verificadas discordam, não selecionar orientação vencedora automaticamente.
 for(const items of byKind.values()){
  const unique=new Set(items.map(x=>[x.statement.trim().normalize('NFKC').toLowerCase(),(x.qualification||'').trim().normalize('NFKC').toLowerCase()].join('|')));
  if(unique.size>1)return{state:'conflict',facts:[],limitations:['Fontes verificadas divergentes para o mesmo assunto. Conferir bulas oficiais antes de orientar.']};
 }
 const limit=Math.min(3650,Math.max(30,input.maxAgeDays??730));
 const stale=eligible.some(r=>daysBetween(r.reviewed_at.slice(0,10),today)>limit||daysBetween(r.reviewed_at.slice(0,10),today)<0);
 if(stale)return{state:'stale',facts:[],limitations:['Evidência com revisão antiga ou data futura; consultar a bula vigente antes de usar.']};
 const facts=[...byKind.values()].map(items=>items.sort((a,b)=>b.reviewed_at.localeCompare(a.reviewed_at))[0]);
 return{state:'verified',facts:facts.sort((a,b)=>a.fact_kind.localeCompare(b.fact_kind)),limitations:[
  'Informações gerais do produto, não substituem a prescrição individual nem comprovam adequação da apresentação.',
  'Nenhuma orientação deve alterar automaticamente horários, doses, alarmes, estoques ou tratamentos.',
 ]};
}
