// components/PendingDosesModal.tsx
"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  ChevronRight,
  Clock3,
  Loader2,
  Pill,
  X,
} from "lucide-react";

import { useHapticFeedback } from "@/lib/haptics";

type PendingDose = {
  medicamentoId: string;
  nome: string;
  horario: string;
};

interface PendingDosesModalProps {
  isOpen: boolean;
  onClose: () => void;
  doses: PendingDose[];
  onTomarDose: (dose: PendingDose) => Promise<void>;
  onTomarTodas: () => Promise<void>;
  isProcessingDose: string | null;
  isProcessingAll: boolean;
  onExpand: () => void;
}

export function PendingDosesModal({
  isOpen,
  onClose,
  doses,
  onTomarDose,
  onTomarTodas,
  isProcessingDose,
  isProcessingAll,
  onExpand,
}: PendingDosesModalProps) {
  const { trigger } = useHapticFeedback();

  const [confirmandoTodas, setConfirmandoTodas] =
    useState(false);

  const existeProcessamento =
    Boolean(isProcessingDose) || isProcessingAll;

  useEffect(() => {
    if (!isOpen) {
      setConfirmandoTodas(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      if (existeProcessamento) {
        return;
      }

      trigger("vibrate");
      onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    isOpen,
    existeProcessamento,
    onClose,
    trigger,
  ]);

  if (!isOpen) {
    return null;
  }

  const handleClose = () => {
    if (existeProcessamento) {
      return;
    }

    trigger("vibrate");
    setConfirmandoTodas(false);
    onClose();
  };

  const handleExpand = () => {
    if (existeProcessamento) {
      return;
    }

    trigger("vibrate");
    setConfirmandoTodas(false);

    /**
     * A Home atual já fecha o modal dentro de onExpand.
     * Não chamamos onClose() aqui para evitar fechamento
     * duplicado e haptic duplicado.
     */
    onExpand();
  };

  const handleTomarDose = async (
    dose: PendingDose
  ) => {
    if (existeProcessamento) {
      return;
    }

    trigger("vibrate");

    await onTomarDose(dose);
  };

  const handleTodas = async () => {
    if (
      existeProcessamento ||
      doses.length === 0
    ) {
      return;
    }

    if (!confirmandoTodas) {
      trigger("vibrate");
      setConfirmandoTodas(true);
      return;
    }

    trigger("vibrate");

    try {
      await onTomarTodas();
      setConfirmandoTodas(false);
    } catch {
      /**
       * O callback da Home é responsável pelo
       * feedback de erro e pelo estado de processamento.
       */
    }
  };

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-end justify-center bg-void/80 p-4 backdrop-blur-md sm:items-center"
      onClick={handleClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pending-doses-title"
        aria-describedby="pending-doses-description"
        initial={{
          opacity: 0,
          y: 50,
          scale: 0.96,
        }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
        }}
        transition={{
          duration: 0.2,
        }}
        onClick={(event) => {
          event.stopPropagation();
        }}
        className="w-full max-w-md space-y-5 rounded-[32px] border border-surface-border bg-surface p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-1.5 flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-coral/10 text-coral">
                <Clock3 size={16} />
              </div>

              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-coral">
                Rotina de hoje
              </p>
            </div>

            <h3
              id="pending-doses-title"
              className="font-display text-lg font-bold text-ink-primary"
            >
              Doses pendentes
            </h3>

            <p
              id="pending-doses-description"
              className="mt-1 text-xs leading-relaxed text-ink-muted"
            >
              {doses.length === 0
                ? "Não há doses atrasadas para registrar."
                : `${doses.length} ${
                    doses.length === 1
                      ? "dose está"
                      : "doses estão"
                  } aguardando registro.`}
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={existeProcessamento}
            aria-label="Fechar doses pendentes"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-raised text-ink-muted transition-all hover:bg-surface-border hover:text-ink-primary active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[48vh] space-y-2 overflow-y-auto pr-1">
          {doses.length === 0 ? (
            <div className="rounded-[22px] border border-emerald-400/20 bg-emerald-400/5 px-4 py-6 text-center">
              <CheckCircle2
                size={24}
                className="mx-auto text-emerald-400"
              />

              <p className="mt-2 text-sm font-semibold text-ink-primary">
                Tudo em dia
              </p>

              <p className="mt-1 text-[11px] text-ink-muted">
                Nenhuma dose com horário vencido está pendente.
              </p>
            </div>
          ) : (
            doses.map((dose) => {
              const processingKey =
                `${dose.medicamentoId}-${dose.horario}`;

              const isProcessing =
                isProcessingDose === processingKey;

              return (
                <div
                  key={processingKey}
                  className={`flex items-center justify-between gap-3 rounded-2xl border border-surface-border/50 bg-surface-raised p-3.5 transition-opacity ${
                    existeProcessamento && !isProcessing
                      ? "opacity-55"
                      : ""
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
                      <Pill size={16} />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink-primary">
                        {dose.nome}
                      </p>

                      <p className="mt-0.5 font-mono text-[10px] text-ink-muted">
                        Horário: {dose.horario}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      void handleTomarDose(dose);
                    }}
                    disabled={existeProcessamento}
                    className="flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-400 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2
                          size={13}
                          className="animate-spin"
                        />
                        Salvando
                      </>
                    ) : (
                      "Registrar"
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {confirmandoTodas &&
          doses.length > 0 &&
          !isProcessingAll && (
            <div className="rounded-[20px] border border-coral/20 bg-coral/5 p-3.5">
              <p className="text-xs font-semibold text-ink-primary">
                Confirmar registro em lote?
              </p>

              <p className="mt-1 text-[10px] leading-relaxed text-ink-muted">
                As {doses.length} doses pendentes serão registradas
                individualmente como tomadas através do fluxo normal
                de medicamentos.
              </p>
            </div>
          )}

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={handleExpand}
            disabled={existeProcessamento}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-surface-raised p-3.5 text-xs font-semibold text-ink-primary transition-all hover:bg-surface-border active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Ver cronograma
            <ChevronRight size={14} />
          </button>

          <button
            type="button"
            onClick={() => {
              void handleTodas();
            }}
            disabled={
              existeProcessamento ||
              doses.length === 0
            }
            className={`flex items-center justify-center gap-1.5 rounded-2xl p-3.5 text-xs font-semibold text-white transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
              confirmandoTodas
                ? "bg-coral shadow-md shadow-coral/20"
                : "bg-emerald-500 shadow-md shadow-emerald-500/15"
            }`}
          >
            {isProcessingAll ? (
              <>
                <Loader2
                  size={14}
                  className="animate-spin"
                />
                Registrando
              </>
            ) : confirmandoTodas ? (
              `Confirmar ${doses.length}`
            ) : (
              "Registrar todas"
            )}
          </button>
        </div>

        {confirmandoTodas &&
          !isProcessingAll && (
            <button
              type="button"
              onClick={() => {
                trigger("vibrate");
                setConfirmandoTodas(false);
              }}
              className="w-full text-center text-[10px] font-medium text-ink-muted transition-colors hover:text-ink-primary"
            >
              Cancelar confirmação
            </button>
          )}
      </motion.div>
    </div>
  );
}