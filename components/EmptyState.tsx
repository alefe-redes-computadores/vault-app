"use client";

import { motion } from "framer-motion";
import { LucideIcon, Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useHapticFeedback } from "@/lib/haptics";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  compact?: boolean;
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`flex flex-col items-center justify-center text-center ${
        compact ? "py-8 px-4" : "py-16 px-4"
      }`}
    >
      {/* Ícone com animação de flutuação */}
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className={`rounded-full bg-surface-raised border border-surface-border/50 flex items-center justify-center ${
          compact ? "w-16 h-16 mb-3" : "w-24 h-24 mb-6"
        }`}
      >
        <Icon size={compact ? 28 : 40} className="text-ink-muted/50" />
      </motion.div>

      <h3 className={`font-display text-ink-primary ${
        compact ? "text-base" : "text-xl"
      }`}>
        {title}
      </h3>

      <p className={`text-ink-muted max-w-xs ${
        compact ? "text-sm mt-1" : "text-sm mt-2"
      }`}>
        {description}
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3 mt-6">
        {actionLabel && onAction && (
          <Button
            variant="primary"
            onClick={handleAction}
            className="flex items-center gap-2"
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
    </motion.div>
  );
}