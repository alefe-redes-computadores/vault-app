"use client";
import { Info } from "lucide-react";

type EvidenceKind = "recorded" | "projected" | "association" | "missing_data" | string | undefined | null;
/** Supplement to a canonical Brain decision, never a new decision engine. */
export function AvatarEvidenceBoundary({ kind }: { kind: EvidenceKind }) {
  const note = kind === "projected"
    ? "Planejamento previsto · ainda não realizado"
    : kind === "association"
    ? "Associação de registros · sem causalidade demonstrada"
    : kind === "missing_data"
    ? "Dados incompletos · confira os registros"
    : null;
  if (!note) return null;
  return <span className="inline-flex max-w-full items-start gap-1.5 rounded-lg border border-violet-300/15 bg-violet-300/[.04] px-2 py-1 text-[10px] leading-relaxed text-violet-100/80" role="note">
    <Info size={12} className="mt-0.5 shrink-0" aria-hidden="true"/>
    <span>{note}</span>
  </span>;
}
