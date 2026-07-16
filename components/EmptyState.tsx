"use client";

import { LucideIcon } from "lucide-react";
import { Button } from "./ui/Button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-20 h-20 rounded-full bg-surface-raised flex items-center justify-center mb-4 border border-surface-border">
        <Icon size={32} className="text-ink-muted" />
      </div>
      <h3 className="font-display text-lg text-ink-primary">{title}</h3>
      <p className="text-sm text-ink-muted mt-1 max-w-xs">{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" className="mt-6" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}