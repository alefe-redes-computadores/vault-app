"use client";
import type { MedicationSupplyRoute } from "@/lib/health-supply/route-authority";

/** Historical/source evidence only — never claims that SUS will dispense a dose. */
export function MedicationListRouteLabel({route,label}:{route:MedicationSupplyRoute|null|undefined;label:string}) {
  if (!route || route.mode === "none" || route.labels.length===0) return null;
  const tone = route.mode === "hybrid" ? "text-violet-200 bg-violet-400/[0.065]" :
    route.mode === "private" ? "text-ice bg-ice/[0.065]" : "text-emerald-200 bg-emerald-400/[0.065]";
  return <span className={`max-w-full truncate rounded-md px-1.5 py-0.5 text-[9px] font-medium ${tone}`}
    title={`Origem registrada: ${label}. Verificar a etapa atual nos detalhes.`}
    aria-label={`Origem registrada: ${label}`}>
    {label}
  </span>;
}
