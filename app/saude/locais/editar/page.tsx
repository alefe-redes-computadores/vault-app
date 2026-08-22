// app/saude/locais/editar/page.tsx
"use client";

import { useState, useEffect, useMemo, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, Loader2, Save, MapPin, Trash2, Calendar, DollarSign, Pill, Stethoscope, Plus, X, Activity, FolderHeart
} from "lucide-react";
import { useLocais } from "@/hooks/useLocais";
import { useRenovacoes } from "@/hooks/useRenovacoes";
import { useMedicos } from "@/hooks/useMedicos";
import { useTratamentos } from "@/hooks/useTratamentos";
import { useConsultas } from "@/hooks/useConsultas";
import { useHapticFeedback } from "@/lib/haptics";
import { useSubmitAction } from "@/hooks/useSubmitAction";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageTransition } from "@/components/PageTransition";
import { DetailSkeleton } from "@/components/loading/DetailSkeleton";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { locaisRepository } from "@/lib/repositories/locais";
import { SelectionModal } from "@/components/SelectionModal";
import type { LocalSaude, Renovacao, Medico, Tratamento, Consulta } from "@/lib/types";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

const TIPOS_LOCAL = [
  { id: "posto_saude", label: "Posto de Saúde" },
  { id: "laboratorio", label: "Laboratório" },
  { id: "clinica", label: "Clínica" },
  { id: "outro", label: "Outro" },
];

function formatDateDisplay(isoStr: string): string {
  if (!isoStr) return "";
  const parts = isoStr.split("-");
  if (parts.length !== 3) return isoStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatPhone(value: string): string {
  const clean = value.replace(/\D/g, "").slice(0, 11);
  if (clean.length <= 2) return clean;
  if (clean.length <= 6) return `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
  if (clean.length <= 10) return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
}

function EditarLocalContent() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "";

  // Hooks de Dados (Para puxar o que pode ser vinculado)
  const { renovacoes = [] } = useRenovacoes();
  const { medicos = [] } = useMedicos();
  const { tratamentos = [] } = useTratamentos();
  const { consultas = [] } = useConsultas();

  const saveAction = useSubmitAction();
  const deleteAction = useSubmitAction();
  const isSubmitLocked = useRef(false);

  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  
  // Estados do Formulário Base
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("posto_saude");
  const [endereco, setEndereco] = useState("");
  const [telefone, setTelefone] = useState("");
  
  // Estados dos Relacionamentos Diretos (M:N)
  const [medicoIds, setMedicoIds] = useState<string[]>([]);
  const [tratamentoIds, setTratamentoIds] = useState<string[]>([]);
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Controle dos Modais
  const [isMedicoModalOpen, setIsMedicoModalOpen] = useState(false);
  const [isTratamentoModalOpen, setIsTratamentoModalOpen] = useState(false);

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }

    locaisRepository.getById(id)
      .then((item) => {
        if (!item) {
          setNotFound(true);
        } else {
          setNome(item.nome || "");
          setTipo(item.tipo || "posto_saude");
          setEndereco(item.endereco || "");
          setTelefone(item.telefone || "");
          setMedicoIds(item.medico_ids || []);
          setTratamentoIds(item.tratamento_ids || []);
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id]);

  // --- RELACIONAMENTOS INDIRETOS (Eventos Históricos no Local) ---
  const renovacoesVinculadas = useMemo(() => {
    if (!id || !renovacoes.length) return [];
    return renovacoes.filter((r: Renovacao) => r.local_id === id).sort((a, b) => b.data.localeCompare(a.data));
  }, [renovacoes, id]);

  const consultasVinculadas = useMemo(() => {
    if (!id || !consultas.length) return [];
    return consultas.filter((c: Consulta) => c.local_id === id).sort((a, b) => b.data.localeCompare(a.data));
  }, [consultas, id]);

  // --- RELACIONAMENTOS DIRETOS (Vínculos Atuais) ---
  const medicosVinculadosObjects = useMemo(() => medicos.filter(m => medicoIds.includes(m.id!)), [medicos, medicoIds]);
  const tratamentosVinculadosObjects = useMemo(() => tratamentos.filter(t => tratamentoIds.includes(t.id!)), [tratamentos, tratamentoIds]);

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
          await locaisRepository.update(id, {
            nome: nome.trim(),
            tipo: tipo || undefined,
            endereco: endereco.trim() || undefined,
            telefone: telefone.trim() || undefined,
            medico_ids: medicoIds,
            tratamento_ids: tratamentoIds, // 👈 Salvando Tratamentos
          });
        },
        {
          successMessage: "Local atualizado com sucesso",
          errorMessage: "Erro ao atualizar local",
          goBackOnSuccess: true,
        }
      );
    } finally {
      isSubmitLocked.current = false;
    }
  };

  const handleDelete = async () => {
    trigger("vibrate");
    await deleteAction.run(
      async () => {
        await locaisRepository.delete(id);
        router.replace("/saude/locais");
      },
      { successMessage: "Local excluído", errorMessage: "Erro ao excluir local" }
    );
  };

  // Funções de Vínculo
  const handleAddMedico = (medico: Medico) => {
    if (medico.id && !medicoIds.includes(medico.id)) setMedicoIds(prev => [...prev, medico.id!]);
  };
  const handleRemoveMedico = (medicoId: string) => {
    trigger("vibrate");
    setMedicoIds(prev => prev.filter(id => id !== medicoId));
  };

  const handleAddTratamento = (tratamento: Tratamento) => {
    if (tratamento.id && !tratamentoIds.includes(tratamento.id)) setTratamentoIds(prev => [...prev, tratamento.id!]);
  };
  const handleRemoveTratamento = (tratamentoId: string) => {
    trigger("vibrate");
    setTratamentoIds(prev => prev.filter(id => id !== tratamentoId));
  };

  if (isLoading) return <DetailSkeleton />;
  if (notFound) return <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-void px-6 text-center"><p className="font-display text-lg font-semibold text-ink-primary">Local não encontrado</p><button onClick={() => router.back()} className="mt-4 rounded-full bg-ice px-5 py-2.5 text-sm font-semibold text-void">Voltar</button></main>;

  return (
    <PageTransition>
      <main className="min-h-[100dvh] bg-void pb-[calc(10rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button onClick={() => { trigger("vibrate"); router.back(); }} className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"><ArrowLeft size={18} className="text-ink-primary" /></button>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-xl font-semibold text-ink-primary truncate">{nome || "Editar local"}</h1>
            </div>
            <button onClick={() => { trigger("vibrate"); setShowDeleteModal(true); }} className="flex h-11 w-11 items-center justify-center rounded-full border border-coral/20 bg-coral/10 text-coral transition-all active:scale-95"><Trash2 size={16} /></button>
          </div>
        </header>

        <section className="space-y-5 px-5 pt-6">
          {/* DADOS BÁSICOS */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="space-y-3 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted px-1">Dados do Local</h2>
            <Input label="Nome *" placeholder="Ex: UBS Central" value={nome} onChange={(e) => setNome(e.target.value)} error={errors.nome} required />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-primary">Tipo</label>
              <div className="flex flex-wrap gap-2">
                {TIPOS_LOCAL.map((tipoOption) => (
                  <button key={tipoOption.id} onClick={() => { trigger("vibrate"); setTipo(tipoOption.id); }} className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all active:scale-95 ${tipo === tipoOption.id ? "border-emerald-400 bg-emerald-400/10 text-emerald-400" : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"}`}>{tipoOption.label}</button>
                ))}
              </div>
            </div>
            <Input label="Endereço" placeholder="Rua, número, bairro" value={endereco} onChange={(e) => setEndereco(e.target.value)} />
            <Input label="Telefone" placeholder="(00) 00000-0000" value={telefone} onChange={(e) => setTelefone(formatPhone(e.target.value))} />
          </motion.div>

          {/* VÍNCULO DE MÉDICOS */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="space-y-3 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                <Stethoscope size={14} className="text-ice" /> Médicos do Local
              </h2>
              <button onClick={() => { trigger("vibrate"); setIsMedicoModalOpen(true); }} className="flex items-center gap-1 text-[10px] font-bold text-ice bg-ice/10 px-2.5 py-1 rounded-full active:scale-95 transition-all">
                <Plus size={12} /> Adicionar
              </button>
            </div>
            {medicosVinculadosObjects.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-surface-border/60 bg-surface-raised/40 p-4 text-center"><p className="text-xs text-ink-muted">Nenhum médico vinculado.</p></div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {medicosVinculadosObjects.map((med) => (
                  <div key={med.id} className="flex items-center gap-2 bg-surface-raised border border-surface-border/50 rounded-full pl-3 pr-1 py-1">
                    <span className="text-xs font-semibold text-ink-primary truncate max-w-[150px]">Dr(a). {med.nome.split(' ')[0]}</span>
                    <button onClick={() => handleRemoveMedico(med.id!)} className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-border/50 text-ink-muted hover:bg-coral/20 hover:text-coral transition-colors"><X size={12} /></button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* VÍNCULO DE TRATAMENTOS */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="space-y-3 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                <Activity size={14} className="text-violet-400" /> Polo de Tratamentos
              </h2>
              <button onClick={() => { trigger("vibrate"); setIsTratamentoModalOpen(true); }} className="flex items-center gap-1 text-[10px] font-bold text-violet-400 bg-violet-400/10 px-2.5 py-1 rounded-full active:scale-95 transition-all">
                <Plus size={12} /> Adicionar
              </button>
            </div>
            {tratamentosVinculadosObjects.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-surface-border/60 bg-surface-raised/40 p-4 text-center"><p className="text-xs text-ink-muted">Nenhum tratamento vinculado a este local.</p></div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tratamentosVinculadosObjects.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 bg-surface-raised border border-surface-border/50 rounded-full pl-3 pr-1 py-1" style={{ borderLeft: `3px solid ${t.cor || '#8B5CF6'}` }}>
                    <span className="text-xs font-semibold text-ink-primary truncate max-w-[150px]">{t.nome}</span>
                    <button onClick={() => handleRemoveTratamento(t.id!)} className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-border/50 text-ink-muted hover:bg-coral/20 hover:text-coral transition-colors"><X size={12} /></button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* HISTÓRICO: CONSULTAS (Somente Leitura) */}
          {consultasVinculadas.length > 0 && (
             <motion.div variants={fadeUp} initial="initial" animate="animate" className="space-y-3 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
               <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                 <Calendar size={14} className="text-ice" /> Histórico de Consultas
               </h2>
               <div className="space-y-2">
                 {consultasVinculadas.slice(0, 3).map((consulta: Consulta) => (
                   <div key={consulta.id} className="flex flex-col rounded-2xl border border-surface-border/50 bg-surface-raised/60 p-3">
                     <p className="text-xs font-semibold text-ink-primary">{consulta.especialidade} com Dr(a). {consulta.medico}</p>
                     <p className="text-[10px] text-ink-muted mt-0.5">{formatDateDisplay(consulta.data)} • {consulta.status}</p>
                   </div>
                 ))}
                 {consultasVinculadas.length > 3 && <p className="text-[10px] text-center text-ink-muted pt-1">Ver mais em Consultas...</p>}
               </div>
             </motion.div>
          )}

          {/* HISTÓRICO: RENOVAÇÕES (Somente Leitura) */}
          {renovacoesVinculadas.length > 0 && (
            <motion.div variants={fadeUp} initial="initial" animate="animate" className="space-y-3 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                <Pill size={14} className="text-amber-400" /> Histórico de Renovações
              </h2>
              <div className="space-y-2">
                {renovacoesVinculadas.slice(0, 3).map((renovacao: Renovacao) => (
                  <div key={renovacao.id} className="flex items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised/60 p-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400"><Calendar size={14} /></div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-ink-primary truncate">{formatDateDisplay(renovacao.data)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </section>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <Button variant="primary" size="lg" fullWidth onClick={handleSubmit} disabled={saveAction.isSubmitting} className="flex items-center justify-center gap-2 shadow-lg shadow-ice/10">
            {saveAction.isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Salvando...</> : <><Save size={16} /> Salvar alterações</>}
          </Button>
        </div>

        <ConfirmationModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={handleDelete} title="Excluir local" message={`Tem certeza que deseja excluir "${nome}"?`} confirmLabel="Excluir" cancelLabel="Cancelar" isLoading={deleteAction.isSubmitting} type="danger" />
        
        {/* MODAIS DE SELEÇÃO */}
        <SelectionModal<Medico>
          isOpen={isMedicoModalOpen}
          onClose={() => setIsMedicoModalOpen(false)}
          onSelect={handleAddMedico}
          items={medicos.filter(m => !medicoIds.includes(m.id!))}
          title="Selecionar Médico"
          placeholder="Buscar médico..."
          getItemId={(item) => item.id!}
          getItemLabel={(item) => item.nome}
          renderItem={(item) => (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ice/10 text-ice"><Stethoscope size={16} /></div>
              <div><p className="text-sm font-semibold text-ink-primary">Dr(a). {item.nome}</p></div>
            </div>
          )}
        />

        <SelectionModal<Tratamento>
          isOpen={isTratamentoModalOpen}
          onClose={() => setIsTratamentoModalOpen(false)}
          onSelect={handleAddTratamento}
          items={tratamentos.filter(t => !tratamentoIds.includes(t.id!))}
          title="Selecionar Tratamento"
          placeholder="Buscar tratamento..."
          getItemId={(item) => item.id!}
          getItemLabel={(item) => item.nome}
          renderItem={(item) => (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-400/10 text-violet-400"><FolderHeart size={16} /></div>
              <div><p className="text-sm font-semibold text-ink-primary">{item.nome}</p></div>
            </div>
          )}
        />
      </main>
    </PageTransition>
  );
}

export default function EditarLocalPage() {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <EditarLocalContent />
    </Suspense>
  );
}
