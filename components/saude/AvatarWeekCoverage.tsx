"use client";
import { memo, useMemo } from "react";
import { Activity, ChevronRight } from "lucide-react";
import type { HealthInsightContext } from "@/lib/health-insights";
import { buildHealthWeekCoverage } from "@/lib/health-profile/health-week-coverage";

/** Mini trilha documental do Avatar: sete dias, sem novos listeners, Dexie ou Supabase. */
export const AvatarWeekCoverage = memo(function AvatarWeekCoverage({ context, onNavigate }: {
  context: HealthInsightContext | null | undefined;
  onNavigate: (href: string) => void;
}) {
  const week = useMemo(() => buildHealthWeekCoverage(context), [context]);
  if (!week) return null;
  return <div className="mt-2 rounded-xl border border-surface-border/65 bg-surface-raised/35 p-2.5" aria-label="Cobertura de registros dos últimos sete dias">
    <div className="flex items-center gap-2"><Activity size={14} className="text-emerald-300"/><span className="flex-1 text-[11px] font-semibold text-ink-primary">Rotina documentada · 7 dias</span><span className="text-[10px] text-ink-muted">{week.recordedDays}/7 dias</span></div>
    <div className="mt-2 grid grid-cols-7 gap-1.5">
      {week.days.map(day => {
        const hasData = day.records > 0;
        const date = day.date.split("-").reverse().join("/");
        const description = hasData ? `${day.records} registro(s), ${day.symptoms} sintoma(s), ${day.moods} humor, ${day.sleep} sono, ${day.walks} caminhada` : "Sem registro informado";
        return <div key={day.date} className="min-w-0 text-center" title={`${date} · ${description}`} aria-label={`${date}: ${description}`}>
          <span className={`block h-5 rounded-md border ${day.symptoms ? "border-amber-400/35 bg-amber-400/30" : hasData ? "border-emerald-400/30 bg-emerald-400/25" : "border-surface-border/70 bg-void/30"}`} />
          <span className="mt-1 block text-[9px] tabular-nums text-ink-muted">{day.date.slice(-2)}</span>
        </div>;
      })}
    </div>
    <div className="mt-2 flex items-center justify-between gap-2">
      <p className="min-w-0 flex-1 text-[9px] leading-snug text-ink-muted">Verde: registro · âmbar: relato de sintoma · vazio: sem informação, não ausência de sintomas.</p>
      <button type="button" onClick={() => onNavigate("/saude/registros")} className="flex min-h-9 shrink-0 items-center gap-1 rounded-lg px-2 text-[10px] font-semibold text-emerald-300 focus-visible:outline focus-visible:outline-2">Histórico <ChevronRight size={12}/></button>
    </div>
  </div>;
});
