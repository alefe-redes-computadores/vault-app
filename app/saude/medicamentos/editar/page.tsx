"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, Loader2, Save, Pill, Circle, Trash2, AlertTriangle, 
  Package, Plus, Clock, Activity, Brain, ShieldAlert, HeartPulse, 
  Flame, StickyNote, Stethoscope, Droplet, Syringe, Palette, X, Store, UserCheck,
  History, ExternalLink, ArrowRightLeft
} from "lucide-react";
import { usePersons } from "@/hooks/usePersons";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useMedicos } from "@/hooks/useMedicos";
import { useFarmacias } from "@/hooks/useFarmacias";
import { useHapticFeedback } from "@/lib/haptics";
import { suggestRenewalDate, VALIDADE_RECEITA_DIAS, TIPO_RECEITA_LABELS } from "@/lib/health-utils";
import { scheduleDoseNotifications, cancelDoseNotifications, requestNotificationPermission } from "@/lib/dose-notifications";
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

function formatDataMesAno(dataIso: string) {
  if (!dataIso) return "";
  const [year, month] = dataIso.split("-");
  const meses = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
  return `${meses[parseInt(month) - 1]}/${year.slice(2)}`;
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
  const [documentId, setDocumentId] = useState<string>("");

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
  const [substituidoPorId, setSubstituidoPorId] = useState<string>("");
  
  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [isPharmacyModalOpen, setIsPharmacyModalOpen] = useState(false);
  const [isDoctorDescontinuacaoModalOpen, setIsDoctorDescontinuacaoModalOpen] = useState(false);
  const [isSubstitutoModalOpen, setIsSubstitutoModalOpen] = useState(false);
  
  const tratamentos = useLiveQuery(() => db.tratamentos.toArray(), []) || [];
  const [tratamentosSelecionados, setTratamentosSelecionados] = useState<string[]>([]);
  const [isTratamentoModalOpen, setIsTratamentoModalOpen] = useState(false);
  const [isCreatingTratamento, setIsCreatingTratamento] = useState(false);
  const [newTratamentoName, setNewTratamentoName] = useState("");
  const [isSavingTratamento, setIsSavingTratamento] = useState(false);
  
  const medicamentosQuery = useLiveQuery(() => db.table("medicamentos").toArray(), []) || [];
  const medicamentosAtivos = medicamentosQuery.filter((m: any) => m.id !== id);
  const selectedSubstituto = medicamentosQuery.find((m: any) => m.id === substituidoPorId);

  const renovacoes = useLiveQuery(
    () => db.renovacoes.where("medicamento_id").equals(id).reverse().sortBy("data"),
    [id]
  ) || [];

  const selectedMedico = medicos.find((m: any) => m.id === medicoId);
  const selectedMedicoDescontinuacao = medicos.find((m: any) => m.id === medicoDescontinuacaoId);
  const selectedFarmacia = farmacias.find((f: any) => f.id === farmaciaId);

  // Estoque e Lembretes
  const [estoqueAtivo, setEstoqueAtivo] = useState(false);
  const [estoqueQuantidade, setEstoqueQuantidade] = useState("");
  const [estoqueDataReferencia, setEstoqueDataReferencia] = useState(todayISO());
  const [estoqueUnidade, setEstoqueUnidade] = useState("comprimido(s)");
  const [estoqueUnidadePorDose, setEstoqueUnidadePorDose] = useState("1");
  const [horarios, setHorarios] = useState<string[]>([""]);
  const [horariosOriginais, setHorariosOriginais] = useState<string[]>([]);

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
        setSubstituidoPorId(item.substituido_por_id || "");

        const vinculos = await db.medicamento_tratamentos.where('medicamento_id').equals(id).toArray();
        const tIds = vinculos.map((v: any) => v.tratamento_id);
        
        if (tIds.length === 0 && item.tratamento_id) tIds.push(item.tratamento_id);
        setTratamentosSelecionados(tIds);

        if (item.document_id) setDocumentId(item.document_id);

        if (typeof item.estoque_quantidade === "number" && item.estoque_data_referencia && item.estoque_horarios) {
          setEstoqueAtivo(true);
          setEstoqueQuantidade(String(item.estoque_quantidade));
          setEstoqueDataReferencia(item.estoque_data_referencia);
          setEstoqueUnidade(item.estoque_unidade_medida || "comprimido(s)");
          setEstoqueUnidadePorDose(String(item.estoque_unidade_por_dose || 1));
          setHorarios(item.estoque_horarios);
          setHorariosOriginais(item.estoque_horarios);
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

  const aplicarSugestaoValidade = () => { 
    if (dataReceita && diasValidade) { 
      trigger("vibrate"); 
      setProximaRenovacao(suggestRenewalDate(dataReceita, tipoReceita)); 
    } 
  };

  const toggleEstoque = () => {
    trigger("vibrate");
    setEstoqueAtivo((prev) => !prev);
  };

  const updateHorario = (index: number, value: string) => {
    setHorarios((prev) => prev.map((h, i) => (i === index ? value : h)));
  };

  const addHorario = () => {
    trigger("vibrate");
    setHorarios((prev) => [...prev, ""]);
  };

  const removeHorario = (index: number) => {
    trigger("vibrate");
    setHorarios((prev) => prev.filter((_, i) => i !== index));
  };

  const registrarContagemHoje = () => {
    trigger("vibrate");
    setEstoqueDataReferencia(todayISO());
  };

  const handleCreateTratamento = async () => {
    if (!newTratamentoName.trim()) return;
    setIsSavingTratamento(true);
    trigger("vibrate");
    try {
      const newId = await safeAddTratamento({ 
        user_id: user?.id || "", 
        person_id: personId || "", 
        nome: newTratamentoName.trim(), 
        status: "ativo" 
      });
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

    if (estoqueAtivo) {
      if (!estoqueQuantidade || Number(estoqueQuantidade) <= 0) {
        newErrors.estoqueQuantidade = "Informe a quantidade atual";
      }
      const horariosPreenchidos = horarios.filter((h) => h);
      if (horariosPreenchidos.length === 0) {
        newErrors.horarios = "Adicione pelo menos um horário";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    trigger("vibrate");
    if (!validate()) { trigger("error"); return; }
    setSaving(true);
    try {
      const horariosFiltrados = horarios.filter(h => h);

      if (documentId) {
        const doc = await db.documents.get(documentId);
        if (doc && doc.id) {
          await db.documents.update(doc.id, {
            metadata: { ...doc.metadata, tratamento_ids: tratamentosSelecionados },
            updated_at: new Date().toISOString(),
            synced: false,
          });
        }
      }

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
        substituido_por_id: !statusAtivo ? substituidoPorId || undefined : undefined,
        estoque_quantidade: estoqueAtivo ? Number(estoqueQuantidade) : undefined,
        estoque_data_referencia: estoqueAtivo ? estoqueDataReferencia : undefined,
        estoque_horarios: estoqueAtivo ? horariosFiltrados : undefined,
        estoque_unidade_por_dose: estoqueAtivo ? Number(estoqueUnidadePorDose) || 1 : undefined,
        estoque_unidade_medida: estoqueAtivo ? estoqueUnidade.trim() || "comprimido(s)" : undefined,
      } as any);

      if (estoqueAtivo && horariosFiltrados.length > 0 && statusAtivo) {
        const granted = await requestNotificationPermission();
        if (granted) {
          await scheduleDoseNotifications({
            id,
            nome: nome.trim(),
            dosagem: dosagem.trim(),
            estoque_horarios: horariosFiltrados,
          } as any);
        }
      } else if (horariosOriginais.length > 0) {
        await cancelDoseNotifications({ id, estoque_horarios: horariosOriginais } as any);
      }

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
    try { 
      if (horariosOriginais.length > 0) {
        await cancelDoseNotifications({ id, estoque_horarios: horariosOriginais } as any);
      }
      await deleteMedicamento(id); 
      trigger("success"); 
      router.replace("/saude"); 
    } catch (error) { 
      trigger("error"); 
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
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
          {/* SELETOR DE PESSOA */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <p className="mb-3 text-sm font-medium text-ink-primary">Pessoa <span className="text-coral">*</span></p>
            <div className="flex flex-wrap gap-2">
              {persons.map((person: any) => {
                const active = personId === person.id;
                return (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => { trigger("vibrate"); setPersonId(person.id!); }}
                    className={`rounded-full border px-4 py-2.5 text-sm font-medium transition-all active:scale-95 ${
                      active ? "border-ice bg-ice/12 text-ice" : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                    }`}
                  >
                    {person.name}
                  </button>
                );
              })}
            </div>
            {errors.personId && <p className="mt-2 text-xs text-coral">{errors.personId}</p>}
          </motion.div>

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

          {/* TIPO DE RECEITA */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <p className="mb-3 text-sm font-medium text-ink-primary">Tipo de receita</p>
            <div className="grid grid-cols-2 gap-2">
              {TIPO_OPTIONS.map((tipo) => {
                const active = tipoReceita === tipo;
                return (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => { trigger("vibrate"); setTipoReceita(tipo); }}
                    className={`rounded-2xl border px-4 py-3 text-sm font-medium transition-all active:scale-95 ${
                      active ? (tipo === "comum" ? "border-ice bg-ice/12 text-ice" : "border-violet-400 bg-violet-400/12 text-violet-300") : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                    }`}
                  >
                    {TIPO_RECEITA_LABELS[tipo]}
                  </button>
                );
              })}
            </div>
            {diasValidade && (
              <div className="mt-3 flex items-start justify-between gap-2 rounded-2xl bg-violet-400/8 px-3 py-2.5">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0 text-violet-300" />
                  <p className="text-xs leading-5 text-ink-muted">
                    Receita {TIPO_RECEITA_LABELS[tipoReceita].toLowerCase()} vale{" "}
                    <span className="font-medium text-ink-primary">{diasValidade} dias</span>.
                  </p>
                </div>
                <button type="button" onClick={aplicarSugestaoValidade} className="shrink-0 whitespace-nowrap text-xs font-medium text-violet-300 hover:text-violet-200">
                  Aplicar +{diasValidade}d
                </button>
              </div>
            )}
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
                      <button type="button" onClick={(e) => { e.stopPropagation(); trigger("vibrate"); setTratamentosSelecionados(prev => prev.filter(item => item !== tId)); }} className="ml-1 text-violet-400/60 hover:text-coral transition-colors"><X size={14} /></button>
                    </div>
                  );
                })}
              </div>
            )}
            <button type="button" onClick={() => { trigger("vibrate"); setIsTratamentoModalOpen(true); }} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-violet-400/30 bg-violet-400/5 px-4 py-3 text-violet-300 transition-colors hover:bg-violet-400/10"><Plus size={16} /><span className="text-sm font-medium">Adicionar Tratamento / CID</span></button>
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
             <div className="flex items-center gap-2 mb-3"><Palette size={16} className="text-ice" /><h3 className="text-sm font-semibold text-ink-primary">Identidade Visual</h3></div>
             <div className="mb-4">
               <div className="flex flex-wrap gap-2">
                 {FORMATOS.map((f) => {
                   const isActive = formato === f.id;
                   const Icon = f.icon;
                   return (
                     <button key={f.id} type="button" onClick={() => { trigger("vibrate"); setFormato(f.id); }} className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl py-3 px-4 border transition-all ${isActive ? "bg-ice/15 border-ice text-ice" : "bg-surface-raised border-surface-border/40 text-ink-muted"}`}><Icon size={20} /><span className="text-[10px] font-medium">{f.label}</span></button>
                   );
                 })}
               </div>
             </div>
             <div>
               <div className="flex flex-wrap gap-2.5 items-center">
                 {CORES_DISPONIVEIS.map((hex) => {
                   const isSelected = cores.includes(hex);
                   return <button key={hex} type="button" onClick={() => toggleCor(hex)} className={`h-8 w-8 rounded-full border-2 transition-all ${isSelected ? "border-ice scale-110 shadow-md shadow-ice/20" : "border-transparent scale-100"}`} style={{ backgroundColor: hex, outline: hex === "#FFFFFF" && !isSelected ? "1px solid rgba(255,255,255,0.1)" : "none" }} />
                 })}
               </div>
             </div>
          </motion.div>

          {/* BLOCO DE AUDITORIA DE STATUS (ATIVO / DESCONTINUADO) */}
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

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink-primary flex items-center gap-2">
                    <ArrowRightLeft size={16} className="text-coral" />
                    Substituído por outro medicamento?
                  </label>
                  <button
                    type="button"
                    onClick={() => { trigger("vibrate"); setIsSubstitutoModalOpen(true); }}
                    className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3.5 text-left transition-colors hover:border-coral/30"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Pill size={16} className={selectedSubstituto ? "text-coral" : "text-ink-muted"} />
                      <span className="truncate font-medium text-ink-primary">
                        {selectedSubstituto ? `${selectedSubstituto.nome} ${selectedSubstituto.dosagem}` : "Selecionar medicamento substituto..."}
                      </span>
                    </div>
                    <span className="text-xs text-coral font-medium shrink-0 ml-2">
                      {selectedSubstituto ? "Alterar" : "Vincular"}
                    </span>
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* HISTÓRICO CLÍNICO DA LINHA DO TEMPO */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <History size={100} />
             </div>
             
             <div className="mb-4 flex items-center justify-between relative z-10">
               <h3 className="text-sm font-semibold text-ink-primary">Histórico Clínico</h3>
             </div>

             <div className="space-y-4 relative z-10 pl-2">
                <div className="absolute left-4 top-2 bottom-2 w-[1px] bg-surface-border/60 z-0"></div>

                <div className="relative z-10 flex items-start gap-4">
                   <div className="h-4 w-4 rounded-full bg-emerald-400/20 border-2 border-emerald-400 shrink-0 mt-1 shadow-sm"></div>
                   <div className="flex-1 bg-surface-raised/80 border border-emerald-400/20 rounded-[18px] p-3 shadow-sm">
                      <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">RECEITA ATUAL</p>
                      <div className="flex justify-between items-center mb-1">
                         <span className="text-sm font-semibold text-ink-primary">{formatDataMesAno(dataReceita) || "Data não informada"}</span>
                      </div>
                      <p className="text-xs text-ink-muted">Validade projetada: {formatDataMesAno(proximaRenovacao) || "Não informada"}</p>
                   </div>
                </div>

                {renovacoes.map((renovacao: any) => (
                   <div key={renovacao.id} className="relative z-10 flex items-start gap-4">
                      <div className="h-3 w-3 rounded-full bg-surface-border border border-ink-muted shrink-0 mt-2 shadow-sm ml-[2px]"></div>
                      <div className="flex-1 bg-surface-raised/50 border border-surface-border/40 rounded-[18px] p-3">
                         <div className="flex justify-between items-start mb-1">
                            <span className="text-sm font-semibold text-ink-primary">{formatDataMesAno(renovacao.data)}</span>
                            {renovacao.anexo_url && (
                               <a href={renovacao.anexo_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] bg-ice/10 text-ice px-2 py-1 rounded-lg hover:bg-ice/20 transition-colors">
                                  Ver Foto <ExternalLink size={10} />
                               </a>
                            )}
                         </div>
                         {renovacao.observacoes && <p className="text-xs text-ink-muted italic">"{renovacao.observacoes}"</p>}
                      </div>
                   </div>
                ))}
             </div>

             <button type="button" onClick={() => { trigger("vibrate"); router.push(`/saude/renovacao/nova?medicamento_id=${id}`); }} className="mt-5 w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-surface-raised border border-ice/20 text-ice text-sm font-medium transition-colors hover:bg-ice/10 relative z-10">
                <Plus size={16} /> Adicionar Nova Receita
             </button>
          </motion.div>

          {/* ESTOQUE */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <button type="button" onClick={toggleEstoque} className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ice/10 text-ice">
                  <Package size={16} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-ink-primary">Acompanhar estoque</p>
                  <p className="text-xs text-ink-muted">Receba alerta e lembrete de dose</p>
                </div>
              </div>
              <div className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${estoqueAtivo ? "bg-ice" : "bg-surface-border"}`}>
                <div className={`h-5 w-5 rounded-full bg-void transition-transform ${estoqueAtivo ? "translate-x-5" : "translate-x-0"}`} />
              </div>
            </button>

            <AnimatePresence>
              {estoqueAtivo && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
                  <div className="mt-4 space-y-3 border-t border-surface-border/40 pt-4">
                    <div className="flex items-center justify-between gap-2 rounded-2xl bg-surface-raised/60 px-3 py-2.5">
                      <p className="text-xs text-ink-muted">Contagem: <span className="font-medium text-ink-primary">{estoqueDataReferencia}</span></p>
                      <button type="button" onClick={registrarContagemHoje} className="shrink-0 whitespace-nowrap text-xs font-medium text-ice hover:text-ice/80">Recontar hoje</button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-ink-primary">Quant. atual <span className="text-coral">*</span></label>
                        <input type="number" min="0" inputMode="numeric" placeholder="Ex: 30" value={estoqueQuantidade} onChange={(e) => setEstoqueQuantidade(e.target.value)} className={`w-full rounded-2xl border bg-surface-raised px-4 py-3 text-ink-primary outline-none transition-all duration-200 focus:border-ice/50 focus:ring-2 focus:ring-ice/15 ${errors.estoqueQuantidade ? "border-coral/50" : "border-surface-border/50"}`} />
                      </div>
                      <Input label="Unidade" placeholder="comprimido(s)" value={estoqueUnidade} onChange={(e) => setEstoqueUnidade(e.target.value)} />
                    </div>

                    <Input label="Unid. por dose" type="number" min="1" inputMode="numeric" value={estoqueUnidadePorDose} onChange={(e) => setEstoqueUnidadePorDose(e.target.value)} />

                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <label className="block text-sm font-medium text-ink-primary">Horários <span className="text-coral">*</span></label>
                        <button type="button" onClick={addHorario} className="flex items-center gap-1 text-xs font-medium text-ice hover:text-ice/80"><Plus size={13} /> Adicionar</button>
                      </div>
                      <div className="space-y-2">
                        {horarios.map((horario, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <Clock size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                              <input type="time" value={horario} onChange={(e) => updateHorario(index, e.target.value)} className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised py-3 pl-9 pr-3 text-ink-primary outline-none transition-all duration-200 focus:border-ice/50 focus:ring-2 focus:ring-ice/15" />
                            </div>
                            {horarios.length > 1 && <button type="button" onClick={() => removeHorario(index)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-border/40 hover:text-coral"><Trash2 size={14} /></button>}
                          </div>
                        ))}
                      </div>
                      {errors.horarios && <p className="mt-1 text-xs text-coral">{errors.horarios}</p>}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <TextArea label="Notas Clínicas (opcional)" placeholder="Ex: tomar em jejum, causou muito sono..." value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </motion.div>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <Button variant="primary" size="lg" fullWidth onClick={handleSubmit} disabled={saving} className="flex items-center justify-center gap-2 shadow-lg shadow-ice/10">
            {saving ? <><Loader2 size={16} className="animate-spin" /> Salvando...</> : <><Save size={16} /> Salvar alterações</>}
          </Button>
        </div>

        {/* MODAIS RELACIONAIS */}
        <SelectionModal isOpen={isDoctorModalOpen} onClose={() => setIsDoctorModalOpen(false)} onSelect={(item: any) => setMedicoId(item.id)} items={medicos} title="Médico Prescritor" renderItem={(item: any) => (<div><p className="font-medium text-ink-primary">Dr(a). {item.nome}</p></div>)} getItemId={(item: any) => item.id!} getItemLabel={(item: any) => item.nome} onCreateNew={() => { setIsDoctorModalOpen(false); router.push("/saude/medicos/novo"); }} createNewLabel="Cadastrar Novo Médico" />
        
        <SelectionModal isOpen={isPharmacyModalOpen} onClose={() => setIsPharmacyModalOpen(false)} onSelect={(item: any) => setFarmaciaId(item.id)} items={farmacias} title="Farmácia / Local de Retirada" renderItem={(item: any) => (<div><p className="font-medium text-ink-primary">{item.nome}</p></div>)} getItemId={(item: any) => item.id!} getItemLabel={(item: any) => item.nome} onCreateNew={() => { setIsPharmacyModalOpen(false); router.push("/saude/locais/novo"); }} createNewLabel="Cadastrar Nova Farmácia" />

        <SelectionModal isOpen={isTratamentoModalOpen} onClose={() => setIsTratamentoModalOpen(false)} onSelect={(item: any) => { if (!tratamentosSelecionados.includes(item.id!)) setTratamentosSelecionados(prev => [...prev, item.id!]); }} items={tratamentos} title="Vincular a Tratamento/CID" renderItem={(item: any) => (<p className="font-medium text-ink-primary">{item.nome}</p>)} getItemId={(item: any) => item.id!} getItemLabel={(item: any) => item.nome} onCreateNew={() => { setIsTratamentoModalOpen(false); setIsCreatingTratamento(true); }} createNewLabel="Novo Tratamento" />

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

        <SelectionModal
          isOpen={isSubstitutoModalOpen}
          onClose={() => setIsSubstitutoModalOpen(false)}
          onSelect={(item: any) => setSubstituidoPorId(item.id)}
          items={medicamentosAtivos}
          title="Foi substituído por..."
          placeholder="Buscar medicamento atual..."
          renderItem={(item: any) => (
            <div>
              <p className="font-medium text-ink-primary">{item.nome}</p>
              <p className="text-xs text-ink-muted">{item.dosagem}</p>
            </div>
          )}
          getItemId={(item: any) => item.id!}
          getItemLabel={(item: any) => item.nome}
          onCreateNew={() => { setIsSubstitutoModalOpen(false); router.push("/saude/medicamentos/novo"); }}
          createNewLabel="Cadastrar Novo Medicamento"
        />

        <BottomSheet isOpen={isCreatingTratamento} onClose={() => { setIsCreatingTratamento(false); setNewTratamentoName(""); }} title="Cadastrar Tratamento" >
          <div className="space-y-4 px-1 pb-2">
            <Input label="Nome do Tratamento / CID" placeholder="Ex: TDAH, Dor Crônica..." value={newTratamentoName} onChange={(e) => setNewTratamentoName(e.target.value)} autoFocus />
            <Button variant="primary" fullWidth onClick={handleCreateTratamento} disabled={isSavingTratamento || !newTratamentoName.trim()} className="flex items-center justify-center gap-2">
              {isSavingTratamento ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} {isSavingTratamento ? "Salvando..." : "Salvar e selecionar"}
            </Button>
          </div>
        </BottomSheet>

        <ConfirmationModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={handleDelete} title="Excluir medicamento" message={`Tem certeza que deseja excluir "${nome}"?`} confirmLabel="Excluir" cancelLabel="Cancelar" isLoading={deleting} type="danger" />
      </main>
    </PageTransition>
  );
}

export default function EditarMedicamentoPage() {
  return <Suspense fallback={<LoadingSkeleton />}><EditarMedicamentoContent /></Suspense>;
}
