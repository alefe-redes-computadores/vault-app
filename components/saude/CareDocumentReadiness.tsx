"use client";
import Link from "next/link";
import { CheckCircle2, ChevronRight, CircleHelp, FileCheck2, FileWarning } from "lucide-react";
import type { CareDocumentReadinessPortfolio, CareDocumentStatus } from "@/lib/health-intelligence/care-document-readiness";

const meta: Record<CareDocumentStatus, { label: string; tone: string; icon: typeof CheckCircle2 }> = {
  available: { label: "Disponível", tone: "text-emerald-300 bg-emerald-300/10", icon: CheckCircle2 },
  missing: { label: "Falta explícita", tone: "text-amber-300 bg-amber-300/10", icon: FileWarning },
  not_informed: { label: "Não informado", tone: "text-cyan-300 bg-cyan-300/10", icon: CircleHelp },
  not_required: { label: "Não se aplica", tone: "text-ink-muted bg-white/[.04]", icon: FileCheck2 },
};

export function CareDocumentReadiness({ portfolio, limit = 5 }: { portfolio: CareDocumentReadinessPortfolio; limit?: number }) {
  if (!portfolio.items.length) return null;
  const ordered = [...portfolio.items].sort((a, b) => Number(b.requirements.some(row => row.status === "missing")) - Number(a.requirements.some(row => row.status === "missing")) || a.medicationName.localeCompare(b.medicationName, "pt-BR"));
  return <section className="rounded-[24px] border border-cyan-300/15 bg-gradient-to-br from-cyan-300/[.04] to-surface p-4 print:border-gray-300 print:bg-white" aria-label="Documentos por finalidade">
    <h2 className="text-sm font-semibold text-ink-primary print:text-black">Documentos por finalidade</h2>
    <p className="mt-1 text-[10px] leading-relaxed text-ink-muted">Receita, documento SUS e comprovante de compra têm papéis diferentes.</p>
    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{(["available","missing","not_informed","not_required"] as CareDocumentStatus[]).map(status => <div key={status} className="rounded-xl border border-surface-border/60 bg-surface-raised p-2"><strong className="text-sm">{portfolio.counts[status]}</strong><p className="text-[8px] text-ink-muted">{meta[status].label}</p></div>)}</div>
    <div className="mt-3 space-y-2">{ordered.slice(0, limit).map(item => <Link key={item.medicationId} href={item.href} className="block rounded-2xl border border-surface-border/70 bg-surface-raised p-3">
      <div className="flex items-center gap-2"><strong className="min-w-0 flex-1 truncate text-xs text-ink-primary">{item.medicationName}</strong><span className="text-[8px] text-ink-faint">{item.routeLabel}</span><ChevronRight size={14} className="text-ink-faint"/></div>
      <div className="mt-2 flex flex-wrap gap-1.5">{item.requirements.map(row => { const view=meta[row.status], Icon=view.icon; return <span key={row.lane} title={row.detail} className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[8px] ${view.tone}`}><Icon size={10}/>{row.label}: {view.label}</span>; })}</div>
    </Link>)}</div>
    <p className="mt-2 text-[9px] leading-relaxed text-ink-faint">{portfolio.note}</p>
  </section>;
}
