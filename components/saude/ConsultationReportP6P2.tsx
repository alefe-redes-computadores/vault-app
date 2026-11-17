'use client';
import { useMemo, useState } from 'react';
import type { HealthInsightContext } from '@/lib/health-insights';
import { consultationTimelineForMedicationP6P2 } from '@/lib/consultations/consultation-timeline-p6p2';

/** Documento permanece local: a impressão/salvar PDF é uma ação separada do usuário. */
export function ConsultationReportP6P2({context,days}:{context:HealthInsightContext;days:number}) {
 const [include,setInclude]=useState(true);
 const [includeNotes,setIncludeNotes]=useState(false);
 const summary=useMemo(()=>{
  const uid=context.userId||'',pid=context.personId||'';
  if(!uid||!pid)return [];
  const today=context.hoje||'';
  const start=new Date(`${today}T12:00:00Z`);
  if(!Number.isFinite(start.getTime()))return [];
  start.setUTCDate(start.getUTCDate()-Math.max(1,Math.min(365,days))+1);
  const from=start.toISOString().slice(0,10);
  const meds=context.medicamentos.filter(m=>m.id&&m.user_id===uid&&m.person_id===pid);
  return context.consultas.filter(c=>c.id&&c.user_id===uid&&c.person_id===pid&&c.data?.slice(0,10)>=from&&c.data?.slice(0,10)<=today)
   .sort((a,b)=>b.data.localeCompare(a.data)).slice(0,20).map(c=>({
    id:c.id!,date:c.data.slice(0,10),doctor:c.medico||'Profissional não informado',status:c.status,
    meds:meds.filter(m=>consultationTimelineForMedicationP6P2(m,[c]).length).map(m=>m.nome),
    personal:c.percepcao_paciente||'',professional:c.orientacao_profissional||'',followUp:c.proximos_passos||'',
   }));
 },[context,days]);
 if(!summary.length)return null;
 return <section className="space-y-3 rounded-[20px] border border-surface-border/50 p-4 print:break-before-page print:rounded-none print:border-gray-300" aria-label="Consultas explicitamente relacionadas no relatório">
  <header><h3 className="text-sm font-bold text-ink-primary print:text-black">Consultas e vínculos registrados</h3><p className="mt-1 text-[11px] text-ink-muted print:text-gray-700">{summary.length} consulta(s) no período · vínculos de medicamentos somente quando explícitos no cadastro</p></header>
  <div className="flex flex-wrap gap-3 print:hidden"><label className="flex min-h-11 items-center gap-2 text-xs text-ink-secondary"><input type="checkbox" checked={include} onChange={e=>setInclude(e.target.checked)} className="size-4 accent-sky-300"/>Incluir consultas no PDF</label><label className="flex min-h-11 items-center gap-2 text-xs text-ink-secondary"><input type="checkbox" checked={includeNotes} onChange={e=>setIncludeNotes(e.target.checked)} className="size-4 accent-sky-300"/>Incluir relatos sensíveis</label></div>
  {include?<div className="space-y-3">{summary.map(c=><article key={c.id} className="break-inside-avoid rounded-xl border border-surface-border/45 bg-surface p-3 print:border-gray-300 print:bg-white"><p className="text-xs font-bold text-ink-primary print:text-black">{c.date.split('-').reverse().join('/')} · {c.doctor} <span className="font-normal">({c.status})</span></p><p className="mt-1 text-[11px] text-ink-muted print:text-gray-700">Medicamentos diretamente vinculados: {c.meds.length?c.meds.join(', '):'nenhum vínculo explícito'}</p>{includeNotes&&<div className="mt-2 space-y-1 text-[11px] text-ink-secondary print:text-black">{c.personal&&<p><strong>Relato pessoal:</strong> {c.personal}</p>}{c.professional&&<p><strong>Orientação relatada:</strong> {c.professional}</p>}{c.followUp&&<p><strong>Próximos passos:</strong> {c.followUp}</p>}</div>}</article>)}</div>:<p className="text-xs text-ink-muted print:hidden">Consultas excluídas desta impressão.</p>}
  {include&&<p className="text-[11px] text-ink-muted print:text-gray-700">Documento observacional. A presença de vínculo não prova prescrição nem alteração de dose. Dados não registrados permanecem desconhecidos.</p>}
 </section>;
}
