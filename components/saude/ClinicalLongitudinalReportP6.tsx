"use client";
import { useMemo,useState } from "react";
import type { HealthInsightContext } from "@/lib/health-insights";
import { clinicalLongitudinalEvidenceP6 } from "@/lib/health-intelligence/clinical-longitudinal-evidence-p6";
import { ConsultationReportP6P2 } from "@/components/saude/ConsultationReportP6P2";
type Props={context:HealthInsightContext;days:number};
export function ClinicalLongitudinalReportP6({context,days}:Props){
 const [include,setInclude]=useState(true);const [includeSources,setIncludeSources]=useState(true);
 const summary=useMemo(()=>clinicalLongitudinalEvidenceP6({owner:{user_id:context.userId||"",person_id:context.personId},today:context.hoje||"",days,doses:context.doseLogs,symptoms:context.registrosSaude,consultations:context.consultas,medications:context.medicamentos,withdrawals:context.retiradas,acquisitions:context.renovacoes}),[context,days]);
 if(!summary.scoped)return <p className="rounded-xl border border-amber-400/20 p-3 text-xs text-amber-200">Resumo longitudinal indisponível: titular não identificado. Nenhum evento foi inferido.</p>;
 const metrics:[string,number][]=[['Doses confirmadas',summary.taken],['Ignoradas explicitamente',summary.ignored],['SOS / extras confirmados',summary.extra],['Observações declaradas',summary.observations],['Consultas registradas',summary.consultations],['Retiradas concluídas',summary.withdrawalsCompleted],['Aquisições cadastradas',summary.acquisitions],['Medicamentos cadastrados',summary.medications]];
 return <section aria-label="Evidência longitudinal CI360" className="space-y-3 rounded-[24px] border border-sky-300/20 bg-sky-300/[.035] p-4 print:border-gray-300 print:bg-white">
  <header><h2 className="text-sm font-bold text-sky-200 print:text-black">Dossiê longitudinal verificável</h2><p className="mt-1 text-xs text-ink-muted">{summary.start?.split('-').reverse().join('/')} a {summary.end.split('-').reverse().join('/')} · {summary.periodDays} dias · leitura factual</p></header>
  <div className="flex flex-wrap gap-3 print:hidden"><label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs text-ink-secondary"><input type="checkbox" checked={include} onChange={e=>setInclude(e.target.checked)} className="size-4 accent-sky-300"/>Incluir dossiê no PDF</label><label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs text-ink-secondary"><input type="checkbox" checked={includeSources} onChange={e=>setIncludeSources(e.target.checked)} className="size-4 accent-sky-300"/>Incluir fontes e limites</label></div>
  {include?<div className="space-y-3"><div className="grid grid-cols-2 gap-2">{metrics.map(([label,value])=><div key={label} className="rounded-xl border border-surface-border/35 bg-surface px-3 py-2 print:border-gray-300 print:bg-white"><p className="text-[11px] text-ink-muted">{label}</p><p className="mt-1 text-lg font-bold text-ink-primary print:text-black">{value}</p></div>)}</div><p className="text-[11px] text-amber-200 print:text-gray-700">Doses sem registro: não estimáveis sem agenda completa. Zero não significa adesão comprovada.</p></div>:<p className="text-xs text-ink-muted print:hidden">Dossiê oculto desta impressão, conforme sua escolha.</p>}
  {include&&<ConsultationReportP6P2 context={context} days={days} />}
  {include&&includeSources?<div className="space-y-2 border-t border-surface-border/30 pt-3"><h3 className="text-xs font-bold text-ink-secondary print:text-black">Fontes e limitações</h3><ul className="space-y-1 text-[11px] leading-relaxed text-ink-muted">{[...summary.provenance,...summary.limitations].map((note,i)=><li key={i}>• {note}</li>)}</ul></div>:null}
 </section>;
}
