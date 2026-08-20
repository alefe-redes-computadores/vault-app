// app/saude/hospitais/editar/page.tsx
"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  Save,
  Building2,
  Trash2,
  Activity,
  FlaskConical,
  Stethoscope,
  ExternalLink,
  Calendar,
  FolderHeart,
  Check,
  X,
  Plus
} from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { useSubmitAction } from "@/hooks/useSubmitAction";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageTransition } from "@/components/PageTransition";
import { DetailSkeleton } from "@/components/loading/DetailSkeleton";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { db } from "@/lib/db";
import { enfileirarOperacao } from "@/lib/sync/enfileirarOperacao";
import { useLiveQuery } from "dexie-react-hooks";
import { useAuth } from "@/hooks/useAuth";
import type { Hospital, Cirurgia, Exame, Consulta } from "@/lib/types";

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

function EditarHospitalContent() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "";
  const { user } = useAuth();

  const saveAction = useSubmitAction();
  const deleteAction = useSubmitAction();

  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [nome, setNome] = useState("");
  const [endereco, setEndereco] = useState("");
  const [telefone, setTelefone] = useState("");

  const [medicoIds, setMedicoIds] = useState<string[]>([]);
  const [tratamentoIds, setTratamentoIds] = useState<string[]>([]);

  const [isMedModalOpen, setIsMedModalOpen] = useState(false);
  const [isTratModalOpen, setIsTratModalOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const medicos = useLiveQuery(() => db.medicos.toArray(), [], []) || [];
  const tratamentos = useLiveQuery(() => user ? db.tratamentos.where('user_id').equals(user.id).toArray() : [], [user?.id], []) || [];
  
  const cirurgias = useLiveQuery(() => db.cirurgias.toArray(), [], []) || [];
  const exames = useLiveQuery(() => db.exames.toArray(), [], []) || [];
  const consultas = useLiveQuery(() => db.consultas.toArray(), [], []) || [];

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }

    db.hospitais.get(id).then((item) => {
      if (!item) {
        setNotFound(true);
      } else {
        setNome(item.nome || "");
        setEndereco(item.endereco || "");
        setTelefone(item.telefone || "");
        setMedicoIds(item.medico_ids || []);
        setTratamentoIds(item.tratamento_ids || []);
      }
    }).finally(() => {
      setIsLoading(false);
    });
  }, [id]);

  const cirurgiasVinculadas = useMemo(() => {
    if (!id) return [];
    return cirurgias.filter((c: Cirurgia) => c.hospital_id === id);
  }, [cirurgias, id]);

  const examesVinculados = useMemo(() => {
    if (!id) return [];
    return exames.filter((e: Exame) => e.local_id === id);
  }, [exames, id]);

  const consultasVinculadas = useMemo(() => {
    if (!id) return [];
    return consultas.filter((c: Consulta) => c.hospital_id === id);
  }, [consultas, id]);

  const handleSubmit = () => {
    trigger("vibrate");
    if (!nome.trim()) {
      setErrors({ nome: "Nome é obrigatório" });
      trigger("error");
      return;
    }

    saveAction.run(
      async () => {
        await db.transaction("rw", db.hospitais, db.syncQueue, async () => {
          const original = await db.hospitais.get(id);
          if (!original) throw new Error("Hospital não encontrado");

          const hospitalAtualizado: Hospital = {
            ...original,
            nome: nome.trim(),
            endereco: endereco.trim() || undefined,
            telefone: telefone.trim() || undefined,
            medico_ids: medicoIds,
            tratamento_ids: tratamentoIds,
            updated_at: new Date().toISOString(),
            synced: false
          };

          await db.hospitais.put(hospitalAtualizado);
          await enfileirarOperacao("hospitais", "update", hospitalAtualizado);
        });
      },
      { successMessage: "Hospital atualizado com sucesso", errorMessage: "Erro ao atualizar hospital", goBackOnSuccess: true }
    );
  };

  const handleDelete = () => {
    deleteAction.run(
      async () => {
        await db.transaction("rw", db.hospitais, db.syncQueue, async () => {
          await db.hospitais.delete(id);
          await enfileirarOperacao("hospitais", "delete", { id });
        });
        router.replace("/saude/hospitais");
      },
      { successMessage: "Hospital excluído com sucesso", errorMessage: "Erro ao excluir hospital" }
    );
  };

  const MultiSelectModal = ({ isOpen, onClose, title, items, selectedIds, onChange, icon: Icon, onCreateNew, createLabel }: any) => {
    const toggle = (itemId: string) => {
      trigger("vibrate");
      if (selectedIds.includes(itemId)) onChange(selectedIds.filter((i: string) => i !== itemId));
      else onChange([...selectedIds, itemId]);
    };
    return (
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} className="fixed bottom-0 left-0 right-0 z-50 flex max-h-[85vh] flex-col rounded-t-[32px] bg-surface pb-safe shadow-2xl">
              <div className="flex items-center justify-between border-b border-surface-border/50 px-6 py-4">
                <h3 className="font-display text-lg font-semibold text-ink-primary flex items-center gap-2">
                  <Icon size={18} className="text-ice"/> {title}
                </h3>
                <button onClick={onClose} className="rounded-full bg-surface-raised p-2 active:scale-95">
                  <X size={18} className="text-ink-muted" />
                </button>
              </div>
              <div className="overflow-y-auto p-4 space-y-2">
                {items.length === 0 ? (
                  <p className="text-center text-sm text-ink-muted py-6">Nenhum registro encontrado.</p>
                ) : (
                  items.map((item: any) => {
                    const isSelected = selectedIds.includes(item.id);
                    return (
                      <button key={item.id} onClick={() => toggle(item.id)} className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-all active:scale-[0.98] ${isSelected ? "border-ice bg-ice/10" : "border-surface-border/50 bg-surface-raised"}`}>
                        <span className={`font-medium ${isSelected ? "text-ice" : "text-ink-primary"}`}>
                          {item.nome}
                        </span>
                        <div className={`flex h-6 w-6 items-center justify-center rounded-full border ${isSelected ? "border-ice bg-ice text-void" : "border-surface-border bg-transparent"}`}>
                          {isSelected && <Check size={14} strokeWidth={3} />}
                        </div>
                      </button>
                    );
                  })
                )}
                <button onClick={() => { onClose(); onCreateNew(); }} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-ice/40 bg-ice/5 py-4 text-sm font-semibold text-ice active:scale-95">
                  <Plus size={18} /> {createLabel}
                </button>
              </div>
              <div className="p-4 border-t border-surface-border/50">
                <Button variant="primary" fullWidth onClick={onClose}>
                  Confirmar {selectedIds.length} Selecionado(s)
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  };

  if (isLoading) return <DetailSkeleton />;

  if (notFound) {
    return (
      <PageTransition>
        <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-void px-6 text-center">
          <p className="font-display text-lg font-semibold text-ink-primary">Hospital não encontrado</p>
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
                <Building2 size={16} className="text-ice" />
              </div>
              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary truncate">{nome}</h1>
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
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted px-1">Dados da Unidade</h2>
            <Input
              label="Nome *"
              placeholder="Ex: Hospital Regional..."
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              error={errors.nome}
              required
            />
            <Input
              label="Endereço"
              placeholder="Rua, número, bairro"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
            />
            <Input
              label="Telefone"
              placeholder="(00) 00000-0000"
              value={telefone}
              onChange={(e) => setTelefone(formatPhone(e.target.value))}
            />
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.05 }} className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted px-1">Rede Relacional</h2>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-primary">Médicos que atendem aqui</label>
              <button
                type="button"
                onClick={() => setIsMedModalOpen(true)}
                className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <Stethoscope size={16} className="text-ice" />
                  {medicoIds.length > 0 ? `${medicoIds.length} médico(s) selecionado(s)` : "Vincular médicos..."}
                </span>
                <span className="text-xs text-ice font-medium">Alterar</span>
              </button>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-primary">Tratamentos realizados aqui</label>
              <button
                type="button"
                onClick={() => setIsTratModalOpen(true)}
                className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <FolderHeart size={16} className="text-violet-400" />
                  {tratamentoIds.length > 0 ? `${tratamentoIds.length} tratamento(s) selecionado(s)` : "Vincular tratamentos..."}
                </span>
                <span className="text-xs text-ice font-medium">Alterar</span>
              </button>
            </div>
          </motion.div>

          {/* Histórico Vinculado: Cirurgias */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.08 }} className="space-y-3 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                <Activity size={14} className="text-coral" /> Cirurgias Vinculadas ({cirurgiasVinculadas.length})
              </h2>
            </div>
            {cirurgiasVinculadas.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-surface-border/60 bg-surface-raised/40 p-4 text-center">
                <p className="text-xs text-ink-muted">Nenhuma cirurgia vinculada a esta unidade.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cirurgiasVinculadas.map((cirurgia: Cirurgia) => (
                  <div
                    key={cirurgia.id}
                    onClick={() => { trigger("vibrate"); router.push(`/saude/cirurgias/detalhes?id=${cirurgia.id}`); }}
                    className="flex items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised/60 p-3 transition-all active:scale-[0.98] hover:bg-surface-raised cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-coral/10 text-coral">
                        <Activity size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-ink-primary truncate">{cirurgia.procedimento}</p>
                        <p className="text-[10px] text-ink-muted">{formatDateDisplay(cirurgia.data)}</p>
                      </div>
                    </div>
                    <ExternalLink size={14} className="text-ink-faint shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Histórico Vinculado: Exames */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.10 }} className="space-y-3 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                <FlaskConical size={14} className="text-emerald-400" /> Exames Vinculados ({examesVinculados.length})
              </h2>
            </div>
            {examesVinculados.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-surface-border/60 bg-surface-raised/40 p-4 text-center">
                <p className="text-xs text-ink-muted">Nenhum exame vinculado a esta unidade.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {examesVinculados.map((exame: Exame) => (
                  <div
                    key={exame.id}
                    onClick={() => { trigger("vibrate"); router.push(`/saude/exames/detalhes?id=${exame.id}`); }}
                    className="flex items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised/60 p-3 transition-all active:scale-[0.98] hover:bg-surface-raised cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
                        <FlaskConical size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-ink-primary truncate">{exame.nome}</p>
                        <p className="text-[10px] text-ink-muted">{formatDateDisplay(exame.data)}</p>
                      </div>
                    </div>
                    <ExternalLink size={14} className="text-ink-faint shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Histórico Vinculado: Consultas */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.12 }} className="space-y-3 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                <Stethoscope size={14} className="text-ice" /> Consultas Vinculadas ({consultasVinculadas.length})
              </h2>
            </div>
            {consultasVinculadas.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-surface-border/60 bg-surface-raised/40 p-4 text-center">
                <p className="text-xs text-ink-muted">Nenhuma consulta vinculada a esta unidade.</p>
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
            {saveAction.isSubmitting ? (
              <><Loader2 size={16} className="animate-spin" /> Salvando...</>
            ) : (
              <><Save size={16} /> Salvar alterações</>
            )}
          </Button>
        </div>

        <MultiSelectModal
          isOpen={isMedModalOpen}
          onClose={() => setIsMedModalOpen(false)}
          title="Médicos da Unidade"
          items={medicos}
          selectedIds={medicoIds}
          onChange={setMedicoIds}
          icon={Stethoscope}
          onCreateNew={() => router.push("/saude/medicos/novo")}
          createLabel="Cadastrar Novo Médico"
        />
        <MultiSelectModal
          isOpen={isTratModalOpen}
          onClose={() => setIsTratModalOpen(false)}
          title="Tratamentos Relacionados"
          items={tratamentos}
          selectedIds={tratamentoIds}
          onChange={setTratamentoIds}
          icon={FolderHeart}
          onCreateNew={() => router.push("/saude/tratamentos/novo")}
          createLabel="Cadastrar Novo Tratamento"
        />

        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          title="Excluir hospital"
          message={`Tem certeza que deseja excluir "${nome}"?`}
          isLoading={deleteAction.isSubmitting}
          type="danger"
        />
      </main>
    </PageTransition>
  );
}

export default function EditarHospitalPage() {
  return <Suspense fallback={<DetailSkeleton />}><EditarHospitalContent /></Suspense>;
}
