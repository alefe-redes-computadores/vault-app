"use client";

import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { todayAreas } from "./TodayJourneyRailP5";

export function TodayArea({ area, id, preview, defaultOpen = false, children }: {
  id: string;
  area: keyof typeof todayAreas;
  preview: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const { label, Icon, tone } = todayAreas[area];
  return (
    <details id={id} tabIndex={-1} open={defaultOpen} data-vault-remember-r2={area} data-vault-default-open={defaultOpen ? "1" : "0"}
      className="group/area min-w-0 scroll-mt-24 rounded-[22px] border border-surface-border/70 bg-surface/55">
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-[22px] px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">
        <Icon size={21} className={`shrink-0 ${tone}`} aria-hidden="true"/>
        <span className="min-w-0 flex-1">
          <strong className="block text-sm text-ink-primary">{label}</strong>
          <span className="block break-words text-xs leading-relaxed text-ink-muted">{preview}</span>
        </span>
        <ChevronDown size={18} aria-hidden="true" className="shrink-0 text-ink-muted group-open/area:rotate-180"/>
      </summary>
      <div className={`min-w-0 space-y-2.5 border-t border-surface-border/45 ${area === "doses" ? "p-1.5" : "p-2.5"}`}>
        {children}
      </div>
    </details>
  );
}
