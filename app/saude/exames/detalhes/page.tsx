"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  FlaskConical, 
  Building2, 
  Stethoscope, 
  Calendar, 
  FileText, 
  ExternalLink, 
  Trash2, 
  Edit3,
  Loader2,
  AlertCircle
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, safeDeleteExame } from "@/lib/db";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { Button } from "@/components/ui/Button";

export default function DetalhesExamePage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Busca o exame atual no Dexie
  const exame = useLiveQuery(() => (id ? db.table("exames").get(id) : undefined), [id]);

  // CRUZAMENTO INTELIGENTE DE DADOS: Busca outros exames do mesmo tipo ou do mesmo laboratório para histórico
  const historicoRelacionado = useLiveQuery(
    async () => {
      if (!exame) return [];
      return db.table("exames")
        .where("nome")
        .equals(exame.nome)
        .filter((item: any) => item.id !== id)
        .toArray();
    },
    [exame]
  ) || [];

  if (!exame) {
    return <LoadingSkeleton />;
  }

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    trigger("vibrate");
    try {
      await safeDeleteExame(id);
      trigger("success");
      router.push("/saude/exames");
    } catch (error) {
      console.error("Erro ao excluir exame:", error);
      trigger("error");
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 header-safe-top backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button 
                onClick={() => { trigger("vibrate"); router.back(); }} 
                className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95"
              >
                <ArrowLeft size={18} className="text-ink-primary" />
              </button>
              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-emerald-400">
                  Vault · Análise Clínica
                </p>
                <h1 className="font-display text-lg font-semibold text-ink-primary truncate">
                  {exame.nome}
                </h1>
              </div>
            </div>

            <button
              onClick={() => { trigger("vibrate"); setShowDeleteModal(true); }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-coral/20 bg-coral/10 text-coral active:scale-95"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </header>

        <section className="px-5 pt-6 space-y-4">
          {/* CARD PRINCIPAL DE INFORMAÇÕES */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm space-y-4"
          >
            <div className="flex items-center gap-3.5 pb-4 border-b border-surface-border/40">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-400">
                <FlaskConical size={24} />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-ink-primary">{exame.nome}</h2>
                <p className="text-xs text-ink-muted">Registrado em {exame.data}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              {exame.laboratorio && (
                <div className="rounded-2xl bg-surface-raised/60 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-ink-faint">Local / Lab</p>
                  <p className="mt-0.5 text-xs font-semibold text-ink-primary flex items-center gap-1.5 truncate">
                    <Building2 size={13} className="text-emerald-400 shrink-0" /> {exame.laboratorio}
                  </p>
                </div>
              )}

              {exame.medico && (
                <div className="rounded-2xl bg-surface-raised/60 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-ink-faint">Solicitante</p>
                  <p className="mt-0.5 text-xs font-semibold text-ink-primary flex items-center gap-1.5 truncate">
                    <Stethoscope size={13} className="text-emerald-400 shrink-0" /> {exame.medico}
                  </p>
                </div>
              )}
            </div>

            {exame.data_retorno && (
              <div className="flex items-center gap-2 rounded-2xl bg-amber-400/10 border border-amber-400/20 px-3.5 py-2.5 text-xs text-amber-300">
                <Calendar size={15} className="shrink-0" />
                <span>Retorno / Apresentação agendada para: <strong className="font-semibold">{exame.data_retorno}</strong></span>
              </div>
            )}

            {exame.motivo && (
              <div>
                <p className="text-xs font-medium text-ink-muted mb-1">Motivo da Solicitação</p>
                <p className="text-xs text-ink-primary bg-surface-raised/50 p-3 rounded-xl border border-surface-border/40">{exame.motivo}</p>
              </div>
            )}

            {exame.observacoes && (
              <div>
                <p className="text-xs font-medium text-ink-muted mb-1">Resultados / Notas</p>
                <p className="text-xs text-ink-primary bg-surface-raised/50 p-3 rounded-xl border border-surface-border/40 whitespace-pre-wrap">{exame.observacoes}</p>
              </div>
            )}

            {exame.anexo_url && (
              <a 
                href={exame.anexo_url} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center justify-between rounded-2xl border border-ice/20 bg-ice/10 p-3.5 text-ice hover:bg-ice/20 transition-colors"
              >
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <FileText size={16} /> Ver Anexo / Documento do Exame
                </div>
                <ExternalLink size={14} />
              </a>
            )}
          </motion.div>

          {/* CRUZAMENTO DE DADOS: HISTÓRICO EVOLUTIVO DO MESMO EXAME */}
          {historicoRelacionado.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm space-y-3"
            >
              <div className="flex items-center gap-2">
                <AlertCircle size={15} className="text-emerald-400" />
                <h3 className="font-display text-sm font-semibold text-ink-primary">Evolução Histórica ({historicoRelacionado.length})</h3>
              </div>
              <p className="text-xs text-ink-muted">Outros registros de "{exame.nome}" encontrados no seu acervo para cruzamento evolutivo:</p>

              <div className="space-y-2 pt-1">
                {historicoRelacionado.map((item: any) => (
                  <button
                    key={item.id}
                    onClick={() => { trigger("vibrate"); router.push(`/saude/exames/detalhes?id=${item.id}`); }}
                    className="w-full flex items-center justify-between p-3 rounded-2xl bg-surface-raised/70 border border-surface-border/40 text-left hover:bg-surface-raised transition-colors"
                  >
                    <div>
                      <p className="text-xs font-semibold text-ink-primary">Realizado em {item.data}</p>
                      {item.laboratorio && <p className="text-[10px] text-ink-muted">{item.laboratorio}</p>}
                    </div>
                    <span className="text-xs text-ice font-medium">Ver detalhes</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </section>

        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          title="Excluir Exame"
          message={`Tem certeza que deseja excluir o registro de "${exame.nome}"?`}
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          isLoading={deleting}
          type="danger"
        />
      </main>
    </PageTransition>
  );
}
