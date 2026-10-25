"use client";
import { BRAIN_NAME } from "@/lib/health-intelligence/version";
// VAULT_INTELLIGENCE_COMPACT_V70
// Mais -> Central de atenção -> Saúde longitudinal.

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, BrainCircuit, ChevronLeft, ChevronRight, CircleCheck, CreditCard, Database, FileText, KeyRound, Landmark, ShieldCheck, WalletCards } from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { VaultInsightSheet } from "@/components/vault-intelligence/VaultInsightSheet";
import { HealthInsightSheet } from "@/components/vault-intelligence/HealthInsightSheet";
import { useSharedHealthIntelligence as useHealthIntelligence } from "@/contexts/HealthIntelligenceContext";
import type { HealthInsight } from "@/lib/health-insights";
import { useVaultIntelligence } from "@/hooks/useVaultIntelligence";
import type { VaultGeneralInsight, VaultInsightKind } from "@/lib/vault-intelligence/types";
import { useReturnContext } from "@/hooks/useReturnContext";
import { CareForecastAgenda } from "@/components/saude/CareForecastAgenda";

const kindMeta: Record<VaultInsightKind, { label: string; classes: string }> = {
  attention: { label: "Atenção", classes: "border-amber-400/25 bg-amber-400/10 text-amber-300" },
  security: { label: "Proteção", classes: "border-violet-400/25 bg-violet-400/10 text-violet-300" },
  data_quality: { label: "Qualidade", classes: "border-rose-400/25 bg-rose-400/10 text-rose-300" },
  organization: { label: "Organização", classes: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300" },
  financial: { label: "Financeiro", classes: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300" },
};
const brl=(value:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(value);

export default function VaultIntelligencePage() {
  const router = useRouter();
  const { backTarget, preserveReturn } = useReturnContext("/mais");
  const intelligence = useVaultIntelligence();
  const health = useHealthIntelligence({ includeAudit: false });
  const [selected, setSelected] = useState<VaultGeneralInsight | null>(null);
  const [selectedHealth, setSelectedHealth] = useState<HealthInsight | null>(null);
  const openedNotificationInsightRef = useRef<string | null>(null);

  // VAULT_INSIGHT_EXACT_ENTRY_V1
  // Deep-link nativo abre diretamente o sheet do Insight notificado.
  useEffect(() => {
    if (health.isLoading || typeof window === "undefined") return;

    const insightId =
      new URLSearchParams(window.location.search)
        .get("healthInsight")
        ?.trim();

    if (!insightId || openedNotificationInsightRef.current === insightId) {
      return;
    }

    openedNotificationInsightRef.current = insightId;

    const match = health.insights.find((item) => item.id === insightId);
    if (match) {
      setSelectedHealth(match);
    }
  }, [health.isLoading, health.insights]);
  const grouped = useMemo(() => {
    const order: VaultInsightKind[] = ["attention", "financial", "security", "data_quality", "organization"];
    return order.map((kind) => ({ kind, items: intelligence.insights.filter((item) => item.kind === kind) })).filter((group) => group.items.length);
  }, [intelligence.insights]);
  const coverage = intelligence.coverage;
  const counters = [
    { label: "Senhas", value: coverage?.credentials || 0, icon: KeyRound, tone: "text-violet-300" },
    { label: "Cartões", value: coverage?.cards || 0, icon: CreditCard, tone: "text-rose-300" },
    { label: "Contas", value: coverage?.accounts || 0, icon: Landmark, tone: "text-amber-300" },
    { label: "Documentos", value: coverage?.documents || 0, icon: FileText, tone: "text-emerald-300" },
    { label: "Compras", value: coverage?.acquisitions || 0, icon: WalletCards, tone: "text-orange-300" },
  ];

  return <PageTransition><main className="min-h-screen bg-void px-5 pb-32 pt-5 header-safe-top text-ink-primary">
    <header className="mx-auto flex max-w-2xl items-start gap-3">
      <button type="button" onClick={() => router.replace(backTarget)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-surface-border bg-surface text-ink-muted" aria-label="Voltar"><ChevronLeft size={20}/></button>
      <div className="min-w-0"><p className="font-mono text-[9px] uppercase tracking-[0.25em] text-ice">VAULT INSIGHT</p><h1 className="text-2xl font-bold">Vault Insight</h1><p className="mt-1 text-xs leading-relaxed text-ink-muted">Prioriza vencimentos, inconsistências, organização e sinais financeiros sustentados pelos dados que o Vault realmente possui.</p></div>
    </header>

    <section className="mx-auto mt-4 max-w-2xl overflow-hidden rounded-[22px] border border-surface-border/70 bg-gradient-to-br from-emerald-400/[0.06] via-surface to-violet-400/[0.05]">
      <div className="flex items-start gap-3 px-4 py-3"><div className="rounded-2xl bg-emerald-400/10 p-3 text-emerald-300"><ShieldCheck size={22}/></div><div><h2 className="font-bold">Leitura local e explicável</h2><p className="mt-1 text-xs leading-relaxed text-ink-muted">O motor cruza apenas metadados da pessoa ativa. Não abre senhas, número completo de cartão ou CVV e não promete segurança absoluta.</p></div></div>
      <div className="grid grid-cols-3 border-t border-surface-border/50 min-[430px]:grid-cols-5">{counters.map(({ label, value, icon: Icon, tone }, index) => <div key={label} className={`flex min-w-0 items-center gap-2 border-surface-border/40 px-2.5 py-2.5 min-[430px]:flex-col min-[430px]:gap-0 min-[430px]:border-r min-[430px]:px-1 ${index < 3 ? "border-b min-[430px]:border-b-0" : ""} ${index === 2 ? "min-[430px]:border-r" : ""}`}><Icon size={15} className={`shrink-0 ${tone}`}/><div className="min-w-0 min-[430px]:text-center"><strong className="block text-sm leading-none min-[430px]:mt-1 min-[430px]:text-base">{value}</strong><span className="mt-1 block truncate text-[8px] uppercase text-ink-faint">{label}</span></div></div>)}</div>
    </section>

    {/* VAULT_BRAIN_V4_EXPERIENCE_ENTRY */}
    <section className="mx-auto mt-6 max-w-2xl">
      <button type="button" onClick={() => router.push(preserveReturn("/inteligencia/alertas"))} className="flex min-h-[72px] w-full items-center gap-3 rounded-[20px] border border-violet-400/20 bg-gradient-to-r from-violet-400/[0.07] to-surface p-3.5 text-left active:scale-[0.985]">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-400/10 text-violet-300"><BrainCircuit size={19}/></div>
        <div className="min-w-0 flex-1"><p className="text-sm font-bold">{BRAIN_NAME}</p><p className="mt-1 text-xs text-ink-muted">Atenção agora, segurança, padrões, qualidade dos dados e histórico persistente.</p></div>
        <ChevronRight size={17} className="text-ink-faint"/>
      </button>
    </section>

    {!health.isLoading ? <CareForecastAgenda context={health.context} forecast={health.careCommand?.forecast} onNavigate={(href) => router.push(preserveReturn(`${href}`))}/> : null}

    {coverage&&coverage.acquisitions>0?<section aria-label="Inteligência financeira de saúde" className="mx-auto mt-4 max-w-2xl rounded-[20px] border border-emerald-400/20 bg-gradient-to-br from-emerald-400/[.07] to-surface p-4"><div className="flex items-center gap-2"><WalletCards size={17} className="text-emerald-300"/><h2 className="text-sm font-bold">Custos de saúde documentados</h2><span className="ml-auto text-[9px] text-ink-faint">{coverage.financialCoverage}% coberto</span></div><div className="mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-surface-border/60 bg-surface-border/50"><div className="bg-surface p-3"><span className="text-[8px] uppercase text-ink-faint">Realizado · 30d</span><strong className="mt-1 block text-xs text-ink-primary">{brl(coverage.financialSpend30d)}</strong></div><div className="bg-surface p-3"><span className="text-[8px] uppercase text-ink-faint">Realizado · 90d</span><strong className="mt-1 block text-xs text-ink-primary">{brl(coverage.financialSpend90d)}</strong></div><div className="bg-surface p-3"><span className="text-[8px] uppercase text-ink-faint">Planejado · 30d</span><strong className="mt-1 block text-xs text-amber-200">{coverage.plannedAcquisitions30d?brl(coverage.plannedAmount30d):"Nenhum"}</strong></div></div><p className="mt-2 text-[9px] leading-relaxed text-ink-muted">Realizado considera somente aquisição em data passada ou atual com valor informado. Planejado permanece separado e não altera estoque nem gasto.</p></section>:null}

    <section className="mx-auto mt-6 max-w-2xl">
      <div className="flex items-end justify-between gap-3"><div><h2 className="font-bold">Saúde agora</h2><p className="text-xs text-ink-muted">Sinais priorizados pelo histórico da pessoa ativa.</p></div><div className="rounded-full border border-violet-400/20 bg-violet-400/[0.07] px-3 py-1.5 font-mono text-[9px] text-violet-300">{health.maturity.score}% contexto</div></div>
      {health.isLoading ? <div className="mt-3 rounded-[20px] border border-surface-border bg-surface p-4 text-xs text-ink-muted">Analisando histórico de saúde…</div> : health.experienceHighlights.length ? <div className="mt-3 space-y-2.5">{health.experienceHighlights.map((insight) => <button key={insight.id} type="button" onClick={() => setSelectedHealth(insight)} style={{contentVisibility:"auto",containIntrinsicSize:"94px"}} className="flex w-full items-center gap-3 rounded-[20px] border border-violet-400/15 bg-violet-400/[0.04] p-3.5 text-left active:scale-[0.985]"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/10 text-violet-300">{insight.urgencia === "alta" ? <AlertTriangle size={18}/> : <BrainCircuit size={18}/>}</div><div className="min-w-0 flex-1"><p className="break-words text-sm font-bold">{insight.titulo}</p><p className="mt-1 line-clamp-2 text-xs text-ink-muted">{insight.mensagem}</p><p className="mt-2 font-mono text-[9px] uppercase text-ink-faint">Confiança {insight.confianca} · amostra {insight.amostra}</p></div><ChevronRight size={17} className="shrink-0 text-ink-faint"/></button>)}</div> : <div className="mt-3 rounded-[20px] border border-emerald-400/15 bg-emerald-400/[0.04] p-4"><p className="text-xs font-semibold text-emerald-300">Sem sinal prioritário agora</p><p className="mt-1 text-[10px] text-ink-muted">Os dados disponíveis não produziram destaque com confiança e amostra suficientes.</p></div>}
    </section>

    <section className="mx-auto mt-6 max-w-2xl">
      <div className="flex items-end justify-between"><div><h2 className="font-bold">Cofre e organização</h2><p className="text-xs text-ink-muted">Mais urgente primeiro, com evidências auditáveis.</p></div><div className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 font-mono text-[9px] text-ink-muted"><Database size={12}/>{coverage?.total || 0} itens</div></div>
      {intelligence.isLoading ? <div className="mt-4 rounded-[20px] border border-surface-border bg-surface p-5 text-sm text-ink-muted">Analisando metadados locais…</div> : grouped.length === 0 ? <div className="mt-4 rounded-[20px] border border-emerald-400/20 bg-emerald-400/5 p-5"><div className="flex items-center gap-2 font-semibold text-emerald-400"><CircleCheck size={18}/>Nenhuma pendência observada</div><p className="mt-2 text-xs leading-relaxed text-ink-muted">Os dados disponíveis não produziram alertas agora. Isso não equivale a uma auditoria externa de segurança.</p></div> : <div className="mt-4 space-y-4">{grouped.map(({ kind, items }) => <details key={kind} open={kind === "attention"} className="group rounded-[20px] border border-surface-border/50 bg-surface/40 p-3"><summary className="mb-2 flex cursor-pointer list-none items-center gap-2"><span className={`rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wide ${kindMeta[kind].classes}`}>{kindMeta[kind].label}</span><span className="text-[10px] text-ink-muted">{items.length} sinais</span><ChevronRight size={15} className="ml-auto text-ink-muted transition group-open:rotate-90"/></summary><div className="space-y-2.5">{items.map((insight) => <button key={insight.id} type="button" onClick={() => setSelected(insight)} className="flex w-full items-center gap-3 rounded-[20px] border border-surface-border bg-surface p-4 text-left transition active:scale-[0.985]"><div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${kindMeta[kind].classes}`}>{kind === "attention" ? <AlertTriangle size={18}/> : <BrainCircuit size={18}/>}</div><div className="min-w-0 flex-1"><p className="text-sm font-bold">{insight.title}</p><p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-muted">{insight.message}</p><p className="mt-2 font-mono text-[9px] uppercase text-ink-faint">Confiança {insight.confidence} · amostra {insight.sample}</p></div><ChevronRight size={17} className="shrink-0 text-ink-faint"/></button>)}</div></details>)}</div>}
    </section>
    <VaultInsightSheet insight={selected} onClose={() => setSelected(null)} onNavigate={(href) => { setSelected(null); router.push(preserveReturn(href)); }}/>
    <HealthInsightSheet insight={selectedHealth} onClose={() => setSelectedHealth(null)} onNavigate={(href) => { setSelectedHealth(null); router.push(preserveReturn(href)); }}/>
  </main></PageTransition>;
}
