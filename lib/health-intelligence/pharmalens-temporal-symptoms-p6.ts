/** Indícios TEMPORAIS após começo registrado; nunca identifica reação causal. */
import type { RegistroSaude } from '@/lib/types';
import type { PharmaLensReportV7 } from './pharmalens-v7';
export type PostStartSymptomP6={id:string;name:string;day:string;start:string;acquisitionId:string;note:string};
const iso=(s:unknown):s is string=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(`${s}T12:00:00Z`));
const norm=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();
export function findPostStartSymptomsP6(input:{report:PharmaLensReportV7;records:readonly RegistroSaude[];userId:string;personId:string;today:string}):PostStartSymptomP6[]{
 const {report,records,userId,personId,today}=input;
 if(!userId||!personId||!iso(today))return [];
 const scoped=records.filter(r=>r.id&&r.user_id===userId&&r.person_id===personId&&r.categoria==='sintoma'&&iso(r.data)&&r.data<=today);
 const out:PostStartSymptomP6[]=[],seen=new Set<string>();
 for(const cycle of report.cycles){
  const startAt=cycle.startedAt;
  if(!iso(startAt)||startAt>today)continue;
  const begin=new Date(`${startAt}T12:00:00Z`);begin.setUTCDate(begin.getUTCDate()+7);
  const through=begin.toISOString().slice(0,10)<today?begin.toISOString().slice(0,10):today;
  for(const r of scoped){
   if(r.data<=startAt||r.data>through)continue;
   const name=norm(r.registro_chave||r.nome||r.tipo);if(!name)continue;
   if(scoped.some(previous=>previous.data<startAt && norm(previous.registro_chave||previous.nome||previous.tipo)===name))continue;
   const id=`${cycle.acquisitionId}:${name}`;if(seen.has(id))continue;seen.add(id);
   out.push({id,name:r.nome||r.tipo,day:r.data,start:startAt,acquisitionId:cycle.acquisitionId,
    note:'Registro após início declarado nesta aquisição; o intervalo não demonstra reação adversa nem nexo causal.'});
  }
 }
 return out.sort((a,b)=>b.day.localeCompare(a.day)||a.id.localeCompare(b.id)).slice(0,12);
}
