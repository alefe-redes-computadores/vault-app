// components/CredentialCard.tsx
"use client";

import type {
  MouseEvent,
} from "react";

import { motion } from "framer-motion";
import {
  ChevronRight,
  Copy,
  KeyRound,
} from "lucide-react";

import { usePrivacyMode } from "@/hooks/usePrivacyMode";

import type {
  Credential,
} from "@/lib/types";

interface CredentialCardProps {
  credential: Credential;
  onClick: () => void;
  onCopy: (
    event: MouseEvent<HTMLButtonElement>
  ) => void;
}

const CATEGORY_COLORS: Record<
  Credential["category"],
  string
> = {
  banco: "#34D399",
  social: "#38BDF8",
  trabalho: "#8B5CF6",
  outros: "#F59E0B",
};

function getCategoryColor(
  category: Credential["category"]
): string {
  return (
    CATEGORY_COLORS[category] ||
    CATEGORY_COLORS.outros
  );
}

export function CredentialCard({
  credential,
  onClick,
  onCopy,
}: CredentialCardProps) {
  const {
    isPrivate,
  } = usePrivacyMode();

  const color =
    getCategoryColor(
      credential.category
    );

  return (
    <motion.article
      className="group relative overflow-hidden rounded-[24px] border bg-surface shadow-md transition-all hover:bg-surface-raised"
      style={{
        borderColor: `${color}40`,
        borderLeft: `6px solid ${color}`,
      }}
    >
      <div className="flex items-start gap-3.5 p-4 pl-5">
        <button
          type="button"
          onClick={onClick}
          className="flex min-w-0 flex-1 items-start gap-3.5 text-left outline-none"
          aria-label={`Abrir ${credential.title}`}
        >
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-inner"
            style={{
              backgroundColor:
                `${color}15`,
              borderColor:
                `${color}30`,
              color,
            }}
          >
            <KeyRound
              size={22}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-baseline gap-2">
              <h3 className="min-w-0 flex-1 truncate font-display text-base font-bold text-ink-primary">
                {isPrivate
                  ? "••••••••••••"
                  : credential.title}
              </h3>

              <span className="shrink-0 whitespace-nowrap rounded-full border border-surface-border/40 bg-surface-raised px-2 py-0.5 text-[9px] font-semibold uppercase text-ink-muted">
                {
                  credential.category
                }
              </span>
            </div>

            <p className="mt-1 truncate text-sm text-ink-muted">
              {isPrivate
                ? "••••••••••••"
                : credential.username ||
                  "Sem usuário informado"}
            </p>
          </div>
        </button>

        <div className="mt-1 flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onCopy}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-muted transition-colors hover:border-ice/30 hover:text-ice active:scale-95"
            aria-label={`Copiar senha de ${credential.title}`}
          >
            <Copy
              size={14}
            />
          </button>

          <button
            type="button"
            onClick={onClick}
            className="flex h-8 w-6 items-center justify-center text-ink-faint transition-colors hover:text-ink-muted active:scale-95"
            aria-label={`Abrir detalhes de ${credential.title}`}
          >
            <ChevronRight
              size={16}
            />
          </button>
        </div>
      </div>
    </motion.article>
  );
}