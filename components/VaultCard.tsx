// components/VaultCard.tsx
"use client";

import { motion } from "framer-motion";
import { ChevronRight, Users, Lock, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { useHapticFeedback } from "@/lib/haptics";
import type { Vault } from "@/lib/types";

interface VaultCardProps {
  vault: Vault;
  memberCount: number;
}

const VAULT_COLORS = {
  purple: "#8B5CF6",
  blue: "#38BDF8",
  green: "#34D399",
  amber: "#F59E0B",
  coral: "#EF4444",
  pink: "#EC4899",
  indigo: "#6366F1",
  teal: "#14B8A6",
};

function getVaultColor(colorKey?: string): string {
  if (colorKey && colorKey in VAULT_COLORS) {
    return VAULT_COLORS[colorKey as keyof typeof VAULT_COLORS];
  }
  return VAULT_COLORS.purple;
}

export function VaultCard({ vault, memberCount }: VaultCardProps) {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const color = getVaultColor(vault.color);

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
          onClick={() => {
            trigger("vibrate");
            router.push(`/vaults/detalhes?id=${vault.id}`);
          }}
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
            <Lock size={22} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-baseline gap-2">
              <h3 className="min-w-0 flex-1 truncate font-display text-base font-bold text-ink-primary">
                {vault.name}
              </h3>
              {/* {vault.isDefault && (
             <span className="shrink-0 whitespace-nowrap                  rounded-full bg-ice/10 px-2 py-0.5 text-[9px] font-        bold uppercase text-ice border border-ice/20">
            Principal
            </span>
          )} */
              }
            </div>

            {vault.description && (
              <p className="mt-1 text-sm text-ink-muted line-clamp-2">{vault.description}</p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1.5 text-xs text-ink-muted">
                <Users size={14} className="text-ice" />
                {memberCount} membro{memberCount !== 1 ? "s" : ""}
              </span>
              {memberCount > 1 && (
                <span className="text-[10px] font-medium text-ice bg-ice/10 px-2 py-0.5 rounded-full border border-ice/20">
                  Compartilhado
                </span>
              )}
            </div>
          </div>

          <ChevronRight size={16} className="mt-2 shrink-0 text-ink-faint" />
        </button>
      </div>
    </motion.article>
  );
}