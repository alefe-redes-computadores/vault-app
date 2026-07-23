"use client";

import { Vault } from "@/lib/types";
import {
  Users,
  ChevronRight,
  Home,
  Heart,
  Briefcase,
  BookOpen,
  Plane,
  Car,
  PawPrint,
  LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useHapticFeedback } from "@/lib/haptics";

const ICON_MAP: Record<string, LucideIcon> = {
  home: Home,
  heart: Heart,
  briefcase: Briefcase,
  "book-open": BookOpen,
  plane: Plane,
  car: Car,
  "paw-print": PawPrint,
  users: Users,
};

interface VaultCardProps {
  vault: Vault;
  memberCount?: number;
}

export function VaultCard({ vault, memberCount = 0 }: VaultCardProps) {
  const { trigger } = useHapticFeedback();
  const router = useRouter();

  const handlePress = () => {
    trigger("vibrate");
    router.push(`/vaults/detalhes?id=${vault.id}`);
  };

  const Icon = ICON_MAP[vault.icon] || Home;
  const accent = vault.color || "#7DD3FC";

  return (
    <button
      onClick={handlePress}
      className="group relative w-full overflow-hidden rounded-[24px] border border-surface-border/50 bg-surface p-4 text-left shadow-sm transition-all duration-200 active:scale-[0.985]"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{
          background: `linear-gradient(135deg, ${accent}10 0%, transparent 55%)`,
        }}
      />

      <div className="relative flex items-start gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/5"
          style={{ backgroundColor: `${accent}1A` }}
        >
          <Icon size={22} style={{ color: accent }} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate font-display text-[15px] font-semibold text-ink-primary">
                {vault.name}
              </h3>

              {vault.description && (
                <p className="mt-1 line-clamp-2 text-sm leading-5 text-ink-muted">
                  {vault.description}
                </p>
              )}
            </div>

            <ChevronRight
              size={18}
              className="mt-0.5 shrink-0 text-ink-faint transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-ink-muted"
            />
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
              style={{
                color: accent,
                backgroundColor: `${accent}14`,
              }}
            >
              <Users size={12} />
              {memberCount} membro{memberCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}