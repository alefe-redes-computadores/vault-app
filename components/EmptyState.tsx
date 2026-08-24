// components/EmptyState.tsx
"use client";

import { motion } from "framer-motion";
import { LucideIcon, Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useHapticFeedback } from "@/lib/haptics";

interface EmptyStateProps {
  /** Ícone principal (Lucide) */
  icon: LucideIcon;
  /** Título principal */
  title: string;
  /** Descrição do estado vazio */
  description: string;
  /** Rótulo do botão principal */
  actionLabel?: string;
  /** Ação do botão principal */
  onAction?: () => void;
  /** Rótulo do botão secundário */
  secondaryActionLabel?: string;
  /** Ação do botão secundário */
  onSecondaryAction?: () => void;
  /** Versão compacta para espaços menores */
  compact?: boolean;
  /** Classe adicional para o ícone (permite sobrescrever cores/tamanhos) */
  iconClassName?: string;
  /** Desabilita a animação de entrada */
  disableAnimation?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  compact = false,
  iconClassName = "",
  disableAnimation = false,
}: EmptyStateProps) {
  const { trigger } = useHapticFeedback();

  const handleAction = () => {
    trigger("vibrate");
    onAction?.();
  };

  const handleSecondaryAction = () => {
    trigger("vibrate");
    onSecondaryAction?.();
  };

  const Content = () => (
    <>
      <div
        className={`glow-ice flex items-center justify-center rounded-full border border-ice/15 bg-surface-raised ${
          compact ? "mb-3 h-16 w-16" : "mb-5 h-24 w-24"
        } ${iconClassName}`}
      >
        <Icon size={compact ? 26 : 34} className="text-ice/55" />
      </div>

      <h3
        className={`font-display font-semibold text-ink-primary ${
          compact ? "text-base" : "text-xl"
        }`}
      >
        {title}
      </h3>

      <p
        className={`max-w-xs text-ink-muted ${
          compact ? "mt-1 text-sm leading-6" : "mt-2 text-sm leading-6"
        }`}
      >
        {description}
      </p>

      {(actionLabel || secondaryActionLabel) && (
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row">
          {actionLabel && onAction && (
            <Button
              variant="primary"
              onClick={handleAction}
              className="glow-ice flex items-center gap-2"
            >
              <Plus size={16} />
              {actionLabel}
            </Button>
          )}

          {secondaryActionLabel && onSecondaryAction && (
            <Button
              variant="secondary"
              onClick={handleSecondaryAction}
              className="flex items-center gap-2"
            >
              {secondaryActionLabel}
              <ArrowRight size={14} />
            </Button>
          )}
        </div>
      )}
    </>
  );

  return (
    <motion.div
      initial={!disableAnimation ? { opacity: 0, y: 14, scale: 0.98 } : false}
      animate={!disableAnimation ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={!disableAnimation ? { duration: 0.28 } : {}}
      className={`flex flex-col items-center justify-center rounded-[28px] border border-surface-border/50 bg-surface text-center shadow-sm ${
        compact ? "px-4 py-8" : "px-6 py-14"
      }`}
    >
      <Content />
    </motion.div>
  );
}