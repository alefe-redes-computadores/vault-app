"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { FileHeart, X, ChevronRight } from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";

const STORAGE_KEY = "health-docs-banner-last-shown";

export function HealthDocsBanner() {
  const router = useRouter();
  const { trigger } = useHapticFeedback();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const today = new Date().toDateString();
    const lastShown = localStorage.getItem(STORAGE_KEY);

    if (lastShown !== today) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    const today = new Date().toDateString();
    localStorage.setItem(STORAGE_KEY, today);
    setIsVisible(false);
    trigger("vibrate");
  };

  const handleNavigate = () => {
    trigger("vibrate");
    handleDismiss(); // marca como visto ao navegar
    router.push("/saude/documentos");
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative mb-4 rounded-[22px] border border-ice/20 bg-gradient-to-r from-ice/5 to-surface p-4 shadow-sm"
      >
        <div className="flex items-center gap-3 pr-8">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice">
            <FileHeart size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink-primary">
              Procurando documentos de saúde?
            </p>
            <p className="text-xs text-ink-muted">
              Receitas, laudos e exames estão organizados no acervo clínico.
            </p>
          </div>
          <button
            onClick={handleNavigate}
            className="flex shrink-0 items-center gap-1 rounded-full bg-ice/20 px-3 py-1.5 text-xs font-medium text-ice transition-all active:scale-95"
          >
            Acessar
            <ChevronRight size={14} />
          </button>
        </div>

        <button
          onClick={handleDismiss}
          className="absolute right-3 top-3 rounded-full p-1 text-ink-muted/50 transition-colors hover:text-ink-muted"
          aria-label="Fechar"
        >
          <X size={16} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}