"use client";

import type { Person } from "@/lib/types";
import { User, Trash2 } from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";

interface PersonCardProps {
  person: Person;
  isActive: boolean;
  onClick: () => void;
  onDelete?: (id: number) => void;
  isDeleting?: boolean;
}

export function PersonCard({ 
  person, 
  isActive, 
  onClick, 
  onDelete,
  isDeleting = false 
}: PersonCardProps) {
  const { trigger } = useHapticFeedback();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!person.id) return;
    if (confirm(`Remover "${person.name}"?`)) {
      trigger("vibrate");
      onDelete?.(person.id);
    }
  };

  return (
    <div className="relative flex items-center gap-2">
      <button
        onClick={onClick}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-full border transition-all active:scale-[0.98]
          ${isActive
            ? "border-ice bg-ice/10 text-ice"
            : "border-surface-border bg-surface-raised text-ink-muted hover:text-ink-primary"
          }
        `}
      >
        {person.avatar_url ? (
          <img
            src={person.avatar_url}
            alt={person.name}
            className="w-6 h-6 rounded-full"
          />
        ) : (
          <User size={14} />
        )}
        <span className="text-sm font-medium">{person.name}</span>
      </button>
      {onDelete && (
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="p-1 rounded-full hover:bg-surface-border/50 transition-colors disabled:opacity-50"
          title="Remover pessoa"
        >
          <Trash2 size={14} className="text-ink-muted hover:text-coral transition-colors" />
        </button>
      )}
    </div>
  );
}