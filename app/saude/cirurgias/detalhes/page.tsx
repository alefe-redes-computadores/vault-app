"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Activity, 
  Calendar, 
  Building2, 
  UserCheck, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  RotateCcw,
  Pill,
  FileText,
  Syringe,
  Paperclip
} from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import type { Cirurgia, Medico, Hospital, Medicamento, Exame } from "@/lib/types";

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

function DetalhesCirurgiaContent() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [cirurgia, setCirurgia] = useState<Cirurgia | null>(null);
  const [medico, setMedico] = useState<Medico | null>(null);
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Consultando dados correlacionados
  const medicamentos = useLiveQuery(() => db.medicamentos.toArray(), []) || [];
  const exames = useLiveQuery(() => db.exames.toArray(), []) || [];

  useEffect(() => {
    if (!id) {
      router.push("/saude/cirurgias");
      return;
    }

    const fetchData = async () => {
      try {
        const cirData = await db.cirurgias.get(id);
        if (cirData) {
          setCirurgia(cirData);
          if (cirData.medico_id) {
            const medData = await db.medicos.get(cirData.medico_id);
            if (medData) setMedico(medData);
          }
          if (cirData.hospital_id) {
            const hospData = await db.hospitais.get(cirData.hospital_id);
            if (hospData) setHospital(hospData);
          }
        } else {
          router.push("/saude/cirurgias");
        }
      } catch (error) {
        console.error("Erro ao buscar detalhes da cirurgia:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, router]);

  // Vínculos cruzados focados em Cirurgia (Exames pré-op e Remédios pós-op)
  const medicamentosPosOperatorio = useMemo(() => {
    if (!cirurgia) return [];
    return medicamentos.filter((m: Medicamento) => {
      // Puxa medicamentos prescritos na mesma data ou pelo mesmo cirurgião
      const matchMedico = cirurgia.medico_id && m.medico_id === cirurgia.medico_id;
      const matchData = m.data_receita === cirurgia.data;
      return matchMedico || matchData;
    });
  }, [medicamentos, cirurgia]);

  const examesPreOperatorios = useMemo(() => {
    if (!cirurgia) return [];
    return exames.filter((e: Exame) => {
      const matchMedico = cirurgia.medico_id && e.medico_id === cirurgia.medico_id;
      return matchMedico;
    });
  }, [exames, cirurgia]);

  const handleStatusChange = async (novoStatus: "agendada" | "realizada" | "cancelada") => {
    trigger("vibrate");
    if (!id || !cirurgia) return;
    try {
      await db.cirurgias.update(id, {
        status: novoStatus,
        updated_at: new Date().toISOString(),
        synced: false,
      });
      setCirurgia({ ...cirurgia, status: novoStatus });
      trigger("success");
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      trigger("error");
    }
  };

  const handleDelete = async () => {
    trigger("vibrate");
    if (!id) return;
    try {
      await db.cirurgias.delete(id);
      trigger("success");
      router.replace("/saude/cirurgias");
    } catch (error) {
      console.error("Erro ao excluir cirurgia:", error);
      trigger("error");
    }
  };

  if (isLoading) return <LoadingSkeleton />;
  if (!cirurgia) return null;

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
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-coral">Prontuário</p>
              <h1 className="mt-0.5 truncate font-display text-lg font-semibold text-ink-primary">Detalhes da Cirurgia</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { trigger("vibrate"); router.push(`/saude/cirurgias/editar?id=${cirurgia.id}`); }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-primary transition-all active:scale-95 hover:text-coral hover:border-coral/30"
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
          {/* Card Principal de Resumo */}
          <motion.div 
            variants={fadeUp} 
            initial="initial" 
            animate="animate" 
            className="rounded-[32px] border border-surface-border/50 bg-surface p-6 shadow-sm space-y-4 relative overflow-hidden"
          >
            {/* Efeito visual sutil de fundo para cirurgias */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-coral/5 rounded-bl-full pointer-events-none" />

            <div className="flex items-start justify-between gap-3 relative z-10">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-coral/10 text-coral border border-coral/20">
                  <Activity size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-coral" />
                    <span className="font-mono text-sm font-bold text-coral">{formatDateDisplay(cirurgia.data)}</span>
                  </div>
                  <h2 className="font-display text-xl font-bold text-ink-primary mt-1">
                    {cirurgia.procedimento}
                  </h2>
                </div>
              </div>

              <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                cirurgia.status === "agendada" ? "bg-amber-400/10 text-amber-400 border border-amber-400/20" :
                cirurgia.status === "realizada" ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20" :
                "bg-coral/10 text-coral border border-coral/20"
              }`}>
                {cirurgia.status}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-surface-border/40 relative z-10">
              <div className="flex items-center gap-3 rounded-2xl bg-surface-raised p-3.5 border border-surface-border/40">
                <UserCheck size={18} className="text-coral shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] text-ink-muted">Cirurgião Responsável</p>
                  <p className="text-sm font-medium text-ink-primary truncate">{medico ? `Dr(a). ${medico.nome}` : "Não vinculado"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl bg-surface-raised p-3.5 border border-surface-border/40">
                <Building2 size={18} className="text-coral shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] text-ink-muted">Local / Hospital</p>
                  <p className="text-sm font-medium text-ink-primary truncate">{hospital?.nome || "Não informado"}</p>
                </div>
              </div>
            </div>

            {cirurgia.observacoes && (
              <div className="rounded-2xl bg-surface-raised/60 p-4 border border-surface-border/40 relative z-10">
                <p className="text-xs font-medium text-ink-muted mb-1 flex items-center gap-1.5">
                  <FileText size={12} className="text-coral" />
                  Orientações, Preparo e Pós-Operatório
                </p>
                <p className="text-sm text-ink-primary whitespace-pre-wrap mt-1.5 leading-relaxed">{cirurgia.observacoes}</p>
              </div>
            )}
          </motion.div>

          {/* Seção de Dados Vinculados */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.03 }} className="space-y-4">
            <h3 className="font-display text-base font-semibold text-ink-primary px-1">Registros Clínicos do Procedimento</h3>

            <div className="grid grid-cols-1 gap-3">
              {/* Medicamentos Relacionados */}
              <div className="rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Pill size={16} className="text-coral" />
                    <h4 className="text-sm font-semibold text-ink-primary">Prescrições Relacionadas ({medicamentosPosOperatorio.length})</h4>
                  </div>
                </div>

                {medicamentosPosOperatorio.length === 0 ? (
                  <p className="text-xs text-ink-muted py-2">Nenhum medicamento vinculado a esta data ou equipe médica.</p>
                ) : (
                  <div className="space-y-2">
                    {medicamentosPosOperatorio.map((m: Medicamento) => (
                      <div 
                        key={m.id} 
                        onClick={() => { trigger("vibrate"); router.push(`/saude/medicamentos/detalhes?id=${m.id}`); }}
                        className="flex items-center justify-between rounded-xl bg-surface-raised p-3 border border-surface-border/40 cursor-pointer hover:border-coral/30 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium text-ink-primary">{m.nome} · <span className="text-coral">{m.dosagem}</span></p>
                          <p className="text-[11px] text-ink-muted">Prescrito em: {formatDateDisplay(m.data_receita)}</p>
                        </div>
                        <span className="text-xs text-coral font-mono">Ver</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Exames Pré/Pós */}
              <div className="rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <Syringe size={16} className="text-ice" />
                  <h4 className="text-sm font-semibold text-ink-primary">Exames Relacionados ({examesPreOperatorios.length})</h4>
                </div>
                {examesPreOperatorios.length === 0 ? (
                  <p className="text-xs text-ink-muted py-2">Nenhum exame pré-operatório registrado com esta equipe.</p>
                ) : (
                  <div className="space-y-2">
                    {examesPreOperatorios.map((e: Exame) => (
                      <div key={e.id} className="flex items-center justify-between rounded-xl bg-surface-raised p-3 border border-surface-border/40">
                        <div>
                          <p className="text-sm font-medium text-ink-primary">{e.nome}</p>
                          <p className="text-[11px] text-ink-muted">Solicitado em: {formatDateDisplay(e.data)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Ações Rápidas (Pós-Cirurgia) */}
          {cirurgia.status === "agendada" && (
            <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.06 }} className="space-y-3 pt-2">
              <h3 className="font-display text-sm font-semibold text-ink-muted px-1">Ações de Atualização</h3>
              
              <button
                onClick={() => handleStatusChange("realizada")}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 py-3.5 px-4 text-emerald-300 font-medium text-sm transition-all active:scale-[0.98]"
              >
                <CheckCircle2 size={18} />
                Marcar Procedimento como Realizado
              </button>
            </motion.div>
          )}
        </section>

        <ConfirmationModal 
          isOpen={showDeleteModal} 
          onClose={() => setShowDeleteModal(false)} 
          onConfirm={handleDelete} 
          title="Excluir Cirurgia" 
          message="Tem certeza que deseja excluir o registro deste procedimento cirúrgico? Essa ação não pode ser desfeita." 
        />
      </main>
    </PageTransition>
  );
}

export default function DetalhesCirurgiaPage() {
  return <Suspense fallback={<LoadingSkeleton />}><DetalhesCirurgiaContent /></Suspense>;
}
