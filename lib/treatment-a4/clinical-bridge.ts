/** A4 MACRO2 — read-only bridge from ONE factual A1 ledger to clinical presentations.
 * No writers, subscriptions, schedules, diagnosis, inferred intake or status transitions.
 */
import { validCivilDate, type A1TreatmentPhase } from '@/lib/clinical-a1/types';
import { a4PhaseKindLabel, a4PhaseSourceLabel } from '@/lib/treatment-a4/regimen';
import type { Tratamento, Medicamento, Medico } from '@/lib/types';

export type A4ClinicalFact = {
  userId:string;personId:string; id:string; date:string; treatmentId:string; treatmentName:string; title:string;
  kind:A1TreatmentPhase['tipo']; kindLabel:string; sourceLabel:string;
  origin:A1TreatmentPhase['origem']; recordedAt:string; synced:boolean;
  medicationId:string|null; medicationName:string|null;
  professionalName:string|null; consultationId:string|null; documentId:string|null;
  regimeNature:string|null; details:string[]; notes:string|null; href:string;
};
export type A4ClinicalBridgeInput = {
  userId:string;personId:string; phases:readonly A1TreatmentPhase[];
  treatments:readonly Tratamento[]; medications?:readonly Medicamento[]; professionals?:readonly Medico[];
  from?:string;through?:string;max?:number;
};
const clean=(v:unknown,n=130):string => typeof v==='string'?v.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,n):'';
const limit=(n:number)=>Number.isFinite(n)?Math.max(0,Math.min(2000,Math.trunc(n))):100;
const onlyDay=(v:string|undefined)=>!v||validCivilDate(v);
/** IDs must resolve within the same authenticated account and person, not merely match a label. */
export function projectA4ClinicalFacts(input:A4ClinicalBridgeInput):A4ClinicalFact[] {
  const {userId,personId}=input;
  if(!userId||!personId||!onlyDay(input.from)||!onlyDay(input.through)||
      (input.from&&input.through&&input.from>input.through)) return [];
  const treatments=new Map(input.treatments.filter(t=>t.id&&t.user_id===userId&&t.person_id===personId)
    .map(t=>[t.id!,t] as const));
  const meds=new Map((input.medications||[]).filter(m=>m.id&&m.user_id===userId&&m.person_id===personId)
    .map(m=>[m.id!,m] as const));
  const doctors=new Map((input.professionals||[]).filter(d=>d.id&&d.user_id===userId)
    .map(d=>[d.id!,d] as const));
  const seen=new Set<string>();
  const facts:A4ClinicalFact[]=[];
  for(const p of input.phases){
    if(!p?.id||seen.has(p.id)||p.deleted_at||p.user_id!==userId||p.person_id!==personId||
       !validCivilDate(p.data_efetiva)||input.from&&p.data_efetiva<input.from||input.through&&p.data_efetiva>input.through)continue;
    const treatment=treatments.get(p.tratamento_id);
    if(!treatment)continue;
    seen.add(p.id);
    const r=p.regime_a4;
    const med=r?.medicamento_id?meds.get(r.medicamento_id):undefined;
    const professional=p.profissional_id?doctors.get(p.profissional_id):undefined;
    const parts=[
      r?.natureza==='continuo'?'Duração contínua informada':r?.natureza==='temporario'?'Duração temporária informada':'',
      clean(r?.dose_texto,90),clean(r?.frequencia_texto,120),clean(r?.via,80),
      clean(r?.local_anatomico,100),r?.lateralidade&&r.lateralidade!=='nao_aplicavel'?`Lado: ${r.lateralidade}`:'',
      ...(Array.isArray(r?.horarios)?r.horarios.filter(v=>typeof v==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v)).slice(0,12).map(v=>`Horário informado: ${v}`):[]),
      r?.fim_previsto&&validCivilDate(r.fim_previsto)?`Fim/revisão previsto (não confirmado): ${r.fim_previsto}`:''
    ].filter(Boolean);
    facts.push({userId,personId,id:p.id,date:p.data_efetiva,treatmentId:p.tratamento_id,
      treatmentName:clean(treatment.nome,120)||'Tratamento',title:clean(p.titulo,160)||a4PhaseKindLabel(p.tipo),
      kind:p.tipo,kindLabel:a4PhaseKindLabel(p.tipo),sourceLabel:a4PhaseSourceLabel(p.origem),origin:p.origem,
      recordedAt:p.created_at,synced:p.synced!==false,
      medicationId:med?.id||null,medicationName:med?clean(med.nome,100):null,
      professionalName:professional?clean(professional.nome,100):null,
      consultationId:r?.consulta_id||null,documentId:r?.documento_id||null,
      regimeNature:r?.natureza||null,details:parts,notes:clean(p.observacoes,350)||null,
      href:`/saude/tratamentos/detalhes?id=${encodeURIComponent(p.tratamento_id)}#tratamento-regimes`});
  }
  facts.sort((a,b)=>b.date.localeCompare(a.date)||b.recordedAt.localeCompare(a.recordedAt)||a.id.localeCompare(b.id));
  return facts.slice(0,limit(input.max??100));
}
export function formatA4ClinicalDossier(facts:readonly A4ClinicalFact[],max=12):string {
  if(!facts.length)return '';
  const rows=facts.slice(0,limit(max)).map(f=>{
    const day=`${f.date.slice(8)}/${f.date.slice(5,7)}/${f.date.slice(0,4)}`;
    const detail=[f.medicationName?`Medicamento vinculado: ${f.medicationName}`:'',f.professionalName?`Profissional: ${f.professionalName}`:'',
      ...f.details,f.notes?`Observação: ${f.notes}`:''].filter(Boolean).join(' · ');
    return `${day} — ${f.treatmentName}: ${f.kindLabel} (${f.sourceLabel}). ${f.title}${detail?' — '+detail:''}`;
  });
  return ['TRATAMENTOS — FASES DECLARADAS (A4)',...rows,
    'Esses registros não comprovam dose tomada, mudança de prescrição, melhora ou encerramento automático.'].join('\n');
}
