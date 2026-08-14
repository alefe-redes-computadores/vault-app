"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ArrowLeft, Building2, MapPin, Phone, Edit3, Trash2, 
  Activity, FlaskConical, ExternalLink 
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useHospitais } from "@/hooks/useHospitais";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { ConfirmationModal } from "@/components/ConfirmationModal";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

function DetalhesHospitalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { trigger } = useHapticFeedback();
  const { getHospital, deleteHospital } = useHospitais();

  const [hospital, setHospital] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const documentos = useLiveQuery(() => db.table("documents").toArray(), []) || [];
  const exames = useLiveQuery(() => db.table("exames").toArray(), []) || [];

  useEffect(() => {
    if (!id) {
      router.push("/saude/hospitais");
      return;
    }
    getHospital(id).then((item) => {
      if (item) {
        setHospital(item);
      } else {
        router.push("/saude/hospitais");
      }
      setIsLoading(false);
    });
  }, [id, getHospital, router]);

  // Cruzamento relacional em tempo real
  const procedimentosVinculados = useMemo(() => {
    if (!id) return { cirurgias: [], exames: [] };
    
    const cirurgias = documentos.filter((d: any) => 
      d.metadata?.hospital_id === id && (d.type === 'cirurgia' || d.type === 'prontuario' || d.type === 'consulta')
    );

    const examesUnidade = exames.filter((e: any) => 
      e.hospital_id === id || e.laboratorio_id === id
    );

    return { cirurgias, exames: examesUnidade };
  }, [id, documentos, exames]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteHospital(id!);
      trigger("success");
      router.replace("/saude/hospitais");
    } catch (error) {
      console.error("Erro ao excluir hospital:", error);
      trigger("error");
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (isLoading) return <LoadingSkeleton />;
  if (!hospital) return null;

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
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice">Unidade Clínica</p>
              <h1 className="mt-0.5 truncate font-display text-lg font-semibold text-ink-primary">Detalhes da Unidade</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { trigger("vibrate"); router.push(`/saude/hospitais/editar?id=${hospital.id}`); }}
              aria-label="Editar hospital"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-primary transition-all active:scale-95 hover:text-ice hover:border-ice/30"
            >
              <Edit3 size={16} />
            </button>
            <button
              onClick={() => { trigger("vibrate"); setShowDeleteModal(true); }}
              aria-label="Excluir hospital"
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
                <Building2 size={24} />
              </div>
              <div className="min-w-0 pt-1">
                <h2 className="font-display text-xl font-bold text-ink-primary truncate">
                  {hospital.nome}
                </h2>
                {hospital.endereco && (
                  <p className="text-xs text-ink-muted mt-1 flex items-center gap-1.5 truncate">
                    <MapPin size={13} className="shrink-0 text-ink-faint" /> {hospital.endereco}
                  </p>
                )}
                {hospital.telefone && (
                  <p className="text-xs text-ink-muted mt-1 flex items-center gap-1.5">
                    <Phone size={13} className="shrink-0 text-ink-faint" /> {hospital.telefone}
                  </p>
                )}
              </div>
            </div>
          </motion.div>

          {/* Histórico Relacional: Cirurgias e Prontuários */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.05 }} className="space-y-3">
            <h3 className="font-display text-base font-semibold text-ink-primary px-1 flex items-center gap-1.5">
              <Activity size={16} className="text-ice" /> Cirurgias e Prontuários ({procedimentosVinculados.cirurgias.length})
            </h3>

            {procedimentosVinculados.cirurgias.length === 0 ? (
              <div className="rounded-[22px] border border-surface-border/50 bg-surface-raised/50 p-4 text-center">
                <p className="text-xs text-ink-muted">Nenhum procedimento registrado nesta unidade.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {procedimentosVinculados.cirurgias.map((doc: any) => (
                  <div
                    key={doc.id}
                    onClick={() => { trigger("vibrate"); router.push(`/saude/documentos`); }}
                    className="flex items-center justify-between rounded-2xl border border-surface-border/50 bg-surface p-3.5 transition-all active:scale-[0.98] hover:border-ice/30 cursor-pointer shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice">
                        <Activity size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink-primary truncate">{doc.title}</p>
                        <p className="text-[11px] text-ink-muted">{doc.metadata?.date || "Data não informada"}</p>
                      </div>
                    </div>
                    <ExternalLink size={15} className="text-ink-faint shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Histórico Relacional: Exames */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.1 }} className="space-y-3">
            <h3 className="font-display text-base font-semibold text-ink-primary px-1 flex items-center gap-1.5">
              <FlaskConical size={16} className="text-violet-400" /> Exames Realizados ({procedimentosVinculados.exames.length})
            </h3>

            {procedimentosVinculados.exames.length === 0 ? (
              <div className="rounded-[22px] border border-surface-border/50 bg-surface-raised/50 p-4 text-center">
                <p className="text-xs text-ink-muted">Nenhum exame vinculado a esta unidade.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {procedimentosVinculados.exames.map((exame: any) => (
                  <div
                    key={exame.id}
                    onClick={() => { trigger("vibrate"); router.push(`/saude/exames/detalhes?id=${exame.id}`); }}
                    className="flex items-center justify-between rounded-2xl border border-surface-border/50 bg-surface p-3.5 transition-all active:scale-[0.98] hover:border-violet-400/30 cursor-pointer shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-400/10 text-violet-400">
                        <FlaskConical size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink-primary truncate">{exame.nome}</p>
                        <p className="text-[11px] text-ink-muted">{exame.data || "Data não informada"}</p>
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
          title="Excluir hospital"
          message={`Tem certeza que deseja excluir "${hospital.nome}"?`}
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          isLoading={deleting}
          type="danger"
        />
      </main>
    </PageTransition>
  );
}

export default function DetalhesHospitalPage() {
  return <Suspense fallback={<LoadingSkeleton />}><DetalhesHospitalContent /></Suspense>;
}
