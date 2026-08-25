// app/saude/medicamentos/novo/page.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, Save, Pill, Upload, X, FileText, Package, Plus, Clock,
  Activity, Stethoscope, Droplet, Syringe, StickyNote, Palette, AlertTriangle, Store,
  Building2, MapPin, CheckCircle2, ChevronRight, ChevronLeft, DollarSign, Circle, Eraser,
  FileSearch, Check, RefreshCw
} from "lucide-react";
import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useAuth } from "@/hooks/useAuth";
import { useMedicos } from "@/hooks/useMedicos";
import { useFarmacias } from "@/hooks/useFarmacias";
import { useHospitais } from "@/hooks/useHospitais";
import { useLocais } from "@/hooks/useLocais";
import { useTratamentos } from "@/hooks/useTratamentos";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { useHapticFeedback } from "@/lib/haptics";
import { useSubmitAction } from "@/hooks/useSubmitAction";
import { uploadFile } from "@/lib/supabase/storage";
import { suggestRenewalDate, VALIDADE_RECEITA_DIAS, getLocalTodayISO } from "@/lib/health-utils";
import { scheduleDoseNotifications, requestNotificationPermission } from "@/lib/dose-notifications";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { PageTransition } from "@/components/PageTransition";
import { SelectionModal } from "@/components/SelectionModal";
import { SeletorReceita } from "@/components/saude/SeletorReceita";
import { CalculadoraGotas } from "@/components/saude/CalculadoraGotas";
import { SeletorTratamentoModal } from "@/components/saude/SeletorTratamentoModal";
import { sugerirHorarios } from "@/lib/health-insights";
import { FloatingSpinner } from "@/components/loading/FloatingSpinner";
import { medicamentosRepository } from "@/lib/repositories/medicamentos";
import { documentsRepository } from "@/lib/repositories/documents";
import { renovacoesRepository } from "@/lib/repositories/renovacoes";
import type { Attachment, Document, TipoReceita, Medico, Farmacia, Hospital, LocalSaude } from "@/lib/types";

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
function handleCurrencyMask(value: string): string {
  const clean = value.replace(/\D/g, "");
  if (!clean) return "";
  const numberVal = parseInt(clean, 10) / 100;
  return numberVal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function handleTimeMask(value: string): string {
  const clean = value.replace(/\D/g, "").slice(0, 4);
  if (clean.length === 0) return "";
  if (clean.length > 2) {
    return `${clean.slice(0, 2)}:${clean.slice(2)}`;
  }
  return clean;
}

// 🔄 Motor de Cálculo Retroativo de Estoque
function calcularEstoqueRetroativo(
  quantidadeComprada: number,
  dataCompraStr: string,
  horariosDiarios: string[],
  unidadePorDose: number = 1
): number {
  if (!dataCompraStr || quantidadeComprada <= 0) return quantidadeComprada;
  
  const dataCompra = new Date(dataCompraStr);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  dataCompra.setHours(0, 0, 0, 0);

  const diffTime = hoje.getTime() - dataCompra.getTime();
  const diasPassados = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diasPassados <= 0) return quantidadeComprada;

  const consumoDiario = (horariosDiarios.length || 1) * unidadePorDose;
  const totalConsumido = diasPassados * consumoDiario;
  const saldoRestante = quantidadeComprada - totalConsumido;

  return Math.max(0, saldoRestante);
}

const CirclePillIcon = ({ size, fill = "currentColor", stroke = "none" }: { size: number; fill?: string; stroke?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth="2">
    <circle cx="12" cy="12" r="9" />
  </svg>
);

const SplitPillIcon = ({ size, fill = "currentColor", stroke = "none" }: { size: number; fill?: string; stroke?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth="2">
    <circle cx="12" cy="12" r="9" />
    <line x1="12" y1="3" x2="12" y2="21" stroke="rgba(0,0,0,0.35)" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const CapsuleIcon = ({ size, fill = "currentColor", stroke = "none" }: { size: number; fill?: string; stroke?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth="2">
    <rect x="4" y="7" width="16" height="10" rx="5" ry="5" />
    <line x1="12" y1="7" x2="12" y2="17" stroke="rgba(0,0,0,0.35)" strokeWidth="2" />
  </svg>
);

const FORMATOS = [
  { id: "comprimido", label: "Comprimido", icon: CirclePillIcon },
  { id: "partido", label: "Partido", icon: SplitPillIcon },
  { id: "capsula", label: "Cápsula", icon: CapsuleIcon },
  { id: "gota", label: "Gotas", icon: Droplet },
  { id: "injecao", label: "Injeção", icon: Syringe },
  { id: "adesivo", label: "Adesivo", icon: StickyNote },
];

const CORES_DISPONIVEIS = ["#FFFFFF", "#FCA5A5", "#F87171", "#FBBF24", "#34D399", "#60A5FA", "#818CF8", "#A78BFA", "#F472B6", "#9CA3AF"];

export default function NovoMedicamentoPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { user } = useAuth();
  const { activePersonId } = useActivePersonId();

  const { medicos, addMedico } = useMedicos();
  const { farmacias, addFarmacia } = useFarmacias();
  const { hospitais, addHospital } = useHospitais();
  const { locais, addLocal } = useLocais();
  const cids = useLiveQuery(() => db.cids?.toArray() || []) ?? [];

  const { run, isSubmitting } = useSubmitAction();
  const isSubmitLocked = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

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

  // 🛡️ Novos estados do SUS
  const [tipoAquisicao, setTipoAquisicao] = useState<"comprado" | "sus">("comprado");
  const [dataRetornoSusTexto, setDataRetornoSusTexto] = useState("");

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
  const [estoqueDataReferenciaTexto, setEstoqueDataReferenciaTexto] = useState(isoParaBr(getLocalTodayISO()));
  const [estoqueUnidade, setEstoqueUnidade] = useState("comprimido(s)");

  const [gerenciarRenovacao, setGerenciarRenovacao] = useState(false);
  const [tipoReceita, setTipoReceita] = useState<TipoReceita>("comum");
  const [dataReceitaTexto, setDataReceitaTexto] = useState("");
  const [proximaRenovacaoTexto, setProximaRenovacaoTexto] = useState("");
  const [tratamentosSelecionados, setTratamentosSelecionados] = useState<string[]>([]);
  const [observacoes, setObservacoes] = useState("");

  const [cidIds, setCidIds] = useState<string[]>([]);
  const [isCidModalOpen, setIsCidModalOpen] = useState(false);

  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [isPharmacyModalOpen, setIsPharmacyModalOpen] = useState(false);
  const [isHospitalModalOpen, setIsHospitalModalOpen] = useState(false);
  const [isLocalModalOpen, setIsLocalModalOpen] = useState(false);
  const [isTratamentoModalOpen, setIsTratamentoModalOpen] = useState(false);
  const [showDesativarEstoqueModal, setShowDesativarEstoqueModal] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [shakeFields, setShakeFields] = useState<string[]>([]);

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
    else if (novoFormato === "gota") {
      setEstoqueUnidade("gota(s)");
      setEstoqueUnidadePorDose("1");
    } else {
      setEstoqueUnidadePorDose("1");
      setEstoqueUnidade("comprimido(s)");
    }
    if (novoFormato !== "gota") setEstoqueGotasCalculado(0);
  };

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
        uploaded_at: new Date().toISOString()
      });
    }
    e.target.value = "";
  };

  const removeAttachment = () => {
    if (attachment?.url.startsWith("blob:")) {
      URL.revokeObjectURL(attachment.url);
    }
    setAttachment(null);
    setLocalFile(null);
    trigger("vibrate");
  };

  const handleDataReceitaChange = (val: string) => {
    const masked = mascaraData(val);
    setDataReceitaTexto(masked);
    if (masked.length === 10) {
      const isoData = brParaIso(masked);
      if (isoData && VALIDADE_RECEITA_DIAS[tipoReceita]) {
        setProximaRenovacaoTexto(isoParaBr(suggestRenewalDate(isoData, tipoReceita)));
      }
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
      if (!nome.trim()) { newErrors.nome = "Obrigatório"; shakeList.push("nome"); }
      if (!dosagem.trim()) { newErrors.dosagem = "Obrigatório"; shakeList.push("dosagem"); }
      if (tipoUso === 'continuo' && (!vezesAoDia || Number(vezesAoDia) <= 0)) { newErrors.vezesAoDia = "Obrigatório"; shakeList.push("vezesAoDia"); }
    }
    if (step === 3) {
      if (dataReceitaTexto && dataReceitaTexto.length < 10 && dataReceitaTexto.length > 0) { newErrors.dataReceitaTexto = "Data inválida"; shakeList.push("dataReceitaTexto"); }
      if (proximaRenovacaoTexto && proximaRenovacaoTexto.length < 10 && proximaRenovacaoTexto.length > 0) { newErrors.proximaRenovacaoTexto = "Data inválida"; shakeList.push("proximaRenovacaoTexto"); }
      if (estoqueAtivo) {
        if (!estoqueQuantidade || Number(estoqueQuantidade) <= 0) { newErrors.estoqueQuantidade = "Faltou quantidade"; shakeList.push("estoqueQuantidade"); }
      }
    }

    setErrors(newErrors);
    if (shakeList.length > 0) { triggerShake(shakeList); }
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

  const handleSubmit = () => {
    if (isSubmitLocked.current || isSubmitting) return;
    isSubmitLocked.current = true;

    if (!validateStep(3)) {
      isSubmitLocked.current = false;
      return;
    }

    run(
      async () => {
        setUploadProgress(0);
        
        const dataReceitaISO = brParaIso(dataReceitaTexto) || undefined;
        const proximaRenovacaoISO = brParaIso(proximaRenovacaoTexto) || undefined;
        const estoqueDataReferenciaISO = brParaIso(estoqueDataReferenciaTexto) || getLocalTodayISO();
        const horariosFiltrados = horarios.filter(Boolean);

        // 🔄 Cálculo Retroativo Automático de Estoque
        const qtdInformada = Number(estoqueQuantidade) || 0;
        const quantidadeEstoqueFinal = isGotas
          ? (estoqueGotasCalculado > 0 ? estoqueGotasCalculado : calcularEstoqueRetroativo(qtdInformada, estoqueDataReferenciaISO, horariosFiltrados, Number(estoqueUnidadePorDose)))
          : calcularEstoqueRetroativo(qtdInformada, estoqueDataReferenciaISO, horariosFiltrados, Number(estoqueUnidadePorDose));

        const precoNumerico = tipoAquisicao === 'comprado' && preco ? parseFloat(preco.replace(/\./g, "").replace(",", ".")) : undefined;

        let docId: string | undefined = undefined;

        if (attachment) {
          if (!user) throw new Error('Usuário não autenticado');
          const docData: Omit<Document, 'id' | 'created_at' | 'updated_at' | 'synced' | 'user_id'> = {
            person_id: activePersonId || "",
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
            attachments: [attachment],
            is_favorite: false,
          };
          
          docId = await documentsRepository.create({
            user_id: user.id,
            ...docData,
          });
          
          if (localFile) {
            const { url, error } = await uploadFile(user.id, localFile, "saude");
            if (!error && url) {
              await documentsRepository.update(docId, { attachments: [{ ...attachment, url }] });
              setUploadProgress(100);
            }
          }
        }

        const medicamentoData = {
          document_id: docId || undefined,
          person_id: activePersonId || "",
          nome: nome.trim(),
          dosagem: dosagem.trim(),
          cid_ids: cidIds,
          formato,
          cores,
          tipo_uso: tipoUso,
          
          // 🛡️ Propriedades do SUS enviadas para Dexie e Supabase
          tipo_aquisicao: tipoAquisicao,
          data_retorno_sus: tipoAquisicao === 'sus' ? (brParaIso(dataRetornoSusTexto) || undefined) : undefined,

          medico: medicoNome?.trim() || "", 
          medico_id: medicoId || undefined,
          hospital_id: hospitalId || undefined,
          local_id: localId || undefined,
          farmacia: farmaciaNome?.trim() || "", 
          farmacia_id: farmaciaId || undefined,
          preco: precoNumerico,
          data_receita: dataReceitaISO as any,
          proxima_renovacao: proximaRenovacaoISO as any,
          observacoes: observacoes?.trim() || undefined,
          tipo_receita: tipoReceita,
          tratamento_ids: tratamentosSelecionados,
          status: "ativo" as const,
          
          estoque_quantidade: quantidadeEstoqueFinal > 0 ? quantidadeEstoqueFinal : undefined,
          estoque_data_referencia: quantidadeEstoqueFinal > 0 ? (getLocalTodayISO() as any) : undefined,
          estoque_horarios: tipoUso === 'continuo' && quantidadeEstoqueFinal > 0 && horariosFiltrados.length > 0 ? horariosFiltrados : undefined,
          estoque_unidade_por_dose: quantidadeEstoqueFinal > 0 ? Number(estoqueUnidadePorDose) : undefined,
          estoque_unidade_medida: quantidadeEstoqueFinal > 0 ? (isGotas ? "gota(s)" : estoqueUnidade) : undefined,
          estoque_ml_total: isGotas && Number(mlTotal) > 0 ? Number(mlTotal) : undefined,
          estoque_gotas_por_ml: isGotas && Number(gotasPorMl) > 0 ? Number(gotasPorMl) : undefined,
        };

        if (!user) throw new Error('Usuário não autenticado');
        const medicamentoId = await medicamentosRepository.create({
          user_id: user.id,
          ...medicamentoData,
        });

        if (gerenciarRenovacao) {
          if (!user) throw new Error('Usuário não autenticado');
          await renovacoesRepository.create({
            user_id: user.id,
            person_id: activePersonId || undefined,
            medicamento_id: medicamentoId,
            medico_id: medicoId || undefined,
            farmacia_id: farmaciaId || undefined,
            hospital_id: hospitalId || undefined,
            local_id: localId || undefined,
            tipo_aquisicao: tipoAquisicao,
            data_proxima_retirada: tipoAquisicao === 'sus' ? (brParaIso(dataRetornoSusTexto) || undefined) : undefined,
            quantidade: quantidadeEstoqueFinal > 0 ? quantidadeEstoqueFinal : undefined,
            preco: precoNumerico,
            data: (dataReceitaISO || getLocalTodayISO()) as any,
          });
        }

        if (estoqueAtivo && tipoUso === 'continuo' && horariosFiltrados.length > 0) {
          const granted = await requestNotificationPermission();
          if (granted) {
            await scheduleDoseNotifications({
              id: medicamentoId,
              nome: nome.trim(),
              dosagem: dosagem.trim(),
              estoque_horarios: horariosFiltrados
            });
          }
        }
      },
      {
        successMessage: "Medicamento cadastrado com sucesso",
        errorMessage: "Erro ao cadastrar medicamento",
        goBackOnSuccess: true,
      }
    ).finally(() => {
      isSubmitLocked.current = false;
      setUploadProgress(0);
    });
  };

  const SelectedFormatIcon = FORMATOS.find((f) => f.id === formato)?.icon || CirclePillIcon;
  const hasTwoColors = cores.length === 2 && (formato === "comprimido" || formato === "partido" || formato === "capsula");
  const gradientId = `split-novo-bicolor`;

  return (
    <PageTransition>
      <main className="min-h-[100dvh] bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />

        <svg width="0" height="0" className="absolute">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="50%" stopColor={cores[0] || "#9CA3AF"} />
              <stop offset="50%" stopColor={cores.length === 2 ? cores[1] : (cores[0] || "#9CA3AF")} />
            </linearGradient>
          </defs>
        </svg>

        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/90 px-5 pt-4 pb-3 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95"
              >
                <X size={18} className="text-ink-primary" />
              </button>
              <h1 className="font-display text-lg font-semibold text-ink-primary">Novo Cadastro</h1>
            </div>
            <span className="text-xs font-bold text-ice bg-ice/10 px-3 py-1 rounded-full">
              Etapa {currentStep} de {totalSteps}
            </span>
          </div>
          <div className="flex gap-2 w-full h-1.5 rounded-full overflow-hidden bg-surface-raised">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`h-full flex-1 transition-colors duration-300 ${step <= currentStep ? 'bg-ice' : 'bg-surface-border/30'}`}
              />
            ))}
          </div>
        </header>

        <section className="px-5 pt-6 space-y-6">
          <AnimatePresence mode="wait">

            {currentStep === 1 && (
              <motion.div key="step1" variants={fadeUp} initial="initial" animate="animate" exit="exit" className="space-y-6">
                <div className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm">
                  <div className={`transition-all ${shakeFields.includes('nome') ? 'animate-shake' : ''}`}>
                    <Input
                      label="Medicamento"
                      placeholder="Ex: Sertralina"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      error={errors.nome}
                    />
                  </div>

                  <div className={`transition-all ${shakeFields.includes('dosagem') ? 'animate-shake' : ''}`}>
                    <Input
                      label={isGotas ? "Dosagem (ex: 20 gotas/ml)" : "Dosagem (ex: 50mg)"}
                      value={dosagem}
                      onChange={(e) => setDosagem(e.target.value)}
                      error={errors.dosagem}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink-primary mb-1.5">Diagnóstico / CID Relacionado</label>
                    <button
                      type="button"
                      onClick={() => {
                        trigger("vibrate");
                        setIsCidModalOpen(true);
                      }}
                      className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3.5 text-left transition-colors hover:border-ice/50"
                    >
                      <span className="flex items-center gap-2 font-medium text-ink-primary truncate">
                        <FileSearch size={16} className="text-ice shrink-0" />
                        {cidIds.length > 0 ? `${cidIds.length} CID(s) vinculado(s)` : "Vincular CID..."}
                      </span>
                      <span className="text-xs font-bold text-ice shrink-0 ml-2">Gerenciar</span>
                    </button>
                  </div>
                </div>

                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <Palette size={16} className="text-ice" />
                    <h3 className="text-sm font-semibold text-ink-primary">Identidade Visual</h3>
                  </div>

                  <div className="mb-5 grid grid-cols-4 gap-2">
                    {FORMATOS.map((item) => {
                      const isActive = formato === item.id;
                      const Icon = item.icon;
                      return (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => handleFormatoChange(item.id)}
                          className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border py-3 transition-all ${isActive ? "border-ice bg-ice/15 text-ice" : "border-surface-border/40 bg-surface-raised text-ink-muted"}`}
                        >
                          <Icon size={20} fill={isActive ? "currentColor" : "none"} stroke={isActive ? "none" : "currentColor"} />
                          <span className="text-[10px] font-medium">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <p className="mb-2 text-xs font-medium text-ink-muted">Cores (Até 2 para pílulas e cápsulas)</p>
                  <div className="flex flex-wrap gap-3">
                    {CORES_DISPONIVEIS.map((hex) => (
                      <button
                        type="button"
                        key={hex}
                        onClick={() => toggleCor(hex)}
                        className={`h-8 w-8 rounded-full border-2 transition-transform ${cores.includes(hex) ? "scale-110 border-ice" : "border-transparent"}`}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>

                  <div className="mt-4 flex justify-center">
                    <div className="flex h-16 w-24 items-center justify-center rounded-2xl border border-surface bg-void/50 shadow-inner">
                      <SelectedFormatIcon size={32} fill={hasTwoColors ? `url(#${gradientId})` : (cores[0] || "#9CA3AF")} stroke="none" />
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <Clock size={16} className="text-ice" />
                    <h3 className="text-sm font-semibold text-ink-primary">Posologia & Uso</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <button
                      type="button"
                      onClick={() => { trigger("vibrate"); setTipoUso("continuo"); }}
                      className={`rounded-xl border py-3 text-sm font-bold transition-all ${tipoUso === "continuo" ? "border-ice bg-ice/10 text-ice" : "border-surface-border/50 bg-surface-raised text-ink-muted"}`}
                    >
                      Contínuo (Diário)
                    </button>
                    <button
                      type="button"
                      onClick={() => { trigger("vibrate"); setTipoUso("esporadico"); }}
                      className={`rounded-xl border py-3 text-sm font-bold transition-all ${tipoUso === "esporadico" ? "border-amber-400 bg-amber-400/10 text-amber-400" : "border-surface-border/50 bg-surface-raised text-ink-muted"}`}
                    >
                      Esporádico / SOS
                    </button>
                  </div>

                  {tipoUso === "continuo" && (
                    <div className="space-y-4 pt-4 border-t border-surface-border/40">
                      <div className="grid grid-cols-2 gap-3 items-end">
                        <div className={`transition-all ${shakeFields.includes('vezesAoDia') ? 'animate-shake' : ''}`}>
                          <Input
                            label="Doses por dia"
                            type="number"
                            inputMode="numeric"
                            placeholder="Ex: 2"
                            value={vezesAoDia}
                            onChange={(e) => setVezesAoDia(e.target.value)}
                            error={errors.vezesAoDia}
                          />
                        </div>
                        <div>
                          <Input
                            label="Horário inicial"
                            type="text"
                            placeholder="00:00"
                            maxLength={5}
                            value={primeiroHorario}
                            onChange={(e) => setPrimeiroHorario(handleTimeMask(e.target.value))}
                            icon={<Clock size={16} className="text-ink-muted" />}
                          />
                        </div>
                      </div>

                      <div className="rounded-xl bg-surface-raised p-4 border border-surface-border">
                        <p className="text-xs text-ink-muted mb-2 font-medium uppercase tracking-wide">Horários Sugeridos</p>
                        <div className="flex flex-wrap gap-2">
                          {horarios.map((h, i) => (
                            <span key={i} className="bg-void border border-surface-border px-3 py-1.5 rounded-lg text-sm font-mono text-ice font-bold">{h}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {tipoUso !== "continuo" && (
                    <p className="text-xs text-ink-muted text-center p-3 bg-surface-raised rounded-xl">
                      O app não emitirá alarmes diários, mas você poderá registrar doses avulsas para abater do estoque quando usar.
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div key="step2" variants={fadeUp} initial="initial" animate="animate" exit="exit" className="space-y-6">
                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm space-y-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Store size={16} className="text-ice" />
                    <h3 className="text-sm font-semibold text-ink-primary">Origem / Aquisição</h3>
                  </div>

                  {/* 🛡️ Seletor de Tipo de Aquisição (Particular vs SUS) */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => { trigger("vibrate"); setTipoAquisicao("comprado"); }}
                      className={`rounded-xl border py-3 text-xs font-bold transition-all ${tipoAquisicao === "comprado" ? "border-ice bg-ice/10 text-ice" : "border-surface-border/50 bg-surface-raised text-ink-muted"}`}
                    >
                      🛒 Particular (Comprado)
                    </button>
                    <button
                      type="button"
                      onClick={() => { trigger("vibrate"); setTipoAquisicao("sus"); }}
                      className={`rounded-xl border py-3 text-xs font-bold transition-all ${tipoAquisicao === "sus" ? "border-emerald-400 bg-emerald-400/10 text-emerald-400" : "border-surface-border/50 bg-surface-raised text-ink-muted"}`}
                    >
                      🛡️ Retirada SUS / Governo
                    </button>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-sm font-medium text-ink-primary">
                        {tipoAquisicao === 'sus' ? 'Posto de Saúde / Farmácia Pública' : 'Em qual farmácia comprou?'}
                      </label>
                      {farmaciaId && (
                        <button type="button" onClick={() => { setFarmaciaId(""); setFarmaciaNome(""); }} className="flex items-center gap-1 text-[10px] font-bold text-coral bg-coral/10 px-2 py-0.5 rounded-md uppercase">
                          <Eraser size={12} /> Limpar
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsPharmacyModalOpen(true)}
                      className="flex w-full items-center justify-between rounded-2xl border bg-surface-raised px-4 py-3.5 text-left transition-all border-surface-border/50 hover:border-ice/50"
                    >
                      <span className="truncate font-medium text-ink-primary">{farmaciaNome || (tipoAquisicao === 'sus' ? "Selecionar posto/farmácia pública..." : "Selecionar farmácia...")}</span>
                      <span className="text-xs font-bold text-ice">Selecionar</span>
                    </button>
                  </div>

                  {tipoAquisicao === 'comprado' ? (
                    <div>
                      <Input
                        label="Valor pago (R$)"
                        type="text"
                        inputMode="numeric"
                        placeholder="0,00"
                        value={preco}
                        onChange={(e) => setPreco(handleCurrencyMask(e.target.value))}
                        icon={<DollarSign size={16} className="text-emerald-400"/>}
                      />
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 space-y-3">
                      <p className="text-xs font-semibold text-emerald-400">📅 Controle de Dispensação SUS</p>
                      <Input
                        label="Próxima data de retorno ao posto"
                        placeholder="DD/MM/AAAA"
                        value={dataRetornoSusTexto}
                        onChange={(e) => setDataRetornoSusTexto(mascaraData(e.target.value))}
                        maxLength={10}
                        inputMode="numeric"
                      />
                      <p className="text-[11px] text-ink-muted">O app vai te avisar automaticamente na agenda quando estiver na hora de voltar para buscar novos medicamentos.</p>
                    </div>
                  )}
                </div>

                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm space-y-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Stethoscope size={16} className="text-ice" />
                    <h3 className="text-sm font-semibold text-ink-primary">Rede de Apoio (Opcional)</h3>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-medium text-ink-muted">Médico Prescritor</label>
                      {medicoId && (
                        <button type="button" onClick={() => { setMedicoId(""); setMedicoNome(""); }} className="flex items-center gap-1 text-[10px] font-bold text-coral bg-coral/10 px-2 py-0.5 rounded-md uppercase">
                          <Eraser size={12} /> Limpar
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsDoctorModalOpen(true)}
                      className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left"
                    >
                      <span className="block truncate font-medium text-ink-primary">{medicoNome || "Vincular médico..."}</span>
                      <span className="text-xs font-bold text-ice">Alterar</span>
                    </button>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-medium text-ink-muted">Hospital</label>
                      {hospitalId && (
                        <button type="button" onClick={() => { setHospitalId(""); setHospitalNome(""); }} className="flex items-center gap-1 text-[10px] font-bold text-coral bg-coral/10 px-2 py-0.5 rounded-md uppercase">
                          <Eraser size={12} /> Limpar
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsHospitalModalOpen(true)}
                      className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <Building2 size={16} className="text-violet-400 shrink-0" />
                        <span className="truncate font-medium text-ink-primary">{hospitalNome || "Vincular hospital..."}</span>
                      </span>
                      <span className="text-xs font-bold text-ice">Alterar</span>
                    </button>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-medium text-ink-muted">Local / Posto</label>
                      {localId && (
                        <button type="button" onClick={() => { setLocalId(""); setLocalNome(""); }} className="flex items-center gap-1 text-[10px] font-bold text-coral bg-coral/10 px-2 py-0.5 rounded-md uppercase">
                          <Eraser size={12} /> Limpar
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsLocalModalOpen(true)}
                      className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left"
                    >
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
                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ice/10 text-ice">
                        <RefreshCw size={20} />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-ink-primary">Gerenciar Renovação</h3>
                        <p className="text-xs text-ink-muted">Ativar alertas automáticos e histórico oficial.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { trigger("vibrate"); setGerenciarRenovacao(!gerenciarRenovacao); }}
                      className={`h-6 w-11 rounded-full p-0.5 transition-colors ${gerenciarRenovacao ? "bg-ice" : "bg-surface-raised border border-surface-border"}`}
                    >
                      <div className={`h-5 w-5 rounded-full bg-void shadow-sm transition-transform ${gerenciarRenovacao ? "translate-x-5" : ""}`} />
                    </button>
                  </div>
                </div>

                <CalculadoraGotas
                  isAtivo={isGotas}
                  onToggle={(ativo) => { setFormato(ativo ? "gota" : "comprimido"); }}
                  mlTotal={mlTotal}
                  setMlTotal={setMlTotal}
                  gotasPorMl={gotasPorMl}
                  setGotasPorMl={setGotasPorMl}
                  onEstoqueCalculado={(v) => { setEstoqueGotasCalculado(v); if(estoqueAtivo) setEstoqueQuantidade(String(v)); }}
                />

                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Package size={16} className="text-ice" />
                      <h3 className="text-sm font-semibold text-ink-primary">Controle de Estoque</h3>
                    </div>
                    <button
                      type="button"
                      onClick={toggleEstoque}
                      className={`h-6 w-11 rounded-full p-0.5 transition-colors ${estoqueAtivo ? "bg-ice" : "bg-surface-raised border border-surface-border"}`}
                    >
                      <div className={`h-5 w-5 rounded-full bg-void shadow-sm transition-transform ${estoqueAtivo ? "translate-x-5" : ""}`} />
                    </button>
                  </div>

                  <AnimatePresence>
                    {estoqueAtivo && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className={`transition-all ${shakeFields.includes('estoqueQuantidade') ? 'animate-shake' : ''}`}>
                            <Input
                              label="Qtd Comprada / Retirada"
                              type="number"
                              inputMode="numeric"
                              placeholder="Ex: 30"
                              value={estoqueQuantidade}
                              onChange={(e) => setEstoqueQuantidade(e.target.value)}
                            />
                          </div>
                          <Input
                            label="Dose gasta (ex: 1)"
                            type="number"
                            inputMode="decimal"
                            step="0.5"
                            value={estoqueUnidadePorDose}
                            onChange={(e) => setEstoqueUnidadePorDose(e.target.value)}
                          />
                        </div>
                        <Input
                          label="Data da Aquisição / Retirada"
                          value={estoqueDataReferenciaTexto}
                          onChange={(e) => setEstoqueDataReferenciaTexto(mascaraData(e.target.value))}
                          maxLength={10}
                          inputMode="numeric"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <FileText size={16} className="text-ice" />
                    <h3 className="text-sm font-semibold text-ink-primary">Receita & Vínculos</h3>
                  </div>

                  <SeletorReceita selected={tipoReceita} onChange={setTipoReceita} />

                  <div className="grid grid-cols-2 gap-3 mt-4 mb-5">
                    <Input
                      label="Data da receita"
                      placeholder="DD/MM/AAAA"
                      value={dataReceitaTexto}
                      onChange={(e) => handleDataReceitaChange(e.target.value)}
                      maxLength={10}
                      inputMode="numeric"
                    />
                    <Input
                      label="Vencimento"
                      placeholder="DD/MM/AAAA"
                      value={proximaRenovacaoTexto}
                      onChange={(e) => setProximaRenovacaoTexto(mascaraData(e.target.value))}
                      maxLength={10}
                      inputMode="numeric"
                    />
                  </div>

                  {!attachment ? (
                    <div className="flex flex-col items-center justify-center p-6 bg-surface-raised border border-dashed border-surface-border/60 rounded-2xl">
                      <FileText size={32} className="text-ink-muted mb-2" />
                      <p className="text-sm font-semibold text-ink-primary">Nenhuma receita anexada</p>
                      <p className="text-xs text-ink-muted text-center mt-1 mb-4">Você ainda não vinculou a foto ou PDF da prescrição.</p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 bg-ice/10 text-ice px-4 py-2 rounded-xl text-xs font-bold active:scale-95"
                      >
                        <Upload size={14}/> Arquivo
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 rounded-2xl border border-surface-border/50 bg-surface-raised p-3">
                      <div className="flex h-11 w-11 overflow-hidden rounded-xl bg-surface">
                        {attachment.type === "image" ? (
                          <img src={attachment.url} className="h-full w-full object-cover" />
                        ) : (
                          <FileText size={20} className="text-coral m-auto" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink-primary">{attachment.name}</p>
                      </div>
                      <button type="button" onClick={removeAttachment} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coral/10 text-coral">
                        <X size={16} />
                      </button>
                    </div>
                  )}

                  <div className="mt-6 pt-5 border-t border-surface-border/40">
                    <button
                      type="button"
                      onClick={() => setIsTratamentoModalOpen(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-surface-border bg-surface-raised py-3 text-sm font-bold text-ink-primary transition-colors hover:border-ice/50"
                    >
                      <Activity size={16} className="text-violet-400"/>
                      {tratamentosSelecionados.length > 0 ? `${tratamentosSelecionados.length} Quadro(s) vinculado(s)` : "Vincular Tratamento/CID"}
                    </button>
                  </div>

                  <div className="mt-4">
                    <TextArea
                      label="Anotações"
                      placeholder="Posologia complexa, dicas..."
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                    />
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
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 h-14 rounded-2xl text-base font-bold"
              >
                {isSubmitting ? (
                  <><Loader2 size={20} className="animate-spin" /> Salvando...</>
                ) : (
                  <><CheckCircle2 size={20} /> Concluir Cadastro</>
                )}
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
          confirmLabel="Desativar"
          cancelLabel="Cancelar"
          type="warning"
        />

        {(isSubmitting || uploadProgress > 0) && (
          <FloatingSpinner label={uploadProgress > 0 ? `Enviando anexo... ${uploadProgress}%` : "Salvando medicamento..."} />
        )}

        <SelectionModal<any>
          isOpen={isCidModalOpen}
          onClose={() => setIsCidModalOpen(false)}
          title="Selecionar CID"
          items={cids}
          getItemId={(i) => i.id!}
          getItemLabel={(i) => `${i.codigo} - ${i.descricao}`}
          onCreateNew={() => {
            setIsCidModalOpen(false);
            router.push("/saude/cids/novo");
          }}
          createNewLabel="Cadastrar Novo CID"
          onSelect={(item) => {
            trigger("vibrate");
            setCidIds((prev) => {
              if (prev.includes(item.id!)) {
                return prev.filter((id) => id !== item.id!);
              } else {
                return [...prev, item.id!];
              }
            });
          }}
          renderItem={(item) => {
             const isSelected = cidIds.includes(item.id!);
             return (
              <div className="flex items-center gap-3 w-full">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${isSelected ? "bg-emerald-400 text-void" : "bg-ice/10 text-ice"}`}>
                  {isSelected ? <Check size={18} /> : <FileText size={18} />}
                </div>
                <div className="text-left min-w-0">
                  <p className={`font-semibold ${isSelected ? "text-emerald-400" : "text-ink-primary"}`}>{item.codigo}</p>
                  <p className="text-xs text-ink-muted truncate">{item.descricao}</p>
                </div>
              </div>
             );
          }}
        />

        <SelectionModal<Farmacia>
          isOpen={isPharmacyModalOpen}
          onClose={() => setIsPharmacyModalOpen(false)}
          title="Selecionar Farmácia"
          items={farmacias}
          getItemId={(item) => item.id!}
          getItemLabel={(item) => item.nome}
          enableQuickCreate
          onQuickCreate={async (name) => { const id = await addFarmacia({ nome: name }); return { id, nome: name } as Farmacia; }}
          onSelect={(item) => { setFarmaciaId(item.id!); setFarmaciaNome(item.nome); setIsPharmacyModalOpen(false); }}
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
          onQuickCreate={async (name) => { const id = await addMedico({ nome: name }); return { id, nome: name } as Medico; }}
          onSelect={(item) => { setMedicoId(item.id!); setMedicoNome(item.nome); setIsDoctorModalOpen(false); }}
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
          onQuickCreate={async (name) => { const id = await addHospital({ nome: name, tipo: "hospital" }); return { id, nome: name, tipo: "hospital" } as Hospital; }}
          onSelect={(item) => { setHospitalId(item.id!); setHospitalNome(item.nome); setIsHospitalModalOpen(false); }}
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
          onQuickCreate={async (name) => { const id = await addLocal({ nome: name, tipo: "outro" }); return { id, nome: name, tipo: "outro" } as LocalSaude; }}
          onSelect={(item) => { setLocalId(item.id!); setLocalNome(item.nome); setIsLocalModalOpen(false); }}
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
          personId={activePersonId || ""}
        />
      </main>
    </PageTransition>
  );
}
