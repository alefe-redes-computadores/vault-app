"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { db } from "@/lib/db";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { useHapticFeedback } from "@/lib/haptics";
import { ArrowLeft, FileText, MapPin, Edit3, Trash2, Calendar, Pill } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

function formatDateDisplay(isoStr: string): string {
  if (!isoStr) return "";
  const parts = isoStr.split("-");
  if (parts.length !== 3) return isoStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function DetalhesLocalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { trigger } = useHapticFeedback();

  const [local, setLocal] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // ✅ CORRIGIDO: Usa db.renovacoes em vez de db.table("renovacoes")
  const renovacoes = useLiveQuery(
    () => db.renovacoes.where("local_id").equals(id || "").toArray(),
    [id]
  ) || [];

  useEffect(() => {
    if (!id) {
      router.push("/saude/locais");
      return;
    }
    
    // ✅ CORRIGIDO: Usa db.locais em vez de db.table("locais")
    db.locais.get(id).then((res) => {
      if (res) {
        setLocal(res);
      } else {
        router.push("/saude/locais");
      }
      setIsLoading(false);
    });
  }, [id, router]);

  const handleDelete = async () => {
    trigger("vibrate");
    if (!id) return;
    try {
      // ✅ CORRIGIDO: Usa db.locais em vez de db.table("locais")
      await db.locais.delete(id);
      trigger("success");
      router.replace("/saude/locais");
    } catch (error) {
      console.error("Erro ao excluir local:", error);
      trigger("error");
    }
  };

  if (isLoading) return <LoadingSkeleton />;
  if (!local) return null;

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => { trigger("vibrate"); router.back(); }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-emerald-400">Unidade</p>
              <h1 className="mt-0.5 truncate font-display text-lg font-semibold text-ink-primary">Detalhes do Local</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { trigger("vibrate"); router.push(`/saude/locais/editar?id=${local.id}`); }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-primary transition-all active:scale-95 hover:text-emerald-400 hover:border-emerald-400/30"
            >
              <Edit3 size={16} />
            </button>
            <button
              onClick={() => { trigger("vibrate"); setShowDeleteModal(true); }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-coral/20 bg-coral/10 text-coral transition-all active:scale-95"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </header>

        <section className="px-5 pt-6 space-y-5">
          {/* Card Principal */}
          <motion.div 
            variants={fadeUp} 
            initial="initial" 
            animate="animate" 
            className="rounded-[32px] border border-surface-border/50 bg-surface p-6 shadow-sm space-y-4"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
                <MapPin size={24} />
              </div>
              <div className="min-w-0 pt-1">
                <h2 className="font-display text-xl font-bold text-ink-primary truncate">
                  {local.nome}
                </h2>
                <p className="text-sm text-ink-muted mt-1 leading-relaxed">
                  {local.endereco || "Endereço não informado."}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Histórico Relacional (Renovações/Retiradas) */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.05 }} className="space-y-4 pt-2">
            <h3 className="font-display text-base font-semibold text-ink-primary px-1">
              Histórico no Local
            </h3>

            <div className="rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-amber-400" />
                <h4 className="text-sm font-semibold text-ink-primary">Renovações e Retiradas ({renovacoes.length})</h4>
              </div>
              
              {renovacoes.length === 0 ? (
                <p className="text-xs text-ink-muted py-2">Nenhum registro de renovação ou retirada de medicamentos neste local.</p>
              ) : (
                <div className="space-y-2">
                  {renovacoes.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()).map((r: any) => (
                    <div 
                      key={r.id} 
                      onClick={() => { trigger("vibrate"); router.push(`/saude/renovacao/detalhes?id=${r.id}`); }}
                      className="flex items-center justify-between rounded-xl bg-surface-raised p-3.5 border border-surface-border/40 cursor-pointer hover:border-amber-400/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface">
                          <Calendar size={14} className="text-ink-muted" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-ink-primary font-mono">{formatDateDisplay(r.data)}</p>
                          <p className="text-[11px] font-medium text-emerald-400 mt-0.5">
                            {r.preco ? `Custo: R$ ${Number(r.preco).toFixed(2).replace(".", ",")}` : "Sem custo (SUS)"}
                          </p>
                        </div>
                      </div>
                      <FileText size={18} className="text-ice/70" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </section>

        <ConfirmationModal 
          isOpen={showDeleteModal} 
          onClose={() => setShowDeleteModal(false)} 
          onConfirm={handleDelete} 
          title="Excluir Local" 
          message="Tem certeza que deseja excluir este posto/clínica? Os registros de renovação não serão apagados, mas perderão a associação com este nome." 
        />
      </main>
    </PageTransition>
  );
}

export default function DetalhesLocalPage() {
  return <Suspense fallback={<LoadingSkeleton />}><DetalhesLocalContent /></Suspense>;
}