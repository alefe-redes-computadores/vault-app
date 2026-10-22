// app/saude/retiradas/page.tsx
"use client";
import { WithdrawalBatchPlanner } from "@/components/saude/WithdrawalBatchPlanner";
import {WithdrawalPreparationView} from "@/components/saude/WithdrawalPreparationSummary";
import {withdrawalSourceNote} from "@/lib/health-supply/overview";
import {useSupplyOverview} from "@/hooks/useSupplyOverview";
// VAULT_MEDICATION_ICON_INHERITANCE_V70

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Pill,

  Store,
  XCircle,
  Plus,
  PackageCheck,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import { useRetiradas } from "@/hooks/useRetiradas";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useFarmacias } from "@/hooks/useFarmacias";
import { useMedicationRegulatoryProfiles } from "@/hooks/useMedicationRegulatoryProfiles";
import { getMedicationRegulatorySurface } from "@/lib/medication-regulatory-visual";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { EmptyState } from "@/components/EmptyState";
import { ListSearch } from "@/components/list/ListSearch";
import { ListFilters } from "@/components/list/ListFilters";
import { ListPageHeader } from "@/components/list/ListPageHeader";
import { MedicationFormatIcon } from "@/components/saude/MedicationFormatIcon";
import { ClinicalListSummary } from "@/components/saude/ClinicalListSummary";
import { useLocalDay } from "@/hooks/useLocalDay";
import { withReturnTarget } from "@/lib/navigation/return-context";
import type { Retirada, RetiradaStatus } from "@/lib/types";

type StatusFilter = "todos" | "hoje" | "atrasada" | RetiradaStatus;

type MedicationGroup = {
  key: string;
  medicamentoId: string;
  nome: string;
  dosagem?: string;
  formato?: string;
  cores?: string[];
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
    className: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
  };
}

export default function RetiradasPage() {
 const supplyOverview=useSupplyOverview();
  const sourceNotesById = useMemo(() => new Map((supplyOverview?.renewals || []).filter(r => r.id).map(r => [r.id!, r])), [supplyOverview?.renewals]);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { trigger } = useHapticFeedback();
  const { retiradas, rescheduleRetiradas, activePersonId } = useRetiradas();
  const { medicamentos = [] } = useMedicamentos();
  const { farmacias = [] } = useFarmacias();
  const regulatoryProfiles =
    useMedicationRegulatoryProfiles(medicamentos);

  const hoje = useLocalDay();
  const currentMonth = hoje.slice(0, 7);
  const listHref = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
  const navigateWithReturn = (href: string) => router.push(withReturnTarget(href, listHref));

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
      if (
        status === "hoje" &&
        !(retirada.status === "agendada" && retirada.data === hoje)
      ) {
        return false;
      }

      if (
        status === "atrasada" &&
        !(
          retirada.status === "agendada" &&
          retirada.data < hoje
        )
      ) {
        return false;
      }

      if (
        status !== "todos" &&
        status !== "atrasada" &&
        status !== "hoje" &&
        retirada.status !== status
      ) {
        return false;
      }

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
          withdrawalSourceNote(retirada,supplyOverview?.renewals||[],sourceNotesById),
          retirada.data,
        ]
          .filter(Boolean)
          .join(" ")
      ).includes(query);
    });
  }, [
    retiradas,
    status,
    search,
    medicationMap,
    pharmacyMap,
    supplyOverview,
    sourceNotesById,
    hoje,
  ]);

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
          formato: med?.formato,
          cores: med?.cores,
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

  const counts = useMemo(() => {
    const result = { total: retiradas.length, hoje: 0, agendadas: 0, atrasadas: 0, realizadas: 0 };
    for (const retirada of retiradas) {
      if (retirada.status === "realizada") result.realizadas += 1;
      if (retirada.status !== "agendada") continue;
      result.agendadas += 1;
      if (retirada.data === hoje) result.hoje += 1;
      else if (retirada.data < hoje) result.atrasadas += 1;
    }
    return result;
  }, [retiradas, hoje]);

  useEffect(() => {
    if (!grouped.length) return;
    setExpandedMonths((previous) => {
      if (grouped.some((month) => previous.has(month.key))) return previous;
      return new Set([grouped[0].key]);
    });
  }, [grouped]);

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
        <ListPageHeader
          title="Retiradas"
          badgeLabel="AGENDA DE MEDICAMENTOS"
          badgeColor="text-emerald-300"
          rightAction={
            <button type="button" onClick={() => { trigger("vibrate"); navigateWithReturn("/saude/retiradas/nova"); }} className="flex h-11 items-center gap-2 rounded-2xl border border-emerald-400/25 bg-emerald-400/[.08] px-3 text-[10px] font-bold uppercase tracking-wide text-emerald-300 active:scale-95" aria-label="Agendar nova retirada">
              <Plus size={15}/>Agendar
            </button>
          }
        >
          <ListSearch value={search} onChange={setSearch} placeholder="Buscar medicamento, farmácia ou observação..." className="order-1" />
          <ListFilters className="order-2" title="Filtrar retiradas" activeCount={status === "todos" ? 0 : 1} onClear={() => setStatus("todos")}>
            {[["todos", "Todas"], ["hoje", "Hoje"], ["agendada", "Agendadas"], ["atrasada", "Atrasadas"], ["realizada", "Realizadas"], ["nao_realizada", "Não realizadas"], ["cancelada", "Canceladas"]].map(([key, label]) => (
              <button key={key} type="button" aria-pressed={status === key} onClick={() => { trigger("vibrate"); setStatus(key as StatusFilter); }} className={`shrink-0 rounded-full border px-3 py-2 text-[10px] font-bold uppercase ${status === key ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-300" : "border-surface-border/50 bg-surface-raised text-ink-muted"}`}>{label}</button>
            ))}
          </ListFilters>
          {counts.total > 0 ? <div className="order-3 w-full"><ClinicalListSummary icon={PackageCheck} eyebrow="Situação operacional" title={counts.atrasadas ? `${counts.atrasadas} retirada${counts.atrasadas === 1 ? "" : "s"} precisa${counts.atrasadas === 1 ? "" : "m"} de revisão` : counts.hoje ? `${counts.hoje} retirada${counts.hoje === 1 ? "" : "s"} para hoje` : "Agenda organizada"} detail={`${counts.agendadas} agendadas no histórico`} metrics={[{label:"Hoje",value:counts.hoje,tone:counts.hoje?"attention":"neutral"},{label:"Atrasadas",value:counts.atrasadas,tone:counts.atrasadas?"critical":"neutral"},{label:"Realizadas",value:counts.realizadas,tone:"positive"}]}/></div> : null}
        </ListPageHeader>

        <section className="space-y-4 px-5 pt-4">
          {activePersonId ? <WithdrawalBatchPlanner key={activePersonId} rows={filtered.filter(row => row.person_id === activePersonId)} onSave={rescheduleRetiradas}/> : null}
          {(counts.atrasadas > 0 || counts.hoje > 0) ? <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={!counts.hoje} onClick={() => { trigger("vibrate"); setStatus("hoje"); }} className="min-h-12 rounded-2xl border border-amber-400/20 bg-amber-400/[.06] px-3 text-left disabled:opacity-35"><strong className="block text-xs text-amber-200">Hoje · {counts.hoje}</strong><span className="text-[9px] text-ink-muted">Abrir agenda atual</span></button>
            <button type="button" disabled={!counts.atrasadas} onClick={() => { trigger("vibrate"); setStatus("atrasada"); }} className="min-h-12 rounded-2xl border border-coral/20 bg-coral/[.06] px-3 text-left disabled:opacity-35"><strong className="block text-xs text-coral">Atrasadas · {counts.atrasadas}</strong><span className="text-[9px] text-ink-muted">Revisar pendências</span></button>
          </div> : null}
          <button type="button" onClick={() => { trigger("vibrate"); navigateWithReturn("/saude/fornecimento"); }} className="flex min-h-[56px] w-full items-center justify-between rounded-[18px] border border-emerald-400/20 bg-emerald-400/[.05] px-3.5 py-3 text-left"><span><span className="block text-xs font-bold text-emerald-300">Fornecimento SUS e documentos</span><span className="mt-0.5 block text-[9px] text-ink-muted">Autorizações, anexos e preparo das próximas retiradas</span></span><ChevronRight size={16} className="text-emerald-300"/></button>
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
                  ? () => navigateWithReturn("/saude/retiradas/nova")
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
                          className="overflow-hidden rounded-[20px] border border-surface-border/50 bg-surface shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() =>
                      toggle(setExpandedMonths, month.key)
                    }
                    className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left active:bg-surface-raised/45"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
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

                          const medicationEntity =
                            medicationMap.get(
                              medication.medicamentoId
                            );

                          const regulatoryProfile =
                            regulatoryProfiles[
                              medication.medicamentoId
                            ];

                          const regulatorySurface =
                            getMedicationRegulatorySurface(
                              regulatoryProfile
                            );

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
                                  <div
                                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] border ${regulatorySurface.iconClass} ${regulatorySurface.glowClass}`}
                                    title={
                                      regulatoryProfile?.label ||
                                      "Classificação regulatória não confirmada"
                                    }
                                  >
                                    <MedicationFormatIcon formato={medication.formato} cores={medication.cores} size={18} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex min-w-0 items-center gap-2">
                                      <p className="truncate text-[13px] font-semibold text-ink-primary">
                                        {medication.nome}
                                      </p>
                                      {regulatoryProfile && (
                                        <span
                                          className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[8px] font-bold uppercase ${regulatorySurface.badgeClass}`}
                                        >
                                          {regulatoryProfile.label}
                                        </span>
                                      )}
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

                                      const isOverdue =
                                        retirada.status === "agendada" &&
                                        retirada.data < hoje;

                                      return (
                                        <button
                                          type="button"
                                          key={retirada.id}
                                          onClick={() => {
                                            trigger("vibrate");
                        navigateWithReturn(
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
                                            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-emerald-400/15 bg-emerald-400/5 text-emerald-300">
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
                                              <WithdrawalPreparationView withdrawalId={retirada.id!} compact overview={supplyOverview} sourceNotesById={sourceNotesById}/>
                                              <div className="flex flex-wrap items-center gap-1.5">
                                                <p className="text-[11px] font-semibold text-ink-primary">
                                                  Retirada
                                                </p>
                                                {retirada.data === hoje &&
                                                  retirada.status ===
                                                    "agendada" && (
                                                  <span className="rounded-full bg-amber-400/10 px-1.5 py-0.5 text-[8px] font-bold uppercase text-amber-300">
                                                    Hoje
                                                  </span>
                                                )}

                                                {isOverdue && (
                                                  <span className="rounded-full bg-coral/10 px-1.5 py-0.5 text-[8px] font-bold uppercase text-coral">
                                                    Atrasada
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
