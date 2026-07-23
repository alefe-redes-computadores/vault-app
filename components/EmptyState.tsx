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
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.28 }}
      className={`flex flex-col items-center justify-center rounded-[28px] border border-surface-border/50 bg-surface text-center shadow-sm ${
        compact ? "px-4 py-8" : "px-6 py-14"
      }`}
    >
      <div
        className={`flex items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised ${
          compact ? "mb-3 h-16 w-16" : "mb-5 h-24 w-24"
        }`}
      >
        <Icon
          size={compact ? 28 : 38}
          className="text-ink-muted/45"
        />
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
      )}
    </motion.div>
  );
}