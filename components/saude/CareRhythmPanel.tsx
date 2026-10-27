"use client";
import { Activity, Footprints, Moon, HeartPulse, Brain, Info } from "lucide-react";
import type { CareRhythmSummary } from "@/lib/health-intelligence/care-rhythm";

const dayLabel = (date: string) => {
  const [y,m,d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { weekday:"short",timeZone:"UTC" }).format(new Date(Date.UTC(y,m-1,d))).replace(".","");
};
const duration = (minutes: number | null) => minutes === null ? "—" : minutes >= 60 ? `${Math.floor(minutes/60)}h${String(minutes%60).padStart(2,"0")}` : `${minutes}min`;
const card = "min-w-0 rounded-xl border border-surface-border/70 bg-surface-raised/75 p-2.5 print:border-gray-300 print:bg-white";
export function CareRhythmPanel({summary}:{summary: CareRhythmSummary}) {
  if (summary.dataQuality.ownershipConflict) return <section aria-label="Análise de rotina indisponível" className="rounded-2xl border border-rose-400/20 bg-surface p-3 text-xs text-rose-300 print:text-black">Os registros do contexto pertencem a mais de uma conta. A comparação foi suspensa para evitar mistura de dados.</section>;
  return <section aria-label="Rotina e sinais registrados" className="rounded-[22px] border border-surface-border/80 bg-surface p-3.5 print:border-gray-300 print:bg-white">
    <div className="flex items-start gap-2.5"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-400/10 text-violet-300 print:text-black"><Activity size={17}/></span><div className="min-w-0 flex-1"><h2 className="text-sm font-bold text-ink-primary print:text-black">Rotina registrada · {summary.periodDays} dias</h2><p className="mt-0.5 text-[10px] leading-relaxed text-ink-muted print:text-gray-600">Sono, atividade, humor e doses aparecem juntos, sem supor relação de causa e efeito.</p></div></div>
    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
      <div className={card}><div className="flex items-center gap-1.5 text-[10px] text-violet-300 print:text-black"><Moon size={13}/>Sono registrado</div><p className="mt-1 text-lg font-semibold text-ink-primary print:text-black">{duration(summary.sleep.averageMinutes)}</p><p className="text-[9px] text-ink-muted print:text-gray-600">Média em {summary.sleep.days} dia(s)</p></div>
      <div className={card}><div className="flex items-center gap-1.5 text-[10px] text-amber-300 print:text-black"><Footprints size={13}/>Caminhada</div><p className="mt-1 text-lg font-semibold text-ink-primary print:text-black">{duration(summary.walk.recordedMinutes)}</p><p className="text-[9px] text-ink-muted print:text-gray-600">{summary.walk.days} dia(s) registrados</p></div>
      <div className={card}><div className="flex items-center gap-1.5 text-[10px] text-fuchsia-300 print:text-black"><Brain size={13}/>Humor declarado</div><p className="mt-1 text-lg font-semibold text-ink-primary print:text-black">{summary.mood.declaredDays}</p><p className="text-[9px] text-ink-muted print:text-gray-600">dia(s), sem inferir ausentes</p></div>
      <div className={card}><div className="flex items-center gap-1.5 text-[10px] text-rose-300 print:text-black"><HeartPulse size={13}/>Sintomas relatados</div><p className="mt-1 text-lg font-semibold text-ink-primary print:text-black">{summary.symptoms.records}</p><p className="text-[9px] text-ink-muted print:text-gray-600">em {summary.symptoms.documentedDays} dia(s)</p></div>
    </div>
    <p className="mb-2 mt-4 text-[10px] font-semibold text-ink-primary print:text-black">Últimos 7 dias · apenas registros reais</p>
    <div role="list" aria-label="Resumo diário de sono, caminhada, humor e sintomas" className="grid grid-cols-7 gap-1">
      {summary.recentDays.map(day => <div role="listitem" key={day.date} aria-label={`${day.date}: sono ${day.sleepMinutes === null?'não registrado':duration(day.sleepMinutes)}, caminhada ${day.walkMinutes === null?'não registrada':duration(day.walkMinutes)}, sintomas ${day.symptomRecords?`${day.symptomRecords} relato(s)`:"sem relato"}, humor ${day.mood||'não declarado'}`} className="min-w-0 rounded-lg border border-surface-border/60 bg-surface-raised/55 px-0.5 py-2 text-center print:border-gray-300 print:bg-white">
        <span className="block text-[9px] font-semibold text-ink-muted print:text-gray-600">{dayLabel(day.date)}</span>
        <span className={`mx-auto mt-1 block size-1.5 rounded-full ${day.sleepMinutes !== null?'bg-violet-300':'bg-surface-border'}`}/>
        <span className="mt-1 block truncate text-[9px] text-ink-primary print:text-black">{duration(day.sleepMinutes)}</span>
        <span className="mt-1 block truncate text-[9px] text-ink-muted print:text-gray-600">{day.walkMinutes === null?'—':`${day.walkMinutes}m`}</span>
        <span className="mt-1 block truncate text-[9px] text-ink-muted print:text-gray-600">{day.symptomRecords ? `${day.symptomRecords} sint.` : day.mood ? 'humor' : '—'}</span>
      </div>)}
    </div>
    <p className="mt-2 flex items-start gap-1 text-[9px] leading-relaxed text-ink-muted print:text-gray-600"><Info size={12} className="mt-0.5 shrink-0"/>Ponto colorido: houve duração de sono válida. “—” significa sem registro; não significa zero. A timeline não compara dosagens nem comprova adesão.</p>
    {(summary.overlap.sleepAndSymptoms>0||summary.overlap.walkAndMood>0||summary.overlap.sleepAndSosExtra>0) && <div className="mt-2 rounded-xl border border-violet-400/15 bg-violet-400/[.04] px-3 py-2 text-[10px] leading-relaxed text-ink-muted print:border-gray-300 print:bg-white"><strong className="text-ink-primary print:text-black">Registros no mesmo dia:</strong> sono + sintomas em {summary.overlap.sleepAndSymptoms} dia(s) · caminhada + humor em {summary.overlap.walkAndMood} · sono + SOS/extra em {summary.overlap.sleepAndSosExtra}. Proximidade no mesmo dia não demonstra causalidade.</div>}
    <div className="mt-3 space-y-2" aria-label="Comparações observacionais entre hábitos e humor">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-200 print:text-black">Comparação com amostra dos dois grupos</p>
      {summary.factorComparisons.length ? summary.factorComparisons.map(factor => (
        <div key={factor.id} className="rounded-xl border border-violet-400/15 bg-violet-400/[.045] p-3 print:border-gray-300 print:bg-white">
          <div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold text-ink-primary print:text-black">{factor.title}</p><span className="text-[9px] text-ink-muted print:text-gray-600">Confiança descritiva {factor.confidence}</span></div>
          <p className="mt-1 text-[10px] text-ink-muted print:text-gray-600">Somente dias em que ambas as informações foram registradas.</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className={card}><p className="text-[10px] text-ink-muted print:text-gray-600">Abaixo de {duration(factor.thresholdMinutes)} · {factor.below.days} dias</p><p className="mt-1 text-base font-semibold text-ink-primary print:text-black">{factor.below.averageScore.toLocaleString('pt-BR')}/5</p><p className="text-[9px] text-ink-muted">Humor médio declarado</p></div>
            <div className={card}><p className="text-[10px] text-ink-muted print:text-gray-600">A partir de {duration(factor.thresholdMinutes)} · {factor.atLeast.days} dias</p><p className="mt-1 text-base font-semibold text-ink-primary print:text-black">{factor.atLeast.averageScore.toLocaleString('pt-BR')}/5</p><p className="text-[9px] text-ink-muted">Humor médio declarado</p></div>
          </div>
          <p className="mt-2 text-[9px] leading-relaxed text-ink-muted print:text-gray-600">{factor.limitation}</p>
        </div>
      )) : <p className="rounded-xl border border-surface-border/70 bg-surface-raised/50 p-2.5 text-[10px] leading-relaxed text-ink-muted print:text-gray-600">Ainda não há duas amostras comparáveis. São necessários ao menos três dias em cada faixa, com duração e humor explicitamente registrados. Sem registro não significa ausência da atividade.</p>}
    </div>
    {summary.dataQuality.localUnsynced>0 && <p className="mt-2 rounded-xl border border-amber-400/15 bg-amber-400/[.04] p-2.5 text-[10px] leading-relaxed text-ink-muted print:text-gray-600">{summary.dataQuality.localUnsynced} evento(s) deste período ainda marcados localmente como não sincronizados. O relatório usa os dados deste aparelho; consulte a sincronização antes de trocar de dispositivo.</p>}
    {summary.dataQuality.doseConflicts>0 && <p className="mt-2 rounded-xl border border-amber-400/20 bg-amber-400/[.05] p-2.5 text-[10px] leading-relaxed text-amber-200 print:text-black">{summary.dataQuality.doseConflicts} horário(s) possuem registros contraditórios de tomada e não tomada. Eles foram excluídos das contagens clínicas até revisão.</p>}
    {summary.dataQuality.ownershipConflict && <p className="mt-2 rounded-xl border border-rose-400/20 p-2.5 text-[10px] text-rose-300 print:text-black">Análise suspensa: registros de mais de uma conta no contexto. Nenhum dado foi misturado.</p>}
  </section>;
}
