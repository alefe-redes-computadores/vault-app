"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, Loader2, Save, Pill, Trash2, AlertTriangle, Package, 
  Plus, Clock, Activity, Stethoscope, Droplet, Syringe, StickyNote, 
  Palette, Info, Store, ArrowRightLeft, X, Circle, CheckCircle2
} from "lucide-react";

import { usePersons } from "@/hooks/usePersons";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useMedicos } from "@/hooks/useMedicos";
import { useFarmacias } from "@/hooks/useFarmacias";
import { useHapticFeedback } from "@/lib/haptics";
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
import type { TipoReceita } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { SelectionModal } from "@/components/SelectionModal";
import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { CalculadoraGotas } from "@/components/saude/CalculadoraGotas";
import { SeletorTratamentoModal, getTratamentoIcon } from "@/components/saude/SeletorTratamentoModal";
import { SeletorReceita } from "@/components/saude/SeletorReceita";

const fadeUp = { initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0 } };

// --- MÁSCARAS E HELPERS ---
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
  { id: "comprimido", label: "Redondo", icon: Circle },
  { id: "partido", label: "Partido", icon: SplitPillIcon },
  { id: "capsula", label: "Cápsula", icon: Pill },
  { id: "gota", label: "Gotas", icon: Droplet },
  { id: "injecao", label: "Injeção", icon: Syringe },
  { id: "adesivo", label: "Adesivo", icon: StickyNote },
];

const CORES_DISPONIVEIS = ["#FFFFFF", "#FCA5A5", "#F87171", "#FBBF24", "#34D399", "#60A5FA", "#818CF8", "#A78BFA", "#F472B6", "#9CA3AF"];

function EditarMedicamentoContent() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "";
  
  const persons = usePersons();
  const { getMedicamento, updateMedicamento, deleteMedicamento } = useMedicamentos();
  const { medicos } = useMedicos();
  const { farmacias } = useFarmacias();
  
  // Consultas
  const tratamentos = useLiveQuery(() => db.tratamentos.toArray(), []) || [];
  const medicamentosQuery = useLiveQuery(() => db.table("medicamentos").toArray(), []) || [];
  const medicamentosAtivos = medicamentosQuery.filter((m: any) => m.id !== id && m.status !== "descontinuado");

  // Estados Base
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [documentId, setDocumentId] = useState("");
  const [personId, setPersonId] = useState("");
  const [nome, setNome] = useState("");
  const [dosagem, setDosagem] = useState("");
  const [formato, setFormato] = useState("comprimido");
  const [cores, setCores] = useState<string[]>([]);
  const isGotas = formato === "gota";

  // Rede de Apoio e Datas
  const [medicoNome, setMedicoNome] = useState("");
  const [medicoId, setMedicoId] = useState("");
  const [farmaciaNome, setFarmaciaNome] = useState("");
  const [farmaciaId, setFarmaciaId] = useState("");
  const [tipoReceita, setTipoReceita] = useState<TipoReceita>("comum");
  const [dataReceitaTexto, setDataReceitaTexto] = useState("");
  const [proximaRenovacaoTexto, setProximaRenovacaoTexto] = useState("");
  const [observacoes, setObservacoes] = useState("");
  
  // Lógica de Descontinuação
  const [statusAtivo, setStatusAtivo] = useState(true);
  const [motivoDescontinuacao, setMotivoDescontinuacao] = useState("");
  const [medicoDescontinuacaoId, setMedicoDescontinuacaoId] = useState("");
  const [medicoDescontinuacaoNome, setMedicoDescontinuacaoNome] = useState("");
  const [substituidoPorId, setSubstituidoPorId] = useState("");
  
  // Modais
  const [tratamentosSelecionados, setTratamentosSelecionados] = useState<string[]>([]);
  const [isTratamentoModalOpen, setIsTratamentoModalOpen] = useState(false);
  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [isDoctorDescontinuacaoModalOpen, setIsDoctorDescontinuacaoModalOpen] = useState(false);
  const [isSubstitutoModalOpen, setIsSubstitutoModalOpen] = useState(false);
  const [isPharmacyModalOpen, setIsPharmacyModalOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Body Scroll Lock (Trava o fundo quando qualquer modal está aberto)
  const isAnyModalOpen = isTratamentoModalOpen || isDoctorModalOpen || isDoctorDescontinuacaoModalOpen || isSubstitutoModalOpen || isPharmacyModalOpen || showDeleteModal;
  useEffect(() => {
    if (isAnyModalOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isAnyModalOpen]);

  // Controle de Estoque Avançado
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
  const [showRenovacaoWarning, setShowRenovacaoWarning] = useState(false);

  // Validação Visual
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [shakeFields, setShakeFields] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const selectedMedico = medicos.find((m: any) => m.id === medicoId) || medicos.find((m: any) => m.nome === medicoNome);
  const selectedMedicoDescontinuacao = medicos.find((m: any) => m.id === medicoDescontinuacaoId) || medicos.find((m: any) => m.nome === medicoDescontinuacaoNome);
  const selectedFarmacia = farmacias.find((f: any) => f.id === farmaciaId) || farmacias.find((f: any) => f.nome === farmaciaNome);
  const selectedSubstituto = medicamentosQuery.find((m: any) => m.id === substituidoPorId);
  const selectedTratamentos = tratamentos.filter((t: any) => tratamentosSelecionados.includes(t.id));

  const diasValidadeReceita = VALIDADE_RECEITA_DIAS[tipoReceita];
  const horariosPreenchidos = horarios.filter((h) => h.trim());
  const consumoDiario = horariosPreenchidos.length * (Number(estoqueUnidadePorDose) || 1);
  const diasEstimadosEstoque = estoqueAtivo && consumoDiario > 0 && Number(estoqueQuantidade) > 0
    ? Math.floor(Number(estoqueQuantidade) / consumoDiario)
    : null;

  useEffect(() => {
    if (!id) { setNotFound(true); setIsLoading(false); return; }
    getMedicamento(id).then(async (item: any) => {
      if (!item) { setNotFound(true); setIsLoading(false); return; }

      setPersonId(item.person_id || "");
      setNome(item.nome || "");
      setDosagem(item.dosagem || "");
      setFormato(item.formato || "comprimido");
      setCores(item.cores || []);
      setMedicoNome(item.medico || "");
      setMedicoId(item.medico_id || "");
      setFarmaciaNome(item.farmacia || "");
      setFarmaciaId(item.farmacia_id || "");
      setTipoReceita((item.tipo_receita as TipoReceita) || "comum");
      setDataReceitaTexto(isoParaBr(item.data_receita || ""));
      setProximaRenovacaoTexto(isoParaBr(item.proxima_renovacao || ""));
      setObservacoes(item.observacoes || "");
      
      setStatusAtivo(item.status !== "descontinuado");
      setMotivoDescontinuacao(item.motivo_descontinuacao || "");
      setMedicoDescontinuacaoId(item.medico_descontinuacao_id || "");
      setMedicoDescontinuacaoNome(item.medico_descontinuacao_nome || "");
      setSubstituidoPorId(item.substituido_por_id || "");

      if (item.document_id) setDocumentId(item.document_id);

      if (item.estoque_ml_total) {
        setIsGotasCalcAtivo(true);
        setMlTotal(String(item.estoque_ml_total));
        setGotasPorMl(String(item.estoque_gotas_por_ml || 20));
      }

      try {
        const vinculos = await db.medicamento_tratamentos.where("medicamento_id").equals(id).toArray();
        const tIds = vinculos.map((v: any) => v.tratamento_id);
        if (tIds.length === 0 && item.tratamento_id) tIds.push(item.tratamento_id);
        setTratamentosSelecionados(tIds);
      } catch {
        if (item.tratamento_id) setTratamentosSelecionados([item.tratamento_id]);
      }

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
    }).catch(() => { setNotFound(true); setIsLoading(false); });
  }, [id]);

  const handleDataReceitaBlur = () => {
    const isoData = brParaIso(dataReceitaTexto);
    if (!isoData) return;
    const dias = VALIDADE_RECEITA_DIAS[tipoReceita];
    if (dias) {
      const novaData = suggestRenewalDate(isoData, tipoReceita);
      setProximaRenovacaoTexto(isoParaBr(novaData));
    }
  };

  const handleTipoReceitaChange = (tipo: TipoReceita) => {
    trigger("vibrate");
    setTipoReceita(tipo);
    const isoData = brParaIso(dataReceitaTexto);
    if (isoData && VALIDADE_RECEITA_DIAS[tipo]) {
      setProximaRenovacaoTexto(isoParaBr(suggestRenewalDate(isoData, tipo)));
    }
  };

  const handleDateChange = (setter: any) => (e: any) => {
    setShowRenovacaoWarning(true);
    setter(mascaraData(e.target.value));
  };
  
  const handleEstoqueChange = (value: string) => {
    setShowRenovacaoWarning(true);
    setEstoqueQuantidade(value);
  };

  const toggleFormato = (novoFormato: string) => {
    trigger("vibrate");
    setFormato(novoFormato);
    if (novoFormato === "partido") setEstoqueUnidadePorDose("0.5");
    else if (novoFormato !== "gota") setEstoqueUnidadePorDose("1");
  };

  const toggleCor = (hex: string) => {
    trigger("vibrate");
    setCores(prev => prev.includes(hex) ? prev.filter((c) => c !== hex) : prev.length >= 2 ? [prev[1], hex] : [...prev, hex]);
  };

  const updateHorario = (index: number, value: string) => setHorarios((prev) => prev.map((h, i) => (i === index ? value : h)));
  const addHorario = () => { trigger("vibrate"); setHorarios((prev) => [...prev, ""]); };
  const removeHorario = (index: number) => { trigger("vibrate"); setHorarios((prev) => prev.filter((_, i) => i !== index)); };

  const triggerShake = (fieldNames: string[]) => {
    trigger("error");
    setShakeFields(fieldNames);
    setTimeout(() => setShakeFields([]), 600);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    const shakeList: string[] = [];

    if (!personId) { newErrors.personId = "Obrigatório"; shakeList.push("personId"); }
    if (!nome.trim()) { newErrors.nome = "Obrigatório"; shakeList.push("nome"); }
    if (!dosagem.trim()) { newErrors.dosagem = "Obrigatória"; shakeList.push("dosagem"); }
    if (!medicoId && !medicoNome.trim()) { newErrors.medico = "Obrigatório"; shakeList.push("medico"); }
    if (!dataReceitaTexto || dataReceitaTexto.length < 10) { newErrors.dataReceitaTexto = "Data inválida"; shakeList.push("dataReceitaTexto"); }
    if (!statusAtivo && !motivoDescontinuacao.trim()) { newErrors.motivoDescontinuacao = "Informe o motivo"; shakeList.push("motivoDescontinuacao"); }

    if (estoqueAtivo) {
      if (!estoqueQuantidade || Number(estoqueQuantidade) <= 0) { newErrors.estoqueQuantidade = "Informe a quantidade"; shakeList.push("estoqueQuantidade"); }
      if (!estoqueDataReferenciaTexto || estoqueDataReferenciaTexto.length < 10) { newErrors.estoqueDataReferenciaTexto = "Data inválida"; shakeList.push("estoqueDataReferenciaTexto"); }
      if (horarios.filter((h) => h.trim()).length === 0) { newErrors.horarios = "Adicione um horário"; shakeList.push("horarios"); }
      if (!estoqueUnidadePorDose || Number(estoqueUnidadePorDose) <= 0) { newErrors.estoqueUnidadePorDose = "Obrigatório"; shakeList.push("estoqueUnidadePorDose"); }
    }

    setErrors(newErrors);
    if (shakeList.length > 0) {
      triggerShake(shakeList);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    trigger("vibrate");

    try {
      const horariosFiltrados = horarios.filter((h) => h.trim());
      const dataReceitaISO = brParaIso(dataReceitaTexto);
      const proximaRenovacaoISO = brParaIso(proximaRenovacaoTexto);
      const estoqueDataReferenciaISO = brParaIso(estoqueDataReferenciaTexto);

      if (documentId) {
        try {
          const doc = await db.documents.get(documentId);
          if (doc && doc.id) {
            await db.documents.update(doc.id, { metadata: { ...doc.metadata, tratamento_ids: tratamentosSelecionados }, updated_at: new Date().toISOString(), synced: false });
          }
        } catch {}
      }

      await updateMedicamento(id, {
        person_id: personId, nome: nome.trim(), dosagem: dosagem.trim(), formato, cores,
        medico: selectedMedico?.nome || medicoNome.trim(), medico_id: medicoId || undefined, 
        farmacia: selectedFarmacia?.nome || farmaciaNome.trim(), farmacia_id: farmaciaId || undefined,
        data_receita: dataReceitaISO, proxima_renovacao: proximaRenovacaoISO, observacoes: observacoes.trim() || undefined,
        tipo_receita: tipoReceita, tratamento_ids: tratamentosSelecionados, status: statusAtivo ? "ativo" : "descontinuado",
        motivo_descontinuacao: !statusAtivo ? motivoDescontinuacao.trim() : undefined,
        medico_descontinuacao_id: !statusAtivo ? medicoDescontinuacaoId || undefined : undefined,
        medico_descontinuacao_nome: !statusAtivo ? (selectedMedicoDescontinuacao?.nome || medicoDescontinuacaoNome.trim()) : undefined,
        substituido_por_id: !statusAtivo ? substituidoPorId || undefined : undefined,
        data_descontinuacao: !statusAtivo ? getLocalTodayISO() : undefined,
        estoque_quantidade: estoqueAtivo ? Number(estoqueQuantidade) : undefined,
        estoque_data_referencia: estoqueAtivo ? estoqueDataReferenciaISO : undefined,
        estoque_horarios: estoqueAtivo ? horariosFiltrados : undefined,
        estoque_unidade_por_dose: estoqueAtivo ? Number(estoqueUnidadePorDose) || 1 : undefined,
        estoque_unidade_medida: estoqueAtivo ? estoqueUnidade.trim() || "comprimido(s)" : undefined,
        estoque_ml_total: isGotasCalcAtivo && formato === "gota" ? Number(mlTotal) : undefined,
        estoque_gotas_por_ml: isGotasCalcAtivo && formato === "gota" ? Number(gotasPorMl) : undefined,
      } as any);

      if (horariosOriginais.length > 0) await cancelDoseNotifications({ id, estoque_horarios: horariosOriginais } as any);
      if (estoqueAtivo && horariosFiltrados.length > 0 && statusAtivo) {
        const granted = await requestNotificationPermission();
        if (granted) await scheduleDoseNotifications({ id, nome: nome.trim(), dosagem: dosagem.trim(), estoque_horarios: horariosFiltrados } as any);
      }

      trigger("success");
      router.replace("/saude");
    } catch (error) { trigger("error"); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      if (horariosOriginais.length > 0) await cancelDoseNotifications({ id, estoque_horarios: horariosOriginais } as any);
      try {
        const vinculos = await db.medicamento_tratamentos.where("medicamento_id").equals(id).toArray();
        if (vinculos.length > 0) await db.medicamento_tratamentos.bulkDelete(vinculos.map((v: any) => v.id));
      } catch {}
      await deleteMedicamento(id);
      trigger("success");
      router.replace("/saude");
    } catch (error) { trigger("error"); } finally { setDeleting(false); setShowDeleteModal(false); }
  };

  if (isLoading) return <LoadingSkeleton />;
  if (notFound) return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-void px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-coral/10 text-coral"><AlertTriangle size={26} /></div>
      <p className="mt-4 font-semibold text-ink-primary">Medicamento não encontrado</p>
      <button onClick={() => router.replace("/saude")} className="mt-4 rounded-full bg-ice px-5 py-2.5 text-sm font-semibold text-void">Voltar</button>
    </main>
  );

  const SelectedFormatIcon = FORMATOS.find((f) => f.id === formato)?.icon || Circle;
  const hasTwoColors = cores.length === 2 && (formato === "comprimido" || formato === "partido" || formato === "capsula");
  const gradientId = `split-${id}`;

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <svg width="0" height="0" className="absolute">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="50%" stopColor={cores[0] || "#9CA3AF"} />
              <stop offset="50%" stopColor={cores.length === 2 ? cores[1] : (cores[0] || "#9CA3AF")} />
            </linearGradient>
          </defs>
        </svg>

        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 pt-6 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border bg-surface-raised active:scale-95"><ArrowLeft size={18} className="text-ink-primary" /></button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <SelectedFormatIcon size={16} fill={hasTwoColors ? `url(#${gradientId})` : (cores[0] || "#9CA3AF")} stroke="none" />
                <p className="font-mono text-[11px] uppercase tracking-widest text-ice">Ajustes</p>
              </div>
              <h1 className="mt-0.5 truncate text-xl font-bold uppercase text-ink-primary">{nome || "Medicamento"}</h1>
            </div>
            <button onClick={() => setShowDeleteModal(true)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-coral/20 bg-coral/10 text-coral transition-colors hover:bg-coral hover:text-void"><Trash2 size={16} /></button>
          </div>
        </header>

        <section className="space-y-6 px-5 pt-6">
          <AnimatePresence>
            {showRenovacaoWarning && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                <div className="mb-2 flex flex-col gap-3 rounded-[24px] border border-amber-400/30 bg-amber-400/10 p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <Info size={20} className="mt-0.5 shrink-0 text-amber-400" />
                    <p className="text-sm text-amber-200"><strong>Atualizando estoque ou validade?</strong><br />Para não quebrar o seu histórico de compras/gastos, sugerimos usar a ferramenta de Renovação Oficial.</p>
                  </div>
                  <button onClick={() => router.push(`/saude/renovacao/nova?medicamento_id=${id}`)} className="mt-1 w-full rounded-xl bg-amber-400 py-3 text-sm font-bold text-void shadow-md shadow-amber-400/20 transition-transform active:scale-95">Ir para Renovação Segura</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Seletor de Pessoas com Avatar */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" className={`rounded-[28px] border bg-surface p-5 shadow-sm transition-all ${shakeFields.includes('personId') ? 'animate-shake border-coral/80' : 'border-surface-border/50'}`}>
            <p className="mb-3 text-sm font-medium text-ink-primary">Para quem é? <span className="text-coral">*</span></p>
            <div className="flex flex-wrap gap-2.5">
              {persons.map((p: any) => (
                <button 
                  key={p.id} 
                  onClick={() => { trigger("vibrate"); setPersonId(p.id!); }} 
                  className={`flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-all ${personId === p.id ? "border-ice bg-ice/12 text-ice" : "border-surface-border/50 bg-surface-raised text-ink-muted"}`}
                >
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt={p.name} className="h-6 w-6 rounded-full object-cover shadow-sm" />
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-void border border-surface-border text-[10px] text-ink-primary font-bold shadow-inner">
                      {p.name.charAt(0)}
                    </div>
                  )}
                  {p.name}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Identidade Visual com Prévia Restaurada */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
               <div className="flex items-center gap-2"><Palette size={16} className="text-ice" /><h3 className="text-sm font-semibold text-ink-primary">Identidade Visual</h3></div>
            </div>
            
            <div className="mb-5 grid grid-cols-3 gap-2.5">
              {FORMATOS.map((f) => {
                const isActive = formato === f.id;
                const Icon = f.icon;
                return (
                  <button key={f.id} onClick={() => toggleFormato(f.id)} className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border py-3 transition-all ${isActive ? "border-ice bg-ice/15 text-ice" : "border-surface-border/40 bg-surface-raised text-ink-muted"}`}>
                    <Icon size={20} fill={isActive ? "currentColor" : "none"} strokeWidth={isActive ? 0 : 2} />
                    <span className="text-[10px] font-medium">{f.label}</span>
                  </button>
                );
              })}
            </div>

            <p className="mb-2 text-xs text-ink-muted">Cores (até 2)</p>
            <div className="flex flex-wrap gap-2.5 mb-5">
              {CORES_DISPONIVEIS.map((hex) => (
                <button key={hex} onClick={() => toggleCor(hex)} className={`h-8 w-8 rounded-full border-2 transition-transform ${cores.includes(hex) ? "scale-110 border-ice" : "border-transparent"}`} style={{ backgroundColor: hex }} />
              ))}
            </div>

            {/* Prévia Dinâmica */}
            <div className="mt-2 flex justify-center">
              <div className="flex h-20 w-32 items-center justify-center rounded-2xl border border-surface-border bg-void/50 shadow-inner">
                <SelectedFormatIcon size={40} fill={hasTwoColors ? `url(#${gradientId})` : (cores[0] || "#9CA3AF")} stroke="none" />
              </div>
            </div>
          </motion.div>

          {isGotas && (
            <motion.div variants={fadeUp} initial="initial" animate="animate">
              <CalculadoraGotas isAtivo={isGotasCalcAtivo} onToggle={setIsGotasCalcAtivo} mlTotal={mlTotal} setMlTotal={setMlTotal} gotasPorMl={gotasPorMl} setGotasPorMl={setGotasPorMl} onEstoqueCalculado={(v) => { if(isGotasCalcAtivo && estoqueAtivo) setEstoqueQuantidade(String(v)); }} />
            </motion.div>
          )}

          {/* Dados e Rede de Apoio Estrita Relacional */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm">
            <div className={`transition-all ${shakeFields.includes('nome') ? 'animate-shake' : ''}`}>
              <Input label="Medicamento" placeholder="Ex: Losartana..." value={nome} onChange={(e) => setNome(e.target.value)} error={errors.nome} />
            </div>
            <div className={`transition-all ${shakeFields.includes('dosagem') ? 'animate-shake' : ''}`}>
              <Input label="Dosagem" placeholder="Ex: 50mg, 1x ao dia" value={dosagem} onChange={(e) => setDosagem(e.target.value)} error={errors.dosagem} />
            </div>
            
            <div className={`transition-all ${shakeFields.includes('medico') ? 'animate-shake' : ''}`}>
              <label className="mb-1.5 block text-sm font-medium text-ink-primary flex items-center gap-2"><Stethoscope size={14} className="text-ink-muted"/> Médico Prescritor <span className="text-coral">*</span></label>
              <button onClick={() => { trigger("vibrate"); setIsDoctorModalOpen(true); }} className={`flex w-full items-center justify-between rounded-2xl border bg-surface-raised px-4 py-3.5 text-left transition-colors ${errors.medico ? "border-coral/50" : "border-surface-border/50 hover:border-ice/50"}`}>
                <span className="truncate font-medium text-ink-primary">{selectedMedico?.nome || medicoNome || "Vincular médico cadastrado..."}</span>
                <span className="ml-2 text-xs font-bold text-ice">Selecionar</span>
              </button>
            </div>
            
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-primary flex items-center gap-2"><Store size={14} className="text-ink-muted"/> Farmácia Habitual</label>
              <button onClick={() => setIsPharmacyModalOpen(true)} className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3.5 text-left transition-colors hover:border-ice/50">
                <span className="truncate font-medium text-ink-primary">{selectedFarmacia?.nome || farmaciaNome || "Vincular farmácia..."}</span>
                <span className="ml-2 text-xs font-bold text-ice">Selecionar</span>
              </button>
            </div>
          </motion.div>

          {/* SELETOR DE RECEITA REUTILIZÁVEL E MODULARIZADO */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm">
            <SeletorReceita 
              selected={tipoReceita} 
              onChange={handleTipoReceitaChange} 
              onRenovarClick={() => router.push(`/saude/renovacao/nova?medicamento_id=${id}`)}
            />
            
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-surface-border/40">
              <div className={`transition-all ${shakeFields.includes('dataReceitaTexto') ? 'animate-shake' : ''}`}>
                <Input label="Data da receita *" placeholder="DD/MM/AAAA" value={dataReceitaTexto} onChange={handleDateChange(setDataReceitaTexto)} onBlur={handleDataReceitaBlur} maxLength={10} inputMode="numeric" error={errors.dataReceitaTexto} />
              </div>
              <Input label="Renovação estimada" placeholder="DD/MM/AAAA" value={proximaRenovacaoTexto} onChange={handleDateChange(setProximaRenovacaoTexto)} maxLength={10} inputMode="numeric" />
            </div>
          </motion.div>

          {/* Estoque Refinado */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-semibold text-ink-primary">Controle de Estoque</h3>
                <p className="text-xs text-ink-muted mt-0.5">Doses, horários e previsões.</p>
              </div>
              <button onClick={() => { trigger("vibrate"); setEstoqueAtivo(!estoqueAtivo); if(!estoqueAtivo) setShowRenovacaoWarning(true); }} className={`h-7 w-12 rounded-full p-1 transition-colors ${estoqueAtivo ? "bg-ice" : "bg-surface-raised border border-surface-border"}`}>
                <div className={`h-5 w-5 rounded-full bg-void shadow-sm transition-transform ${estoqueAtivo ? "translate-x-5" : ""}`} />
              </button>
            </div>

            <AnimatePresence>
              {estoqueAtivo && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-5 pt-4 overflow-hidden border-t border-surface-border/40 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className={`transition-all ${shakeFields.includes('estoqueQuantidade') ? 'animate-shake' : ''}`}>
                      <Input label="Unidades na caixa" type="number" inputMode="numeric" value={estoqueQuantidade} onChange={(e) => handleEstoqueChange(e.target.value)} error={errors.estoqueQuantidade} />
                    </div>
                    <div className={`transition-all ${shakeFields.includes('estoqueUnidadePorDose') ? 'animate-shake' : ''}`}>
                      <Input label="Gasto por dose" type="number" inputMode="decimal" step="0.25" placeholder="Ex: 1 ou 0.5" value={estoqueUnidadePorDose} onChange={(e) => setEstoqueUnidadePorDose(e.target.value)} error={errors.estoqueUnidadePorDose} />
                    </div>
                  </div>
                  
                  <div className={`transition-all ${shakeFields.includes('estoqueDataReferenciaTexto') ? 'animate-shake' : ''}`}>
                     <Input label="Data da última contagem" placeholder="DD/MM/AAAA" value={estoqueDataReferenciaTexto} onChange={handleDateChange(setEstoqueDataReferenciaTexto)} maxLength={10} inputMode="numeric" error={errors.estoqueDataReferenciaTexto} />
                  </div>

                  {diasEstimadosEstoque !== null && (
                    <div className="flex items-center justify-between rounded-2xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3">
                      <div className="flex items-center gap-2"><Clock size={16} className="text-emerald-400" /><span className="text-sm font-medium text-ink-primary">Previsão de consumo</span></div>
                      <span className="font-mono text-sm font-bold text-emerald-400">{diasEstimadosEstoque} {diasEstimadosEstoque === 1 ? "dia" : "dias"}</span>
                    </div>
                  )}
                  
                  <div className={`transition-all ${shakeFields.includes('horarios') ? 'animate-shake' : ''} p-4 rounded-2xl bg-surface-raised border border-surface-border/50`}>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium text-ink-primary">Alarmes (HH:MM)</label>
                      <button onClick={addHorario} className="text-ice font-bold text-xs bg-ice/10 px-3 py-1.5 rounded-lg">+ Novo Alarme</button>
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                      {horarios.map((h, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <input type="text" placeholder="08:00" value={h} maxLength={5} onChange={(e) => {
                            let v = e.target.value.replace(/\D/g, "");
                            if(v.length > 2) v = v.substring(0,2) + ":" + v.substring(2);
                            updateHorario(i, v);
                          }} className="w-16 bg-void border border-surface-border rounded-xl text-center py-2.5 text-sm font-mono focus:border-ice outline-none shadow-inner" />
                          {horarios.length > 1 && <button onClick={() => removeHorario(i)} className="p-2.5 text-coral bg-coral/10 hover:bg-coral/20 rounded-xl transition-colors"><X size={14}/></button>}
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Status e Descontinuação */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div><h3 className="text-sm font-semibold text-ink-primary">Status Atual</h3><p className="mt-0.5 text-xs text-ink-muted">Acompanhamento ativo?</p></div>
              <button onClick={() => { trigger("vibrate"); setStatusAtivo(!statusAtivo); }} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition-colors ${statusAtivo ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400" : "border-coral/30 bg-coral/10 text-coral"}`}>{statusAtivo ? "EM USO" : "SUSPENSO"}</button>
            </div>

            <AnimatePresence>
              {!statusAtivo && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="mt-5 space-y-4 border-t border-surface-border/40 pt-5">
                    <div className={`transition-all ${shakeFields.includes('motivoDescontinuacao') ? 'animate-shake' : ''}`}>
                      <TextArea label="Motivo da suspensão *" placeholder="Ex: efeitos adversos, alta médica..." value={motivoDescontinuacao} onChange={(e) => setMotivoDescontinuacao(e.target.value)} error={errors.motivoDescontinuacao} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-ink-primary flex items-center gap-2"><Stethoscope size={14} className="text-ink-muted"/> Médico que ordenou a parada</label>
                      <button onClick={() => setIsDoctorDescontinuacaoModalOpen(true)} className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3.5 text-left">
                        <span className="truncate font-medium text-ink-primary">{selectedMedicoDescontinuacao?.nome || medicoDescontinuacaoNome || "Vincular médico..."}</span>
                        <span className="ml-2 text-xs font-bold text-ice">Selecionar</span>
                      </button>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-ink-primary flex items-center gap-2"><ArrowRightLeft size={14} className="text-ink-muted"/> Substituído por</label>
                      <button onClick={() => setIsSubstitutoModalOpen(true)} className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3.5 text-left">
                        <span className="truncate font-medium text-ink-primary">{selectedSubstituto ? selectedSubstituto.nome : "Nenhum substituto"}</span>
                        <span className="ml-2 text-xs font-bold text-ice">{selectedSubstituto ? "Alterar" : "Vincular"}</span>
                      </button>
                      {substituidoPorId && <button onClick={() => setSubstituidoPorId("")} className="mt-2 text-xs font-medium text-coral flex items-center gap-1"><X size={12}/> Remover substituto</button>}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div><h3 className="text-sm font-semibold text-ink-primary">Quadros / CIDs Vinculados</h3><p className="mt-0.5 text-xs text-ink-muted">Organize seu histórico clínico.</p></div>
              <Activity size={18} className="text-ice" />
            </div>
            {selectedTratamentos.length > 0 ? (
              <div className="mb-4 flex flex-wrap gap-2.5">
                {selectedTratamentos.map((t: any) => {
                  const Icon = getTratamentoIcon(t.nome);
                  return (
                    <button key={t.id} onClick={() => { trigger("vibrate"); setTratamentosSelecionados((prev) => prev.filter((id) => id !== t.id)); }} className="flex items-center gap-2 rounded-full border border-ice/30 bg-ice/10 px-3.5 py-2 text-xs font-semibold text-ice hover:bg-coral/10 hover:border-coral/30 hover:text-coral transition-colors">
                      <Icon size={14} /><span>{t.nome}</span><X size={14} className="opacity-70" />
                    </button>
                  );
                })}
              </div>
            ) : <p className="text-xs text-ink-muted mb-4 p-4 border border-dashed border-surface-border rounded-2xl text-center bg-surface-raised">Nenhum quadro vinculado a este remédio.</p>}
            <button onClick={() => setIsTratamentoModalOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-surface-border/50 bg-void py-3.5 text-sm font-bold text-ink-primary transition-colors hover:border-ice/50 shadow-inner"><Plus size={16} />Gerenciar Tratamentos</button>
          </motion.div>
          
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm">
            <TextArea label="Anotações Estruturais" placeholder="Posologia complexa, dicas de uso..." value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </motion.div>
        </section>

        <div className="sticky bottom-0 z-10 -mx-5 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 backdrop-blur-xl">
          <Button variant="primary" size="lg" fullWidth onClick={handleSubmit} disabled={saving} className="flex items-center justify-center gap-2 shadow-lg shadow-ice/20 h-14 rounded-[20px] font-bold text-base">
            {saving ? <><Loader2 size={20} className="animate-spin" /> Salvando...</> : <><Save size={20} /> Salvar Edição Completa</>}
          </Button>
        </div>

        {/* Modais blindados e padronizados com renderItem */}
        <SelectionModal 
          isOpen={isDoctorModalOpen} 
          onClose={() => setIsDoctorModalOpen(false)} 
          onSelect={(item: any) => { setMedicoNome(item.nome); setMedicoId(item.id); setIsDoctorModalOpen(false); }} 
          items={medicos} 
          title="Médico Prescritor" 
          getItemId={(i: any) => i.id!} 
          getItemLabel={(i: any) => i.nome} 
          renderItem={(item: any) => (
            <div className="flex items-center gap-3 w-full">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ice/10 text-ice shrink-0"><Stethoscope size={18} /></div>
              <div className="text-left"><p className="font-semibold text-ink-primary">{item.nome}</p>{item.especialidade && <p className="text-xs text-ink-muted mt-0.5">{item.especialidade}</p>}</div>
            </div>
          )}
        />
        
        <SelectionModal 
          isOpen={isDoctorDescontinuacaoModalOpen} 
          onClose={() => setIsDoctorDescontinuacaoModalOpen(false)} 
          onSelect={(item: any) => { setMedicoDescontinuacaoNome(item.nome); setMedicoDescontinuacaoId(item.id); setIsDoctorDescontinuacaoModalOpen(false); }} 
          items={medicos} 
          title="Médico da Suspensão" 
          getItemId={(i: any) => i.id!} 
          getItemLabel={(i: any) => i.nome} 
          renderItem={(item: any) => (
            <div className="flex items-center gap-3 w-full">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-coral/10 text-coral shrink-0"><Stethoscope size={18} /></div>
              <div className="text-left"><p className="font-semibold text-ink-primary">{item.nome}</p>{item.especialidade && <p className="text-xs text-ink-muted mt-0.5">{item.especialidade}</p>}</div>
            </div>
          )}
        />
        
        <SelectionModal 
          isOpen={isPharmacyModalOpen} 
          onClose={() => setIsPharmacyModalOpen(false)} 
          onSelect={(item: any) => { setFarmaciaNome(item.nome); setFarmaciaId(item.id); setIsPharmacyModalOpen(false); }} 
          items={farmacias} 
          title="Farmácia Habitual" 
          getItemId={(i: any) => i.id!} 
          getItemLabel={(i: any) => i.nome} 
          renderItem={(item: any) => (
            <div className="flex items-center gap-3 w-full">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-400/10 text-amber-400 shrink-0"><Store size={18} /></div>
              <div className="min-w-0 text-left"><p className="truncate font-semibold text-ink-primary">{item.nome}</p>{item.endereco && <p className="truncate text-xs text-ink-muted mt-0.5">{item.endereco}</p>}</div>
            </div>
          )}
        />
        
        <SelectionModal 
          isOpen={isSubstitutoModalOpen} 
          onClose={() => setIsSubstitutoModalOpen(false)} 
          onSelect={(item: any) => { setSubstituidoPorId(item.id); setIsSubstitutoModalOpen(false); }} 
          items={medicamentosAtivos} 
          title="Qual remédio substituiu?" 
          getItemId={(i: any) => i.id!} 
          getItemLabel={(i: any) => `${i.nome} ${i.dosagem || ""}`} 
          renderItem={(item: any) => (
            <div className="flex items-center gap-3 w-full">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-400 shrink-0"><ArrowRightLeft size={18} /></div>
              <div className="min-w-0 text-left"><p className="truncate font-semibold text-ink-primary">{item.nome}</p>{item.dosagem && <p className="truncate text-xs text-ink-muted mt-0.5">{item.dosagem}</p>}</div>
            </div>
          )}
        />
        
        <SeletorTratamentoModal isOpen={isTratamentoModalOpen} onClose={() => setIsTratamentoModalOpen(false)} selectedIds={tratamentosSelecionados} onChange={setTratamentosSelecionados} personId={personId} />

        <ConfirmationModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={handleDelete} title="Excluir medicamento" message={`Excluir permanentemente o registro de "${nome}"? Essa ação não poderá ser desfeita e todas as doses registradas podem ficar orfãs.`} confirmLabel="Excluir" cancelLabel="Cancelar" isLoading={deleting} type="danger" />
      </main>
    </PageTransition>
  );
}

export default function EditarMedicamentoPage() {
  return <Suspense fallback={<LoadingSkeleton />}><EditarMedicamentoContent /></Suspense>;
}
