// app/saude/tratamentos/page.tsx
"use client";

import { useMemo, Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Activity,
  Pill,
  Filter,
  X,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { CardListSkeleton } from "@/components/loading/CardListSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { useTratamentos } from "@/hooks/useTratamentos";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useRenovacoes } from "@/hooks/useRenovacoes";
import type { Tratamento, Medicamento, Renovacao } from "@/lib/types";
import { getClinicalTheme, formatCurrency } from "@/lib/health-utils";
import {
  ListPageHeader,
  ListFilters,
  ListCard,
} from "@/components/list";

type TratamentoEnriquecido = Tratamento & {
  medicamentosCount: number;
  totalGasto: number;
  alertaSemMedicamento: boolean;
};

/* ============================================================
   COMPONENTE
   ============================================================ */

function TratamentoListContent() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { activePersonId } = useActivePersonId();
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "ativo" | "concluido" | "suspenso">("todos");

  const { tratamentos = [] } = useTratamentos();
  const { medicamentos = [] } = useMedicamentos();
  const { renovacoes = [] } = useRenovacoes();

  const listaEnriquecida = useMemo<TratamentoEnriquecido[]>(() => {
    const filtrados = (tratamentos || []).filter((t) => {
      return !activePersonId || !t.person_id || t.person_id === activePersonId;
    });

    return filtrados.map((t) => {
      const meds = (medicamentos || []).filter((m: Medicamento) => {
        if (!t.id) return false;
        return m.tratamento_ids && m.tratamento_ids.includes(t.id);
      });

      const medIds = new Set(meds.map((m) => m.id).filter(Boolean));
      let totalGasto = 0;
      (renovacoes || []).forEach((r: Renovacao) => {
        if (medIds.has(r.medicamento_id) && typeof r.preco === "number" && r.preco > 0) {
          totalGasto += r.preco;
        }
      });

      const alertaSemMedicamento = t.status === "ativo" && meds.length === 0;

      return {
        ...t,
        medicamentosCount: meds.length,
        totalGasto,
        alertaSemMedicamento,
      };
    });
  }, [tratamentos, medicamentos, renovacoes, activePersonId]);

  const filteredList = useMemo(() => {
    let result = listaEnriquecida;
    if (filtroStatus !== "todos") {
      result = result.filter((t) => t.status === filtroStatus);
    }
    return result.sort((a, b) => a.nome.localeCompare(b.nome));
  }, [listaEnriquecida, filtroStatus]);

  const handleClearFilters = () => {
    trigger("vibrate");
    setFiltroStatus("todos");
  };

  if (!tratamentos && !medicamentos) {
    return <CardListSkeleton />;
  }

  return (
    <PageTransition>
      <main className="relative min-h-screen bg-void pb-28">
        <ListPageHeader
          title="Seus Tratamentos"
          subtitle={`${filteredList.length} em acompanhamento`}
        >
          <ListFilters onClear={handleClearFilters}>
            <button
              type="button"
              onClick={() => {
                trigger("vibrate");
                setFiltroStatus(filtroStatus === "ativo" ? "todos" : "ativo");
              }}
              className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all shrink-0 ${
                filtroStatus === "ativo"
                  ? "border-emerald-400 bg-emerald-400/20 text-emerald-300"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Em andamento
            </button>

            <button
              type="button"
              onClick={() => {
                trigger("vibrate");
                setFiltroStatus(filtroStatus === "concluido" ? "todos" : "concluido");
              }}
              className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all shrink-0 ${
                filtroStatus === "concluido"
                  ? "border-ice bg-ice/20 text-ice"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Concluído
            </button>

            <button
              type="button"
              onClick={() => {
                trigger("vibrate");
                setFiltroStatus(filtroStatus === "suspenso" ? "todos" : "suspenso");
              }}
              className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all shrink-0 ${
                filtroStatus === "suspenso"
                  ? "border-coral bg-coral/20 text-coral"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Suspenso
            </button>
          </ListFilters>
        </ListPageHeader>

        <section className="space-y-3.5 px-5 pt-4">
          {filteredList.length === 0 ? (
            <EmptyState
              icon={Activity}
              title={
                filtroStatus !== "todos"
                  ? "Nenhum tratamento com esse status"
                  : "Nenhum tratamento cadastrado"
              }
              description={
                filtroStatus !== "todos"
                  ? "Tente ajustar os filtros."
                  : "Cadastre tratamentos para acompanhar medicamentos, gastos e receitas."
              }
            />
          ) : (
            filteredList.map((t, index) => {
              const theme = getClinicalTheme(t.nome);
              const IconComp = theme.icon;

              return (
                <ListCard
                  key={t.id}
                  id={t.id!}
                  color={theme.hex}
                  onClick={() => {
                    trigger("vibrate");
                    router.push(`/saude/tratamentos/detalhes?id=${t.id}`);
                  }}
                  delay={index * 0.025}
                  icon={<IconComp size={22} />}
                >
                  <div className="flex min-w-0 items-baseline gap-2">
                    <h3 className="min-w-0 flex-1 truncate font-display text-base font-bold text-ink-primary">
                      {t.nome}
                    </h3>
                    <span
                      className={`shrink-0 whitespace-nowrap text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                        t.status === "ativo"
                          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
                          : t.status === "concluido"
                          ? "border-ice/30 bg-ice/10 text-ice"
                          : "border-coral/30 bg-coral/10 text-coral"
                      }`}
                    >
                      {t.status === "ativo" ? "Ativo" : t.status === "concluido" ? "Concluído" : "Suspenso"}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1 text-[10px] text-ink-muted bg-surface-raised px-2 py-0.5 rounded-md border border-surface-border/40">
                      <Pill size={10} className="text-ice" /> {t.medicamentosCount} med(s)
                    </span>
                    {t.totalGasto > 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-ink-muted bg-surface-raised px-2 py-0.5 rounded-md border border-surface-border/40">
                        <DollarSign size={10} className="text-emerald-400" /> {formatCurrency(t.totalGasto)}
                      </span>
                    )}
                  </div>

                  {t.alertaSemMedicamento && (
                    <p className="flex items-center gap-1 text-[10px] font-semibold text-amber-400 mt-2 bg-amber-400/10 w-fit px-2 py-0.5 rounded-md border border-amber-400/20">
                      <AlertTriangle size={10} /> Nenhum medicamento vinculado
                    </p>
                  )}
                </ListCard>
              );
            })
          )}
        </section>
      </main>
    </PageTransition>
  );
}

export default function TratamentosPage() {
  return (
    <Suspense fallback={<CardListSkeleton />}>
      <TratamentoListContent />
    </Suspense>
  );
}