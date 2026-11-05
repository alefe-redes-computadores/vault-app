// components/EmptyState.tsx
"use client";

import { motion } from "framer-motion";
import { LucideIcon, Plus, ArrowRight, RotateCcw } from "lucide-react";
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
  variant?: "default" | "no-results" | "offline" | "error" | "calm";
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
  variant = "default",
}: EmptyStateProps) {
  const { trigger } = useHapticFeedback();
  const isSearch = variant === "no-results";
  const isCritical = variant === "error";
  const isOffline = variant === "offline";
  const ActionIcon = isSearch ? RotateCcw : Plus;
  const iconTone = isCritical ? "text-coral" : isOffline ? "text-amber-300" : "text-ice/70";
  const wrapperTone = isCritical
    ? "border-coral/25 bg-coral/[0.035]"
    : isOffline
    ? "border-amber-400/25 bg-amber-400/[0.035]"
    : isSearch || variant === "calm"
    ? "border-surface-border/60 bg-surface/75"
    : "border-surface-border/50 bg-surface";

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
        className={`${isSearch || isCritical || isOffline || variant === "calm" ? "" : "glow-ice"} flex items-center justify-center rounded-full border border-surface-border/60 bg-surface-raised ${
          compact ? "mb-3 h-16 w-16" : "mb-5 h-24 w-24"
        } ${iconClassName}`}
      >
        <Icon size={compact ? 26 : 34} className={iconTone} />
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
              <ActionIcon size={16} />
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
      role={isCritical ? "alert" : "status"}
      className={`flex flex-col items-center justify-center rounded-[24px] border ${wrapperTone} text-center shadow-sm ${
        compact ? "px-4 py-8" : "px-6 py-14"
      }`}
    >
      <Content />
    </motion.div>
  );
}