"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Activity, Plus, FolderHeart, Calendar } from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { DocumentCard } from "@/components/DocumentCard";
import { useSafeDb } from "@/hooks/useSafeDb";
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
    
    const filtered = allDocuments.filter((doc: Document) => {
      if (!doc.metadata) return false;
      return Object.values(doc.metadata).includes(id);
    });

    return filtered.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });
  }, [allDocuments, id]);

  const handleFavoriteToggle = async (docId: string) => {
    await favorite(docId);
    trigger("vibrate");
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!tratamento) {
    return null;
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  trigger("vibrate");
                  router.back();
                }}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
                aria-label="Voltar"
              >
                <ArrowLeft size={18} className="text-ink-primary" />
              </button>
              
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <FolderHeart size={16} className="text-violet-400" />
                  <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-violet-300">
                    Tratamento
                  </p>
                </div>
                <h1 className="mt-1 truncate font-display text-lg font-semibold text-ink-primary">
                  {tratamento.nome}
                </h1>
              </div>
            </div>

            <button
              onClick={() => {
                trigger("vibrate");
                router.push("/novo");
              }}
              aria-label="Adicionar documento"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ice text-void transition-all active:scale-95 shadow-md shadow-ice/20"
            >
              <Plus size={20} />
            </button>
          </div>
        </header>

        <section className="px-5 pt-6">
          <div className="mb-6 rounded-[24px] border border-surface-border/50 bg-surface p-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-violet-400/10 text-violet-400">
                <Activity size={24} />
              </div>
              <div>
                <h2 className="font-display text-base font-semibold text-ink-primary">
                  Detalhes do quadro
                </h2>
                <div className="mt-2 space-y-1 text-sm text-ink-muted">
                  <p>
                    <span className="font-medium text-ink-primary">Status:</span>{" "}
                    {tratamento.status === "ativo" ? "Em andamento" : tratamento.status === "concluido" ? "Concluído" : "Suspenso"}
                  </p>
                  {tratamento.condicao && (
                    <p>
                      <span className="font-medium text-ink-primary">Condição:</span>{" "}
                      <span className="capitalize">{tratamento.condicao}</span>
                    </p>
                  )}
                  <p className="flex items-center gap-1.5 mt-1">
                    <Calendar size={14} className="text-ink-faint" />
                    <span>Iniciado em {new Date(tratamento.created_at).toLocaleDateString("pt-BR")}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <h3 className="font-display text-sm font-semibold text-ink-primary">
              Histórico e Documentos
            </h3>
            <p className="text-xs text-ink-muted mt-1">
              {linkedDocuments.length} registro{linkedDocuments.length !== 1 ? "s" : ""} encontrado{linkedDocuments.length !== 1 ? "s" : ""}
            </p>
          </div>

          {linkedDocuments.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24 }}
              className="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-surface-border/60 bg-surface/40 px-6 py-12 text-center"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-raised text-ink-faint">
                <FolderHeart size={24} />
              </div>
              <h3 className="font-display text-base font-semibold text-ink-primary">
                Nenhum documento
              </h3>
              <p className="mt-2 max-w-xs text-sm leading-6 text-ink-muted">
                Adicione receitas, exames ou laudos vinculando a este tratamento.
              </p>
            </motion.div>
          ) : (
            <motion.div
              variants={listVariants}
              initial="hidden"
              animate="show"
              className="space-y-4"
            >
              {linkedDocuments.map((doc) => (
                <motion.div key={doc.id} variants={cardVariants}>
                  <DocumentCard
                    document={doc}
                    onFavoriteToggle={handleFavoriteToggle}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>
      </main>
    </PageTransition>
  );
}

export default function TratamentoPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <TratamentoContent />
    </Suspense>
  );
}
