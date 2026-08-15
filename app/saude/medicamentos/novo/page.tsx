"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Loader2, Save, Pill, Upload, Camera, X, FileText, Package, Plus, Trash2, Clock,
  Activity, Stethoscope, Droplet, Syringe, StickyNote, Palette, AlertTriangle, ArrowRight, Info, Store,
  Building2, CheckCircle2, ChevronRight, ChevronLeft, DollarSign
} from "lucide-react";
import { usePersons } from "@/hooks/usePersons";
import { useAuth } from "@/hooks/useAuth";
import { useSafeDb } from "@/hooks/useSafeDb";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useMedicos } from "@/hooks/useMedicos";
import { useFarmacias } from "@/hooks/useFarmacias";
import { useHapticFeedback } from "@/lib/haptics";
import { uploadFile } from "@/lib/supabase/storage";
import { suggestRenewalDate, VALIDADE_RECEITA_DIAS, TIPO_RECEITA_LABELS, getLocalTodayISO } from "@/lib/health-utils";
import { scheduleDoseNotifications, requestNotificationPermission } from "@/lib/dose-notifications";
import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import type { Attachment, Document, TipoReceita } from "@/lib/types";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { PageTransition } from "@/components/PageTransition";
import { SelectionModal } from "@/components/SelectionModal";
import { SeletorReceita } from "@/components/saude/SeletorReceita";
import { CalculadoraGotas } from "@/components/saude/CalculadoraGotas";
import { SeletorTratamentoModal } from "@/components/saude/SeletorTratamentoModal";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { sugerirHorarios } from "@/lib/health-insights";
import { useToast } from "@/components/ToastProvider";

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -12 } };

// MÁSCARAS E HELPERS
function mascaraData(value: string) {
  return value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').replace(/(\d{2})(\d)/, '$1/$2').replace(/(\d{4})\d+?$/, '$1');
}
function isoParaBr(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
function brParaIso(br: string) {
  const parts = br.split("/");
  if (parts.length !== 3 || parts[2].length !== 4) return "";
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

const SplitPillIcon = ({ size, fill = "currentColor" }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" fill={fill} />
    <line x1="12" y1="2" x2="12" y2="22" stroke="rgba(0,0,0,0.3)" strokeWidth="2" />
  </svg>
);

const FORMATOS = [
  { id: "comprimido", label: "Inteiro", icon: Pill },
  { id: "partido", label: "Partido", icon: SplitPillIcon },
  { id: "gota", label: "Gotas", icon: Droplet },
  { id: "injecao", label: "Injeção", icon: Syringe },
];

const CORES_DISPONIVEIS = ["#FFFFFF", "#FCA5A5", "#F87171", "#FBBF24", "#34D399", "#60A5FA", "#818CF8", "#A78BFA", "#F472B6", "#9CA3AF"];

export default function NovoMedicamentoPage() {
  const { trigger } = useHapticFeedback();
  const { showToast, showError, showSuccess, showInfo } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const persons = usePersons();
  const { addDocument } = useSafeDb();
  const { addMedicamento } = useMedicamentos();
  const { medicos } = useMedicos();
  const { farmacias } = useFarmacias();

  const hospitaisLocais = useLiveQuery(() => db.table("hospitais").toArray(), []) || [];
  const medicamentosQuery = useLiveQuery(() => db.table("medicamentos").toArray(), []) || [];

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // ================= ESTADOS DO FLUXO EM ETAPAS =================
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  // Etapa 1: O Medicamento
  const [personId, setPersonId] = useState<string>("");
  const [nome, setNome] = useState("");
  const [dosagem, setDosagem] = useState("");
  const [formato, setFormato] = useState("comprimido");
  const [cores, setCores] = useState<string[]>(["#FFFFFF"]);
  const [tipoUso, setTipoUso] = useState<"continuo" | "esporadico" | "sos">("continuo");
  const [vezesAoDia, setVezesAoDia] = useState("1");
  const [primeiroHorario, setPrimeiroHorario] = useState("08:00");
  const [horarios, setHorarios] = useState<string[]>(["08:00"]);
  const [estoqueUnidadePorDose, setEstoqueUnidadePorDose] = useState("1");
  
  // Gotas
  const isGotas = formato === "gota";
  const [mlTotal, setMlTotal] = useState("");
  const [gotasPorMl, setGotasPorMl] = useState("20");
  const [estoqueGotasCalculado, setEstoqueGotasCalculado] = useState(0);

  // Etapa 2: Emissão e Compra
  const [medicoId, setMedicoId] = useState<string>("");
  const [medicoNome, setMedicoNome] = useState("");
  const [estabelecimentoId, setEstabelecimentoId] = useState<string>("");
  const [estabelecimentoNome, setEstabelecimentoNome] = useState("");
  const [farmaciaId, setFarmaciaId] = useState<string>("");
  const [farmaciaNome, setFarmaciaNome] = useState("");
  const [preco, setPreco] = useState("");

  // Etapa 3: Controle
  const [estoqueAtivo, setEstoqueAtivo] = useState(false);
  const [estoqueQuantidade, setEstoqueQuantidade] = useState("");
  const [estoqueDataReferenciaTexto, setEstoqueDataReferenciaTexto] = useState(isoParaBr(new Date().toISOString().slice(0, 10)));
  const [estoqueUnidade, setEstoqueUnidade] = useState("comprimido(s)");
  const [tipoReceita, setTipoReceita] = useState<TipoReceita>("comum");
  const [dataReceitaTexto, setDataReceitaTexto] = useState("");
  const [proximaRenovacaoTexto, setProximaRenovacaoTexto] = useState("");
  const [tratamentosSelecionados, setTratamentosSelecionados] = useState<string[]>([]);
  const [observacoes, setObservacoes] = useState("");

  // Arquivos
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Modais de Seleção
  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [isPharmacyModalOpen, setIsPharmacyModalOpen] = useState(false);
  const [isEstabelecimentoModalOpen, setIsEstabelecimentoModalOpen] = useState(false);
  const [activeEstabelecimentoTab, setActiveEstabelecimentoTab] = useState("hospital");
  const [isTratamentoModalOpen, setIsTratamentoModalOpen] = useState(false);

  // ✅ Estado para o modal de confirmação
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Validações
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [shakeFields, setShakeFields] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // --- INTELIGÊNCIAS DE UX ---
  
  // 1. Verificar Duplicidade em Tempo Real
  const medicamentoDuplicado = useMemo(() => {
    if (nome.length <= 2) return null;
    return medicamentosQuery.find(
      (m: any) => m.nome.toLowerCase() === nome.toLowerCase().trim() && m.status !== "descontinuado"
    ) || null;
  }, [nome, medicamentosQuery]);

  // 2. Preencher cor e pessoa padrão
  useEffect(() => {
    if (persons.length > 0 && !personId) {
      setPersonId(persons[0].id!);
    }
  }, [persons, personId]);

  // Assistente de Horários Automático (Smart Dosage)
  useEffect(() => {
    if (tipoUso === "continuo" && vezesAoDia && primeiroHorario) {
      const novosHorarios = sugerirHorarios(primeiroHorario, Number(vezesAoDia));
      setHorarios(novosHorarios.length > 0 ? novosHorarios : [primeiroHorario]);
    } else if (tipoUso !== "continuo") {
      setHorarios([]);
    }
  }, [vezesAoDia, primeiroHorario, tipoUso]);

  // 3. Atualizar Unidade por dose ao trocar formato
  const handleFormatoChange = (novoFormato: string) => {
    trigger("vibrate");
    setFormato(novoFormato);
    if (novoFormato === "partido") setEstoqueUnidadePorDose("0.5");
    else if (novoFormato !== "gota") setEstoqueUnidadePorDose("1");
    if (novoFormato !== "gota") setEstoqueGotasCalculado(0);
  };

  const toggleCor = (hex: string) => {
    trigger("vibrate");
    setCores(prev => {
      if (prev.includes(hex)) return prev.filter((c) => c !== hex);
      if (prev.length >= 2) return [prev[1], hex];
      return [...prev, hex];
    });
  };

  // 4. Tratamento Completo de Upload
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      trigger("vibrate");
      setLocalFile(file);
      setAttachment({
        id: crypto.randomUUID(),
        url: URL.createObjectURL(file),
        name: file.name,
        type: file.type.startsWith("image") ? "image" : "pdf",
        uploaded_at: new Date().toISOString(),
      });
    }
    e.target.value = "";
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      trigger("vibrate");
      setLocalFile(file);
      setAttachment({
        id: crypto.randomUUID(),
        url: URL.createObjectURL(file),
        name: `receita_${Date.now()}.jpg`,
        type: "image",
        uploaded_at: new Date().toISOString(),
      });
    }
    e.target.value = "";
  };

  const removeAttachment = () => {
    if (attachment?.url.startsWith("blob:")) URL.revokeObjectURL(attachment.url);
    setAttachment(null);
    setLocalFile(null);
    trigger("vibrate");
  };

  // 5. Cálculo de Datas Automáticas
  const handleDataReceitaBlur = () => {
    const isoData = brParaIso(dataReceitaTexto);
    if (!isoData) return;
    const dias = VALIDADE_RECEITA_DIAS[tipoReceita];
    if (dias) {
      const novaData = suggestRenewalDate(isoData, tipoReceita);
      setProximaRenovacaoTexto(isoParaBr(novaData));
    }
  };

  const isReceitaVencida = () => {
    const isoReceita = brParaIso(dataReceitaTexto);
    if (!isoReceita) return false;
    const expDate = new Date(suggestRenewalDate(isoReceita, tipoReceita));
    return expDate < new Date();
  };

  const triggerShake = (fieldNames: string[]) => {
    trigger("error");
    setShakeFields(fieldNames);
    setTimeout(() => setShakeFields([]), 600);
  };

  // ✅ Validação por etapa com verificação de data de renovação
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    const shakeList: string[] = [];

    if (step === 1) {
      if (!personId) { newErrors.personId = "Obrigatório"; shakeList.push("personId"); }
      if (!nome.trim()) { newErrors.nome = "Obrigatório"; shakeList.push("nome"); }
      if (!dosagem.trim()) { newErrors.dosagem = "Obrigatório"; shakeList.push("dosagem"); }
      if (tipoUso === 'continuo' && (!vezesAoDia || Number(vezesAoDia) <= 0)) { newErrors.vezesAoDia = "Obrigatório"; shakeList.push("vezesAoDia"); }
    }
    if (step === 2) {
      if (!farmaciaId && !farmaciaNome) { newErrors.farmacia = "Obrigatório informar onde comprou"; shakeList.push("farmacia"); }
    }
    if (step === 3) {
      if (dataReceitaTexto && dataReceitaTexto.length < 10) { newErrors.dataReceitaTexto = "Data inválida"; shakeList.push("dataReceitaTexto"); }
      // ✅ Validação da data de renovação
      if (!proximaRenovacaoTexto || proximaRenovacaoTexto.length < 10) {
        newErrors.proximaRenovacaoTexto = "Data de renovação inválida";
        shakeList.push("proximaRenovacaoTexto");
      }
      if (estoqueAtivo) {
        if (!estoqueQuantidade || Number(estoqueQuantidade) <= 0) {
          newErrors.estoqueQuantidade = "Faltou quantidade";
          shakeList.push("estoqueQuantidade");
        }
      }
    }

    setErrors(newErrors);
    if (shakeList.length > 0) triggerShake(shakeList);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      trigger("vibrate");
      setCurrentStep(p => Math.min(p + 1, totalSteps));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    trigger("vibrate");
    setCurrentStep(p => Math.max(p - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- RENDERS E ESTILOS ---
  const SelectedFormatIcon = FORMATOS.find((f) => f.id === formato)?.icon || Pill;
  const hasTwoColors = cores.length === 2 && (formato === "comprimido" || formato === "partido");
  const gradientId = `split-novo`;

  // ✅ Função de salvamento extraída para ser chamada pelo modal
  const salvarMedicamento = async () => {
    setShowConfirmModal(false);
    setLoading(true);
    setUploadProgress(0);

    try {
      const dataReceitaISO = brParaIso(dataReceitaTexto);
      const proximaRenovacaoISO = brParaIso(proximaRenovacaoTexto);
      const estoqueDataReferenciaISO = brParaIso(estoqueDataReferenciaTexto);
      const quantidadeEstoqueFinal = isGotas ? (estoqueGotasCalculado > 0 ? estoqueGotasCalculado : Number(estoqueQuantidade) || 0) : Number(estoqueQuantidade) || 0;
      const horariosFiltrados = horarios.filter(Boolean);

      let docId = "";
      if (dataReceitaISO || attachment) {
        const docData: any = {
          user_id: user?.id || "", person_id: personId, category_id: "saude", type: "receita",
          title: `Receita — ${nome.trim()}`, description: observacoes.trim() || undefined,
          metadata: { medication: nome.trim(), dosage: dosagem.trim(), prescription_date: dataReceitaISO, renewal_date: proximaRenovacaoISO, tratamento_ids: tratamentosSelecionados, tipo_receita: tipoReceita, formato, status: "ativo" },
          attachments: attachment ? [attachment] : [], is_favorite: false,
        };

        docId = await addDocument(docData);

        if (localFile && user && attachment) {
          const { url, error } = await uploadFile(user.id, localFile, "saude");
          if (!error && url) {
            await db.documents.update(docId, { attachments: [{ ...attachment, url }], updated_at: new Date().toISOString(), synced: false });
            setUploadProgress(100);
          }
        }
      }

      const medicamentoId = await addMedicamento({
        document_id: docId || undefined,
        person_id: personId,
        nome: nome.trim(),
        dosagem: dosagem.trim(),
        formato,
        cores,
        tipo_uso: tipoUso, // ✅ Envia o tipo de uso para o banco
        medico: selectedMedico?.nome || medicoNome.trim(),
        medico_id: medicoId || undefined,
        estabelecimento_id: estabelecimentoId || undefined,
        farmacia: selectedFarmacia?.nome || farmaciaNome.trim(),
        farmacia_id: farmaciaId || undefined,
        preco: preco ? Number(preco.replace(',', '.')) : undefined,
        data_receita: dataReceitaISO,
        proxima_renovacao: proximaRenovacaoISO,
        observacoes: observacoes.trim() || undefined,
        tipo_receita: tipoReceita,
        tratamento_ids: tratamentosSelecionados,
        status: "ativo",
        estoque_quantidade: estoqueAtivo ? quantidadeEstoqueFinal : undefined,
        estoque_data_referencia: estoqueAtivo ? estoqueDataReferenciaISO : undefined,
        estoque_horarios: tipoUso === 'continuo' && estoqueAtivo ? horariosFiltrados : undefined,
        estoque_unidade_por_dose: estoqueAtivo ? Number(estoqueUnidadePorDose) : undefined,
        estoque_unidade_medida: estoqueAtivo ? (isGotas ? "gota(s)" : estoqueUnidade) : undefined,
      } as any);

      if (estoqueAtivo && tipoUso === 'continuo' && horariosFiltrados.length > 0) {
        const granted = await requestNotificationPermission();
        if (granted) await scheduleDoseNotifications({ id: medicamentoId, nome: nome.trim(), dosagem: dosagem.trim(), estoque_horarios: horariosFiltrados } as any);
      }

      showSuccess("Medicamento cadastrado com sucesso!");
      trigger("success");
      router.replace("/saude");
    } catch (error) {
      console.error("Erro ao salvar medicamento:", error);
      showError("Erro ao salvar medicamento. Tente novamente.");
      trigger("error");
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  // ✅ Novo handleSubmit que exibe o modal de confirmação
  const handleSubmit = async () => {
    if (!validateStep(3)) return;
    
    if (!estoqueAtivo) {
      setShowConfirmModal(true);
      return;
    }
    await salvarMedicamento();
  };

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCameraCapture} />

        <svg width="0" height="0" className="absolute">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="50%" stopColor={cores[0] || "#9CA3AF"} />
              <stop offset="50%" stopColor={cores.length === 2 ? cores[1] : (cores[0] || "#9CA3AF")} />
            </linearGradient>
          </defs>
        </svg>

        {/* HEADER COM PROGRESS BAR */}
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/90 px-5 pt-4 pb-3 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => router.back()} className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95">
                <X size={18} className="text-ink-primary" />
              </button>
              <h1 className="font-display text-lg font-semibold text-ink-primary">Novo Cadastro</h1>
            </div>
            <span className="text-xs font-bold text-ice bg-ice/10 px-3 py-1 rounded-full">Etapa {currentStep} de {totalSteps}</span>
          </div>
          
          <div className="flex gap-2 w-full h-1.5 rounded-full overflow-hidden bg-surface-raised">
            {[1, 2, 3].map((step) => (
              <div key={step} className={`h-full flex-1 transition-colors duration-300 ${step <= currentStep ? 'bg-ice' : 'bg-surface-border/30'}`} />
            ))}
          </div>
        </header>

        <section className="px-5 pt-6 space-y-6">
          <AnimatePresence mode="wait">
            
            {/* ================= ETAPA 1 ================= */}
            {currentStep === 1 && (
              <motion.div key="step1" variants={fadeUp} initial="initial" animate="animate" exit="exit" className="space-y-6">
                
                <div className={`rounded-[28px] border bg-surface p-5 shadow-sm transition-all ${shakeFields.includes('personId') ? 'animate-shake border-coral/80' : 'border-surface-border/50'}`}>
                  <p className="mb-3 text-sm font-medium text-ink-primary">Para quem é? <span className="text-coral">*</span></p>
                  <div className="flex flex-wrap gap-2">
                    {persons.map((p: any) => (
                      <button type="button" key={p.id} onClick={() => { trigger("vibrate"); setPersonId(p.id!); }} className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${personId === p.id ? "border-ice bg-ice/12 text-ice shadow-sm" : "border-surface-border/50 bg-surface-raised text-ink-muted"}`}>{p.name}</button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm">
                  <div className={`transition-all ${shakeFields.includes('nome') ? 'animate-shake' : ''}`}>
                    <Input label="Medicamento" placeholder="Ex: Sertralina" value={nome} onChange={(e) => setNome(e.target.value)} error={errors.nome} />
                  </div>
                  
                  <AnimatePresence>
                    {medicamentoDuplicado && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                        <div className="flex items-center justify-between rounded-xl bg-amber-400/10 border border-amber-400/30 p-3 mt-1">
                          <div className="flex items-center gap-2 text-amber-400 text-xs font-medium"><AlertTriangle size={14} /> Você já cadastrou este remédio.</div>
                          <button onClick={() => router.push(`/saude/medicamentos/editar?id=${medicamentoDuplicado.id}`)} className="text-[10px] font-bold text-void bg-amber-400 px-2.5 py-1.5 rounded-lg flex items-center gap-1">Editar <ArrowRight size={10}/></button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className={`transition-all ${shakeFields.includes('dosagem') ? 'animate-shake' : ''}`}>
                    <Input label={isGotas ? "Dosagem (ex: 20 gotas/ml)" : "Dosagem (ex: 50mg)"} value={dosagem} onChange={(e) => setDosagem(e.target.value)} error={errors.dosagem} />
                  </div>
                </div>

                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-2"><Palette size={16} className="text-ice" /><h3 className="text-sm font-semibold text-ink-primary">Identidade Visual</h3></div>
                  <div className="mb-5 grid grid-cols-4 gap-2">
                    {FORMATOS.map((item) => {
                      const isActive = formato === item.id; const Icon = item.icon;
                      return (
                        <button type="button" key={item.id} onClick={() => handleFormatoChange(item.id)} className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border py-3 transition-all ${isActive ? "border-ice bg-ice/15 text-ice" : "border-surface-border/40 bg-surface-raised text-ink-muted"}`}>
                          <Icon size={20} fill={isActive ? "currentColor" : "none"} strokeWidth={isActive ? 0 : 2} />
                          <span className="text-[10px] font-medium">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="mb-2 text-xs font-medium text-ink-muted">Cores (Até 2 para pílulas)</p>
                  <div className="flex flex-wrap gap-3">
                    {CORES_DISPONIVEIS.map((hex) => (
                      <button type="button" key={hex} onClick={() => toggleCor(hex)} className={`h-8 w-8 rounded-full border-2 transition-transform ${cores.includes(hex) ? "scale-110 border-ice" : "border-transparent"}`} style={{ backgroundColor: hex }} />
                    ))}
                  </div>
                  
                  <div className="mt-4 flex justify-center">
                    <div className="flex h-16 w-24 items-center justify-center rounded-2xl border border-surface-border bg-void/50 shadow-inner">
                      <SelectedFormatIcon size={32} fill={hasTwoColors ? `url(#${gradientId})` : (cores[0] || "#9CA3AF")} stroke="none" />
                    </div>
                  </div>
                </div>

                {/* SMART DOSAGE: Uso Contínuo vs SOS */}
                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-2"><Clock size={16} className="text-ice" /><h3 className="text-sm font-semibold text-ink-primary">Posologia & Uso</h3></div>
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <button type="button" onClick={() => { trigger("vibrate"); setTipoUso("continuo"); }} className={`rounded-xl border py-3 text-sm font-bold transition-all ${tipoUso === "continuo" ? "border-ice bg-ice/10 text-ice" : "border-surface-border/50 bg-surface-raised text-ink-muted"}`}>Contínuo (Diário)</button>
                    <button type="button" onClick={() => { trigger("vibrate"); setTipoUso("esporadico"); }} className={`rounded-xl border py-3 text-sm font-bold transition-all ${tipoUso === "esporadico" ? "border-amber-400 bg-amber-400/10 text-amber-400" : "border-surface-border/50 bg-surface-raised text-ink-muted"}`}>Uso Esporádico / SOS</button>
                  </div>

                  {tipoUso === "continuo" && (
                    <div className="space-y-4 pt-4 border-t border-surface-border/40">
                      <div className="grid grid-cols-2 gap-3">
                        <div className={`transition-all ${shakeFields.includes('vezesAoDia') ? 'animate-shake' : ''}`}>
                          <Input label="Doses por dia" type="number" inputMode="numeric" placeholder="Ex: 2" value={vezesAoDia} onChange={(e) => setVezesAoDia(e.target.value)} error={errors.vezesAoDia} />
                        </div>
                        <Input label="1º Horário" type="time" value={primeiroHorario} onChange={(e) => setPrimeiroHorario(e.target.value)} />
                      </div>
                      <div className="rounded-xl bg-surface-raised p-4 border border-surface-border">
                        <p className="text-xs text-ink-muted mb-2 font-medium uppercase tracking-wide">Horários Sugeridos pelo App</p>
                        <div className="flex flex-wrap gap-2">
                          {horarios.map((h, i) => (
                            <span key={i} className="bg-void border border-surface-border px-3 py-1.5 rounded-lg text-sm font-mono text-ice font-bold">{h}</span>
                          ))}
                        </div>
                        <p className="text-[10px] text-ink-faint mt-2">Nós te lembraremos automaticamente nesses horários.</p>
                      </div>
                    </div>
                  )}
                  {tipoUso !== "continuo" && (
                     <p className="text-xs text-ink-muted text-center p-3 bg-surface-raised rounded-xl">O app não emitirá alarmes diários, mas você poderá registrar doses avulsas para abater do estoque quando usar.</p>
                  )}
                </div>

              </motion.div>
            )}

            {/* ================= ETAPA 2 ================= */}
            {currentStep === 2 && (
              <motion.div key="step2" variants={fadeUp} initial="initial" animate="animate" exit="exit" className="space-y-6">
                
                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm space-y-4">
                  <div className="mb-2 flex items-center gap-2"><Store size={16} className="text-ice" /><h3 className="text-sm font-semibold text-ink-primary">Aquisição</h3></div>
                  <div className={`transition-all ${shakeFields.includes('farmacia') ? 'animate-shake' : ''}`}>
                    <label className="mb-1.5 block text-sm font-medium text-ink-primary">Em qual farmácia comprou? <span className="text-coral">*</span></label>
                    <button type="button" onClick={() => setIsPharmacyModalOpen(true)} className={`flex w-full items-center justify-between rounded-2xl border bg-surface-raised px-4 py-3.5 text-left transition-all ${errors.farmacia ? "border-coral/50" : "border-surface-border/50 hover:border-ice/50"}`}>
                      <span className="truncate font-medium text-ink-primary">{farmaciaNome || "Selecionar farmácia..."}</span>
                      <span className="text-xs font-bold text-ice">Selecionar</span>
                    </button>
                    {errors.farmacia && <p className="text-coral text-xs mt-1">{errors.farmacia}</p>}
                  </div>
                  <div>
                    <Input label="Valor pago (R$)" type="number" inputMode="decimal" placeholder="0,00" value={preco} onChange={(e) => setPreco(e.target.value)} icon={<DollarSign size={16} className="text-emerald-400"/>} />
                  </div>
                </div>

                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm space-y-4">
                  <div className="mb-2 flex items-center gap-2"><Stethoscope size={16} className="text-ice" /><h3 className="text-sm font-semibold text-ink-primary">Rede de Apoio (Opcional)</h3></div>
                  
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-ink-muted">Médico Prescritor</label>
                    <button type="button" onClick={() => setIsDoctorModalOpen(true)} className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left">
                      <span className="block truncate font-medium text-ink-primary">{medicoNome || "Vincular médico..."}</span>
                      <span className="text-xs font-bold text-ice">Alterar</span>
                    </button>
                  </div>
                  
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-ink-muted">Hospital / Clínica</label>
                    <button type="button" onClick={() => setIsEstabelecimentoModalOpen(true)} className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left">
                      <span className="truncate font-medium text-ink-primary">{estabelecimentoNome || "Vincular local..."}</span>
                      <span className="text-xs font-bold text-ice">Alterar</span>
                    </button>
                  </div>
                </div>

              </motion.div>
            )}

            {/* ================= ETAPA 3 ================= */}
            {currentStep === 3 && (
              <motion.div key="step3" variants={fadeUp} initial="initial" animate="animate" exit="exit" className="space-y-6">
                
                <CalculadoraGotas isAtivo={isGotas} onToggle={(ativo) => { setFormato(ativo ? "gota" : "comprimido"); }} mlTotal={mlTotal} setMlTotal={setMlTotal} gotasPorMl={gotasPorMl} setGotasPorMl={setGotasPorMl} onEstoqueCalculado={(v) => { setEstoqueGotasCalculado(v); if(estoqueAtivo) setEstoqueQuantidade(String(v)); }} />

                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2"><Package size={16} className="text-ice" /><h3 className="text-sm font-semibold text-ink-primary">Controle de Estoque</h3></div>
                    <button onClick={() => setEstoqueAtivo(!estoqueAtivo)} className={`h-6 w-11 rounded-full p-0.5 transition-colors ${estoqueAtivo ? "bg-ice" : "bg-surface-raised border border-surface-border"}`}>
                      <div className={`h-5 w-5 rounded-full bg-void shadow-sm transition-transform ${estoqueAtivo ? "translate-x-5" : ""}`} />
                    </button>
                  </div>
                  
                  <AnimatePresence>
                  {estoqueAtivo && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className={`transition-all ${shakeFields.includes('estoqueQuantidade') ? 'animate-shake' : ''}`}>
                          <Input label="Qtd Comprada" type="number" inputMode="numeric" placeholder="Ex: 30" value={estoqueQuantidade} onChange={(e) => setEstoqueQuantidade(e.target.value)} />
                        </div>
                        <Input label="Dose gasta (ex: 1)" type="number" inputMode="decimal" step="0.5" value={estoqueUnidadePorDose} onChange={(e) => setEstoqueUnidadePorDose(e.target.value)} />
                      </div>
                      <Input label="Data da Compra/Contagem" value={estoqueDataReferenciaTexto} onChange={(e) => setEstoqueDataReferenciaTexto(mascaraData(e.target.value))} maxLength={10} inputMode="numeric" />
                    </motion.div>
                  )}
                  </AnimatePresence>
                </div>

                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-2"><FileText size={16} className="text-ice" /><h3 className="text-sm font-semibold text-ink-primary">Receita & Vínculos</h3></div>
                  
                  <SeletorReceita selected={tipoReceita} onChange={setTipoReceita} />
                  <div className="grid grid-cols-2 gap-3 mt-4 mb-5">
                    <Input label="Data da receita" placeholder="DD/MM/AAAA" value={dataReceitaTexto} onChange={(e) => setDataReceitaTexto(mascaraData(e.target.value))} onBlur={handleDataReceitaBlur} maxLength={10} inputMode="numeric" />
                    <Input label="Vencimento" placeholder="DD/MM/AAAA" value={proximaRenovacaoTexto} onChange={(e) => setProximaRenovacaoTexto(mascaraData(e.target.value))} maxLength={10} inputMode="numeric" />
                  </div>
                  
                  <AnimatePresence>
                    {isReceitaVencida() && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                        <div className="mt-3 flex items-start gap-2 rounded-xl bg-coral/10 border border-coral/30 p-3 text-coral">
                          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                          <p className="text-[11px] font-medium leading-tight">Receita antiga/vencida. O cadastro será salvo apenas para histórico de tratamento.</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {!attachment ? (
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-surface-border/60 bg-surface-raised px-4 py-4 text-ink-muted hover:border-ice/40 hover:text-ice"><Upload size={18} /><span className="text-xs font-semibold">Anexar Arquivo</span></button>
                      <button type="button" onClick={() => cameraInputRef.current?.click()} className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-surface-border/60 bg-surface-raised px-4 py-4 text-ink-muted hover:border-ice/40 hover:text-ice"><Camera size={18} /><span className="text-xs font-semibold">Tirar Foto</span></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 rounded-2xl border border-surface-border/50 bg-surface-raised p-3 mt-4">
                      <div className="flex h-11 w-11 overflow-hidden rounded-xl bg-surface">{attachment.type === "image" ? <img src={attachment.url} className="h-full w-full object-cover" /> : <FileText size={20} className="text-coral m-auto" />}</div>
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-ink-primary">{attachment.name}</p></div>
                      <button type="button" onClick={removeAttachment} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coral/10 text-coral"><X size={16} /></button>
                    </div>
                  )}
                  {uploadProgress > 0 && <div className="mt-3 h-1.5 rounded-full bg-surface-raised"><div className="h-full rounded-full bg-ice transition-all" style={{ width: `${uploadProgress}%` }} /></div>}
                  
                  <div className="mt-6 pt-5 border-t border-surface-border/40">
                    <button type="button" onClick={() => setIsTratamentoModalOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-surface-border bg-surface-raised py-3 text-sm font-bold text-ink-primary transition-colors hover:border-ice/50">
                      <Activity size={16} className="text-violet-400"/> {tratamentosSelecionados.length > 0 ? `${tratamentosSelecionados.length} Quadro(s) vinculado(s)` : "Vincular Tratamento/CID"}
                    </button>
                  </div>
                  
                  <div className="mt-4">
                    <TextArea label="Anotações" placeholder="Posologia complexa, dicas..." value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
                  </div>
                </div>

              </motion.div>
            )}

          </AnimatePresence>
        </section>

        {/* ================= FOOTER FLUTUANTE DE NAVEGAÇÃO ================= */}
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-surface-border/40 bg-void/90 p-5 backdrop-blur-xl pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="flex gap-3 max-w-2xl mx-auto">
            {currentStep > 1 && (
              <Button type="button" variant="secondary" onClick={prevStep} className="flex-1 max-w-[100px] flex items-center justify-center">
                <ChevronLeft size={20} />
              </Button>
            )}
            
            {currentStep < totalSteps ? (
              <Button type="button" onClick={nextStep} className="flex-1 flex items-center justify-center gap-2 shadow-lg shadow-ice/20 h-14 rounded-2xl text-base font-bold">
                Avançar <ChevronRight size={20} />
              </Button>
            ) : (
              <Button type="button" onClick={handleSubmit} disabled={loading} className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 h-14 rounded-2xl text-base font-bold">
                {loading ? <><Loader2 size={20} className="animate-spin" /> Salvando...</> : <><CheckCircle2 size={20} /> Concluir Cadastro</>}
              </Button>
            )}
          </div>
        </div>

        {/* ================= MODAIS ================= */}
        
        <SelectionModal 
          isOpen={isPharmacyModalOpen} 
          onClose={() => setIsPharmacyModalOpen(false)} 
          title="Selecionar Farmácia" 
          items={farmacias} 
          getItemId={(item: any) => item.id!} 
          getItemLabel={(item: any) => item.nome} 
          enableQuickCreate
          onQuickCreate={async (name) => {
            const id = await db.table("farmacias").add({ user_id: user?.id, nome: name, created_at: new Date().toISOString(), synced: false });
            return { id, nome: name };
          }}
          onSelect={(item: any) => { setFarmaciaId(item.id); setFarmaciaNome(item.nome); setIsPharmacyModalOpen(false); }} 
          renderItem={(item: any) => (
            <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-400/10 text-amber-400 shrink-0"><Store size={18} /></div><div className="text-left"><p className="font-semibold text-ink-primary">{item.nome}</p></div></div>
          )}
        />

        <SelectionModal 
          isOpen={isDoctorModalOpen} 
          onClose={() => setIsDoctorModalOpen(false)} 
          title="Médico Prescritor" 
          items={medicos} 
          getItemId={(item: any) => item.id!} 
          getItemLabel={(item: any) => item.nome} 
          enableQuickCreate
          onQuickCreate={async (name) => {
            const id = await db.table("medicos").add({ user_id: user?.id, nome: name, created_at: new Date().toISOString(), synced: false });
            return { id, nome: name };
          }}
          onSelect={(item: any) => { setMedicoId(item.id); setMedicoNome(item.nome); setIsDoctorModalOpen(false); }} 
          renderItem={(item: any) => (
            <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-ice/10 text-ice shrink-0"><Stethoscope size={18} /></div><div className="text-left"><p className="font-semibold text-ink-primary">{item.nome}</p></div></div>
          )}
        />

        <SelectionModal 
          isOpen={isEstabelecimentoModalOpen} 
          onClose={() => setIsEstabelecimentoModalOpen(false)} 
          title="Selecionar Local" 
          activeTab={activeEstabelecimentoTab}
          onTabChange={setActiveEstabelecimentoTab}
          tabs={[
            { id: 'hospital', label: 'Hospitais', activeColor: 'bg-coral text-void border-transparent' },
            { id: 'clinica', label: 'Postos/Clínicas', activeColor: 'bg-emerald-400 text-void border-transparent' }
          ]}
          items={hospitaisLocais.filter(h => activeEstabelecimentoTab === 'hospital' ? h.tipo === 'hospital' : h.tipo !== 'hospital')} 
          getItemId={(item: any) => item.id!} 
          getItemLabel={(item: any) => item.nome} 
          enableQuickCreate
          onQuickCreate={async (name, tabId) => {
            const id = await db.table("hospitais").add({ user_id: user?.id, nome: name, tipo: tabId, created_at: new Date().toISOString(), synced: false });
            return { id, nome: name, tipo: tabId };
          }}
          onSelect={(item: any) => { setEstabelecimentoId(item.id); setEstabelecimentoNome(item.nome); setIsEstabelecimentoModalOpen(false); }} 
          renderItem={(item: any) => (
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full shrink-0 ${item.tipo === 'hospital' ? 'bg-coral/10 text-coral' : 'bg-emerald-400/10 text-emerald-400'}`}>
                <Building2 size={18} />
              </div>
              <div className="text-left">
                <p className="font-semibold text-ink-primary">{item.nome}</p>
                <p className="text-xs text-ink-muted uppercase">{item.tipo === 'hospital' ? 'Hospital' : 'Clínica/Posto'}</p>
              </div>
            </div>
          )}
        />
        
        <SeletorTratamentoModal isOpen={isTratamentoModalOpen} onClose={() => setIsTratamentoModalOpen(false)} selectedIds={tratamentosSelecionados} onChange={setTratamentosSelecionados} personId={personId} />

        {/* ✅ MODAL DE CONFIRMAÇÃO PARA SALVAR SEM ESTOQUE */}
        <ConfirmationModal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={salvarMedicamento}
          title="Salvar sem estoque?"
          message="Você não preencheu o controle de estoque. Deseja salvar o medicamento apenas como histórico de receita?"
          confirmLabel="Salvar mesmo assim"
          cancelLabel="Voltar e preencher"
          type="warning"
        />

      </main>
    </PageTransition>
  );
}