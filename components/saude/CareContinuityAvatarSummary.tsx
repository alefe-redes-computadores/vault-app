"use client";
import { memo, useMemo } from "react";
import { CalendarClock, ChevronRight, Network, Stethoscope } from "lucide-react";
import type { HealthInsightContext } from "@/lib/health-insights";
import { buildCareContinuityOverview } from "@/lib/health-network/care-continuity";
import { AvatarWeekCoverage } from "@/components/saude/AvatarWeekCoverage";

/** Light, factual bridge from Avatar to the care network; no new Dexie or Supabase query. */
export const CareContinuityAvatarSummary = memo(function CareContinuityAvatarSummary({context,onNavigate}:{context:HealthInsightContext|null|undefined;onNavigate:(href:string)=>void}) {
  const overview=useMemo(()=>context?buildCareContinuityOverview(context):null,[context]);

  // P12: memoiza a projeção mais próxima, sem novos listeners ou consultas.
  const closest=useMemo(()=>overview?.ready.flatMap(x=>x.upcoming.map(c=>({treatment:x.treatment,consultation:c}))).sort((a,b)=>a.consultation.data.localeCompare(b.consultation.data))[0],[overview]);
  if(!overview || overview.total===0)return null;
  const primary=closest?.treatment ?? overview.ready[0]?.treatment;
  return <section aria-label="Rede de cuidado do avatar" className="rounded-2xl border border-surface-border/80 border-l-2 border-l-emerald-300/40 bg-surface p-3">
    <div className="flex items-center gap-2"><Network size={16} className="text-emerald-300"/><h3 className="text-sm font-semibold text-ink-primary">Cuidado conectado</h3><span className="ml-auto text-[10px] text-ink-muted">Dados registrados</span></div>
    <div className="mt-2 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-surface-raised/70 p-2"><strong className="block text-base text-ink-primary">{overview.total}</strong><span className="text-[10px] text-ink-muted">Tratamentos ativos</span></div><div className="rounded-xl bg-surface-raised/70 p-2"><strong className="block text-base text-ink-primary">{overview.appointments}</strong><span className="text-[10px] text-ink-muted">Consultas vinculadas</span></div><div className="rounded-xl bg-surface-raised/70 p-2"><strong className="block text-base text-ink-primary">{overview.documented}</strong><span className="text-[10px] text-ink-muted">Com histórico · 30d</span></div></div>
    {closest && <p className="mt-2 flex items-center gap-1.5 text-[10px] text-ink-muted"><CalendarClock size={12} className="shrink-0"/>Consulta em {closest.consultation.data.split("-").reverse().join("/")} vinculada a {closest.treatment.nome}</p>}
    {primary?.id && <button type="button" onClick={()=>onNavigate(`/saude/tratamentos/detalhes?id=${encodeURIComponent(primary.id!)}`)} className="mt-2 flex min-h-11 w-full items-center gap-2 rounded-xl border border-surface-border bg-surface-raised px-3 text-left text-xs font-semibold text-ink-primary"><Stethoscope size={14} className="text-emerald-300"/><span className="min-w-0 flex-1 truncate">Abrir dossiê · {primary.nome}</span><ChevronRight size={14}/></button>}
    <AvatarWeekCoverage context={context} onNavigate={onNavigate}/>
    <p className="mt-2 text-[10px] leading-relaxed text-ink-muted">Os números representam relações salvas, não a qualidade clínica do tratamento. Nenhum compartilhamento automático.</p>
  </section>;
});
