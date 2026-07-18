"use client";

import { Vault } from "@/lib/types";
import { Users, ChevronRight, Home, Heart, Briefcase, BookOpen, Plane, Car, PawPrint, LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useHapticFeedback } from "@/lib/haptics";

// Mapeamento direto de string para ícone Lucide
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

  return (
    <div
      onClick={handlePress}
      className="relative overflow-hidden rounded-card border p-4 shadow-vault active:scale-[0.98] transition-all duration-150 cursor-pointer bg-surface"
      style={{ borderColor: `${vault.color || '#7DD3FC'}33` }}
    >
      <span className="rivet rivet-tl" />
      <span className="rivet rivet-br" />

      <div className="flex items-start gap-3">
        <div
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${vault.color || '#7DD3FC'}22` }}
        >
          <Icon size={22} style={{ color: vault.color || '#7DD3FC' }} />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-display text-[15px] font-medium text-ink-primary truncate">
            {vault.name}
          </h3>
          {vault.description && (
            <p className="text-sm text-ink-muted truncate">{vault.description}</p>
          )}
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-xs text-ink-muted">
              <Users size={12} />
              {memberCount} membro{memberCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <ChevronRight size={18} className="text-ink-muted flex-shrink-0" />
      </div>
    </div>
  );
}