"use client";

import { useProfiles } from "@/hooks/useLocalData";
import { useHapticFeedback } from "@/lib/haptics";
import { ChevronDown, User, Check } from "lucide-react";
import { useState } from "react";
import type { Person } from "@/lib/types";

interface ProfileSwitcherProps {
  activeProfileId: string;
  onProfileChange: (profileId: string) => void;
}

export function ProfileSwitcher({
  activeProfileId,
  onProfileChange,
}: ProfileSwitcherProps) {
  const { trigger } = useHapticFeedback();
  const profiles = useProfiles();
  const [isOpen, setIsOpen] = useState(false);

  const activeProfile = profiles.find((p: Person) => p.id === activeProfileId);

  const handleSelect = (profileId: string) => {
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
        className="flex items-center gap-2.5 rounded-full border border-surface-border/50 bg-surface-raised px-4 py-2 text-left transition-all active:scale-[0.98] hover:border-surface-border"
      >
        {activeProfile.avatar_url ? (
          <img
            src={activeProfile.avatar_url}
            alt={activeProfile.name}
            className="h-6 w-6 rounded-full border border-white/5 object-cover"
          />
        ) : (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-surface">
            <User size={14} className="text-ink-muted" />
          </div>
        )}

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
          <div className="fixed inset-0 z-20" onClick={() => setIsOpen(false)} />

          <div className="absolute left-0 top-full z-30 mt-2 min-w-[220px] overflow-hidden rounded-[24px] border border-surface-border/50 bg-surface shadow-vault">
            <div className="border-b border-surface-border/40 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.22em] text-ink-faint">
                Perfis
              </p>
            </div>

            <div className="p-2">
              {profiles.map((profile: Person) => {
                const isActive = profile.id === activeProfileId;

                return (
                  <button
                    key={profile.id}
                    onClick={() => handleSelect(profile.id!)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-all active:scale-[0.985] ${
                      isActive
                        ? "bg-ice/10 text-ink-primary"
                        : "text-ink-muted hover:bg-surface-raised hover:text-ink-primary"
                    }`}
                  >
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.name}
                        className="h-7 w-7 rounded-full border border-white/5 object-cover"
                      />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-raised">
                        <User size={14} />
                      </div>
                    )}

                    <span className="text-sm font-medium">{profile.name}</span>

                    {isActive && (
                      <Check size={15} className="ml-auto text-ice" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}