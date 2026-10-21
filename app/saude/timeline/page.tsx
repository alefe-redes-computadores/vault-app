"use client";
// VAULT_CLINICAL_TIMELINE_V67 — contrato de leitura canônica preservado.
// VAULT_CLINICAL_TIMELINE_V188
// Camada de leitura: organiza eventos canônicos sem duplicar ou persistir dados.

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Activity, CalendarDays, ChevronRight, FileText, FlaskConical, HeartPulse, History, PackageCheck, Pill, Stethoscope, type LucideIcon } from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { EmptyState } from "@/components/EmptyState";
import { ListFilters, ListPageHeader, ListSearch } from "@/components/list";
import { ClinicalListSummary } from "@/components/saude/ClinicalListSummary";
import { useSharedHealthIntelligence as useHealthIntelligence } from "@/contexts/HealthIntelligenceContext";
import { useReturnContext } from "@/hooks/useReturnContext";
import { getLocalTodayISO } from "@/lib/health-utils";
import { buildClinicalTimelineProjection, clinicalCivilTime, clinicalTimelineEventDetail } from "@/lib/health-intelligence/clinical-timeline-projection";
import { withReturnTarget } from "@/lib/navigation/return-context";
import type { ClinicalTimelineEvent, ClinicalTimelineEventType } from "@/lib/health-intelligence/clinical-timeline-v4";

const TYPE_META: Record<ClinicalTimelineEventType, { icon: LucideIcon; tone: string; dot: string }> = {
  dose: { icon: Pill, tone: "border-emerald-400/20 bg-emerald-400/[.07] text-emerald-300", dot: "bg-emerald-300" },
  health_record: { icon: Activity, tone: "border-violet-400/20 bg-violet-400/[.07] text-violet-300", dot: "bg-violet-300" },
  appointment: { icon: Stethoscope, tone: "border-ice/20 bg-ice/[.07] text-ice", dot: "bg-ice" },
  exam: { icon: FlaskConical, tone: "border-amber-400/20 bg-amber-400/[.07] text-amber-300", dot: "bg-amber-300" },
  pickup: { icon: PackageCheck, tone: "border-emerald-400/20 bg-emerald-400/[.07] text-emerald-300", dot: "bg-emerald-300" },
  renewal: { icon: FileText, tone: "border-fuchsia-400/20 bg-fuchsia-400/[.07] text-fuchsia-300", dot: "bg-fuchsia-300" },
  treatment: { icon: HeartPulse, tone: "border-coral/20 bg-coral/[.07] text-coral", dot: "bg-coral" },
};
const FILTERS: Array<{ value: "all" | ClinicalTimelineEventType; label: string }> = [
  { value: "all", label: "Tudo" }, { value: "appointment", label: "Consultas" }, { value: "exam", label: "Exames" }, { value: "treatment", label: "Tratamentos" }, { value: "renewal", label: "Receitas" }, { value: "pickup", label: "Retiradas" }, { value: "health_record", label: "Registros" }, { value: "dose", label: "Doses" },
];

function formatDate(value: string) { const time = clinicalCivilTime(value); if (time === null) return value; return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).format(new Date(time)); }

export default function ClinicalTimelinePage() {
  const { backTarget } = useReturnContext("/inteligencia/saude"); const router = useRouter(); const pathname = usePathname(); const searchParams = useSearchParams(); const health = useHealthIntelligence();
  const [type, setType] = useState<"all" | ClinicalTimelineEventType>("all"); const [period, setPeriod] = useState<30 | 90 | 3650>(90); const [query, setQuery] = useState("");
  const currentHref = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
  const projection = useMemo(() => buildClinicalTimelineProjection({ timeline: health.brainV4?.timeline ?? [], type, period, query, today: getLocalTodayISO() }), [health.brainV4?.timeline, period, query, type]);
  const { events, groups, routeById, stats } = projection;
  const openEvent = (event: ClinicalTimelineEvent) => { const href = routeById.get(event.id); if (href) router.push(withReturnTarget(href, currentHref)); };

  return <PageTransition><main className="min-h-screen bg-void pb-32 text-ink-primary">
    <ListPageHeader title="Linha do tempo" badgeLabel="HISTÓRICO CLÍNICO" badgeColor="text-violet-300" backUrl={backTarget}>
      <ListSearch value={query} onChange={setQuery} placeholder="Buscar evento, categoria ou situação..." className="order-1" />
      <ListFilters className="order-2" title="Filtrar histórico clínico" activeCount={(type === "all" ? 0 : 1) + (period === 90 ? 0 : 1)} onClear={() => { setType("all"); setPeriod(90); }}>
        <div className="flex shrink-0 gap-1 border-r border-surface-border/50 pr-2">{([30, 90, 3650] as const).map((value) => <button key={value} type="button" aria-pressed={period === value} onClick={() => setPeriod(value)} className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-bold ${period === value ? "border-violet-400/40 bg-violet-400/10 text-violet-300" : "border-surface-border/50 bg-surface-raised text-ink-muted"}`}>{value === 3650 ? "Todo histórico" : `${value} dias`}</button>)}</div>
        {FILTERS.map((filter) => <button key={filter.value} type="button" aria-pressed={type === filter.value} onClick={() => setType(filter.value)} className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-bold ${type === filter.value ? "border-ice/40 bg-ice/10 text-ice" : "border-surface-border/50 bg-surface-raised text-ink-muted"}`}>{filter.label}</button>)}
      </ListFilters>
      {!health.isLoading && events.length ? <div className="order-3 w-full"><ClinicalListSummary icon={History} eyebrow="Recorte atual" title={`${events.length} eventos em ${stats.days} dias`} detail="Leitura dos registros existentes; nenhum evento é criado aqui." metrics={[{ label: "Eventos", value: events.length }, { label: "Categorias", value: stats.categories, tone: "positive" }, { label: "Com detalhes", value: stats.navigable }]}/></div> : null}
    </ListPageHeader>
    <section className="mx-auto max-w-2xl space-y-5 px-5 pt-4">
      {health.isLoading ? <div className="rounded-[20px] border border-surface-border bg-surface p-5 text-sm text-ink-muted">Organizando seu histórico…</div> : groups.length === 0 ? <EmptyState icon={History} title="Nenhum evento neste recorte" description="Mude o período, filtro ou busca para ampliar a linha do tempo."/> : groups.map(([date, dayEvents]) => <section key={date} className="[content-visibility:auto] [contain-intrinsic-size:120px]">
        <div className="mb-2 flex items-center gap-2"><CalendarDays size={14} className="text-violet-300"/><h2 className="text-xs font-semibold capitalize text-ink-muted">{formatDate(date)}</h2><span className="ml-auto font-mono text-[9px] text-ink-faint">{dayEvents.length} {dayEvents.length === 1 ? "evento" : "eventos"}</span></div>
        <div className="overflow-hidden rounded-[20px] border border-surface-border/60 bg-surface">{dayEvents.map((event, index) => {
          const meta = TYPE_META[event.type]; const Icon = meta.icon; const href = routeById.get(event.id); const content = <><span className={`grid size-9 shrink-0 place-items-center rounded-xl border ${meta.tone}`}><Icon size={16}/></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-ink-primary">{event.label}</span><span className="mt-0.5 block truncate text-[9px] capitalize text-ink-muted">{clinicalTimelineEventDetail(event)}</span></span><span className="shrink-0 text-right"><span className="block font-mono text-[9px] text-ink-faint">{event.occurredAt.slice(11, 16) === "12:00" ? "" : event.occurredAt.slice(11, 16)}</span>{href ? <ChevronRight size={14} className="mt-1 text-ink-faint"/> : null}</span></>;
          return href ? <button key={event.id} type="button" onClick={() => openEvent(event)} className={`relative flex min-h-[58px] w-full items-center gap-3 px-3 py-2.5 text-left active:bg-surface-raised/50 ${index ? "border-t border-surface-border/40" : ""}`}><span className={`absolute bottom-2 left-0 top-2 w-0.5 rounded-full ${meta.dot}`}/>{content}</button> : <div key={event.id} className={`relative flex min-h-[58px] items-center gap-3 px-3 py-2.5 ${index ? "border-t border-surface-border/40" : ""}`}><span className={`absolute bottom-2 left-0 top-2 w-0.5 rounded-full ${meta.dot}`}/>{content}</div>;
        })}</div>
      </section>)}
      <section className="rounded-2xl border border-amber-400/20 bg-amber-400/[.05] p-3 text-[10px] leading-relaxed text-ink-muted">Relações próximas no tempo não significam causa. Esta linha reúne registros existentes e não substitui avaliação profissional.</section>
    </section>
  </main></PageTransition>;
}
