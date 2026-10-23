"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, AlertTriangle, BarChart3, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ClipboardList, Droplets, FileDown, HeartPulse, Pill, Plus } from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { CardListSkeleton } from "@/components/loading/CardListSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { ListFilters, ListPageHeader, ListSearch } from "@/components/list";
import { ClinicalListSummary } from "@/components/saude/ClinicalListSummary";
import { useHapticFeedback } from "@/lib/haptics";
import { useRegistrosSaude } from "@/hooks/useRegistrosSaude";
import { useAllDoseLogs } from "@/hooks/useDoseLogs";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { AvatarMedicamento } from "@/components/ui/AvatarMedicamento";
import { analisarRegistroSaude } from "@/lib/health-insights";
import { buildClinicalDays, buildClinicalEvents, buildClinicalMonth, currentClinicalMonth, localDateKey, shiftClinicalMonth, type ClinicalEvent } from "@/lib/clinical-record-timeline";
import { useReturnContext } from "@/hooks/useReturnContext";
import { createLocalSearchIndex, filterLocalSearchIndex } from "@/lib/local-search";

type ViewFilter = "todos" | "sintoma" | "medicao" | "hidratacao" | "dose";
// O relatório dedicado mantém window.print() e declara: Não é diagnóstico nem prescrição.
const displayDate = (key: string) => { const [y,m,d]=key.split("-"); return `${d}/${m}/${y}`; };
const isSosDose = (event: ClinicalEvent) => event.dose?.dose_kind === "sos";
const isExtraDose = (event: ClinicalEvent) => event.dose?.dose_kind === "extra";
const categoryMeta: Record<ClinicalEvent["category"], { label: string; tone: string; icon: typeof Activity }> = {
  sintoma: { label: "Sintoma", tone: "border-violet-400/25 bg-violet-400/10 text-violet-300", icon: HeartPulse },
  medicao: { label: "Medição", tone: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200", icon: Activity },
  humor: { label: "Humor", tone: "border-fuchsia-400/25 bg-fuchsia-400/10 text-fuchsia-300", icon: HeartPulse },
  hidratacao: { label: "Hidratação", tone: "border-cyan-400/25 bg-cyan-400/10 text-cyan-300", icon: Droplets },
  dose: { label: "Dose", tone: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300", icon: Pill },
  outro: { label: "Registro", tone: "border-surface-border bg-surface-raised text-ink-muted", icon: ClipboardList },
};

export default function RegistrosSaudePage() {
  const router = useRouter();
  const {backTarget,preserveReturn}=useReturnContext("/saude/rede");
  const { trigger } = useHapticFeedback();
  const { registros, isLoading } = useRegistrosSaude();
  const { allDoseLogs, isLoading: dosesLoading } = useAllDoseLogs();
  const { medicamentos = [] } = useMedicamentos();
  const [monthKey, setMonthKey] = useState(currentClinicalMonth);
  const [filter, setFilter] = useState<ViewFilter>("todos");
  const [search, setSearch] = useState("");
  const allEvents = useMemo(() => buildClinicalEvents(registros, allDoseLogs, medicamentos), [registros, allDoseLogs, medicamentos]);
  const month = useMemo(() => buildClinicalMonth(allEvents, monthKey), [allEvents, monthKey]);
  const eventSearchIndex = useMemo(() => createLocalSearchIndex(month.events, event => [event.title,event.subtitle,event.category,event.date,event.time,event.medication?.nome,event.medication?.dosagem]), [month.events]);
  const visibleEvents = useMemo(() => filterLocalSearchIndex(eventSearchIndex,search).filter(event => filter === "todos" || event.category === filter), [eventSearchIndex, filter, search]);
  const visibleIds = useMemo(() => new Set(visibleEvents.map(item => item.id)), [visibleEvents]);
  const stats = useMemo(() => { let records=0,doses=0,alerts=0;const days=new Set<string>();for(const event of month.events){days.add(event.date);if(event.kind==="record")records+=1;if(event.category==="dose")doses+=1;if(event.record){const insight=analisarRegistroSaude(event.record.nome,event.record.valor_medicao,event.record.intensidade,event.record.observacoes);if(insight&&insight.status!=="normal")alerts+=1;}}return {records,doses,alerts,days:days.size}; }, [month.events]);
  if (isLoading || dosesLoading) return <CardListSkeleton />;
  const selectFilter = (next: ViewFilter) => { trigger("vibrate"); setFilter(next); };
  return <PageTransition><main className="min-h-screen bg-void pb-28 print:bg-white print:text-black">
    <ListPageHeader title="Linha de cuidado" badgeLabel="PRONTUÁRIO CLÍNICO" badgeColor="text-violet-300" subtitle="Registros e doses, sem substituir avaliação profissional" backUrl={backTarget} className="print:static print:bg-white" rightAction={<button type="button" onClick={() => router.push(preserveReturn("/saude/registros/novo"))} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ice text-void print:hidden" aria-label="Novo registro"><Plus size={20}/></button>}>
      <div className="flex w-full items-center gap-2 print:hidden"><button type="button" aria-label="Mês anterior" onClick={() => setMonthKey(shiftClinicalMonth(monthKey,-1))} className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-raised"><ChevronLeft size={17}/></button><button type="button" onClick={() => setMonthKey(currentClinicalMonth())} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-surface-border bg-surface text-sm font-semibold capitalize"><CalendarDays size={15} className="text-ink-muted"/>{month.label}</button><button type="button" aria-label="Próximo mês" disabled={monthKey >= currentClinicalMonth()} onClick={() => setMonthKey(shiftClinicalMonth(monthKey,1))} className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-raised disabled:opacity-30"><ChevronRight size={17}/></button></div>
    </ListPageHeader>
    <section className="space-y-4 px-5 pt-4">
      {/* V224: one-tap diary shortcuts reuse the existing offline-first record repository. */}
      <div className="flex flex-wrap items-center gap-2 print:hidden" aria-label="Registrar rapidamente">
        {([[
          "Humor", "humor", "border-fuchsia-400/25 bg-fuchsia-400/[.06] text-fuchsia-200"
        ],[
          "Sintoma", "sintoma", "border-violet-400/25 bg-violet-400/[.06] text-violet-200"
        ],[
          "Ansiedade", "ansiedade", "border-amber-400/25 bg-amber-400/[.06] text-amber-200"
        ],[
          "Fadiga", "apatia", "border-surface-border bg-surface-raised text-ink-primary"
        ]] as const).map(([label,preset,tone]) =>
          <button key={preset} type="button" onClick={() => router.push(preserveReturn(`/saude/registros/novo?preset=${preset}`))}
            className={`min-h-11 rounded-xl border px-3 text-[11px] font-semibold transition-all active:scale-[.98] ${tone}`}>
            + {label}
          </button>
        )}
      </div>
      <div><ClinicalListSummary icon={ClipboardList} eyebrow="Resumo do período" title={stats.days ? `${stats.days} dias documentados` : "Sem eventos neste mês"} detail="Cobertura descritiva dos dados registrados; não mede adesão clínica." metrics={[{label:"Registros",value:stats.records},{label:"Doses",value:stats.doses,tone:"positive"},{label:"Destaques",value:stats.alerts,tone:stats.alerts?"attention":"neutral"}]}/><div className="mt-2 grid grid-cols-2 gap-2 print:hidden"><button type="button" onClick={() => router.push(preserveReturn("/saude/registros/evolucao"))} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-surface-border bg-surface-raised text-xs font-semibold"><BarChart3 size={15} className="text-violet-300"/>Ver evolução</button><button type="button" onClick={() => router.push(preserveReturn("/saude/registros/relatorio"))} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-surface-border bg-surface-raised text-xs font-semibold"><FileDown size={15} className="text-emerald-300"/>Resumo clínico</button></div></div>
      <div className="flex min-w-0 items-center gap-2 print:hidden">
        <ListSearch value={search} onChange={setSearch} placeholder="Buscar na linha clínica" />
        <ListFilters activeCount={Number(filter !== "todos")+Number(Boolean(search.trim()))} onClear={() => {setFilter("todos");setSearch("");}} title="Filtrar linha de cuidado">
          {([['todos','Tudo'],['sintoma','Sintomas'],['medicao','Medições'],['hidratacao','Água'],['dose','Doses']] as [ViewFilter,string][]).map(([key,label])=><button key={key} type="button" onClick={()=>selectFilter(key)} className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase ${filter===key?'border-ice/60 bg-ice/15 text-ice':'border-surface-border bg-surface-raised text-ink-muted'}`}>{label}</button>)}
        </ListFilters>
      </div>
      {visibleEvents.length===0?<EmptyState icon={Activity} title="Nenhum evento encontrado" description={month.events.length?"Ajuste a busca ou o filtro selecionado.":"Nenhum registro ou dose foi encontrado neste período."} actionLabel="Novo registro" onAction={()=>router.push(preserveReturn('/saude/registros/novo'))}/>:month.weeks.map(week=>{const events=week.events.filter(e=>visibleIds.has(e.id));if(!events.length)return null;const forceOpen=Boolean(search.trim())||filter!=="todos";const isCurrentWeek=week.events.some(e=>e.date===localDateKey());return <details key={week.key} open={forceOpen||isCurrentWeek} className="group overflow-hidden rounded-[24px] border border-surface-border/60 bg-surface [content-visibility:auto] [contain-intrinsic-size:220px]"><summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3"><div><p className="font-mono text-[9px] uppercase tracking-widest text-ink-faint">Semana</p><h2 className="text-sm font-semibold text-ink-primary">{week.label}</h2></div><span className="flex items-center gap-2 text-xs text-ink-muted">{events.length} eventos<ChevronDown size={15} className="transition group-open:rotate-180"/></span></summary><div className="space-y-2 border-t border-surface-border/50 bg-void/20 p-2">{buildClinicalDays(events).map(day=><DayGroup key={day.key} date={day.key} label={day.label} events={day.events} forceOpen={forceOpen} onOpenRecord={id=>router.push(preserveReturn(`/saude/registros/detalhes?id=${encodeURIComponent(id)}`))}/>)}</div></details>})}
      <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-3 text-[11px] leading-relaxed text-ink-muted"><AlertTriangle size={14} className="mr-2 inline text-amber-300"/>Destaques são leituras dos registros nas datas informadas. O Vault não diagnostica, não prescreve e não recomenda alterar dose.</div>
    </section>

  </main></PageTransition>;
}

function DayGroup({date,label,events,forceOpen,onOpenRecord}:{date:string;label:string;events:ClinicalEvent[];forceOpen:boolean;onOpenRecord:(id:string)=>void}) { const records=events.filter(e=>e.kind==="record");const doses=events.filter(e=>e.kind==="dose");const groups=new Map<string,ClinicalEvent[]>();for(const dose of doses){const origin=dose.dose?.dose_kind||"scheduled";const key=`${dose.dose?.medicamento_id||dose.title}:${origin}`;groups.set(key,[...(groups.get(key)||[]),dose]);}const summary=[records.length&&`${records.length} registro${records.length===1?'':'s'}`,doses.length&&`${doses.length} dose${doses.length===1?'':'s'}`].filter(Boolean).join(" · ");return <details open={forceOpen||date===localDateKey()} className="group/day overflow-hidden rounded-2xl border border-surface-border/50 bg-surface-raised/60"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5"><div><p className="text-xs font-semibold capitalize text-ink-primary">{label}</p><p className="mt-0.5 text-[9px] text-ink-muted">{summary}</p></div><ChevronDown size={14} className="text-ink-muted transition group-open/day:rotate-180"/></summary><div className="border-t border-surface-border/40">{records.map(event=><EventRow key={event.id} event={event} onOpen={()=>event.record?.id&&onOpenRecord(event.record.id)}/>)}{[...groups.values()].map(items=><DoseGroup key={items[0].id} events={items}/>)}</div></details>; }
function DoseGroup({events}:{events:ClinicalEvent[]}) { const first=events[0];const medication=first.medication;const times=events.map(e=>e.time.slice(0,5));const origins=new Set(events.map(e=>e.dose?.dose_kind));const origin=events.some(isSosDose)?"SOS":events.some(isExtraDose)?"Extra":first.dose?.ignorado_em?"Ignorada":"Programada";return <details className="group/dose border-b border-surface-border/40 last:border-0"><summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2.5">{medication?<AvatarMedicamento nome={medication.nome} formato={medication.formato||medication.forma_farmaceutica} cores={medication.cores?.length?medication.cores:medication.cor_principal?[medication.cor_principal,medication.cor_secundaria||medication.cor_principal]:[]} tamanho={10}/>:<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-surface-border bg-surface"><Pill size={17} className="text-ink-muted"/></div>}<div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink-primary">{first.title}</p><p className="text-[10px] text-ink-muted">{events.length} {events.length===1?'dose':'doses'} · {origin}</p></div><span className="font-mono text-[9px] text-ink-faint">{events.length===1?times[0]:`${times.length} horários`}</span><ChevronDown size={13} className="text-ink-faint transition group-open/dose:rotate-180"/></summary><div className="bg-void/20 px-3 py-1">{events.map(event=><div key={event.id} className="flex items-center justify-between border-t border-surface-border/30 py-2 pl-[52px] text-[10px]"><span className="text-ink-muted">{event.subtitle}</span><span className="font-mono text-ink-faint">{event.time.slice(0,5)}</span></div>)}</div></details>; }
function EventRow({event,onOpen}:{event:ClinicalEvent;onOpen:()=>void}) { const meta=categoryMeta[event.category];const Icon=meta.icon;const insight=event.record?analisarRegistroSaude(event.record.nome,event.record.valor_medicao,event.record.intensidade,event.record.observacoes):null;return <button type="button" onClick={onOpen} disabled={!event.record?.id} className="flex w-full items-start gap-3 border-b border-surface-border/40 px-4 py-3 text-left last:border-0 disabled:cursor-default"><div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${meta.tone}`}><Icon size={16}/></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-semibold text-ink-primary">{event.title}</p><p className="mt-0.5 truncate text-[10px] text-ink-muted">{event.subtitle||meta.label}</p></div><span className="shrink-0 font-mono text-[9px] text-ink-muted">{displayDate(event.date)} · {event.time.slice(0,5)}</span></div>{typeof event.intensity==='number'&&<div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-raised"><div className="h-full rounded-full bg-violet-400" style={{width:`${Math.min(100,event.intensity*10)}%`}}/></div>}{insight&&insight.status!=="normal"&&<p className={`mt-2 text-[9px] font-semibold ${insight.status==='critico'?'text-coral':'text-amber-300'}`}>{insight.titulo}</p>}</div></button>; }
