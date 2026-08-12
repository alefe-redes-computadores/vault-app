"use client";

import { useState, useEffect } from "react";
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
  Brain,
  ShieldAlert,
  HeartPulse,
  Flame,
  History,
  ExternalLink
} from "lucide-react";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useMedicos } from "@/hooks/useMedicos";
import { useFarmacias } from "@/hooks/useFarmacias";
import { useHapticFeedback } from "@/lib/haptics";
import {
  suggestRenewalDate,
  VALIDADE_RECEITA_DIAS,
  TIPO_RECEITA_LABELS,
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
import { db, safeAddTratamento } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useAuth } from "@/hooks/useAuth";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

const TIPO_OPTIONS: TipoReceita[] = ["comum", "amarela", "azul", "branca"];

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

// Formata a data bonitinha pra timeline
function formatDataMesAno(dataIso: string) {
  if (!dataIso) return "";
  const [year, month] = dataIso.split("-");
  const meses = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
  return `${meses[parseInt(month) - 1]}/${year.slice(2)}`;
}

export default function EditarMedicamentoPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "";
  const { user } = useAuth();
  const { getMedicamento, updateMedicamento, deleteMedicamento } = useMedicamentos();
  const { medicos } = useMedicos();
  const { farmacias } = useFarmacias();

  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [documentId, setDocumentId] = useState<string>("");

  const [nome, setNome] = useState("");
  const [dosagem, setDosagem] = useState("");
  const [medicoNome, setMedicoNome] = useState("");
  const [farmaciaNome, setFarmaciaNome] = useState("");
  const [tipoReceita, setTipoReceita] = useState<TipoReceita>("comum");
  const [dataReceita, setDataReceita] = useState("");
  const [proximaRenovacao, setProximaRenovacao] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [statusAtivo, setStatusAtivo] = useState(true); // NOVO CAMPO: STATUS DO MEDICAMENTO

  // QUERY DA LINHA DO TEMPO (Busca todas as renovações que são "Filhas" desse Medicamento)
  const renovacoes = useLiveQuery(
    () => db.renovacoes.where("medicamento_id").equals(id).reverse().sortBy("data"),
    [id]
  ) || [];

  const tratamentos = useLiveQuery(() => db.tratamentos.toArray(), []) || [];
  const [tratamentoId, setTratamentoId] = useState<string>("");
  const [isTratamentoModalOpen, setIsTratamentoModalOpen] = useState(false);
  const [isCreatingTratamento, setIsCreatingTratamento] = useState(false);
  const [newTratamentoName, setNewTratamentoName] = useState("");
  const [isSavingTratamento, setIsSavingTratamento] = useState(false);

  const [estoqueAtivo, setEstoqueAtivo] = useState(false);
  const [estoqueQuantidade, setEstoqueQuantidade] = useState("");
  const [estoqueDataReferencia, setEstoqueDataReferencia] = useState(todayISO());
  const [estoqueUnidade, setEstoqueUnidade] = useState("comprimido(s)");
  const [estoqueUnidadePorDose, setEstoqueUnidadePorDose] = useState("1");
  const [horarios, setHorarios] = useState<string[]>([""]);
  const [horariosOriginais, setHorariosOriginais] = useState<string[]>([]);

  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [isPharmacyModalOpen, setIsPharmacyModalOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const selectedTratamento = tratamentos.find((t: any) => String(t.id) === tratamentoId);
  const diasValidade = VALIDADE_RECEITA_DIAS[tipoReceita];
  const consumoDiario =
    horarios.filter((h) => h).length * (Number(estoqueUnidadePorDose) || 1);
  const diasEstimados =
    estoqueAtivo && consumoDiario > 0 && Number(estoqueQuantidade) > 0
      ? Math.floor(Number(estoqueQuantidade) / consumoDiario)
      : null;

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }
    getMedicamento(id).then(async (item) => {
      if (!item) {
        setNotFound(true);
      } else {
        setNome(item.nome || "");
        setDosagem(item.dosagem || "");
        setMedicoNome(item.medico || "");
        setFarmaciaNome(item.farmacia || "");
        setDataReceita(item.data_receita || "");
        setProximaRenovacao(item.proxima_renovacao || "");
        setObservacoes(item.observacoes || "");
        setTipoReceita((item.tipo_receita as TipoReceita) || "comum");

        // Verifica se a observação tem a tag de descontinuado (para não quebrar seu schema)
        if (item.observacoes && item.observacoes.includes("[DESCONTINUADO]")) {
           setStatusAtivo(false);
           setObservacoes(item.observacoes.replace("[DESCONTINUADO]", "").trim());
        } else {
           setStatusAtivo(true);
        }
        
        // Carrega o tratamento_id salvo diretamente no medicamento
        if (item.tratamento_id) {
          setTratamentoId(item.tratamento_id);
        }

        if (item.document_id) {
          setDocumentId(item.document_id);
          const doc = await db.documents.get(item.document_id);
          if (doc && doc.metadata?.tratamento_id) {
            setTratamentoId(doc.metadata.tratamento_id);
          }
        }

        if (
          typeof item.estoque_quantidade === "number" &&
          item.estoque_data_referencia &&
          item.estoque_horarios &&
          item.estoque_horarios.length > 0
        ) {
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

  const handleTipoReceitaChange = (tipo: TipoReceita) => {
    trigger("vibrate");
    setTipoReceita(tipo);
  };

  const aplicarSugestaoValidade = () => {
    if (!dataReceita || !diasValidade) return;
    trigger("vibrate");
    setProximaRenovacao(suggestRenewalDate(dataReceita, tipoReceita));
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
        nome: newTratamentoName.trim(),
        status: "ativo",
      });
      setTratamentoId(newId);
      trigger("success");
      setIsCreatingTratamento(false);
      setNewTratamentoName("");
    } catch (error) {
      console.error(error);
      trigger("error");
    } finally {
      setIsSavingTratamento(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!nome.trim()) newErrors.nome = "Nome do medicamento é obrigatório";
    if (!dosagem.trim()) newErrors.dosagem = "Dosagem é obrigatória";
    if (!medicoNome.trim()) newErrors.medico = "Selecione o médico";
    if (!dataReceita) newErrors.dataReceita = "Data da receita é obrigatória";
    if (!proximaRenovacao) newErrors.proximaRenovacao = "Data da próxima renovação é obrigatória";

    if (estoqueAtivo) {
      if (!estoqueQuantidade || Number(estoqueQuantidade) <= 0) {
        newErrors.estoqueQuantidade = "Informe a quantidade atual";
      }
      if (!estoqueDataReferencia) {
        newErrors.estoqueDataReferencia = "Informe a data dessa contagem";
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
    if (!validate()) {
      trigger("error");
      return;
    }

    setSaving(true);
    try {
      const horariosFiltrados = horarios.filter((h) => h);

      // Controla a Flag de Descontinuado
      let notasFinais = observacoes.trim();
      if (!statusAtivo) {
         notasFinais = `[DESCONTINUADO] \n${notasFinais}`.trim();
      }

      if (documentId) {
        const doc = await db.documents.get(documentId);
        if (doc && doc.id) {
          await db.documents.update(doc.id, {
            metadata: {
              ...doc.metadata,
              tratamento_id: tratamentoId || undefined,
            },
            updated_at: new Date().toISOString(),
            synced: false,
          });
        }
      }

      await updateMedicamento(id, {
        nome: nome.trim(),
        dosagem: dosagem.trim(),
        medico: medicoNome.trim(),
        farmacia: farmaciaNome.trim() || undefined,
        data_receita: dataReceita,
        proxima_renovacao: proximaRenovacao,
        observacoes: notasFinais || undefined,
        tipo_receita: tipoReceita,
        tratamento_id: tratamentoId || undefined, // Salva o ID do tratamento no medicamento
        estoque_quantidade: estoqueAtivo ? Number(estoqueQuantidade) : undefined,
        estoque_data_referencia: estoqueAtivo ? estoqueDataReferencia : undefined,
        estoque_horarios: estoqueAtivo ? horariosFiltrados : undefined,
        estoque_unidade_por_dose: estoqueAtivo
          ? Number(estoqueUnidadePorDose) || 1
          : undefined,
        estoque_unidade_medida: estoqueAtivo ? estoqueUnidade.trim() || "comprimido(s)" : undefined,
      });

      if (estoqueAtivo && horariosFiltrados.length > 0) {
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
      router.push("/saude");
    } catch (error) {
      console.error("Erro ao atualizar medicamento:", error);
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
      router.push("/saude");
    } catch (error) {
      console.error("Erro ao excluir medicamento:", error);
      trigger("error");
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (notFound) {
    return (
      <PageTransition>
        <main className="flex min-h-screen flex-col items-center justify-center bg-void px-6 text-center">
          <p className="font-display text-lg font-semibold text-ink-primary">
            Medicamento não encontrado
          </p>
          <button
            onClick={() => router.back()}
            className="mt-4 rounded-full bg-ice px-5 py-2.5 text-sm font-semibold text-void"
          >
            Voltar
          </button>
        </main>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 header-safe-top backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                trigger("vibrate");
                router.back();
              }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
              aria-label="Voltar"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Pill size={16} className="text-ice" />
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">
                  Vault
                </p>
              </div>
              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">
                Editar medicamento
              </h1>
            </div>

            <button
              onClick={() => {
                trigger("vibrate");
                setShowDeleteModal(true);
              }}
              aria-label="Excluir medicamento"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-coral/20 bg-coral/10 text-coral transition-all active:scale-95"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-6">
          
          {/* CONTROLE DE STATUS DO MEDICAMENTO (NOVO) */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-ink-primary">Status do Tratamento</h3>
              <p className="text-xs text-ink-muted mt-0.5">
                {statusAtivo ? "Remédio em uso contínuo." : "Medicamento descontinuado."}
              </p>
            </div>
            <button
               onClick={() => { trigger("vibrate"); setStatusAtivo(!statusAtivo); }}
               className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors ${
                 statusAtivo ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20" : "bg-coral/10 text-coral border border-coral/20"
               }`}
            >
              {statusAtivo ? "ATIVO" : "DESCONTINUADO"}
            </button>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.28 }}
            className="rounded-[28px] border border-violet-500/30 bg-surface p-4 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-2">
              <Activity size={16} className="text-violet-400" />
              <label className="text-sm font-semibold text-ink-primary">
                Tratamento Vinculado
              </label>
            </div>
            <button
              onClick={() => {
                trigger("vibrate");
                setIsTratamentoModalOpen(true);
              }}
              className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3.5 text-left text-ink-primary transition-colors hover:border-violet-400/40"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {selectedTratamento ? (() => {
                  const IconComp = getTratamentoIcon(selectedTratamento.nome);
                  return <IconComp size={18} className="text-violet-400 shrink-0" />;
                })() : <Activity size={18} className="text-ink-muted shrink-0" />}
                <span className="truncate font-medium">
                  {selectedTratamento ? selectedTratamento.nome : "Vincular a um tratamento (Opcional)"}
                </span>
              </div>
              <span className="text-xs text-violet-400 shrink-0 font-medium">Alterar</span>
            </button>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.28, delay: 0.02 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <p className="mb-3 text-sm font-medium text-ink-primary">Tipo de receita</p>
            <div className="grid grid-cols-2 gap-2">
              {TIPO_OPTIONS.map((tipo) => {
                const active = tipoReceita === tipo;
                return (
                  <button
                    key={tipo}
                    onClick={() => handleTipoReceitaChange(tipo)}
                    className={`rounded-2xl border px-4 py-3 text-sm font-medium transition-all active:scale-95 ${
                      active
                        ? tipo === "comum"
                          ? "border-ice bg-ice/12 text-ice"
                          : "border-violet-400 bg-violet-400/12 text-violet-300"
                        : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
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
                <button
                  onClick={aplicarSugestaoValidade}
                  className="shrink-0 whitespace-nowrap text-xs font-medium text-violet-300 hover:text-violet-200"
                >
                  Aplicar +{diasValidade}d
                </button>
              </div>
            )}
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.28, delay: 0.04 }}
            className="space-y-3 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <Input
              label="Medicamento"
              placeholder="Ex: Losartana, Sertralina..."
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              error={errors.nome}
              required
            />
            <Input
              label="Dosagem"
              placeholder="Ex: 50mg, 1x ao dia"
              value={dosagem}
              onChange={(e) => setDosagem(e.target.value)}
              error={errors.dosagem}
              required
            />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-primary">
                Médico <span className="text-coral">*</span>
              </label>
              <button
                onClick={() => {
                  trigger("vibrate");
                  setIsDoctorModalOpen(true);
                }}
                className={`w-full rounded-2xl border px-4 py-3 text-left text-ink-primary transition-colors ${
                  errors.medico ? "border-coral/50" : "border-surface-border/50"
                } bg-surface-raised`}
              >
                {medicoNome || "Selecionar médico"}
              </button>
              {errors.medico && <p className="mt-1 text-xs text-coral">{errors.medico}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-primary">
                Farmácia (opcional)
              </label>
              <button
                onClick={() => {
                  trigger("vibrate");
                  setIsPharmacyModalOpen(true);
                }}
                className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary transition-colors"
              >
                {farmaciaNome || "Selecionar farmácia"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-ink-primary">
                  Data da receita <span className="text-coral">*</span>
                </label>
                <input
                  type="date"
                  value={dataReceita}
                  onChange={(e) => setDataReceita(e.target.value)}
                  className={`w-full rounded-2xl border bg-surface-raised px-4 py-3 text-ink-primary outline-none transition-all duration-200 focus:border-ice/50 focus:ring-2 focus:ring-ice/15 ${
                    errors.dataReceita ? "border-coral/50" : "border-surface-border/50"
                  }`}
                />
                {errors.dataReceita && (
                  <p className="text-xs text-coral">{errors.dataReceita}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-ink-primary">
                  Próxima renovação <span className="text-coral">*</span>
                </label>
                <input
                  type="date"
                  value={proximaRenovacao}
                  onChange={(e) => setProximaRenovacao(e.target.value)}
                  className={`w-full rounded-2xl border bg-surface-raised px-4 py-3 text-ink-primary outline-none transition-all duration-200 focus:border-ice/50 focus:ring-2 focus:ring-ice/15 ${
                    errors.proximaRenovacao ? "border-coral/50" : "border-surface-border/50"
                  }`}
                />
                {errors.proximaRenovacao && (
                  <p className="text-xs text-coral">{errors.proximaRenovacao}</p>
                )}
              </div>
            </div>
          </motion.div>

          {/* HISTÓRICO DE RECEITAS E RENOVAÇÕES (LINHA DO TEMPO) */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.05 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <History size={100} />
             </div>
             
             <div className="mb-4 flex items-center justify-between relative z-10">
               <h3 className="text-sm font-semibold text-ink-primary">Histórico de Receitas</h3>
             </div>

             <div className="space-y-4 relative z-10 pl-2">
                {/* Linha vertical que liga as bolinhas */}
                <div className="absolute left-4 top-2 bottom-2 w-[1px] bg-surface-border/60 z-0"></div>

                {/* Mostra a Receita Inicial/Atual como o item mais recente do histórico visualmente */}
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

                {/* Lista as renovações (Filhos) */}
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

             <button
               onClick={() => { trigger("vibrate"); router.push(`/saude/renovacao/nova?medicamento_id=${id}`); }}
               className="mt-5 w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-surface-raised border border-ice/20 text-ice text-sm font-medium transition-colors hover:bg-ice/10 relative z-10"
             >
                <Plus size={16} /> Adicionar Nova Receita
             </button>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.28, delay: 0.06 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <button
              onClick={toggleEstoque}
              className="flex w-full items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ice/10 text-ice">
                  <Package size={16} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-ink-primary">
                    Acompanhar estoque
                  </p>
                  <p className="text-xs text-ink-muted">
                    Receba alerta e lembrete de dose
                  </p>
                </div>
              </div>
              <div
                className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${
                  estoqueAtivo ? "bg-ice" : "bg-surface-border"
                }`}
              >
                <div
                  className={`h-5 w-5 rounded-full bg-void transition-transform ${
                    estoqueAtivo ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </div>
            </button>

            <AnimatePresence>
              {estoqueAtivo && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 space-y-3 border-t border-surface-border/40 pt-4">
                    <div className="flex items-center justify-between gap-2 rounded-2xl bg-surface-raised/60 px-3 py-2.5">
                      <p className="text-xs text-ink-muted">
                        Contagem de referência:{" "}
                        <span className="font-medium text-ink-primary">
                          {estoqueDataReferencia}
                        </span>
                      </p>
                      <button
                        onClick={registrarContagemHoje}
                        className="shrink-0 whitespace-nowrap text-xs font-medium text-ice hover:text-ice/80"
                      >
                        Recontar hoje
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-ink-primary">
                          Quantidade atual <span className="text-coral">*</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          inputMode="numeric"
                          placeholder="Ex: 30"
                          value={estoqueQuantidade}
                          onChange={(e) => setEstoqueQuantidade(e.target.value)}
                          className={`w-full rounded-2xl border bg-surface-raised px-4 py-3 text-ink-primary outline-none transition-all duration-200 focus:border-ice/50 focus:ring-2 focus:ring-ice/15 ${
                            errors.estoqueQuantidade ? "border-coral/50" : "border-surface-border/50"
                          }`}
                        />
                        {errors.estoqueQuantidade && (
                          <p className="text-xs text-coral">{errors.estoqueQuantidade}</p>
                        )}
                      </div>

                      <Input
                        label="Unidade"
                        placeholder="comprimido(s)"
                        value={estoqueUnidade}
                        onChange={(e) => setEstoqueUnidade(e.target.value)}
                      />
                    </div>

                    <Input
                      label="Unid. por dose"
                      type="number"
                      min="1"
                      inputMode="numeric"
                      value={estoqueUnidadePorDose}
                      onChange={(e) => setEstoqueUnidadePorDose(e.target.value)}
                    />

                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <label className="block text-sm font-medium text-ink-primary">
                          Horários de dose <span className="text-coral">*</span>
                        </label>
                        <button
                          onClick={addHorario}
                          className="flex items-center gap-1 text-xs font-medium text-ice hover:text-ice/80"
                        >
                          <Plus size={13} />
                          Adicionar
                        </button>
                      </div>

                      <div className="space-y-2">
                        {horarios.map((horario, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <Clock
                                size={14}
                                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
                              />
                              <input
                                type="time"
                                value={horario}
                                onChange={(e) => updateHorario(index, e.target.value)}
                                className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised py-3 pl-9 pr-3 text-ink-primary outline-none transition-all duration-200 focus:border-ice/50 focus:ring-2 focus:ring-ice/15"
                              />
                            </div>
                            {horarios.length > 1 && (
                              <button
                                onClick={() => removeHorario(index)}
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-border/40 hover:text-coral"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      {errors.horarios && (
                        <p className="mt-1 text-xs text-coral">{errors.horarios}</p>
                      )}
                    </div>

                    {diasEstimados !== null && (
                      <div className="rounded-2xl bg-ice/8 px-3 py-2.5 text-xs text-ink-muted">
                        Com esse ritmo, dá pra{" "}
                        <span className="font-medium text-ink-primary">
                          {diasEstimados} dia{diasEstimados !== 1 ? "s" : ""}
                        </span>{" "}
                        a partir da data contada.
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.28, delay: 0.08 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <TextArea
              label="Notas (opcional)"
              placeholder="Ex: tomar em jejum, horário fixo..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </motion.div>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center justify-center gap-2 shadow-lg shadow-ice/10"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save size={16} />
                Salvar alterações
              </>
            )}
          </Button>
        </div>

        <SelectionModal
          isOpen={isTratamentoModalOpen}
          onClose={() => setIsTratamentoModalOpen(false)}
          onSelect={(item: any) => {
            trigger("vibrate");
            setTratamentoId(item.id!);
          }}
          items={tratamentos}
          title="Vincular a Tratamento"
          placeholder="Buscar tratamento..."
          renderItem={(item: any) => {
            const IconComp = getTratamentoIcon(item.nome);
            return (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-400/10 text-violet-400">
                  <IconComp size={18} />
                </div>
                <div>
                  <p className="font-medium text-ink-primary">{item.nome}</p>
                  {item.condicao && (
                    <p className="text-xs text-ink-muted capitalize">{item.condicao}</p>
                  )}
                </div>
              </div>
            );
          }}
          getItemId={(item: any) => item.id!}
          getItemLabel={(item: any) => item.nome}
          onCreateNew={() => {
            setIsTratamentoModalOpen(false);
            trigger("vibrate");
            setIsCreatingTratamento(true);
          }}
          createNewLabel="Novo Tratamento"
        />

        <BottomSheet
          isOpen={isCreatingTratamento}
          onClose={() => {
            trigger("vibrate");
            setIsCreatingTratamento(false);
            setNewTratamentoName("");
          }}
          title="Cadastrar Tratamento"
        >
          <div className="space-y-4 px-1 pb-2">
            <Input
              label="Nome do Tratamento"
              placeholder="Ex: TDAH, Dor Crônica, Depressão, Ansiedade..."
              value={newTratamentoName}
              onChange={(e) => setNewTratamentoName(e.target.value)}
              autoFocus
            />
            
            <Button
              variant="primary"
              fullWidth
              onClick={handleCreateTratamento}
              disabled={isSavingTratamento || !newTratamentoName.trim()}
              className="flex items-center justify-center gap-2"
            >
              {isSavingTratamento ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Plus size={16} />
              )}
              {isSavingTratamento ? "Salvando..." : "Salvar e selecionar"}
            </Button>
          </div>
        </BottomSheet>

        <SelectionModal
          isOpen={isDoctorModalOpen}
          onClose={() => setIsDoctorModalOpen(false)}
          onSelect={(item: any) => {
            trigger("vibrate");
            setMedicoNome(item.nome);
          }}
          items={medicos}
          title="Selecionar médico"
          placeholder="Buscar médico..."
          renderItem={(item: any) => (
            <div>
              <p className="font-medium text-ink-primary">{item.nome}</p>
              {item.especialidade && (
                <p className="text-xs text-ink-muted">{item.especialidade}</p>
              )}
            </div>
          )}
          getItemId={(item: any) => item.id!}
          getItemLabel={(item: any) => item.nome}
          onCreateNew={() => {
            setIsDoctorModalOpen(false);
            trigger("vibrate");
            router.push("/saude/medicos/novo");
          }}
          createNewLabel="Criar médico"
        />

        <SelectionModal
          isOpen={isPharmacyModalOpen}
          onClose={() => setIsPharmacyModalOpen(false)}
          onSelect={(item: any) => {
            trigger("vibrate");
            setFarmaciaNome(item.nome);
          }}
          items={farmacias}
          title="Selecionar farmácia"
          placeholder="Buscar farmácia..."
          renderItem={(item: any) => (
            <div>
              <p className="font-medium text-ink-primary">{item.nome}</p>
              {item.endereco && <p className="text-xs text-ink-muted">{item.endereco}</p>}
            </div>
          )}
          getItemId={(item: any) => item.id!}
          getItemLabel={(item: any) => item.nome}
          onCreateNew={() => {
            setIsPharmacyModalOpen(false);
            trigger("vibrate");
            router.push("/saude/farmacias/novo");
          }}
          createNewLabel="Criar farmácia"
        />

        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          title="Excluir medicamento"
          message={`Tem certeza que deseja excluir "${nome}"? O documento de receita vinculado não será apagado automaticamente.`}
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          isLoading={deleting}
          type="danger"
        />
      </main>
    </PageTransition>
  );
}
