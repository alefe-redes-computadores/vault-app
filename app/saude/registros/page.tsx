"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, AlertTriangle, ArrowLeft, BarChart3, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ClipboardList, Droplets, FileDown, HeartPulse, Pill, Plus, Search, Stethoscope, X } from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { CardListSkeleton } from "@/components/loading/CardListSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { useHapticFeedback } from "@/lib/haptics";
import { useRegistrosSaude } from "@/hooks/useRegistrosSaude";
import { useAllDoseLogs } from "@/hooks/useDoseLogs";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useTratamentos } from "@/hooks/useTratamentos";
import { analisarRegistroSaude } from "@/lib/health-insights";
import { buildClinicalEvents, buildClinicalMonth, currentClinicalMonth, shiftClinicalMonth, type ClinicalEvent } from "@/lib/clinical-record-timeline";

type ViewFilter = "todos" | "sintoma" | "medicao" | "hidratacao" | "dose";
const normalize = (value: unknown) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
const displayDate = (key: string) => { const [y,m,d]=key.split("-"); return `${d}/${m}/${y}`; };
const categoryMeta: Record<ClinicalEvent["category"], { label: string; tone: string; icon: typeof Activity }> = {
  sintoma: { label: "Sintoma", tone: "border-violet-400/25 bg-violet-400/10 text-violet-300", icon: HeartPulse },
  medicao: { label: "Medição", tone: "border-ice/25 bg-ice/10 text-ice", icon: Activity },
  humor: { label: "Humor", tone: "border-fuchsia-400/25 bg-fuchsia-400/10 text-fuchsia-300", icon: HeartPulse },
  hidratacao: { label: "Hidratação", tone: "border-cyan-400/25 bg-cyan-400/10 text-cyan-300", icon: Droplets },
  dose: { label: "Dose", tone: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300", icon: Pill },
  outro: { label: "Registro", tone: "border-surface-border bg-surface-raised text-ink-muted", icon: ClipboardList },
};

export default function RegistrosSaudePage() {
  const router = useRouter();
  const { trigger } = useHapticFeedback();
  const { registros, isLoading } = useRegistrosSaude();
  const { allDoseLogs, isLoading: dosesLoading } = useAllDoseLogs();
  const { medicamentos = [] } = useMedicamentos();
  const { tratamentos = [] } = useTratamentos();
  const [monthKey, setMonthKey] = useState(currentClinicalMonth);
  const [filter, setFilter] = useState<ViewFilter>("todos");
  const [search, setSearch] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const allEvents = useMemo(() => buildClinicalEvents(registros, allDoseLogs, medicamentos), [registros, allDoseLogs, medicamentos]);
  const month = useMemo(() => buildClinicalMonth(allEvents, monthKey), [allEvents, monthKey]);
  const visibleEvents = useMemo(() => month.events.filter(event => {
    if (filter !== "todos" && event.category !== filter) return false;
    const medicationText = event.medication ? `${event.medication.nome} ${event.medication.dosagem || ""}` : "";
    return !search.trim() || normalize(`${event.title} ${event.subtitle || ""} ${medicationText}`).includes(normalize(search));
  }), [month.events, filter, search]);
  const visibleIds = useMemo(() => new Set(visibleEvents.map(item => item.id)), [visibleEvents]);
  const stats = useMemo(() => ({ records: month.events.filter(e => e.kind === "record").length, doses: month.events.filter(e => e.category === "dose").length, alerts: month.events.filter(e => e.record && analisarRegistroSaude(e.record.nome, e.record.valor_medicao, e.record.intensidade, e.record.observacoes)?.status !== "normal").length, days: new Set(month.events.map(e => e.date)).size }), [month.events]);
  const report = useMemo(() => ({ activeMedicines: medicamentos.filter(item => item.status !== "descontinuado").length, treatments: tratamentos.filter(item => item.status !== "concluido").length, scheduled: month.events.filter(e => e.dose?.dose_kind !== "sos" && e.dose?.dose_kind !== "extra" && e.dose?.tomado_em).length, sos: month.events.filter(e => e.dose?.dose_kind === "sos").length, extra: month.events.filter(e => e.dose?.dose_kind === "extra").length }), [medicamentos, tratamentos, month.events]);
  if (isLoading || dosesLoading) return <CardListSkeleton />;
  const selectFilter = (next: ViewFilter) => { trigger("vibrate"); setFilter(next); };
  return <PageTransition><main className="min-h-screen bg-void pb-28 print:bg-white print:text-black">
    <header className="sticky top-0 z-20 border-b border-surface-border/40 bg-void/90 px-5 pb-4 pt-safe backdrop-blur-xl print:static print:bg-white">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => router.replace("/")} className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border bg-surface-raised print:hidden" aria-label="Voltar"><ArrowLeft size={18}/></button>
        <div className="min-w-0 flex-1"><p className="font-mono text-[9px] uppercase tracking-[0.24em] text-ice">Prontuário clínico</p><h1 className="truncate font-display text-xl font-semibold text-ink-primary">Linha de cuidado</h1><p className="text-[10px] text-ink-muted">Registros e doses, sem substituir avaliação profissional</p></div>
        <button type="button" onClick={() => router.push("/saude/registros/novo")} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ice text-void print:hidden" aria-label="Novo registro"><Plus size={20}/></button>
      </div>
      <div className="mt-4 flex items-center gap-2 print:hidden"><button type="button" onClick={() => setMonthKey(shiftClinicalMonth(monthKey,-1))} className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-raised"><ChevronLeft size={17}/></button><button type="button" onClick={() => setMonthKey(currentClinicalMonth())} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-surface-border bg-surface text-sm font-semibold capitalize"><CalendarDays size={15} className="text-ice"/>{month.label}</button><button type="button" disabled={monthKey >= currentClinicalMonth()} onClick={() => setMonthKey(shiftClinicalMonth(monthKey,1))} className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-raised disabled:opacity-30"><ChevronRight size={17}/></button></div>
    </header>
    <section className="space-y-4 px-5 pt-4">
      <div className="rounded-[26px] border border-ice/20 bg-gradient-to-br from-ice/[0.10] to-surface p-4">
        <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-widest text-ice">Resumo do período</p><p className="mt-1 text-xl font-semibold text-ink-primary">{stats.days ? `${stats.days} dias documentados` : "Sem eventos neste mês"}</p><p className="mt-1 text-[11px] text-ink-muted">Cobertura descritiva dos dados registrados, não adesão clínica.</p></div><Stethoscope className="text-ice" size={22}/></div>
        <div className="mt-4 grid grid-cols-3 gap-2"><Metric label="Registros" value={stats.records}/><Metric label="Doses" value={stats.doses}/><Metric label="Destaques" value={stats.alerts} alert={stats.alerts>0}/></div>
        <div className="mt-3 grid grid-cols-2 gap-2 print:hidden"><button type="button" onClick={() => router.push("/saude/registros/evolucao")} className="flex items-center justify-center gap-2 rounded-xl border border-surface-border bg-surface-raised py-2.5 text-xs font-semibold"><BarChart3 size={15} className="text-violet-300"/>Ver evolução</button><button type="button" onClick={() => setReportOpen(true)} className="flex items-center justify-center gap-2 rounded-xl border border-surface-border bg-surface-raised py-2.5 text-xs font-semibold"><FileDown size={15} className="text-emerald-300"/>Resumo clínico</button></div>
      </div>
      <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar na linha clínica" className="h-11 w-full rounded-2xl border border-surface-border bg-surface pl-9 pr-10 text-sm outline-none focus:border-ice/50"/>{search&&<button type="button" onClick={()=>setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-2"><X size={14}/></button>}</div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none print:hidden">{([['todos','Tudo'],['sintoma','Sintomas'],['medicao','Medições'],['hidratacao','Água'],['dose','Doses']] as [ViewFilter,string][]).map(([key,label])=><button key={key} type="button" onClick={()=>selectFilter(key)} className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase ${filter===key?'border-ice bg-ice/15 text-ice':'border-surface-border bg-surface-raised text-ink-muted'}`}>{label}</button>)}</div>
      {visibleEvents.length===0?<EmptyState icon={Activity} title="Nenhum evento encontrado" description={month.events.length?"Ajuste a busca ou o filtro selecionado.":"Nenhum registro ou dose foi encontrado neste período."} actionLabel="Novo registro" onAction={()=>router.push('/saude/registros/novo')}/>:month.weeks.map(week=>{const events=week.events.filter(e=>visibleIds.has(e.id));if(!events.length)return null;return <details key={week.key} open className="group overflow-hidden rounded-[24px] border border-surface-border/60 bg-surface"><summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3"><div><p className="font-mono text-[9px] uppercase tracking-widest text-ink-faint">Semana</p><h2 className="text-sm font-semibold text-ink-primary">{week.label}</h2></div><span className="flex items-center gap-2 text-xs text-ink-muted">{events.length}<ChevronDown size={15} className="transition group-open:rotate-180"/></span></summary><div className="border-t border-surface-border/50">{events.map(event=><EventRow key={event.id} event={event} onOpen={()=>event.record?.id&&router.push(`/saude/registros/detalhes?id=${encodeURIComponent(event.record.id)}`)}/>)}</div></details>})}
      <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-3 text-[11px] leading-relaxed text-ink-muted"><AlertTriangle size={14} className="mr-2 inline text-amber-300"/>Destaques são leituras dos registros nas datas informadas. O Vault não diagnostica, não prescreve e não recomenda alterar dose.</div>
    </section>
    {reportOpen&&<div className="fixed inset-0 z-50 flex items-end bg-black/70 p-3 backdrop-blur-sm print:static print:block print:bg-white print:p-0" onClick={()=>setReportOpen(false)}><section className="max-h-[88vh] w-full overflow-y-auto rounded-[28px] border border-surface-border bg-surface p-5 print:max-h-none print:rounded-none print:border-0 print:bg-white" onClick={e=>e.stopPropagation()}><div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-widest text-ice print:text-black">Resumo clínico</p><h2 className="mt-1 text-xl font-semibold capitalize">{month.label}</h2></div><button type="button" onClick={()=>setReportOpen(false)} className="p-2 print:hidden"><X/></button></div><p className="mt-2 text-xs text-ink-muted print:text-gray-700">Síntese dos dados registrados para apoiar uma conversa com o profissional de saúde. Não é diagnóstico nem prescrição.</p><div className="mt-5 grid grid-cols-2 gap-2"><Metric label="Medicamentos ativos" value={report.activeMedicines}/><Metric label="Tratamentos ativos" value={report.treatments}/><Metric label="Doses programadas" value={report.scheduled}/><Metric label="SOS / extras" value={report.sos+report.extra}/><Metric label="Registros clínicos" value={stats.records}/><Metric label="Dias com dados" value={stats.days}/></div><div className="mt-5 space-y-2">{month.events.slice(0,30).map(event=><div key={`report-${event.id}`} className="flex justify-between gap-3 border-b border-surface-border py-2 text-xs print:border-gray-300"><span>{event.title}<small className="ml-2 text-ink-muted print:text-gray-600">{event.subtitle}</small></span><span className="shrink-0 font-mono">{displayDate(event.date)} {event.time}</span></div>)}</div><button type="button" onClick={()=>window.print()} className="mt-5 w-full rounded-2xl bg-ice py-3 font-semibold text-void print:hidden">Imprimir ou salvar em PDF</button></section></div>}
  </main></PageTransition>;
}

function Metric({label,value,alert=false}:{label:string;value:number;alert?:boolean}) { return <div className={`rounded-xl border p-2.5 ${alert?'border-amber-400/25 bg-amber-400/[0.07]':'border-surface-border/50 bg-surface-raised'}`}><p className={`font-mono text-lg font-bold ${alert?'text-amber-300':'text-ink-primary'}`}>{value}</p><p className="text-[8px] font-bold uppercase tracking-wide text-ink-muted">{label}</p></div>; }
function EventRow({event,onOpen}:{event:ClinicalEvent;onOpen:()=>void}) { const meta=categoryMeta[event.category];const Icon=meta.icon;const insight=event.record?analisarRegistroSaude(event.record.nome,event.record.valor_medicao,event.record.intensidade,event.record.observacoes):null;return <button type="button" onClick={onOpen} disabled={!event.record?.id} className="flex w-full items-start gap-3 border-b border-surface-border/40 px-4 py-3 text-left last:border-0 disabled:cursor-default"><div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${meta.tone}`}><Icon size={16}/></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-semibold text-ink-primary">{event.title}</p><p className="mt-0.5 truncate text-[10px] text-ink-muted">{event.subtitle||meta.label}</p></div><span className="shrink-0 font-mono text-[9px] text-ink-faint">{displayDate(event.date)} · {event.time.slice(0,5)}</span></div>{typeof event.intensity==='number'&&<div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-raised"><div className="h-full rounded-full bg-violet-400" style={{width:`${Math.min(100,event.intensity*10)}%`}}/></div>}{insight&&insight.status!=="normal"&&<p className={`mt-2 text-[9px] font-semibold ${insight.status==='critico'?'text-coral':'text-amber-300'}`}>{insight.titulo}</p>}</div></button>; }
