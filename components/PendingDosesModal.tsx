// components/PendingDosesModal.tsx
"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  motion,
} from "framer-motion";

import {
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Loader2,
  Pill,
  Timer,
  X,
} from "lucide-react";

import {
  useHapticFeedback,
} from "@/lib/haptics";

export type PendingDose = {
  medicamentoId: string;

  nome: string;

  /**
   * Dia original do slot.
   *
   * Uma dose de ontem continua sendo de ontem mesmo
   * quando é resolvida hoje.
   */
  data: string;

  horario: string;

  diaLabel:
    | "Hoje"
    | "Ontem";
};

export type PendingDoseResolution =
  | {
      kind:
        "scheduled";
    }
  | {
      kind:
        "now";
    }
  | {
      kind:
        "custom";

      /**
       * datetime-local:
       * YYYY-MM-DDTHH:mm
       */
      takenAtLocal:
        string;
    }
  | {
      kind:
        "ignored";
    };

interface PendingDosesModalProps {
  isOpen:
    boolean;

  onClose:
    () => void;

  doses:
    PendingDose[];

  onResolveDose:
    (
      dose:
        PendingDose,
      resolution:
        PendingDoseResolution
    ) =>
      Promise<void>;

  isProcessingDose:
    string | null;

  onExpand:
    () => void;
}

function getCurrentTimeHHMM(): string {
  return new Date()
    .toLocaleTimeString(
      "pt-BR",
      {
        hour:
          "2-digit",

        minute:
          "2-digit",

        hour12:
          false,
      }
    );
}

function getDoseKey(
  dose:
    PendingDose
): string {
  return [
    dose.data,
    dose.medicamentoId,
    dose.horario,
  ].join(
    ":"
  );
}

function getDefaultCustomValue(
  dose:
    PendingDose
): string {
  return `${dose.data}T${dose.horario}`;
}

export function PendingDosesModal({
  isOpen,
  onClose,
  doses,
  onResolveDose,
  isProcessingDose,
  onExpand,
}: PendingDosesModalProps) {
  const {
    trigger,
  } =
    useHapticFeedback();

  const [
    selectedDoseKey,
    setSelectedDoseKey,
  ] =
    useState<
      string | null
    >(
      null
    );

  const [
    customTakenAt,
    setCustomTakenAt,
  ] =
    useState(
      ""
    );

  const [
    customTimeOpen,
    setCustomTimeOpen,
  ] =
    useState(
      false
    );

  const existeProcessamento =
    Boolean(
      isProcessingDose
    );

  const selectedDose =
    useMemo(
      () =>
        doses.find(
          (
            dose
          ) =>
            getDoseKey(
              dose
            ) ===
            selectedDoseKey
        ) ??
        null,
      [
        doses,
        selectedDoseKey,
      ]
    );

  const dosesOntem =
    doses.filter(
      (
        dose
      ) =>
        dose.diaLabel ===
        "Ontem"
    ).length;

  const dosesHoje =
    doses.length -
    dosesOntem;

  useEffect(
    () => {
      if (
        isOpen
      ) {
        return;
      }

      setSelectedDoseKey(
        null
      );

      setCustomTakenAt(
        ""
      );

      setCustomTimeOpen(
        false
      );
    },
    [
      isOpen,
    ]
  );

  useEffect(
    () => {
      if (
        !isOpen
      ) {
        return;
      }

      const handleKeyDown =
        (
          event:
            KeyboardEvent
        ) => {
          if (
            event.key !==
            "Escape"
          ) {
            return;
          }

          if (
            existeProcessamento
          ) {
            return;
          }

          if (
            selectedDoseKey
          ) {
            trigger(
              "vibrate"
            );

            setSelectedDoseKey(
              null
            );

            setCustomTimeOpen(
              false
            );

            return;
          }

          trigger(
            "vibrate"
          );

          onClose();
        };

      window.addEventListener(
        "keydown",
        handleKeyDown
      );

      return () => {
        window.removeEventListener(
          "keydown",
          handleKeyDown
        );
      };
    },
    [
      isOpen,
      existeProcessamento,
      selectedDoseKey,
      onClose,
      trigger,
    ]
  );

  if (
    !isOpen
  ) {
    return null;
  }

  const handleClose =
    () => {
      if (
        existeProcessamento
      ) {
        return;
      }

      if (
        selectedDoseKey
      ) {
        trigger(
          "vibrate"
        );

        setSelectedDoseKey(
          null
        );

        setCustomTimeOpen(
          false
        );

        return;
      }

      trigger(
        "vibrate"
      );

      onClose();
    };

  const handleExpand =
    () => {
      if (
        existeProcessamento
      ) {
        return;
      }

      trigger(
        "vibrate"
      );

      onExpand();
    };

  const handleSelectDose =
    (
      dose:
        PendingDose
    ) => {
      if (
        existeProcessamento
      ) {
        return;
      }

      trigger(
        "vibrate"
      );

      setSelectedDoseKey(
        getDoseKey(
          dose
        )
      );

      setCustomTakenAt(
        getDefaultCustomValue(
          dose
        )
      );

      setCustomTimeOpen(
        false
      );
    };

  const handleResolve =
    async (
      resolution:
        PendingDoseResolution
    ) => {
      if (
        !selectedDose ||
        existeProcessamento
      ) {
        return;
      }

      trigger(
        "vibrate"
      );

      await onResolveDose(
        selectedDose,
        resolution
      );

      setSelectedDoseKey(
        null
      );

      setCustomTimeOpen(
        false
      );
    };

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-end justify-center bg-void/80 p-4 backdrop-blur-md sm:items-center"
      onPointerDown={
        (
          event
        ) => {
          if (
            event.target ===
            event.currentTarget
          ) {
            handleClose();
          }
        }
      }
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pending-doses-title"
        aria-describedby="pending-doses-description"
        initial={{
          opacity:
            0,

          y:
            50,

          scale:
            0.96,
        }}
        animate={{
          opacity:
            1,

          y:
            0,

          scale:
            1,
        }}
        onPointerDown={
          (
            event
          ) =>
            event.stopPropagation()
        }
        className="w-full max-w-md space-y-5 rounded-[32px] border border-surface-border bg-surface p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-1.5 flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-coral/10 text-coral">
                <Clock3
                  size={
                    16
                  }
                />
              </div>

              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-coral">
                Rotina pendente
              </p>
            </div>

            <h3
              id="pending-doses-title"
              className="font-display text-lg font-bold text-ink-primary"
            >
              Doses para revisar
            </h3>

            <p
              id="pending-doses-description"
              className="mt-1 text-xs leading-relaxed text-ink-muted"
            >
              {doses.length ===
              0
                ? "Nenhuma dose precisa de revisão agora."
                : `${doses.length} ${
                    doses.length ===
                    1
                      ? "dose precisa"
                      : "doses precisam"
                  } ser resolvida${
                    doses.length ===
                    1
                      ? ""
                      : "s"
                  } individualmente.`}
            </p>

            {doses.length >
              0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {dosesOntem >
                  0 && (
                  <span className="rounded-full border border-coral/20 bg-coral/5 px-2.5 py-1 text-[9px] font-semibold text-coral">
                    {
                      dosesOntem
                    }{" "}
                    de ontem
                  </span>
                )}

                {dosesHoje >
                  0 && (
                  <span className="rounded-full border border-amber-400/20 bg-amber-400/5 px-2.5 py-1 text-[9px] font-semibold text-amber-400">
                    {
                      dosesHoje
                    }{" "}
                    de hoje
                  </span>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={
              handleClose
            }
            disabled={
              existeProcessamento
            }
            aria-label="Fechar doses pendentes"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-raised text-ink-muted transition-all active:scale-95 disabled:opacity-40"
          >
            <X
              size={
                16
              }
            />
          </button>
        </div>

        {selectedDose ? (
          <div className="space-y-4">
            <div className="rounded-[22px] border border-surface-border/50 bg-surface-raised p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice">
                  <Pill
                    size={
                      17
                    }
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-ink-primary">
                      {
                        selectedDose.nome
                      }
                    </p>

                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                        selectedDose.diaLabel ===
                        "Ontem"
                          ? "bg-coral/10 text-coral"
                          : "bg-amber-400/10 text-amber-400"
                      }`}
                    >
                      {
                        selectedDose.diaLabel
                      }
                    </span>
                  </div>

                  <p className="mt-1 font-mono text-[10px] text-ink-muted">
                    Programada para{" "}
                    {
                      selectedDose.horario
                    }
                  </p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-ink-primary">
                O que aconteceu com esta dose?
              </p>

              <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
                Isso ajuda o Vault a diferenciar atraso na tomada de atraso apenas no registro.
              </p>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                disabled={
                  existeProcessamento
                }
                onClick={
                  () =>
                    void handleResolve({
                      kind:
                        "scheduled",
                    })
                }
                className="flex w-full items-center gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-3.5 text-left active:scale-[0.99] disabled:opacity-50"
              >
                <CheckCircle2
                  size={
                    18
                  }
                  className="shrink-0 text-emerald-400"
                />

                <span>
                  <span className="block text-sm font-semibold text-ink-primary">
                    Tomei às{" "}
                    {
                      selectedDose.horario
                    }
                  </span>

                  <span className="mt-0.5 block text-[10px] text-ink-muted">
                    Só esqueci de registrar.
                  </span>
                </span>
              </button>

              {selectedDose.diaLabel ===
                "Hoje" && (
                <button
                  type="button"
                  disabled={
                    existeProcessamento
                  }
                  onClick={
                    () =>
                      void handleResolve({
                        kind:
                          "now",
                      })
                  }
                  className="flex w-full items-center gap-3 rounded-2xl border border-ice/25 bg-ice/10 p-3.5 text-left active:scale-[0.99] disabled:opacity-50"
                >
                  <Timer
                    size={
                      18
                    }
                    className="shrink-0 text-ice"
                  />

                  <span>
                    <span className="block text-sm font-semibold text-ink-primary">
                      Tomei agora ·{" "}
                      {
                        getCurrentTimeHHMM()
                      }
                    </span>

                    <span className="mt-0.5 block text-[10px] text-ink-muted">
                      Registrar como tomada atrasada.
                    </span>
                  </span>
                </button>
              )}

              <button
                type="button"
                disabled={
                  existeProcessamento
                }
                onClick={
                  () => {
                    trigger(
                      "vibrate"
                    );

                    setCustomTimeOpen(
                      (
                        value
                      ) =>
                        !value
                    );
                  }
                }
                className="flex w-full items-center gap-3 rounded-2xl border border-surface-border bg-surface-raised p-3.5 text-left active:scale-[0.99] disabled:opacity-50"
              >
                <CalendarClock
                  size={
                    18
                  }
                  className="shrink-0 text-ink-muted"
                />

                <span>
                  <span className="block text-sm font-semibold text-ink-primary">
                    Tomei em outro horário
                  </span>

                  <span className="mt-0.5 block text-[10px] text-ink-muted">
                    Informe quando a dose realmente foi tomada.
                  </span>
                </span>
              </button>

              {customTimeOpen && (
                <div className="rounded-2xl border border-ice/20 bg-ice/5 p-3.5">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                    Data e hora reais
                  </label>

                  <input
                    type="datetime-local"
                    value={
                      customTakenAt
                    }
                    onChange={
                      (
                        event
                      ) =>
                        setCustomTakenAt(
                          event.target.value
                        )
                    }
                    className="mt-2 w-full rounded-xl border border-surface-border bg-void px-3 py-2.5 text-sm text-ink-primary outline-none focus:border-ice/40"
                  />

                  <button
                    type="button"
                    disabled={
                      existeProcessamento ||
                      !customTakenAt
                    }
                    onClick={
                      () =>
                        void handleResolve({
                          kind:
                            "custom",

                          takenAtLocal:
                            customTakenAt,
                        })
                    }
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-ice px-3 py-2.5 text-xs font-bold text-void disabled:opacity-50"
                  >
                    {existeProcessamento ? (
                      <Loader2
                        size={
                          14
                        }
                        className="animate-spin"
                      />
                    ) : (
                      <CheckCircle2
                        size={
                          14
                        }
                      />
                    )}

                    Confirmar horário real
                  </button>
                </div>
              )}

              <button
                type="button"
                disabled={
                  existeProcessamento
                }
                onClick={
                  () =>
                    void handleResolve({
                      kind:
                        "ignored",
                    })
                }
                className="flex w-full items-center gap-3 rounded-2xl border border-coral/25 bg-coral/10 p-3.5 text-left active:scale-[0.99] disabled:opacity-50"
              >
                <X
                  size={
                    18
                  }
                  className="shrink-0 text-coral"
                />

                <span>
                  <span className="block text-sm font-semibold text-ink-primary">
                    Não tomei
                  </span>

                  <span className="mt-0.5 block text-[10px] text-ink-muted">
                    Marcar esta dose como não tomada.
                  </span>
                </span>
              </button>
            </div>

            <button
              type="button"
              disabled={
                existeProcessamento
              }
              onClick={
                () => {
                  trigger(
                    "vibrate"
                  );

                  setSelectedDoseKey(
                    null
                  );

                  setCustomTimeOpen(
                    false
                  );
                }
              }
              className="w-full rounded-xl py-2.5 text-xs font-semibold text-ink-muted"
            >
              Voltar para pendências
            </button>
          </div>
        ) : (
          <>
            <div className="max-h-[48vh] space-y-2 overflow-y-auto pr-1">
              {doses.length ===
              0 ? (
                <div className="rounded-[22px] border border-emerald-400/20 bg-emerald-400/5 px-4 py-6 text-center">
                  <CheckCircle2
                    size={
                      24
                    }
                    className="mx-auto text-emerald-400"
                  />

                  <p className="mt-2 text-sm font-semibold text-ink-primary">
                    Tudo em dia
                  </p>
                </div>
              ) : (
                doses.map(
                  (
                    dose
                  ) => {
                    const processingKey =
                      getDoseKey(
                        dose
                      );

                    const isProcessing =
                      isProcessingDose ===
                      processingKey;

                    return (
                      <button
                        type="button"
                        key={
                          processingKey
                        }
                        onClick={
                          () =>
                            handleSelectDose(
                              dose
                            )
                        }
                        disabled={
                          existeProcessamento
                        }
                        className={`flex w-full items-center justify-between gap-3 rounded-2xl border border-surface-border/50 bg-surface-raised p-3.5 text-left active:scale-[0.99] disabled:opacity-55`}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                              dose.diaLabel ===
                              "Ontem"
                                ? "bg-coral/10 text-coral"
                                : "bg-amber-400/10 text-amber-400"
                            }`}
                          >
                            <Pill
                              size={
                                16
                              }
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-semibold text-ink-primary">
                                {
                                  dose.nome
                                }
                              </p>

                              <span
                                className={`shrink-0 rounded-full px-2 py-0.5 text-[8px] font-bold ${
                                  dose.diaLabel ===
                                  "Ontem"
                                    ? "bg-coral/10 text-coral"
                                    : "bg-amber-400/10 text-amber-400"
                                }`}
                              >
                                {
                                  dose.diaLabel
                                }
                              </span>
                            </div>

                            <p className="mt-0.5 font-mono text-[10px] text-ink-muted">
                              {
                                dose.horario
                              }
                            </p>
                          </div>
                        </div>

                        {isProcessing ? (
                          <Loader2
                            size={
                              15
                            }
                            className="shrink-0 animate-spin text-ice"
                          />
                        ) : (
                          <ChevronRight
                            size={
                              15
                            }
                            className="shrink-0 text-ink-faint"
                          />
                        )}
                      </button>
                    );
                  }
                )
              )}
            </div>

            <button
              type="button"
              onClick={
                handleExpand
              }
              disabled={
                existeProcessamento
              }
              className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-surface-raised p-3.5 text-xs font-semibold text-ink-primary active:scale-95 disabled:opacity-50"
            >
              Ver cronograma

              <ChevronRight
                size={
                  14
                }
              />
            </button>

            {doses.length >
              1 && (
              <p className="text-center text-[9px] leading-relaxed text-ink-faint">
                Cada dose é revisada separadamente para preservar o horário real da tomada.
              </p>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
