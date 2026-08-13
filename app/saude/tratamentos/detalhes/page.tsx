"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  Activity, 
  Plus, 
  Calendar, 
  Pill, 
  Edit3,
  Brain,
  Flame,
  HeartPulse,
  ShieldAlert,
  ChevronRight,
  History,
  FileText
} from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { DocumentCard } from "@/components/DocumentCard";
import { useSafeDb } from "@/hooks/useSafeDb";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import type { Tratamento, Document } from "@/lib/types";

const listVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
  },
};

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

function TratamentoContent() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { favorite } = useSafeDb();
  const { medicamentos } = useMedicamentos();

  const [tratamento, setTratamento] = useState<Tratamento | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      router.push("/saude");
      return;
    }

    const fetchTratamento = async () => {
      try {
        const data = await db.tratamentos.get(id);
        if (data) {
          setTratamento(data);
        } else {
          router.push("/saude");
        }
      } catch (error) {
        console.error("Erro ao buscar tratamento:", error);
        router.push("/saude");
      } finally {
        setIsLoading(false);
      }
    };
    fetchTratamento();
  }, [id, router]);

  const allDocuments = useLiveQuery(() => db.documents.toArray(), []) || [];

  const linkedDocuments = useMemo(() => {
    if (!id) return [];
    return allDocuments.filter((doc: Document) => {
      return doc.metadata?.tratamento_id === id;
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [allDocuments, id]);

  const linkedMedicamentos = useMemo(() => {
    if (!id || !medicamentos) return [];
    return medicamentos.filter((m: any) => {
      const matchTratamentoId = m.tratamento_id === id || (m.tratamento_ids && m.tratamento_ids.includes(id));
      const matchDocumentId = m.document_id && linkedDocuments.some(d => d.id === m.document_id);
      return matchTratamentoId || matchDocumentId;
    });
  }, [medicamentos, id, linkedDocuments]);

  const handleFavoriteToggle = async (docId: string) => {
    await favorite(docId);
    trigger("vibrate");
  };

  if (isLoading) return <LoadingSkeleton />;
  if (!tratamento) return null;

  const IconComp = getTratamentoIcon(tratamento.nome);
  const tratamentoCor = tratamento.cor || "#8B5CF6"; // Cor personalizada ou padrão roxo
  
  const medicamentosAtivos = linkedMedicamentos.filter(m => m.status !== "descontinuado");
  const medicamentosDescontinuados = linkedMedicamentos.filter(m => m.status === "descontinuado");

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => { trigger("vibrate"); router.back(); }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
              >
                <ArrowLeft size={18} className="text-ink-primary" />
              </button>
              
              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-[0.28em]" style={{ color: tratamentoCor }}>Painel Clínico</p>
                <h1 className="mt-1 truncate font-display text-lg font-semibold text-ink-primary">Visão Geral</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => { trigger("vibrate"); router.push(`/saude/tratamentos/editar?id=${tratamento.id}`); }}
                aria-label="Editar tratamento"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-primary transition-all active:scale-95"
              >
                <Edit3 size={16} />
              </button>
              <button
                onClick={() => { trigger("vibrate"); router.push("/novo"); }}
                aria-label="Adicionar documento"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ice text-void transition-all active:scale-95 shadow-md shadow-ice/20"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>
        </header>

        <section className="px-5 pt-6 space-y-6">
          
          {/* HERO SECTION DO TRATAMENTO COM A COR PERSONALIZADA */}
          <motion.div 
            variants={fadeUp} 
            initial="initial" 
            animate="animate" 
            className="relative overflow-hidden rounded-[32px] border bg-surface p-6 shadow-sm"
            style={{ 
              borderColor: `${tratamentoCor}40`,
              borderLeft: `6px solid ${tratamentoCor}` 
            }}
          >
            <div className="absolute -right-4 -top-4 opacity-5 pointer-events-none">
              <IconComp size={140} />
            </div>
            
            <div className="relative z-10 flex items-start gap-4">
              <div 
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl shadow-sm border"
                style={{ backgroundColor: `${tratamentoCor}15`, borderColor: `${tratamentoCor}30`, color: tratamentoCor }}
              >
                <IconComp size={28} />
              </div>
              <div className="min-w-0 pt-1">
                <h2 className="font-display text-2xl font-bold text-ink-primary leading-tight">{tratamento.nome}</h2>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    tratamento.status === "ativo" ? "bg-emerald-400/10 border border-emerald-400/20 text-emerald-400" : 
                    tratamento.status === "concluido" ? "bg-ice/10 border border-ice/20 text-ice" : 
                    "bg-coral/10 border border-coral/20 text-coral"
                  }`}>
                    {tratamento.status === "ativo" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>}
                    {tratamento.status === "ativo" ? "Em andamento" : tratamento.status === "concluido" ? "Concluído" : "Suspenso"}
                  </span>
                </div>
              </div>
            </div>

            {tratamento.condicao && (
              <div className="relative z-10 mt-4 rounded-xl bg-surface-raised/50 border border-surface-border/40 p-3">
                <p className="text-xs text-ink-muted"><span className="font-medium text-ink-primary">CID / Condição:</span> {tratamento.condicao}</p>
              </div>
            )}

            <div className="relative z-10 mt-5 grid grid-cols-2 gap-3 border-t border-surface-border/50 pt-5">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-ink-muted">Medicamentos</span>
                <span className="font-mono text-xl font-semibold text-ink-primary mt-0.5">{medicamentosAtivos.length} <span className="text-xs font-normal text-ink-faint">ativos</span></span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-ink-muted">Laudos / Receitas</span>
                <span className="font-mono text-xl font-semibold text-ink-primary mt-0.5">{linkedDocuments.length}</span>
              </div>
            </div>
          </motion.div>

          {/* MEDICAMENTOS ATIVOS */}
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
                    className="group cursor-pointer rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm transition-all active:scale-[0.98] hover:border-ice/30 relative overflow-hidden"
                    style={{ borderLeft: `4px solid ${tratamentoCor}` }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice border border-ice/10">
                          <Pill size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-ink-primary text-[15px]">{med.nome}</p>
                          <p className="truncate text-xs text-ink-muted mt-0.5">{med.dosagem} • Dr(a). {med.medico}</p>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-ink-faint group-hover:text-ice transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* HISTÓRICO DE DESCONTINUADOS */}
          {medicamentosDescontinuados.length > 0 && (
            <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.1 }} className="space-y-3">
              <div className="flex items-center gap-2 pl-1">
                <History size={16} className="text-coral" />
                <h3 className="font-display text-base font-semibold text-ink-primary">Histórico (Descontinuados)</h3>
              </div>
              <div className="space-y-3 border-l-2 border-surface-border/50 ml-3 pl-4">
                {medicamentosDescontinuados.map((med: any) => (
                  <div key={med.id} onClick={() => { trigger("vibrate"); router.push(`/saude/medicamentos/detalhes?id=${med.id}`); }} className="relative rounded-2xl border border-coral/10 bg-surface-raised/60 p-3.5 cursor-pointer">
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

          {/* DOCUMENTOS, EXAMES E LAUDOS */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.15 }} className="space-y-3">
            <div className="flex items-center justify-between pl-1 pr-1">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-emerald-400" />
                <h3 className="font-display text-base font-semibold text-ink-primary">Receitas e Laudos</h3>
              </div>
            </div>

            {linkedDocuments.length === 0 ? (
              <div className="rounded-[24px] border border-surface-border/50 bg-surface-raised/50 p-6 text-center">
                <p className="text-sm text-ink-muted">Nenhum documento ou laudo vinculado a este tratamento.</p>
              </div>
            ) : (
              <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-4">
                {linkedDocuments.map((doc) => (
                  <motion.div key={doc.id} variants={cardVariants}>
                    <DocumentCard document={doc} onFavoriteToggle={handleFavoriteToggle} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.div>

        </section>
      </main>
    </PageTransition>
  );
}

export default function TratamentoPage() {
  return <Suspense fallback={<LoadingSkeleton />}><TratamentoContent /></Suspense>;
}
