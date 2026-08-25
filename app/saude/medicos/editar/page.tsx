// app/saude/medicos/editar/page.tsx
"use client";

import { useState, useEffect, Suspense, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ArrowLeft, Save, Loader2, Stethoscope, Trash2, Calendar, 
  FlaskConical, ExternalLink, Building2, MapPin, Activity, Plus, X, FolderHeart, Pill
} from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { useSubmitAction } from "@/hooks/useSubmitAction";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { PageTransition } from "@/components/PageTransition";
import { DetailSkeleton } from "@/components/loading/DetailSkeleton";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { medicosRepository } from "@/lib/repositories/medicos";
import { SelectionModal } from "@/components/SelectionModal";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useHospitais } from "@/hooks/useHospitais";
import { useLocais } from "@/hooks/useLocais";
import { useTratamentos } from "@/hooks/useTratamentos";
import type { Medico, Consulta, Exame, Cirurgia, Hospital, LocalSaude, Tratamento, Medicamento } from "@/lib/types";

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
  
  // Estados Básicos
  const [nome, setNome] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [crm, setCrm] = useState("");
  const [observacoes, setObservacoes] = useState("");
  
  // Estados de Relacionamento M:N (Direto)
  const [hospitalIds, setHospitalIds] = useState<string[]>([]);
  const [localIds, setLocalIds] = useState<string[]>([]);
  const [tratamentoIds, setTratamentoIds] = useState<string[]>([]);

  // Controle de Modais
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isHospitalModalOpen, setIsHospitalModalOpen] = useState(false);
  const [isLocalModalOpen, setIsLocalModalOpen] = useState(false);
  const [isTratamentoModalOpen, setIsTratamentoModalOpen] = useState(false);
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Puxar opções para vínculo (Diretos)
  const { hospitais = [] } = useHospitais();
  const { locais = [] } = useLocais();
  const { tratamentos = [] } = useTratamentos();

  // Históricos (Indiretos)
  const consultas = useLiveQuery(() => db.consultas.toArray(), [], []) || [];
  const exames = useLiveQuery(() => db.exames.toArray(), [], []) || [];
  const cirurgias = useLiveQuery(() => db.cirurgias.toArray(), [], []) || [];
  const medicamentos = useLiveQuery(() => db.medicamentos.toArray(), [], []) || [];

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
        
        // Carrega vínculos
        setHospitalIds(item.hospital_ids || []);
        setLocalIds(item.local_ids || []);
        setTratamentoIds(item.tratamento_ids || []);
      }
    }).finally(() => {
      setIsLoading(false);
    });
  }, [id]);

  // Vínculos Atuais (M:N)
  const hospitaisVinculados = useMemo(() => hospitais.filter(h => hospitalIds.includes(h.id!)), [hospitais, hospitalIds]);
  const locaisVinculados = useMemo(() => locais.filter(l => localIds.includes(l.id!)), [locais, localIds]);
  const tratamentosVinculados = useMemo(() => tratamentos.filter(t => tratamentoIds.includes(t.id!)), [tratamentos, tratamentoIds]);

  // Históricos (Eventos Indiretos puxados automaticamente)
  const consultasVinculadas = useMemo(() => {
    if (!id) return [];
    return consultas.filter((c: Consulta) => c.medico_id === id).sort((a,b) => b.data.localeCompare(a.data));
  }, [consultas, id]);

  const examesVinculados = useMemo(() => {
    if (!id) return [];
    return exames.filter((e: Exame) => e.medico_id === id).sort((a,b) => b.data.localeCompare(a.data));
  }, [exames, id]);

  const cirurgiasVinculadas = useMemo(() => {
    if (!id) return [];
    return cirurgias.filter((cir: Cirurgia) => cir.medico_id === id).sort((a,b) => b.data.localeCompare(a.data));
  }, [cirurgias, id]);

  const medicamentosVinculados = useMemo(() => {
    if (!id) return [];
    return medicamentos.filter((m: Medicamento) => m.medico_id === id);
  }, [medicamentos, id]);

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
          await medicosRepository.update(id, {
            nome: nome.trim(),
            especialidade: especialidade.trim() || undefined,
            telefone: telefone.trim() || undefined,
            email: email.trim() || undefined,
            crm: crm.trim() || undefined,
            observacoes: observacoes.trim() || undefined,
            hospital_ids: hospitalIds,
            local_ids: localIds,
            tratamento_ids: tratamentoIds,
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
      { successMessage: "Médico excluído", errorMessage: "Erro ao excluir médico" }
    );
    setShowDeleteModal(false);
  };

  // Handlers para adicionar/remover (Vínculos Diretos)
  const handleAddHospital = (h: Hospital) => { if (h.id && !hospitalIds.includes(h.id)) setHospitalIds(p => [...p, h.id!]); };
  const handleRemoveHospital = (id: string) => { trigger("vibrate"); setHospitalIds(p => p.filter(i => i !== id)); };

  const handleAddLocal = (l: LocalSaude) => { if (l.id && !localIds.includes(l.id)) setLocalIds(p => [...p, l.id!]); };
  const handleRemoveLocal = (id: string) => { trigger("vibrate"); setLocalIds(p => p.filter(i => i !== id)); };

  const handleAddTratamento = (t: Tratamento) => { if (t.id && !tratamentoIds.includes(t.id)) setTratamentoIds(p => [...p, t.id!]); };
  const handleRemoveTratamento = (id: string) => { trigger("vibrate"); setTratamentoIds(p => p.filter(i => i !== id)); };

  if (isLoading) return <DetailSkeleton />;
  if (notFound) return <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-void px-6 text-center"><p className="font-display text-lg font-semibold text-ink-primary">Médico não encontrado</p><button onClick={() => router.back()} className="mt-4 rounded-full bg-ice px-5 py-2.5 text-sm font-semibold text-void">Voltar</button></main>;

  return (
    <PageTransition>
      <main className="min-h-[100dvh] bg-void pb-[calc(10rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button onClick={() => { trigger("vibrate"); router.back(); }} className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95" type="button" aria-label="Voltar">
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-xl font-semibold text-ink-primary truncate">{nome || "Editar médico"}</h1>
            </div>
            <button onClick={() => { trigger("vibrate"); setShowDeleteModal(true); }} className="flex h-11 w-11 items-center justify-center rounded-full border border-coral/20 bg-coral/10 text-coral transition-all active:scale-95" type="button" aria-label="Excluir médico">
              <Trash2 size={16} />
            </button>
          </div>
        </header>

        <section className="space-y-5 px-5 pt-6">
          
          {/* DADOS BÁSICOS */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="space-y-3 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted px-1">Dados do Profissional</h2>
            <Input label="Nome *" placeholder="Ex: Dr. Carlos Silva" value={nome} onChange={(e) => setNome(e.target.value)} error={errors.nome} required />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Especialidade" placeholder="Ex: Cardiologista" value={especialidade} onChange={(e) => setEspecialidade(e.target.value)} />
              <Input label="CRM" placeholder="Ex: 123456/SP" value={crm} onChange={(e) => setCrm(e.target.value)} />
            </div>
            <Input label="Telefone" placeholder="(00) 00000-0000" value={telefone} onChange={(e) => setTelefone(formatPhone(e.target.value))} />
            <Input label="E-mail" placeholder="medico@email.com" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
            <TextArea label="Observações" placeholder="Dias de atendimento, recados..." value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </motion.div>

          {/* VÍNCULOS DE ATENDIMENTO (Hospitais e Locais) */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            
            {/* Hospitais */}
            <div>
              <div className="flex items-center justify-between px-1 mb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                  <Building2 size={14} className="text-ice" /> Hospitais / Clínicas
                </h2>
                <button onClick={() => { trigger("vibrate"); setIsHospitalModalOpen(true); }} className="flex items-center gap-1 text-[10px] font-bold text-ice bg-ice/10 px-2.5 py-1 rounded-full active:scale-95 transition-all" type="button" aria-label="Adicionar hospital">
                  <Plus size={12} /> Adicionar
                </button>
              </div>
              {hospitaisVinculados.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-surface-border/60 bg-surface-raised/40 p-3 text-center"><p className="text-xs text-ink-muted">Nenhum hospital vinculado.</p></div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {hospitaisVinculados.map((h) => (
                    <div key={h.id} className="flex items-center gap-2 bg-surface-raised border border-surface-border/50 rounded-full pl-3 pr-1 py-1">
                      <span className="text-xs font-semibold text-ink-primary truncate max-w-[150px]">{h.nome}</span>
                      <button onClick={() => handleRemoveHospital(h.id!)} className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-border/50 text-ink-muted hover:bg-coral/20 hover:text-coral transition-colors" type="button" aria-label={`Remover ${h.nome}`}><X size={12} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Postos de Saúde */}
            <div>
              <div className="flex items-center justify-between px-1 mb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                  <MapPin size={14} className="text-emerald-400" /> Postos de Saúde / Locais
                </h2>
                <button onClick={() => { trigger("vibrate"); setIsLocalModalOpen(true); }} className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full active:scale-95 transition-all" type="button" aria-label="Adicionar local">
                  <Plus size={12} /> Adicionar
                </button>
              </div>
              {locaisVinculados.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-surface-border/60 bg-surface-raised/40 p-3 text-center"><p className="text-xs text-ink-muted">Nenhum local vinculado.</p></div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {locaisVinculados.map((l) => (
                    <div key={l.id} className="flex items-center gap-2 bg-surface-raised border border-surface-border/50 rounded-full pl-3 pr-1 py-1">
                      <span className="text-xs font-semibold text-ink-primary truncate max-w-[150px]">{l.nome}</span>
                      <button onClick={() => handleRemoveLocal(l.id!)} className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-border/50 text-ink-muted hover:bg-coral/20 hover:text-coral transition-colors" type="button" aria-label={`Remover ${l.nome}`}><X size={12} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* VÍNCULO DE TRATAMENTOS */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="space-y-3 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                <Activity size={14} className="text-violet-400" /> Tratamentos Associados
              </h2>
              <button onClick={() => { trigger("vibrate"); setIsTratamentoModalOpen(true); }} className="flex items-center gap-1 text-[10px] font-bold text-violet-400 bg-violet-400/10 px-2.5 py-1 rounded-full active:scale-95 transition-all" type="button" aria-label="Adicionar tratamento">
                <Plus size={12} /> Adicionar
              </button>
            </div>
            {tratamentosVinculados.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-surface-border/60 bg-surface-raised/40 p-4 text-center"><p className="text-xs text-ink-muted">Nenhum tratamento vinculado.</p></div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tratamentosVinculados.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 bg-surface-raised border border-surface-border/50 rounded-full pl-3 pr-1 py-1" style={{ borderLeft: `3px solid ${t.cor || '#8B5CF6'}` }}>
                    <span className="text-xs font-semibold text-ink-primary truncate max-w-[150px]">{t.nome}</span>
                    <button onClick={() => handleRemoveTratamento(t.id!)} className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-border/50 text-ink-muted hover:bg-coral/20 hover:text-coral transition-colors" type="button" aria-label={`Remover ${t.nome}`}><X size={12} /></button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* EVENTOS HISTÓRICOS E PRESCRIÇÕES */}
          {(consultasVinculadas.length > 0 || cirurgiasVinculadas.length > 0 || examesVinculados.length > 0 || medicamentosVinculados.length > 0) && (
            <motion.div variants={fadeUp} initial="initial" animate="animate" className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5 px-1">
                <FolderHeart size={14} className="text-coral" /> Histórico Clínico do Médico
              </h2>
              
              {/* Seção de Medicamentos Receitados */}
              {medicamentosVinculados.length > 0 && (
                <div>
                  <h3 className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-2 flex items-center gap-1"><Pill size={12} className="text-emerald-400" /> Prescrições do Médico</h3>
                  <div className="space-y-2">
                    {medicamentosVinculados.slice(0, 3).map(m => (
                      <div key={m.id} onClick={() => router.push(`/saude/medicamentos/detalhes?id=${m.id}`)} className="flex items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised/60 p-3 cursor-pointer" role="button" tabIndex={0}>
                        <div className="min-w-0">
                          <p className={`text-xs font-semibold truncate ${m.status === 'ativo' ? 'text-ink-primary' : 'text-ink-muted line-through'}`}>{m.nome}</p>
                          <p className="text-[10px] text-ink-muted">{m.dosagem}</p>
                        </div>
                        <ExternalLink size={14} className="text-ink-faint" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Seção de Consultas e Cirurgias */}
              {(consultasVinculadas.length > 0 || cirurgiasVinculadas.length > 0 || examesVinculados.length > 0) && (
                <div>
                  <h3 className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-2 mt-3 flex items-center gap-1"><Calendar size={12} className="text-ice" /> Consultas e Procedimentos</h3>
                  <div className="space-y-2.5">
                    {consultasVinculadas.slice(0, 2).map((c) => (
                      <div key={c.id} onClick={() => router.push(`/saude/consultas/detalhes?id=${c.id}`)} className="flex items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised/60 p-3 cursor-pointer" role="button" tabIndex={0}>
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-ice/10 text-ice"><Calendar size={14} /></div>
                          <div><p className="text-xs font-semibold text-ink-primary truncate">Consulta: {c.especialidade}</p><p className="text-[10px] text-ink-muted">{formatDateDisplay(c.data)}</p></div>
                        </div>
                        <ExternalLink size={14} className="text-ink-faint" />
                      </div>
                    ))}

                    {cirurgiasVinculadas.slice(0, 2).map((c) => (
                      <div key={c.id} onClick={() => router.push(`/saude/cirurgias/detalhes?id=${c.id}`)} className="flex items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised/60 p-3 cursor-pointer" role="button" tabIndex={0}>
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-coral/10 text-coral"><Activity size={14} /></div>
                          <div><p className="text-xs font-semibold text-ink-primary truncate">Cirurgia: {c.procedimento}</p><p className="text-[10px] text-ink-muted">{formatDateDisplay(c.data)}</p></div>
                        </div>
                        <ExternalLink size={14} className="text-ink-faint" />
                      </div>
                    ))}

                    {examesVinculados.slice(0, 2).map((e) => (
                      <div key={e.id} onClick={() => router.push(`/saude/exames/detalhes?id=${e.id}`)} className="flex items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised/60 p-3 cursor-pointer" role="button" tabIndex={0}>
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400"><FlaskConical size={14} /></div>
                          <div><p className="text-xs font-semibold text-ink-primary truncate">Exame: {e.nome}</p><p className="text-[10px] text-ink-muted">{formatDateDisplay(e.data)}</p></div>
                        </div>
                        <ExternalLink size={14} className="text-ink-faint" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

        </section>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <Button variant="primary" size="lg" fullWidth onClick={handleSubmit} disabled={saveAction.isSubmitting} className="flex items-center justify-center gap-2 shadow-lg shadow-ice/10">
            {saveAction.isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Salvando...</> : <><Save size={16} /> Salvar alterações</>}
          </Button>
        </div>

        <ConfirmationModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={handleDelete} title="Excluir médico" message={`Tem certeza que deseja excluir "${nome}"?`} isLoading={deleteAction.isSubmitting} type="danger" />

        {/* MODAIS DE SELEÇÃO M:N COM OPÇÃO DE CADASTRAR NOVO */}
        <SelectionModal<Hospital>
          isOpen={isHospitalModalOpen}
          onClose={() => setIsHospitalModalOpen(false)}
          onSelect={handleAddHospital}
          items={hospitais.filter(h => !hospitalIds.includes(h.id!))}
          title="Selecionar Hospital"
          placeholder="Buscar hospital/clínica..."
          getItemId={(item) => item.id!}
          getItemLabel={(item) => item.nome}
          renderItem={(item) => (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ice/10 text-ice"><Building2 size={16} /></div>
              <div><p className="text-sm font-semibold text-ink-primary">{item.nome}</p></div>
            </div>
          )}
          onCreateNew={() => { setIsHospitalModalOpen(false); router.push("/saude/hospitais/novo"); }}
          createNewLabel="Cadastrar Novo Hospital"
        />

        <SelectionModal<LocalSaude>
          isOpen={isLocalModalOpen}
          onClose={() => setIsLocalModalOpen(false)}
          onSelect={handleAddLocal}
          items={locais.filter(l => !localIds.includes(l.id!))}
          title="Selecionar Posto"
          placeholder="Buscar posto de saúde..."
          getItemId={(item) => item.id!}
          getItemLabel={(item) => item.nome}
          renderItem={(item) => (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-400"><MapPin size={16} /></div>
              <div><p className="text-sm font-semibold text-ink-primary">{item.nome}</p></div>
            </div>
          )}
          onCreateNew={() => { setIsLocalModalOpen(false); router.push("/saude/locais/novo"); }}
          createNewLabel="Cadastrar Novo Posto"
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
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-400/10 text-violet-400"><FolderHeart size={16} /></div>
              <div><p className="text-sm font-semibold text-ink-primary">{item.nome}</p></div>
            </div>
          )}
          onCreateNew={() => { setIsTratamentoModalOpen(false); router.push("/saude/tratamentos/novo"); }}
          createNewLabel="Cadastrar Novo Tratamento"
        />

      </main>
    </PageTransition>
  );
}

export default function EditarMedicoPage() {
  return <Suspense fallback={<DetailSkeleton />}><EditarMedicoContent /></Suspense>;
}