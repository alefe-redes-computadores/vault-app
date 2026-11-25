/** STB-10: presentation evidence, never a prescription or an automatic identity change. */
import type { Medicamento } from '@/lib/types';
import type { MedicationReference } from '@/lib/medication-intelligence/types';
import { normalizeMedicationText } from '@/lib/medication-intelligence/normalize';
import { inferVaultFormatFromOfficialPresentation } from '@/lib/medications/catalog-presentation';
import { getMedicationCatalogAuthority } from '@/lib/medication-catalog/authority';
export type CatalogMedicationSTB=Pick<Medicamento,'id'|'user_id'|'person_id'|'nome'|'dosagem'|'formato'|'forma_farmaceutica'|'contexto_clinico_m1'>;
export type CatalogFitSTB='match'|'unknown'|'conflict';
const scalar=String.raw`\d+(?:[.,]\d+)?\s*(?:mcg|µg|μg|ug|mg|g|ui|ml|%)`;
const ratio=String.raw`(?:\s*/\s*(?:\d+(?:[.,]\d+)?\s*)?(?:ml|g))?`;
const expression=`${scalar}${ratio}(?:\\s*\\+\\s*${scalar}${ratio})*`;
const strengthWhole=new RegExp(`^${expression}$`,'i');
const strengthPrefix=new RegExp(`^(${expression})(?=\\s|$)`,'i');
const strengthSuffix=new RegExp(`\\s+(${expression})$`,'i');
const strengthKey=(s:string)=>s.toLowerCase().replace(/µg|μg|ug/g,'mcg').replace(/,/g,'.').replace(/\s+/g,'').replace(/\d+(?:\.\d+)?/g,x=>String(Number(x)));
export function declaredStrengthSTB(value:string):string|null {
 const s=value.trim();return strengthWhole.test(s)?strengthKey(s):null;
}
/** Order is not a mapping of individual components to ingredients. No unit conversion. */
export function compareStrengthSTB(declared:string|null,official:string|null):CatalogFitSTB {
 if(!declared||!official)return 'unknown';
 const a=declared.split('+'),b=official.split('+');
 const remaining=[...b];
 for(const part of a){const i=remaining.indexOf(part);if(i<0)return 'conflict';remaining.splice(i,1);}
 return remaining.length?'unknown':'match';
}
export function catalogLookupNameSTB(m:Pick<CatalogMedicationSTB,'nome'|'dosagem'>):string {
 const name=m.nome.trim(), suffix=strengthSuffix.exec(name), strength=declaredStrengthSTB(m.dosagem||'');
 // Remove only a suffix independently corroborated by the declared dosage, for search only.
 return suffix&&strength&&compareStrengthSTB(strengthKey(suffix[1]),strength)==='match'?name.slice(0,suffix.index).trim():name;
}
const release=(s:string):string|null=>{
 const t=normalizeMedicationText(s);if(/\b(?:lib cont|liberacao controlada)\b/.test(t))return 'controlled';
 if(/\b(?:lib prol|lib prolong|liberacao prolongada|extended release)\b/.test(t))return 'extended';
 if(/\b(?:lib ret|liberacao retardada|delayed release)\b/.test(t))return 'delayed';
 if(/\b(?:lib imed|liberacao imediata|immediate release)\b/.test(t))return 'immediate';return null;
};
const route=(s:string):string|null=>{
 const t=normalizeMedicationText(s);for(const [key,pattern] of [['sublingual',/\bsub(?:\s+)?ling(?:ual)?\b/],['oftalmica',/\b(?:sol|sus|susp) oft\b|\boftalmic[ao]\b|\bcolirio\b/],['otologica',/\b(?:sol|sus|susp) oto\b|\botologic[ao]\b/],['injetavel',/\b(?:sol inj|injecao|injetavel)\b/],['transdermica',/\btransdermic[ao]\b/],['nasal',/\bnasal\b/],['inalatoria',/\binalatori[ao]\b/],['vaginal',/\bvaginal\b/],['retal',/\bretal\b/],['topica',/\btopic[ao]\b/],['oral',/\b(?:oral|sol or|susp or|sus or)\b/]] as const)if(pattern.test(t))return key;return null;
};
const officialStrength=(label:string):string|null=>{const m=strengthPrefix.exec(label.trim());if(!m)return null;const rest=label.trim().slice(m[0].length).trimStart();return /^[+/]/.test(rest)?null:strengthKey(m[1]);};
const presentationStrength=(p:NonNullable<MedicationReference['presentations']>[number]):string|null=>{const label=String(p.label||'').trim();const strength=officialStrength(label);if(strength)return strength;if(strengthPrefix.test(label)||/\+\s*\d/.test(label))return null;return typeof p.value==='number'&&Number.isFinite(p.value)&&p.unit?declaredStrengthSTB(`${p.value} ${p.unit}`):null;};
const visualForm=(v:string):string|null=>{
 const t=normalizeMedicationText(v);
 if(['partido','oblongo','oblongo sulcado'].includes(t))return 'comprimido';
 // Pharmaceutical formulation takes priority over the dropper in packaging.
 if(/\b(?:sus|susp) (?:oto|oft|or)\b|\bsuspensao\b/.test(t))return 'suspensao';
 if(/\bsol (?:oto|oft|or)\b|\bsolucao\b/.test(t))return 'solucao';
 return inferVaultFormatFromOfficialPresentation(v);
};
const compare=(declared:string|null,official:string|null):CatalogFitSTB=>!declared&&!official?'match':!declared||!official?'unknown':declared===official?'match':'conflict';
const combine=(x:CatalogFitSTB[]):CatalogFitSTB=>x.includes('conflict')?'conflict':x.includes('unknown')?'unknown':'match';
const compareForm=(a:string|null,b:string|null):CatalogFitSTB=>a==='gota'&&(b==='solucao'||b==='suspensao')?'unknown':compare(a,b);
export function catalogPresentationFitSTB(m:CatalogMedicationSTB,r:MedicationReference):CatalogFitSTB {
 const strength=declaredStrengthSTB(m.dosagem||'');
 const text=[m.formato||'',m.forma_farmaceutica||''].join(' '), form=visualForm(m.formato||m.forma_farmaceutica||'');
 const now=new Date(), day=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
 const activeRoutes=new Set((m.contexto_clinico_m1?.regimes||[]).filter(x=>x.inicio<=day&&(!x.fim||x.fim>=day)&&x.via!=='nao_informada'&&x.via!=='outra').map(x=>x.via));
 const statedRelease=release(text), explicitRoute=route(text), activeRoute=activeRoutes.size===1?[...activeRoutes][0]:null;
 const statedRoute=explicitRoute||activeRoute;
 if(explicitRoute&&activeRoute&&explicitRoute!==activeRoute)return 'conflict';
 const rows=r.presentations||[];
 if(!rows.length)return 'unknown';
 const results=rows.map(p=>{
  const officialText=[p.pharmaceuticalForm||'',p.label||''].join(' ');
  return combine([compareStrengthSTB(strength,presentationStrength(p)),compareForm(form,visualForm(officialText)),compare(statedRelease,release(officialText)),activeRoutes.size>1?'unknown':compare(statedRoute,route(officialText))]);
 });
 // Mixed compatible/unknown presentations do not establish exact presentation identity.
 const possible=results.filter(x=>x!=='conflict');
 return possible.length===0?'conflict':possible.every(x=>x==='match')?'match':'unknown';
}
export function catalogAuthorityForMedicationSTB(m:CatalogMedicationSTB,r:MedicationReference|null|undefined) {
 const actual=getMedicationCatalogAuthority(m.nome,r);if(!r)return actual;
 const fit=catalogPresentationFitSTB(m,r);
 if(fit==='conflict')return {...actual,state:'possible_divergence' as const,label:'Possível divergência' as const,detail:'A apresentação declarada diverge das apresentações consultadas. Conferência necessária.'};
 const stripped=catalogLookupNameSTB(m), strength=declaredStrengthSTB(m.dosagem||'');
 if(actual.state!=='possible_divergence'){
  return actual;
 }
 if(stripped===m.nome.trim()||!strength||!(r.presentations||[]).some(p=>{const evidence=presentationStrength(p);return Boolean(evidence)&&compareStrengthSTB(strength,evidence)!=='conflict';}))return actual;
 const base=getMedicationCatalogAuthority(stripped,r);
 if(base.state!=='confirmed'&&base.state!=='compatible')return actual;
 return {...base,state:'compatible' as const,label:'Compatível' as const,detail:'Nome e concentração compatíveis com a referência. A apresentação exata não foi confirmada.'};
}
export function catalogReferenceUsableSTB(m:CatalogMedicationSTB,r:MedicationReference|null|undefined):boolean {
 if(!r||typeof r.canonicalName!=='string'||!r.canonicalName.trim()||!Array.isArray(r.sources)||!r.sources.some(s=>s.authority==='anvisa'||s.authority==='ministerio_saude'))return false;
 const a=catalogAuthorityForMedicationSTB(m,r);return a.state==='confirmed'||a.state==='compatible';
}
/** Product evidence is stricter than ingredient identity. No promotion based on partial strength. */
export function catalogExactPresentationSTB(m:CatalogMedicationSTB,r:MedicationReference|null|undefined):boolean {
 return Boolean(r&&r.regulatoryIdentity?.referenceType==='product'&&r.sources?.some(s=>s.authority==='anvisa')&&catalogReferenceUsableSTB(m,r)&&catalogPresentationFitSTB(m,r)==='match');
}
/** Scope includes presentation and clinical route context; not a clinical classification. */
export function catalogScopeSTB(m:CatalogMedicationSTB):string {
 return JSON.stringify([m.user_id||'',m.person_id||'',m.id||'',normalizeMedicationText(m.nome),declaredStrengthSTB(m.dosagem||'')||m.dosagem,normalizeMedicationText(m.formato||''),normalizeMedicationText(m.forma_farmaceutica||''),m.contexto_clinico_m1?.regimes?.map(x=>[x.via,x.inicio,x.fim])||[]]);
}
const identity=(x:MedicationReference)=>x.regulatoryIdentity?.referenceType==='product'?`product:${x.regulatoryIdentity.productId}`:`substance:${x.id}`;
const ingredients=(r:MedicationReference)=>new Set([...(r.activeIngredients||[]),r.activeIngredient||''].map(normalizeMedicationText).filter(Boolean));
/** Do not discard legitimate same-product ingredient evidence merely because a refresh omits links. */
export function catalogPreserveIngredientEvidenceSTB(previous:MedicationReference,next:MedicationReference):boolean {
 if(identity(previous)!==identity(next))return false;
 const old=ingredients(previous),fresh=ingredients(next);
 return old.size>0&&fresh.size===0;
}
/** Ranking is discovery, not proof of a unique product. Prefer an independently hydrated substance when product IDs are ambiguous. */
export function chooseUnambiguousCatalogReferenceSTB<T extends {reference:MedicationReference;matchKind:'exact'|'pharmaceutical_equivalence'}>(ranked:readonly T[],known?:MedicationReference|null):T|null {
 const best=ranked[0];if(!best)return null;
 const peers=ranked.filter(x=>x.matchKind===best.matchKind&&x.reference.regulatoryIdentity?.referenceType==='product');
 if(best.reference.regulatoryIdentity?.referenceType==='product'&&new Set(peers.map(x=>identity(x.reference))).size>1){
  const saved=known&&peers.find(x=>identity(x.reference)===identity(known));if(saved)return saved;
  const products=peers.map(x=>ingredients(x.reference));
  const substances=ranked.filter(x=>x.reference.regulatoryIdentity?.referenceType==='substance');
  const matching=substances.filter(x=>{const a=ingredients(x.reference);return a.size>0&&products.every(p=>p.size===a.size&&[...a].every(v=>p.has(v)));});
  return new Set(matching.map(x=>identity(x.reference))).size===1?matching[0]:null;
 }
 return best;
}
