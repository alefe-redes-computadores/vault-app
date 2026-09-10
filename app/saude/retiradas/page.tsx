// app/saude/retiradas/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Pill,
  Plus,
  Search,
  Store,
  XCircle,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import { useRetiradas } from "@/hooks/useRetiradas";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useFarmacias } from "@/hooks/useFarmacias";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { EmptyState } from "@/components/EmptyState";
import { getLocalTodayISO } from "@/lib/health-utils";
import type { Retirada, RetiradaStatus } from "@/lib/types";

type StatusFilter = "todos" | RetiradaStatus;

type MedicationGroup = {
  key: string;
  medicamentoId: string;
  nome: string;
  dosagem?: string;
  retiradas: Retirada[];
};

type MonthGroup = {
  key: string;
  label: string;
  medicamentos: MedicationGroup[];
  count: number;
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

function formatDate(value: string) {
  try {
    return format(parseISO(value.slice(0, 10)), "dd MMM yyyy", {
      locale: ptBR,
    });
  } catch {
    return value;
  }
}

function formatMonth(monthKey: string) {
  try {
    const [year, month] = monthKey.split("-");
    const label = format(
      new Date(Number(year), Number(month) - 1, 1),
      "MMMM 'de' yyyy",
      { locale: ptBR }
    );

    return label.charAt(0).toUpperCase() + label.slice(1);
  } catch {
    return monthKey;
  }
}

function statusMeta(status: RetiradaStatus) {
  if (status === "realizada") {
    return {
      label: "Realizada",
      className:
        "border-emerald-400/25 bg-emerald-400/10 text-emerald-400",
    };
  }

  if (status === "nao_realizada") {
    return {
      label: "Não realizada",
      className: "border-coral/25 bg-coral/10 text-coral",
    };
  }

  if (status === "cancelada") {
    return {
      label: "Cancelada",
      className:
        "border-ink-muted/25 bg-surface-raised text-ink-muted",
    };
  }

  return {
    label: "Agendada",
    className: "border-ice/25 bg-ice/10 text-ice",
  };
}

export default function RetiradasPage() {
  const router = useRouter();
  const { trigger } = useHapticFeedback();
  const { retiradas } = useRetiradas();
  const { medicamentos = [] } = useMedicamentos();
  const { farmacias = [] } = useFarmacias();

  const hoje = getLocalTodayISO();
  const currentMonth = hoje.slice(0, 7);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("todos");
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(
    () => new Set([currentMonth])
  );
  const [expandedMedications, setExpandedMedications] =
    useState<Set<string>>(new Set());

  const medicationMap = useMemo(
    () =>
      new Map(
        medicamentos
          .filter((item) => Boolean(item.id))
          .map((item) => [item.id!, item])
      ),
    [medicamentos]
  );

  const pharmacyMap = useMemo(
    () =>
      new Map(
        farmacias
          .filter((item) => Boolean(item.id))
          .map((item) => [item.id!, item])
      ),
    [farmacias]
  );

  const filtered = useMemo(() => {
    const query = normalize(search);

    return retiradas.filter((retirada) => {
      if (status !== "todos" && retirada.status !== status) return false;
      if (!query) return true;

      const med = medicationMap.get(retirada.medicamento_id);
      const pharmacy = retirada.farmacia_id
        ? pharmacyMap.get(retirada.farmacia_id)
        : undefined;

      return normalize(
        [
          retirada.medicamento_nome,
          retirada.medicamento_dosagem,
          med?.nome,
          med?.dosagem,
          pharmacy?.nome,
          retirada.observacoes,
          retirada.data,
        ]
          .filter(Boolean)
          .join(" ")
      ).includes(query);
    });
  }, [retiradas, status, search, medicationMap, pharmacyMap]);

  const grouped = useMemo<MonthGroup[]>(() => {
    const months = new Map<string, Map<string, MedicationGroup>>();

    for (const retirada of filtered) {
      const monthKey = retirada.data.slice(0, 7);
      if (!months.has(monthKey)) months.set(monthKey, new Map());

      const med = medicationMap.get(retirada.medicamento_id);
      const medKey = retirada.medicamento_id || "sem-medicamento";
      const meds = months.get(monthKey)!;

      if (!meds.has(medKey)) {
        meds.set(medKey, {
          key: `${monthKey}:${medKey}`,
          medicamentoId: retirada.medicamento_id,
          nome: med?.nome || retirada.medicamento_nome || "Medicamento",
          dosagem:
            med?.dosagem || retirada.medicamento_dosagem || undefined,
          retiradas: [],
        });
      }

      meds.get(medKey)!.retiradas.push(retirada);
    }

    return [...months.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([monthKey, meds]) => {
        const medicamentos = [...meds.values()]
          .map((group) => ({
            ...group,
            retiradas: [...group.retiradas].sort((a, b) => {
              const byDate = b.data.localeCompare(a.data);
              return byDate !== 0
                ? byDate
                : String(b.horario || "").localeCompare(
                    String(a.horario || "")
                  );
            }),
          }))
          .sort((a, b) =>
            (b.retiradas[0]?.data || "").localeCompare(
              a.retiradas[0]?.data || ""
            )
          );

        return {
          key: monthKey,
          label: formatMonth(monthKey),
          medicamentos,
          count: medicamentos.reduce(
            (total, item) => total + item.retiradas.length,
            0
          ),
        };
      });
  }, [filtered, medicationMap]);

  const counts = useMemo(
    () => ({
      total: retiradas.length,
      hoje: retiradas.filter(
        (r) => r.data === hoje && r.status === "agendada"
      ).length,
      agendadas: retiradas.filter((r) => r.status === "agendada").length,
      realizadas: retiradas.filter((r) => r.status === "realizada").length,
    }),
    [retiradas, hoje]
  );

  const toggle = (
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
    key: string
  ) => {
    trigger("vibrate");
    setter((previous) => {
      const next = new Set(previous);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-16">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/90 px-5 pb-4 pt-safe backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  trigger("vibrate");
                  router.replace("/saude/medicamentos");
                }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-primary active:scale-95"
                aria-label="Voltar para medicamentos"
              >
                <ArrowLeft size={18} />
              </button>

              <div className="min-w-0">
                <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-ice">
                  Agenda de medicamentos
                </p>
                <h1 className="mt-1 truncate font-display text-xl font-semibold text-ink-primary">
                  Retiradas
                </h1>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                trigger("vibrate");
                router.push("/saude/retiradas/nova");
              }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ice text-void active:scale-95"
              aria-label="Nova retirada"
            >
              <Plus size={19} />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {[
              ["Total", counts.total],
              ["Hoje", counts.hoje],
              ["Agend.", counts.agendadas],
              ["Feitas", counts.realizadas],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-surface-border/40 bg-surface-raised px-2 py-2.5 text-center"
              >
                <p className="font-mono text-base font-bold text-ink-primary">
                  {value}
                </p>
                <p className="mt-0.5 text-[8px] font-bold uppercase tracking-wide text-ink-muted">
                  {label}
                </p>
              </div>
            ))}
          </div>

          <div className="relative mt-3">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar medicamento, farmácia ou observação..."
              className="w-full rounded-2xl border border-surface-border bg-surface py-3 pl-10 pr-4 text-sm text-ink-primary outline-none focus:border-ice/50"
            />
          </div>

          <div className="mt-3 -mx-1 overflow-x-auto pb-1 scrollbar-none">
            <div className="flex min-w-max gap-2 px-1">
              {[
                ["todos", "Todos"],
                ["agendada", "Agendadas"],
                ["realizada", "Realizadas"],
                ["nao_realizada", "Não realizadas"],
                ["cancelada", "Canceladas"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    trigger("vibrate");
                    setStatus(key as StatusFilter);
                  }}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase ${
                    status === key
                      ? "border-ice bg-ice/15 text-ice"
                      : "border-surface-border/50 bg-surface-raised text-ink-muted"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-4">
          {grouped.length === 0 ? (
            <EmptyState
              icon={Pill}
              title="Nenhuma retirada encontrada"
              description={
                retiradas.length === 0
                  ? "Cadastre uma retirada para transformar a próxima obtenção do medicamento em um compromisso real."
                  : "Tente alterar a busca ou os filtros."
              }
              actionLabel={retiradas.length === 0 ? "Nova retirada" : undefined}
              onAction={
                retiradas.length === 0
                  ? () => router.push("/saude/retiradas/nova")
                  : undefined
              }
            />
          ) : (
            grouped.map((month, monthIndex) => {
              const monthExpanded = expandedMonths.has(month.key);

              return (
                <motion.div
                  key={month.key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: monthIndex * 0.025 }}
                  className="overflow-hidden rounded-[26px] border border-surface-border/50 bg-surface shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() =>
                      toggle(setExpandedMonths, month.key)
                    }
                    className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left active:bg-surface-raised/45"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-ice/20 bg-ice/10 text-ice">
                        <Calendar size={17} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-faint">
                          Período
                        </p>
                        <h2 className="truncate text-sm font-semibold text-ink-primary">
                          {month.label}
                        </h2>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <span className="rounded-full bg-surface-raised px-2 py-0.5 font-mono text-[9px] text-ink-muted">
                        {month.count}
                      </span>
                      <ChevronDown
                        size={16}
                        className={`text-ink-muted transition-transform ${
                          monthExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {monthExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden border-t border-surface-border/30"
                      >
                        {month.medicamentos.map((medication, medicationIndex) => {
                          const medicationExpanded =
                            expandedMedications.has(medication.key);

                          return (
                            <div
                              key={medication.key}
                              className={
                                medicationIndex > 0
                                  ? "border-t border-surface-border/25"
                                  : ""
                              }
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  toggle(
                                    setExpandedMedications,
                                    medication.key
                                  )
                                }
                                className="flex min-h-[66px] w-full items-center justify-between gap-3 px-4 py-3 text-left active:bg-surface-raised/45"
                              >
                                <div className="flex min-w-0 flex-1 items-center gap-3">
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] border border-amber-400/20 bg-amber-400/10 text-amber-400">
                                    <Pill size={17} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex min-w-0 items-center gap-2">
                                      <p className="truncate text-[13px] font-semibold text-ink-primary">
                                        {medication.nome}
                                      </p>
                                      <span className="shrink-0 rounded-full bg-surface-raised px-2 py-0.5 font-mono text-[8px] text-ink-faint">
                                        {medication.retiradas.length}
                                      </span>
                                    </div>
                                    <p className="mt-0.5 truncate text-[10px] text-ink-muted">
                                      {medication.dosagem || "Sem dosagem informada"}
                                    </p>
                                  </div>
                                </div>

                                <ChevronRight
                                  size={15}
                                  className={`shrink-0 text-ink-faint transition-transform ${
                                    medicationExpanded
                                      ? "rotate-90 text-ink-muted"
                                      : ""
                                  }`}
                                />
                              </button>

                              <AnimatePresence initial={false}>
                                {medicationExpanded && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden border-t border-surface-border/20 bg-void/15 px-4"
                                  >
                                    {medication.retiradas.map((retirada, index) => {
                                      const meta = statusMeta(retirada.status);
                                      const pharmacy = retirada.farmacia_id
                                        ? pharmacyMap.get(retirada.farmacia_id)
                                        : undefined;
                                      const wasRescheduled =
                                        (retirada.reagendamentos || []).length > 0;

                                      return (
                                        <button
                                          type="button"
                                          key={retirada.id}
                                          onClick={() => {
                                            trigger("vibrate");
                                            router.push(
                                              `/saude/retiradas/detalhes?id=${retirada.id}`
                                            );
                                          }}
                                          className={`flex min-h-[64px] w-full items-center justify-between gap-3 py-3 text-left active:bg-surface-raised/30 ${
                                            index > 0
                                              ? "border-t border-surface-border/20"
                                              : ""
                                          }`}
                                        >
                                          <div className="flex min-w-0 flex-1 items-start gap-3">
                                            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-ice/15 bg-ice/5 text-ice">
                                              {retirada.status === "realizada" ? (
                                                <CheckCircle2
                                                  size={14}
                                                  className="text-emerald-400"
                                                />
                                              ) : retirada.status ===
                                                "nao_realizada" ? (
                                                <XCircle
                                                  size={14}
                                                  className="text-coral"
                                                />
                                              ) : (
                                                <Clock size={14} />
                                              )}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                              <div className="flex flex-wrap items-center gap-1.5">
                                                <p className="text-[11px] font-semibold text-ink-primary">
                                                  Retirada
                                                </p>
                                                {retirada.data === hoje && (
                                                  <span className="rounded-full bg-coral/10 px-1.5 py-0.5 text-[8px] font-bold uppercase text-coral">
                                                    Hoje
                                                  </span>
                                                )}
                                                {wasRescheduled && (
                                                  <span className="rounded-full bg-violet-400/10 px-1.5 py-0.5 text-[8px] font-bold uppercase text-violet-300">
                                                    Reagendada
                                                  </span>
                                                )}
                                              </div>

                                              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] text-ink-muted">
                                                <span className="font-mono">
                                                  {formatDate(retirada.data)}
                                                </span>
                                                {retirada.horario && (
                                                  <span className="font-mono">
                                                    {retirada.horario}
                                                  </span>
                                                )}
                                                {pharmacy?.nome && (
                                                  <span className="inline-flex max-w-[170px] items-center gap-1 truncate">
                                                    <Store
                                                      size={9}
                                                      className="shrink-0"
                                                    />
                                                    <span className="truncate">
                                                      {pharmacy.nome}
                                                    </span>
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          </div>

                                          <span
                                            className={`shrink-0 rounded-full border px-2 py-0.5 text-[8px] font-bold uppercase ${meta.className}`}
                                          >
                                            {meta.label}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })
          )}
        </section>
      </main>
    </PageTransition>
  );
}
