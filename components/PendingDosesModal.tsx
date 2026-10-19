// components/PendingDosesModal.tsx
"use client";
import { pendingDoseCustomTime } from "@/lib/pending-dose-review";
import { HealthDateTimePicker } from "@/components/saude/HealthDateTimePicker";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  motion,
} from "framer-motion";

import {
  ArrowLeft,
  PackageX,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Loader2,
  Timer,
  X,
} from "lucide-react";

import {
  useHapticFeedback,
} from "@/lib/haptics";

import { MedicationFormatIcon } from "@/components/saude/MedicationFormatIcon";

export type PendingDose = {
  stockUnavailable?: boolean;
  medicamentoId: string;

  nome: string;

  formato?: string;

  cores?: string[];

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

export type PendingDoseResolution = { requireRegisteredStock?: boolean } & (
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
      motivo?: string;
    });

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
  return pendingDoseCustomTime(dose);
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

  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [bulkResolutionOpen, setBulkResolutionOpen] = useState(false);

  const existeProcessamento =
    Boolean(
      isProcessingDose
    ) ||
    isProcessingAll;

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

  const { availableDoses, unavailableDoses, doseGroups, dosesOntem } = useMemo(() => {
    const available: PendingDose[] = [], unavailable: PendingDose[] = [], yesterday: PendingDose[] = [], today: PendingDose[] = [];
    for (const dose of doses) {
      (dose.stockUnavailable ? unavailable : available).push(dose);
      (dose.diaLabel === "Ontem" ? yesterday : today).push(dose);
    }
    return {
      availableDoses: available,
      unavailableDoses: unavailable,
      dosesOntem: yesterday.length,
      doseGroups: [
        { key: "ontem", label: "Pendências anteriores", doses: yesterday },
        { key: "hoje", label: "Hoje", doses: today },
      ].filter(group => group.doses.length > 0),
    };
  }, [doses]);
  const [stockConfirmationOpen, setStockConfirmationOpen] = useState(false);
  const resolutionLock = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [batchError, setBatchError] = useState("");
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(()=>{if(batchError)errorRef.current?.scrollIntoView({block:"center",behavior:"auto"});},[batchError]);

  useEffect(
    () => {
      if (
        isOpen
      ) {
        return;
      }

      setStockConfirmationOpen(false);
      setBulkResolutionOpen(false);
      setBatchError("");
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
          if (event.defaultPrevented || (event.target instanceof Element && event.target.closest('[role="dialog"]') && event.target.closest('[role="dialog"]') !== dialogRef.current)) return;
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

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => { document.body.style.overflow = oldOverflow; if (previous?.isConnected) previous.focus(); };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const frame=requestAnimationFrame(()=>{if(dialogRef.current){dialogRef.current.scrollTop=0;dialogRef.current.focus({preventScroll:true});}});
    return()=>cancelAnimationFrame(frame);
  }, [selectedDoseKey,isOpen]);

  const handleStockBatch = async () => {
    if (existeProcessamento || resolutionLock.current) return;
    resolutionLock.current = true;
    setIsProcessingAll(true); setBatchError("");
    try {
      for (const dose of unavailableDoses) {
        await onResolveDose(dose, {kind:"ignored", motivo:"sem_estoque"});
      }
      setStockConfirmationOpen(false);
    } catch (error) {
      setBatchError(error instanceof Error ? error.message : "Não foi possível salvar o motivo. Revise as pendências restantes.");
    } finally { resolutionLock.current = false; setIsProcessingAll(false); }
  };

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

  const handleResolveAll = async (
    resolution: Extract<
      PendingDoseResolution,
      { kind: "scheduled" | "now" }
    >
  ) => {
    if (existeProcessamento || resolutionLock.current || !availableDoses.length) return;
    resolutionLock.current = true;
    setBatchError("");

    trigger("vibrate");
    setIsProcessingAll(true);

    let successCount = 0;

    try {
      for (const dose of availableDoses) {
        try {
          await onResolveDose(dose, {...resolution, requireRegisteredStock:true});
          successCount += 1;
        } catch (error) {
          setBatchError(error instanceof Error ? error.message : "Uma dose não pôde ser registrada. Revise as pendências.");
        }
      }
    } finally {
      resolutionLock.current = false;
      setIsProcessingAll(false);
    }

    if (successCount === availableDoses.length) {
      setSelectedDoseKey(null);
      setCustomTimeOpen(false);
      setBulkResolutionOpen(false);
    }
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

      setBulkResolutionOpen(false);

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
        !selectedDose || resolutionLock.current ||
        existeProcessamento
      ) {
        return;
      }

      trigger(
        "vibrate"
      );

      setBatchError("");
      resolutionLock.current = true;
      try { await onResolveDose(selectedDose, resolution); }
      catch(e) { setBatchError(e instanceof Error ? e.message : "Não foi possível salvar esta dose."); return; }
      finally { resolutionLock.current = false; }

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
      className="fixed inset-0 z-50 flex items-end justify-center bg-void/80 px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-[max(.5rem,env(safe-area-inset-top))] backdrop-blur-md sm:items-center sm:p-4"
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
        ref={dialogRef}
        tabIndex={-1}
        onKeyDown={event => {
          if (event.key !== "Tab" || !event.currentTarget.contains(event.target as Node)) return;
          const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), [tabindex="0"]')).filter(x=>x.getClientRects().length);
          const first=items[0], last=items[items.length-1];
          if (!first) {event.preventDefault(); return;}
          if (event.shiftKey && (document.activeElement===first || document.activeElement===event.currentTarget)) {event.preventDefault();last.focus();}
          else if (!event.shiftKey && (document.activeElement===last || document.activeElement===event.currentTarget)) {event.preventDefault();first.focus();}
        }}
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
        className="max-h-[calc(100dvh-max(.5rem,env(safe-area-inset-top))-max(.5rem,env(safe-area-inset-bottom)))] w-full max-w-[460px] space-y-3 overflow-y-auto overscroll-contain rounded-t-[24px] border border-surface-border bg-surface p-3 shadow-2xl sm:rounded-[26px] sm:p-4"
      >
        <div className="sticky -top-3 z-20 -mx-3 -mt-3 flex items-start justify-between gap-4 border-b border-surface-border/60 bg-surface/95 px-3 pb-3 pt-3 backdrop-blur-xl sm:-top-4 sm:-mx-4 sm:-mt-4 sm:px-4 sm:pt-4">
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
                  } de revisão. Registre o que aconteceu.`}
            </p>

          </div>

          <button
            type="button"
            onClick={
              handleClose
            }
            disabled={
              existeProcessamento
            }
            aria-label={selectedDose ? "Voltar para pendências" : "Fechar doses pendentes"}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-raised text-ink-muted transition-all active:scale-95 disabled:opacity-40"
          >
            {selectedDose ? <ArrowLeft size={18}/> : <X size={18}/>}
          </button>
        </div>

        {!selectedDose && doses.length > 0 && <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-surface-border/60 bg-void/25" aria-label="Resumo das doses pendentes">
          <div className="px-3 py-2"><strong className="block font-mono text-base text-ink-primary">{doses.length}</strong><span className="text-[8px] font-bold uppercase tracking-wider text-ink-faint">Revisar</span></div>
          <div className="border-x border-surface-border/50 px-3 py-2"><strong className="block font-mono text-base text-coral">{dosesOntem}</strong><span className="text-[8px] font-bold uppercase tracking-wider text-ink-faint">Ontem</span></div>
          <div className="px-3 py-2"><strong className={`block font-mono text-base ${unavailableDoses.length ? "text-amber-300" : "text-emerald-300"}`}>{unavailableDoses.length}</strong><span className="text-[8px] font-bold uppercase tracking-wider text-ink-faint">Sem saldo</span></div>
        </div>}

        {existeProcessamento && <p role="status" aria-live="polite" className="flex min-h-10 items-center gap-2 rounded-xl border border-ice/15 bg-ice/[.05] px-3 text-[10px] text-ice"><Loader2 size={14} className="animate-spin"/>Salvando sem duplicar dose ou estoque…</p>}

        {batchError && <p ref={errorRef} role="alert" className="rounded-xl border border-coral/30 p-3 text-xs text-coral">{batchError}</p>}
        {selectedDose ? (
          <div className="space-y-4">
            <div className="rounded-[22px] border border-surface-border/50 bg-surface-raised p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-surface-border/60 bg-void/55">
                  <MedicationFormatIcon
                    formato={selectedDose.formato}
                    cores={selectedDose.cores}
                    size={24}
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

            {selectedDose.stockUnavailable && <div className="flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/[.055] p-3"><PackageX size={18} className="mt-0.5 shrink-0 text-amber-300"/><div className="min-w-0"><p className="text-xs font-semibold text-amber-100">Estoque cadastrado zerado</p><p className="mt-1 text-[10px] leading-relaxed text-ink-muted">Escolha “faltou medicamento” se você não tomou. Se tomou, registre normalmente e depois confira o estoque.</p><a className="mt-1.5 inline-flex min-h-9 items-center py-2 text-xs font-semibold text-sky-300" href={`/saude/medicamentos/detalhes?id=${encodeURIComponent(selectedDose.medicamentoId)}`}>Conferir estoque e aquisições <ChevronRight size={13}/></a></div></div>}
            <div className="space-y-3">
              {selectedDose.stockUnavailable && <button type="button" disabled={existeProcessamento} onClick={()=>void handleResolve({kind:"ignored",motivo:"sem_estoque"})} className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3 text-left disabled:opacity-50"><PackageX size={19} className="shrink-0 text-amber-300"/><span><span className="block text-sm font-semibold">Não tomei: medicamento em falta</span><span className="mt-0.5 block text-[10px] text-ink-muted">Registra o motivo sem alterar o estoque.</span></span></button>}
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

                  <HealthDateTimePicker value={customTakenAt} onChange={setCustomTakenAt} disabled={existeProcessamento} max={new Date().getFullYear()+"-"+String(new Date().getMonth()+1).padStart(2,"0")+"-"+String(new Date().getDate()).padStart(2,"0")+"T23:59"} className="mt-2" />

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
                    {selectedDose.stockUnavailable ? "Não tomei por outro motivo" : "Não tomei"}
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
            <div className="space-y-2">
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
              ) : doseGroups.map(group => <section key={group.key} aria-labelledby={`pending-group-${group.key}`}>
                <div className="mb-1.5 flex items-end justify-between px-1"><h4 id={`pending-group-${group.key}`} className="text-[10px] font-bold uppercase tracking-[.14em] text-ink-muted">{group.label}</h4><span className="text-[9px] text-ink-faint">{group.doses.length} {group.doses.length===1?"dose":"doses"}</span></div>
                <div className="overflow-hidden rounded-xl border border-surface-border/55 bg-surface-raised/60">{group.doses.map(
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
                        className={`flex min-h-[58px] w-full items-center justify-between gap-3 border-b border-surface-border/45 px-3 py-2.5 text-left last:border-b-0 active:bg-white/[.025] disabled:opacity-55 ${dose.stockUnavailable ? "bg-amber-400/[.035]" : ""}`}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-surface-border/60 bg-void/55">
                            <MedicationFormatIcon
                              formato={dose.formato}
                              cores={dose.cores}
                              size={22}
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="break-words text-sm font-semibold text-ink-primary">
                                {
                                  dose.nome
                                }
                              </p>

                            </div>

                            <p className="mt-1 text-xs text-ink-muted">
                              {
                                dose.horario
                              }
                              {dose.stockUnavailable && <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-medium text-amber-300"><PackageX size={11}/> Estoque zerado</span>}
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
                )}</div>
              </section>)}
            </div>

            {unavailableDoses.length > 0 && <div className="rounded-xl border border-amber-400/20 bg-amber-400/[.04] px-3 py-2.5">
              <div className="flex items-center justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2 text-xs font-semibold text-amber-100"><PackageX size={15}/>{unavailableDoses.length} {unavailableDoses.length===1?"dose com estoque zerado":"doses com estoque zerado"}</div><p className="mt-1 text-[10px] leading-relaxed text-ink-muted">Ficam fora do registro em lote.</p></div>{!stockConfirmationOpen&&<button type="button" disabled={existeProcessamento} onClick={()=>setStockConfirmationOpen(true)} className="min-h-10 shrink-0 rounded-xl border border-amber-400/20 px-3 text-[10px] font-semibold text-amber-200">Resolver faltas</button>}</div>
              {stockConfirmationOpen && <div className="mt-2 border-t border-amber-400/15 pt-2.5"><p className="text-xs leading-relaxed">Confirmar que você não tomou {unavailableDoses.length===1?"esta dose":"essas doses"} porque o medicamento faltou?</p><div className="mt-2 flex gap-2"><button type="button" disabled={existeProcessamento} onClick={()=>void handleStockBatch()} className="min-h-10 flex-1 rounded-xl bg-amber-200 px-3 text-xs font-bold text-void disabled:opacity-50">{isProcessingAll ? "Salvando…" : "Confirmar falta"}</button><button type="button" disabled={existeProcessamento} onClick={()=>setStockConfirmationOpen(false)} className="min-h-10 rounded-xl border border-surface-border px-3 text-xs">Cancelar</button></div></div>}
            </div>}
            {availableDoses.length > 0 && doses.length > 1 && (
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.055] p-3">
                <p className="text-xs font-bold text-ink-primary">
                  Confirmar as doses disponíveis
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-ink-muted">
                  Registra cada dose no dia e horário exibidos. Se alguma foi tomada em outro horário, revise essa dose individualmente.
                </p>
                <button
                  type="button"
                  onClick={() => {
                  trigger("vibrate");
                  setBulkResolutionOpen(true);
                }}
                  disabled={existeProcessamento}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-4 py-3 text-xs font-bold text-void active:scale-[0.98] disabled:opacity-50"
                >
                  {isProcessingAll ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  {isProcessingAll ? "Registrando com segurança..." : `Registrar tomadas (${availableDoses.length})`}
                </button>

            {bulkResolutionOpen && availableDoses.length > 0 && (
              <div className="rounded-[22px] border border-ice/20 bg-ice/5 p-3.5">
                <p className="text-sm font-semibold text-ink-primary">
                  Quando você tomou essas doses?
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-ink-muted">
                  Escolha o que realmente aconteceu. O Vault usa esse horário no histórico.
                </p>

                <div className="mt-3 space-y-2">
                  <button
                    type="button"
                    disabled={existeProcessamento}
                    onClick={() => void handleResolveAll({ kind: "scheduled" })}
                    className="flex w-full items-center gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-3.5 text-left active:scale-[0.99] disabled:opacity-50"
                  >
                    <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
                    <span>
                      <span className="block text-sm font-semibold text-ink-primary">
                        Tomei nos horários programados
                      </span>
                      <span className="mt-0.5 block text-[10px] text-ink-muted">
                        Cada dose mantém o horário previsto no histórico.
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={existeProcessamento}
                    onClick={() => void handleResolveAll({ kind: "now" })}
                    className="flex w-full items-center gap-3 rounded-2xl border border-ice/25 bg-ice/10 p-3.5 text-left active:scale-[0.99] disabled:opacity-50"
                  >
                    <Timer size={18} className="shrink-0 text-ice" />
                    <span>
                      <span className="block text-sm font-semibold text-ink-primary">
                        Tomei as disponíveis agora · {getCurrentTimeHHMM()}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-ink-muted">
                        Registra o horário atual como horário real das doses.
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={existeProcessamento}
                    onClick={() => {
                      trigger("vibrate");
                      setBulkResolutionOpen(false);
                    }}
                    className="w-full rounded-xl border border-surface-border bg-surface-raised px-3 py-2.5 text-xs font-semibold text-ink-muted disabled:opacity-50"
                  >
                    Revisar individualmente
                  </button>
                </div>
              </div>
            )}
              </div>
            )}

            <button
              type="button"
              onClick={handleExpand}
              disabled={existeProcessamento}
              className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-surface-raised p-3.5 text-xs font-semibold text-ink-primary active:scale-95 disabled:opacity-50"
            >
              Abrir cronograma completo
              <ChevronRight size={14} />
            </button>

            {doses.length >
              1 && (
              <p className="text-center text-[9px] leading-relaxed text-ink-faint">
                O lote preserva dia e horário programados. Use a revisão individual quando o horário real tiver sido diferente.
              </p>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
