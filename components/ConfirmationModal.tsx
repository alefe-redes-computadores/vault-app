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
  if (!isOpen) return null;

  const colors = {
    danger: {
      icon: "text-coral",
      border: "border-coral/30",
      button: "bg-coral hover:bg-coral/90 text-white",
    },
    warning: {
      icon: "text-yellow-500",
      border: "border-yellow-500/30",
      button: "bg-yellow-500 hover:bg-yellow-600 text-white",
    },
    info: {
      icon: "text-ice",
      border: "border-ice/30",
      button: "bg-ice hover:bg-ice/90 text-void",
    },
  };

  const color = colors[type];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-md rounded-2xl bg-surface border border-surface-border shadow-vault p-6"
          >
            {/* Rivet decorativo */}
            <span className="rivet rivet-tl" />
            <span className="rivet rivet-br" />

            {/* Fechar */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-surface-border transition-colors"
              disabled={isLoading}
            >
              <X size={18} className="text-ink-muted" />
            </button>

            {/* Conteúdo */}
            <div className="flex flex-col items-center text-center">
              <div className={`w-14 h-14 rounded-full bg-surface-raised border ${color.border} flex items-center justify-center mb-4`}>
                <AlertTriangle size={28} className={color.icon} />
              </div>
              <h3 className="font-display text-lg font-semibold text-ink-primary">{title}</h3>
              <p className="text-sm text-ink-muted mt-2">{message}</p>
            </div>

            {/* Ações */}
            <div className="flex gap-3 mt-6">
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
                className="flex-1 flex items-center justify-center gap-2"
                onClick={onConfirm}
                disabled={isLoading}
              >
                {isLoading && <Loader2 size={16} className="animate-spin" />}
                {isLoading ? "Aguarde..." : confirmLabel}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}