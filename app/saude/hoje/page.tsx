"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Circle, Pill, Clock } from "lucide-react";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useDoseLogs } from "@/hooks/useDoseLogs";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

interface DoseItem {
  medicamentoId: string;
  medicamentoNome: string;
  dosagem: string;
  horario: string;
  tomada: boolean;
}

export default function HojePage() {
  const router = useRouter();
  const { trigger } = useHapticFeedback();
  const hoje = todayISO();

  const { medicamentos } = useMedicamentos();
  const { doseLogs, marcarDose } = useDoseLogs(hoje);

  const doses = useMemo<DoseItem[]>(() => {
    const list: DoseItem[] = [];
    for (const med of medicamentos || []) {
      if (!med.id || !med.estoque_horarios || med.estoque_horarios.length === 0) continue;
      for (const horario of med.estoque_horarios) {
        if (!horario) continue;
        const log = (doseLogs || []).find(
          (l) => l.medicamento_id === med.id && l.horario === horario
        );
        list.push({
          medicamentoId: med.id,
          medicamentoNome: med.nome,
          dosagem: med.dosagem,
          horario,
          tomada: !!log?.tomado_em,
        });
      }
    }
    return list.sort((a, b) => a.horario.localeCompare(b.horario));
  }, [medicamentos, doseLogs]);

  const totalTomadas = doses.filter((d) => d.tomada).length;
  const isLoading = medicamentos === undefined || doseLogs === undefined;

  const handleToggle = async (item: DoseItem) => {
    trigger(item.tomada ? "vibrate" : "success");
    await marcarDose(item.medicamentoId, hoje, item.horario, !item.tomada);
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 header-safe-top backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                trigger("vibrate");
                router.back();
              }}
              aria-label="Voltar"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-ice" />
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">
                  Vault
                </p>
              </div>
              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">
                Hoje
              </h1>
              <p className="mt-1 text-sm text-ink-muted">
                {doses.length > 0
                  ? `${totalTomadas} de ${doses.length} doses tomadas`
                  : "Nenhuma dose programada pra hoje"}
              </p>
            </div>
          </div>
        </header>

        <section className="space-y-3 px-5 pt-5">
          {doses.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24 }}
              className="flex flex-col items-center justify-center rounded-[28px] border border-surface-border/50 bg-surface px-6 py-14 text-center shadow-sm"
            >
              <div className="glow-ice mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-ice/15 bg-surface-raised">
                <Pill size={22} className="text-ice/60" />
              </div>
              <h3 className="font-display text-base font-semibold text-ink-primary">
                Nada por aqui
              </h3>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-ink-muted">
                Medicamentos com horário de dose configurado aparecem aqui
                todo dia.
              </p>
            </motion.div>
          ) : (
            doses.map((item, index) => (
              <motion.button
                key={`${item.medicamentoId}-${item.horario}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.3) }}
                onClick={() => handleToggle(item)}
                className={`flex w-full items-center gap-3 rounded-[22px] border p-4 text-left shadow-sm transition-all active:scale-[0.985] ${
                  item.tomada
                    ? "border-emerald-400/25 bg-emerald-400/5"
                    : "border-surface-border/50 bg-surface hover:bg-surface-raised/80"
                }`}
              >
                <div className="shrink-0">
                  {item.tomada ? (
                    <CheckCircle2 size={24} className="text-emerald-400" />
                  ) : (
                    <Circle size={24} className="text-ink-faint" />
                  )}
                </div>

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-ice/10 text-ice">
                  <Pill size={16} />
                </div>

                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-sm font-semibold ${
                      item.tomada ? "text-ink-muted line-through" : "text-ink-primary"
                    }`}
                  >
                    {item.medicamentoNome}
                  </p>
                  <p className="truncate text-xs text-ink-muted">{item.dosagem}</p>
                </div>

                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    item.tomada
                      ? "bg-emerald-400/12 text-emerald-400"
                      : "bg-ice/10 text-ice"
                  }`}
                >
                  {item.horario}
                </span>
              </motion.button>
            ))
          )}
        </section>
      </main>
    </PageTransition>
  );
}
