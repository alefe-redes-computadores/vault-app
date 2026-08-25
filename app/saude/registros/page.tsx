// app/saude/registros/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Activity,
  Calendar,
  Clock,
  Filter,
  AlertTriangle,
  Pill,
  FolderHeart,
} from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { CardListSkeleton } from "@/components/loading/CardListSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { useRegistrosSaude } from "@/hooks/useRegistrosSaude";
import { getRegistroTheme } from "@/lib/health-utils";
import { analisarRegistroSaude } from "@/lib/health-insights";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import {
  ListPageHeader,
  ListFilters,
  ListCard,
} from "@/components/list";

type FiltroCategoria = "todos" | "sintoma" | "medicao" | "humor";

function formatDateToDisplay(isoStr: string): string {
  if (!isoStr) return "";
  const parts = isoStr.split("-");
  if (parts.length !== 3) return isoStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export default function RegistrosSaudePage() {
  const router = useRouter();
  const { trigger } = useHapticFeedback();
  const { registros, isLoading } = useRegistrosSaude();

  const [filtroCategoria, setFiltroCategoria] = useState<FiltroCategoria>("todos");

  const registrosFiltrados = useMemo(() => {
    if (filtroCategoria === "todos") return registros;
    return registros.filter((r) => r.categoria === filtroCategoria);
  }, [registros, filtroCategoria]);

  const medicamentosMap = useLiveQuery(
    () => db.medicamentos.toArray().then((list) => new Map(list.map((m) => [m.id, m]))),
    []
  ) || new Map();

  const tratamentosMap = useLiveQuery(
    () => db.tratamentos.toArray().then((list) => new Map(list.map((t) => [t.id, t]))),
    []
  ) || new Map();

  const handleClearFilters = () => {
    trigger("vibrate");
    setFiltroCategoria("todos");
  };

  if (isLoading) return <CardListSkeleton />;

  return (
    <PageTransition>
      <main className="relative min-h-screen bg-void pb-28">
        <ListPageHeader
          title="Sintomas e Medições"
          badgeLabel="Prontuário"
          badgeColor="text-ice/90"
          icon={<Activity size={14} />}
          iconColor="text-ice"
          rightAction={
            <button
              type="button"
              onClick={() => {
                trigger("vibrate");
                router.push("/saude/registros/novo");
              }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ice text-void shadow-lg shadow-ice/20 transition-all active:scale-95"
              aria-label="Adicionar registro"
            >
              <Plus size={22} strokeWidth={2.5} />
            </button>
          }
        >
          <ListFilters onClear={handleClearFilters}>
            <button
              type="button"
              onClick={() => {
                trigger("vibrate");
                setFiltroCategoria("todos");
              }}
              className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all shrink-0 ${
                filtroCategoria === "todos"
                  ? "border-ice bg-ice/20 text-ice"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Todos ({registros.length})
            </button>
            <button
              type="button"
              onClick={() => {
                trigger("vibrate");
                setFiltroCategoria("sintoma");
              }}
              className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all shrink-0 ${
                filtroCategoria === "sintoma"
                  ? "border-amber-400 bg-amber-400/20 text-amber-300"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Sintomas
            </button>
            <button
              type="button"
              onClick={() => {
                trigger("vibrate");
                setFiltroCategoria("medicao");
              }}
              className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all shrink-0 ${
                filtroCategoria === "medicao"
                  ? "border-emerald-400 bg-emerald-400/20 text-emerald-300"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Medições
            </button>
          </ListFilters>
        </ListPageHeader>

        <section className="space-y-3.5 px-5 pt-4">
          {registrosFiltrados.length === 0 ? (
            <EmptyState
              icon={Activity}
              title={filtroCategoria !== "todos" ? "Nenhum registro com este filtro" : "Nenhum registro de saúde"}
              description={
                filtroCategoria !== "todos"
                  ? "Tente ajustar o filtro ou cadastre um novo registro."
                  : "Comece a monitorar sua saúde registrando sintomas, medições e humor."
              }
              actionLabel="Registrar"
              onAction={() => {
                trigger("vibrate");
                router.push("/saude/registros/novo");
              }}
              iconClassName="bg-ice/10 border-ice/20 text-ice"
            />
          ) : (
            registrosFiltrados.map((item, index) => {
              const theme = getRegistroTheme(item.nome);
              const IconComp = theme.icon;
              const insight = analisarRegistroSaude(
                item.nome,
                item.valor_medicao,
                item.intensidade,
                item.observacoes
              );

              const med = item.medicamento_id ? medicamentosMap.get(item.medicamento_id) : null;
              const trat = item.tratamento_ids?.length
                ? item.tratamento_ids.map((id) => tratamentosMap.get(id)).filter(Boolean)
                : [];

              return (
                <ListCard
                  key={item.id}
                  id={item.id!}
                  color={theme.hex}
                  onClick={() => {
                    trigger("vibrate");
                    router.push(`/saude/registros/detalhes?id=${item.id}`);
                  }}
                  delay={index * 0.025}
                  icon={<IconComp size={22} />}
                >
                  <div className="flex min-w-0 items-baseline gap-2">
                    <h3 className="min-w-0 flex-1 truncate font-display text-base font-bold text-ink-primary">
                      {item.nome}
                    </h3>
                    {item.intensidade !== undefined && (
                      <span className="shrink-0 whitespace-nowrap text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-surface-raised text-ink-muted border border-surface-border/50">
                        Nível {item.intensidade}/10
                      </span>
                    )}
                    {item.valor_medicao && (
                      <span className="shrink-0 whitespace-nowrap text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-md bg-ice/10 text-ice border border-ice/20">
                        {item.valor_medicao}
                      </span>
                    )}
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-ink-muted">
                    <span className="flex items-center gap-1 font-mono">
                      <Calendar size={12} /> {formatDateToDisplay(item.data)}
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <Clock size={12} /> {item.horario}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {med && (
                      <span className="flex items-center gap-1 text-[9px] font-medium bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20 text-amber-400 max-w-[100px] truncate">
                        <Pill size={10} /> {med.nome}
                      </span>
                    )}
                    {trat.slice(0, 2).map((t: any) => (
                      <span
                        key={t.id}
                        className="flex items-center gap-1 text-[9px] font-medium bg-violet-400/10 px-2 py-0.5 rounded-full border border-violet-400/20 text-violet-400 max-w-[100px] truncate"
                      >
                        <FolderHeart size={10} /> {t.nome}
                      </span>
                    ))}
                    {trat.length > 2 && (
                      <span className="text-[9px] text-ink-faint">+{trat.length - 2}</span>
                    )}
                  </div>

                  {item.intensidade !== undefined && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-surface-border overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(item.intensidade / 10) * 100}%`,
                            backgroundColor: theme.hex,
                          }}
                        />
                      </div>
                      <span className="text-[9px] font-mono text-ink-faint">{item.intensidade}/10</span>
                    </div>
                  )}

                  {insight && (insight.status as string) !== "ok" && (
                    <div
                      className={`mt-2.5 flex items-center gap-1.5 text-[10px] font-semibold w-fit px-2.5 py-1 rounded-full border ${
                        insight.status === "critico"
                          ? "bg-coral/10 text-coral border-coral/30"
                          : insight.status === "alerta"
                          ? "bg-amber-400/10 text-amber-400 border-amber-400/30"
                          : insight.status === "atencao"
                          ? "bg-ice/10 text-ice border-ice/30"
                          : "bg-emerald-400/10 text-emerald-400 border-emerald-400/30"
                      }`}
                    >
                      <AlertTriangle size={12} /> {insight.titulo}
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