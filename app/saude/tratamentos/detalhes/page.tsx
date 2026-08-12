"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Activity,
  Brain,
  Flame,
  HeartPulse,
  ShieldAlert,
  Pill,
  FileText,
  AlertTriangle,
  Calendar,
  ChevronRight,
  MoreVertical,
  Stethoscope,
  Clock
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { DocumentCard } from "@/components/DocumentCard";

const fadeUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
};

function getTratamentoIcon(nome: string) {
  const n = nome.toLowerCase();
  if (n.includes("tdah")) return Brain;
  if (n.includes("dor") || n.includes("neuropática")) return Flame;
  if (n.includes("depress")) return HeartPulse;
  if (n.includes("ansied") || n.includes("ansiolítico")) return ShieldAlert;
  return Activity;
}

export default function TratamentoDetalhesPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const tratamento = useLiveQuery(() => (id ? db.tratamentos.get(id) : undefined), [id]);

  const medicamentosVinculados = useLiveQuery(
    () => (id ? db.medicamentos.where({ tratamento_id: id }).toArray() : []),
    [id]
  ) || [];

  const documentosVinculados = useLiveQuery(async () => {
    if (!id) return [];
    const todosDocs = await db.documents.where({ category_id: "saude" }).toArray();
    return todosDocs.filter(doc => doc.metadata?.tratamento_id === id);
  }, [id]) || [];

  if (!id) return <LoadingSkeleton />;
  if (tratamento === undefined) return <LoadingSkeleton />;

  if (tratamento === null) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-void px-6 text-center">
        <p className="font-display text-lg font-semibold text-ink-primary">Tratamento não encontrado</p>
        <button onClick={() => router.back()} className="mt-4 rounded-full bg-ice px-5 py-2.5 text-sm font-semibold text-void">Voltar</button>
      </main>
    );
  }

  const IconComp = getTratamentoIcon(tratamento.nome);

  const medicamentosAtivos = medicamentosVinculados.filter(m => m.status !== "descontinuado");
  const medicamentosDescontinuados = medicamentosVinculados.filter(m => m.status === "descontinuado");

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-32">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 pt-6 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => { trigger("vibrate"); router.back(); }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
              >
                <ArrowLeft size={18} className="text-ink-primary" />
              </button>
              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-violet-400/90">Painel Clínico</p>
                <h1 className="truncate font-display text-xl font-semibold text-ink-primary">Visão Geral</h1>
              </div>
            </div>
            <button className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-muted">
              <MoreVertical size={18} />
            </button>
          </div>
        </header>

        <section className="px-5 pt-6 space-y-6">
          
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="relative overflow-hidden rounded-[32px] border border-violet-500/30 bg-surface p-6 shadow-sm">
            <div className="absolute -right-4 -top-4 opacity-5 pointer-events-none">
              <IconComp size={140} />
            </div>
            
            <div className="relative z-10 flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-violet-400/10 border border-violet-400/20 text-violet-400 shadow-sm">
                <IconComp size={28} />
              </div>
              <div className="min-w-0 pt-1">
                <h2 className="font-display text-2xl font-bold text-ink-primary leading-tight">{tratamento.nome}</h2>
                <div className="mt-2 flex items-center gap-2">
                  <span className="flex items-center gap-1.5 rounded-full bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Em Acompanhamento
                  </span>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-6 grid grid-cols-2 gap-3 border-t border-surface-border/50 pt-5">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-ink-muted">Medicamentos Ativos</span>
                <span className="font-mono text-xl font-semibold text-ink-primary mt-0.5">{medicamentosAtivos.length}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-ink-muted">Documentos / Laudos</span>
                <span className="font-mono text-xl font-semibold text-ink-primary mt-0.5">{documentosVinculados.length}</span>
              </div>
            </div>
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.05 }} className="space-y-3">
            <div className="flex items-center gap-2 pl-1">
              <Pill size={16} className="text-ice" />
              <h3 className="font-display text-base font-semibold text-ink-primary">Medicamentos em Uso</h3>
            </div>

            {medicamentosAtivos.length === 0 ? (
              <div className="rounded-[24px] border border-surface-border/50 bg-surface-raised/50 p-6 text-center">
                <p className="text-sm text-ink-muted">Nenhum medicamento ativo vinculado a este tratamento.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {medicamentosAtivos.map((med: any) => (
                  <div
                    key={med.id}
                    onClick={() => { trigger("vibrate"); router.push(`/saude/medicamentos/detalhes?id=${med.id}`); }}
                    className="group cursor-pointer rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm transition-all active:scale-[0.98] hover:border-ice/30"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ice/10 text-ice border border-ice/10">
                          <Pill size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-ink-primary text-[15px]">{med.nome}</p>
                          <p className="truncate text-xs text-ink-muted mt-0.5">{med.dosagem}</p>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-ink-faint group-hover:text-ice transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {medicamentosDescontinuados.length > 0 && (
            <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.1 }} className="space-y-3">
              <div className="flex items-center gap-2 pl-1">
                <Clock size={16} className="text-coral" />
                <h3 className="font-display text-base font-semibold text-ink-primary">Histórico (Descontinuados)</h3>
              </div>
              <div className="space-y-3 border-l-2 border-surface-border/50 ml-3 pl-4">
                {medicamentosDescontinuados.map((med: any) => (
                  <div key={med.id} className="relative rounded-2xl border border-coral/10 bg-surface-raised/60 p-3.5">
                    <div className="absolute -left-[23px] top-4 h-2.5 w-2.5 rounded-full bg-coral border-2 border-void ring-1 ring-surface-border/50"></div>
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-semibold text-ink-primary text-sm line-through opacity-70">{med.nome} {med.dosagem}</p>
                      <span className="text-[10px] font-bold text-coral bg-coral/10 px-2 py-0.5 rounded-md">SUSPENSO</span>
                    </div>
                    {med.motivo_descontinuacao && (
                      <p className="text-xs text-ink-muted italic mb-2">"{med.motivo_descontinuacao}"</p>
                    )}
                    {med.medicamento_substituto_nome && (
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-ice mt-2 bg-ice/10 w-fit px-2 py-1 rounded-md border border-ice/10">
                        <ArrowLeft size={10} className="rotate-180" />
                        Substituído por: {med.medicamento_substituto_nome}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.15 }} className="space-y-3">
            <div className="flex items-center justify-between pl-1 pr-1">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-emerald-400" />
                <h3 className="font-display text-base font-semibold text-ink-primary">Receitas e Laudos</h3>
              </div>
            </div>

            {documentosVinculados.length === 0 ? (
              <div className="rounded-[24px] border border-surface-border/50 bg-surface-raised/50 p-6 text-center">
                <p className="text-sm text-ink-muted">Nenhum documento ou laudo vinculado a este tratamento.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {documentosVinculados.map((doc: any) => (
                  <div key={doc.id} onClick={() => { trigger("vibrate"); router.push(`/detalhes?id=${doc.id}`); }}>
                    <DocumentCard document={doc} compact />
                  </div>
                ))}
              </div>
            )}
          </motion.div>

        </section>
      </main>
    </PageTransition>
  );
}
