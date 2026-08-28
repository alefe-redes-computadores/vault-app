// components/VaultCard.tsx
"use client";

import {
  Briefcase,
  Building2,
  ChevronRight,
  FileText,
  FolderLock,
  Heart,
  Home,
  KeyRound,
  Lock,
  Shield,
  Star,
  UserRound,
  Users,
  WalletCards,
} from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

import { useHapticFeedback } from "@/lib/haptics";
import type { Vault } from "@/lib/types";

// ============================================================
// TIPOS
// ============================================================

interface VaultCardProps {
  vault: Vault;
  memberCount: number;
}

// ============================================================
// ÍCONES
// ============================================================

const ICON_MAP = {
  lock: Lock,
  folder: FolderLock,
  home: Home,
  family: Users,
  users: Users,
  user: UserRound,
  heart: Heart,
  shield: Shield,
  star: Star,
  briefcase: Briefcase,
  building: Building2,
  documents: FileText,
  file: FileText,
  credentials: KeyRound,
  cards: WalletCards,
} as const;

// ============================================================
// HELPERS
// ============================================================

function normalizeVaultColor(color?: string): string {
  if (!color) {
    return "#7DD3FC";
  }

  const normalized = color.trim();

  if (/^#[0-9a-fA-F]{6}$/.test(normalized)) {
    return normalized.toUpperCase();
  }

  /**
   * Compatibilidade temporária com Vaults antigos que
   * armazenavam apenas uma chave de cor.
   *
   * Novos registros passam a persistir HEX no repository.
   */
  const legacyColors: Record<string, string> = {
    purple: "#8B5CF6",
    blue: "#38BDF8",
    green: "#34D399",
    amber: "#F59E0B",
    coral: "#EF4444",
    red: "#EF4444",
    pink: "#EC4899",
    indigo: "#6366F1",
    teal: "#14B8A6",
  };

  return legacyColors[normalized.toLowerCase()] ?? "#7DD3FC";
}

function getVaultIcon(icon?: string) {
  if (!icon) {
    return Lock;
  }

  const normalized = icon
    .trim()
    .toLowerCase();

  return (
    ICON_MAP[
      normalized as keyof typeof ICON_MAP
    ] ?? Lock
  );
}

// ============================================================
// COMPONENTE
// ============================================================

export function VaultCard({
  vault,
  memberCount,
}: VaultCardProps) {
  const router = useRouter();
  const { trigger } = useHapticFeedback();

  const color = normalizeVaultColor(
    vault.color
  );

  const Icon = getVaultIcon(
    vault.icon
  );

  const isShared = memberCount > 1;

  const handleOpen = () => {
    if (!vault.id) {
      return;
    }

    trigger("vibrate");

    router.push(
      `/vaults/detalhes?id=${encodeURIComponent(
        vault.id
      )}`
    );
  };

  return (
    <motion.article
      whileTap={{
        scale: 0.985,
      }}
      className="group relative overflow-hidden rounded-[24px] border bg-surface shadow-md transition-all hover:bg-surface-raised"
      style={{
        borderColor: `${color}40`,
        borderLeft: `6px solid ${color}`,
      }}
    >
      <div className="p-4 pl-5">
        <button
          type="button"
          onClick={handleOpen}
          disabled={!vault.id}
          className="flex w-full items-start gap-3.5 text-left outline-none disabled:cursor-default"
          aria-label={`Abrir cofre ${vault.name}`}
        >
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-inner"
            style={{
              backgroundColor: `${color}15`,
              borderColor: `${color}30`,
              color,
            }}
          >
            <Icon
              size={22}
              aria-hidden="true"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-baseline gap-2">
              <h3 className="min-w-0 flex-1 truncate font-display text-base font-bold text-ink-primary">
                {vault.name}
              </h3>
            </div>

            {vault.description && (
              <p className="mt-1 line-clamp-2 text-sm text-ink-muted">
                {vault.description}
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1.5 text-xs text-ink-muted">
                <Users
                  size={14}
                  className="text-ice"
                  aria-hidden="true"
                />

                {memberCount}{" "}
                membro
                {memberCount !== 1
                  ? "s"
                  : ""}
              </span>

              {isShared && (
                <span className="rounded-full border border-ice/20 bg-ice/10 px-2 py-0.5 text-[10px] font-medium text-ice">
                  Compartilhado
                </span>
              )}
            </div>
          </div>

          <ChevronRight
            size={16}
            className="mt-2 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </button>
      </div>
    </motion.article>
  );
}