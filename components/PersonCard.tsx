"use client";

import type { Person } from "@/lib/types";
import { User } from "lucide-react";

interface PersonCardProps {
  person: Person;
  isActive: boolean;
  onClick: () => void;
}

export function PersonCard({ person, isActive, onClick }: PersonCardProps) {
  return (
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
  );
}