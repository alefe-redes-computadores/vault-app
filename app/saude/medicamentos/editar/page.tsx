"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  Save,
  Pill,
  Trash2,
  AlertTriangle,
  Package,
  Plus,
  Clock,
  Activity,
  Stethoscope,
  Droplet,
  Syringe,
  StickyNote,
  Palette,
  Info,
  Store,
  ArrowRightLeft,
  X,
  Circle,
  ChevronRight,
  Building2,
  DollarSign,
  Ban,
  Settings2,
  Upload,
  Camera,
  FileText,
  TrendingUp,
} from "lucide-react";

import { usePersons } from "@/hooks/usePersons";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useMedicos } from "@/hooks/useMedicos";
import { useFarmacias } from "@/hooks/useFarmacias";
import { useAuth } from "@/hooks/useAuth";
import { useSafeDb } from "@/hooks/useSafeDb";
import { useHapticFeedback } from "@/lib/haptics";
import { uploadFile } from "@/lib/supabase/storage";
import {
  suggestRenewalDate,
  VALIDADE_RECEITA_DIAS,
  getLocalTodayISO,
} from "@/lib/health-utils";
import {
  scheduleDoseNotifications,
  cancelDoseNotifications,
  requestNotificationPermission,
} from "@/lib/dose-notifications";
import { sugerirHorarios } from "@/lib/health-insights";
import type { TipoReceita, Attachment, Document } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { SelectionModal } from "@/components/SelectionModal";
import { db, safeAddHospital } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { CalculadoraGotas } from "@/components/saude/CalculadoraGotas";
import { SeletorTratamentoModal, getTratamentoIcon } from "@/components/saude/SeletorTratamentoModal";
import { SeletorReceita } from "@/components/saude/SeletorReceita";
import { useToast } from "@/components/ToastProvider";

const fadeUp = { initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -15 } };

function mascaraData(value: string) {
  return value.replace(/\D/g, "").replace(/(\d{2})(\d)/, "$1/$2").replace(/(\d{2})(\d)/, "$1/$2").replace(/(\d{4})\d+?$/, "$1");
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
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" fill={fill} />
    <line x1="12" y1="2" x2="12" y2="22" stroke="rgba(0, 0, 0, 0.3)" strokeWidth="2" />
  </svg>
);

const FORMATOS = [
  { id: "comprimido", label: "Redondo", icon: Circle },
  { id: "partido", label: "Partido", icon: SplitPillIcon },
  { id: "capsula", label: "Cápsula", icon: Pill },
  { id: "gota", label: "Gotas", icon: Droplet },
  { id: "injecao", label: "Injeção", icon: Syringe },
  { id: "adesivo", label: "Adesivo", icon: StickyNote },
];

const CORES_DISPONIVEIS = ["#FFFFFF", "#FCA5A5", "#F87171", "#FBBF24", "#34D399", "#60A5FA", "#818CF8", "#A78BFA", "#F472B6", "#9CA3AF"];

type EditIntent = "menu" | "compra" | "posologia" | "rede" | "suspensao" | "basico" | "evolucao";

function EditarMedicamentoContent() {
  const { trigger } = useHapticFeedback();
  const { showError } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "";

  const intentParam = searchParams.get("intent") as EditIntent;
  const [editIntent, setEditIntent] = useState<EditIntent>(intentParam || "menu");

  const { user } = useAuth();
  const persons = usePersons();
  const { getMedicamento, updateMedicamento, deleteMedicamento } = useMedicamentos();
  const { addDocument } = useSafeDb();
  const { medicos } = useMedicos();
  const { farmacias } = useFarmacias();

  const tratamentos = useLiveQuery(() => db.tratamentos.toArray(), []) || [];
  const medicamentosQuery = useLiveQuery(() => db.medicamentos.toArray(), []) || [];
  const hospitaisLocais = useLiveQuery(() => db.hospitais.toArray(), []) || [];
  const medicamentosAtivos = medicamentosQuery.filter((m: any) => m.id !== id && m.status !== "descontinuado");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showConfirmExitModal, setShowConfirmExitModal] = useState(false);

  // Dados Básicos
  const [documentId, setDocumentId] = useState("");
  const [personId, setPersonId] = useState("");
  const [nome, setNome] = useState("");
  const [dosagem, setDosagem] = useState("");
  const [formato, setFormato] = useState("comprimido");
  const [cores, setCores] = useState<string[]>([]);
  const isGotas = formato === "gota";

  // Smart Dosage
  const [tipoUso, setTipoUso] = useState<"continuo" | "esporadico" | "sos">("continuo");
  const [vezesAoDia, setVezesAoDia] = useState("1");
  const [primeiroHorario, setPrimeiroHorario] = useState("08:00");

  // Rede & Emissão
  const [medicoNome, setMedicoNome] = useState("");
  const [medicoId, setMedicoId] = useState("");
  const [estabelecimentoId, setEstabelecimentoId] = useState("");
  const [estabelecimentoNome, setEstabelecimentoNome] = useState("");
  const [farmaciaNome, setFarmaciaNome] = useState("");
  const [farmaciaId, setFarmaciaId] = useState("");
  const [preco, setPreco] = useState("");
  const [tipoReceita, setTipoReceita] = useState<TipoReceita>("comum");
  const [dataReceitaTexto, setDataReceitaTexto] = useState("");
  const [proximaRenovacaoTexto, setProximaRenovacaoTexto] = useState("");
  const [renovacaoEditadaManualmente, setRenovacaoEditadaManualmente] = useState(false);
  const [observacoes, setObservacoes] = useState("");

  // Evolução Clínica
  const [dosagemOriginal, setDosagemOriginal] = useState("");
  const [novaDosagem, setNovaDosagem] = useState("");
  const [medicoEvolucaoNome, setMedicoEvolucaoNome] = useState("");
  const [medicoEvolucaoId, setMedicoEvolucaoId] = useState("");
  const [historicoDosagens, setHistoricoDosagens] = useState<any[]>([]);

  // Suspensão
  const [statusAtivo, setStatusAtivo] = useState(true);
  const [motivoDescontinuacao, setMotivoDescontinuacao] = useState("");
  const [medicoDescontinuacaoId, setMedicoDescontinuacaoId] = useState("");
  const [medicoDescontinuacaoNome, setMedicoDescontinuacaoNome] = useState("");
  const [substituidoPorId, setSubstituidoPorId] = useState("");

  // Modais e Estoque
  const [tratamentosSelecionados, setTratamentosSelecionados] = useState<string[]>([]);
  const [isTratamentoModalOpen, setIsTratamentoModalOpen] = useState(false);
  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [isEstabelecimentoModalOpen, setIsEstabelecimentoModalOpen] = useState(false);
  const [activeEstabelecimentoTab, setActiveEstabelecimentoTab] = useState("hospital");
  const [isDoctorDescontinuacaoModalOpen, setIsDoctorDescontinuacaoModalOpen] = useState(false);
  const [isDoctorEvolucaoModalOpen, setIsDoctorEvolucaoModalOpen] = useState(false);
  const [isSubstitutoModalOpen, setIsSubstitutoModalOpen] = useState(false);
  const [isPharmacyModalOpen, setIsPharmacyModalOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDesativarEstoqueModal, setShowDesativarEstoqueModal] = useState(false);

  const [estoqueAtivo, setEstoqueAtivo] = useState(false);
  const [estoqueQuantidade, setEstoqueQuantidade] = useState("");
  const [estoqueDataReferenciaTexto, setEstoqueDataReferenciaTexto] = useState("");
  const [estoqueUnidade, setEstoqueUnidade] = useState("comprimido(s)");
  const [estoqueUnidadePorDose, setEstoqueUnidadePorDose] = useState("1");
  const [horarios, setHorarios] = useState<string[]>([""]);
  const [horariosOriginais, setHorariosOriginais] = useState<string[]>([]);

  const [isGotasCalcAtivo, setIsGotasCalcAtivo] = useState(false);
  const [mlTotal, setMlTotal] = useState("");
  const [gotasPorMl, setGotasPorMl] = useState("20");

  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [shakeFields, setShakeFields] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Selecteds
  const selectedMedico = medicos.find((m: any) => m.id === medicoId) || medicos.find((m: any) => m.nome === medicoNome);
  const selectedMedicoDescontinuacao =
    medicos.find((m: any) => m.id === medicoDescontinuacaoId) || medicos.find((m: any) => m.nome === medicoDescontinuacaoNome);
  const selectedMedicoEvolucao =
    medicos.find((m: any) => m.id === medicoEvolucaoId) || medicos.find((m: any) => m.nome === medicoEvolucaoNome);
  const selectedFarmacia = farmacias.find((f: any) => f.id === farmaciaId) || farmacias.find((f: any) => f.nome === farmaciaNome);
  const selectedSubstituto = medicamentosQuery.find((m: any) => m.id === substituidoPorId);
  const selectedTratamentos = tratamentos.filter((t: any) => tratamentosSelecionados.includes(t.id));
  const selectedEstabelecimento = hospitaisLocais.find((h: any) => h.id === estabelecimentoId);

  const markChanged = () => setHasChanges(true);

  // ============================================================
  // CARREGAR DADOS DO MEDICAMENTO
  // ============================================================
  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }
    getMedicamento(id)
      .then(async (item: any) => {
        if (!item) {
          setNotFound(true);
          setIsLoading(false);
          return;
        }

        setPersonId(item.person_id || "");
        setNome(item.nome || "");
        setDosagem(item.dosagem || "");
        setDosagemOriginal(item.dosagem || "");
        setNovaDosagem(item.dosagem || "");
        setHistoricoDosagens(item.historico_dosagens || []);

        setFormato(item.formato || "comprimido");
        setCores(item.cores || []);
        setTipoUso(item.tipo_uso || "continuo");
        setMedicoNome(item.medico || "");
        setMedicoId(item.medico_id || "");
        setEstabelecimentoId(item.estabelecimento_id || "");
        setFarmaciaNome(item.farmacia || "");
        setFarmaciaId(item.farmacia_id || "");
        setPreco(item.preco ? String(item.preco) : "");
        setTipoReceita((item.tipo_receita as TipoReceita) || "comum");
        setDataReceitaTexto(isoParaBr(item.data_receita || ""));
        setProximaRenovacaoTexto(isoParaBr(item.proxima_renovacao || ""));
        setObservacoes(item.observacoes || "");
        setStatusAtivo(item.status !== "descontinuado");
        setMotivoDescontinuacao(item.motivo_descontinuacao || "");
        setMedicoDescontinuacaoId(item.medico_descontinuacao_id || "");
        setMedicoDescontinuacaoNome(item.medico_descontinuacao_nome || "");
        setSubstituidoPorId(item.substituido_por_id || "");

        if (item.document_id) {
          setDocumentId(item.document_id);
          const doc = await db.documents.get(item.document_id);
          if (doc && doc.attachments && doc.attachments.length > 0) setAttachment(doc.attachments[0]);
        }

        if (item.estoque_ml_total) {
          setIsGotasCalcAtivo(true);
          setMlTotal(String(item.estoque_ml_total));
          setGotasPorMl(String(item.estoque_gotas_por_ml || 20));
        }

        if (item.estabelecimento_id) {
          const est = await db.hospitais.get(item.estabelecimento_id);
          if (est) setEstabelecimentoNome(est.nome);
        }

        setTratamentosSelecionados(item.tratamento_ids || []);

        if (typeof item.estoque_quantidade === "number" && item.estoque_data_referencia && Array.isArray(item.estoque_horarios) && item.estoque_horarios.length > 0) {
          setEstoqueAtivo(true);
          setEstoqueQuantidade(String(item.estoque_quantidade));
          setEstoqueDataReferenciaTexto(isoParaBr(item.estoque_data_referencia));
          setEstoqueUnidade(item.estoque_unidade_medida || "comprimido(s)");
          setEstoqueUnidadePorDose(String(item.estoque_unidade_por_dose || 1));
          setHorarios(item.estoque_horarios);
          setHorariosOriginais(item.estoque_horarios);
        } else {
          setEstoqueDataReferenciaTexto(isoParaBr(getLocalTodayISO()));
        }
        setIsLoading(false);
      })
      .catch(() => {
        setNotFound(true);
        setIsLoading(false);
      });
  }, [id]);

  // ============================================================
  // FUNÇÕES AUXILIARES
  // ============================================================
  const toggleFormato = (novoFormato: string) => {
    trigger("vibrate");
    setFormato(novoFormato);
    if (novoFormato === "partido") setEstoqueUnidadePorDose("0.5");
    else if (novoFormato !== "gota") setEstoqueUnidadePorDose("1");
    markChanged();
  };

  const toggleCor = (hex: string) => {
    trigger("vibrate");
    setCores((prev) =>
      prev.includes(hex) ? prev.filter((c) => c !== hex) : prev.length >= 2 ? [prev[1], hex] : [...prev, hex]
    );
    markChanged();
  };

  const handleGerarHorarios = () => {
    if (tipoUso !== "continuo") return;
    const qtd = Number(vezesAoDia);
    if (!qtd || qtd <= 0) {
      setErrors((prev) => ({ ...prev, vezesAoDia: "Obrigatório" }));
      triggerShake(["vezesAoDia"]);
      return;
    }
    if (!primeiroHorario) {
      triggerShake(["primeiroHorario"]);
      return;
    }
    const novosHorarios = sugerirHorarios(primeiroHorario, qtd);
    setHorarios(novosHorarios.length > 0 ? novosHorarios : [primeiroHorario]);
    markChanged();
    trigger("success");
  };

  const handleDataReceitaBlur = () => {
    const isoData = brParaIso(dataReceitaTexto);
    if (!isoData) return;
    const dias = VALIDADE_RECEITA_DIAS[tipoReceita];
    if (dias && !renovacaoEditadaManualmente) {
      setProximaRenovacaoTexto(isoParaBr(suggestRenewalDate(isoData, tipoReceita)));
      markChanged();
    }
  };

  const handleTipoReceitaChange = (tipo: TipoReceita) => {
    trigger("vibrate");
    setTipoReceita(tipo);
    markChanged();
    const isoData = brParaIso(dataReceitaTexto);
    if (isoData && VALIDADE_RECEITA_DIAS[tipo] && !renovacaoEditadaManualmente) {
      setProximaRenovacaoTexto(isoParaBr(suggestRenewalDate(isoData, tipo)));
    }
  };

  const handleDateChange = (setter: any, isRenovacao = false) => (e: any) => {
    setter(mascaraData(e.target.value));
    if (isRenovacao) setRenovacaoEditadaManualmente(true);
    markChanged();
  };

  const toggleEstoque = () => {
    trigger("vibrate");
    if (estoqueAtivo && (Number(estoqueQuantidade) > 0 || horarios.filter(Boolean).length > 0)) {
      setShowDesativarEstoqueModal(true);
      return;
    }
    setEstoqueAtivo(!estoqueAtivo);
    markChanged();
  };

  const updateHorario = (index: number, value: string) => {
    setHorarios((prev) => prev.map((h, i) => (i === index ? value : h)));
    markChanged();
  };
  const addHorario = () => {
    trigger("vibrate");
    setHorarios((prev) => [...prev, ""]);
    markChanged();
  };
  const removeHorario = (index: number) => {
    trigger("vibrate");
    setHorarios((prev) => prev.filter((_, i) => i !== index));
    markChanged();
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
        uploaded_at: new Date().toISOString(),
      });
      markChanged();
    }
    e.target.value = "";
  };

  const removeAttachment = () => {
    if (attachment?.url.startsWith("blob:")) URL.revokeObjectURL(attachment.url);
    setAttachment(null);
    setLocalFile(null);
    markChanged();
    trigger("vibrate");
  };

  const triggerShake = (fieldNames: string[]) => {
    trigger("error");
    setShakeFields(fieldNames);
    setTimeout(() => setShakeFields([]), 600);
  };

  // ============================================================
  // VALIDAÇÃO
  // ============================================================
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    const shakeList: string[] = [];

    if (editIntent === "basico" || editIntent === "menu") {
      if (!personId) {
        newErrors.personId = "Obrigatório";
        shakeList.push("personId");
      }
      if (!nome.trim()) {
        newErrors.nome = "Obrigatório";
        shakeList.push("nome");
      }
    }

    if (editIntent === "evolucao" && !novaDosagem.trim()) {
      newErrors.novaDosagem = "Obrigatória";
      shakeList.push("novaDosagem");
    }

    if (dataReceitaTexto && dataReceitaTexto.length < 10) {
      newErrors.dataReceitaTexto = "Data inválida";
      shakeList.push("dataReceitaTexto");
    }
    if (proximaRenovacaoTexto && proximaRenovacaoTexto.length < 10) {
      newErrors.proximaRenovacaoTexto = "Data inválida";
      shakeList.push("proximaRenovacaoTexto");
    }
    if (!statusAtivo && !motivoDescontinuacao.trim()) {
      newErrors.motivoDescontinuacao = "Informe o motivo";
      shakeList.push("motivoDescontinuacao");
    }

    if (estoqueAtivo && editIntent === "compra") {
      if (!estoqueQuantidade || Number(estoqueQuantidade) <= 0) {
        newErrors.estoqueQuantidade = "Informe a quantidade";
        shakeList.push("estoqueQuantidade");
      }
      if (!estoqueDataReferenciaTexto || estoqueDataReferenciaTexto.length < 10) {
        newErrors.estoqueDataReferenciaTexto = "Data inválida";
        shakeList.push("estoqueDataReferenciaTexto");
      }
    }

    setErrors(newErrors);
    if (shakeList.length > 0) {
      triggerShake(shakeList);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    return Object.keys(newErrors).length === 0;
  };

  // ============================================================
  // SALVAR
  // ============================================================
  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    trigger("vibrate");

    try {
      const horariosFiltrados = horarios.filter((h) => h.trim());
      const dataReceitaISO = brParaIso(dataReceitaTexto);
      const proximaRenovacaoISO = brParaIso(proximaRenovacaoTexto);
      const estoqueDataReferenciaISO = brParaIso(estoqueDataReferenciaTexto);

      let dosagemFinal = dosagem;
      let historicoFinal = [...historicoDosagens];

      // Evolução Clínica
      if (editIntent === "evolucao" && novaDosagem.trim() !== dosagemOriginal) {
        historicoFinal.push({
          dosagem_antiga: dosagemOriginal,
          data_mudanca: getLocalTodayISO(),
          medico_responsavel: selectedMedicoEvolucao?.nome || medicoEvolucaoNome || "Não informado",
        });
        dosagemFinal = novaDosagem.trim();
      }

      // Documento
      let updatedDocId = documentId;
      if (!documentId && (dataReceitaISO || attachment)) {
        const docData: Omit<Document, 'id' | 'created_at' | 'updated_at' | 'synced'> = {
          user_id: user?.id || "",
          person_id: personId,
          category_id: "saude",
          type: "receita",
          title: `Receita — ${nome.trim()}`,
          description: observacoes.trim() || undefined,
          metadata: {
            medication: nome.trim(),
            dosage: dosagemFinal,
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
        updatedDocId = await addDocument(docData);
        setDocumentId(updatedDocId);
      } else if (documentId) {
        try {
          const doc = await db.documents.get(documentId);
          if (doc && doc.id) {
            const updatedAttachments = attachment ? [attachment] : [];
            await db.documents.update(doc.id, {
              attachments: updatedAttachments,
              metadata: {
                ...doc.metadata,
                dosage: dosagemFinal,
                tratamento_ids: tratamentosSelecionados,
                renewal_date: proximaRenovacaoISO,
              },
              updated_at: new Date().toISOString(),
              synced: false,
            });
          }
        } catch {}
      }

      // Upload de imagem
      if (localFile && user && attachment && updatedDocId) {
        const { url, error } = await uploadFile(user.id, localFile, "saude");
        if (!error && url) {
          await db.documents.update(updatedDocId, {
            attachments: [{ ...attachment, url }],
            updated_at: new Date().toISOString(),
            synced: false,
          });
        }
      }

      // Atualizar medicamento (sem `as any`)
      await updateMedicamento(id, {
        person_id: personId,
        nome: nome.trim(),
        dosagem: dosagemFinal,
        formato,
        cores,
        tipo_uso: tipoUso,
        historico_dosagens: historicoFinal,
        medico: selectedMedico?.nome || medicoNome.trim(),
        medico_id: medicoId || undefined,
        estabelecimento_id: estabelecimentoId || undefined,
        farmacia: selectedFarmacia?.nome || farmaciaNome.trim(),
        farmacia_id: farmaciaId || undefined,
        preco: preco ? Number(preco.replace(",", ".")) : undefined,
        data_receita: dataReceitaISO,
        proxima_renovacao: proximaRenovacaoISO,
        observacoes: observacoes.trim() || undefined,
        tipo_receita: tipoReceita,
        tratamento_ids: tratamentosSelecionados,
        status: statusAtivo ? "ativo" : "descontinuado",
        motivo_descontinuacao: !statusAtivo ? motivoDescontinuacao.trim() : undefined,
        medico_descontinuacao_id: !statusAtivo ? medicoDescontinuacaoId || undefined : undefined,
        medico_descontinuacao_nome: !statusAtivo
          ? selectedMedicoDescontinuacao?.nome || medicoDescontinuacaoNome.trim()
          : undefined,
        substituido_por_id: !statusAtivo ? substituidoPorId || undefined : undefined,
        data_descontinuacao: !statusAtivo ? getLocalTodayISO() : undefined,
        estoque_quantidade: estoqueAtivo ? Number(estoqueQuantidade) : undefined,
        estoque_data_referencia: estoqueAtivo ? estoqueDataReferenciaISO : undefined,
        estoque_horarios: tipoUso === "continuo" && estoqueAtivo ? horariosFiltrados : undefined,
        estoque_unidade_por_dose: estoqueAtivo ? Number(estoqueUnidadePorDose) || 1 : undefined,
        estoque_unidade_medida: estoqueAtivo ? (isGotas ? "gota(s)" : estoqueUnidade) : undefined,
        estoque_ml_total: isGotasCalcAtivo && formato === "gota" ? Number(mlTotal) : undefined,
        estoque_gotas_por_ml: isGotasCalcAtivo && formato === "gota" ? Number(gotasPorMl) : undefined,
      });

      // Notificações
      if (horariosOriginais.length > 0) await cancelDoseNotifications({ id, estoque_horarios: horariosOriginais } as any);
      if (estoqueAtivo && tipoUso === "continuo" && horariosFiltrados.length > 0 && statusAtivo) {
        const granted = await requestNotificationPermission();
        if (granted)
          await scheduleDoseNotifications({
            id,
            nome: nome.trim(),
            dosagem: dosagemFinal,
            estoque_horarios: horariosFiltrados,
          } as any);
      }

      setHasChanges(false);
      trigger("success");

      if (editIntent !== "menu") {
        setEditIntent("menu");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        router.back();
      }
    } catch (error) {
      console.error("Erro ao salvar:", error);
      showError("Erro ao salvar alterações. Tente novamente.");
      trigger("error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      if (horariosOriginais.length > 0) await cancelDoseNotifications({ id, estoque_horarios: horariosOriginais } as any);
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

  const handleBack = () => {
    if (hasChanges && editIntent !== "menu") {
      setShowConfirmExitModal(true);
      return;
    }
    if (editIntent !== "menu") {
      setEditIntent("menu");
    } else {
      router.back();
    }
  };

  // ============================================================
  // RENDER
  // ============================================================
  if (isLoading) return <LoadingSkeleton />;
  if (notFound)
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-void px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-coral/10 text-coral">
          <AlertTriangle size={26} />
        </div>
        <p className="mt-4 font-semibold text-ink-primary">Medicamento não encontrado</p>
        <button onClick={() => router.replace("/saude")} className="mt-4 rounded-full bg-ice px-5 py-2.5 text-sm font-semibold text-void">
          Voltar
        </button>
      </main>
    );

  const SelectedFormatIcon = FORMATOS.find((f) => f.id === formato)?.icon || Circle;
  const hasTwoColors = cores.length === 2 && (formato === "comprimido" || formato === "partido" || formato === "capsula");
  const gradientId = `split-${id}`;

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={() => {}} />

        <svg width="0" height="0" className="absolute">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="50%" stopColor={cores[0] || "#9CA3AF"} />
              <stop offset="50%" stopColor={cores.length === 2 ? cores[1] : cores[0] || "#9CA3AF"} />
            </linearGradient>
          </defs>
        </svg>

        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 pt-6 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button onClick={handleBack} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border bg-surface-raised active:scale-95">
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <SelectedFormatIcon size={16} fill={hasTwoColors ? `url(#${gradientId})` : cores[0] || "#9CA3AF"} stroke="none" />
                <p className="font-mono text-[11px] uppercase tracking-widest text-ice">Ajustes</p>
              </div>
              <div className="flex items-center justify-between">
                <h1 className="mt-0.5 truncate text-xl font-bold uppercase text-ink-primary">
                  {editIntent === "menu" ? nome || "Medicamento" : `Editando ${nome}`}
                </h1>
                {hasChanges && editIntent !== "menu" && (
                  <button
                    onClick={() => setShowConfirmExitModal(true)}
                    className="ml-4 shrink-0 text-sm font-medium text-ink-muted transition-colors hover:text-coral"
                  >
                    Descartar
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>

        <section className="px-5 pt-6 space-y-6">
          <AnimatePresence mode="wait">
            {/* ================= MENU DE INTENÇÕES ================= */}
            {editIntent === "menu" && (
              <motion.div key="menu" variants={fadeUp} initial="initial" animate="animate" exit="exit" className="grid grid-cols-1 gap-4">
                <p className="text-sm text-ink-muted mb-2 font-medium">O que você deseja atualizar?</p>

                <button
                  onClick={() => {
                    trigger("vibrate");
                    setEditIntent("compra");
                  }}
                  className="flex items-center justify-between rounded-[24px] border border-surface-border/50 bg-surface p-5 text-left shadow-sm active:scale-95 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-400">
                      <Package size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-ink-primary">Estoque & Compra</h3>
                      <p className="text-xs text-ink-muted mt-0.5">Caixas e valores</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-ink-muted" />
                </button>

                <button
                  onClick={() => {
                    trigger("vibrate");
                    setEditIntent("evolucao");
                  }}
                  className="flex items-center justify-between rounded-[24px] border border-ice/30 bg-ice/5 p-5 text-left shadow-sm active:scale-95 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ice/20 text-ice">
                      <TrendingUp size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-ice">Evolução de Dose</h3>
                      <p className="text-xs text-ink-muted mt-0.5">Aumento ou redução de mg/ml</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-ink-muted" />
                </button>

                <button
                  onClick={() => {
                    trigger("vibrate");
                    setEditIntent("posologia");
                  }}
                  className="flex items-center justify-between rounded-[24px] border border-surface-border/50 bg-surface p-5 text-left shadow-sm active:scale-95 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-400/10 text-blue-400">
                      <Clock size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-ink-primary">Posologia & Formato</h3>
                      <p className="text-xs text-ink-muted mt-0.5">Horários e aparência</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-ink-muted" />
                </button>

                <button
                  onClick={() => {
                    trigger("vibrate");
                    setEditIntent("rede");
                  }}
                  className="flex items-center justify-between rounded-[24px] border border-surface-border/50 bg-surface p-5 text-left shadow-sm active:scale-95 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-400/10 text-violet-400">
                      <Stethoscope size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-ink-primary">Rede & Receita</h3>
                      <p className="text-xs text-ink-muted mt-0.5">Médico, local e anexos</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-ink-muted" />
                </button>

                <button
                  onClick={() => {
                    trigger("vibrate");
                    setEditIntent("suspensao");
                  }}
                  className="flex items-center justify-between rounded-[24px] border border-surface-border/50 bg-surface p-5 text-left shadow-sm active:scale-95 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${statusAtivo ? "bg-amber-400/10 text-amber-400" : "bg-coral/10 text-coral"}`}>
                      <Ban size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-ink-primary">{statusAtivo ? "Suspender Tratamento" : "Retomar Tratamento"}</h3>
                      <p className="text-xs text-ink-muted mt-0.5">Status e pausas</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-ink-muted" />
                </button>

                <button
                  onClick={() => {
                    trigger("vibrate");
                    setEditIntent("basico");
                  }}
                  className="flex items-center justify-between rounded-[24px] border border-surface-border/50 bg-surface p-5 text-left shadow-sm active:scale-95 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-400/10 text-zinc-400">
                      <Settings2 size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-ink-primary">Informações Básicas</h3>
                      <p className="text-xs text-ink-muted mt-0.5">Nome e CIDs</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-ink-muted" />
                </button>
              </motion.div>
            )}

            {/* ================= TELA: EVOLUÇÃO CLÍNICA ================= */}
            {editIntent === "evolucao" && (
              <motion.div key="evolucao" variants={fadeUp} initial="initial" animate="animate" exit="exit" className="space-y-6">
                <div className="rounded-[28px] border border-ice/30 bg-ice/5 p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <Info size={20} className="mt-0.5 shrink-0 text-ice" />
                    <p className="text-sm text-ink-primary">
                      Registre alterações de dose feitas pelo médico (ex: 5mg para 10mg). O histórico antigo será salvo
                      automaticamente na evolução clínica do paciente.
                    </p>
                  </div>
                </div>

                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm space-y-5">
                  <div>
                    <label className="text-xs font-medium text-ink-muted">Dosagem Atual</label>
                    <p className="text-lg font-bold text-ink-primary">{dosagemOriginal}</p>
                  </div>
                  <div className={`transition-all ${shakeFields.includes("novaDosagem") ? "animate-shake" : ""}`}>
                    <Input
                      label="Nova Dosagem"
                      placeholder="Ex: 10mg"
                      value={novaDosagem}
                      onChange={(e) => {
                        setNovaDosagem(e.target.value);
                        markChanged();
                      }}
                      error={errors.novaDosagem}
                    />
                  </div>
                  <div className="pt-4 border-t border-surface-border/40">
                    <label className="mb-1.5 block text-xs font-medium text-ink-muted">Quem alterou a dose?</label>
                    <button
                      type="button"
                      onClick={() => setIsDoctorEvolucaoModalOpen(true)}
                      className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3.5 text-left"
                    >
                      <span className="truncate font-medium text-ink-primary">
                        {selectedMedicoEvolucao?.nome || medicoEvolucaoNome || "Selecionar médico..."}
                      </span>
                      <span className="text-xs font-bold text-ice">Alterar</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ================= TELA: COMPRA ================= */}
            {editIntent === "compra" && (
              <motion.div key="compra" variants={fadeUp} initial="initial" animate="animate" exit="exit" className="space-y-6">
                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Package size={16} className="text-ice" />
                      <h3 className="text-sm font-semibold text-ink-primary">Controle Atual</h3>
                    </div>
                    <button
                      onClick={toggleEstoque}
                      className={`h-6 w-11 rounded-full p-0.5 transition-colors ${estoqueAtivo ? "bg-ice" : "bg-surface-raised border border-surface-border"}`}
                    >
                      <div className={`h-5 w-5 rounded-full bg-void shadow-sm transition-transform ${estoqueAtivo ? "translate-x-5" : ""}`} />
                    </button>
                  </div>
                  <AnimatePresence>
                    {estoqueAtivo && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4 pt-2 overflow-hidden"
                      >
                        <div className="grid grid-cols-2 gap-3">
                          <div className={`transition-all ${shakeFields.includes("estoqueQuantidade") ? "animate-shake" : ""}`}>
                            <Input
                              label="Unidades na caixa"
                              type="number"
                              inputMode="numeric"
                              value={estoqueQuantidade}
                              onChange={(e) => {
                                setEstoqueQuantidade(e.target.value);
                                markChanged();
                              }}
                              error={errors.estoqueQuantidade}
                            />
                          </div>
                          <Input
                            label="Gasto por dose"
                            type="number"
                            inputMode="decimal"
                            step="0.5"
                            value={estoqueUnidadePorDose}
                            onChange={(e) => {
                              setEstoqueUnidadePorDose(e.target.value);
                              markChanged();
                            }}
                          />
                        </div>
                        <div className={`transition-all ${shakeFields.includes("estoqueDataReferenciaTexto") ? "animate-shake" : ""}`}>
                          <Input
                            label="Data da contagem"
                            placeholder="DD/MM/AAAA"
                            value={estoqueDataReferenciaTexto}
                            onChange={handleDateChange(setEstoqueDataReferenciaTexto)}
                            maxLength={10}
                            inputMode="numeric"
                            error={errors.estoqueDataReferenciaTexto}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm space-y-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Store size={16} className="text-ice" />
                    <h3 className="text-sm font-semibold text-ink-primary">Aquisição Expressa</h3>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink-primary">Farmácia</label>
                    <button
                      type="button"
                      onClick={() => setIsPharmacyModalOpen(true)}
                      className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3.5 text-left"
                    >
                      <span className="truncate font-medium text-ink-primary">{farmaciaNome || "Onde comprou?"}</span>
                      <span className="text-xs font-bold text-ice">Selecionar</span>
                    </button>
                  </div>
                  <div>
                    <Input
                      label="Valor pago (R$)"
                      type="number"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={preco}
                      onChange={(e) => {
                        setPreco(e.target.value);
                        markChanged();
                      }}
                      icon={<DollarSign size={16} className="text-emerald-400" />}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* ================= TELA: POSOLOGIA ================= */}
            {editIntent === "posologia" && (
              <motion.div key="posologia" variants={fadeUp} initial="initial" animate="animate" exit="exit" className="space-y-6">
                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <Palette size={16} className="text-ice" />
                    <h3 className="text-sm font-semibold text-ink-primary">Aparência do Remédio</h3>
                  </div>
                  <div className="mb-5 grid grid-cols-3 gap-2">
                    {FORMATOS.map((f) => {
                      const isActive = formato === f.id;
                      const Icon = f.icon;
                      return (
                        <button
                          key={f.id}
                          onClick={() => toggleFormato(f.id)}
                          className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border py-3 transition-all ${
                            isActive
                              ? "border-ice bg-ice/15 text-ice"
                              : "border-surface-border/40 bg-surface-raised text-ink-muted"
                          }`}
                        >
                          <Icon size={20} fill={isActive ? "currentColor" : "none"} strokeWidth={isActive ? 0 : 2} />
                          <span className="text-[10px] font-medium">{f.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-2.5 mb-5">
                    {CORES_DISPONIVEIS.map((hex) => (
                      <button
                        key={hex}
                        onClick={() => toggleCor(hex)}
                        className={`h-8 w-8 rounded-full border-2 transition-transform ${
                          cores.includes(hex) ? "scale-110 border-ice" : "border-transparent"
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                </div>

                {isGotas && (
                  <CalculadoraGotas
                    isAtivo={isGotasCalcAtivo}
                    onToggle={setIsGotasCalcAtivo}
                    mlTotal={mlTotal}
                    setMlTotal={setMlTotal}
                    gotasPorMl={gotasPorMl}
                    setGotasPorMl={setGotasPorMl}
                    onEstoqueCalculado={(v) => {
                      if (isGotasCalcAtivo && estoqueAtivo) setEstoqueQuantidade(String(v));
                      markChanged();
                    }}
                  />
                )}

                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <Clock size={16} className="text-ice" />
                    <h3 className="text-sm font-semibold text-ink-primary">Posologia & Uso</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <button
                      type="button"
                      onClick={() => {
                        trigger("vibrate");
                        setTipoUso("continuo");
                        markChanged();
                      }}
                      className={`rounded-xl border py-3 text-sm font-bold transition-all ${
                        tipoUso === "continuo"
                          ? "border-ice bg-ice/10 text-ice"
                          : "border-surface-border/50 bg-surface-raised text-ink-muted"
                      }`}
                    >
                      Contínuo
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        trigger("vibrate");
                        setTipoUso("esporadico");
                        markChanged();
                      }}
                      className={`rounded-xl border py-3 text-sm font-bold transition-all ${
                        tipoUso === "esporadico"
                          ? "border-amber-400 bg-amber-400/10 text-amber-400"
                          : "border-surface-border/50 bg-surface-raised text-ink-muted"
                      }`}
                    >
                      SOS / Esporádico
                    </button>
                  </div>

                  {tipoUso === "continuo" && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className={`transition-all ${shakeFields.includes("vezesAoDia") ? "animate-shake" : ""}`}>
                          <Input
                            label="Doses/dia"
                            type="number"
                            inputMode="numeric"
                            value={vezesAoDia}
                            onChange={(e) => setVezesAoDia(e.target.value)}
                            error={errors.vezesAoDia}
                          />
                        </div>
                        <div className={`transition-all ${shakeFields.includes("primeiroHorario") ? "animate-shake" : ""}`}>
                          <Input
                            label="1º Horário"
                            type="time"
                            value={primeiroHorario}
                            onChange={(e) => setPrimeiroHorario(e.target.value)}
                          />
                        </div>
                      </div>
                      <button
                        onClick={handleGerarHorarios}
                        className="w-full bg-surface-raised border border-surface-border text-sm font-bold text-ice py-2 rounded-xl active:scale-95 transition-transform"
                      >
                        Auto-Completar Horários
                      </button>

                      <div className="rounded-xl bg-surface-raised p-4 border border-surface-border mt-3">
                        <div className="flex flex-wrap gap-2.5">
                          {horarios.map((h, i) => (
                            <div key={i} className="flex items-center gap-1">
                              <input
                                type="text"
                                placeholder="08:00"
                                value={h}
                                maxLength={5}
                                onChange={(e) => {
                                  let v = e.target.value.replace(/\D/g, "");
                                  if (v.length > 2) v = v.substring(0, 2) + ":" + v.substring(2);
                                  updateHorario(i, v);
                                }}
                                className="w-16 bg-void border border-surface-border rounded-xl text-center py-2.5 text-sm font-mono focus:border-ice outline-none shadow-inner"
                              />
                              {horarios.length > 1 && (
                                <button
                                  onClick={() => removeHorario(i)}
                                  className="p-2.5 text-coral bg-coral/10 hover:bg-coral/20 rounded-xl transition-colors"
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ================= TELA: REDE ================= */}
            {editIntent === "rede" && (
              <motion.div key="rede" variants={fadeUp} initial="initial" animate="animate" exit="exit" className="space-y-6">
                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm space-y-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Stethoscope size={16} className="text-ice" />
                    <h3 className="text-sm font-semibold text-ink-primary">Profissional & Local</h3>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-ink-muted">Médico Prescritor</label>
                    <button
                      type="button"
                      onClick={() => setIsDoctorModalOpen(true)}
                      className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3.5 text-left"
                    >
                      <span className="block truncate font-medium text-ink-primary">{medicoNome || "Vincular médico..."}</span>
                      <span className="text-xs font-bold text-ice">Alterar</span>
                    </button>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-ink-muted">Hospital / Clínica Emissora</label>
                    <button
                      type="button"
                      onClick={() => setIsEstabelecimentoModalOpen(true)}
                      className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3.5 text-left"
                    >
                      <span className="truncate font-medium text-ink-primary">{estabelecimentoNome || "Vincular local..."}</span>
                      <span className="text-xs font-bold text-ice">Alterar</span>
                    </button>
                  </div>
                </div>

                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <FileText size={16} className="text-ice" />
                    <h3 className="text-sm font-semibold text-ink-primary">Receita Digital</h3>
                  </div>
                  <SeletorReceita
                    selected={tipoReceita}
                    onChange={handleTipoReceitaChange}
                    onRenovarClick={() => router.push(`/saude/renovacao/nova?medicamento_id=${id}`)}
                  />

                  <div className="grid grid-cols-2 gap-3 mt-4 mb-5 border-t border-surface-border/40 pt-4">
                    <div className={`transition-all ${shakeFields.includes("dataReceitaTexto") ? "animate-shake" : ""}`}>
                      <Input
                        label="Data da receita"
                        placeholder="DD/MM/AAAA"
                        value={dataReceitaTexto}
                        onChange={handleDateChange(setDataReceitaTexto)}
                        onBlur={handleDataReceitaBlur}
                        maxLength={10}
                        inputMode="numeric"
                        error={errors.dataReceitaTexto}
                      />
                    </div>
                    <div className={`transition-all ${shakeFields.includes("proximaRenovacaoTexto") ? "animate-shake" : ""}`}>
                      <Input
                        label="Vencimento"
                        placeholder="DD/MM/AAAA"
                        value={proximaRenovacaoTexto}
                        onChange={handleDateChange(setProximaRenovacaoTexto, true)}
                        maxLength={10}
                        inputMode="numeric"
                        error={errors.proximaRenovacaoTexto}
                      />
                    </div>
                  </div>

                  {!attachment ? (
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-surface-border/60 bg-surface-raised px-4 py-4 text-ink-muted hover:border-ice/40 hover:text-ice"
                      >
                        <Upload size={18} />
                        <span className="text-xs font-semibold">Anexar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-surface-border/60 bg-surface-raised px-4 py-4 text-ink-muted hover:border-ice/40 hover:text-ice"
                      >
                        <Camera size={18} />
                        <span className="text-xs font-semibold">Foto</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 rounded-2xl border border-surface-border/50 bg-surface-raised p-3 mt-4">
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
                      <button
                        type="button"
                        onClick={removeAttachment}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coral/10 text-coral"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ================= TELA: SUSPENSÃO ================= */}
            {editIntent === "suspensao" && (
              <motion.div key="suspensao" variants={fadeUp} initial="initial" animate="animate" exit="exit" className="space-y-6">
                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3 mb-6">
                    <div>
                      <h3 className="text-sm font-semibold text-ink-primary">Status Atual</h3>
                      <p className="mt-0.5 text-xs text-ink-muted">O tratamento está ativo?</p>
                    </div>
                    <button
                      onClick={() => {
                        trigger("vibrate");
                        setStatusAtivo(!statusAtivo);
                        markChanged();
                      }}
                      className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition-colors ${
                        statusAtivo
                          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
                          : "border-coral/30 bg-coral/10 text-coral"
                      }`}
                    >
                      {statusAtivo ? "EM USO" : "SUSPENSO"}
                    </button>
                  </div>

                  <AnimatePresence>
                    {!statusAtivo && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-4 border-t border-surface-border/40 pt-5">
                          <div className={`transition-all ${shakeFields.includes("motivoDescontinuacao") ? "animate-shake" : ""}`}>
                            <TextArea
                              label="Motivo da suspensão *"
                              placeholder="Ex: efeitos adversos, alta médica..."
                              value={motivoDescontinuacao}
                              onChange={(e) => {
                                setMotivoDescontinuacao(e.target.value);
                                markChanged();
                              }}
                              error={errors.motivoDescontinuacao}
                            />
                          </div>
                          <div>
                            <label className="mb-1.5 block text-sm font-medium text-ink-primary flex items-center gap-2">
                              <Stethoscope size={14} className="text-ink-muted" />
                              Médico que ordenou a parada
                            </label>
                            <button
                              onClick={() => setIsDoctorDescontinuacaoModalOpen(true)}
                              className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3.5 text-left"
                            >
                              <span className="truncate font-medium text-ink-primary">
                                {selectedMedicoDescontinuacao?.nome || medicoDescontinuacaoNome || "Vincular médico..."}
                              </span>
                              <span className="ml-2 text-xs font-bold text-ice">Selecionar</span>
                            </button>
                          </div>
                          <div>
                            <label className="mb-1.5 block text-sm font-medium text-ink-primary flex items-center gap-2">
                              <ArrowRightLeft size={14} className="text-ink-muted" />
                              Substituído por
                            </label>
                            <button
                              onClick={() => setIsSubstitutoModalOpen(true)}
                              className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3.5 text-left"
                            >
                              <span className="truncate font-medium text-ink-primary">
                                {selectedSubstituto ? selectedSubstituto.nome : "Nenhum substituto"}
                              </span>
                              <span className="ml-2 text-xs font-bold text-ice">
                                {selectedSubstituto ? "Alterar" : "Vincular"}
                              </span>
                            </button>
                            {substituidoPorId && (
                              <button
                                onClick={() => {
                                  setSubstituidoPorId("");
                                  markChanged();
                                }}
                                className="mt-2 text-xs font-medium text-coral flex items-center gap-1"
                              >
                                <X size={12} /> Remover substituto
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* ================= TELA: BÁSICO ================= */}
            {editIntent === "basico" && (
              <motion.div key="basico" variants={fadeUp} initial="initial" animate="animate" exit="exit" className="space-y-6">
                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm space-y-4">
                  <div className={`transition-all ${shakeFields.includes("nome") ? "animate-shake" : ""}`}>
                    <Input
                      label="Nome Oficial"
                      placeholder="Ex: Losartana..."
                      value={nome}
                      onChange={(e) => {
                        setNome(e.target.value);
                        markChanged();
                      }}
                      error={errors.nome}
                    />
                  </div>
                  <button
                    onClick={() => setIsTratamentoModalOpen(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-surface-border/50 bg-void py-3.5 text-sm font-bold text-ink-primary transition-colors hover:border-ice/50 shadow-inner"
                  >
                    <Plus size={16} />
                    Gerenciar Tratamentos
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* ================= FOOTER / SAVE BUTTON ================= */}
        <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 backdrop-blur-xl">
          <AnimatePresence>
            {editIntent !== "menu" && hasChanges && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={handleSubmit}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 shadow-lg shadow-ice/20 h-14 rounded-[20px] font-bold text-base"
                >
                  {saving ? (
                    <>
                      <Loader2 size={20} className="animate-spin" /> Salvando...
                    </>
                  ) : (
                    <>
                      <Save size={20} /> Salvar Alterações
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
          {(editIntent === "menu" || !hasChanges) && <div className="h-10" />}
        </div>

        {/* ================= MODAIS ================= */}
        <ConfirmationModal
          isOpen={showDesativarEstoqueModal}
          onClose={() => setShowDesativarEstoqueModal(false)}
          onConfirm={() => {
            setEstoqueAtivo(false);
            setShowDesativarEstoqueModal(false);
            markChanged();
          }}
          title="Desativar controle de estoque?"
          message="Você está prestes a desativar o controle de estoque para este medicamento. Os dados atuais de quantidade e horários serão perdidos."
          confirmLabel="Desativar"
          cancelLabel="Cancelar"
          type="warning"
        />

        <ConfirmationModal
          isOpen={showConfirmExitModal}
          onClose={() => setShowConfirmExitModal(false)}
          onConfirm={() => {
            setHasChanges(false);
            setEditIntent("menu");
            setShowConfirmExitModal(false);
          }}
          title="Descartar alterações?"
          message="Você tem alterações não salvas. Deseja descartá-las e voltar?"
          confirmLabel="Descartar"
          cancelLabel="Continuar editando"
          type="warning"
        />

        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          title="Excluir medicamento"
          message={`Excluir permanentemente o registro de "${nome}"? Essa ação não poderá ser desfeita e todas as doses registradas podem ficar órfãs.`}
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          isLoading={deleting}
          type="danger"
        />

        {/* Médico Prescritor */}
        <SelectionModal
          isOpen={isDoctorModalOpen}
          onClose={() => setIsDoctorModalOpen(false)}
          onSelect={(item: any) => {
            setMedicoNome(item.nome);
            setMedicoId(item.id);
            setIsDoctorModalOpen(false);
            markChanged();
          }}
          items={medicos}
          title="Médico Prescritor"
          getItemId={(i: any) => i.id!}
          getItemLabel={(i: any) => i.nome}
          renderItem={(item: any) => (
            <div className="flex items-center gap-3 w-full">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ice/10 text-ice shrink-0">
                <Stethoscope size={18} />
              </div>
              <div className="text-left">
                <p className="font-semibold text-ink-primary">{item.nome}</p>
                {item.especialidade && <p className="text-xs text-ink-muted mt-0.5">{item.especialidade}</p>}
              </div>
            </div>
          )}
        />

        {/* Estabelecimento com Abas */}
        <SelectionModal
          isOpen={isEstabelecimentoModalOpen}
          onClose={() => setIsEstabelecimentoModalOpen(false)}
          title="Selecionar Local"
          activeTab={activeEstabelecimentoTab}
          onTabChange={setActiveEstabelecimentoTab}
          tabs={[
            { id: "hospital", label: "Hospitais", activeColor: "bg-coral text-void border-transparent" },
            { id: "clinica", label: "Postos/Clínicas", activeColor: "bg-emerald-400 text-void border-transparent" },
          ]}
          items={hospitaisLocais.filter((h: any) =>
            activeEstabelecimentoTab === "hospital" ? h.tipo === "hospital" : h.tipo !== "hospital"
          )}
          getItemId={(item: any) => item.id!}
          getItemLabel={(item: any) => item.nome}
          enableQuickCreate
          onQuickCreate={async (name, tabId) => {
            // ✅ CORRIGIDO: user_id com fallback e usando safeAddHospital
            const id = await safeAddHospital({
              user_id: user?.id || "",
              nome: name,
              tipo: tabId,
            });
            return { id, nome: name, tipo: tabId };
          }}
          onSelect={(item: any) => {
            setEstabelecimentoId(item.id);
            setEstabelecimentoNome(item.nome);
            setIsEstabelecimentoModalOpen(false);
            markChanged();
          }}
          renderItem={(item: any) => (
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full shrink-0 ${
                  item.tipo === "hospital" ? "bg-coral/10 text-coral" : "bg-emerald-400/10 text-emerald-400"
                }`}
              >
                <Building2 size={18} />
              </div>
              <div className="text-left">
                <p className="font-semibold text-ink-primary">{item.nome}</p>
                <p className="text-xs text-ink-muted uppercase">{item.tipo === "hospital" ? "Hospital" : "Clínica/Posto"}</p>
              </div>
            </div>
          )}
        />

        {/* Médico da Suspensão */}
        <SelectionModal
          isOpen={isDoctorDescontinuacaoModalOpen}
          onClose={() => setIsDoctorDescontinuacaoModalOpen(false)}
          onSelect={(item: any) => {
            setMedicoDescontinuacaoNome(item.nome);
            setMedicoDescontinuacaoId(item.id);
            setIsDoctorDescontinuacaoModalOpen(false);
            markChanged();
          }}
          items={medicos}
          title="Médico da Suspensão"
          getItemId={(i: any) => i.id!}
          getItemLabel={(i: any) => i.nome}
          renderItem={(item: any) => (
            <div className="flex items-center gap-3 w-full">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-coral/10 text-coral shrink-0">
                <Stethoscope size={18} />
              </div>
              <div className="text-left">
                <p className="font-semibold text-ink-primary">{item.nome}</p>
                {item.especialidade && <p className="text-xs text-ink-muted mt-0.5">{item.especialidade}</p>}
              </div>
            </div>
          )}
        />

        {/* Médico da Evolução */}
        <SelectionModal
          isOpen={isDoctorEvolucaoModalOpen}
          onClose={() => setIsDoctorEvolucaoModalOpen(false)}
          onSelect={(item: any) => {
            setMedicoEvolucaoNome(item.nome);
            setMedicoEvolucaoId(item.id);
            setIsDoctorEvolucaoModalOpen(false);
            markChanged();
          }}
          items={medicos}
          title="Médico Responsável"
          getItemId={(i: any) => i.id!}
          getItemLabel={(i: any) => i.nome}
          renderItem={(item: any) => (
            <div className="flex items-center gap-3 w-full">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ice/10 text-ice shrink-0">
                <Stethoscope size={18} />
              </div>
              <div className="text-left">
                <p className="font-semibold text-ink-primary">{item.nome}</p>
              </div>
            </div>
          )}
        />

        {/* Farmácia */}
        <SelectionModal
          isOpen={isPharmacyModalOpen}
          onClose={() => setIsPharmacyModalOpen(false)}
          onSelect={(item: any) => {
            setFarmaciaNome(item.nome);
            setFarmaciaId(item.id);
            setIsPharmacyModalOpen(false);
            markChanged();
          }}
          items={farmacias}
          title="Farmácia Habitual"
          getItemId={(i: any) => i.id!}
          getItemLabel={(i: any) => i.nome}
          renderItem={(item: any) => (
            <div className="flex items-center gap-3 w-full">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-400/10 text-amber-400 shrink-0">
                <Store size={18} />
              </div>
              <div className="min-w-0 text-left">
                <p className="truncate font-semibold text-ink-primary">{item.nome}</p>
                {item.endereco && <p className="truncate text-xs text-ink-muted mt-0.5">{item.endereco}</p>}
              </div>
            </div>
          )}
        />

        {/* Substituto */}
        <SelectionModal
          isOpen={isSubstitutoModalOpen}
          onClose={() => setIsSubstitutoModalOpen(false)}
          onSelect={(item: any) => {
            setSubstituidoPorId(item.id);
            setIsSubstitutoModalOpen(false);
            markChanged();
          }}
          items={medicamentosAtivos}
          title="Qual remédio substituiu?"
          getItemId={(i: any) => i.id!}
          getItemLabel={(i: any) => `${i.nome} ${i.dosagem || ""}`}
          renderItem={(item: any) => (
            <div className="flex items-center gap-3 w-full">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-400 shrink-0">
                <ArrowRightLeft size={18} />
              </div>
              <div className="min-w-0 text-left">
                <p className="truncate font-semibold text-ink-primary">{item.nome}</p>
                {item.dosagem && <p className="truncate text-xs text-ink-muted mt-0.5">{item.dosagem}</p>}
              </div>
            </div>
          )}
        />

        {/* Tratamentos */}
        <SeletorTratamentoModal
          isOpen={isTratamentoModalOpen}
          onClose={() => setIsTratamentoModalOpen(false)}
          selectedIds={tratamentosSelecionados}
          onChange={(ids) => {
            setTratamentosSelecionados(ids);
            markChanged();
          }}
          personId={personId}
        />
      </main>
    </PageTransition>
  );
}

export default function EditarMedicamentoPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <EditarMedicamentoContent />
    </Suspense>
  );
}