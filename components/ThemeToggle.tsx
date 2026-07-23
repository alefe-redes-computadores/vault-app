"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Laptop, ChevronRight } from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";

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
      <div className="flex items-center gap-3 rounded-[22px] border border-surface-border/50 bg-surface p-3.5">
        <div className="h-10 w-10 rounded-full bg-surface-border animate-pulse" />
        <div className="flex-1">
          <div className="h-4 w-20 rounded bg-surface-border animate-pulse" />
          <div className="mt-1 h-3 w-28 rounded bg-surface-border animate-pulse" />
        </div>
      </div>
    );
  }

  const themes: { value: Theme; icon: typeof Sun; label: string }[] = [
    { value: "light", icon: Sun, label: "Claro" },
    { value: "dark", icon: Moon, label: "Escuro" },
    { value: "system", icon: Laptop, label: "Automático" },
  ];

  const currentTheme = (theme as Theme) || "system";
  const currentConfig = themes.find((t) => t.value === currentTheme) || themes[2];
  const CurrentIcon = currentConfig.icon;

  const getNextTheme = (): Theme => {
    const index = themes.findIndex((t) => t.value === currentTheme);
    return themes[(index + 1) % themes.length].value;
  };

  const handleToggle = () => {
    const next = getNextTheme();
    setTheme(next);
    trigger("vibrate");
  };

  const resolvedLabel =
    currentTheme === "system"
      ? resolvedTheme === "dark"
        ? "Automático · Escuro"
        : "Automático · Claro"
      : currentConfig.label;

  return (
    <button
      onClick={handleToggle}
      className="flex w-full items-center gap-4 rounded-[22px] border border-surface-border/50 bg-surface p-3.5 text-left transition-all active:scale-[0.985] hover:bg-surface-raised/80"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised">
        <CurrentIcon size={18} className="text-ink-muted" />
      </div>

      <div className="flex-1">
        <p className="text-sm font-medium text-ink-primary">Tema</p>
        <p className="text-xs text-ink-muted">{resolvedLabel}</p>
      </div>

      <div className="flex items-center gap-1">
        {themes.map((t) => (
          <div
            key={t.value}
            className={`h-2 w-2 rounded-full transition-all ${
              currentTheme === t.value
                ? "scale-125 bg-ice"
                : "bg-surface-border"
            }`}
          />
        ))}
        <ChevronRight size={14} className="ml-1 text-ink-faint" />
      </div>
    </button>
  );
}