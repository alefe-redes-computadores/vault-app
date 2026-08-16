"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ArrowLeft, Building2, MapPin, Phone, Edit3, Trash2, 
  Pill, DollarSign, ExternalLink 
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useFarmacias } from "@/hooks/useFarmacias";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { ConfirmationModal } from "@/components/ConfirmationModal";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

function DetalhesFarmaciaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { trigger } = useHapticFeedback();
  const { getFarmacia, deleteFarmacia } = useFarmacias();
  const { medicamentos } = useMedicamentos();

  const [farmacia, setFarmacia] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ✅ CORRIGIDO: Usa db.renovacoes (já estava correto)
  const renovacoes = useLiveQuery(() => db.renovacoes.toArray(), []) || [];

  useEffect(() => {
    if (!id) {
      router.push("/saude/farmacias");
      return;
    }
    getFarmacia(id).then((item) => {
      if (item) {
        setFarmacia(item);
      } else {
        router.push("/saude/farmacias");
      }
      setIsLoading(false);
    });
  }, [id, getFarmacia, router]);

  // ✅ CORRIGIDO: Cruzamento analítico de medicamentos e gastos
  const analiseFarmacia = useMemo(() => {
    if (!farmacia || !medicamentos) return { medicamentosVinculados: [], totalGasto: 0 };

    // ✅ Usa apenas farmacia_id (fallback por nome removido)
    const medicamentosVinculados = medicamentos.filter(
      (m: any) => m.farmacia_id === farmacia.id
    );

    const medIds = new Set(medicamentosVinculados.map((m: any) => m.id));
    const renovacoesDaFarmacia = renovacoes.filter((r: any) => medIds.has(r.medicamento_id));

    let totalGasto = 0;
    renovacoesDaFarmacia.forEach((r: any) => {
      if (typeof r.preco === "number" && r.preco > 0) {
        totalGasto += r.preco;
      }
    });

    return { medicamentosVinculados, totalGasto };
  }, [farmacia, medicamentos, renovacoes]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteFarmacia(id!);
      trigger("success");
      router.replace("/saude/farmacias");
    } catch (error) {
      console.error("Erro ao excluir farmácia:", error);
      trigger("error");
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (isLoading) return <LoadingSkeleton />;
  if (!farmacia) return null;

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => { trigger("vibrate"); router.back(); }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
              aria-label="Voltar"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-amber-400">Hub de Farmácia</p>
              <h1 className="mt-0.5 truncate font-display text-lg font-semibold text-ink-primary">Detalhes do Local</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { trigger("vibrate"); router.push(`/saude/farmacias/editar?id=${farmacia.id}`); }}
              aria-label="Editar farmácia"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-primary transition-all active:scale-95 hover:text-amber-400 hover:border-amber-400/30"
            >
              <Edit3 size={16} />
            </button>
            <button
              onClick={() => { trigger("vibrate"); setShowDeleteModal(true); }}
              aria-label="Excluir farmácia"
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
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-400 border border-amber-400/20">
                <Building2 size={24} />
              </div>
              <div className="min-w-0 pt-1">
                <h2 className="font-display text-xl font-bold text-ink-primary truncate">
                  {farmacia.nome}
                </h2>
                {farmacia.endereco && (
                  <p className="text-xs text-ink-muted mt-1 flex items-center gap-1.5 truncate">
                    <MapPin size={13} className="shrink-0 text-ink-faint" /> {farmacia.endereco}
                  </p>
                )}
                {farmacia.telefone && (
                  <p className="text-xs text-ink-muted mt-1 flex items-center gap-1.5">
                    <Phone size={13} className="shrink-0 text-ink-faint" /> {farmacia.telefone}
                  </p>
                )}
              </div>
            </div>

            {/* Bloco Analítico */}
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-surface-border/40">
              <div className="rounded-2xl bg-surface-raised p-3">
                <p className="text-[10px] uppercase font-mono text-ink-muted">Vinculados</p>
                <p className="mt-0.5 text-sm font-semibold text-ink-primary">{analiseFarmacia.medicamentosVinculados.length} medicamento(s)</p>
              </div>
              <div className="rounded-2xl bg-surface-raised p-3">
                <p className="text-[10px] uppercase font-mono text-ink-muted">Total Gasto</p>
                <p className="mt-0.5 text-sm font-semibold text-emerald-400">
                  {analiseFarmacia.totalGasto > 0 ? `R$ ${analiseFarmacia.totalGasto.toFixed(2).replace(".", ",")}` : "R$ 0,00"}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Histórico Relacional: Medicamentos Vinculados */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.05 }} className="space-y-3">
            <h3 className="font-display text-base font-semibold text-ink-primary px-1 flex items-center gap-1.5">
              <Pill size={16} className="text-amber-400" /> Medicamentos Retirados ({analiseFarmacia.medicamentosVinculados.length})
            </h3>

            {analiseFarmacia.medicamentosVinculados.length === 0 ? (
              <div className="rounded-[22px] border border-surface-border/50 bg-surface-raised/50 p-4 text-center">
                <p className="text-xs text-ink-muted">Nenhum medicamento vinculado a esta farmácia.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {analiseFarmacia.medicamentosVinculados.map((med: any) => (
                  <div
                    key={med.id}
                    onClick={() => { trigger("vibrate"); router.push(`/saude/medicamentos/detalhes?id=${med.id}`); }}
                    className="flex items-center justify-between rounded-2xl border border-surface-border/50 bg-surface p-3.5 transition-all active:scale-[0.98] hover:border-amber-400/30 cursor-pointer shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
                        <Pill size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink-primary truncate">{med.nome}</p>
                        <p className="text-[11px] text-ink-muted">{med.dosagem || "Uso contínuo"}</p>
                      </div>
                    </div>
                    <ExternalLink size={15} className="text-ink-faint shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </section>

        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          title="Excluir farmácia"
          message={`Tem certeza que deseja excluir "${farmacia.nome}"?`}
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          isLoading={deleting}
          type="danger"
        />
      </main>
    </PageTransition>
  );
}

export default function DetalhesFarmaciaPage() {
  return <Suspense fallback={<LoadingSkeleton />}><DetalhesFarmaciaContent /></Suspense>;
}