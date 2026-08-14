"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, Loader2, Save, Pill, Circle, Trash2, AlertTriangle, 
  Package, Plus, Clock, Activity, Brain, ShieldAlert, HeartPulse, 
  Flame, StickyNote, Stethoscope, Droplet, Syringe, Palette, X, Store, UserCheck
} from "lucide-react";
import { usePersons } from "@/hooks/usePersons";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useMedicos } from "@/hooks/useMedicos";
import { useFarmacias } from "@/hooks/useFarmacias";
import { useHapticFeedback } from "@/lib/haptics";
import { suggestRenewalDate, VALIDADE_RECEITA_DIAS, TIPO_RECEITA_LABELS } from "@/lib/health-utils";
import type { TipoReceita } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { SelectionModal } from "@/components/SelectionModal";
import { db, safeAddTratamento } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useAuth } from "@/hooks/useAuth";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

const TIPO_OPTIONS: TipoReceita[] = ["comum", "amarela", "azul", "branca"];

const FORMATOS = [
  { id: "comprimido", label: "Redondo", icon: Circle },
  { id: "capsula", label: "Cápsula", icon: Pill },
  { id: "gota", label: "Gotas", icon: Droplet },
  { id: "injecao", label: "Injeção", icon: Syringe },
  { id: "adesivo", label: "Adesivo", icon: StickyNote },
];

const CORES_DISPONIVEIS = [
  "#FFFFFF", "#FCA5A5", "#F87171", "#FBBF24", "#34D399", 
  "#60A5FA", "#818CF8", "#A78BFA", "#F472B6", "#9CA3AF"
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function getTratamentoIcon(nome: string) {
  const n = nome.toLowerCase();
  if (n.includes("tdah")) return Brain;
  if (n.includes("dor") || n.includes("neuropática")) return Flame;
  if (n.includes("depress")) return HeartPulse;
  if (n.includes("ansied") || n.includes("ansiolítico")) return ShieldAlert;
  return Activity;
}

function EditarMedicamentoContent() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "";
  const { user } = useAuth();
  
  const persons = usePersons();
  const { getMedicamento, updateMedicamento, deleteMedicamento } = useMedicamentos();
  const { medicos } = useMedicos();
  const { farmacias } = useFarmacias();

  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [personId, setPersonId] = useState("");
  const [nome, setNome] = useState("");
  const [dosagem, setDosagem] = useState("");
  const [formato, setFormato] = useState("capsula");
  const [cores, setCores] = useState<string[]>([]);
  
  const [medicoId, setMedicoId] = useState("");
  const [farmaciaId, setFarmaciaId] = useState("");
  const [tipoReceita, setTipoReceita] = useState<TipoReceita>("comum");
  const [dataReceita, setDataReceita] = useState("");
  const [proximaRenovacao, setProximaRenovacao] = useState("");
  const [observacoes, setObservacoes] = useState("");
  
  const [statusAtivo, setStatusAtivo] = useState(true); 
  const [motivoDescontinuacao, setMotivoDescontinuacao] = useState("");
  const [medicoDescontinuacaoId, setMedicoDescontinuacaoId] = useState("");
  
  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [isPharmacyModalOpen, setIsPharmacyModalOpen] = useState(false);
  const [isDoctorDescontinuacaoModalOpen, setIsDoctorDescontinuacaoModalOpen] = useState(false);
  
  const tratamentos = useLiveQuery(() => db.tratamentos.toArray(), []) || [];
  const [tratamentosSelecionados, setTratamentosSelecionados] = useState<string[]>([]);
  const [isTratamentoModalOpen, setIsTratamentoModalOpen] = useState(false);
  const [isCreatingTratamento, setIsCreatingTratamento] = useState(false);
  const [newTratamentoName, setNewTratamentoName] = useState("");
  const [isSavingTratamento, setIsSavingTratamento] = useState(false);
  
  const selectedMedico = medicos.find((m: any) => m.id === medicoId);
  const selectedMedicoDescontinuacao = medicos.find((m: any) => m.id === medicoDescontinuacaoId);
  const selectedFarmacia = farmacias.find((f: any) => f.id === farmaciaId);

  const [estoqueAtivo, setEstoqueAtivo] = useState(false);
  const [estoqueQuantidade, setEstoqueQuantidade] = useState("");
  const [estoqueDataReferencia, setEstoqueDataReferencia] = useState(todayISO());
  const [estoqueUnidade, setEstoqueUnidade] = useState("comprimido(s)");
  const [estoqueUnidadePorDose, setEstoqueUnidadePorDose] = useState("1");
  const [horarios, setHorarios] = useState<string[]>([""]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const diasValidade = VALIDADE_RECEITA_DIAS[tipoReceita];

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }
    getMedicamento(id).then(async (item: any) => {
      if (!item) {
        setNotFound(true);
      } else {
        setPersonId(item.person_id || "");
        setNome(item.nome || "");
        setDosagem(item.dosagem || "");
        setFormato(item.formato || "capsula");
        setCores(item.cores || []);
        
        setMedicoId(item.medico_id || "");
        setFarmaciaId(item.farmacia_id || "");
        setDataReceita(item.data_receita || "");
        setProximaRenovacao(item.proxima_renovacao || "");
        setObservacoes(item.observacoes || "");
        setTipoReceita((item.tipo_receita as TipoReceita) || "comum");
        
        setStatusAtivo(item.status !== "descontinuado");
        setMotivoDescontinuacao(item.motivo_descontinuacao || "");
        setMedicoDescontinuacaoId(item.medico_descontinuacao_id || "");

        const vinculos = await db.medicamento_tratamentos.where('medicamento_id').equals(id).toArray();
        const tIds = vinculos.map((v: any) => v.tratamento_id);
        
        if (tIds.length === 0 && item.tratamento_id) tIds.push(item.tratamento_id);
        setTratamentosSelecionados(tIds);

        if (typeof item.estoque_quantidade === "number" && item.estoque_data_referencia && item.estoque_horarios) {
          setEstoqueAtivo(true);
          setEstoqueQuantidade(String(item.estoque_quantidade));
          setEstoqueDataReferencia(item.estoque_data_referencia);
          setEstoqueUnidade(item.estoque_unidade_medida || "comprimido(s)");
          setEstoqueUnidadePorDose(String(item.estoque_unidade_por_dose || 1));
          setHorarios(item.estoque_horarios);
        }
      }
      setIsLoading(false);
    });
  }, [id]);

  const toggleCor = (hex: string) => {
    trigger("vibrate");
    setCores(prev => {
      if (prev.includes(hex)) return prev.filter(c => c !== hex);
      if (prev.length >= 2) return [prev[1], hex]; 
      return [...prev, hex];
    });
  };

  const aplicarSugestaoValidade = () => { if (dataReceita && diasValidade) { trigger("vibrate"); setProximaRenovacao(suggestRenewalDate(dataReceita, tipoReceita)); } };

  const handleCreateTratamento = async () => {
    if (!newTratamentoName.trim()) return;
    setIsSavingTratamento(true);
    trigger("vibrate");
    try {
      const newId = await safeAddTratamento({ user_id: user?.id || "", person_id: personId || "", nome: newTratamentoName.trim(), status: "ativo" });
      setTratamentosSelecionados(prev => [...prev, newId]);
      trigger("success");
      setIsCreatingTratamento(false);
      setNewTratamentoName("");
    } catch (error) {
      trigger("error");
    } finally {
      setIsSavingTratamento(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!personId) newErrors.personId = "Selecione uma pessoa";
    if (!nome.trim()) newErrors.nome = "Nome é obrigatório";
    if (!dosagem.trim()) newErrors.dosagem = "Dosagem é obrigatória";
    if (!dataReceita) newErrors.dataReceita = "Data da receita é obrigatória";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    trigger("vibrate");
    if (!validate()) { trigger("error"); return; }
    setSaving(true);
    try {
      const horariosFiltrados = horarios.filter(h => h);
      await updateMedicamento(id, {
        person_id: personId,
        nome: nome.trim(),
        dosagem: dosagem.trim(),
        formato,
        cores,
        medico_id: medicoId || undefined,
        farmacia_id: farmaciaId || undefined,
        data_receita: dataReceita,
        proxima_renovacao: proximaRenovacao,
        observacoes: observacoes.trim() || undefined,
        tipo_receita: tipoReceita,
        tratamento_ids: tratamentosSelecionados,
        status: statusAtivo ? "ativo" : "descontinuado",
        motivo_descontinuacao: !statusAtivo ? motivoDescontinuacao.trim() : undefined,
        medico_descontinuacao_id: !statusAtivo ? medicoDescontinuacaoId || undefined : undefined,
        data_descontinucao: !statusAtivo ? todayISO() : undefined,
        estoque_quantidade: estoqueAtivo ? Number(estoqueQuantidade) : undefined,
        estoque_data_referencia: estoqueAtivo ? estoqueDataReferencia : undefined,
        estoque_horarios: estoqueAtivo ? horariosFiltrados : undefined,
        estoque_unidade_por_dose: estoqueAtivo ? Number(estoqueUnidadePorDose) || 1 : undefined,
        estoque_unidade_medida: estoqueAtivo ? estoqueUnidade.trim() || "comprimido(s)" : undefined,
      } as any);

      trigger("success");
      router.back();
    } catch (error) {
      trigger("error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await deleteMedicamento(id); trigger("success"); router.replace("/saude/medicamentos"); } 
    catch (error) { trigger("error"); }
  };

  if (isLoading) return <LoadingSkeleton />;
  if (notFound) return null;

  const SelectedFormatIcon = FORMATOS.find(f => f.id === formato)?.icon || Pill;
  const hasTwoColors = cores.length === 2;
  const color1 = cores[0] || "#9CA3AF";
  const color2 = hasTwoColors ? cores[1] : color1;
  const gradientId = `split-${id}`;

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <svg width="0" height="0" className="absolute">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="50%" stopColor={color1} />
              <stop offset="50%" stopColor={color2} />
            </linearGradient>
          </defs>
        </svg>

        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 header-safe-top backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button onClick={() => { trigger("vibrate"); router.back(); }} className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"><ArrowLeft size={18} className="text-ink-primary" /></button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <SelectedFormatIcon size={16} stroke={hasTwoColors ? `url(#${gradientId})` : color1} />
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">Vault</p>
              </div>
              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">Editar medicamento</h1>
            </div>
            <button onClick={() => { trigger("vibrate"); setShowDeleteModal(true); }} className="flex h-11 w-11 items-center justify-center rounded-full border border-coral/20 bg-coral/10 text-coral transition-all active:scale-95"><Trash2 size={16} /></button>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-6">
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <Input label="Medicamento" placeholder="Ex: Losartana, Sertralina..." value={nome} onChange={(e) => setNome(e.target.value)} error={errors.nome} required />
            <Input label="Dosagem" placeholder="Ex: 50mg, 1x ao dia" value={dosagem} onChange={(e) => setDosagem(e.target.value)} error={errors.dosagem} required />
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-primary">Médico Prescritor</label>
              <button type="button" onClick={() => { trigger("vibrate"); setIsDoctorModalOpen(true); }} className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left flex items-center justify-between transition-colors hover:border-ice/50">
                <div className="flex items-center gap-2.5 min-w-0">
                  <UserCheck size={16} className="text-ice shrink-0" />
                  <span className="truncate text-ink-primary">{selectedMedico ? `Dr(a). ${selectedMedico.nome}` : "Selecionar médico..."}</span>
                </div>
              </button>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-primary">Farmácia / Local de Retirada</label>
              <button type="button" onClick={() => { trigger("vibrate"); setIsPharmacyModalOpen(true); }} className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left flex items-center justify-between transition-colors hover:border-ice/50">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Store size={16} className="text-amber-400 shrink-0" />
                  <span className="truncate text-ink-primary">{selectedFarmacia ? selectedFarmacia.nome : "Selecionar farmácia..."}</span>
                </div>
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-surface-border/40">
              <div className="space-y-1.5"><label className="block text-sm font-medium text-ink-primary">Data da receita <span className="text-coral">*</span></label><input type="date" value={dataReceita} onChange={(e) => setDataReceita(e.target.value)} className={`w-full rounded-2xl border bg-surface-raised px-4 py-3 text-ink-primary outline-none focus:border-ice/50 focus:ring-2 focus:ring-ice/15 ${errors.dataReceita ? "border-coral/50" : "border-surface-border/50"}`} /></div>
              <div className="space-y-1.5"><label className="block text-sm font-medium text-ink-primary">Próxima renovação</label><input type="date" value={proximaRenovacao} onChange={(e) => setProximaRenovacao(e.target.value)} className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-ink-primary outline-none focus:border-ice/50 focus:ring-2 focus:ring-ice/15" /></div>
            </div>
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" className="rounded-[28px] border border-violet-500/30 bg-surface p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2"><Activity size={16} className="text-violet-400" /><label className="text-sm font-semibold text-ink-primary">Tratamentos Vinculados</label></div>
            </div>
            {tratamentosSelecionados.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {tratamentosSelecionados.map(tId => {
                  const t = tratamentos.find((x: any) => x.id === tId);
                  if (!t) return null;
                  const IconComp = getTratamentoIcon(t.nome);
                  return (
                    <div key={tId} className="flex items-center gap-1.5 rounded-full bg-violet-400/10 border border-violet-400/20 px-3 py-1.5">
                      <IconComp size={14} className="text-violet-400" />
                      <span className="text-xs font-medium text-violet-300">{t.nome}</span>
                      <button onClick={(e) => { e.stopPropagation(); trigger("vibrate"); setTratamentosSelecionados(prev => prev.filter(item => item !== tId)); }} className="ml-1 text-violet-400/60 hover:text-coral transition-colors"><X size={14} /></button>
                    </div>
                  );
                })}
              </div>
            )}
            <button onClick={() => { trigger("vibrate"); setIsTratamentoModalOpen(true); }} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-violet-400/30 bg-violet-400/5 px-4 py-3 text-violet-300 transition-colors hover:bg-violet-400/10"><Plus size={16} /><span className="text-sm font-medium">Adicionar Tratamento / CID</span></button>
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
             <div className="flex items-center gap-2 mb-3"><Palette size={16} className="text-ice" /><h3 className="text-sm font-semibold text-ink-primary">Identidade Visual</h3></div>
             <div className="mb-4">
               <div className="flex flex-wrap gap-2">
                 {FORMATOS.map((f) => {
                   const isActive = formato === f.id;
                   const Icon = f.icon;
                   return (
                     <button key={f.id} onClick={() => { trigger("vibrate"); setFormato(f.id); }} className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl py-3 px-4 border transition-all ${isActive ? "bg-ice/15 border-ice text-ice" : "bg-surface-raised border-surface-border/40 text-ink-muted"}`}><Icon size={20} /><span className="text-[10px] font-medium">{f.label}</span></button>
                   );
                 })}
               </div>
             </div>
             <div>
               <div className="flex flex-wrap gap-2.5 items-center">
                 {CORES_DISPONIVEIS.map((hex) => {
                   const isSelected = cores.includes(hex);
                   return <button key={hex} onClick={() => toggleCor(hex)} className={`h-8 w-8 rounded-full border-2 transition-all ${isSelected ? "border-ice scale-110 shadow-md shadow-ice/20" : "border-transparent scale-100"}`} style={{ backgroundColor: hex, outline: hex === "#FFFFFF" && !isSelected ? "1px solid rgba(255,255,255,0.1)" : "none" }} />
                 })}
               </div>
             </div>
          </motion.div>

          {/* ============================================================ */}
          {/* BLOCO DE AUDITORIA DE STATUS (ATIVO / DESCONTINUADO) */}
          {/* ============================================================ */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-ink-primary">Status do Medicamento</h3>
                <p className="text-xs text-ink-muted">Indique se o uso está ativo ou descontinuado</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  trigger("vibrate");
                  setStatusAtivo(!statusAtivo);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  statusAtivo ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-coral/15 text-coral border border-coral/30"
                }`}
              >
                {statusAtivo ? "Ativo" : "Descontinuado"}
              </button>
            </div>

            {!statusAtivo && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-3 pt-3 border-t border-surface-border/40">
                <Input 
                  label="Motivo da descontinuação" 
                  placeholder="Ex: Efeito colateral, troca de medicação..." 
                  value={motivoDescontinuacao} 
                  onChange={(e) => setMotivoDescontinuacao(e.target.value)} 
                />
                
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink-primary">Médico responsável pela suspensão</label>
                  <button 
                    type="button" 
                    onClick={() => { trigger("vibrate"); setIsDoctorDescontinuacaoModalOpen(true); }} 
                    className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <UserCheck size={16} className="text-ice shrink-0" />
                      <span className="truncate text-ink-primary">
                        {selectedMedicoDescontinuacao ? `Dr(a). ${selectedMedicoDescontinuacao.nome}` : "Selecionar médico da suspensão (opcional)..."}
                      </span>
                    </div>
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <Button variant="primary" size="lg" fullWidth onClick={handleSubmit} disabled={saving} className="flex items-center justify-center gap-2 shadow-lg shadow-ice/10">
            {saving ? <><Loader2 size={16} className="animate-spin" /> Salvando...</> : <><Save size={16} /> Salvar alterações</>}
          </Button>
        </div>

        {/* MODAIS RELACIONAIS ATUALIZADAS */}
        <SelectionModal isOpen={isDoctorModalOpen} onClose={() => setIsDoctorModalOpen(false)} onSelect={(item: any) => setMedicoId(item.id)} items={medicos} title="Médico Prescritor" renderItem={(item: any) => (<div><p className="font-medium text-ink-primary">Dr(a). {item.nome}</p></div>)} getItemId={(item: any) => item.id!} getItemLabel={(item: any) => item.nome} onCreateNew={() => { setIsDoctorModalOpen(false); router.push("/saude/medicos/novo"); }} createNewLabel="Cadastrar Novo Médico" />
        
        <SelectionModal isOpen={isPharmacyModalOpen} onClose={() => setIsPharmacyModalOpen(false)} onSelect={(item: any) => setFarmaciaId(item.id)} items={farmacias} title="Farmácia / Local de Retirada" renderItem={(item: any) => (<div><p className="font-medium text-ink-primary">{item.nome}</p></div>)} getItemId={(item: any) => item.id!} getItemLabel={(item: any) => item.nome} onCreateNew={() => { setIsPharmacyModalOpen(false); router.push("/saude/locais/novo"); }} createNewLabel="Cadastrar Nova Farmácia" />

        <SelectionModal isOpen={isTratamentoModalOpen} onClose={() => setIsTratamentoModalOpen(false)} onSelect={(item: any) => { if (!tratamentosSelecionados.includes(item.id!)) setTratamentosSelecionados(prev => [...prev, item.id!]); }} items={tratamentos} title="Vincular a Tratamento/CID" renderItem={(item: any) => (<p className="font-medium text-ink-primary">{item.nome}</p>)} getItemId={(item: any) => item.id!} getItemLabel={(item: any) => item.nome} onCreateNew={() => { setIsTratamentoModalOpen(false); setIsCreatingTratamento(true); }} createNewLabel="Novo Tratamento" />

        {/* ============================================================ */}
        {/* SELECTION MODAL PARA MÉDICO DE DESCONTINUAÇÃO */}
        {/* ============================================================ */}
        <SelectionModal 
          isOpen={isDoctorDescontinuacaoModalOpen} 
          onClose={() => setIsDoctorDescontinuacaoModalOpen(false)} 
          onSelect={(item: any) => setMedicoDescontinuacaoId(item.id)} 
          items={medicos} 
          title="Médico da Suspensão" 
          renderItem={(item: any) => (<div><p className="font-medium text-ink-primary">Dr(a). {item.nome}</p></div>)} 
          getItemId={(item: any) => item.id!} 
          getItemLabel={(item: any) => item.nome} 
          onCreateNew={() => { setIsDoctorDescontinuacaoModalOpen(false); router.push("/saude/medicos/novo"); }} 
          createNewLabel="Cadastrar Novo Médico" 
        />

        <ConfirmationModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={handleDelete} title="Excluir medicamento" message={`Tem certeza que deseja excluir "${nome}"?`} confirmLabel="Excluir" cancelLabel="Cancelar" type="danger" />
      </main>
    </PageTransition>
  );
}

export default function EditarMedicamentoPage() {
  return <Suspense fallback={<LoadingSkeleton />}><EditarMedicamentoContent /></Suspense>;
}