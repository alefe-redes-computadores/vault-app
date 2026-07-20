"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Laptop } from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { motion, AnimatePresence } from "framer-motion";

type Theme = "light" | "dark" | "system";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { trigger } = useHapticFeedback();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface border border-surface-border/50">
        <div className="w-5 h-5 rounded-full bg-surface-border animate-pulse" />
        <div className="w-16 h-4 rounded bg-surface-border animate-pulse" />
      </div>
    );
  }

  const themes: { value: Theme; icon: typeof Sun; label: string }[] = [
    { value: "light", icon: Sun, label: "Claro" },
    { value: "dark", icon: Moon, label: "Escuro" },
    { value: "system", icon: Laptop, label: "Automático" },
  ];

  const currentTheme = theme as Theme || "system";
  const currentLabel = themes.find(t => t.value === currentTheme)?.label || "Automático";
  const CurrentIcon = themes.find(t => t.value === currentTheme)?.icon || Laptop;

  const getNextTheme = (): Theme => {
    const index = themes.findIndex(t => t.value === currentTheme);
    return themes[(index + 1) % themes.length].value;
  };

  const handleToggle = () => {
    const next = getNextTheme();
    setTheme(next);
    trigger("vibrate");
  };

  return (
    <button
      onClick={handleToggle}
      className="flex items-center gap-3 w-full p-3 rounded-xl bg-surface border border-surface-border/50 hover:bg-surface-border transition-all active:scale-95"
    >
      <div className="w-10 h-10 rounded-full bg-surface-raised border border-surface-border/50 flex items-center justify-center flex-shrink-0">
        <CurrentIcon size={18} className="text-ink-muted" />
      </div>
      <div className="flex-1 text-left">
        <p className="text-sm font-medium text-ink-primary">Tema</p>
        <p className="text-xs text-ink-muted">
          {currentLabel} {resolvedTheme === "dark" ? "🌙" : "☀️"}
        </p>
      </div>
      <div className="flex gap-1">
        {themes.map((t) => (
          <div
            key={t.value}
            className={`w-2 h-2 rounded-full transition-all ${
              currentTheme === t.value
                ? "bg-ice scale-125"
                : "bg-surface-border"
            }`}
          />
        ))}
      </div>
    </button>
  );
}