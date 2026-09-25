"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, BrainCircuit, ChevronLeft, ChevronRight, CircleCheck, CreditCard, Database, FileText, KeyRound, Landmark, ShieldCheck, WalletCards } from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { VaultInsightSheet } from "@/components/vault-intelligence/VaultInsightSheet";
import { HealthInsightSheet } from "@/components/vault-intelligence/HealthInsightSheet";
import { useHealthIntelligence } from "@/hooks/useHealthIntelligence";
import type { HealthInsight } from "@/lib/health-insights";
import { useVaultIntelligence } from "@/hooks/useVaultIntelligence";
import type { VaultGeneralInsight, VaultInsightKind } from "@/lib/vault-intelligence/types";

const kindMeta: Record<VaultInsightKind, { label: string; classes: string }> = {
  attention: { label: "Atenção", classes: "border-amber-400/25 bg-amber-400/10 text-amber-300" },
  security: { label: "Proteção", classes: "border-violet-400/25 bg-violet-400/10 text-violet-300" },
  data_quality: { label: "Qualidade", classes: "border-sky-400/25 bg-sky-400/10 text-sky-300" },
  organization: { label: "Organização", classes: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300" },
  financial: { label: "Financeiro", classes: "border-cyan-400/25 bg-cyan-400/10 text-cyan-300" },
};

export default function VaultIntelligencePage() {
  const router = useRouter();
  const intelligence = useVaultIntelligence();
  const health = useHealthIntelligence();
  const [selected, setSelected] = useState<VaultGeneralInsight | null>(null);
  const [selectedHealth, setSelectedHealth] = useState<HealthInsight | null>(null);
  const grouped = useMemo(() => {
    const order: VaultInsightKind[] = ["attention", "financial", "security", "data_quality", "organization"];
    return order.map((kind) => ({ kind, items: intelligence.insights.filter((item) => item.kind === kind) })).filter((group) => group.items.length);
  }, [intelligence.insights]);
  const coverage = intelligence.coverage;
  const counters = [
    { label: "Senhas", value: coverage?.credentials || 0, icon: KeyRound },
    { label: "Cartões", value: coverage?.cards || 0, icon: CreditCard },
    { label: "Contas", value: coverage?.accounts || 0, icon: Landmark },
    { label: "Documentos", value: coverage?.documents || 0, icon: FileText },
    { label: "Compras", value: coverage?.acquisitions || 0, icon: WalletCards },
  ];

  return <PageTransition><main className="min-h-screen bg-void px-5 pb-32 pt-8 text-ink-primary">
    <header className="mx-auto flex max-w-2xl items-start gap-3">
      <button type="button" onClick={() => router.replace("/mais")} className="rounded-2xl border border-surface-border bg-surface p-3 text-ink-muted" aria-label="Voltar para Mais"><ChevronLeft size={20}/></button>
      <div className="min-w-0"><p className="font-mono text-[9px] uppercase tracking-[0.25em] text-ice">Vault Intelligence</p><h1 className="text-2xl font-bold">Central de atenção</h1><p className="mt-1 text-xs leading-relaxed text-ink-muted">Prioriza vencimentos, inconsistências, organização e sinais financeiros sustentados pelos dados que o Vault realmente possui.</p></div>
    </header>

    <section className="mx-auto mt-6 max-w-2xl overflow-hidden rounded-[28px] border border-ice/20 bg-gradient-to-br from-ice/10 via-surface to-violet-400/[0.06]">
      <div className="flex items-start gap-3 p-5"><div className="rounded-2xl bg-ice/10 p-3 text-ice"><ShieldCheck size={22}/></div><div><h2 className="font-bold">Leitura local e explicável</h2><p className="mt-1 text-xs leading-relaxed text-ink-muted">O motor cruza apenas metadados da pessoa ativa. Não abre senhas, número completo de cartão ou CVV e não promete segurança absoluta.</p></div></div>
      <div className="grid grid-cols-5 border-t border-surface-border/50">{counters.map(({ label, value, icon: Icon }) => <div key={label} className="flex min-w-0 flex-col items-center border-r border-surface-border/40 px-1 py-3 last:border-r-0"><Icon size={15} className="text-ice"/><strong className="mt-1 text-base">{value}</strong><span className="max-w-full truncate text-[8px] uppercase text-ink-faint">{label}</span></div>)}</div>
    </section>

    <section className="mx-auto mt-6 max-w-2xl">
      <div className="flex items-end justify-between gap-3"><div><h2 className="font-bold">Saúde agora</h2><p className="text-xs text-ink-muted">Sinais priorizados pelo histórico da pessoa ativa.</p></div><div className="rounded-full border border-violet-400/20 bg-violet-400/[0.07] px-3 py-1.5 font-mono text-[9px] text-violet-300">{health.maturity.score}% contexto</div></div>
      {health.isLoading ? <div className="mt-3 rounded-[24px] border border-surface-border bg-surface p-4 text-xs text-ink-muted">Analisando histórico de saúde…</div> : health.highlights.length ? <div className="mt-3 space-y-2.5">{health.highlights.map((insight) => <button key={insight.id} type="button" onClick={() => setSelectedHealth(insight)} className="flex w-full items-center gap-3 rounded-[24px] border border-violet-400/15 bg-violet-400/[0.04] p-4 text-left active:scale-[0.985]"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-400/10 text-violet-300">{insight.urgencia === "alta" ? <AlertTriangle size={18}/> : <BrainCircuit size={18}/>}</div><div className="min-w-0 flex-1"><p className="text-sm font-bold">{insight.titulo}</p><p className="mt-1 line-clamp-2 text-xs text-ink-muted">{insight.mensagem}</p><p className="mt-2 font-mono text-[9px] uppercase text-ink-faint">Confiança {insight.confianca} · amostra {insight.amostra}</p></div><ChevronRight size={17} className="text-ink-faint"/></button>)}</div> : <div className="mt-3 rounded-[24px] border border-emerald-400/15 bg-emerald-400/[0.04] p-4"><p className="text-xs font-semibold text-emerald-300">Sem sinal prioritário agora</p><p className="mt-1 text-[10px] text-ink-muted">Os dados disponíveis não produziram destaque com confiança e amostra suficientes.</p></div>}
    </section>

    <section className="mx-auto mt-6 max-w-2xl">
      <div className="flex items-end justify-between"><div><h2 className="font-bold">Cofre e organização</h2><p className="text-xs text-ink-muted">Mais urgente primeiro, com evidências auditáveis.</p></div><div className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 font-mono text-[9px] text-ink-muted"><Database size={12}/>{coverage?.total || 0} itens</div></div>
      {intelligence.isLoading ? <div className="mt-4 rounded-[24px] border border-surface-border bg-surface p-5 text-sm text-ink-muted">Analisando metadados locais…</div> : grouped.length === 0 ? <div className="mt-4 rounded-[24px] border border-emerald-400/20 bg-emerald-400/5 p-5"><div className="flex items-center gap-2 font-semibold text-emerald-400"><CircleCheck size={18}/>Nenhuma pendência observada</div><p className="mt-2 text-xs leading-relaxed text-ink-muted">Os dados disponíveis não produziram alertas agora. Isso não equivale a uma auditoria externa de segurança.</p></div> : <div className="mt-4 space-y-6">{grouped.map(({ kind, items }) => <div key={kind}><div className="mb-2 flex items-center gap-2"><span className={`rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wide ${kindMeta[kind].classes}`}>{kindMeta[kind].label}</span><span className="text-[10px] text-ink-faint">{items.length}</span></div><div className="space-y-2.5">{items.map((insight) => <button key={insight.id} type="button" onClick={() => setSelected(insight)} className="flex w-full items-center gap-3 rounded-[24px] border border-surface-border bg-surface p-4 text-left transition active:scale-[0.985]"><div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${kindMeta[kind].classes}`}>{kind === "attention" ? <AlertTriangle size={18}/> : <BrainCircuit size={18}/>}</div><div className="min-w-0 flex-1"><p className="text-sm font-bold">{insight.title}</p><p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-muted">{insight.message}</p><p className="mt-2 font-mono text-[9px] uppercase text-ink-faint">Confiança {insight.confidence} · amostra {insight.sample}</p></div><ChevronRight size={17} className="shrink-0 text-ink-faint"/></button>)}</div></div>)}</div>}
    </section>
    <VaultInsightSheet insight={selected} onClose={() => setSelected(null)} onNavigate={(href) => { setSelected(null); router.push(href); }}/>
    <HealthInsightSheet insight={selectedHealth} onClose={() => setSelectedHealth(null)} onNavigate={(href) => { setSelectedHealth(null); router.push(href); }}/>
  </main></PageTransition>;
}
