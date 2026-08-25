// app/saude/farmacias/editar/page.tsx
"use client";

import { useState, useEffect, useMemo, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Save, Building2, Trash2, Pill, ExternalLink, Calendar, Plus, X } from "lucide-react";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useRenovacoes } from "@/hooks/useRenovacoes";
import { useHapticFeedback } from "@/lib/haptics";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { PageTransition } from "@/components/PageTransition";
import { DetailSkeleton } from "@/components/loading/DetailSkeleton";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { SelectionModal } from "@/components/SelectionModal";
import { useSubmitAction } from "@/hooks/useSubmitAction";
import { farmaciasRepository } from "@/lib/repositories/farmacias";
import { medicamentosRepository } from "@/lib/repositories/medicamentos";
import type { Medicamento, Renovacao } from "@/lib/types";

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

function EditarFarmaciaContent() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "";
  
  const { medicamentos = [] } = useMedicamentos();
  const { renovacoes = [] } = useRenovacoes();
  
  const { run, isSubmitting } = useSubmitAction();
  const linkAction = useSubmitAction();
  const isSubmitLocked = useRef(false);

  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  
  const [nome, setNome] = useState("");
  const [endereco, setEndereco] = useState("");
  const [telefone, setTelefone] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isMedModalOpen, setIsMedModalOpen] = useState(false);

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }

    farmaciasRepository.getById(id).then((item) => {
      if (!item) {
        setNotFound(true);
      } else {
        setNome(item.nome || "");
        setEndereco(item.endereco || "");
        setTelefone(item.telefone || "");
        setObservacoes(item.observacoes || "");
      }
    }).finally(() => setIsLoading(false));
  }, [id]);

  const medicamentosVinculados = useMemo(() => {
    if (!medicamentos.length || !id) return [];
    return medicamentos.filter((m: Medicamento) => m.farmacia_id === id);
  }, [medicamentos, id]);

  const renovacoesVinculadas = useMemo(() => {
    if (!renovacoes.length || !id) return [];
    return renovacoes.filter((r: Renovacao) => r.farmacia_id === id).sort((a, b) => b.data.localeCompare(a.data));
  }, [renovacoes, id]);

  const handleVincularMedicamento = async (med: Medicamento) => {
    if (!med.id || !id) return;
    trigger("vibrate");
    await linkAction.run(async () => {
      await medicamentosRepository.update(med.id!, { farmacia_id: id });
    }, { 
      successMessage: "Medicamento vinculado à farmácia",
      errorMessage: "Erro ao vincular medicamento" 
    });
  };

  const handleDesvincularMedicamento = async (med: Medicamento, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!med.id) return;
    trigger("vibrate");
    await linkAction.run(async () => {
      await medicamentosRepository.update(med.id!, { farmacia_id: undefined });
    }, { 
      successMessage: "Medicamento desvinculado",
      errorMessage: "Erro ao desvincular medicamento" 
    });
  };

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

    if (isSubmitLocked.current || isSubmitting) return;
    isSubmitLocked.current = true;

    try {
      await run(
        async () => {
          await farmaciasRepository.update(id, {
            nome: nome.trim(),
            endereco: endereco.trim() || undefined,
            telefone: telefone.trim() || undefined,
            observacoes: observacoes.trim() || undefined,
          });
        },
        { successMessage: "Farmácia atualizada com sucesso", errorMessage: "Erro ao atualizar farmácia", goBackOnSuccess: true }
      );
    } finally {
      isSubmitLocked.current = false;
    }
  };

  const handleDelete = async () => {
    trigger("vibrate");
    await run(
      async () => {
        await farmaciasRepository.delete(id);
        router.replace("/saude/farmacias");
      },
      { successMessage: "Farmácia excluída com sucesso", errorMessage: "Erro ao excluir farmácia" }
    );
    setShowDeleteModal(false);
  };

  if (isLoading) return <DetailSkeleton />;

  if (notFound) {
    return (
      <PageTransition>
        <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-void px-6 text-center">
          <p className="font-display text-lg font-semibold text-ink-primary">Farmácia não encontrada</p>
          <button onClick={() => router.back()} className="mt-4 rounded-full bg-ice px-5 py-2.5 text-sm font-semibold text-void" type="button">Voltar</button>
        </main>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <main className="min-h-[100dvh] bg-void pb-[calc(10rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button onClick={() => { trigger("vibrate"); router.back(); }} className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95" type="button" aria-label="Voltar">
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-amber-400" />
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-amber-400">Hub de Farmácia</p>
              </div>
              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary truncate">{nome || "Editar farmácia"}</h1>
            </div>
            <button onClick={() => { trigger("vibrate"); setShowDeleteModal(true); }} className="flex h-11 w-11 items-center justify-center rounded-full border border-coral/20 bg-coral/10 text-coral transition-all active:scale-95" type="button" aria-label="Excluir farmácia">
              <Trash2 size={16} />
            </button>
          </div>
        </header>

        <section className="space-y-5 px-5 pt-6">
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="space-y-3 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted px-1">Informações do Local</h2>
            <Input label="Nome *" placeholder="Ex: Farmácia Popular..." value={nome} onChange={(e) => setNome(e.target.value)} error={errors.nome} required />
            <Input label="Endereço" placeholder="Rua, número, bairro" value={endereco} onChange={(e) => setEndereco(e.target.value)} />
            <Input label="Telefone" placeholder="(00) 00000-0000" value={telefone} onChange={(e) => setTelefone(formatPhone(e.target.value))} />
            <TextArea label="Observações" placeholder="Horário de funcionamento, detalhes..." value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </motion.div>

          {/* VÍNCULO ATIVO DE MEDICAMENTOS */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.08 }} className="space-y-3 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                <Pill size={14} className="text-amber-400" /> Polo de Retirada ({medicamentosVinculados.length})
              </h2>
              <button onClick={() => setIsMedModalOpen(true)} className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full active:scale-95 transition-all" type="button" aria-label="Vincular medicamento">
                <Plus size={12} /> Vincular Remédio
              </button>
            </div>
            
            {medicamentosVinculados.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-surface-border/60 bg-surface-raised/40 p-4 text-center">
                <p className="text-xs text-ink-muted">Nenhum medicamento vinculado para compra/retirada aqui.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {medicamentosVinculados.map((med: Medicamento) => (
                  <div key={med.id} onClick={() => router.push(`/saude/medicamentos/detalhes?id=${med.id}`)} className="flex items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised/60 p-3 cursor-pointer transition-all active:scale-[0.98]" role="button" tabIndex={0}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
                        <Pill size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-ink-primary truncate">{med.nome}</p>
                        <p className="text-[10px] text-ink-muted">{med.dosagem || "Uso contínuo"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <ExternalLink size={14} className="text-ink-faint shrink-0" />
                      <button onClick={(e) => handleDesvincularMedicamento(med, e)} className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-border/50 text-ink-muted hover:bg-coral/20 hover:text-coral transition-colors" type="button" aria-label={`Desvincular ${med.nome}`}>
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* HISTÓRICO DE RENOVAÇÕES (Somente Leitura) */}
          {renovacoesVinculadas.length > 0 && (
            <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.10 }} className="space-y-3 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5 px-1">
                <Calendar size={14} className="text-emerald-400" /> Histórico de Renovações na Unidade
              </h2>
              <div className="space-y-2">
                {renovacoesVinculadas.slice(0, 5).map((r: Renovacao) => (
                  <div key={r.id} className="flex items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised/60 p-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
                        <Calendar size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-ink-primary truncate">Data: {formatDateDisplay(r.data)}</p>
                        {r.preco && <p className="text-[10px] text-emerald-400">R$ {Number(r.preco).toFixed(2).replace(".", ",")}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

        </section>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <Button variant="primary" size="lg" fullWidth onClick={handleSubmit} disabled={isSubmitting || linkAction.isSubmitting} className="flex items-center justify-center gap-2 shadow-lg shadow-ice/10">
            {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Salvando...</> : <><Save size={16} /> Salvar alterações</>}
          </Button>
        </div>

        {/* MODAL DE SELEÇÃO: Vincular Medicamento */}
        <SelectionModal<Medicamento>
          isOpen={isMedModalOpen}
          onClose={() => setIsMedModalOpen(false)}
          onSelect={handleVincularMedicamento}
          items={medicamentos.filter(m => m.farmacia_id !== id)}
          title="Vincular Medicamento"
          placeholder="Buscar medicamento..."
          getItemId={i => i.id!}
          getItemLabel={i => i.nome}
          renderItem={(item) => (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-400/10 text-amber-400">
                <Pill size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink-primary">{item.nome}</p>
                <p className="text-[10px] text-ink-muted">{item.dosagem}</p>
              </div>
            </div>
          )}
          onCreateNew={() => { setIsMedModalOpen(false); router.push("/saude/medicamentos/novo"); }}
          createNewLabel="Cadastrar Novo Medicamento"
        />

        <ConfirmationModal 
          isOpen={showDeleteModal} 
          onClose={() => setShowDeleteModal(false)} 
          onConfirm={handleDelete} 
          title="Excluir farmácia" 
          message={`Tem certeza que deseja excluir "${nome}"?`} 
          isLoading={isSubmitting} 
          type="danger" 
        />
      </main>
    </PageTransition>
  );
}

export default function EditarFarmaciaPage() {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <EditarFarmaciaContent />
    </Suspense>
  );
}