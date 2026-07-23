"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "./ui/Button";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  type?: "danger" | "warning" | "info";
}

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
}: ConfirmationModalProps) {
  const tones = {
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
  };

  const tone = tones[type];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-md rounded-[28px] border border-surface-border/60 bg-surface p-6 shadow-vault"
          >
            <button
              onClick={onClose}
              disabled={isLoading}
              aria-label="Fechar modal"
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink-primary disabled:opacity-50"
            >
              <X size={18} />
            </button>

            <div className="flex flex-col items-center text-center">
              <div
                className={`mb-4 flex h-14 w-14 items-center justify-center rounded-full border ${tone.ring} ${tone.iconBg}`}
              >
                <AlertTriangle size={26} className={tone.icon} />
              </div>

              <h3 className="font-display text-lg font-semibold text-ink-primary">
                {title}
              </h3>

              <p className="mt-2 max-w-sm text-sm leading-6 text-ink-muted">
                {message}
              </p>
            </div>

            <div className="mt-6 flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={onClose}
                disabled={isLoading}
              >
                {cancelLabel}
              </Button>

              <Button
                variant={type === "danger" ? "danger" : "primary"}
                className="flex flex-1 items-center justify-center gap-2"
                onClick={onConfirm}
                disabled={isLoading}
              >
                {isLoading && <Loader2 size={16} className="animate-spin" />}
                {isLoading ? "Aguarde..." : confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}