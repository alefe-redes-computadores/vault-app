"use client";
import { Clock3, SmilePlus, ChevronRight } from "lucide-react";
import type { AvatarBodyContext } from "@/lib/health-profile/avatar-body";
import { projectAvatarPresenceM102 } from "@/lib/health-profile/avatar-presence-m102";

/** Low-cost view: no sensor reads, no inferred affect, no WebGL loop. */
export function AvatarEvidenceStripM102({ context, onOpenMood }: {
  context: AvatarBodyContext;
  onOpenMood: () => void;
}) {
  const data = projectAvatarPresenceM102(context);
  return <button type="button" onClick={onOpenMood}
    aria-label={`${data.headline}. Abrir evidências do humor ilustrado`}
    className="flex min-h-11 w-full items-center gap-2 border-t border-emerald-300/10 bg-surface-raised/30 px-3 py-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300">
    <span className="grid size-8 shrink-0 place-items-center rounded-xl border border-emerald-400/15 bg-emerald-400/[.06] text-emerald-300">
      {data.recency === "unreported" ? <SmilePlus size={15} aria-hidden="true"/> : <Clock3 size={15} aria-hidden="true"/>}
    </span>
    <span className="min-w-0 flex-1">
      <strong className="block text-[11px] font-semibold text-ink-primary">{data.headline}</strong>
      <span className="mt-0.5 block text-[10px] leading-snug text-ink-muted">{data.coverageDays}/7 dias documentados · rosto ilustrativo</span>
    </span>
    <ChevronRight size={14} className="shrink-0 text-ink-muted" aria-hidden="true"/>
  </button>;
}
