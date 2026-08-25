// app/saude/exames/page.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  FlaskConical,
  Building2,
  Calendar,
  Filter,
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  UserRound,
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { CardListSkeleton } from "@/components/loading/CardListSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { useExames } from "@/hooks/useExames";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { isReceitaVencidaSegura } from "@/lib/health-insights";
import { getDaysUntil, getClinicalTheme } from "@/lib/health-utils";
import {
  ListPageHeader,
  ListSearch,
  ListFilters,
  ListCard,
} from "@/components/list";
import type { Exame, Person, Tratamento } from "@/lib/types";

function formatDateDisplay(isoStr: string): string {
  if (!isoStr) return "";
  const parts = isoStr.split("-");
  if (parts.length !== 3) return isoStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export default function ExamesPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { activePersonId } = useActivePersonId();
  const [search, setSearch] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "vencido" | "valido" | "proximo">("todos");

  const { exames: allExames } = useExames();
  const persons = useLiveQuery(() => db.persons.toArray(), []) as Person[];
  const tratamentos = useLiveQuery(() => db.tratamentos.toArray(), []) || [];

  const personMap = useMemo(() => new Map((persons || []).map((p) => [p.id!, p.name])), [persons]);
  const tratamentoMap = useMemo(() => new Map(tratamentos.map((t) => [t.id, t])), [tratamentos]);

  const exames = useMemo(() => {
    if (!activePersonId) return allExames || [];
    return (allExames || []).filter((exame: Exame) => exame.person_id === activePersonId);
  }, [allExames, activePersonId]);

  type ExameComStatus = Exame & { vencido: boolean; proximo: boolean };

  const examesComStatus = useMemo<ExameComStatus[]>(() => {
    return (exames || []).map((exame: Exame) => {
      const dias = exame.data_retorno ? getDaysUntil(exame.data_retorno) : null;
      const vencido = exame.data_retorno ? isReceitaVencidaSegura(exame.data_retorno) : false;
      const proximo = dias !== null && dias >= 0 && dias <= 7 && !vencido;

      return { ...exame, vencido, proximo };
    });
  }, [exames]);

  const filteredExames = useMemo<ExameComStatus[]>(() => {
    let result = examesComStatus;

    if (search) {
      const term = search.toLowerCase();
      result = result.filter(
        (exame) =>
          exame.nome?.toLowerCase().includes(term) ||
          exame.laboratorio?.toLowerCase().includes(term)
      );
    }

    if (filtroStatus === "vencido") {
      result = result.filter((exame) => exame.vencido);
    } else if (filtroStatus === "valido") {
      result = result.filter((exame) => !exame.vencido && !exame.proximo);
    } else if (filtroStatus === "proximo") {
      result = result.filter((exame) => exame.proximo);
    }

    return result.sort((a, b) => (b.data || "").localeCompare(a.data || ""));
  }, [examesComStatus, search, filtroStatus]);

  const handleClearFilters = () => {
    trigger("vibrate");
    setFiltroStatus("todos");
  };

  if (!allExames) return <CardListSkeleton />;

  return (
    <PageTransition>
      <main className="relative min-h-screen bg-void pb-28">
        <ListPageHeader
          title="Exames e Laudos"
          badgeLabel="REGISTROS CLÍNICOS"
          badgeColor="text-emerald-400"
          icon={<FlaskConical size={14} />}
          iconColor="text-emerald-400"
        >
          <ListSearch
            value={search}
            onChange={setSearch}
            placeholder="Buscar exame ou laboratório..."
          />

          <ListFilters onClear={handleClearFilters}>
            <button
              type="button"
              onClick={() => { trigger("vibrate"); setFiltroStatus(filtroStatus === "vencido" ? "todos" : "vencido"); }}
              className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all shrink-0 ${
                filtroStatus === "vencido"
                  ? "border-coral bg-coral/20 text-coral"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Vencidos
            </button>

            <button
              type="button"
              onClick={() => { trigger("vibrate"); setFiltroStatus(filtroStatus === "proximo" ? "todos" : "proximo"); }}
              className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all shrink-0 ${
                filtroStatus === "proximo"
                  ? "border-amber-400 bg-amber-400/20 text-amber-300"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Próximos
            </button>

            <button
              type="button"
              onClick={() => { trigger("vibrate"); setFiltroStatus(filtroStatus === "valido" ? "todos" : "valido"); }}
              className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all shrink-0 ${
                filtroStatus === "valido"
                  ? "border-emerald-400 bg-emerald-400/20 text-emerald-300"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Válidos
            </button>
          </ListFilters>
        </ListPageHeader>

        <section className="space-y-3.5 px-5 pt-4">
          {filteredExames.length === 0 ? (
            <EmptyState
              icon={FlaskConical}
              title={
                search || filtroStatus !== "todos"
                  ? "Nenhum exame encontrado"
                  : "Nenhum exame cadastrado"
              }
              description={
                search || filtroStatus !== "todos"
                  ? "Tente ajustar a busca ou os filtros."
                  : "Cadastre seus exames e laudos."
              }
            />
          ) : (
            filteredExames.map((exame, index) => {
              const personName = personMap.get(exame.person_id || "");
              const corBorda = exame.vencido ? "#EF4444" : exame.proximo ? "#F59E0B" : "#10B981";
              const temHorario = exame.horario && exame.horario.trim().length > 0;

              const primeirosTratamentos = (exame.tratamento_ids || [])
                .slice(0, 2)
                .map((id) => tratamentoMap.get(id))
                .filter(Boolean) as Tratamento[];

              return (
                <ListCard
                  key={exame.id}
                  id={exame.id!}
                  color={corBorda}
                  onClick={() => {
                    trigger("vibrate");
                    router.push(`/saude/exames/detalhes?id=${exame.id}`);
                  }}
                  delay={index * 0.025}
                  icon={<FlaskConical size={22} className="text-emerald-400" />}
                >
                  <div className="flex min-w-0 items-baseline gap-2 flex-wrap">
                    <h3 className="min-w-0 flex-1 truncate font-display text-base font-bold text-ink-primary">
                      {exame.nome}
                    </h3>
                    {personName && (
                      <span className="shrink-0 whitespace-nowrap rounded-full border border-surface-border/50 bg-surface-raised px-2 py-0.5 text-[9px] font-semibold text-ink-muted uppercase tracking-wide flex items-center gap-1">
                        <UserRound size={10} />
                        {personName}
                      </span>
                    )}
                    {exame.vencido ? (
                      <span className="shrink-0 whitespace-nowrap flex items-center gap-1 text-[8px] font-bold uppercase bg-coral/20 text-coral px-1.5 py-0.5 rounded-full">
                        <AlertTriangle size={10} /> Vencido
                      </span>
                    ) : exame.proximo ? (
                      <span className="shrink-0 whitespace-nowrap flex items-center gap-1 text-[8px] font-bold uppercase bg-amber-400/20 text-amber-400 px-1.5 py-0.5 rounded-full">
                        <Clock size={10} /> Próximo
                      </span>
                    ) : exame.data_retorno ? (
                      <span className="shrink-0 whitespace-nowrap flex items-center gap-1 text-[8px] font-bold uppercase bg-emerald-400/20 text-emerald-400 px-1.5 py-0.5 rounded-full">
                        <CheckCircle2 size={10} /> Válido
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                    {exame.laboratorio && (
                      <span className="flex items-center gap-1 truncate">
                        <Building2 size={12} className="text-ink-faint" /> {exame.laboratorio}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar size={12} className="text-ink-faint" /> {formatDateDisplay(exame.data)}
                    </span>
                    {temHorario && (
                      <span className="text-[10px] font-mono text-ink-muted">• {exame.horario}</span>
                    )}
                  </div>

                  {primeirosTratamentos.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {primeirosTratamentos.map((t) => {
                        const theme = getClinicalTheme(t.nome);
                        const Icon = theme.icon;
                        return (
                          <span
                            key={t.id}
                            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wide border max-w-[120px] truncate ${theme.tagClass}`}
                          >
                            <Icon size={9} />
                            {t.nome}
                          </span>
                        );
                      })}
                      {(exame.tratamento_ids?.length || 0) > 2 && (
                        <span className="text-[8px] text-ink-muted">+{(exame.tratamento_ids?.length || 0) - 2}</span>
                      )}
                    </div>
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