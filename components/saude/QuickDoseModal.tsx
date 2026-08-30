// components/saude/QuickDoseModal.tsx
"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AnimatePresence,
  motion,
} from "framer-motion";

import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  Droplet,
  Loader2,
  Minus,
  Pill,
  Plus,
  Search,
  Sparkles,
  StickyNote,
  Syringe,
  Timer,
  X,
  Zap,
} from "lucide-react";

import {
  useMedicamentos,
} from "@/hooks/useMedicamentos";

import {
  useActivePersonId,
} from "@/hooks/useActivePersonId";

import {
  useDoseLogs,
} from "@/hooks/useDoseLogs";

import {
  doseLogsRepository,
} from "@/lib/repositories/doseLogs";

import {
  getLocalTodayISO,
} from "@/lib/health-utils";

import {
  useHapticFeedback,
} from "@/lib/haptics";

import {
  useToast,
} from "@/components/ToastProvider";

import type {
  DoseLog,
  Medicamento,
} from "@/lib/types";

// ============================================================
// TIPOS
// ============================================================

interface QuickDoseModalProps {
  isOpen: boolean;
  onClose: () => void;

  /*
   * Quando informado, abre diretamente para um medicamento
   * específico.
   */
  preselectedMedicamentoId?: string;

  onSuccess?: () => void;
}

type DoseMode =
  | "scheduled"
  | "ad-hoc";

// ============================================================
// HELPERS — HORÁRIO
// ============================================================

function handleTimeMask(
  value: string
): string {
  const clean =
    value
      .replace(
        /\D/g,
        ""
      )
      .slice(
        0,
        4
      );

  if (
    clean.length >
    2
  ) {
    return `${clean.slice(
      0,
      2
    )}:${clean.slice(
      2
    )}`;
  }

  return clean;
}

function isValidTime(
  value: string
): boolean {
  const match =
    /^(\d{2}):(\d{2})$/.exec(
      value
    );

  if (!match) {
    return false;
  }

  const hours =
    Number(
      match[1]
    );

  const minutes =
    Number(
      match[2]
    );

  return (
    Number.isInteger(
      hours
    ) &&
    Number.isInteger(
      minutes
    ) &&
    hours >=
      0 &&
    hours <=
      23 &&
    minutes >=
      0 &&
    minutes <=
      59
  );
}

function getCurrentTime(): string {
  const now =
    new Date();

  return `${String(
    now.getHours()
  ).padStart(
    2,
    "0"
  )}:${String(
    now.getMinutes()
  ).padStart(
    2,
    "0"
  )}`;
}

function timeToMinutes(
  value: string
): number {
  if (
    !isValidTime(
      value
    )
  ) {
    return Number.POSITIVE_INFINITY;
  }

  const [
    hour,
    minute,
  ] =
    value
      .split(":")
      .map(Number);

  return (
    hour *
      60 +
    minute
  );
}

// ============================================================
// HELPERS — MEDICAMENTO / DOSE
// ============================================================

function normalizeSchedules(
  medicamento?: Medicamento
): string[] {
  if (
    !medicamento ||
    medicamento.tipo_uso !==
      "continuo" ||
    !Array.isArray(
      medicamento.estoque_horarios
    )
  ) {
    return [];
  }

  return Array.from(
    new Set(
      medicamento.estoque_horarios
        .map(
          (horario) =>
            horario
              ?.trim()
        )
        .filter(
          (
            horario
          ): horario is string =>
            Boolean(
              horario
            ) &&
            isValidTime(
              horario
            )
        )
    )
  ).sort(
    (
      first,
      second
    ) =>
      timeToMinutes(
        first
      ) -
      timeToMinutes(
        second
      )
  );
}

function isTakenLog(
  log: DoseLog
): boolean {
  return Boolean(
    log.tomado_em
  );
}

function findRecommendedSchedule(
  medicamento: Medicamento,
  doseLogs: DoseLog[]
): string | null {
  const schedules =
    normalizeSchedules(
      medicamento
    );

  if (
    schedules.length ===
    0
  ) {
    return null;
  }

  const medicationLogs =
    doseLogs.filter(
      (log) =>
        log.medicamento_id ===
        medicamento.id
    );

  const takenSchedules =
    new Set(
      medicationLogs
        .filter(
          isTakenLog
        )
        .map(
          (log) =>
            log.horario
        )
    );

  const pendingSchedules =
    schedules.filter(
      (horario) =>
        !takenSchedules.has(
          horario
        )
    );

  /*
   * Se todas as doses programadas já foram tomadas,
   * mantemos a rotina e selecionamos o horário mais próximo.
   *
   * Como setStatus é idempotente, uma segunda confirmação
   * daquele mesmo slot não descontará estoque novamente.
   */
  const candidates =
    pendingSchedules.length >
    0
      ? pendingSchedules
      : schedules;

  const currentMinutes =
    timeToMinutes(
      getCurrentTime()
    );

  return (
    [...candidates].sort(
      (
        first,
        second
      ) =>
        Math.abs(
          timeToMinutes(
            first
          ) -
            currentMinutes
        ) -
        Math.abs(
          timeToMinutes(
            second
          ) -
            currentMinutes
        )
    )[0] ||
    null
  );
}

function resolveDefaultDoseQuantity(
  medicamento?: Medicamento
): number {
  const candidate =
    Number(
      medicamento
        ?.estoque_unidade_por_dose
    );

  if (
    Number.isFinite(
      candidate
    ) &&
    candidate >
      0
  ) {
    return candidate;
  }

  return 1;
}

function resolveQuantityStep(
  medicamento?: Medicamento
): number {
  const configured =
    Number(
      medicamento
        ?.estoque_unidade_por_dose
    );

  /*
   * Se a dose configurada já utiliza fração,
   * permitimos ajuste em 0,5.
   */
  if (
    Number.isFinite(
      configured
    ) &&
    configured %
      1 !==
      0
  ) {
    return 0.5;
  }

  /*
   * Gotas costumam ser registradas em unidades inteiras.
   */
  const formato =
    String(
      medicamento?.formato ||
        ""
    ).toLowerCase();

  if (
    formato.includes(
      "gota"
    )
  ) {
    return 1;
  }

  return 0.5;
}

function formatQuantity(
  value: number
): string {
  if (
    Number.isInteger(
      value
    )
  ) {
    return String(
      value
    );
  }

  return value
    .toFixed(2)
    .replace(
      /\.00$/,
      ""
    )
    .replace(
      /(\.\d)0$/,
      "$1"
    )
    .replace(
      ".",
      ","
    );
}

// ============================================================
// ÍCONES
// ============================================================

interface SplitPillIconProps {
  size?: number;
  fill?: string;
}

const SplitPillIcon = ({
  size = 20,
  fill = "currentColor",
}: SplitPillIconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle
      cx="12"
      cy="12"
      r="10"
      fill={fill}
    />

    <line
      x1="12"
      y1="2"
      x2="12"
      y2="22"
      stroke="rgba(0,0,0,0.3)"
      strokeWidth="2"
    />
  </svg>
);

function getMedicineIcon(
  formato?: string
) {
  const normalized =
    formato
      ?.toLowerCase()
      .trim() ||
    "";

  if (
    normalized.includes(
      "partido"
    )
  ) {
    return SplitPillIcon;
  }

  if (
    normalized.includes(
      "gota"
    )
  ) {
    return Droplet;
  }

  if (
    normalized.includes(
      "injecao"
    ) ||
    normalized.includes(
      "injeção"
    )
  ) {
    return Syringe;
  }

  if (
    normalized.includes(
      "adesivo"
    )
  ) {
    return StickyNote;
  }

  if (
    normalized.includes(
      "comprimido"
    ) ||
    normalized.includes(
      "inteiro"
    )
  ) {
    return Circle;
  }

  return Pill;
}

// ============================================================
// COMPONENTE
// ============================================================

export function QuickDoseModal({
  isOpen,
  onClose,
  preselectedMedicamentoId,
  onSuccess,
}: QuickDoseModalProps) {
  const {
    trigger,
  } =
    useHapticFeedback();

  const {
    showToast,
  } =
    useToast();

  const {
    medicamentos:
      rawMedicamentos,
  } =
    useMedicamentos();

  const {
    activePersonId,
  } =
    useActivePersonId();

  const today =
    getLocalTodayISO();

  const {
    doseLogs,
  } =
    useDoseLogs(
      today
    );

  // ==========================================================
  // MEDICAMENTOS DISPONÍVEIS
  // ==========================================================

  const medicamentosAtivos =
    useMemo(
      () => {
        if (
          !activePersonId ||
          !rawMedicamentos
        ) {
          return [];
        }

        return rawMedicamentos.filter(
          (
            medicamento:
              Medicamento
          ) =>
            medicamento.status !==
              "descontinuado" &&
            medicamento.person_id ===
              activePersonId
        );
      },
      [
        rawMedicamentos,
        activePersonId,
      ]
    );

  // ==========================================================
  // ESTADO
  // ==========================================================

  const [
    doseMedId,
    setDoseMedId,
  ] =
    useState("");

  const [
    doseQtd,
    setDoseQtd,
  ] =
    useState(1);

  const [
    doseHora,
    setDoseHora,
  ] =
    useState("");

  const [
    searchQuery,
    setSearchQuery,
  ] =
    useState("");

  const [
    isSaving,
    setIsSaving,
  ] =
    useState(false);

  // ==========================================================
  // MEDICAMENTO SELECIONADO
  // ==========================================================

  const targetMedicationId =
    preselectedMedicamentoId ||
    doseMedId;

  const selectedMed =
    medicamentosAtivos.find(
      (
        medicamento
      ) =>
        medicamento.id ===
        targetMedicationId
    );

  const horariosProgramados =
    useMemo(
      () =>
        normalizeSchedules(
          selectedMed
        ),
      [
        selectedMed,
      ]
    );

  const existingScheduledLog =
    useMemo(
      () => {
        if (
          !selectedMed?.id ||
          !doseHora
        ) {
          return undefined;
        }

        return doseLogs.find(
          (log) =>
            log.medicamento_id ===
              selectedMed.id &&
            log.data ===
              today &&
            log.horario ===
              doseHora
        );
      },
      [
        doseLogs,
        doseHora,
        selectedMed?.id,
        today,
      ]
    );

  const doseMode:
    DoseMode =
    selectedMed?.tipo_uso ===
      "continuo" &&
    horariosProgramados.includes(
      doseHora
    )
      ? "scheduled"
      : "ad-hoc";

  const scheduledAlreadyTaken =
    doseMode ===
      "scheduled" &&
    Boolean(
      existingScheduledLog
        ?.tomado_em
    );

  const quantityStep =
    resolveQuantityStep(
      selectedMed
    );

  // ==========================================================
  // RESET / ABERTURA
  // ==========================================================

  useEffect(
    () => {
      if (
        !isOpen
      ) {
        return;
      }

      setSearchQuery(
        ""
      );

      if (
        preselectedMedicamentoId
      ) {
        setDoseMedId(
          preselectedMedicamentoId
        );

        return;
      }

      setDoseMedId(
        ""
      );

      setDoseQtd(
        1
      );

      setDoseHora(
        getCurrentTime()
      );
    },
    [
      isOpen,
      preselectedMedicamentoId,
    ]
  );

  /*
   * Sempre que o medicamento selecionado mudar, o modal
   * recalcula quantidade e horário sugeridos.
   *
   * Para medicamento contínuo, prioriza um slot da rotina
   * ainda pendente.
   *
   * Para SOS/esporádico, usa a hora atual.
   */
  useEffect(
    () => {
      if (
        !isOpen ||
        !selectedMed
      ) {
        return;
      }

      setDoseQtd(
        resolveDefaultDoseQuantity(
          selectedMed
        )
      );

      if (
        selectedMed.tipo_uso ===
        "continuo"
      ) {
        const recommended =
          findRecommendedSchedule(
            selectedMed,
            doseLogs
          );

        setDoseHora(
          recommended ||
            getCurrentTime()
        );
      } else {
        setDoseHora(
          getCurrentTime()
        );
      }
    },
    [
      isOpen,
      selectedMed?.id,
    ]
  );

  // ==========================================================
  // BUSCA
  // ==========================================================

  const filteredMedicamentos =
    useMemo(
      () => {
        const normalizedQuery =
          searchQuery
            .toLowerCase()
            .trim();

        if (
          !normalizedQuery
        ) {
          return medicamentosAtivos;
        }

        return medicamentosAtivos.filter(
          (
            medicamento
          ) => {
            const nome =
              medicamento.nome
                ?.toLowerCase() ||
              "";

            const dosagem =
              medicamento.dosagem
                ?.toLowerCase() ||
              "";

            return (
              nome.includes(
                normalizedQuery
              ) ||
              dosagem.includes(
                normalizedQuery
              )
            );
          }
        );
      },
      [
        medicamentosAtivos,
        searchQuery,
      ]
    );

  // ==========================================================
  // SELEÇÃO
  // ==========================================================

  const handleSelectMedication =
    (
      medicamento:
        Medicamento
    ) => {
      if (
        !medicamento.id ||
        isSaving
      ) {
        return;
      }

      trigger(
        "vibrate"
      );

      setDoseMedId(
        medicamento.id
      );
    };

  const handleSelectSchedule =
    (
      horario:
        string
    ) => {
      if (
        isSaving
      ) {
        return;
      }

      trigger(
        "vibrate"
      );

      setDoseHora(
        horario
      );
    };

  const handleDecreaseQuantity =
    () => {
      if (
        isSaving
      ) {
        return;
      }

      trigger(
        "vibrate"
      );

      setDoseQtd(
        (
          current
        ) =>
          Math.max(
            quantityStep,
            Number(
              (
                current -
                quantityStep
              ).toFixed(
                3
              )
            )
          )
      );
    };

  const handleIncreaseQuantity =
    () => {
      if (
        isSaving
      ) {
        return;
      }

      trigger(
        "vibrate"
      );

      setDoseQtd(
        (
          current
        ) =>
          Number(
            (
              current +
              quantityStep
            ).toFixed(
              3
            )
          )
      );
    };

  // ==========================================================
  // CLOSE
  // ==========================================================

  const handleClose =
    () => {
      if (
        isSaving
      ) {
        return;
      }

      trigger(
        "vibrate"
      );

      onClose();
    };

  // ==========================================================
  // SALVAR
  // ==========================================================

  const handleSalvar =
    async () => {
      if (
        isSaving
      ) {
        return;
      }

      if (
        !activePersonId
      ) {
        trigger(
          "error"
        );

        showToast(
          "Pessoa ativa não identificada.",
          "error"
        );

        return;
      }

      if (
        !selectedMed?.id
      ) {
        trigger(
          "error"
        );

        showToast(
          "Selecione um medicamento.",
          "error"
        );

        return;
      }

      if (
        !isValidTime(
          doseHora
        )
      ) {
        trigger(
          "error"
        );

        showToast(
          "Informe um horário válido.",
          "error"
        );

        return;
      }

      if (
        !Number.isFinite(
          doseQtd
        ) ||
        doseQtd <=
          0
      ) {
        trigger(
          "error"
        );

        showToast(
          "Informe uma quantidade válida.",
          "error"
        );

        return;
      }

      setIsSaving(
        true
      );

      trigger(
        "vibrate"
      );

      try {
        /*
         * Dose programada:
         *
         * medicamento + pessoa + data + horário
         *
         * É um slot único.
         */
        if (
          doseMode ===
          "scheduled"
        ) {
          await doseLogsRepository.setStatus({
            personId:
              activePersonId,

            medicamentoId:
              selectedMed.id,

            data:
              today,

            horario:
              doseHora,

            status:
              "taken",

            quantidade:
              doseQtd,
          });
        } else {
          /*
           * SOS / esporádica / horário fora da rotina:
           *
           * cada confirmação representa um evento independente.
           */
          await doseLogsRepository.registrarTomadaAvulsa({
            personId:
              activePersonId,

            medicamentoId:
              selectedMed.id,

            data:
              today,

            horario:
              doseHora,

            quantidade:
              doseQtd,
          });
        }

        if (
          typeof window !==
          "undefined"
        ) {
          window.dispatchEvent(
            new Event(
              "sync:process"
            )
          );
        }

        trigger(
          "success"
        );

        showToast(
          doseMode ===
            "scheduled"
            ? scheduledAlreadyTaken
              ? `Registro de ${selectedMed.nome} atualizado.`
              : `Dose de ${selectedMed.nome} registrada.`
            : `Tomada de ${selectedMed.nome} registrada.`,
          "success"
        );

        onSuccess?.();

        onClose();
      } catch (
        error:
          unknown
      ) {
        console.error(
          "[QuickDoseModal] Falha ao registrar dose:",
          error
        );

        trigger(
          "error"
        );

        showToast(
          error instanceof
          Error
            ? error.message
            : "Erro ao registrar dose.",
          "error"
        );
      } finally {
        setIsSaving(
          false
        );
      }
    };

  // ==========================================================
  // CLOSED
  // ==========================================================

  if (
    !isOpen
  ) {
    return null;
  }

  // ==========================================================
  // VISUAL
  // ==========================================================

  const IconComp =
    getMedicineIcon(
      selectedMed?.formato
    );

  const color =
    selectedMed
      ?.cores?.[0] ||
    "#8B5CF6";

  const stockQuantity =
    selectedMed
      ?.estoque_quantidade;

  const stockUnit =
    selectedMed
      ?.estoque_unidade_medida ||
    "unidade(s)";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-void/80 p-0 backdrop-blur-md sm:items-center sm:p-4"
      onClick={
        handleClose
      }
    >
      <motion.div
        initial={{
          opacity:
            0,

          y:
            50,

          scale:
            0.98,
        }}
        animate={{
          opacity:
            1,

          y:
            0,

          scale:
            1,
        }}
        exit={{
          opacity:
            0,

          y:
            50,

          scale:
            0.98,
        }}
        transition={{
          type:
            "spring",

          stiffness:
            280,

          damping:
            28,
        }}
        onClick={
          (
            event
          ) =>
            event.stopPropagation()
        }
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[32px] border border-surface-border bg-surface shadow-2xl sm:rounded-[32px]"
      >
        {/* ==================================================
            HANDLE MOBILE
            ================================================== */}

        <div className="flex justify-center pb-1 pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-surface-border" />
        </div>

        <div className="space-y-5 p-6 pt-4 sm:pt-6">
          {/* ==================================================
              HEADER
              ================================================== */}

          <div className="flex items-start justify-between gap-3 border-b border-surface-border/40 pb-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-400">
                <Zap
                  size={
                    21
                  }
                  fill="currentColor"
                />
              </div>

              <div className="min-w-0">
                <h3 className="font-display text-base font-bold text-ink-primary">
                  Registrar Dose
                </h3>

                <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                  A tomada entra no histórico e ajusta o estoque quando configurado.
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={
                isSaving
              }
              onClick={
                handleClose
              }
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-raised text-ink-muted transition-all hover:text-ink-primary active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Fechar"
            >
              <X
                size={
                  18
                }
              />
            </button>
          </div>

          {/* ==================================================
              SEM PESSOA ATIVA
              ================================================== */}

          {!activePersonId && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4">
              <AlertTriangle
                size={
                  18
                }
                className="mt-0.5 shrink-0 text-amber-400"
              />

              <div>
                <p className="text-sm font-semibold text-amber-300">
                  Pessoa ativa necessária
                </p>

                <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                  Selecione uma pessoa ativa antes de registrar uma dose.
                </p>
              </div>
            </div>
          )}

          {/* ==================================================
              SELEÇÃO DO MEDICAMENTO
              ================================================== */}

          {!preselectedMedicamentoId && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <label className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                  Medicamento
                </label>

                <span className="text-[10px] text-ink-faint">
                  {
                    filteredMedicamentos.length
                  }{" "}
                  disponível
                  {filteredMedicamentos.length ===
                  1
                    ? ""
                    : "is"}
                </span>
              </div>

              <div className="relative">
                <Search
                  size={
                    16
                  }
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
                />

                <input
                  type="text"
                  placeholder="Buscar medicamento ou dosagem..."
                  value={
                    searchQuery
                  }
                  disabled={
                    isSaving
                  }
                  onChange={
                    (
                      event
                    ) =>
                      setSearchQuery(
                        event.target.value
                      )
                  }
                  className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised py-3 pl-9 pr-4 text-sm text-ink-primary outline-none transition-colors focus:border-emerald-400/50 disabled:opacity-50"
                />
              </div>

              {filteredMedicamentos.length >
              0 ? (
                <div className="-mx-6 flex gap-2.5 overflow-x-auto px-6 pb-2 scrollbar-hide">
                  {filteredMedicamentos.map(
                    (
                      medicamento
                    ) => {
                      if (
                        !medicamento.id
                      ) {
                        return null;
                      }

                      const isSelected =
                        doseMedId ===
                        medicamento.id;

                      const MedIcon =
                        getMedicineIcon(
                          medicamento.formato
                        );

                      const medicineColor =
                        medicamento
                          .cores?.[0] ||
                        "#8B5CF6";

                      return (
                        <button
                          type="button"
                          key={
                            medicamento.id
                          }
                          disabled={
                            isSaving
                          }
                          onClick={
                            () =>
                              handleSelectMedication(
                                medicamento
                              )
                          }
                          className={`flex w-[92px] flex-shrink-0 flex-col items-center gap-2 rounded-[20px] border p-3 transition-all active:scale-95 disabled:opacity-50 ${
                            isSelected
                              ? "border-emerald-400 bg-emerald-400/10 shadow-md shadow-emerald-400/5"
                              : "border-surface-border/50 bg-surface-raised"
                          }`}
                        >
                          <div
                            className="flex h-11 w-11 items-center justify-center rounded-full border"
                            style={{
                              backgroundColor:
                                `${medicineColor}15`,

                              borderColor:
                                `${medicineColor}40`,

                              color:
                                medicineColor,
                            }}
                          >
                            <MedIcon
                              size={
                                21
                              }
                            />
                          </div>

                          <span className="w-full truncate text-center text-[10px] font-semibold text-ink-primary">
                            {
                              medicamento.nome
                            }
                          </span>

                          {medicamento.dosagem && (
                            <span className="-mt-1 w-full truncate text-center text-[9px] text-ink-muted">
                              {
                                medicamento.dosagem
                              }
                            </span>
                          )}
                        </button>
                      );
                    }
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-surface-border/50 bg-surface-raised p-4 text-center">
                  <Pill
                    size={
                      20
                    }
                    className="mx-auto mb-2 text-ink-faint"
                  />

                  <p className="text-xs text-ink-muted">
                    Nenhum medicamento ativo encontrado para a pessoa selecionada.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ==================================================
              MEDICAMENTO ATUAL
              ================================================== */}

          {selectedMed && (
            <div className="flex items-center gap-3 rounded-[22px] border border-surface-border/50 bg-surface-raised p-3.5">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border"
                style={{
                  backgroundColor:
                    `${color}15`,

                  borderColor:
                    `${color}40`,

                  color,
                }}
              >
                <IconComp
                  size={
                    23
                  }
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink-primary">
                  {
                    selectedMed.nome
                  }
                </p>

                <p className="mt-0.5 truncate text-xs text-ink-muted">
                  {selectedMed.dosagem ||
                    "Dosagem não informada"}
                </p>

                {typeof stockQuantity ===
                  "number" && (
                  <p
                    className={`mt-1 text-[10px] font-medium ${
                      stockQuantity <=
                      0
                        ? "text-coral"
                        : "text-ink-faint"
                    }`}
                  >
                    Estoque:{" "}
                    <span className="font-bold">
                      {
                        formatQuantity(
                          stockQuantity
                        )
                      }{" "}
                      {
                        stockUnit
                      }
                    </span>
                  </p>
                )}
              </div>

              <span
                className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-bold uppercase ${
                  selectedMed.tipo_uso ===
                  "continuo"
                    ? "bg-ice/10 text-ice"
                    : "bg-amber-400/10 text-amber-400"
                }`}
              >
                {selectedMed.tipo_uso ===
                "continuo"
                  ? "Contínuo"
                  : "SOS"}
              </span>
            </div>
          )}

          {preselectedMedicamentoId &&
            !selectedMed && (
              <div className="flex items-start gap-3 rounded-2xl border border-coral/30 bg-coral/10 p-4">
                <AlertTriangle
                  size={
                    18
                  }
                  className="mt-0.5 shrink-0 text-coral"
                />

                <div>
                  <p className="text-sm font-semibold text-coral">
                    Medicamento indisponível
                  </p>

                  <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                    O medicamento não existe, está suspenso ou não pertence à pessoa ativa.
                  </p>
                </div>
              </div>
            )}

          {/* ==================================================
              TIPO DE REGISTRO
              ================================================== */}

          {selectedMed && (
            <AnimatePresence mode="wait">
              <motion.div
                key={
                  doseMode
                }
                initial={{
                  opacity:
                    0,

                  y:
                    4,
                }}
                animate={{
                  opacity:
                    1,

                  y:
                    0,
                }}
                exit={{
                  opacity:
                    0,

                  y:
                    -4,
                }}
                className={`flex items-start gap-3 rounded-2xl border p-3.5 ${
                  doseMode ===
                  "scheduled"
                    ? scheduledAlreadyTaken
                      ? "border-emerald-400/30 bg-emerald-400/10"
                      : "border-ice/30 bg-ice/10"
                    : "border-amber-400/30 bg-amber-400/10"
                }`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    doseMode ===
                    "scheduled"
                      ? scheduledAlreadyTaken
                        ? "bg-emerald-400/10 text-emerald-400"
                        : "bg-ice/10 text-ice"
                      : "bg-amber-400/10 text-amber-400"
                  }`}
                >
                  {doseMode ===
                  "scheduled" ? (
                    scheduledAlreadyTaken ? (
                      <CheckCircle2
                        size={
                          17
                        }
                      />
                    ) : (
                      <Timer
                        size={
                          17
                        }
                      />
                    )
                  ) : (
                    <Sparkles
                      size={
                        17
                      }
                    />
                  )}
                </div>

                <div className="min-w-0">
                  <p
                    className={`text-xs font-bold ${
                      doseMode ===
                      "scheduled"
                        ? scheduledAlreadyTaken
                          ? "text-emerald-400"
                          : "text-ice"
                        : "text-amber-400"
                    }`}
                  >
                    {doseMode ===
                    "scheduled"
                      ? scheduledAlreadyTaken
                        ? "Dose programada já registrada"
                        : "Dose programada"
                      : "Tomada avulsa"}
                  </p>

                  <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
                    {doseMode ===
                    "scheduled"
                      ? scheduledAlreadyTaken
                        ? "Confirmar novamente atualizará este mesmo horário, sem descontar o estoque duas vezes."
                        : "Este horário faz parte da rotina diária configurada para o medicamento."
                      : selectedMed.tipo_uso ===
                          "continuo"
                        ? "O horário informado está fora da rotina cadastrada e será salvo como uma tomada adicional."
                        : "Cada confirmação cria um novo evento no histórico, inclusive se houver outra tomada no mesmo horário."}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          )}

          {/* ==================================================
              HORÁRIOS PROGRAMADOS
              ================================================== */}

          {selectedMed?.tipo_uso ===
              "continuo" &&
            horariosProgramados.length >
              0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                    Rotina de hoje
                  </label>

                  <span className="text-[10px] text-ink-faint">
                    Toque para selecionar
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {horariosProgramados.map(
                    (
                      horario
                    ) => {
                      const existing =
                        doseLogs.find(
                          (
                            log
                          ) =>
                            log.medicamento_id ===
                              selectedMed.id &&
                            log.data ===
                              today &&
                            log.horario ===
                              horario
                        );

                      const taken =
                        Boolean(
                          existing?.tomado_em
                        );

                      const selected =
                        doseHora ===
                        horario;

                      return (
                        <button
                          type="button"
                          key={
                            horario
                          }
                          disabled={
                            isSaving
                          }
                          onClick={
                            () =>
                              handleSelectSchedule(
                                horario
                              )
                          }
                          className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 font-mono text-xs font-bold transition-all active:scale-95 disabled:opacity-50 ${
                            selected
                              ? taken
                                ? "border-emerald-400 bg-emerald-400/15 text-emerald-400"
                                : "border-ice bg-ice/15 text-ice"
                              : taken
                                ? "border-emerald-400/20 bg-emerald-400/5 text-emerald-400"
                                : "border-surface-border/60 bg-surface-raised text-ink-muted"
                          }`}
                        >
                          {taken && (
                            <Check
                              size={
                                11
                              }
                            />
                          )}

                          {
                            horario
                          }
                        </button>
                      );
                    }
                  )}
                </div>
              </div>
            )}

          {/* ==================================================
              QUANTIDADE / HORÁRIO
              ================================================== */}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                Quantidade
              </label>

              <div className="flex h-[52px] items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-2">
                <button
                  type="button"
                  disabled={
                    isSaving
                  }
                  onClick={
                    handleDecreaseQuantity
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-surface-border/60 bg-surface text-ink-primary transition-all active:scale-90 disabled:opacity-50"
                  aria-label="Diminuir quantidade"
                >
                  <Minus
                    size={
                      15
                    }
                  />
                </button>

                <span className="min-w-10 text-center text-base font-bold tabular-nums text-ink-primary">
                  {
                    formatQuantity(
                      doseQtd
                    )
                  }
                </span>

                <button
                  type="button"
                  disabled={
                    isSaving
                  }
                  onClick={
                    handleIncreaseQuantity
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-surface-border/60 bg-surface text-ink-primary transition-all active:scale-90 disabled:opacity-50"
                  aria-label="Aumentar quantidade"
                >
                  <Plus
                    size={
                      15
                    }
                  />
                </button>
              </div>

              {selectedMed && (
                <p className="truncate px-1 text-[9px] text-ink-faint">
                  {selectedMed.estoque_unidade_medida ||
                    "Unidade(s) por tomada"}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                Horário
              </label>

              <div className="relative">
                <Clock
                  size={
                    16
                  }
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
                />

                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={
                    5
                  }
                  disabled={
                    isSaving
                  }
                  value={
                    doseHora
                  }
                  onChange={
                    (
                      event
                    ) => {
                      setDoseHora(
                        handleTimeMask(
                          event.target.value
                        )
                      );
                    }
                  }
                  onBlur={
                    () => {
                      if (
                        doseHora &&
                        !isValidTime(
                          doseHora
                        )
                      ) {
                        trigger(
                          "error"
                        );
                      }
                    }
                  }
                  className={`h-[52px] w-full rounded-2xl border bg-surface-raised py-3 pl-9 pr-4 font-mono text-sm font-bold text-ink-primary outline-none transition-colors disabled:opacity-50 ${
                    doseHora &&
                    !isValidTime(
                      doseHora
                    )
                      ? "border-coral/60 focus:border-coral"
                      : "border-surface-border/50 focus:border-emerald-400/50"
                  }`}
                  placeholder="00:00"
                />
              </div>

              <p className="truncate px-1 text-[9px] text-ink-faint">
                Data: hoje
              </p>
            </div>
          </div>

          {/* ==================================================
              AVISO DE ESTOQUE NEGATIVO / INSUFICIENTE
              ================================================== */}

          {selectedMed &&
            typeof stockQuantity ===
              "number" &&
            stockQuantity <
              doseQtd && (
              <div className="flex items-start gap-2.5 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3.5">
                <AlertTriangle
                  size={
                    16
                  }
                  className="mt-0.5 shrink-0 text-amber-400"
                />

                <p className="text-[11px] leading-relaxed text-ink-muted">
                  A quantidade registrada é maior que o saldo informado. A tomada ainda pode ser registrada; o estoque ficará negativo para preservar o histórico e sinalizar que precisa ser reconciliado.
                </p>
              </div>
            )}

          {/* ==================================================
              CONFIRMAR
              ================================================== */}

          <button
            type="button"
            onClick={
              handleSalvar
            }
            disabled={
              isSaving ||
              !activePersonId ||
              !selectedMed ||
              !isValidTime(
                doseHora
              ) ||
              !Number.isFinite(
                doseQtd
              ) ||
              doseQtd <=
                0
            }
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-4 font-bold text-void shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2
                  size={
                    18
                  }
                  className="animate-spin"
                />

                Registrando...
              </>
            ) : scheduledAlreadyTaken ? (
              <>
                <CheckCircle2
                  size={
                    18
                  }
                />

                Atualizar Dose
              </>
            ) : (
              <>
                <Zap
                  size={
                    18
                  }
                  fill="currentColor"
                />

                Confirmar Tomada
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}