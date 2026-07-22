"use client";

import { useProfiles } from "@/hooks/useLocalData";
import { useHapticFeedback } from "@/lib/haptics";
import { ChevronDown, User } from "lucide-react";
import { useState } from "react";
import type { Person } from "@/lib/types";

interface ProfileSwitcherProps {
  activeProfileId: string; // ← agora é string (UUID)
  onProfileChange: (profileId: string) => void; // ← agora é string
}

export function ProfileSwitcher({ activeProfileId, onProfileChange }: ProfileSwitcherProps) {
  const { trigger } = useHapticFeedback();
  const profiles = useProfiles();
  const [isOpen, setIsOpen] = useState(false);

  // CORRIGIDO: comparação com string
  const activeProfile = profiles.find((p: Person) => p.id === activeProfileId);

  const handleSelect = (profileId: string) => { // ← agora é string
    trigger("vibrate");
    onProfileChange(profileId);
    setIsOpen(false);
  };

  if (!activeProfile) return null;

  return (
    <div className="relative">
      <button
        onClick={() => {
          trigger("vibrate");
          setIsOpen(!isOpen);
        }}
        className="flex items-center gap-2 rounded-full bg-surface-raised px-4 py-2 border border-surface-border/50 active:scale-[0.98] transition-all"
      >
        <span className="text-lg">
          {activeProfile.avatar_url ? (
            <img
              src={activeProfile.avatar_url}
              alt={activeProfile.name}
              className="w-6 h-6 rounded-full"
            />
          ) : (
            <User size={16} />
          )}
        </span>
        <span className="font-display text-sm font-medium text-ink-primary">
          {activeProfile.name}
        </span>
        <ChevronDown
          size={16}
          className={`text-ink-muted transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 top-full mt-2 z-30 min-w-[160px] rounded-card border border-surface-border/50 bg-surface-raised shadow-vault overflow-hidden">
            {profiles.map((profile: Person) => (
              <button
                key={profile.id}
                onClick={() => handleSelect(profile.id!)}
                className={`flex items-center gap-3 w-full px-4 py-3 text-left transition-colors active:scale-[0.98] ${
                  profile.id === activeProfileId
                    ? "bg-steel-dark/20 text-ink-primary"
                    : "text-ink-muted hover:bg-surface-border/50"
                }`}
              >
                <span className="text-lg">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.name}
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <User size={16} />
                  )}
                </span>
                <span className="text-sm font-medium">{profile.name}</span>
                {profile.id === activeProfileId && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-ice" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}