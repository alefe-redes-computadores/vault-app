"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Activity, Plus, FolderHeart, Calendar, Pill } from "lucide-react";
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

  // Filtra documentos vinculados (verifica se o id do tratamento está nos metadados)
  const linkedDocuments = useMemo(() => {
    if (!id) return [];
    return allDocuments.filter((doc: Document) => {
      return doc.metadata?.tratamento_id === id;
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [allDocuments, id]);

  // Filtra medicamentos vinculados (verifica se o medicamento aponta para este tratamento_id)
  const linkedMedicamentos = useMemo(() => {
    if (!id || !medicamentos) return [];
    return medicamentos.filter((m: any) => m.tratamento_id === id);
  }, [medicamentos, id]);

  const handleFavoriteToggle = async (docId: string) => {
    await favorite(docId);
    trigger("vibrate");
  };

  if (isLoading) return <LoadingSkeleton />;
  if (!tratamento) return null;

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { trigger("vibrate"); router.back(); }}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
              >
                <ArrowLeft size={18} className="text-ink-primary" />
              </button>
              
              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-violet-300">Tratamento</p>
                <h1 className="mt-1 truncate font-display text-lg font-semibold text-ink-primary">{tratamento.nome}</h1>
              </div>
            </div>
            <button
              onClick={() => { trigger("vibrate"); router.push("/novo"); }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ice text-void transition-all active:scale-95 shadow-md shadow-ice/20"
            >
              <Plus size={20} />
            </button>
          </div>
        </header>

        <section className="px-5 pt-6 space-y-6">
          <div className="rounded-[24px] border border-surface-border/50 bg-surface p-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-violet-400/10 text-violet-400">
                <Activity size={24} />
              </div>
              <div>
                <h2 className="font-display text-base font-semibold text-ink-primary">Detalhes do quadro</h2>
                <div className="mt-2 space-y-1 text-sm text-ink-muted">
                  <p><span className="font-medium text-ink-primary">Status:</span> {tratamento.status === "ativo" ? "Em andamento" : tratamento.status === "concluido" ? "Concluído" : "Suspenso"}</p>
                  {tratamento.condicao && <p><span className="font-medium text-ink-primary">Condição:</span> {tratamento.condicao}</p>}
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold text-ink-primary mb-3">Medicamentos em uso ({linkedMedicamentos.length})</h3>
            <div className="space-y-2.5">
              {linkedMedicamentos.map((med: any) => (
                <div
                  key={med.id}
                  onClick={() => { trigger("vibrate"); router.push(`/saude/medicamentos/editar?id=${med.id}`); }}
                  className="flex items-center justify-between rounded-[20px] border border-surface-border/50 bg-surface p-4 shadow-sm transition-all active:scale-[0.985] hover:bg-surface-raised/80 cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice">
                      <Pill size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink-primary">{med.nome}</p>
                      <p className="text-xs text-ink-muted">{med.dosagem}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold text-ink-primary mb-3">Documentos e Receitas ({linkedDocuments.length})</h3>
            {linkedDocuments.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-surface-border rounded-3xl text-ink-muted text-sm">
                Nenhum documento vinculado ainda.
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
          </div>
        </section>
      </main>
    </PageTransition>
  );
}

export default function TratamentoPage() {
  return <Suspense fallback={<LoadingSkeleton />}><TratamentoContent /></Suspense>;
}
