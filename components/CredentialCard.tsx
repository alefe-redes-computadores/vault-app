"use client";

import { useState } from "react";
import { motion, useAnimation, PanInfo } from "framer-motion";
import { KeyRound, Copy, Check, Lock, User, AtSign } from "lucide-react";
import { Clipboard } from "@capacitor/clipboard";
import { useHapticFeedback } from "@/lib/haptics";
import { getFaviconUrl } from "@/lib/utils/credential-helper";
import { usePrivacyMode } from "@/hooks/usePrivacyMode";
import type { Credential } from "@/lib/types";

interface CredentialCardProps {
  credential: Credential;
  onClick: () => void;
  onCopy: (e: React.MouseEvent) => void;
}

// Largura que o card vai deslizar para revelar o botão oculto
const SWIPE_THRESHOLD = -76; 

export function CredentialCard({ credential, onClick, onCopy }: CredentialCardProps) {
  const { trigger } = useHapticFeedback();
  const { isPrivate } = usePrivacyMode();
  
  const [copiedPass, setCopiedPass] = useState(false);
  const [copiedUser, setCopiedUser] = useState(false);
  const [hasIconError, setHasIconError] = useState(false);
  const [isSwiped, setIsSwiped] = useState(false);

  const controls = useAnimation();
  const faviconUrl = getFaviconUrl(credential.url || "");

  // Lógica de física ao arrastar o card
  const handleDragEnd = (event: any, info: PanInfo) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    // Se arrastou além do limite ou com velocidade rápida para a esquerda
    if (offset < -40 || velocity < -500) {
      controls.start({ x: SWIPE_THRESHOLD });
      setIsSwiped(true);
      trigger("vibrate"); // Feedback tátil ao travar aberto
    } else {
      // Volta pro lugar
      controls.start({ x: 0 });
      setIsSwiped(false);
    }
  };

  const handleCardClick = () => {
    // Se estiver com o swipe aberto, um toque apenas fecha ele
    if (isSwiped) {
      controls.start({ x: 0 });
      setIsSwiped(false);
      return;
    }
    trigger("vibrate");
    onClick();
  };

  const handleCopyPassClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    trigger("vibrate");
    onCopy(e);
    setCopiedPass(true);
    setTimeout(() => setCopiedPass(false), 2000);
  };

  const handleCopyUserClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!credential.username) return;
    
    trigger("vibrate");
    try {
      await Clipboard.write({ string: credential.username });
      setCopiedUser(true);
      setTimeout(() => {
        setCopiedUser(false);
        // Fecha o swipe automaticamente após copiar
        controls.start({ x: 0 });
        setIsSwiped(false);
      }, 1500);
    } catch (error) {
      console.error("Erro ao copiar usuário:", error);
    }
  };

  return (
    <div className="relative w-full rounded-[26px] overflow-hidden bg-ice/15">
      {/* 
        CAMADA DE FUNDO (Ações Ocultas)
        Fica ancorada à direita e só aparece quando a frente desliza. 
      */}
      <div className="absolute right-0 top-0 bottom-0 flex w-[76px] items-center justify-center">
        <button
          onClick={handleCopyUserClick}
          disabled={!credential.username}
          className="flex h-full w-full flex-col items-center justify-center gap-1 text-ice transition-all active:bg-ice/20 disabled:opacity-30"
        >
          {copiedUser ? <Check size={20} /> : <AtSign size={20} />}
          <span className="text-[10px] font-medium uppercase tracking-widest">
            {copiedUser ? "Copiado" : "Usuário"}
          </span>
        </button>
      </div>

      {/* 
        CAMADA DA FRENTE (O Card Principal)
        Tem propriedade de Drag (arrastar) habilitada.
      */}
      <motion.div
        drag="x"
        dragConstraints={{ left: SWIPE_THRESHOLD, right: 0 }}
        dragElastic={0.15}
        dragDirectionLock
        onDragEnd={handleDragEnd}
        animate={controls}
        onClick={handleCardClick}
        className="relative z-10 flex cursor-pointer items-center justify-between gap-4 rounded-[26px] border border-surface-border/50 bg-surface p-4 shadow-sm transition-colors active:bg-surface-raised"
      >
        <div className="flex min-w-0 items-center gap-4">
          {/* Logo Automática ou Ícone Padrão */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-surface-border/40 bg-surface-raised">
            {faviconUrl && !hasIconError ? (
              <img
                src={faviconUrl}
                alt={credential.title}
                className="h-6 w-6 object-contain"
                onError={() => setHasIconError(true)}
              />
            ) : (
              <KeyRound size={20} className="text-ice" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="truncate font-display text-base font-semibold text-ink-primary">
              {credential.title}
            </h3>
            {credential.username ? (
              <p className="truncate text-sm text-ink-muted flex items-center gap-1.5 mt-0.5">
                <User size={12} className="text-ink-faint" />
                {isPrivate ? "••••••••••••" : credential.username}
              </p>
            ) : (
              <div className="mt-0.5 flex items-center gap-1 text-xs text-ink-faint">
                <Lock size={10} />
                <span>Sem usuário</span>
              </div>
            )}
          </div>
        </div>

        {/* Botão de Copiar Senha (Original) */}
        <button
          onClick={handleCopyPassClick}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all ${
            copiedPass 
              ? "border-ice bg-ice/10 text-ice" 
              : "border-surface-border/50 bg-surface-raised text-ink-muted hover:border-ice/30 hover:text-ink-primary"
          }`}
          aria-label="Copiar senha"
        >
          {copiedPass ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </motion.div>
    </div>
  );
}
