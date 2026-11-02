"use client";
import { memo, useLayoutEffect, useMemo, useRef } from "react";
import { relevantDoseProcessingId } from "@/lib/today/card-render-scope";
import { motion } from "framer-motion";
import { AlertOctagon, AlertTriangle, Calendar, CheckCircle2, ChevronRight, Circle, Clock, RotateCcw, Stethoscope, Trash2, X, XCircle, Zap } from "lucide-react";
import { MedicationFormatIcon } from "@/components/saude/MedicationFormatIcon";
import { TodaySymptomTimelineCard } from "@/components/hoje/TodaySymptomTimelineCard";
import { describeTodayDoseStatus } from "@/components/hoje/TodayDoseStatusPresentation";
import { getMedicationRegulatorySurface } from "@/lib/medication-regulatory-visual";
import { getDiasRestantesEstilo } from "@/lib/today/withdrawal-urgency-presentation";
import type { TodayTimelineItem } from "@/lib/today/build-timeline-items";
import type { useMedicationRegulatoryProfiles } from "@/hooks/useMedicationRegulatoryProfiles";

/** Only the read-only rendering is extracted. Mutation handlers belong to Hoje. */
export type TodayDoseTimelineCardScope = {
  isHoje: boolean;
  isPassado: boolean;
  isFuturo: boolean;
  horaAtual: string;
  regulatoryProfiles: ReturnType<typeof useMedicationRegulatoryProfiles>;
  processandoDoseId: string | null;
  trigger: (kind: "vibrate") => void;
  router: { push: (href:string) => void };
  medicamentosById: Map<string, any>;
  setMedicamentoSelecionado: (med: any) => void;
  setModalAberto: (open: boolean) => void;
  abrirRevisaoHistorica: (item: TodayTimelineItem) => void;
  isHistoricalProcessing: boolean;
  handleCancelPlannedDose: (item: TodayTimelineItem) => Promise<void>;
  isProcessing: boolean;
  handleIgnorar: (item: TodayTimelineItem) => Promise<void>;
  handleToggle: (item: TodayTimelineItem) => Promise<void>;
};

type TodayDoseCardProps = {item: TodayTimelineItem; scope: TodayDoseTimelineCardScope};

/**
 * M21: light shell rerenders with Hoje, while the heavy 30 KB JSX is memoized.
 * Event delegates always call the scope from the LAST COMMITTED render.
 * That is essential for owner/date switches and retroactive review operations.
 * No database or mutation logic is introduced into this visual component.
 */
export function TodayDoseTimelineCard({item,scope}: TodayDoseCardProps) {
  const committedScope = useRef(scope);
  useLayoutEffect(() => { committedScope.current = scope; }, [scope]);
  const commands = useMemo(() => ({
    trigger: (kind: "vibrate") => committedScope.current.trigger(kind),
    router: {push: (href: string) => committedScope.current.router.push(href)},
    setMedicamentoSelecionado: (med: any) => committedScope.current.setMedicamentoSelecionado(med),
    setModalAberto: (open: boolean) => committedScope.current.setModalAberto(open),
    abrirRevisaoHistorica: (target: TodayTimelineItem) => committedScope.current.abrirRevisaoHistorica(target),
    handleCancelPlannedDose: (target: TodayTimelineItem) => committedScope.current.handleCancelPlannedDose(target),
    handleIgnorar: (target: TodayTimelineItem) => committedScope.current.handleIgnorar(target),
    handleToggle: (target: TodayTimelineItem) => committedScope.current.handleToggle(target),
  }), []);

  // An unrelated medication or dose entering processing must not invalidate
  // this card. The body needs only its own catalog and medication reference.
  const regulatoryProfile = item.medicamentoId ? scope.regulatoryProfiles[item.medicamentoId] : undefined;
  const medication = item.medicamentoId ? scope.medicamentosById.get(item.medicamentoId) : undefined;
  const processingId = relevantDoseProcessingId(item, scope.processandoDoseId);
  const regulatoryProfiles = useMemo<TodayDoseTimelineCardScope["regulatoryProfiles"]>(
    () => item.medicamentoId && regulatoryProfile ? {[item.medicamentoId]: regulatoryProfile} : {},
    [item.medicamentoId, regulatoryProfile]
  );
  const medicationsById = useMemo(
    () => item.medicamentoId && medication ? new Map<string, any>([[item.medicamentoId, medication]]) : new Map<string, any>(),
    [item.medicamentoId, medication]
  );
  const visualScope = useMemo<TodayDoseTimelineCardScope>(() => ({
    isHoje: scope.isHoje,
    isPassado: scope.isPassado,
    isFuturo: scope.isFuturo,
    horaAtual: scope.horaAtual,
    regulatoryProfiles,
    processandoDoseId: processingId,
    trigger: commands.trigger,
    router: commands.router,
    medicamentosById: medicationsById,
    setMedicamentoSelecionado: commands.setMedicamentoSelecionado,
    setModalAberto: commands.setModalAberto,
    abrirRevisaoHistorica: commands.abrirRevisaoHistorica,
    isHistoricalProcessing: scope.isHistoricalProcessing,
    handleCancelPlannedDose: commands.handleCancelPlannedDose,
    isProcessing: scope.isProcessing,
    handleIgnorar: commands.handleIgnorar,
    handleToggle: commands.handleToggle,
  }), [
    scope.isHoje, scope.isPassado, scope.isFuturo, scope.horaAtual,
    scope.isHistoricalProcessing, scope.isProcessing,
    regulatoryProfiles, processingId, medicationsById, commands,
  ]);
  return <MemoTodayDoseTimelineCardBody item={item} scope={visualScope} />;
}

/** The original visual JSX and every button remain untouched below. */
const MemoTodayDoseTimelineCardBody = memo(function TodayDoseTimelineCardBody({item,scope}: TodayDoseCardProps) {
  const {isHoje, isPassado, isFuturo, horaAtual, regulatoryProfiles, processandoDoseId, trigger, router, medicamentosById, setMedicamentoSelecionado, setModalAberto, abrirRevisaoHistorica, isHistoricalProcessing, handleCancelPlannedDose, isProcessing, handleIgnorar, handleToggle} = scope;
                          if (item.isSintoma) {
                            return <TodaySymptomTimelineCard key={`sintoma-${item.sintomaId}`} item={item} onOpen={() => {
                              trigger("vibrate");
                              router.push(`/saude/registros/detalhes?id=${item.sintomaId}`);
                            }}/>
                          }

                          const isAtrasado =
                            isHoje &&
                            !item.isDataConflict &&
                            !item.tomada &&
                            !item.ignorada &&
                            item.horario <
                              horaAtual &&
                            (!item.isAvulsa || item.doseKind === "planned");

                          const isProximo =
                            isHoje &&
                            !item.isDataConflict &&
                            !item.tomada &&
                            !item.ignorada &&
                            item.horario >=
                              horaAtual &&
                            (!item.isAvulsa || item.doseKind === "planned");

                          const isPrevistoFuturo =
                            isFuturo &&
                            !item.isDataConflict &&
                            !item.tomada &&
                            !item.ignorada &&
                            !item.isAvulsa;

                          const isHistoricoSemConfirmacao =
                            isPassado &&
                            !item.isDataConflict &&
                            item.isExpectedUnconfirmed &&
                            !item.tomada &&
                            !item.ignorada &&
                            !item.isAvulsa;

                          const isEstoqueZerado =
                            (item.estoqueRestante ??
                              0) <= 0;

                          const tratamentoCor =
                            item.tratamentoCor ||
                            item.cor ||
                            "#8B5CF6";

                          const regulatoryProfile =
                            item.medicamentoId
                              ? regulatoryProfiles[
                                  item.medicamentoId
                                ]
                              : undefined;

                          const regulatorySurface =
                            getMedicationRegulatorySurface(
                              regulatoryProfile
                            );

                          const isProcessando =
                            processandoDoseId ===
                            (item.logId
                              ? `log-${item.logId}`
                              : `${item.medicamentoId}-${item.horario}`);

                          const diasEstilo =
                            getDiasRestantesEstilo(
                              item.diasRestantes
                            );

                          const {statusIcon,statusText,statusColor} = describeTodayDoseStatus({
                            item,isPrevistoFuturo,isHistoricoSemConfirmacao: Boolean(isHistoricoSemConfirmacao),isAtrasado,isProximo,
                          });

                          return (
                            <motion.div
                              key={
                                item.logId ||
                                `${item.medicamentoId}-${item.horario}`
                              }
                              role="button"
                              tabIndex={0}
                              aria-label="Abrir detalhes do medicamento"
                              onClick={() => {
                                if (!item.medicamentoId) return;

                                trigger("vibrate");

                                router.push(
                                  "/saude/medicamentos/detalhes?id=" +
                                    item.medicamentoId
                                );
                              }}
                              onKeyDown={(event) => {
                                // A tecla de um botão interno pertence à própria ação,
                                // não à navegação do cartão que o contém.
                                if (event.target !== event.currentTarget) return;
                                if (
                                  event.key !== "Enter" &&
                                  event.key !== " "
                                ) return;

                                event.preventDefault();

                                if (item.medicamentoId) {
                                  router.push(
                                    "/saude/medicamentos/detalhes?id=" +
                                      item.medicamentoId
                                  );
                                }
                              }}
                              whileTap={{
                                scale: 0.99,
                              }}
                              style={{
                                borderLeft: `4px solid ${regulatorySurface.rail}`,
                              }}
                              className={`group relative w-full cursor-pointer rounded-[18px] border px-3 py-2.5 pr-8 text-left shadow-sm transition-all ${
                                item.isDataConflict
                                  ? "border-amber-300/30 bg-amber-300/[0.055]"
                                  : item.tomada
                                  ? "border-emerald-400/30 bg-emerald-400/5 opacity-90"
                                  : item.ignorada
                                  ? "border-ink-muted/20 bg-surface-raised/50 opacity-60"
                                  : isPrevistoFuturo
                                  ? "border-violet-400/25 bg-violet-400/[0.045]"
                                  : isHistoricoSemConfirmacao
                                  ? "border-ice/20 bg-ice/[0.035]"
                                  : isAtrasado
                                  ? "border-coral/50 bg-coral/5"
                                  : isProximo
                                  ? "border-amber-400/20 bg-amber-400/5"
                                  : "border-surface-border/50 bg-surface"
                              } ${
                                isProcessando
                                  ? "pointer-events-none opacity-50"
                                  : ""
                              }`}
                            >
                              <ChevronRight
                                size={16}
                                aria-hidden="true"
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ice/60 transition-transform group-active:translate-x-0.5"
                              />

                              <div className="space-y-1.5">
                                <div className="flex items-start gap-2.5">
                                  <div className="shrink-0 pt-0.5">
                                    {item.isDataConflict ? (
                                      <AlertOctagon size={20} className="text-amber-300" />
                                    ) : item.tomada ? (
                                      <CheckCircle2
                                        size={20}
                                        className="text-emerald-400"
                                      />
                                    ) : item.ignorada ? (
                                      <XCircle
                                        size={20}
                                        className="text-ink-muted"
                                      />
                                    ) : (
                                      <Circle
                                        size={20}
                                        className="text-ink-faint"
                                      />
                                    )}
                                  </div>

                                  {!item.isSintoma && item.medicamentoId && (
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-surface-border/60 bg-void/55">
                                      <MedicationFormatIcon
                                        formato={item.formato}
                                        cores={item.cores}
                                        size={20}
                                      />
                                    </div>
                                  )}

                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                      <span
                                        className={`inline-flex items-center gap-1 font-mono text-[10px] font-bold ${statusColor}`}
                                      >
                                        {statusIcon}
                                        {statusText}
                                      </span>

                                      <span className="text-[10px] text-ink-faint">
                                        •
                                      </span>

                                      <span className="font-mono text-[10px] text-ink-faint">
                                        {
                                          item.horario
                                        }
                                      </span>

                                      {item.isAvulsa && (
                                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-400">
                                          {item.doseKind === "planned" ? <Clock size={10} /> : <Zap size={10} />}
                                          {item.doseKind === "planned" ? "Agendada" : "SOS / Avulsa"}
                                        </span>
                                      )}
                                    </div>

                                    <div className="mt-0.5 flex min-w-0 items-baseline gap-2">
                                      <p
                                      className={`min-w-0 truncate text-sm font-semibold ${
                                        item.ignorada
                                          ? "text-ink-muted line-through"
                                          : "text-ink-primary"
                                      }`}
                                    >
                                      {
                                        item.medicamentoNome
                                      }
                                    </p>

                                    {item.dosagem && (
                                      <span className="shrink-0 text-[11px] font-medium text-ink-muted">
                                        {
                                          item.dosagem
                                        }
                                      </span>
                                    )}

                                    {regulatoryProfile && (
                                      <span
                                        className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[8px] font-bold uppercase ${regulatorySurface.badgeClass}`}
                                        title={regulatoryProfile.detail}
                                      >
                                        {regulatoryProfile.label}
                                      </span>
                                    )}
                                    </div>

                                    {item.isAvulsa &&
                                      item.motivoAvulsa && (
                                        <p className="mt-2 w-fit max-w-full rounded-lg border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-xs font-medium text-amber-300">
                                          Motivo:{" "}
                                          {
                                            item.motivoAvulsa
                                          }
                                        </p>
                                      )}

                                    {(item.tratamentoNome ||
                                      item.medicoNome ||
                                      item.farmaciaNome) && (
                                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                        {item.tratamentoNome &&
                                          item.tratamentoId && (
                                            <span
                                              className="max-w-full truncate rounded-md px-2 py-0.5 text-[9px] font-bold uppercase"
                                              style={{
                                                backgroundColor: `${tratamentoCor}20`,
                                                color: tratamentoCor,
                                              }}
                                            >
                                              {
                                                item.tratamentoNome
                                              }
                                            </span>
                                          )}

                                        {item.medicoNome && (
                                          <span className="flex max-w-full items-center gap-1 truncate text-[10px] text-ink-muted">
                                            <Stethoscope
                                              size={
                                                10
                                              }
                                              className="shrink-0"
                                            />
                                            <span className="truncate">
                                              Dr(a).{" "}
                                              {
                                                item.medicoNome
                                              }
                                            </span>
                                          </span>
                                        )}
                                      </div>
                                    )}

                                    {!item.isAvulsa && (
                                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                        <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[10px] text-ink-muted">
                                          Dose: {item.unidadePorDose !== undefined
                                            ? `${item.unidadePorDose} ${item.unidadeDose || "unidades"}`
                                            : "quantidade não informada"}
                                        </span>
                                        {(
                                          item.estoqueRestante ??
                                          0
                                        ) >= 0 && (
                                          <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[10px] text-ink-muted">
                                            Estoque:{" "}
                                            {
                                              item.estoqueRestante
                                            }{" "}
                                            {
                                              item.unidadeMedida
                                            }
                                          </span>
                                        )}

                                        {/* VAULT_RENEWAL_SEMANTICS_V78 */}
                                        {item.insight?.deveRenovar === true &&
                                          item.diasRestantes !== undefined &&
                                          item.diasRestantes !== null &&
                                          item.diasRestantes <= 90 && (
                                            <span
                                              title={item.insight.mensagem}
                                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${diasEstilo.cor} ${diasEstilo.bg}`}
                                            >
                                              <Calendar size={11} />
                                              {item.diasRestantes <= 0
                                                ? "Renovar agora"
                                                : `Renovar em ${item.diasRestantes} dia${item.diasRestantes === 1 ? "" : "s"}`}
                                            </span>
                                          )}
                                      </div>
                                    )}

                                    {!item.isAvulsa &&
                                      isEstoqueZerado && (
                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                          <span className="flex items-center gap-1.5 text-[10px] font-bold text-coral">
                                            <AlertTriangle
                                              size={
                                                14
                                              }
                                            />
                                            Estoque zerado!
                                          </span>

                                          <button
                                            type="button"
                                            onClick={(
                                              e
                                            ) => {
                                              e.stopPropagation();

                                              trigger(
                                                "vibrate"
                                              );

                                              const med = item.medicamentoId
                                                ? medicamentosById.get(item.medicamentoId)
                                                : undefined;

                                              if (
                                                med
                                              ) {
                                                setMedicamentoSelecionado(
                                                  med
                                                );

                                                setModalAberto(
                                                  true
                                                );
                                              }
                                            }}
                                            className="rounded-full bg-coral/20 px-2.5 py-1 text-[9px] font-bold text-coral transition-colors hover:bg-coral/30"
                                          >
                                            Renovar
                                          </button>
                                        </div>
                                      )}
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-end gap-1.5 pt-1">
                                  {!isHoje &&
                                  !item.isAvulsa ? (
                                    isPassado ? (
                                      <button
                                        type="button"
                                        onClick={(
                                          e
                                        ) => {
                                          e.stopPropagation();

                                          abrirRevisaoHistorica(
                                            item
                                          );
                                        }}
                                        disabled={
                                          isHistoricalProcessing
                                        }
                                        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[9px] font-bold transition-all active:scale-95 disabled:opacity-50 ${
                                          item.tomada
                                            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                                            : item.ignorada
                                              ? "border-surface-border/50 bg-surface-raised text-ink-muted"
                                              : "border-ice/30 bg-ice/10 text-ice"
                                        }`}
                                      >
                                        {item.tomada ? (
                                          <>
                                            <CheckCircle2
                                              size={
                                                12
                                              }
                                            />
                                            Revisar tomada
                                          </>
                                        ) : item.ignorada ? (
                                          <>
                                            <XCircle
                                              size={
                                                12
                                              }
                                            />
                                            Revisar
                                          </>
                                        ) : (
                                          <>
                                            <Clock
                                              size={
                                                12
                                              }
                                            />
                                            Revisar histórico
                                          </>
                                        )}
                                      </button>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/20 bg-violet-400/10 px-2.5 py-1 text-[9px] font-medium text-violet-300">
                                        <Clock
                                          size={
                                            11
                                          }
                                        />
                                        Prevista
                                      </span>
                                    )
                                  ) : (
                                    <>
                                      {!isHoje &&
                                        item.doseKind === "planned" &&
                                        !item.isDataConflict &&
                                        !item.tomada &&
                                        !item.ignorada && (
                                          <button
                                            type="button"
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              void handleCancelPlannedDose(item);
                                            }}
                                            disabled={isProcessando || isProcessing}
                                            className="inline-flex min-h-8 items-center gap-1 rounded-full border border-coral/25 bg-coral/10 px-3 py-1 text-[9px] font-semibold text-coral transition-all active:scale-95 disabled:opacity-50"
                                          >
                                            <X size={12} />
                                            Cancelar agendamento
                                          </button>
                                        )}

                                      {!item.tomada &&
                                        !item.ignorada &&
                                        isHoje &&
                                        !item.isDataConflict &&
                                        (!item.isAvulsa || item.doseKind === "planned") && (
                                          <>
                                            {!item.isAvulsa && <button
                                              type="button"
                                              onClick={(
                                                e
                                              ) => {
                                                e.stopPropagation();

                                                handleIgnorar(
                                                  item
                                                );
                                              }}
                                              disabled={
                                                isProcessando ||
                                                isProcessing
                                              }
                                              className="rounded-full border border-surface-border/50 bg-surface-raised px-2.5 py-1 text-[9px] font-medium text-ink-muted transition-all hover:bg-ink-muted/10 active:scale-95 disabled:opacity-50"
                                            >
                                              Ignorar
                                            </button>}

                                            <button
                                              type="button"
                                              onClick={(
                                                e
                                              ) => {
                                                e.stopPropagation();

                                                handleToggle(
                                                  item
                                                );
                                              }}
                                              disabled={
                                                isProcessando ||
                                                isProcessing
                                              }
                                              className="inline-flex items-center gap-1 rounded-full bg-emerald-400 px-3 py-1 text-[9px] font-bold text-void shadow-sm transition-all hover:bg-emerald-300 active:scale-95 disabled:opacity-50"
                                            >
                                              <CheckCircle2
                                                size={
                                                  13
                                                }
                                              />

                                              {isProcessando
                                                ? "..."
                                                : "Tomar"}
                                            </button>
                                          </>
                                        )}

                                      {item.tomada && (
                                        <button
                                          type="button"
                                          onClick={(
                                            e
                                          ) => {
                                            e.stopPropagation();

                                            handleToggle(
                                              item
                                            );
                                          }}
                                          disabled={
                                            isProcessando ||
                                            isProcessing
                                          }
                                          className="inline-flex items-center gap-1 rounded-full border border-surface-border/50 bg-surface-raised px-2.5 py-1 text-[9px] font-medium text-ink-muted transition-all hover:bg-ink-muted/10 active:scale-95 disabled:opacity-50"
                                        >
                                          {item.isAvulsa && item.doseKind !== "planned" ? (
                                            <>
                                              <Trash2
                                                size={
                                                  12
                                                }
                                              />
                                              Excluir
                                            </>
                                          ) : (
                                            <>
                                              <RotateCcw
                                                size={
                                                  12
                                                }
                                              />
                                              Desfazer
                                            </>
                                          )}
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          );

});
