"use client";

import { AREAS, type CategoryId } from "@/lib/types";
import { useHapticFeedback } from "@/lib/haptics";
import { LucideIcon, Heart, User, Building2, FolderOpen } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Heart,
  User,
  Building2,
  FolderOpen,
};

interface AreaTabsProps {
  activeArea: CategoryId | null;
  onAreaChange: (areaId: CategoryId | null) => void;
}

export function AreaTabs({ activeArea, onAreaChange }: AreaTabsProps) {
  const { trigger } = useHapticFeedback();

  // Converte AREAS (objeto) para um array
  const areasArray = Object.values(AREAS);

  const handleAreaClick = (areaId: CategoryId) => {
    trigger("vibrate");
    onAreaChange(activeArea === areaId ? null : areaId);
  };

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {areasArray.map((area) => {
        const Icon = ICON_MAP[area.icon] || FolderOpen;
        const isActive = activeArea === area.id;

        return (
          <button
            key={area.id}
            onClick={() => handleAreaClick(area.id)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all active:scale-[0.98] ${
              isActive
                ? "bg-ice text-void"
                : "bg-surface-raised text-ink-muted border border-surface-border hover:text-ink-primary"
            }`}
          >
            <Icon size={16} />
            <span>{area.name}</span>
          </button>
        );
      })}
    </div>
  );
}