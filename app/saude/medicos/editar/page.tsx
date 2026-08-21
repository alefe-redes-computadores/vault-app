// app/saude/medicos/editar/page.tsx
"use client";

import { useState, useEffect, Suspense, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Loader2, Stethoscope, Trash2, Calendar, FlaskConical, ExternalLink } from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { useSubmitAction } from "@/hooks/useSubmitAction";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { PageTransition } from "@/components/PageTransition";
import { DetailSkeleton } from "@/components/loading/DetailSkeleton";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { medicosRepository } from "@/lib/repositories/medicos";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import type { Medico, Consulta, Exame, Cirurgia } from "@/lib/types";

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

function formatPhone(value: string): string {
  const clean = value.replace(/\D/g, "").slice(0, 11);
  if (clean.length <= 2) return clean;
  if (clean.length <= 6) return `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
  if (clean.length <= 10) return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
}

function formatDateDisplay(isoStr: string): string {
  if (!isoStr) return "";
  const parts = isoStr.split("-");
  if (parts.length !== 3) return isoStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function EditarMedicoContent() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "";

  const saveAction = useSubmitAction();
  const deleteAction = useSubmitAction();
  const isSubmitLocked = useRef(false);

  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [nome, setNome] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [crm, setCrm] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const consultas = useLiveQuery(() => db.consultas.toArray(), [], []) || [];
  const exames = useLiveQuery(() => db.exames.toArray(), [], []) || [];
  const cirurgias = useLiveQuery(() => db.cirurgias.toArray(), [], []) || [];

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }

    medicosRepository.getById(id).then((item) => {
      if (!item) {
        setNotFound(true);
      } else {
        setNome(item.nome || "");
        setEspecialidade(item.especialidade || "");
        setTelefone(item.telefone || "");
        setEmail(item.email || "");
        setCrm(item.crm || "");
        setObservacoes(item.observacoes || "");
      }
    }).finally(() => {
      setIsLoading(false);
    });
  }, [id]);

  const consultasVinculadas = useMemo(() => {
    if (!id) return [];
    return consultas.filter((c: Consulta) => c.medico_id === id);
  }, [consultas, id]);

  const examesVinculados = useMemo(() => {
    if (!id) return [];
    return exames.filter((e: Exame) => e.medico_id === id);
  }, [exames, id]);

  const cirurgiasVinculadas = useMemo(() => {
    if (!id) return [];
    return cirurgias.filter((cir: Cirurgia) => cir.medico_id === id);
  }, [cirurgias, id]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!nome.trim()) newErrors.nome = "Nome é obrigatório";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    trigger("vibrate");
    if (!validate()) {
      trigger("error");
      return;
    }

    if (isSubmitLocked.current || saveAction.isSubmitting) return;
    isSubmitLocked.current = true;

    try {
      await saveAction.run(
        async () => {
          // Repositório cuida de updated_at, synced e enfileiramento
          await medicosRepository.update(id, {
            nome: nome.trim(),
            especialidade: especialidade.trim() || undefined,
            telefone: telefone.trim() || undefined,
            email: email.trim() || undefined,
            crm: crm.trim() || undefined,
            observacoes: observacoes.trim() || undefined,
          });
        },
        { successMessage: "Médico atualizado com sucesso", errorMessage: "Erro ao atualizar médico", goBackOnSuccess: true }
      );
    } finally {
      isSubmitLocked.current = false;
    }
  };

  const handleDelete = async () => {
    trigger("vibrate");
    await deleteAction.run(
      async () => {
        await medicosRepository.delete(id);
        router.replace("/saude/medicos");
      },
      { successMessage: "Médico excluído com sucesso", errorMessage: "Erro ao excluir médico" }
    );
    setShowDeleteModal(false);
  };

  if (isLoading) return <DetailSkeleton />;

  if (notFound) {
    return (
      <PageTransition>
        <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-void px-6 text-center">
          <p className="font-display text-lg font-semibold text-ink-primary">Médico não encontrado</p>
          <button onClick={() => router.back()} className="mt-4 rounded-full bg-ice px-5 py-2.5 text-sm font-semibold text-void">Voltar</button>
        </main>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <main className="min-h-[100dvh] bg-void pb-[calc(10rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { trigger("vibrate"); router.back(); }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Stethoscope size={16} className="text-ice" />
              </div>
              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary truncate">{nome || "Editar médico"}</h1>
            </div>
            <button
              onClick={() => { trigger("vibrate"); setShowDeleteModal(true); }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-coral/20 bg-coral/10 text-coral transition-all active:scale-95"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </header>

        <section className="space-y-5 px-5 pt-6">
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="space-y-3 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted px-1">Dados do Profissional</h2>
            <Input
              label="Nome *"
              placeholder="Ex: Dr. Carlos Silva"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              error={errors.nome}
              required
            />
            <Input
              label="Especialidade"
              placeholder="Ex: Cardiologista"
              value={especialidade}
              onChange={(e) => setEspecialidade(e.target.value)}
            />
            <Input
              label="CRM"
              placeholder="Ex: 123456/SP"
              value={crm}
              onChange={(e) => setCrm(e.target.value)}
            />
            <Input
              label="Telefone"
              placeholder="(00) 00000-0000"
              value={telefone}
              onChange={(e) => setTelefone(formatPhone(e.target.value))}
            />
            <Input
              label="E-mail"
              placeholder="medico@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
            />
            <TextArea
              label="Observações"
              placeholder="Dias de atendimento..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </motion.div>

          {/* Consultas Vinculadas */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.08 }} className="space-y-3 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                <Calendar size={14} className="text-ice" /> Consultas Vinculadas ({consultasVinculadas.length})
              </h2>
            </div>
            {consultasVinculadas.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-surface-border/60 bg-surface-raised/40 p-4 text-center">
                <p className="text-xs text-ink-muted">Nenhuma consulta com este médico.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {consultasVinculadas.map((consulta: Consulta) => (
                  <div
                    key={consulta.id}
                    onClick={() => { trigger("vibrate"); router.push(`/saude/consultas/detalhes?id=${consulta.id}`); }}
                    className="flex items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised/60 p-3 transition-all active:scale-[0.98] hover:bg-surface-raised cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice">
                        <Calendar size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-ink-primary truncate">{consulta.especialidade}</p>
                        <p className="text-[10px] text-ink-muted">{formatDateDisplay(consulta.data)}</p>
                      </div>
                    </div>
                    <ExternalLink size={14} className="text-ink-faint shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleSubmit}
            disabled={saveAction.isSubmitting}
            className="flex items-center justify-center gap-2 shadow-lg shadow-ice/10"
          >
            {saveAction.isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Salvando...</> : <><Save size={16} /> Salvar alterações</>}
          </Button>
        </div>

        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          title="Excluir médico"
          message={`Tem certeza que deseja excluir "${nome}"?`}
          isLoading={deleteAction.isSubmitting}
          type="danger"
        />
      </main>
    </PageTransition>
  );
}

export default function EditarMedicoPage() {
  return <Suspense fallback={<DetailSkeleton />}><EditarMedicoContent /></Suspense>;
}