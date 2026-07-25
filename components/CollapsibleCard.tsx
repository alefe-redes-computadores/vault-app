"use client";

import { useState, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";

interface CollapsibleCardProps {
  /** Chave única usada pra lembrar o estado (ex: "categoria-saude") */
  storageKey: string;
  /** Conteúdo do cabeçalho (título, contador, ações) */
  header: ReactNode;
  children: ReactNode;
  /** Se true e não houver nada salvo, começa fechado */
  defaultCollapsed?: boolean;
}

function readStoredState(storageKey: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = window.localStorage.getItem(`vault_collapsed_${storageKey}`);
    return stored === null ? fallback : stored === "true";
  } catch {
    return fallback;
  }
}

export function CollapsibleCard({
  storageKey,
  header,
  children,
  defaultCollapsed = false,
}: CollapsibleCardProps) {
  const { trigger } = useHapticFeedback();
  // Lê direto na inicialização pra evitar "flash" de aberto -> fechado
  const [isCollapsed, setIsCollapsed] = useState(() =>
    readStoredState(storageKey, defaultCollapsed)
  );

  // Se o storageKey mudar (ex: componente reaproveitado pra outra categoria)
  useEffect(() => {
    setIsCollapsed(readStoredState(storageKey, defaultCollapsed));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const toggle = () => {
    trigger("vibrate");
    setIsCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(`vault_collapsed_${storageKey}`, String(next));
        } catch {
          // localStorage indisponível (modo privado etc) — ignora silenciosamente
        }
      }
      return next;
    });
  };

  return (
    <div className="rounded-[28px] border border-surface-border/50 bg-surface/60 p-4 shadow-sm backdrop-blur-sm">
      <div
        role="button"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}
        aria-expanded={!isCollapsed}
        className="flex w-full cursor-pointer items-center gap-3 text-left"
      >
        <div className="min-w-0 flex-1">{header}</div>

        <motion.div
          animate={{ rotate: isCollapsed ? -90 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-muted"
        >
          <ChevronDown size={15} />
        </motion.div>
      </div>

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pt-3.5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
