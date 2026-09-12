"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BrainCircuit, ChevronLeft, ChevronRight, Database, ShieldCheck } from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { VaultInsightSheet } from "@/components/vault-intelligence/VaultInsightSheet";
import { useVaultIntelligence } from "@/hooks/useVaultIntelligence";
import type { VaultGeneralInsight } from "@/lib/vault-intelligence/types";

export default function VaultIntelligencePage() {
  const router = useRouter();
  const intelligence = useVaultIntelligence();
  const [selected, setSelected] = useState<VaultGeneralInsight | null>(null);

  return (
    <PageTransition>
      <main className="min-h-screen bg-void px-5 pb-32 pt-8 text-ink-primary">
        <header className="mx-auto flex max-w-2xl items-center gap-3">
          <button type="button" onClick={() => router.back()} className="rounded-2xl border border-surface-border bg-surface p-3 text-ink-muted" aria-label="Voltar"><ChevronLeft size={20} /></button>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-ice">Vault Intelligence</p>
            <h1 className="text-2xl font-bold">Inteligência do cofre</h1>
            <p className="mt-1 text-xs text-ink-muted">Sinais explicáveis de organização, qualidade e proteção.</p>
          </div>
        </header>

        <section className="mx-auto mt-6 max-w-2xl rounded-[26px] border border-ice/20 bg-gradient-to-br from-ice/10 to-surface p-5">
          <div className="flex items-start gap-3"><div className="rounded-2xl bg-ice/10 p-3 text-ice"><ShieldCheck size={22} /></div><div><h2 className="font-bold">Análise sem abrir seus segredos</h2><p className="mt-1 text-xs leading-relaxed text-ink-muted">O motor observa apenas metadados necessários. Ele não lê senhas, números completos de cartão nem CVV e não afirma segurança absoluta.</p></div></div>
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-void/70 px-3 py-2.5 text-xs text-ink-muted"><Database size={15} className="text-ice" />{intelligence.coverage?.total || 0} item(ns) no escopo da pessoa ativa</div>
        </section>

        <section className="mx-auto mt-6 max-w-2xl space-y-3">
          <div className="flex items-end justify-between"><div><h2 className="font-bold">Achados atuais</h2><p className="text-xs text-ink-muted">Prioridade maior primeiro; toque para ver evidências.</p></div><BrainCircuit size={19} className="text-violet-400" /></div>
          {intelligence.isLoading ? <div className="rounded-[24px] border border-surface-border bg-surface p-5 text-sm text-ink-muted">Analisando metadados locais…</div> : intelligence.insights.length === 0 ? <div className="rounded-[24px] border border-emerald-400/20 bg-emerald-400/5 p-5"><p className="font-semibold text-emerald-400">Nenhuma pendência observada</p><p className="mt-1 text-xs text-ink-muted">Isso descreve apenas os dados disponíveis agora; não é garantia de segurança.</p></div> : intelligence.insights.map((insight) => <button key={insight.id} type="button" onClick={() => setSelected(insight)} className="flex w-full items-center gap-3 rounded-[24px] border border-surface-border bg-surface p-4 text-left"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-400/10 text-violet-400"><BrainCircuit size={19} /></div><div className="min-w-0 flex-1"><p className="text-sm font-bold">{insight.title}</p><p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-muted">{insight.message}</p><p className="mt-2 font-mono text-[9px] uppercase text-ink-faint">Confiança {insight.confidence} · amostra {insight.sample}</p></div><ChevronRight size={17} className="text-ink-faint" /></button>)}
        </section>

        <VaultInsightSheet insight={selected} onClose={() => setSelected(null)} onNavigate={(href) => { setSelected(null); router.push(href); }} />
      </main>
    </PageTransition>
  );
}
