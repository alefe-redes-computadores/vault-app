// app/saude/locais/page.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Calendar,
  FileText,
  DollarSign,
  Filter,
  X,
  Plus,
  FlaskConical,
  Building2,
  PlusCircle,
  Stethoscope,
  Activity,
  FolderHeart,
  Clock,
  ChevronRight,
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { CardListSkeleton } from "@/components/loading/CardListSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { useLocais } from "@/hooks/useLocais";
import { useRenovacoes } from "@/hooks/useRenovacoes";
import {
  ListPageHeader,
  ListSearch,
  ListFilters,
  ListCard,
} from "@/components/list";
import type { LocalSaude, Renovacao, Medico, Tratamento, Consulta } from "@/lib/types";

function formatDateDisplay(isoStr: string): string {
  if (!isoStr) return "";
  const parts = isoStr.split("-");
  if (parts.length !== 3) return isoStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

const LOCAL_TYPE_STYLE: Record<string, { color: string; icon: any; label: string }> = {
  posto_saude: { color: "#34D399", icon: PlusCircle, label: "Posto de Saúde" },
  laboratorio: { color: "#A78BFA", icon: FlaskConical, label: "Laboratório" },
  clinica: { color: "#38BDF8", icon: Building2, label: "Clínica" },
  outro: { color: "#F59E0B", icon: MapPin, label: "Outro" },
};

type FiltroTipo = "todos" | "posto_saude" | "laboratorio" | "clinica";
type FiltroStatus = "todos" | "com_registros" | "sem_registros";

type LocalComHistorico = LocalSaude & {
  historicoCount: number;
  totalGasto: number;
  ultimaRenovacao: Renovacao | null;
  medicosCount: number;
  tratamentosCount: number;
  proximasConsultasCount: number;
};

export default function LocaisPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("todos");
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todos");

  const { locais = [] } = useLocais();
  const { renovacoes = [] } = useRenovacoes();

  const medicos = useLiveQuery(() => db.medicos.toArray(), []) || [];
  const tratamentos = useLiveQuery(() => db.tratamentos.toArray(), []) || [];
  const consultas = useLiveQuery(() => db.consultas.toArray(), []) || [];

  const hoje = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const locaisEnriquecidos = useMemo<LocalComHistorico[]>(() => {
    return locais.map((local) => {
      const historico = renovacoes.filter((r: Renovacao) => r.local_id === local.id);

      const totalGasto = historico.reduce((acc, r) => {
        if (typeof r.preco === "number" && r.preco > 0) {
          return acc + r.preco;
        }
        return acc;
      }, 0);

      const ultimaRenovacao = historico.length > 0
        ? [...historico].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())[0]
        : null;

      const medicosNoLocal = medicos.filter((med: Medico) =>
        (local.medico_ids || []).includes(med.id || "")
      ).length;

      const tratamentosNoLocal = tratamentos.filter((trat: Tratamento) =>
        (local.tratamento_ids || []).includes(trat.id || "")
      ).length;

      const proximasConsultas = consultas.filter((c: Consulta) =>
        c.local_id === local.id && c.data && new Date(c.data) >= hoje
      ).length;

      return {
        ...local,
        historicoCount: historico.length,
        totalGasto,
        ultimaRenovacao,
        medicosCount: medicosNoLocal,
        tratamentosCount: tratamentosNoLocal,
        proximasConsultasCount: proximasConsultas,
      };
    });
  }, [locais, renovacoes, medicos, tratamentos, consultas, hoje]);

  const filteredLocais = useMemo(() => {
    let result = locaisEnriquecidos;

    if (search) {
      const term = search.toLowerCase();
      result = result.filter(
        (local) =>
          local.nome?.toLowerCase().includes(term) ||
          (local.endereco && local.endereco.toLowerCase().includes(term))
      );
    }

    if (filtroTipo !== "todos") {
      result = result.filter((local) => local.tipo === filtroTipo);
    }

    if (filtroStatus === "com_registros") {
      result = result.filter((local) => local.historicoCount > 0);
    } else if (filtroStatus === "sem_registros") {
      result = result.filter((local) => local.historicoCount === 0);
    }

    return result.sort((a, b) => a.nome.localeCompare(b.nome));
  }, [locaisEnriquecidos, search, filtroTipo, filtroStatus]);

  const handleClearFilters = () => {
    trigger("vibrate");
    setFiltroTipo("todos");
    setFiltroStatus("todos");
  };

  if (!locais || !renovacoes) return <CardListSkeleton />;

  return (
    <PageTransition>
      <main className="relative min-h-screen bg-void pb-28">
        <ListPageHeader
          title="Postos e Locais"
          badgeLabel="Rede de Apoio"
          badgeColor="text-emerald-400"
          icon={<MapPin size={14} />}
          iconColor="text-emerald-400"
        >
          <ListSearch
            value={search}
            onChange={setSearch}
            placeholder="Buscar por nome ou endereço..."
          />

          <ListFilters onClear={handleClearFilters}>
            <button
              type="button"
              onClick={() => {
                trigger("vibrate");
                setFiltroTipo(filtroTipo === "posto_saude" ? "todos" : "posto_saude");
              }}
              className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all shrink-0 ${
                filtroTipo === "posto_saude"
                  ? "border-emerald-400 bg-emerald-400/20 text-emerald-300"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Postos
            </button>

            <button
              type="button"
              onClick={() => {
                trigger("vibrate");
                setFiltroTipo(filtroTipo === "laboratorio" ? "todos" : "laboratorio");
              }}
              className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all shrink-0 ${
                filtroTipo === "laboratorio"
                  ? "border-violet-400 bg-violet-400/20 text-violet-300"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Laboratórios
            </button>

            <button
              type="button"
              onClick={() => {
                trigger("vibrate");
                setFiltroTipo(filtroTipo === "clinica" ? "todos" : "clinica");
              }}
              className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all shrink-0 ${
                filtroTipo === "clinica"
                  ? "border-ice bg-ice/20 text-ice"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Clínicas
            </button>

            <button
              type="button"
              onClick={() => {
                trigger("vibrate");
                setFiltroStatus(filtroStatus === "com_registros" ? "todos" : "com_registros");
              }}
              className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all shrink-0 ${
                filtroStatus === "com_registros"
                  ? "border-emerald-400 bg-emerald-400/20 text-emerald-300"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Com Registros
            </button>

            <button
              type="button"
              onClick={() => {
                trigger("vibrate");
                setFiltroStatus(filtroStatus === "sem_registros" ? "todos" : "sem_registros");
              }}
              className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all shrink-0 ${
                filtroStatus === "sem_registros"
                  ? "border-coral bg-coral/20 text-coral"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Sem Registros
            </button>
          </ListFilters>
        </ListPageHeader>

        <section className="space-y-3.5 px-5 pt-4">
          <button
            type="button"
            onClick={() => {
              trigger("vibrate");
              router.push("/saude/locais/novo");
            }}
            className="group relative w-full overflow-hidden rounded-[24px] border border-emerald-400/30 bg-gradient-to-r from-emerald-400/10 via-surface to-surface p-4 shadow-sm transition-all active:scale-[0.985] hover:border-emerald-400/50"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-400">
                <Plus size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink-primary">
                  Adicionar posto, laboratório ou clínica
                </p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  Centralize os locais de atendimento, consultas e exames.
                </p>
              </div>
              <ChevronRight size={18} className="shrink-0 text-emerald-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {filteredLocais.length === 0 ? (
            <EmptyState
              icon={MapPin}
              title="Nenhum local cadastrado"
              description={
                search || filtroTipo !== "todos" || filtroStatus !== "todos"
                  ? "Tente ajustar os filtros aplicados."
                  : "Cadastre postos de saúde, laboratórios ou clínicas para organizar sua rede de atendimento."
              }
            />
          ) : (
            filteredLocais.map((local, index) => {
              const style = LOCAL_TYPE_STYLE[local.tipo || "outro"] || LOCAL_TYPE_STYLE.outro;
              const IconComponent = style.icon;

              const tratamentosDoLocal = tratamentos.filter((t: Tratamento) =>
                (local.tratamento_ids || []).includes(t.id || "")
              );

              return (
                <ListCard
                  key={local.id}
                  id={local.id!}
                  color={style.color}
                  onClick={() => {
                    trigger("vibrate");
                    router.push(`/saude/locais/detalhes?id=${local.id}`);
                  }}
                  delay={index * 0.025}
                  icon={<IconComponent size={22} />}
                >
                  <div className="flex min-w-0 items-baseline gap-2">
                    <h3 className="min-w-0 flex-1 truncate font-display text-base font-bold uppercase text-ink-primary">
                      {local.nome}
                    </h3>
                    <span className="shrink-0 whitespace-nowrap text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border border-surface-border/40 bg-surface-raised text-ink-muted">
                      {style.label}
                    </span>
                  </div>

                  {local.endereco && (
                    <p className="mt-1 truncate text-xs text-ink-muted">{local.endereco}</p>
                  )}

                  {tratamentosDoLocal.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {tratamentosDoLocal.slice(0, 3).map((t: Tratamento) => (
                        <span
                          key={t.id}
                          className="inline-flex items-center gap-1 truncate rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide max-w-[100px]"
                          style={{
                            backgroundColor: `${t.cor || "#38BDF8"}20`,
                            borderColor: `${t.cor || "#38BDF8"}40`,
                            color: t.cor || "#38BDF8",
                          }}
                        >
                          <Activity size={10} /> {t.nome}
                        </span>
                      ))}
                      {tratamentosDoLocal.length > 3 && (
                        <span className="flex items-center text-[9px] font-medium text-ink-faint">
                          +{tratamentosDoLocal.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {local.medicosCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-surface-border/40 bg-surface-raised px-2 py-0.5 text-[10px] font-medium text-ink-muted">
                        <Stethoscope size={11} className="text-ice" /> {local.medicosCount} médico(s)
                      </span>
                    )}
                    {local.tratamentosCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-surface-border/40 bg-surface-raised px-2 py-0.5 text-[10px] font-medium text-ink-muted">
                        <FolderHeart size={11} className="text-violet-400" /> {local.tratamentosCount} tratamento(s)
                      </span>
                    )}
                    {local.proximasConsultasCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-surface-border/40 bg-surface-raised px-2 py-0.5 text-[10px] font-medium text-ink-muted">
                        <Calendar size={11} className="text-emerald-400" /> {local.proximasConsultasCount} próxima(s)
                      </span>
                    )}
                    {local.historicoCount > 0 ? (
                      <>
                        <span className="inline-flex items-center gap-1 rounded-md border border-surface-border/40 bg-surface-raised px-2 py-0.5 text-[10px] font-medium text-ink-muted">
                          <FileText size={11} className="text-amber-400" /> {local.historicoCount} retirada(s)
                        </span>
                        {local.totalGasto > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-surface-border/40 bg-surface-raised px-2 py-0.5 text-[10px] font-medium text-ink-muted">
                            <DollarSign size={11} className="text-emerald-400" /> {formatCurrency(local.totalGasto)}
                          </span>
                        )}
                        {local.ultimaRenovacao && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-surface-border/40 bg-surface-raised px-2 py-0.5 text-[10px] font-medium text-ink-muted">
                            <Clock size={11} className="text-ice" /> {formatDateDisplay(local.ultimaRenovacao.data)}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-[10px] text-ink-muted">Sem registros</span>
                    )}
                  </div>
                </ListCard>
              );
            })
          )}
        </section>
      </main>
    </PageTransition>
  );
}