// app/saude/registros/novo/page.tsx
"use client";

import { useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  Activity,
  Calendar,
  Clock,
  HeartPulse,
  Plus,
  X,
  Eraser,
  Stethoscope,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Info,
  Flame,
  FolderHeart,
  Pill,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useHapticFeedback } from "@/lib/haptics";
import { useLiveQuery } from "dexie-react-hooks";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { PageTransition } from "@/components/PageTransition";
import { SelectionModal } from "@/components/SelectionModal";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useToast } from "@/components/ToastProvider";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { registrosSaudeRepository } from "@/lib/repositories/registrosSaude";
import { db } from "@/lib/db";
import { getRegistroTheme, getClinicalTheme } from "@/lib/health-utils";
import { analisarRegistroSaude } from "@/lib/health-insights";
import { tratamentosRepository } from "@/lib/repositories/tratamentos";
import { cidsRepository } from "@/lib/repositories/cids";
import type { CategoriaRegistro, Tratamento, Cid, Medicamento } from "@/lib/types";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

function formatDateToDisplay(isoStr: string): string {
  if (!isoStr) return "";
  const parts = isoStr.split("-");
  if (parts.length !== 3) return isoStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function parseDateToISO(displayStr: string): string {
  const clean = displayStr.replace(/\D/g, "");
  if (clean.length !== 8) return "";
  const day = clean.slice(0, 2);
  const month = clean.slice(2, 4);
  const year = clean.slice(4, 8);
  return `${year}-${month}-${day}`;
}

function handleDateMask(value: string): string {
  const clean = value.replace(/\D/g, "").slice(0, 8);
  if (clean.length > 4) {
    return `${clean.slice(0, 2)}/${clean.slice(2, 4)}/${clean.slice(4)}`;
  }
  if (clean.length > 2) {
    return `${clean.slice(0, 2)}/${clean.slice(2)}`;
  }
  return clean;
}

function handleTimeMask(value: string): string {
  const clean = value.replace(/\D/g, "").slice(0, 4);
  if (clean.length > 2) {
    return `${clean.slice(0, 2)}:${clean.slice(2)}`;
  }
  return clean;
}

function getTratamentoIcon(nome: string) {
  const n = nome.toLowerCase();
  if (n.includes("tdah")) return Activity;
  if (n.includes("dor") || n.includes("neuropática")) return Flame;
  if (n.includes("depress")) return HeartPulse;
  if (n.includes("ansied") || n.includes("ansiolítico")) return AlertTriangle;
  return Activity;
}

const TIPOS_PREDEFINIDOS = [
  { categoria: "medicao" as CategoriaRegistro, tipo: "pressao_arterial", nome: "Pressão Arterial", placeholder: "Ex: 120/80" },
  { categoria: "medicao" as CategoriaRegistro, tipo: "glicemia", nome: "Glicemia", placeholder: "Ex: 99" },
  { categoria: "medicao" as CategoriaRegistro, tipo: "temperatura", nome: "Temperatura", placeholder: "Ex: 36.5" },
  { categoria: "sintoma" as CategoriaRegistro, tipo: "dor", nome: "Dor / Desconforto", placeholder: "Ex: Dor de cabeça" },
  { categoria: "sintoma" as CategoriaRegistro, tipo: "ansiedade", nome: "Ansiedade / Humor", placeholder: "Ex: Crise / Agitação" },
  { categoria: "sintoma" as CategoriaRegistro, tipo: "apatia", nome: "Apatia / Fadiga", placeholder: "Ex: Cansaço extremo" },
];

export default function NovoRegistroSaudePage() {
  const { trigger } = useHapticFeedback();
  const { showToast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const { activePersonId } = useActivePersonId();
  const isSubmitLocked = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tratamentos = useLiveQuery(() => activePersonId ? db.tratamentos.where('person_id').equals(activePersonId).toArray() : db.tratamentos.toArray(), [activePersonId]) || [];
  const cids = useLiveQuery(() => activePersonId ? db.cids.where('person_id').equals(activePersonId).toArray() : db.cids.toArray(), [activePersonId]) || [];
  const medicamentos = useLiveQuery(() => activePersonId ? db.medicamentos.where('person_id').equals(activePersonId).toArray() : db.medicamentos.toArray(), [activePersonId]) || [];

  const [categoria, setCategoria] = useState<CategoriaRegistro>("sintoma");
  const [tipoSelecionado, setTipoSelecionado] = useState("dor");
  const [nome, setNome] = useState("Dor / Desconforto");
  const [valorMedicao, setValorMedicao] = useState("");
  const [intensidade, setIntensidade] = useState<number | undefined>(5);

  const todayISO = new Date().toISOString().slice(0, 10);
  const [dataDisplay, setDataDisplay] = useState(formatDateToDisplay(todayISO));
  const [horario, setHorario] = useState(() => new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));

  const [observacoes, setObservacoes] = useState("");
  const [medicamentoId, setMedicamentoId] = useState("");
  const [tratamentosSelecionados, setTratamentosSelecionados] = useState<string[]>([]);
  const [cidsSelecionados, setCidsSelecionados] = useState<string[]>([]);

  const [isMedicamentoModalOpen, setIsMedicamentoModalOpen] = useState(false);
  const [isTratamentoModalOpen, setIsTratamentoModalOpen] = useState(false);
  const [isCidModalOpen, setIsCidModalOpen] = useState(false);

  const [isCreatingTratamento, setIsCreatingTratamento] = useState(false);
  const [newTratamentoName, setNewTratamentoName] = useState("");

  const [isCreatingCid, setIsCreatingCid] = useState(false);
  const [newCidCodigo, setNewCidCodigo] = useState("");
  const [newCidDescricao, setNewCidDescricao] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [shakeFields, setShakeFields] = useState<string[]>([]);

  const selectedMedicamento = medicamentos.find((m: any) => m.id === medicamentoId);

  // Motor de insights em tempo real
  const insight = useMemo(() => {
    return analisarRegistroSaude(nome, valorMedicao, intensidade, observacoes);
  }, [nome, valorMedicao, intensidade, observacoes]);

  const triggerShake = (fieldNames: string[]) => {
    trigger("error");
    setShakeFields(fieldNames);
    setTimeout(() => setShakeFields([]), 600);
  };

  const handleSelectPredefinido = (item: typeof TIPOS_PREDEFINIDOS[0]) => {
    trigger("vibrate");
    setCategoria(item.categoria);
    setTipoSelecionado(item.tipo);
    setNome(item.nome);
    if (item.categoria === "sintoma") {
      setIntensidade(5);
    } else {
      setIntensidade(undefined);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!nome.trim()) { newErrors.nome = "Informe o nome do registro"; shakeFields.push("nome"); }
    if (!dataDisplay || dataDisplay.length < 10) { newErrors.data = "Data inválida"; shakeFields.push("data"); }
    if (horario) {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(horario)) { newErrors.horario = "Horário inválido (use HH:MM)"; shakeFields.push("horario"); }
    }
    setErrors(newErrors);
    if (shakeFields.length > 0) { triggerShake(shakeFields); }
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateTratamento = async () => {
    if (!newTratamentoName.trim()) return;
    trigger("vibrate");
    try {
      const newId = await tratamentosRepository.create({
        nome: newTratamentoName.trim(),
        status: "ativo",
        user_id: user?.id || "",
        person_id: activePersonId || undefined,
      });
      setTratamentosSelecionados((prev) => [...prev, newId]);
      showToast("Tratamento cadastrado", "success");
      setIsCreatingTratamento(false);
      setNewTratamentoName("");
    } catch (error) {
      console.error(error);
      showToast("Erro ao cadastrar tratamento", "error");
    }
  };

  const handleCreateCid = async () => {
    if (!newCidCodigo.trim() || !newCidDescricao.trim()) return;
    trigger("vibrate");
    try {
      const newId = await cidsRepository.create({
        codigo: newCidCodigo.trim(),
        descricao: newCidDescricao.trim(),
        user_id: user?.id || "",
        person_id: activePersonId || undefined,
      });
      setCidsSelecionados((prev) => [...prev, newId]);
      showToast("CID cadastrado", "success");
      setIsCreatingCid(false);
      setNewCidCodigo("");
      setNewCidDescricao("");
    } catch (error) {
      console.error(error);
      showToast("Erro ao cadastrar CID", "error");
    }
  };

  const handleSubmit = async () => {
    trigger("vibrate");
    if (!validate()) {
      trigger("error");
      return;
    }
    if (!user?.id) return;

    if (isSubmitLocked.current || isSubmitting) return;
    isSubmitLocked.current = true;
    setIsSubmitting(true);

    try {
      const dataISO = parseDateToISO(dataDisplay);
      if (!dataISO) throw new Error("Data inválida");

      await registrosSaudeRepository.create({
        user_id: user.id,
        person_id: activePersonId || undefined,
        categoria,
        tipo: tipoSelecionado || "geral",
        nome: nome.trim(),
        intensidade: intensidade !== undefined ? Number(intensidade) : undefined,
        valor_medicao: valorMedicao.trim() || undefined,
        data: dataISO,
        horario: horario || "00:00",
        observacoes: observacoes.trim() || undefined,
        medicamento_id: medicamentoId || undefined,
        tratamento_ids: tratamentosSelecionados.length > 0 ? tratamentosSelecionados : undefined,
        cid_ids: cidsSelecionados.length > 0 ? cidsSelecionados : undefined,
      });

      trigger("success");
      showToast("Registro salvo com sucesso", "success");
      router.back();
    } catch (error) {
      console.error(error);
      trigger("error");
      showToast("Erro ao salvar registro", "error");
    } finally {
      setIsSubmitting(false);
      isSubmitLocked.current = false;
    }
  };

  const theme = getRegistroTheme(nome);
  const IconComponent = theme.icon;

  return (
    <PageTransition>
      <main className="min-h-[100dvh] bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { trigger("vibrate"); router.back(); }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-ice" />
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">Prontuário</p>
              </div>
              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">Novo Registro de Saúde</h1>
            </div>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-6">
          {/* SELEÇÃO RÁPIDA (PRESETS) */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-3">Escolha rápida</label>
            <div className="grid grid-cols-2 gap-2">
              {TIPOS_PREDEFINIDOS.map((item) => {
                const isSelected = nome === item.nome;
                const itemTheme = getRegistroTheme(item.nome);
                const ItemIcon = itemTheme.icon;
                return (
                  <button
                    key={item.tipo}
                    type="button"
                    onClick={() => handleSelectPredefinido(item)}
                    className={`flex items-center gap-2.5 rounded-2xl border p-3 text-left transition-all active:scale-95 ${
                      isSelected ? "border-ice bg-ice/10 shadow-sm" : "border-surface-border/50 bg-surface-raised hover:border-surface-border"
                    }`}
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${itemTheme.tagClass}`}>
                      <ItemIcon size={16} />
                    </div>
                    <span className="text-xs font-semibold text-ink-primary truncate">{item.nome}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* DADOS PRINCIPAIS DO REGISTRO */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.02 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm space-y-4">
            <div className={`transition-all ${shakeFields.includes('nome') ? 'animate-shake' : ''}`}>
              <Input
                label="Nome do Registro / Sintoma"
                placeholder="Ex: Dor de cabeça, Pressão..."
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                error={errors.nome}
                required
              />
            </div>

            {categoria === "medicao" && (
              <Input
                label="Valor da Medição (Ex: 120/80 ou 38.5)"
                placeholder="Insira o valor numérico ou medida"
                value={valorMedicao}
                onChange={(e) => setValorMedicao(e.target.value)}
              />
            )}

            {categoria === "sintoma" && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-ink-primary">Intensidade (1 a 10)</label>
                  <span className="font-mono text-sm font-bold text-ice bg-ice/10 px-2.5 py-0.5 rounded-full border border-ice/20">
                    {intensidade ?? 5} / 10
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={intensidade ?? 5}
                  onChange={(e) => { trigger("vibrate"); setIntensidade(Number(e.target.value)); }}
                  className="w-full accent-ice cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-ink-muted">
                  <span>1 (Leve)</span>
                  <span>5 (Moderado)</span>
                  <span>10 (Severo)</span>
                </div>
              </div>
            )}
          </motion.div>

          {/* MOTOR DE INSIGHT CLÍNICO EM TEMPO REAL */}
          <AnimatePresence>
            {insight && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className={`rounded-[24px] border p-4 shadow-sm ${
                  insight.status === "critico" ? "bg-coral/10 border-coral/30" :
                  insight.status === "alerta" ? "bg-amber-400/10 border-amber-400/30" :
                  insight.status === "atencao" ? "bg-ice/10 border-ice/30" :
                  "bg-emerald-400/10 border-emerald-400/30"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                    insight.status === "critico" ? "bg-coral/20 border-coral/40 text-coral" :
                    insight.status === "alerta" ? "bg-amber-400/20 border-amber-400/40 text-amber-400" :
                    insight.status === "atencao" ? "bg-ice/20 border-ice/40 text-ice" :
                    "bg-emerald-400/20 border-emerald-400/40 text-emerald-400"
                  }`}>
                    {insight.status === "critico" || insight.status === "alerta" ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className={`text-xs font-bold uppercase tracking-wider ${
                      insight.status === "critico" ? "text-coral" :
                      insight.status === "alerta" ? "text-amber-400" :
                      insight.status === "atencao" ? "text-ice" :
                      "text-emerald-400"
                    }`}>
                      {insight.titulo}
                    </h3>
                    <p className="text-xs text-ink-primary mt-1 leading-snug">{insight.mensagem}</p>
                    <p className="text-[11px] text-ink-muted mt-1.5 italic">{insight.recomendacao}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* DATA E HORÁRIO */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.04 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-ink-primary">Data <span className="text-coral">*</span></label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
                  <input
                    type="text"
                    placeholder="DD/MM/AAAA"
                    maxLength={10}
                    value={dataDisplay}
                    onChange={(e) => setDataDisplay(handleDateMask(e.target.value))}
                    className={`w-full rounded-2xl border ${errors.data ? "border-coral/50" : "border-surface-border/50"} bg-surface-raised pl-9 pr-4 py-3 text-ink-primary font-mono text-sm outline-none focus:border-ice/50`}
                  />
                </div>
                {errors.data && <p className="text-xs text-coral ml-1">{errors.data}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-ink-primary">Horário <span className="text-coral">*</span></label>
                <div className="relative">
                  <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
                  <input
                    type="text"
                    placeholder="00:00"
                    maxLength={5}
                    value={horario}
                    onChange={(e) => setHorario(handleTimeMask(e.target.value))}
                    className={`w-full rounded-2xl border ${errors.horario ? "border-coral/50 text-coral" : "border-surface-border/50 text-ink-primary"} bg-surface-raised pl-9 pr-4 py-3 font-mono text-sm outline-none focus:border-ice/50`}
                  />
                </div>
                {errors.horario && <p className="text-xs text-coral ml-1">{errors.horario}</p>}
              </div>
            </div>
          </motion.div>

          {/* TRATAMENTOS E CIDs COM LIMPAR */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.05 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-violet-400" />
                <label className="text-sm font-semibold text-ink-primary">Tratamentos e CIDs Relacionados</label>
              </div>
              {(tratamentosSelecionados.length > 0 || cidsSelecionados.length > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    trigger("vibrate");
                    setTratamentosSelecionados([]);
                    setCidsSelecionados([]);
                  }}
                  className="flex items-center gap-1 text-[10px] font-bold text-coral bg-coral/10 px-2 py-0.5 rounded-md uppercase"
                >
                  <Eraser size={12} /> Limpar todos
                </button>
              )}
            </div>

            {/* Tratamentos selecionados */}
            {tratamentosSelecionados.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {tratamentosSelecionados.map((tId) => {
                  const t = tratamentos.find((x) => x.id === tId);
                  if (!t) return null;
                  const IconComp = getTratamentoIcon(t.nome);
                  return (
                    <div key={tId} className="flex items-center gap-1.5 rounded-full bg-violet-400/10 border border-violet-400/20 px-3 py-1.5">
                      <IconComp size={14} className="text-violet-400" />
                      <span className="text-xs font-medium text-violet-300">{t.nome}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); trigger("vibrate"); setTratamentosSelecionados((prev) => prev.filter((item) => item !== tId)); }}
                        className="ml-1 text-violet-400/60 hover:text-coral transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* CIDs selecionados */}
            {cidsSelecionados.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {cidsSelecionados.map((cId) => {
                  const c = cids.find((x) => x.id === cId);
                  if (!c) return null;
                  const theme = getClinicalTheme(c.descricao || c.codigo);
                  const IconComp = theme.icon;
                  return (
                    <div key={cId} className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 ${theme.tagClass}`}>
                      <IconComp size={14} />
                      <span className="text-xs font-medium">{c.codigo}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); trigger("vibrate"); setCidsSelecionados((prev) => prev.filter((item) => item !== cId)); }}
                        className="ml-1 text-current/60 hover:text-coral transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => { trigger("vibrate"); setIsTratamentoModalOpen(true); }}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-violet-400/30 bg-violet-400/5 px-4 py-3 text-violet-300 transition-colors hover:bg-violet-400/10"
              >
                <Plus size={16} />
                <span className="text-sm font-medium">Vincular Tratamento</span>
              </button>
              <button
                onClick={() => { trigger("vibrate"); setIsCidModalOpen(true); }}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-emerald-400/30 bg-emerald-400/5 px-4 py-3 text-emerald-300 transition-colors hover:bg-emerald-400/10"
              >
                <Plus size={16} />
                <span className="text-sm font-medium">Vincular CID</span>
              </button>
            </div>
          </motion.div>

          {/* VÍNCULO COM MEDICAMENTO (OPCIONAL) */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.06 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-ink-primary">Medicamento Relacionado (Opcional)</label>
              {medicamentoId && selectedMedicamento && (
                <button
                  type="button"
                  onClick={() => { trigger("vibrate"); setMedicamentoId(""); }}
                  className="flex items-center gap-1 text-[10px] font-bold text-coral bg-coral/10 px-2 py-0.5 rounded-md uppercase"
                >
                  <Eraser size={12} /> Limpar
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => { trigger("vibrate"); setIsMedicamentoModalOpen(true); }}
              className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left flex items-center justify-between text-ink-primary"
            >
              <span className="truncate">{selectedMedicamento ? `${selectedMedicamento.nome} (${selectedMedicamento.dosagem})` : "Vincular medicamento..."}</span>
            </button>
          </motion.div>

          {/* ANOTAÇÕES */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.08 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <TextArea
              label="Observações / Anotações (Opcional)"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Detalhes adicionais sobre o sintoma ou medição..."
            />
          </motion.div>
        </section>

        {/* BARRA FIXA INFERIOR */}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <Button variant="primary" size="lg" fullWidth onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Salvando...</> : "Salvar Registro"}
          </Button>
        </div>

        {/* MODAL DE SELEÇÃO DE MEDICAMENTO */}
        <SelectionModal
          isOpen={isMedicamentoModalOpen}
          onClose={() => setIsMedicamentoModalOpen(false)}
          onSelect={(item: any) => { trigger("vibrate"); setMedicamentoId(item.id!); }}
          items={medicamentos}
          title="Selecionar Medicamento"
          placeholder="Buscar medicamento..."
          renderItem={(item: any) => (
            <div>
              <p className="font-medium text-ink-primary">{item.nome}</p>
              <p className="text-xs text-ink-muted">{item.dosagem}</p>
            </div>
          )}
          getItemId={(item: any) => item.id!}
          getItemLabel={(item: any) => item.nome}
        />

        {/* MODAL DE TRATAMENTOS (MÚLTIPLA SELEÇÃO) */}
        <SelectionModal<Tratamento>
          isOpen={isTratamentoModalOpen}
          onClose={() => setIsTratamentoModalOpen(false)}
          onSelect={(item) => {
            trigger("vibrate");
            if (!tratamentosSelecionados.includes(item.id!)) {
              setTratamentosSelecionados((prev) => [...prev, item.id!]);
            }
          }}
          items={tratamentos}
          title="Vincular Tratamentos"
          placeholder="Buscar tratamento..."
          renderItem={(item) => {
            const IconComp = getTratamentoIcon(item.nome);
            const isSelected = tratamentosSelecionados.includes(item.id!);
            return (
              <div className="flex items-center gap-2 w-full">
                <IconComp size={16} className="text-violet-400" />
                <span className={`text-sm font-medium ${isSelected ? "text-violet-400" : "text-ink-primary"}`}>
                  {item.nome}
                </span>
                {isSelected && <span className="ml-auto text-[10px] text-emerald-400">✓</span>}
              </div>
            );
          }}
          getItemId={(item) => item.id!}
          getItemLabel={(item) => item.nome}
          onCreateNew={() => { setIsTratamentoModalOpen(false); setIsCreatingTratamento(true); }}
          createNewLabel="Cadastrar Novo Tratamento"
        />

        {/* MODAL DE CIDs (MÚLTIPLA SELEÇÃO) */}
        <SelectionModal<Cid>
          isOpen={isCidModalOpen}
          onClose={() => setIsCidModalOpen(false)}
          onSelect={(item) => {
            trigger("vibrate");
            if (!cidsSelecionados.includes(item.id!)) {
              setCidsSelecionados((prev) => [...prev, item.id!]);
            }
          }}
          items={cids}
          title="Vincular CIDs"
          placeholder="Buscar CID..."
          renderItem={(item) => {
            const theme = getClinicalTheme(item.descricao || item.codigo);
            const IconComp = theme.icon;
            const isSelected = cidsSelecionados.includes(item.id!);
            return (
              <div className="flex items-center gap-2 w-full">
                <IconComp size={16} className={theme.textClass} />
                <span className={`text-sm font-medium ${isSelected ? theme.textClass : "text-ink-primary"}`}>
                  {item.codigo} - {item.descricao}
                </span>
                {isSelected && <span className="ml-auto text-[10px] text-emerald-400">✓</span>}
              </div>
            );
          }}
          getItemId={(item) => item.id!}
          getItemLabel={(item) => `${item.codigo} - ${item.descricao}`}
          onCreateNew={() => { setIsCidModalOpen(false); setIsCreatingCid(true); }}
          createNewLabel="Cadastrar Novo CID"
        />

        {/* BOTTOM SHEET PARA CRIAÇÃO RÁPIDA DE TRATAMENTO */}
        <BottomSheet isOpen={isCreatingTratamento} onClose={() => setIsCreatingTratamento(false)} title="Novo Tratamento">
          <div className="space-y-4 px-1 pb-2">
            <Input label="Nome do Tratamento" value={newTratamentoName} onChange={(e) => setNewTratamentoName(e.target.value)} autoFocus />
            <Button variant="primary" fullWidth onClick={handleCreateTratamento} disabled={!newTratamentoName.trim()}>
              Salvar e Selecionar
            </Button>
          </div>
        </BottomSheet>

        {/* BOTTOM SHEET PARA CRIAÇÃO RÁPIDA DE CID */}
        <BottomSheet isOpen={isCreatingCid} onClose={() => setIsCreatingCid(false)} title="Novo CID">
          <div className="space-y-4 px-1 pb-2">
            <Input label="Código CID" placeholder="Ex: F90.0" value={newCidCodigo} onChange={(e) => setNewCidCodigo(e.target.value)} autoFocus />
            <Input label="Descrição" placeholder="Ex: Transtorno de déficit de atenção" value={newCidDescricao} onChange={(e) => setNewCidDescricao(e.target.value)} />
            <Button variant="primary" fullWidth onClick={handleCreateCid} disabled={!newCidCodigo.trim() || !newCidDescricao.trim()}>
              Salvar e Selecionar
            </Button>
          </div>
        </BottomSheet>
      </main>
    </PageTransition>
  );
}