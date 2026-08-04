"use client";

import { useState } from "react";
import { Landmark, Globe, Building2, KeyRound, Copy, Check, Lock } from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import type { Credential } from "@/lib/types";

interface CredentialCardProps {
  credential: Credential;
  onClick: () => void;
  onCopy: (e: React.MouseEvent) => void;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  banco: Landmark,
  social: Globe,
  trabalho: Building2,
  outros: KeyRound,
};

export function CredentialCard({ credential, onClick, onCopy }: CredentialCardProps) {
  const { trigger } = useHapticFeedback();
  const [copied, setCopied] = useState(false);
  const Icon = CATEGORY_ICONS[credential.category] || KeyRound;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Evita abrir o card ao clicar em copiar
    trigger("vibrate");
    
    // A função onCopy injetada pela página vai lidar com a biometria
    // Se a página aprovar, ela cuida de copiar, nós só mudamos o ícone aqui
    onCopy(e);
    
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      onClick={() => {
        trigger("vibrate");
        onClick();
      }}
      className="card-hover group flex cursor-pointer items-center justify-between gap-4 rounded-[26px] border border-surface-border/50 bg-surface p-4 shadow-sm transition-all active:scale-[0.98]"
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-raised border border-surface-border/40">
          <Icon size={20} className="text-ice" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-base font-semibold text-ink-primary">
            {credential.title}
          </h3>
          {credential.username ? (
            <p className="truncate text-sm text-ink-muted">
              {credential.username}
            </p>
          ) : (
            <div className="flex items-center gap-1 mt-0.5 text-xs text-ink-faint">
              <Lock size={10} />
              <span>Protegido</span>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={handleCopy}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all ${
          copied 
            ? "border-ice bg-ice/10 text-ice" 
            : "border-surface-border/50 bg-surface-raised text-ink-muted hover:border-ice/30 hover:text-ink-primary"
        }`}
        aria-label="Copiar senha"
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
      </button>
    </div>
  );
}
