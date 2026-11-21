/** Shared factual, read-only projection. Never writes CareFlow, Home, Brain or PDF entities. */
import type { RehabProgramM5, RehabSessionM5, RehabMilestoneM5, RehabOriginM5 } from './types';
export const REHAB_M5_STATES={planned:'Planejado',active:'Em andamento',suspended:'Pausado',completed:'Alta registrada',interrupted:'Interrompido'} as const;
export const REHAB_M5_MODALITIES={motor_physiotherapy:'Fisioterapia motora',occupational_therapy:'Terapia ocupacional',hydrotherapy:'Hidroterapia',speech_therapy:'Fonoaudiologia',neurological:'Reabilitação neurológica',cardiopulmonary:'Reabilitação cardiopulmonar',other:'Outra modalidade'} as const;
export const REHAB_M5_MILESTONE_LABELS={reassessment:'Reavaliação',reported_progress:'Evolução informada',clinical_clearance:'Liberação clínica registrada',exam_referral:'Encaminhamento para exame',functional_discharge:'Alta funcional relatada'} as const;
export type RehabFactM5={id:string;programId:string;personId:string;date:string;title:string;detail:string;source:string;kind:'program'|'session'|'milestone';href:string};
export const localDayRehabM5=(value:string):string=>{
 if(/^\d{4}-\d{2}-\d{2}$/.test(value))return value; // civil date, never convert date-only to UTC
 const d=new Date(value);if(!Number.isFinite(d.getTime()))return '';
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
export function rehabFactsM5(input:{userId:string;personId:string;programs:readonly RehabProgramM5[];
 sessions:readonly RehabSessionM5[];milestones:readonly RehabMilestoneM5[]}):RehabFactM5[]{
 const owned=(r:{user_id:string;person_id:string;deleted_at:string|null})=>r.user_id===input.userId&&r.person_id===input.personId&&!r.deleted_at;
 const parents=new Map(input.programs.filter(owned).map(p=>[p.id,p]));
 const facts:RehabFactM5[]=[];
 const href=(id:string)=>`/saude/reabilitacao/detalhes?id=${encodeURIComponent(id)}`;
 for(const p of parents.values()){
  facts.push({id:p.id,programId:p.id,personId:p.person_id,date:p.start_date||p.created_at,title:`Reabilitação · ${p.title}`,
   detail:REHAB_M5_STATES[p.status]||'Situação não informada',source:'Programa registrado',kind:'program',href:href(p.id)});
 }
 for(const s of input.sessions.filter(owned)){
  if(!parents.has(s.program_id))continue;
  const label=s.status==='performed'?'Sessão realizada':s.status==='missed'?'Ausência registrada':s.status==='cancelled'?'Sessão cancelada':s.status==='confirmed'?'Sessão confirmada':'Sessão agendada';
  facts.push({id:s.id,programId:s.program_id,personId:s.person_id,date:s.scheduled_at,title:label,detail:parents.get(s.program_id)!.title,
   source:'Status declarado da sessão',kind:'session',href:href(s.program_id)});
 }
 for(const m of input.milestones.filter(owned)){
  if(!parents.has(m.program_id))continue;
  facts.push({id:m.id,programId:m.program_id,personId:m.person_id,date:m.recorded_at,
   title:REHAB_M5_MILESTONE_LABELS[m.kind],detail:m.notes,source:m.source==='professional_reported'?'Informação atribuída a profissional':'Relato próprio',
   kind:'milestone',href:href(m.program_id)});
 }
 return facts.sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
}
export function rehabDueSessionsM5(input:{userId:string;personId:string;programs:readonly RehabProgramM5[];
 sessions:readonly RehabSessionM5[];today:string;now?:number}):RehabSessionM5[]{
 const ids=new Set(input.programs.filter(p=>p.user_id===input.userId&&p.person_id===input.personId&&!p.deleted_at).map(p=>p.id));
 return input.sessions.filter(s=>s.user_id===input.userId&&s.person_id===input.personId&&!s.deleted_at&&ids.has(s.program_id)&&
  (s.status==='scheduled'||s.status==='confirmed')&&localDayRehabM5(s.scheduled_at)===input.today&&Number.isFinite(Date.parse(s.scheduled_at)))
  .sort((a,b)=>a.scheduled_at.localeCompare(b.scheduled_at));
}
export function rehabReverseProgramsM5(input:{userId:string;personId:string;originType:RehabOriginM5['origin_type'];originId:string;
 origins:readonly RehabOriginM5[];programs:readonly RehabProgramM5[]}):RehabProgramM5[]{
 const ids=new Set(input.origins.filter(r=>r.user_id===input.userId&&r.person_id===input.personId&&!r.deleted_at&&
  r.origin_type===input.originType&&r.origin_id===input.originId).map(r=>r.program_id));
 return input.programs.filter(p=>p.user_id===input.userId&&p.person_id===input.personId&&!p.deleted_at&&ids.has(p.id));
}
