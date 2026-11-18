/** MACRO 2 — triagem de sobreposição por princípio ativo COM fonte.
 * Nome parecido e marca comercial jamais comprovam interação clínica.
 */
import type { Medicamento } from '@/lib/types';
import type { MedicationReference } from '@/lib/medication-intelligence/types';

export type TherapyOverlapP6 = {
  key:string; ingredient:string; firstId:string; secondId:string;
  firstName:string; secondName:string;
  label:'Possível sobreposição do princípio ativo';
  caveat:string;
};
const norm=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').replace(/\s+/g,' ').trim();
function verifiedIngredients(m:Medicamento):string[]{
  const snapshot=m.catalog_snapshot;
  if(!snapshot||snapshot.match_kind!=='exact')return [];
  const ref=snapshot.reference as Partial<MedicationReference>|undefined;
  if(!ref||ref.regulatoryIdentity?.referenceType!=='product'||
    !Array.isArray(ref.sources)||!ref.sources.some(x=>x.authority==='anvisa'||x.authority==='ministerio_saude'))return [];
  const names=ref.activeIngredients?.length?ref.activeIngredients:ref.activeIngredient?[ref.activeIngredient]:[];
  return [...new Set(names.map(norm).filter(x=>x.length>2))];
}
export function findDocumentedTherapyOverlapsP6(medicines:readonly Medicamento[],userId:string,personId:string):TherapyOverlapP6[]{
 if(!userId||!personId)return [];
 const active=medicines.filter(m=>m.id && m.user_id===userId && m.person_id===personId && m.status!=='descontinuado')
  .map(m=>({m,ingredients:verifiedIngredients(m)})).filter(x=>x.ingredients.length);
 const seen=new Set<string>(),out:TherapyOverlapP6[]=[];
 for(let i=0;i<active.length;i++)for(let j=i+1;j<active.length;j++){
   const a=active[i],b=active[j];if(a.m.id===b.m.id)continue;
   for(const ing of a.ingredients.filter(k=>b.ingredients.includes(k))){
     const ids=[a.m.id!,b.m.id!].sort(),key=[...ids,ing].join(':');if(seen.has(key))continue;seen.add(key);
     out.push({key,ingredient:ing,firstId:a.m.id!,secondId:b.m.id!,firstName:a.m.nome,secondName:b.m.nome,
      label:'Possível sobreposição do princípio ativo',caveat:'Correspondência farmacêutica documentada. Não prova uso simultâneo, excesso de dose, interação clínica ou duplicidade indevida. Conferir com profissional.'});
   }
 }
 return out.sort((a,b)=>a.ingredient.localeCompare(b.ingredient,'pt-BR')||a.key.localeCompare(b.key));
}
