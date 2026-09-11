// app/saude/registros/evolucao/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, ArrowLeft, CalendarDays, ChevronRight, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { useRegistrosSaude } from "@/hooks/useRegistrosSaude";
import { useHapticFeedback } from "@/lib/haptics";
import { buildHealthRecordSeries, type HealthRecordPeriod } from "@/lib/health-record-series";
import { PageTransition } from "@/components/PageTransition";
import { CardListSkeleton } from "@/components/loading/CardListSkeleton";
import { EmptyState } from "@/components/EmptyState";

function formatDate(value: string): string {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}` : value;
}

function formatNumber(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value);
}

export default function EvolucaoRegistrosSaudePage() {
  const router = useRouter();
  const { trigger } = useHapticFeedback();
  const { registros, isLoading } = useRegistrosSaude();
  const [period, setPeriod] = useState<HealthRecordPeriod>(30);
  const series = useMemo(() => buildHealthRecordSeries(registros, period), [registros, period]);
  const total = series.reduce((sum, item) => sum + item.total, 0);
  const activeDays = new Set(series.flatMap((item) => item.registros.map((record) => record.data))).size;

  if (isLoading) return <CardListSkeleton />;

  return (
    <PageTransition>
      <main className="min-h-[100dvh] bg-void pb-[calc(7rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/85 px-5 pb-4 header-safe-top backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => router.replace("/saude/registros")} className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised" aria-label="Voltar">
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ice">Registros reais</p>
              <h1 className="font-display text-xl font-semibold text-ink-primary">Evolução de saúde</h1>
            </div>
            <Activity size={20} className="text-ice" />
          </div>
        </header>

        <section className="space-y-5 px-5 pt-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[22px] border border-surface-border/50 bg-surface p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Registros</p>
              <p className="mt-1 text-2xl font-semibold text-ink-primary">{total}</p>
              <p className="text-xs text-ink-muted">nos últimos {period} dias</p>
            </div>
            <div className="rounded-[22px] border border-surface-border/50 bg-surface p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Dias registrados</p>
              <p className="mt-1 text-2xl font-semibold text-ink-primary">{activeDays}</p>
              <p className="text-xs text-ink-muted">ausência não vira zero</p>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {([7, 30, 90] as HealthRecordPeriod[]).map((value) => (
              <button key={value} type="button" onClick={() => { trigger("vibrate"); setPeriod(value); }} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold ${period === value ? "border-ice bg-ice/15 text-ice" : "border-surface-border/50 bg-surface text-ink-muted"}`}>
                {value} dias
              </button>
            ))}
          </div>

          {series.length === 0 ? (
            <EmptyState icon={CalendarDays} title="Sem série neste período" description="Registre sintomas, humor ou medições para acompanhar sua evolução." />
          ) : (
            <div className="space-y-3">
              {series.map((item, index) => {
                const TrendIcon = item.tendencia === "subiu" ? TrendingUp : item.tendencia === "caiu" ? TrendingDown : Minus;
                const latest = item.registros[0];
                return (
                  <motion.button key={item.key} type="button" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.035, 0.25) }} onClick={() => latest?.id && router.push(`/saude/registros/detalhes?id=${encodeURIComponent(latest.id)}`)} className="w-full rounded-[24px] border border-surface-border/50 bg-surface p-4 text-left transition active:scale-[0.99]">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ice/10 text-ice"><Activity size={19} /></div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div><h2 className="truncate font-semibold text-ink-primary">{item.nome}</h2><p className="text-xs text-ink-muted">{item.total} registros em {item.diasComRegistro} dias</p></div>
                          <ChevronRight size={17} className="mt-1 shrink-0 text-ink-faint" />
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2">
                          <div className="rounded-xl bg-surface-raised p-2"><p className="text-[9px] uppercase text-ink-faint">Média</p><p className="text-sm font-semibold text-ink-primary">{formatNumber(item.mediaAtual)} {item.unidade || (latest?.intensidade !== undefined ? "/10" : "")}</p></div>
                          <div className="rounded-xl bg-surface-raised p-2"><p className="text-[9px] uppercase text-ink-faint">Comparação</p><p className="flex items-center gap-1 text-sm font-semibold text-ink-primary"><TrendIcon size={13} />{item.variacaoPercentual === null ? "Sem base" : `${Math.abs(item.variacaoPercentual).toFixed(0)}%`}</p></div>
                          <div className="rounded-xl bg-surface-raised p-2"><p className="text-[9px] uppercase text-ink-faint">Período</p><p className="text-sm font-semibold text-ink-primary">{formatDate(item.primeiraData)}–{formatDate(item.ultimaData)}</p></div>
                        </div>
                        {item.mediaAnterior === null && <p className="mt-2 text-[11px] text-ink-faint">Ainda não há amostra anterior comparável.</p>}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </PageTransition>
  );
}
