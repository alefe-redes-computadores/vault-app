// app/saude/hospitais/editar/page.tsx
"use client";

/**
 * IMPORTAÇÕES DE BIBLIOTECAS E COMPONENTES
 * Mantendo todas as dependências explícitas para garantir a integridade do arquivo.
 */
import { useState, useEffect, useMemo, useRef, Suspense } from "react";
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
  Plus,
  X,
  Eraser,
  MapPin,
  Info
} from "lucide-react";

// Hooks
import { useHapticFeedback } from "@/lib/haptics";
import { useSubmitAction } from "@/hooks/useSubmitAction";
import { useLiveQuery } from "dexie-react-hooks";
import { useAuth } from "@/hooks/useAuth";

// UI Components
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { PageTransition } from "@/components/PageTransition";
import { DetailSkeleton } from "@/components/loading/DetailSkeleton";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { SelectionModal } from "@/components/SelectionModal";

// Database & Repository
import { hospitaisRepository } from "@/lib/repositories/hospitais";
import { db } from "@/lib/db";
import type { Hospital, Cirurgia, Exame, Consulta, Medico, Tratamento } from "@/lib/types";

/**
 * CONFIGURAÇÕES E ESTILOS
 */
const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

const TIPOS_HOSPITAL = [
  { id: "hospital", label: "Hospital" },
  { id: "clinica", label: "Clínica" },
  { id: "laboratorio", label: "Laboratório" },
  { id: "outro", label: "Outro" },
];

/**
 * FUNÇÕES UTILITÁRIAS DE FORMATAÇÃO
 */
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

/**
 * COMPONENTE EDITAR HOSPITAL CONTENT
 */
function EditarHospitalContent() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "";
  const { user } = useAuth();

  const saveAction = useSubmitAction();
  const deleteAction = useSubmitAction();
  const isSubmitLocked = useRef(false);

  // Estados de controle de loading e erro
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  
  // Estados dos campos do formulário
  const [nome, setNome] = useState("");
  const [endereco, setEndereco] = useState("");
  const [telefone, setTelefone] = useState("");
  const [tipo, setTipo] = useState("hospital");
  const [observacoes, setObservacoes] = useState("");

  // Estados dos vínculos relacionais (M:N)
  const [medicoIds, setMedicoIds] = useState<string[]>([]);
  const [tratamentoIds, setTratamentoIds] = useState<string[]>([]);

  // Estados das modais e UI
  const [isMedModalOpen, setIsMedModalOpen] = useState(false);
  const [isTratModalOpen, setIsTratModalOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Querys de dados reais do banco (Dexie)
  const medicos = useLiveQuery(() => db.medicos.toArray(), [], []) || [];
  const tratamentos = useLiveQuery(() => db.tratamentos.toArray(), [], []) || [];
  const cirurgias = useLiveQuery(() => db.cirurgias.toArray(), [], []) || [];
  const exames = useLiveQuery(() => db.exames.toArray(), [], []) || [];
  const consultas = useLiveQuery(() => db.consultas.toArray(), [], []) || [];

  /**
   * EFEITO DE CARREGAMENTO INICIAL
   */
  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }

    hospitaisRepository.getById(id).then((item) => {
      if (!item) {
        setNotFound(true);
      } else {
        setNome(item.nome || "");
        setEndereco(item.endereco || "");
        setTelefone(item.telefone || "");
        setTipo(item.tipo || "hospital");
        setObservacoes(item.observacoes || "");
        setMedicoIds(item.medico_ids || []);
        setTratamentoIds(item.tratamento_ids || []);
      }
    }).finally(() => {
      setIsLoading(false);
    });
  }, [id]);

  /**
   * MEMOIZAÇÃO DE CRUZAMENTOS E HISTÓRICOS
   */
  const medicosVinculados = useMemo(() => medicos.filter(m => medicoIds.includes(m.id!)), [medicos, medicoIds]);
  const tratamentosVinculados = useMemo(() => tratamentos.filter(t => tratamentoIds.includes(t.id!)), [tratamentos, tratamentoIds]);

  const cirurgiasVinculadas = useMemo(() => {
    if (!id) return [];
    return cirurgias.filter((c: Cirurgia) => c.hospital_id === id).sort((a,b) => b.data.localeCompare(a.data));
  }, [cirurgias, id]);

  const examesVinculados = useMemo(() => {
    if (!id) return [];
    return exames.filter((e: Exame) => e.local_id === id).sort((a,b) => b.data.localeCompare(a.data));
  }, [exames, id]);

  const consultasVinculadas = useMemo(() => {
    if (!id) return [];
    return consultas.filter((c: Consulta) => c.hospital_id === id).sort((a,b) => b.data.localeCompare(a.data));
  }, [consultas, id]);

  /**
   * HANDLERS DE RELACIONAMENTO (VÍNCULO ATIVO)
   */
  const handleAddMedico = (m: Medico) => { 
    if (m.id && !medicoIds.includes(m.id)) {
      setMedicoIds(p => [...p, m.id!]); 
    }
  };

  const handleRemoveMedico = (medicoId: string) => { 
    trigger("vibrate"); 
    setMedicoIds(p => p.filter(i => i !== medicoId)); 
  };

  const handleAddTratamento = (t: Tratamento) => { 
    if (t.id && !tratamentoIds.includes(t.id)) {
      setTratamentoIds(p => [...p, t.id!]); 
    }
  };

  const handleRemoveTratamento = (tratamentoId: string) => { 
    trigger("vibrate"); 
    setTratamentoIds(p => p.filter(i => i !== tratamentoId)); 
  };

  /**
   * HANDLERS DE AÇÃO DE FORMULÁRIO
   */
  const handleSubmit = async () => {
    trigger("vibrate");
    
    // Validação estrita dos campos
    if (!nome.trim()) {
      setErrors({ nome: "Nome é obrigatório" });
      trigger("error");
      return;
    }

    if (isSubmitLocked.current || saveAction.isSubmitting) return;
    isSubmitLocked.current = true;

    await saveAction.run(
      async () => {
        try {
          await hospitaisRepository.update(id, {
            nome: nome.trim(),
            endereco: endereco.trim() || undefined,
            telefone: telefone.trim() || undefined,
            tipo: tipo || undefined,
            observacoes: observacoes.trim() || undefined,
            medico_ids: medicoIds,
            tratamento_ids: tratamentoIds,
          });
        } catch (error) {
          console.error("Erro na persistência de hospital:", error);
          throw error;
        } finally {
          isSubmitLocked.current = false;
        }
      },
      { successMessage: "Hospital atualizado com sucesso", errorMessage: "Erro ao atualizar hospital", goBackOnSuccess: true }
    );
  };

  const handleDelete = () => {
    deleteAction.run(
      async () => {
        await hospitaisRepository.delete(id);
        router.replace("/saude/hospitais");
      },
      { successMessage: "Hospital excluído com sucesso", errorMessage: "Erro ao excluir hospital" }
    );
  };

  /**
   * RENDERIZAÇÃO INICIAL E ESTADOS DE ERRO
   */
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
        {/* HEADER */}
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { trigger("vibrate"); router.back(); }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
              aria-label="Voltar"
              type="button"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-ice" />
              </div>
              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary truncate">{nome || "Editar hospital"}</h1>
            </div>
            <button
              onClick={() => { trigger("vibrate"); setShowDeleteModal(true); }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-coral/20 bg-coral/10 text-coral transition-all active:scale-95"
              aria-label="Excluir hospital"
              type="button"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </header>

        {/* SECTION FORMULÁRIO E CRUZAMENTOS */}
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
            
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-primary">Tipo</label>
              <div className="flex flex-wrap gap-2">
                {TIPOS_HOSPITAL.map((tipoOption) => (
                  <button
                    key={tipoOption.id}
                    onClick={() => { trigger("vibrate"); setTipo(tipoOption.id); }}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all active:scale-95 ${
                      tipo === tipoOption.id
                        ? "border-emerald-400 bg-emerald-400/10 text-emerald-400"
                        : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                    }`}
                    type="button"
                    aria-pressed={tipo === tipoOption.id}
                  >
                    {tipoOption.label}
                  </button>
                ))}
              </div>
            </div>

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
            <TextArea
              label="Observações"
              placeholder="Horário de visita, contatos úteis..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </motion.div>

          {/* REDE RELACIONAL DIRETA (M:N) */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.05 }} className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            
            {/* Vínculo de Médicos */}
            <div>
              <div className="flex items-center justify-between px-1 mb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                  <Stethoscope size={14} className="text-ice" /> Corpo Clínico ({medicoIds.length})
                </h2>
                <div className="flex items-center gap-2">
                  {medicoIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => { trigger("vibrate"); setMedicoIds([]); }}
                      className="flex items-center gap-1 text-[10px] font-bold text-coral bg-coral/10 px-2 py-0.5 rounded-md uppercase"
                    >
                      <Eraser size={12} /> Limpar
                    </button>
                  )}
                  <button onClick={() => { trigger("vibrate"); setIsMedModalOpen(true); }} className="flex items-center gap-1 text-[10px] font-bold text-ice bg-ice/10 px-2.5 py-1 rounded-full active:scale-95 transition-all" type="button">
                    <Plus size={12} /> Adicionar
                  </button>
                </div>
              </div>
              {medicosVinculados.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-surface-border/60 bg-surface-raised/40 p-3 text-center">
                  <p className="text-xs text-ink-muted">Nenhum médico vinculado.</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {medicosVinculados.map((m) => (
                    <div key={m.id} className="flex items-center gap-2 bg-surface-raised border border-surface-border/50 rounded-full pl-3 pr-1 py-1">
                      <span className="text-xs font-semibold text-ink-primary truncate max-w-[150px]">Dr(a). {m.nome.split(' ')[0]}</span>
                      <button onClick={() => handleRemoveMedico(m.id!)} className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-border/50 text-ink-muted hover:bg-coral/20 hover:text-coral transition-colors" type="button" aria-label={`Remover ${m.nome}`}>
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Vínculo de Tratamentos */}
            <div>
              <div className="flex items-center justify-between px-1 mb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                  <FolderHeart size={14} className="text-violet-400" /> Polo de Tratamentos ({tratamentoIds.length})
                </h2>
                <div className="flex items-center gap-2">
                  {tratamentoIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => { trigger("vibrate"); setTratamentoIds([]); }}
                      className="flex items-center gap-1 text-[10px] font-bold text-coral bg-coral/10 px-2 py-0.5 rounded-md uppercase"
                    >
                      <Eraser size={12} /> Limpar
                    </button>
                  )}
                  <button onClick={() => { trigger("vibrate"); setIsTratModalOpen(true); }} className="flex items-center gap-1 text-[10px] font-bold text-violet-400 bg-violet-400/10 px-2.5 py-1 rounded-full active:scale-95 transition-all" type="button">
                    <Plus size={12} /> Adicionar
                  </button>
                </div>
              </div>
              {tratamentosVinculados.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-surface-border/60 bg-surface-raised/40 p-3 text-center">
                  <p className="text-xs text-ink-muted">Nenhum tratamento vinculado.</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tratamentosVinculados.map((t) => (
                    <div key={t.id} className="flex items-center gap-2 bg-surface-raised border border-surface-border/50 rounded-full pl-3 pr-1 py-1" style={{ borderLeft: `3px solid ${t.cor || '#8B5CF6'}` }}>
                      <span className="text-xs font-semibold text-ink-primary truncate max-w-[150px]">{t.nome}</span>
                      <button onClick={() => handleRemoveTratamento(t.id!)} className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-border/50 text-ink-muted hover:bg-coral/20 hover:text-coral transition-colors" type="button" aria-label={`Remover ${t.nome}`}>
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* HISTÓRICO CLÍNICO (INDIRETO) */}
          {(consultasVinculadas.length > 0 || cirurgiasVinculadas.length > 0 || examesVinculados.length > 0) && (
            <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.1 }} className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5 px-1">
                <Activity size={14} className="text-coral" /> Histórico na Unidade
              </h2>
              
              <div className="space-y-2.5">
                {consultasVinculadas.slice(0, 3).map((c) => (
                  <div key={c.id} onClick={() => router.push(`/saude/consultas/detalhes?id=${c.id}`)} className="flex items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised/60 p-3 cursor-pointer transition-all active:scale-[0.98]">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice"><Calendar size={14} /></div>
                      <div><p className="text-xs font-semibold text-ink-primary truncate">Consulta: {c.especialidade}</p><p className="text-[10px] text-ink-muted">{formatDateDisplay(c.data)}</p></div>
                    </div>
                    <ExternalLink size={14} className="text-ink-faint" />
                  </div>
                ))}
                
                {cirurgiasVinculadas.slice(0, 3).map((c) => (
                  <div key={c.id} onClick={() => router.push(`/saude/cirurgias/detalhes?id=${c.id}`)} className="flex items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised/60 p-3 cursor-pointer transition-all active:scale-[0.98]">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-coral/10 text-coral"><Activity size={14} /></div>
                      <div><p className="text-xs font-semibold text-ink-primary truncate">Cirurgia: {c.procedimento}</p><p className="text-[10px] text-ink-muted">{formatDateDisplay(c.data)}</p></div>
                    </div>
                    <ExternalLink size={14} className="text-ink-faint" />
                  </div>
                ))}

                {examesVinculados.slice(0, 3).map((e) => (
                  <div key={e.id} onClick={() => router.push(`/saude/exames/detalhes?id=${e.id}`)} className="flex items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised/60 p-3 cursor-pointer transition-all active:scale-[0.98]">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400"><FlaskConical size={14} /></div>
                      <div><p className="text-xs font-semibold text-ink-primary truncate">Exame: {e.nome}</p><p className="text-[10px] text-ink-muted">{formatDateDisplay(e.data)}</p></div>
                    </div>
                    <ExternalLink size={14} className="text-ink-faint" />
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </section>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <Button variant="primary" size="lg" fullWidth onClick={handleSubmit} disabled={saveAction.isSubmitting} className="flex items-center justify-center gap-2 shadow-lg shadow-ice/10">
            {saveAction.isSubmitting ? (
              <><Loader2 size={16} className="animate-spin" /> Salvando...</>
            ) : (
              <><Save size={16} /> Salvar alterações</>
            )}
          </Button>
        </div>

        {/* MODAIS DE SELEÇÃO M:N */}
        <SelectionModal<Medico>
          isOpen={isMedModalOpen}
          onClose={() => setIsMedModalOpen(false)}
          onSelect={handleAddMedico}
          items={medicos.filter(m => !medicoIds.includes(m.id!))}
          title="Vincular Médico"
          placeholder="Buscar médico..."
          getItemId={i => i.id!}
          getItemLabel={i => i.nome}
          renderItem={(item) => (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ice/10 text-ice"><Stethoscope size={16} /></div>
              <div><p className="text-sm font-semibold text-ink-primary">Dr(a). {item.nome}</p></div>
            </div>
          )}
          onCreateNew={() => { setIsMedModalOpen(false); router.push("/saude/medicos/novo"); }}
          createNewLabel="Cadastrar Novo Médico"
        />

        <SelectionModal<Tratamento>
          isOpen={isTratModalOpen}
          onClose={() => setIsTratModalOpen(false)}
          onSelect={handleAddTratamento}
          items={tratamentos.filter(t => !tratamentoIds.includes(t.id!))}
          title="Vincular Tratamento"
          placeholder="Buscar tratamento..."
          getItemId={i => i.id!}
          getItemLabel={i => i.nome}
          renderItem={(item) => (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-400/10 text-violet-400"><FolderHeart size={16} /></div>
              <div><p className="text-sm font-semibold text-ink-primary">{item.nome}</p></div>
            </div>
          )}
          onCreateNew={() => { setIsTratModalOpen(false); router.push("/saude/tratamentos/novo"); }}
          createNewLabel="Cadastrar Novo Tratamento"
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