"use client";

import { Eye, EyeOff } from "lucide-react";

interface VaultPrivacyToggleProps {
  isPrivate: boolean;
  onToggle: () => void;
  subject: string;
}

export function VaultPrivacyToggle({ isPrivate, onToggle, subject }: VaultPrivacyToggleProps) {
  const action = isPrivate ? "Mostrar" : "Ocultar";

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all active:scale-95 ${
        isPrivate
          ? "border-ice/35 bg-ice/10 text-ice"
          : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ice"
      }`}
      aria-label={`${action} ${subject}`}
      aria-pressed={isPrivate}
      title={`${action} ${subject}`}
    >
      {isPrivate ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  );
}
