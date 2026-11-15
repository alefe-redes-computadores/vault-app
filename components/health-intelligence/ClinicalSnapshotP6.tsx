"use client";
import { AlertTriangle, BookOpenText, ShieldCheck } from "lucide-react";
import { dose24hComparisonP6 } from "@/lib/health-intelligence/dose-24h-visual-p6";

type Domain = "seguranca" | "regulatorio" | "quantidade" | "observacao";
type MgEvidence = Parameters<typeof dose24hComparisonP6>[0];
export function ClinicalSnapshotP6({domain,summary,priority,hasRegulatorySources,onOpenSafety,doseEvidence}: {
  domain:Domain; summary:string; priority?:string; hasRegulatorySources:boolean;
  onOpenSafety?:()=>void; doseEvidence?:MgEvidence;
}) {
  const mg = doseEvidence ? dose24hComparisonP6(doseEvidence) : null;
  const safety = domain === "seguranca" || domain === "quantidade";
  const label = domain === "seguranca" ? "Segurança" : domain === "regulatorio" ? "Regulatório" : domain === "quantidade" ? "Quantidade registrada" : "Observação do histórico";
  return <section aria-label="Resumo factual em três segundos" className="mt-3 overflow-hidden rounded-[20px] border border-violet-300/20 bg-gradient-to-br from-violet-400/[.095] via-surface to-surface p-3.5">
    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-300/20 bg-violet-300/10 px-2.5 py-1 text-violet-200">{safety?<ShieldCheck size={12}/>:<BookOpenText size={12}/>} {label}</span>
      {priority?<span className="rounded-full border border-amber-300/20 bg-amber-300/[.06] px-2 py-1 text-amber-200">{priority}</span>:null}
      <span className="rounded-full border border-surface-border px-2 py-1 text-ink-muted">{hasRegulatorySources?"Fontes auditáveis":"Origem: registros do VAULT"}</span>
    </div>
    <p className="mt-2 line-clamp-2 break-words text-sm font-semibold leading-relaxed text-ink-primary" title={summary}>{summary}</p>
    {mg?.status === "verified" ? <div className="mt-3 rounded-xl border border-surface-border/60 bg-void/35 p-2.5" aria-label="Comparação factual de dose em 24 horas">
      <div className="flex items-baseline justify-between gap-2 text-[11px]"><span>{mg.recordedMg} mg confirmados / 24h</span><strong>{mg.referenceMg} mg · {mg.referenceLabel}</strong></div>
      <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={mg.barPercent} aria-label="Proporção visual da referência informada" className="mt-2 h-2 overflow-hidden rounded-full bg-surface-border/60"><div className="h-full rounded-full bg-amber-300" style={{width:`${mg.barPercent}%`}}/></div>
      <p className="mt-1.5 text-[10px] leading-relaxed text-ink-muted">Referência de bula não é um limite individual de segurança. Barras acima de 100% ficam visualmente limitadas; a quantidade exata continua mostrada.</p>
    </div> : mg ? <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-relaxed text-ink-muted"><AlertTriangle size={12} className="mt-0.5 shrink-0"/>{mg.reason} O VAULT não faz conversão presumida.</p> : null}
    {safety && onOpenSafety ? <button type="button" onClick={onOpenSafety} className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-[11px] font-semibold text-sky-200"><ShieldCheck size={14}/>Plano de segurança e apoio</button> : null}
  </section>;
}
