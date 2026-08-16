"use client";

import { useState, useEffect, Suspense } from "react";
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
  AlertCircle,
  User,
  Activity,
  Brain,
  Flame,
  HeartPulse,
  ShieldAlert,
  Copy,
  CalendarClock,
  AlertTriangle,
  ChevronRight,
  History,
  Pill
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { useExames } from "@/hooks/useExames";
import { useToast } from "@/components/ToastProvider";
import { SelectionModal } from "@/components/SelectionModal";
import { safeAddMedico, safeAddHospital } from "@/lib/db";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";

function getTratamentoIcon(nome: string) {
  const n = nome.toLowerCase();
  if (n.includes("tdah")) return Brain;
  if (n.includes("dor") || n.includes("neuropática")) return Flame;
  if (n.includes("depress")) return HeartPulse;
  if (n.includes("ansied") || n.includes("ansiolítico")) return ShieldAlert;
  return Activity;
}

function formatDate(isoStr?: string) {
  if (!isoStr) return "—";
  try { return new Date(isoStr).toLocaleDateString("pt-BR"); }
  catch { return isoStr; }
}

function DetalhesExameContent() {
  const { trigger } = useHapticFeedback();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { user } = useAuth();

  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [exame, setExame] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modais para correção de médico e laboratório
  const [isMedicoModalOpen, setIsMedicoModalOpen] = useState(false);
  const [isLaboratorioModalOpen, setIsLaboratorioModalOpen] = useState(false);
  const [isCreatingMedico, setIsCreatingMedico] = useState(false);
  const [newMedicoNome, setNewMedicoNome] = useState("");
  const [newMedicoEspecialidade, setNewMedicoEspecialidade] = useState("");
  const [isCreatingLaboratorio, setIsCreatingLaboratorio] = useState(false);
  const [newLaboratorioNome, setNewLaboratorioNome] = useState("");

  const { getExame, deleteExame, updateExame } = useExames();

  // Consultas principais
  const medicos = useLiveQuery(() => db.medicos.toArray(), []) || [];
  const hospitais = useLiveQuery(() => db.hospitais.toArray(), []) || [];
  const persons = useLiveQuery(() => db.persons.toArray(), []) || [];

  useEffect(() => {
    if (!id) {
      router.push("/saude/exames");
      return;
    }
    const loadExame = async () => {
      const data = await getExame(id);
      if (data) {
        setExame(data);
      } else {
        router.push("/saude/exames");
      }
      setIsLoading(false);
    };
    loadExame();
  }, [id, router, getExame]);

  // Dados relacionados
  const person = useLiveQuery(() => exame?.person_id ? db.persons.get(exame.person_id) : undefined, [exame?.person_id]);
  const medico = useLiveQuery(() => exame?.medico_id ? db.medicos.get(exame.medico_id) : undefined, [exame?.medico_id]);
  const laboratorio = useLiveQuery(() => exame?.laboratorio_id ? db.hospitais.get(exame.laboratorio_id) : undefined, [exame?.laboratorio_id]);

  const tratamentos = useLiveQuery(() => {
    if (!exame?.tratamento_ids || exame.tratamento_ids.length === 0) return [];
    return db.tratamentos.where('id').anyOf(exame.tratamento_ids).toArray();
  }, [exame?.tratamento_ids]);

  // Histórico do mesmo exame para a mesma pessoa
  const historicoExames = useLiveQuery(() => {
    if (!exame) return [];
    return db.exames
      .where('nome')
      .equals(exame.nome)
      .filter(item => item.id !== id && item.person_id === exame.person_id)
      .toArray();
  }, [exame, id]) || [];

  if (isLoading) return <LoadingSkeleton />;
  if (!exame) return null;

  const medicoEncontrado = medico !== undefined;
  const laboratorioEncontrado = laboratorio !== undefined;

  // Verifica se o médico tem dados mínimos (nome) para ser considerado válido
  const medicoValido = medicoEncontrado && medico?.nome;
  const laboratorioValido = laboratorioEncontrado && laboratorio?.nome;

  // Criação rápida de médico
  const handleCreateMedico = async () => {
    if (!newMedicoNome.trim()) {
      showToast("Nome do médico é obrigatório", "error");
      return;
    }
    trigger("vibrate");
    try {
      const newId = await safeAddMedico({
        user_id: user?.id || "",
        nome: newMedicoNome.trim(),
        especialidade: newMedicoEspecialidade.trim() || undefined,
      });
      await updateExame(exame.id, { medico_id: newId });
      showToast("Médico vinculado com sucesso!", "success");
      setIsCreatingMedico(false);
      setNewMedicoNome("");
      setNewMedicoEspecialidade("");
      // Recarregar exame
      const updated = await getExame(id);
      if (updated) setExame(updated);
    } catch (error) {
      console.error("Erro ao criar médico:", error);
      showToast("Erro ao criar médico", "error");
    }
  };

  const handleCreateLaboratorio = async () => {
    if (!newLaboratorioNome.trim()) {
      showToast("Nome do laboratório é obrigatório", "error");
      return;
    }
    trigger("vibrate");
    try {
      const newId = await safeAddHospital({
        user_id: user?.id || "",
        nome: newLaboratorioNome.trim(),
        tipo: "laboratorio",
      });
      await updateExame(exame.id, { laboratorio_id: newId });
      showToast("Laboratório vinculado com sucesso!", "success");
      setIsCreatingLaboratorio(false);
      setNewLaboratorioNome("");
      // Recarregar exame
      const updated = await getExame(id);
      if (updated) setExame(updated);
    } catch (error) {
      console.error("Erro ao criar laboratório:", error);
      showToast("Erro ao criar laboratório", "error");
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    trigger("vibrate");
    try {
      await deleteExame(id);
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

  const handleDuplicarExame = () => {
    trigger("vibrate");
    router.push(`/saude/exames/novo`);
  };

  // Calcular dias para apresentação
  let diasParaApresentacao = null;
  let isVencido = false;
  if (exame.data_retorno) {
    try {
      const dataRetornoObj = new Date(exame.data_retorno);
      const hoje = new Date();
      diasParaApresentacao = Math.ceil((dataRetornoObj.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
      isVencido = diasParaApresentacao < 0;
    } catch {}
  }

  const personName = person?.name || persons.find(p => p.id === exame.person_id)?.name || "Pessoa não encontrada";

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
                <p className="text-xs text-ink-muted mt-0.5">
                  <User size={12} className="inline mr-1" /> {personName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDuplicarExame}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-violet-400/20 bg-violet-400/10 text-violet-300 active:scale-95"
                title="Solicitar Novo / Duplicar"
              >
                <Copy size={16} />
              </button>
              <button
                onClick={() => { trigger("vibrate"); router.push(`/saude/exames/editar?id=${exame.id}`); }}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-ice/20 bg-ice/10 text-ice active:scale-95"
                title="Editar Exame"
              >
                <Edit3 size={16} />
              </button>
              <button
                onClick={() => { trigger("vibrate"); setShowDeleteModal(true); }}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-coral/20 bg-coral/10 text-coral active:scale-95"
                title="Excluir Exame"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </header>

        <section className="px-5 pt-6 space-y-4">
          
          {/* ALERTA DE PRAZO */}
          {exame.data_retorno && (
            <motion.div 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 shadow-sm ${
                isVencido 
                  ? 'border-coral/40 bg-coral/10 text-coral' 
                  : diasParaApresentacao !== null && diasParaApresentacao <= 3
                  ? 'border-amber-400/40 bg-amber-400/10 text-amber-300'
                  : 'border-surface-border/50 bg-surface text-ink-primary'
              }`}
            >
              {isVencido ? <AlertTriangle size={18} className="shrink-0 mt-0.5" /> : <CalendarClock size={18} className="shrink-0 mt-0.5" />}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider">
                  {isVencido ? "Prazo de Apresentação Vencido" : "Apresentação com Médico"}
                </p>
                <p className="text-xs mt-0.5 opacity-90">
                  {isVencido 
                    ? `A data limite era ${formatDate(exame.data_retorno)}. Verifique se precisa de uma nova solicitação.` 
                    : `Data limite agendada para ${formatDate(exame.data_retorno)}.`}
                </p>
              </div>
            </motion.div>
          )}

          {/* CARD PRINCIPAL */}
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
                <p className="text-xs text-ink-muted">Registrado em {formatDate(exame.data)}</p>
              </div>
            </div>

            {/* MÉDICO SOLICITANTE */}
            <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-raised/50 p-3 border border-surface-border/40">
              <div className="flex items-center gap-3 min-w-0">
                <Stethoscope size={16} className="text-ice shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-ink-faint">Solicitante</p>
                  {medicoValido ? (
                    <button
                      onClick={() => { trigger("vibrate"); router.push(`/saude/medicos/detalhes?id=${medico.id}`); }}
                      className="text-sm font-semibold text-ink-primary hover:text-ice transition-colors flex items-center gap-1 truncate"
                    >
                      {medico.nome}
                      <ChevronRight size={14} className="text-ink-faint" />
                    </button>
                  ) : exame.medico ? (
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-ink-muted line-through">{exame.medico}</p>
                      <span className="text-[10px] bg-amber-400/10 text-amber-400 border border-amber-400/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <AlertOctagon size={12} /> Cadastro perdido
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-ink-muted">Não informado</p>
                  )}
                </div>
              </div>
              {!medicoValido && exame.medico && (
                <button
                  onClick={() => { trigger("vibrate"); setIsMedicoModalOpen(true); }}
                  className="text-xs font-bold text-ice bg-ice/10 px-3 py-1.5 rounded-full hover:bg-ice/20 transition-colors"
                >
                  Corrigir
                </button>
              )}
            </div>

            {/* LABORATÓRIO / HOSPITAL */}
            <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-raised/50 p-3 border border-surface-border/40">
              <div className="flex items-center gap-3 min-w-0">
                <Building2 size={16} className="text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-ink-faint">Local / Laboratório</p>
                  {laboratorioValido ? (
                    <button
                      onClick={() => { trigger("vibrate"); router.push(`/saude/hospitais/detalhes?id=${laboratorio.id}`); }}
                      className="text-sm font-semibold text-ink-primary hover:text-ice transition-colors flex items-center gap-1 truncate"
                    >
                      {laboratorio.nome}
                      <ChevronRight size={14} className="text-ink-faint" />
                    </button>
                  ) : exame.laboratorio ? (
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-ink-muted line-through">{exame.laboratorio}</p>
                      <span className="text-[10px] bg-amber-400/10 text-amber-400 border border-amber-400/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <AlertOctagon size={12} /> Cadastro perdido
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-ink-muted">Não informado</p>
                  )}
                </div>
              </div>
              {!laboratorioValido && exame.laboratorio && (
                <button
                  onClick={() => { trigger("vibrate"); setIsLaboratorioModalOpen(true); }}
                  className="text-xs font-bold text-ice bg-ice/10 px-3 py-1.5 rounded-full hover:bg-ice/20 transition-colors"
                >
                  Corrigir
                </button>
              )}
            </div>

            {/* TRATAMENTOS VINCULADOS */}
            {tratamentos && tratamentos.length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-medium text-ink-muted mb-2 flex items-center gap-1.5">
                  <Activity size={14} className="text-violet-400" /> Motivo da Solicitação
                </p>
                <div className="flex flex-wrap gap-2">
                  {tratamentos.map(t => {
                    const Icon = getTratamentoIcon(t.nome);
                    return (
                      <button
                        key={t.id}
                        onClick={() => { trigger("vibrate"); router.push(`/saude/tratamentos/detalhes?id=${t.id}`); }}
                        className="flex items-center gap-1.5 rounded-full bg-violet-400/10 border border-violet-400/20 px-3 py-1.5 hover:bg-violet-400/20 transition-colors"
                      >
                        <Icon size={14} className="text-violet-400" />
                        <span className="text-xs font-medium text-violet-300">{t.nome}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* MOTIVO E OBSERVAÇÕES */}
            {exame.motivo && (
              <div className="pt-2">
                <p className="text-xs font-medium text-ink-muted mb-1">Motivo da Solicitação</p>
                <p className="text-xs text-ink-primary bg-surface-raised/50 p-3 rounded-xl border border-surface-border/40">{exame.motivo}</p>
              </div>
            )}

            {exame.observacoes && (
              <div className="pt-2">
                <p className="text-xs font-medium text-ink-muted mb-1">Resultados / Notas</p>
                <p className="text-xs text-ink-primary bg-surface-raised/50 p-3 rounded-xl border border-surface-border/40 whitespace-pre-wrap">{exame.observacoes}</p>
              </div>
            )}

            {exame.anexo_url && (
              <a 
                href={exame.anexo_url} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center justify-between rounded-2xl border border-ice/20 bg-ice/10 p-3.5 text-ice hover:bg-ice/20 transition-colors mt-2"
              >
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <FileText size={16} /> Ver Anexo / Documento do Exame
                </div>
                <ExternalLink size={14} />
              </a>
            )}
          </motion.div>

          {/* HISTÓRICO DO EXAME (MESMO NOME, MESMA PESSOA) */}
          {historicoExames.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm space-y-3"
            >
              <div className="flex items-center gap-2">
                <History size={15} className="text-emerald-400" />
                <h3 className="font-display text-sm font-semibold text-ink-primary">Histórico do Exame</h3>
                <span className="text-xs text-ink-muted">({historicoExames.length} anteriores)</span>
              </div>
              <p className="text-xs text-ink-muted">Outras vezes que "{exame.nome}" foi realizado para {personName}:</p>

              <div className="space-y-2 pt-1">
                {historicoExames.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()).map((item: any) => (
                  <button
                    key={item.id}
                    onClick={() => { trigger("vibrate"); router.push(`/saude/exames/detalhes?id=${item.id}`); }}
                    className="w-full flex items-center justify-between p-3 rounded-2xl bg-surface-raised/70 border border-surface-border/40 text-left hover:bg-surface-raised transition-colors"
                  >
                    <div>
                      <p className="text-xs font-semibold text-ink-primary">Realizado em {formatDate(item.data)}</p>
                      {item.laboratorio && <p className="text-[10px] text-ink-muted">{item.laboratorio}</p>}
                      {item.medico && <p className="text-[10px] text-ink-muted">Solicitante: {item.medico}</p>}
                    </div>
                    <span className="text-xs text-ice font-medium">Ver detalhes</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </section>

        {/* CONFIRMAÇÃO DE EXCLUSÃO */}
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

        {/* MODAL PARA CORRIGIR MÉDICO */}
        <SelectionModal
          isOpen={isMedicoModalOpen}
          onClose={() => setIsMedicoModalOpen(false)}
          onSelect={async (item: any) => {
            trigger("vibrate");
            try {
              await updateExame(exame.id, { medico_id: item.id });
              showToast("Médico atualizado com sucesso!", "success");
              const updated = await getExame(id);
              if (updated) setExame(updated);
              setIsMedicoModalOpen(false);
            } catch (error) {
              console.error("Erro ao atualizar médico:", error);
              showToast("Erro ao atualizar médico", "error");
            }
          }}
          items={medicos}
          title="Selecionar Médico"
          placeholder="Buscar médico..."
          renderItem={(item: any) => (
            <div>
              <p className="font-medium text-ink-primary">{item.nome}</p>
              {item.especialidade && <p className="text-xs text-ink-muted">{item.especialidade}</p>}
            </div>
          )}
          getItemId={(item: any) => item.id!}
          getItemLabel={(item: any) => item.nome}
          onCreateNew={() => { setIsMedicoModalOpen(false); setIsCreatingMedico(true); }}
          createNewLabel="Cadastrar Novo Médico"
        />

        {/* MODAL PARA CORRIGIR LABORATÓRIO */}
        <SelectionModal
          isOpen={isLaboratorioModalOpen}
          onClose={() => setIsLaboratorioModalOpen(false)}
          onSelect={async (item: any) => {
            trigger("vibrate");
            try {
              await updateExame(exame.id, { laboratorio_id: item.id });
              showToast("Laboratório atualizado com sucesso!", "success");
              const updated = await getExame(id);
              if (updated) setExame(updated);
              setIsLaboratorioModalOpen(false);
            } catch (error) {
              console.error("Erro ao atualizar laboratório:", error);
              showToast("Erro ao atualizar laboratório", "error");
            }
          }}
          items={hospitais.filter(h => h.tipo === 'laboratorio')}
          title="Selecionar Laboratório"
          placeholder="Buscar laboratório..."
          renderItem={(item: any) => (
            <div>
              <p className="font-medium text-ink-primary">{item.nome}</p>
              {item.endereco && <p className="text-xs text-ink-muted">{item.endereco}</p>}
            </div>
          )}
          getItemId={(item: any) => item.id!}
          getItemLabel={(item: any) => item.nome}
          onCreateNew={() => { setIsLaboratorioModalOpen(false); setIsCreatingLaboratorio(true); }}
          createNewLabel="Cadastrar Novo Laboratório"
        />

        {/* BOTTOM SHEET PARA CRIAR MÉDICO */}
        {isCreatingMedico && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4 backdrop-blur-md">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-md rounded-t-[32px] sm:rounded-[32px] bg-surface p-6 shadow-vault"
            >
              <h3 className="font-display text-lg font-bold text-ink-primary mb-4">Novo Médico</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Nome do médico"
                  value={newMedicoNome}
                  onChange={(e) => setNewMedicoNome(e.target.value)}
                  className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-ink-primary outline-none focus:border-ice"
                />
                <input
                  type="text"
                  placeholder="Especialidade (opcional)"
                  value={newMedicoEspecialidade}
                  onChange={(e) => setNewMedicoEspecialidade(e.target.value)}
                  className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-ink-primary outline-none focus:border-ice"
                />
                <div className="flex gap-3 pt-2">
                  <Button variant="secondary" fullWidth onClick={() => { setIsCreatingMedico(false); setNewMedicoNome(""); setNewMedicoEspecialidade(""); }}>
                    Cancelar
                  </Button>
                  <Button variant="primary" fullWidth onClick={handleCreateMedico}>
                    Salvar e Vincular
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* BOTTOM SHEET PARA CRIAR LABORATÓRIO */}
        {isCreatingLaboratorio && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4 backdrop-blur-md">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-md rounded-t-[32px] sm:rounded-[32px] bg-surface p-6 shadow-vault"
            >
              <h3 className="font-display text-lg font-bold text-ink-primary mb-4">Novo Laboratório</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Nome do laboratório"
                  value={newLaboratorioNome}
                  onChange={(e) => setNewLaboratorioNome(e.target.value)}
                  className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-ink-primary outline-none focus:border-ice"
                />
                <div className="flex gap-3 pt-2">
                  <Button variant="secondary" fullWidth onClick={() => { setIsCreatingLaboratorio(false); setNewLaboratorioNome(""); }}>
                    Cancelar
                  </Button>
                  <Button variant="primary" fullWidth onClick={handleCreateLaboratorio}>
                    Salvar e Vincular
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </main>
    </PageTransition>
  );
}

export default function DetalhesExamePage() {
  return <Suspense fallback={<LoadingSkeleton />}><DetalhesExameContent /></Suspense>;
}