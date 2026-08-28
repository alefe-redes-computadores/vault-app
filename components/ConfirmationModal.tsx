// components/ConfirmationModal.tsx
"use client";

import {
  ReactNode,
  useEffect,
  useId,
} from "react";
import {
  AnimatePresence,
  motion,
} from "framer-motion";
import {
  AlertTriangle,
  Info,
  Loader2,
  X,
} from "lucide-react";

import { Button } from "./ui/Button";

// ============================================================
// TIPOS
// ============================================================

export type ConfirmationModalType =
  | "danger"
  | "warning"
  | "info";

interface ConfirmationModalProps {
  isOpen: boolean;

  onClose: () => void;

  onConfirm: () =>
    | void
    | Promise<void>;

  title: string;

  message: ReactNode;

  confirmLabel?: string;

  cancelLabel?: string;

  isLoading?: boolean;

  type?: ConfirmationModalType;

  showActions?: boolean;

  closeOnBackdrop?: boolean;
}

// ============================================================
// CONFIGURAÇÃO
// ============================================================

const TONES = {
  danger: {
    icon: "text-coral",
    ring: "border-coral/20",
    iconBg: "bg-coral/10",
  },

  warning: {
    icon: "text-amber-400",
    ring: "border-amber-400/20",
    iconBg: "bg-amber-400/10",
  },

  info: {
    icon: "text-ice",
    ring: "border-ice/20",
    iconBg: "bg-ice/10",
  },
} satisfies Record<
  ConfirmationModalType,
  {
    icon: string;
    ring: string;
    iconBg: string;
  }
>;

// ============================================================
// COMPONENTE
// ============================================================

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  isLoading = false,
  type = "danger",
  showActions = true,
  closeOnBackdrop = true,
}: ConfirmationModalProps) {
  const titleId =
    useId();

  const descriptionId =
    useId();

  const tone =
    TONES[type];

  const Icon =
    type === "info"
      ? Info
      : AlertTriangle;

  // ==========================================================
  // ESC
  // ==========================================================

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (
      event: KeyboardEvent
    ) => {
      if (
        event.key === "Escape" &&
        !isLoading
      ) {
        onClose();
      }
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
  }, [
    isOpen,
    isLoading,
    onClose,
  ]);

  // ==========================================================
  // BACKDROP
  // ==========================================================

  const handleBackdropClick =
    () => {
      if (
        !closeOnBackdrop ||
        isLoading
      ) {
        return;
      }

      onClose();
    };

  const handleConfirm =
    async () => {
      if (isLoading) {
        return;
      }

      await onConfirm();
    };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-md"
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          exit={{
            opacity: 0,
          }}
          transition={{
            duration: 0.18,
          }}
          onMouseDown={
            handleBackdropClick
          }
        >
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={
              titleId
            }
            aria-describedby={
              descriptionId
            }
            initial={{
              opacity: 0,
              y: 14,
              scale: 0.96,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: 10,
              scale: 0.97,
            }}
            transition={{
              duration: 0.22,
              ease: [
                0.16,
                1,
                0.3,
                1,
              ],
            }}
            onMouseDown={(
              event
            ) =>
              event.stopPropagation()
            }
            className="relative w-full max-w-md rounded-[28px] border border-surface-border/60 bg-surface p-6 shadow-vault"
          >
            {/* =========================================== */}
            {/* CLOSE */}
            {/* =========================================== */}

            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              aria-label="Fechar modal"
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X
                size={18}
                aria-hidden="true"
              />
            </button>

            {/* =========================================== */}
            {/* CONTENT */}
            {/* =========================================== */}

            <div className="flex flex-col items-center text-center">
              <div
                className={`mb-4 flex h-14 w-14 items-center justify-center rounded-full border ${tone.ring} ${tone.iconBg}`}
              >
                <Icon
                  size={26}
                  className={
                    tone.icon
                  }
                  aria-hidden="true"
                />
              </div>

              <h3
                id={titleId}
                className="pr-5 font-display text-lg font-semibold text-ink-primary"
              >
                {title}
              </h3>

              <div
                id={
                  descriptionId
                }
                className="mt-2 max-w-sm text-sm leading-6 text-ink-muted"
              >
                {message}
              </div>
            </div>

            {/* =========================================== */}
            {/* ACTIONS */}
            {/* =========================================== */}

            {showActions && (
              <div className="mt-6 flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={
                    onClose
                  }
                  disabled={
                    isLoading
                  }
                >
                  {cancelLabel}
                </Button>

                <Button
                  type="button"
                  variant={
                    type ===
                    "danger"
                      ? "danger"
                      : "primary"
                  }
                  className="flex flex-1 items-center justify-center gap-2"
                  onClick={
                    handleConfirm
                  }
                  disabled={
                    isLoading
                  }
                >
                  {isLoading && (
                    <Loader2
                      size={16}
                      className="animate-spin"
                      aria-hidden="true"
                    />
                  )}

                  {isLoading
                    ? "Aguarde..."
                    : confirmLabel}
                </Button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}