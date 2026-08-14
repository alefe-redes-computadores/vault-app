"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ArrowLeft, FileWarning, Calendar, DollarSign, ExternalLink, 
  Trash2, Pill, FileText 
} from "lucide-react";
import { db } from "@/lib/db";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { ConfirmationModal } from "@/components/ConfirmationModal";

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

function DetalhesRenovacaoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { trigger } = useHapticFeedback();

  const [renovacao, setRenovacao] = useState<any>(null);
  const [medicamento, setMedicamento] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) {
      router.push("/saude/renovacao");
      return;
    }

    db.table("renovacoes").get(id).then(async (res) => {
      if (res) {
        setRenovacao(res);
        if (res.medicamento_id) {
          const med = await db.medicamentos.get(res.medicamento_id);
          setMedicamento(med);
        }
      } else {
        router.push("/saude/renovacao");
      }
      setIsLoading(false);
    });
  }, [id, router]);

  const handleDelete = async () => {
    setDeleting(true);
    trigger("vibrate");
    try {
      await db.table("renovacoes").delete(id!);
      trigger("success");
      router.replace("/saude/renovacao");
    } catch (error) {
      console.error("Erro ao excluir renovação:", error);
      trigger("error");
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (isLoading) return <LoadingSkeleton />;
  if (!renovacao) return null;

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
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice">Vault</p>
              <h1 className="mt-0.5 truncate font-display text-lg font-semibold text-ink-primary">Detalhes da Renovação</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-ice/10 text-ice border border-ice/20">
                <FileWarning size={24} />
              </div>
              <div className="min-w-0 pt-1">
                <h2 className="font-display text-xl font-bold text-ink-primary truncate">
                  {medicamento?.nome || "Medicamento"}
                </h2>
                <p className="text-sm font-medium text-ice mt-0.5">
                  {medicamento?.dosagem || ""}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-surface-border/40">
              <div className="rounded-2xl bg-surface-raised p-3">
                <p className="text-[10px] uppercase font-mono text-ink-muted">Data da Receita</p>
                <p className="mt-0.5 text-sm font-semibold text-ink-primary font-mono">{formatDateDisplay(renovacao.data)}</p>
              </div>
              <div className="rounded-2xl bg-surface-raised p-3">
                <p className="text-[10px] uppercase font-mono text-ink-muted">Custo Registrado</p>
                <p className="mt-0.5 text-sm font-semibold text-emerald-400">
                  {renovacao.preco ? `R$ ${Number(renovacao.preco).toFixed(2).replace(".", ",")}` : "SUS / Gratuito"}
                </p>
              </div>
            </div>

            {renovacao.observacoes && (
              <div className="pt-2">
                <p className="text-xs font-medium text-ink-muted mb-1">Notas / Observações</p>
                <p className="text-xs text-ink-primary bg-surface-raised p-3 rounded-xl border border-surface-border/40">{renovacao.observacoes}</p>
              </div>
            )}

            {renovacao.anexo_url && (
              <a 
                href={renovacao.anexo_url} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center justify-between rounded-2xl border border-ice/20 bg-ice/10 p-3.5 text-ice hover:bg-ice/20 transition-colors mt-2"
              >
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <FileText size={16} /> Ver Comprovante / Receita Anexada
                </div>
                <ExternalLink size={14} />
              </a>
            )}
          </motion.div>
        </section>

        <ConfirmationModal 
          isOpen={showDeleteModal} 
          onClose={() => setShowDeleteModal(false)} 
          onConfirm={handleDelete} 
          title="Excluir Registro" 
          message="Tem certeza que deseja excluir este registro de renovação?" 
        />
      </main>
    </PageTransition>
  );
}

export default function DetalhesRenovacaoPage() {
  return <Suspense fallback={<LoadingSkeleton />}><DetalhesRenovacaoContent /></Suspense>;
}
