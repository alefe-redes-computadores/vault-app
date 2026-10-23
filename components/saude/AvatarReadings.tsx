"use client";

import { memo, useMemo } from "react";
import { ChevronRight } from "lucide-react";
import type { RegistroSaude } from "@/lib/types";
import { METRICS, type HealthDevice, type HealthMetric } from "@/lib/health-profile/types";
import { readingRecency } from "@/lib/health-profile/history";
import { latestAvatarReadings } from "@/lib/health-profile/avatar-readings";
import { summarizeAvatarReadingFreshness } from "@/lib/health-profile/avatar-freshness";
import { HealthMetricIcon, METRIC_TONES } from "./HealthDeviceIcon";

type Props = { records: RegistroSaude[]; devices: HealthDevice[]; personId: string; userId: string; today: string; onView: (metric: HealthMetric) => void; onAdd: (metric: HealthMetric) => void };

export const AvatarReadings = memo(function AvatarReadings({ records, devices, personId, userId, today, onView, onAdd }: Props) {
  const rows = useMemo(() => latestAvatarReadings(records, devices, personId, userId, today), [records, devices, personId, userId, today]);
  const freshness = useMemo(() => summarizeAvatarReadingFreshness(Array.from(rows.values(), item => item.record.data), today), [rows, today]);
  return <section className="py-2" aria-label="Sinais recentes representados no avatar">
    <div className="mb-2 flex items-end justify-between gap-3">
      <div className="min-w-0"><p className="text-xs font-semibold text-ink-primary">Sinais recentes</p><p className="mt-0.5 text-[10px] text-ink-muted">Última medição válida por categoria</p></div>
      <span className="shrink-0 rounded-full bg-surface-raised px-2 py-1 text-[10px] text-ink-muted">{rows.size}/6 registradas</span>
    </div>
    <p className="mb-2 text-[10px] leading-snug text-ink-muted" aria-label="Atualidade das medições do avatar">{freshness.recent7} nos últimos 7 dias · {freshness.recent30} entre 7 e 29 dias · {freshness.historical} históricas{freshness.futureOrInvalid ? ` · ${freshness.futureOrInvalid} fora do período` : ""}. Recência não significa normalidade clínica.</p>
    <div className="grid grid-cols-2 gap-2">{(Object.keys(METRICS) as HealthMetric[]).map(type => { const item = rows.get(type); const action = item ? onView : onAdd; return <button type="button" key={type} onClick={() => action(type)} aria-label={`${item ? "Ver histórico de" : "Registrar"} ${METRICS[type].label}`} className="group min-h-[76px] min-w-0 rounded-xl border border-surface-border/80 bg-surface-raised/65 p-2.5 text-left transition-colors hover:border-surface-border focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300">
      <span className={`flex min-w-0 items-center gap-1.5 text-[10px] ${METRIC_TONES[type]}`}><HealthMetricIcon type={type} size={14}/><span className="truncate">{METRICS[type].label}</span><ChevronRight size={12} className="ml-auto shrink-0 opacity-50 transition-transform group-hover:translate-x-0.5"/></span>
      <strong className="mt-1.5 block truncate text-sm text-ink-primary">{item?.value || "Registrar"}</strong>
      <span className="mt-1 block truncate text-[9px] text-ink-muted">{item ? `${readingRecency(item.record.data, today)} · ${item.device?.name || item.source}` : "Sem medição cadastrada"}</span>
    </button>; })}</div>
    <p className="mt-2 text-[9px] leading-relaxed text-ink-muted">Registros informados, não leituras em tempo real. Ausência de dado não significa valor zero.</p>
  </section>;
});
