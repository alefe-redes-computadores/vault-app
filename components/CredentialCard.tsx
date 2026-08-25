// components/CredentialCard.tsx
"use client";

import { motion } from "framer-motion";
import { KeyRound, ChevronRight, Copy, Eye, EyeOff } from "lucide-react";
import { usePrivacyMode } from "@/hooks/usePrivacyMode";
import type { Credential } from "@/lib/types";

interface CredentialCardProps {
  credential: Credential;
  onClick: () => void;
  onCopy: (e: React.MouseEvent) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  banco: "#34D399",
  social: "#38BDF8",
  trabalho: "#8B5CF6",
  outros: "#F59E0B",
};

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.outros;
}

export function CredentialCard({ credential, onClick, onCopy }: CredentialCardProps) {
  const { isPrivate } = usePrivacyMode();
  const color = getCategoryColor(credential.category);

  return (
    <motion.article
      className="group relative overflow-hidden rounded-[24px] border bg-surface shadow-md transition-all hover:bg-surface-raised"
      style={{
        borderColor: `${color}40`,
        borderLeft: `6px solid ${color}`,
      }}
    >
      <div className="p-4 pl-5">
        <button
          type="button"
          onClick={onClick}
          className="flex w-full items-start gap-3.5 text-left outline-none"
        >
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-inner"
            style={{
              backgroundColor: `${color}15`,
              borderColor: `${color}30`,
              color,
            }}
          >
            <KeyRound size={22} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-baseline gap-2">
              <h3 className="min-w-0 flex-1 truncate font-display text-base font-bold text-ink-primary">
                {isPrivate ? "••••••••••••" : credential.title}
              </h3>
              <span className="shrink-0 whitespace-nowrap rounded-full border border-surface-border/40 bg-surface-raised px-2 py-0.5 text-[9px] font-semibold uppercase text-ink-muted">
                {credential.category}
              </span>
            </div>

            <p className="mt-1 text-sm text-ink-muted truncate">
              {isPrivate ? "••••••••••••" : credential.username}
            </p>
          </div>

          <div className="flex items-center gap-1.5 mt-1">
            <button
              type="button"
              onClick={onCopy}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-raised border border-surface-border/50 text-ink-muted transition-colors hover:text-ice hover:border-ice/30 active:scale-95"
              aria-label="Copiar senha"
            >
              <Copy size={14} />
            </button>
            <ChevronRight size={16} className="text-ink-faint" />
          </div>
        </button>
      </div>
    </motion.article>
  );
}