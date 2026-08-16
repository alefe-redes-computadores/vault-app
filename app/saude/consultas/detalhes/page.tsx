"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Stethoscope, 
  Calendar, 
  Building2, 
  UserCheck, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  RotateCcw,
  FileText,
  Pill,
  Activity,
  Plus
} from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import type { Consulta, Medico, Hospital, Medicamento, Exame } from "@/lib/types";

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

function DetalhesConsultaContent() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [consulta, setConsulta] = useState<Consulta | null>(null);
  const [medico, setMedico] = useState<Medico | null>(null);
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const medicamentos = useLiveQuery(() => db.medicamentos.toArray(), []) || [];
  const exames = useLiveQuery(() => db.exames.toArray(), []) || [];

  useEffect(() => {
    if (!id) {
      router.push("/saude/consultas");
      return;
    }

    const fetchData = async () => {
      try {
        const conData = await db.consultas.get(id);
        if (conData) {
          setConsulta(conData);
          if (conData.medico_id) {
            const medData = await db.medicos.get(conData.medico_id);
            if (medData) setMedico(medData);
          }
          if (conData.hospital_id) {
            const hospData = await db.hospitais.get(conData.hospital_id);
            if (hospData) setHospital(hospData);
          }
        } else {
          router.push("/saude/consultas");
        }
      } catch (error) {
        console.error("Erro ao buscar detalhes da consulta:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, router]);

  // ✅ Mantido, com comentário explicativo
  // Nota: Associação por médico e data (aproximação, já que não temos consulta_id)
  const medicamentosRelacionados = useMemo(() => {
    if (!consulta) return [];
    return medicamentos.filter((m: Medicamento) => {
      const matchMedico = consulta.medico_id && m.medico_id === consulta.medico_id;
      const matchDataReceita = m.data_receita === consulta.data;
      return matchMedico || matchDataReceita;
    });
  }, [medicamentos, consulta]);

  const examesRelacionados = useMemo(() => {
    if (!consulta) return [];
    return exames.filter((e: Exame) => {
      const matchMedico = consulta.medico_id && e.medico_id === consulta.medico_id;
      const matchData = e.data === consulta.data;
      return matchMedico || matchData;
    });
  }, [exames, consulta]);

  const handleStatusChange = async (novoStatus: "agendada" | "realizada" | "cancelada") => {
    trigger("vibrate");
    if (!id || !consulta) return;
    try {
      await db.consultas.update(id, {
        status: novoStatus,
        updated_at: new Date().toISOString(),
        synced: false,
      });
      setConsulta({ ...consulta, status: novoStatus });
      trigger("success");
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      trigger("error");
    }
  };

  const handleReagendar = () => {
    trigger("vibrate");
    router.push(`/saude/consultas/nova?reagendar=true&medico_id=${consulta?.medico_id || ""}&hospital_id=${consulta?.hospital_id || ""}`);
  };

  const handleDelete = async () => {
    trigger("vibrate");
    if (!id) return;
    try {
      await db.consultas.delete(id);
      trigger("success");
      router.replace("/saude/consultas");
    } catch (error) {
      console.error("Erro ao excluir consulta:", error);
      trigger("error");
    }
  };

  if (isLoading) return <LoadingSkeleton />;
  if (!consulta) return null;

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
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice">Painel Clínico</p>
              <h1 className="mt-0.5 truncate font-display text-lg font-semibold text-ink-primary">Detalhes do Atendimento</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { trigger("vibrate"); router.push(`/saude/consultas/editar?id=${consulta.id}`); }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-primary transition-all active:scale-95"
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
          <motion.div 
            variants={fadeUp} 
            initial="initial" 
            animate="animate" 
            className="rounded-[32px] border border-surface-border/50 bg-surface p-6 shadow-sm space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ice/10 text-ice border border-ice/10">
                  <Stethoscope size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-ice" />
                    <span className="font-mono text-sm font-bold text-ice">{formatDateDisplay(consulta.data)}</span>
                  </div>
                  <h2 className="font-display text-xl font-bold text-ink-primary mt-1">
                    {medico ? `Dr(a). ${medico.nome}` : "Médico não vinculado"}
                  </h2>
                </div>
              </div>

              <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                consulta.status === "agendada" ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20" :
                consulta.status === "realizada" ? "bg-ice/10 text-ice border border-ice/20" :
                "bg-coral/10 text-coral border border-coral/20"
              }`}>
                {consulta.status}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-surface-border/40">
              <div className="flex items-center gap-3 rounded-2xl bg-surface-raised p-3.5 border border-surface-border/40">
                <UserCheck size={18} className="text-ice shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] text-ink-muted">Especialidade</p>
                  <p className="text-sm font-medium text-ink-primary truncate">{medico?.especialidade || "Não informada"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl bg-surface-raised p-3.5 border border-surface-border/40">
                <Building2 size={18} className="text-ice shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] text-ink-muted">Local / Hospital</p>
                  <p className="text-sm font-medium text-ink-primary truncate">{hospital?.nome || "Não informado"}</p>
                </div>
              </div>
            </div>

            {consulta.motivo && (
              <div className="rounded-2xl bg-surface-raised/60 p-4 border border-surface-border/40">
                <p className="text-xs font-medium text-ink-muted mb-1">Motivo / Assunto</p>
                <p className="text-sm text-ink-primary italic">"{consulta.motivo}"</p>
              </div>
            )}

            {consulta.observacoes && (
              <div className="rounded-2xl bg-surface-raised/60 p-4 border border-surface-border/40">
                <p className="text-xs font-medium text-ink-muted mb-1">Anotações e Prescrições</p>
                <p className="text-sm text-ink-primary whitespace-pre-wrap">{consulta.observacoes}</p>
              </div>
            )}
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.03 }} className="space-y-4">
            <h3 className="font-display text-base font-semibold text-ink-primary px-1">Registros Vinculados ao Atendimento</h3>

            <div className="grid grid-cols-1 gap-3">
              <div className="rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Pill size={16} className="text-ice" />
                    <h4 className="text-sm font-semibold text-ink-primary">Medicamentos / Prescrições ({medicamentosRelacionados.length})</h4>
                  </div>
                </div>

                {medicamentosRelacionados.length === 0 ? (
                  <p className="text-xs text-ink-muted py-2">Nenhum medicamento vinculado diretamente a esta consulta ou data.</p>
                ) : (
                  <div className="space-y-2">
                    {medicamentosRelacionados.map((m: Medicamento) => (
                      <div 
                        key={m.id} 
                        onClick={() => { trigger("vibrate"); router.push(`/saude/medicamentos/detalhes?id=${m.id}`); }}
                        className="flex items-center justify-between rounded-xl bg-surface-raised p-3 border border-surface-border/40 cursor-pointer hover:border-ice/30 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium text-ink-primary">{m.nome} · <span className="text-ice">{m.dosagem}</span></p>
                          <p className="text-[11px] text-ink-muted">Receita em: {formatDateDisplay(m.data_receita)}</p>
                        </div>
                        <span className="text-xs text-ice font-mono">Ver</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity size={16} className="text-emerald-400" />
                    <h4 className="text-sm font-semibold text-ink-primary">Exames Solicitados ({examesRelacionados.length})</h4>
                  </div>
                </div>

                {examesRelacionados.length === 0 ? (
                  <p className="text-xs text-ink-muted py-2">Nenhum exame registrado para este médico/data.</p>
                ) : (
                  <div className="space-y-2">
                    {examesRelacionados.map((e: Exame) => (
                      <div 
                        key={e.id}
                        className="flex items-center justify-between rounded-xl bg-surface-raised p-3 border border-surface-border/40"
                      >
                        <div>
                          <p className="text-sm font-medium text-ink-primary">{e.nome}</p>
                          <p className="text-[11px] text-ink-muted">Data: {formatDateDisplay(e.data)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.06 }} className="space-y-3 pt-2">
            <h3 className="font-display text-sm font-semibold text-ink-muted px-1">Ações de Acompanhamento</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => handleStatusChange("realizada")}
                className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 py-3.5 px-4 text-emerald-300 font-medium text-sm transition-all active:scale-[0.98]"
              >
                <CheckCircle2 size={18} />
                Marcar como Realizada
              </button>

              <button
                onClick={handleReagendar}
                className="flex items-center justify-center gap-2 rounded-2xl border border-surface-border/60 bg-surface py-3.5 px-4 text-ink-primary font-medium text-sm transition-all active:scale-[0.98] hover:border-ice/40"
              >
                <RotateCcw size={18} className="text-ice" />
                Reagendar / Nova Consulta
              </button>
            </div>
          </motion.div>
        </section>

        <ConfirmationModal 
          isOpen={showDeleteModal} 
          onClose={() => setShowDeleteModal(false)} 
          onConfirm={handleDelete} 
          title="Excluir Consulta" 
          message="Tem certeza que deseja excluir este registro de consulta? Essa ação não pode ser desfeita." 
        />
      </main>
    </PageTransition>
  );
}

export default function DetalhesConsultaPage() {
  return <Suspense fallback={<LoadingSkeleton />}><DetalhesConsultaContent /></Suspense>;
}