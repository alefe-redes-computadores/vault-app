// app/saude/medicamentos/novo/page.tsx
"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, Save, Pill, Upload, Camera, X, FileText, Package, Plus, Clock,
  Activity, Stethoscope, Droplet, Syringe, StickyNote, Palette, AlertTriangle, Store,
  Building2, MapPin, CheckCircle2, ChevronRight, ChevronLeft, DollarSign, TrendingUp, Sparkles,
} from "lucide-react";
import { usePersons } from "@/hooks/usePersons";
import { useAuth } from "@/hooks/useAuth";
import { useSafeDb } from "@/hooks/useSafeDb";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useMedicos } from "@/hooks/useMedicos";
import { useFarmacias } from "@/hooks/useFarmacias";
import { useHospitais } from "@/hooks/useHospitais";
import { useLocais } from "@/hooks/useLocais";
import { useTratamentos } from "@/hooks/useTratamentos";
import { useHapticFeedback } from "@/lib/haptics";
import { useToast } from "@/components/ToastProvider";
import { uploadFile } from "@/lib/supabase/storage";
import { suggestRenewalDate, VALIDADE_RECEITA_DIAS, getLocalTodayISO } from "@/lib/health-utils";
import { scheduleDoseNotifications, requestNotificationPermission } from "@/lib/dose-notifications";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { PageTransition } from "@/components/PageTransition";
import { SelectionModal } from "@/components/SelectionModal";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { SeletorReceita } from "@/components/saude/SeletorReceita";
import { CalculadoraGotas } from "@/components/saude/CalculadoraGotas";
import { SeletorTratamentoModal } from "@/components/saude/SeletorTratamentoModal";
import { sugerirHorarios } from "@/lib/health-insights";
import { FloatingSpinner } from "@/components/loading/FloatingSpinner";
import type { Attachment, Document, TipoReceita, Person, Medico, Farmacia, Hospital, LocalSaude, Medicamento } from "@/lib/types";

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -12 } };

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

const SplitPillIcon = ({ size, fill = "currentColor" }: { size: number; fill?: string }) => (
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
  const { showToast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const persons = usePersons() as Person[];
  const { addDocument, updateDocument } = useSafeDb();
  const { addMedicamento, medicamentos: medicamentosList } = useMedicamentos();
  const { medicos, addMedico } = useMedicos();
  const { farmacias, addFarmacia } = useFarmacias();
  const { hospitais, addHospital } = useHospitais();
  const { locais, addLocal } = useLocais();
  const { tratamentos } = useTratamentos();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

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

  const isGotas = formato === "gota";
  const [mlTotal, setMlTotal] = useState("");
  const [gotasPorMl, setGotasPorMl] = useState("20");
  const [estoqueGotasCalculado, setEstoqueGotasCalculado] = useState(0);

  const [medicoId, setMedicoId] = useState<string>("");
  const [medicoNome, setMedicoNome] = useState("");
  const [hospitalId, setHospitalId] = useState<string>("");
  const [hospitalNome, setHospitalNome] = useState("");
  const [localId, setLocalId] = useState<string>("");
  const [localNome, setLocalNome] = useState("");
  const [farmaciaId, setFarmaciaId] = useState<string>("");
  const [farmaciaNome, setFarmaciaNome] = useState("");
  const [preco, setPreco] = useState("");

  const [estoqueAtivo, setEstoqueAtivo] = useState(false);
  const [estoqueQuantidade, setEstoqueQuantidade] = useState("");
  const [estoqueDataReferenciaTexto, setEstoqueDataReferenciaTexto] = useState(isoParaBr(new Date().toISOString().slice(0, 10)));
  const [estoqueUnidade, setEstoqueUnidade] = useState("comprimido(s)");
  const [tipoReceita, setTipoReceita] = useState<TipoReceita>("comum");
  const [dataReceitaTexto, setDataReceitaTexto] = useState("");
  const [proximaRenovacaoTexto, setProximaRenovacaoTexto] = useState("");
  const [tratamentosSelecionados, setTratamentosSelecionados] = useState<string[]>([]);
  const [observacoes, setObservacoes] = useState("");

  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [isPharmacyModalOpen, setIsPharmacyModalOpen] = useState(false);
  const [isHospitalModalOpen, setIsHospitalModalOpen] = useState(false);
  const [isLocalModalOpen, setIsLocalModalOpen] = useState(false);
  const [isTratamentoModalOpen, setIsTratamentoModalOpen] = useState(false);
  const [showDesativarEstoqueModal, setShowDesativarEstoqueModal] = useState(false);

  const [isTypingName, setIsTypingName] = useState(false);
  const [isRecognized, setIsRecognized] = useState(false);
  const [showDuplicateActionModal, setShowDuplicateActionModal] = useState(false);
  const [selectedDuplicate, setSelectedDuplicate] = useState<Medicamento | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [shakeFields, setShakeFields] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (persons.length > 0 && !personId) setPersonId(persons[0].id!);
  }, [persons, personId]);

  const suggestions = useMemo(() => {
    if (nome.length < 2 || !isTypingName) return [];
    return medicamentosList.filter((m: Medicamento) =>
      m.nome.toLowerCase().includes(nome.toLowerCase()) &&
      m.status !== "descontinuado"
    ).slice(0, 4);
  }, [nome, medicamentosList, isTypingName]);

  const handleSuggestionClick = (med: Medicamento) => {
    trigger("vibrate");
    setNome(med.nome);
    setIsTypingName(false);
    setSelectedDuplicate(med);
    setShowDuplicateActionModal(true);
  };

  useEffect(() => {
    if (tipoUso === "continuo" && vezesAoDia && primeiroHorario) {
      const novosHorarios = sugerirHorarios(primeiroHorario, Number(vezesAoDia));
      setHorarios(novosHorarios.length > 0 ? novosHorarios : [primeiroHorario]);
    } else if (tipoUso !== "continuo") {
      setHorarios([]);
    }
  }, [vezesAoDia, primeiroHorario, tipoUso]);

  const toggleCor = (hex: string) => {
    trigger("vibrate");
    setCores(prev => {
      if (prev.includes(hex)) return prev.filter((c) => c !== hex);
      if (prev.length >= 2) return [prev[1], hex];
      return [...prev, hex];
    });
  };

  const handleFormatoChange = (novoFormato: string) => {
    trigger("vibrate");
    setFormato(novoFormato);
    if (novoFormato === "partido") setEstoqueUnidadePorDose("0.5");
    else if (novoFormato !== "gota") setEstoqueUnidadePorDose("1");
    if (novoFormato !== "gota") setEstoqueGotasCalculado(0);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      trigger("vibrate");
      setLocalFile(file);
      setAttachment({ id: crypto.randomUUID(), url: URL.createObjectURL(file), name: file.name, type: file.type.startsWith("image") ? "image" : "pdf", uploaded_at: new Date().toISOString() });
    }
    e.target.value = "";
  };

  const removeAttachment = () => {
    if (attachment?.url.startsWith("blob:")) URL.revokeObjectURL(attachment.url);
    setAttachment(null);
    setLocalFile(null);
    trigger("vibrate");
  };

  const handleDataReceitaBlur = () => {
    const isoData = brParaIso(dataReceitaTexto);
    if (!isoData) return;
    const dias = VALIDADE_RECEITA_DIAS[tipoReceita];
    if (dias) {
      const novaData = suggestRenewalDate(isoData, tipoReceita);
      setProximaRenovacaoTexto(isoParaBr(novaData));
    }
  };

  const triggerShake = (fieldNames: string[]) => {
    trigger("error");
    setShakeFields(fieldNames);
    setTimeout(() => setShakeFields([]), 600);
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    const shakeList: string[] = [];

    if (step === 1) {
      if (!personId) { newErrors.personId = "Obrigatório"; shakeList.push("personId"); }
      if (!nome.trim()) { newErrors.nome = "Obrigatório"; shakeList.push("nome"); }
      if (!dosagem.trim()) { newErrors.dosagem = "Obrigatório"; shakeList.push("dosagem"); }
      if (tipoUso === 'continuo' && (!vezesAoDia || Number(vezesAoDia) <= 0)) { newErrors.vezesAoDia = "Obrigatório"; shakeList.push("vezesAoDia"); }

      const exactDuplicate = medicamentosList.find((m: Medicamento) =>
        m.nome.toLowerCase() === nome.toLowerCase().trim() &&
        m.dosagem.toLowerCase() === dosagem.toLowerCase().trim() &&
        m.person_id === personId &&
        m.status !== "descontinuado"
      );
      if (exactDuplicate) {
        newErrors.nome = "Remédio exato já cadastrado";
        shakeList.push("nome");
        trigger("error");
      }
    }
    if (step === 3) {
      if (dataReceitaTexto && dataReceitaTexto.length < 10) { newErrors.dataReceitaTexto = "Data inválida"; shakeList.push("dataReceitaTexto"); }
      if (proximaRenovacaoTexto && proximaRenovacaoTexto.length < 10) { newErrors.proximaRenovacaoTexto = "Data inválida"; shakeList.push("proximaRenovacaoTexto"); }
      if (estoqueAtivo) {
        if (!estoqueQuantidade || Number(estoqueQuantidade) <= 0) { newErrors.estoqueQuantidade = "Faltou quantidade"; shakeList.push("estoqueQuantidade"); }
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

  const toggleEstoque = () => {
    trigger("vibrate");
    if (estoqueAtivo && (Number(estoqueQuantidade) > 0 || horarios.filter(Boolean).length > 0)) {
      setShowDesativarEstoqueModal(true);
      return;
    }
    setEstoqueAtivo(!estoqueAtivo);
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;
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
        const docData: Omit<Document, 'id' | 'created_at' | 'updated_at' | 'synced'> = {
          user_id: user?.id || "",
          person_id: personId,
          category_id: "saude",
          type: "receita",
          title: `Receita — ${nome.trim()}`,
          description: observacoes.trim() || undefined,
          metadata: {
            medication: nome.trim(),
            dosage: dosagem.trim(),
            prescription_date: dataReceitaISO,
            renewal_date: proximaRenovacaoISO,
            tratamento_ids: tratamentosSelecionados,
            tipo_receita: tipoReceita,
            formato,
            status: "ativo",
          },
          attachments: attachment ? [attachment] : [],
          is_favorite: false,
        };

        docId = await addDocument(docData);

        if (localFile && user && attachment) {
          const { url, error } = await uploadFile(user.id, localFile, "saude");
          if (!error && url) {
            await updateDocument(docId, { attachments: [{ ...attachment, url }] });
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
        tipo_uso: tipoUso,
        medico: medicoNome?.trim() || "",
        medico_id: medicoId || undefined,
        hospital_id: hospitalId || undefined,
        local_id: localId || undefined,
        farmacia: farmaciaNome?.trim() || "",
        farmacia_id: farmaciaId || undefined,
        preco: preco ? Number(preco.replace(',', '.')) : undefined,
        data_receita: dataReceitaISO,
        proxima_renovacao: proximaRenovacaoISO,
        observacoes: observacoes?.trim() || undefined,
        tipo_receita: tipoReceita,
        tratamento_ids: tratamentosSelecionados,
        status: "ativo",
        estoque_quantidade: estoqueAtivo ? quantidadeEstoqueFinal : undefined,
        estoque_data_referencia: estoqueAtivo ? estoqueDataReferenciaISO : undefined,
        estoque_horarios: tipoUso === 'continuo' && estoqueAtivo ? horariosFiltrados : undefined,
        estoque_unidade_por_dose: estoqueAtivo ? Number(estoqueUnidadePorDose) : undefined,
        estoque_unidade_medida: estoqueAtivo ? (isGotas ? "gota(s)" : estoqueUnidade) : undefined,
      });

      if (estoqueAtivo && tipoUso === 'continuo' && horariosFiltrados.length > 0) {
        const granted = await requestNotificationPermission();
        if (granted) await scheduleDoseNotifications({ id: medicamentoId, nome: nome.trim(), dosagem: dosagem.trim(), estoque_horarios: horariosFiltrados });
      }

      trigger("success");
      showToast("Medicamento cadastrado com sucesso", "success");
      router.back();
    } catch (error) {
      trigger("error");
      showToast("Erro ao cadastrar medicamento", "error");
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const SelectedFormatIcon = FORMATOS.find((f) => f.id === formato)?.icon || Pill;
  const hasTwoColors = cores.length === 2 && (formato === "comprimido" || formato === "partido");
  const gradientId = `split-novo`;
  const getPersonName = (pId: string) => persons.find((p: Person) => p.id === pId)?.name || "Alguém";

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={() => {}} />

        <svg width="0" height="0" className="absolute"><defs><linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="50%" stopColor={cores[0] || "#9CA3AF"} /><stop offset="50%" stopColor={cores.length === 2 ? cores[1] : (cores[0] || "#9CA3AF")} /></linearGradient></defs></svg>

        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/90 px-5 pt-4 pb-3 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => router.back()} className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95"><X size={18} className="text-ink-primary" /></button>
              <h1 className="font-display text-lg font-semibold text-ink-primary">Novo Cadastro</h1>
            </div>
            <span className="text-xs font-bold text-ice bg-ice/10 px-3 py-1 rounded-full">Etapa {currentStep} de {totalSteps}</span>
          </div>
          <div className="flex gap-2 w-full h-1.5 rounded-full overflow-hidden bg-surface-raised">
            {[1, 2, 3].map((step) => ( <div key={step} className={`h-full flex-1 transition-colors duration-300 ${step <= currentStep ? 'bg-ice' : 'bg-surface-border/30'}`} /> ))}
          </div>
        </header>

        <section className="px-5 pt-6 space-y-6">
          <AnimatePresence mode="wait">

            {currentStep === 1 && (
              <motion.div key="step1" variants={fadeUp} initial="initial" animate="animate" exit="exit" className="space-y-6">

                <div className={`rounded-[28px] border bg-surface p-5 shadow-sm transition-all ${shakeFields.includes('personId') ? 'animate-shake border-coral/80' : 'border-surface-border/50'}`}>
                  <p className="mb-3 text-sm font-medium text-ink-primary">Para quem é? <span className="text-coral">*</span></p>
                  <div className="flex flex-wrap gap-2">
                    {persons.map((p: Person) => (
                      <button type="button" key={p.id} onClick={() => { trigger("vibrate"); setPersonId(p.id!); }} className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${personId === p.id ? "border-ice bg-ice/12 text-ice shadow-sm" : "border-surface-border/50 bg-surface-raised text-ink-muted"}`}>{p.name}</button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm">
                  <div className={`relative transition-all ${shakeFields.includes('nome') ? 'animate-shake' : ''}`}>
                    <Input
                      label="Medicamento"
                      placeholder="Ex: Sertralina"
                      value={nome}
                      onChange={(e) => { setNome(e.target.value); setIsTypingName(true); setIsRecognized(false); }}
                      onFocus={() => setIsTypingName(true)}
                      error={errors.nome}
                    />

                    <AnimatePresence>
                      {isRecognized && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                          <p className="text-[10px] text-emerald-400 mt-1.5 flex items-center gap-1 font-medium ml-1"><Sparkles size={12}/> Reconhecido. Prosseguindo como nova variação.</p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <AnimatePresence>
                      {suggestions.length > 0 && isTypingName && (
                        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="absolute z-10 w-full mt-2 rounded-2xl border border-surface-border/60 bg-surface shadow-xl overflow-hidden backdrop-blur-xl">
                          <div className="p-2 bg-surface-raised/50 border-b border-surface-border/40">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted ml-2">Já Cadastrados</span>
                          </div>
                          {suggestions.map((med: Medicamento) => (
                            <button key={med.id} type="button" onClick={() => handleSuggestionClick(med)} className="flex items-center gap-3 w-full p-3 text-left border-b border-surface-border/40 last:border-0 hover:bg-surface-raised transition-colors">
                              <div className="h-8 w-8 rounded-full bg-ice/10 flex items-center justify-center text-ice shrink-0"><Pill size={14}/></div>
                              <div><p className="font-semibold text-ink-primary text-sm leading-tight">{med.nome}</p><p className="text-xs text-ink-muted mt-0.5">{med.dosagem} • {getPersonName(med.person_id || "")}</p></div>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

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

                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-2"><Clock size={16} className="text-ice" /><h3 className="text-sm font-semibold text-ink-primary">Posologia & Uso</h3></div>
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <button type="button" onClick={() => { trigger("vibrate"); setTipoUso("continuo"); }} className={`rounded-xl border py-3 text-sm font-bold transition-all ${tipoUso === "continuo" ? "border-ice bg-ice/10 text-ice" : "border-surface-border/50 bg-surface-raised text-ink-muted"}`}>Contínuo (Diário)</button>
                    <button type="button" onClick={() => { trigger("vibrate"); setTipoUso("esporadico"); }} className={`rounded-xl border py-3 text-sm font-bold transition-all ${tipoUso === "esporadico" ? "border-amber-400 bg-amber-400/10 text-amber-400" : "border-surface-border/50 bg-surface-raised text-ink-muted"}`}>Esporádico / SOS</button>
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
                      </div>
                    </div>
                  )}
                  {tipoUso !== "continuo" && (
                    <p className="text-xs text-ink-muted text-center p-3 bg-surface-raised rounded-xl">O app não emitirá alarmes diários, mas você poderá registrar doses avulsas para abater do estoque quando usar.</p>
                  )}
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div key="step2" variants={fadeUp} initial="initial" animate="animate" exit="exit" className="space-y-6">
                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm space-y-4">
                  <div className="mb-2 flex items-center gap-2"><Store size={16} className="text-ice" /><h3 className="text-sm font-semibold text-ink-primary">Aquisição</h3></div>
                  <div className={`transition-all ${shakeFields.includes('farmacia') ? 'animate-shake' : ''}`}>
                    <label className="mb-1.5 block text-sm font-medium text-ink-primary">Em qual farmácia comprou? <span className="text-coral">*</span></label>
                    <button type="button" onClick={() => setIsPharmacyModalOpen(true)} className={`flex w-full items-center justify-between rounded-2xl border bg-surface-raised px-4 py-3.5 text-left transition-all ${errors.farmacia ? "border-coral/50" : "border-surface-border/50 hover:border-ice/50"}`}>
                      <span className="truncate font-medium text-ink-primary">{farmaciaNome || "Selecionar farmácia..."}</span><span className="text-xs font-bold text-ice">Selecionar</span>
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
                      <span className="block truncate font-medium text-ink-primary">{medicoNome || "Vincular médico..."}</span><span className="text-xs font-bold text-ice">Alterar</span>
                    </button>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-ink-muted">Hospital</label>
                    <button type="button" onClick={() => setIsHospitalModalOpen(true)} className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left">
                      <span className="flex items-center gap-2 min-w-0">
                        <Building2 size={16} className="text-violet-400 shrink-0" />
                        <span className="truncate font-medium text-ink-primary">{hospitalNome || "Vincular hospital..."}</span>
                      </span>
                      <span className="text-xs font-bold text-ice">Alterar</span>
                    </button>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-ink-muted">Local / Posto</label>
                    <button type="button" onClick={() => setIsLocalModalOpen(true)} className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left">
                      <span className="flex items-center gap-2 min-w-0">
                        <MapPin size={16} className="text-emerald-400 shrink-0" />
                        <span className="truncate font-medium text-ink-primary">{localNome || "Vincular local..."}</span>
                      </span>
                      <span className="text-xs font-bold text-ice">Alterar</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div key="step3" variants={fadeUp} initial="initial" animate="animate" exit="exit" className="space-y-6">
                <CalculadoraGotas isAtivo={isGotas} onToggle={(ativo) => { setFormato(ativo ? "gota" : "comprimido"); }} mlTotal={mlTotal} setMlTotal={setMlTotal} gotasPorMl={gotasPorMl} setGotasPorMl={setGotasPorMl} onEstoqueCalculado={(v) => { setEstoqueGotasCalculado(v); if(estoqueAtivo) setEstoqueQuantidade(String(v)); }} />

                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2"><Package size={16} className="text-ice" /><h3 className="text-sm font-semibold text-ink-primary">Controle de Estoque</h3></div>
                    <button onClick={toggleEstoque} className={`h-6 w-11 rounded-full p-0.5 transition-colors ${estoqueAtivo ? "bg-ice" : "bg-surface-raised border border-surface-border"}`}>
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
                        <Input label="Data da Compra" value={estoqueDataReferenciaTexto} onChange={(e) => setEstoqueDataReferenciaTexto(mascaraData(e.target.value))} maxLength={10} inputMode="numeric" />
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

                  {!attachment ? (
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-surface-border/60 bg-surface-raised px-4 py-4 text-ink-muted hover:border-ice/40 hover:text-ice"><Upload size={18} /><span className="text-xs font-semibold">Anexar</span></button>
                      <button type="button" onClick={() => cameraInputRef.current?.click()} className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-surface-border/60 bg-surface-raised px-4 py-4 text-ink-muted hover:border-ice/40 hover:text-ice"><Camera size={18} /><span className="text-xs font-semibold">Foto</span></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 rounded-2xl border border-surface-border/50 bg-surface-raised p-3 mt-4">
                      <div className="flex h-11 w-11 overflow-hidden rounded-xl bg-surface">{attachment.type === "image" ? <img src={attachment.url} className="h-full w-full object-cover" /> : <FileText size={20} className="text-coral m-auto" />}</div>
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-ink-primary">{attachment.name}</p></div>
                      <button type="button" onClick={removeAttachment} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coral/10 text-coral"><X size={16} /></button>
                    </div>
                  )}

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

        <ConfirmationModal
          isOpen={showDesativarEstoqueModal}
          onClose={() => setShowDesativarEstoqueModal(false)}
          onConfirm={() => { setEstoqueAtivo(false); setShowDesativarEstoqueModal(false); }}
          title="Desativar controle de estoque?"
          message="Você está prestes a desativar o controle de estoque para este medicamento. Os dados atuais serão perdidos."
          confirmLabel="Desativar" cancelLabel="Cancelar" type="warning"
        />

        <AnimatePresence>
          {showDuplicateActionModal && selectedDuplicate && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4 backdrop-blur-md" onClick={() => setShowDuplicateActionModal(false)}>
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} onClick={e => e.stopPropagation()} className="w-full max-w-md rounded-t-[32px] sm:rounded-[32px] bg-surface p-6 shadow-vault">
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <div className="flex items-center gap-2 text-amber-400 mb-1"><AlertTriangle size={16} /><span className="text-xs font-bold uppercase tracking-widest">Aviso Inteligente</span></div>
                    <h2 className="text-xl font-display font-bold text-ink-primary">Você já possui {selectedDuplicate.nome}</h2>
                    <p className="text-sm text-ink-muted mt-1">Este medicamento ({selectedDuplicate.dosagem}) já está vinculado a {getPersonName(selectedDuplicate.person_id || "")}. O que deseja fazer?</p>
                  </div>
                  <button onClick={() => setShowDuplicateActionModal(false)} className="h-8 w-8 bg-surface-raised rounded-full flex items-center justify-center text-ink-muted"><X size={16}/></button>
                </div>

                <div className="space-y-3">
                  <button onClick={() => router.push(`/saude/medicamentos/editar?id=${selectedDuplicate.id}&intent=evolucao`)} className="w-full flex items-center justify-between p-4 rounded-2xl bg-ice/10 border border-ice/20 active:scale-95 transition-all">
                    <div className="flex items-center gap-3 text-left">
                      <div className="h-10 w-10 bg-ice/20 text-ice rounded-xl flex items-center justify-center"><TrendingUp size={20}/></div>
                      <div><p className="font-bold text-ice">Aumento/Redução de Dose</p><p className="text-xs text-ink-muted">Manter histórico e alterar dosagem</p></div>
                    </div><ChevronRight size={18} className="text-ice opacity-50"/>
                  </button>
                  <button onClick={() => router.push(`/saude/medicamentos/editar?id=${selectedDuplicate.id}&intent=compra`)} className="w-full flex items-center justify-between p-4 rounded-2xl bg-emerald-400/10 border border-emerald-400/20 active:scale-95 transition-all">
                    <div className="flex items-center gap-3 text-left">
                      <div className="h-10 w-10 bg-emerald-400/20 text-emerald-400 rounded-xl flex items-center justify-center"><Package size={20}/></div>
                      <div><p className="font-bold text-emerald-400">Nova Compra / Estoque</p><p className="text-xs text-ink-muted">Atualizar caixas e renovação</p></div>
                    </div><ChevronRight size={18} className="text-emerald-400 opacity-50"/>
                  </button>
                  <button onClick={() => { setShowDuplicateActionModal(false); setIsRecognized(true); }} className="w-full flex items-center justify-between p-4 rounded-2xl bg-surface-raised border border-surface-border active:scale-95 transition-all">
                    <div className="flex items-center gap-3 text-left">
                      <div className="h-10 w-10 bg-void border border-surface-border text-ink-muted rounded-xl flex items-center justify-center"><Plus size={20}/></div>
                      <div><p className="font-bold text-ink-primary">Continuar novo cadastro</p><p className="text-xs text-ink-muted">Cadastrar variação separada</p></div>
                    </div><ChevronRight size={18} className="text-ink-muted opacity-50"/>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <FloatingSpinner
          label={uploadProgress > 0 ? `Enviando anexo...                ${uploadProgress}%` : "Salvando medicamento..."}
        />

        <SelectionModal<Farmacia>
          isOpen={isPharmacyModalOpen}
          onClose={() => setIsPharmacyModalOpen(false)}
          title="Selecionar Farmácia"
          items={farmacias}
          getItemId={(item) => item.id!}
          getItemLabel={(item) => item.nome}
          enableQuickCreate
          onQuickCreate={async (name) => {
            const id = await addFarmacia({ nome: name });
            return { id, nome: name } as Farmacia;
          }}
          onSelect={(item) => {
            setFarmaciaId(item.id!);
            setFarmaciaNome(item.nome);
            setIsPharmacyModalOpen(false);
          }}
          renderItem={(item) => (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-400/10 text-amber-400 shrink-0"><Store size={18} /></div>
              <div className="text-left"><p className="font-semibold text-ink-primary">{item.nome}</p></div>
            </div>
          )}
        />

        <SelectionModal<Medico>
          isOpen={isDoctorModalOpen}
          onClose={() => setIsDoctorModalOpen(false)}
          title="Médico Prescritor"
          items={medicos}
          getItemId={(item) => item.id!}
          getItemLabel={(item) => item.nome}
          enableQuickCreate
          onQuickCreate={async (name) => {
            const id = await addMedico({ nome: name });
            return { id, nome: name } as Medico;
          }}
          onSelect={(item) => {
            setMedicoId(item.id!);
            setMedicoNome(item.nome);
            setIsDoctorModalOpen(false);
          }}
          renderItem={(item) => (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ice/10 text-ice shrink-0"><Stethoscope size={18} /></div>
              <div className="text-left"><p className="font-semibold text-ink-primary">{item.nome}</p></div>
            </div>
          )}
        />

        <SelectionModal<Hospital>
          isOpen={isHospitalModalOpen}
          onClose={() => setIsHospitalModalOpen(false)}
          title="Selecionar Hospital"
          items={hospitais}
          getItemId={(item) => item.id!}
          getItemLabel={(item) => item.nome}
          enableQuickCreate
          onQuickCreate={async (name) => {
            const id = await addHospital({ nome: name, tipo: "hospital" });
            return { id, nome: name, tipo: "hospital" } as Hospital;
          }}
          onSelect={(item) => {
            setHospitalId(item.id!);
            setHospitalNome(item.nome);
            setIsHospitalModalOpen(false);
          }}
          renderItem={(item) => (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-coral/10 text-coral shrink-0"><Building2 size={18} /></div>
              <div className="text-left"><p className="font-semibold text-ink-primary">{item.nome}</p><p className="text-xs text-ink-muted">Hospital</p></div>
            </div>
          )}
        />

        <SelectionModal<LocalSaude>
          isOpen={isLocalModalOpen}
          onClose={() => setIsLocalModalOpen(false)}
          title="Selecionar Local / Posto"
          items={locais}
          getItemId={(item) => item.id!}
          getItemLabel={(item) => item.nome}
          enableQuickCreate
          onQuickCreate={async (name) => {
            const id = await addLocal({ nome: name, tipo: "outro" });
            return { id, nome: name, tipo: "outro" } as LocalSaude;
          }}
          onSelect={(item) => {
            setLocalId(item.id!);
            setLocalNome(item.nome);
            setIsLocalModalOpen(false);
          }}
          renderItem={(item) => (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-400 shrink-0"><MapPin size={18} /></div>
              <div className="text-left"><p className="font-semibold text-ink-primary">{item.nome}</p><p className="text-xs text-ink-muted">{item.tipo || "Local"}</p></div>
            </div>
          )}
        />

        <SeletorTratamentoModal
          isOpen={isTratamentoModalOpen}
          onClose={() => setIsTratamentoModalOpen(false)}
          selectedIds={tratamentosSelecionados}
          onChange={setTratamentosSelecionados}
          personId={personId}
        />
      </main>
    </PageTransition>
  );
}