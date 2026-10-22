"use client";

import { useEffect, useState } from "react";
import { getLocalTodayISO } from "@/lib/health-utils";

/** Atualiza compromissos e inteligência na virada do dia ou ao voltar ao app. */
export function useLocalDay(): string {
  const [today, setToday] = useState(() => getLocalTodayISO());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      setToday(getLocalTodayISO());
      const now = new Date();
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = setTimeout(refresh, Math.max(1000, midnight.getTime() - now.getTime() + 100));
    };
    const onVisible = () => {
      if (document.hidden) return;
      clearTimeout(timer);
      refresh();
    };
    refresh();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onVisible);
    };
  }, []);

  return today;
}
