"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  Save,
  Pill,
  Upload,
  Camera,
  X,
  FileText,
  Image as ImageIcon,
  AlertTriangle,
  Package,
  Plus,
  Trash2,
  Clock,
} from "lucide-react";
import { usePersons } from "@/hooks/usePersons";
import { useAuth } from "@/hooks/useAuth";
import { useSafeDb } from "@/hooks/useSafeDb";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useMedicos } from "@/hooks/useMedicos";
import { useFarmacias } from "@/hooks/useFarmacias";
import { useHapticFeedback } from "@/lib/haptics";
import { uploadFile } from "@/lib/supabase/storage";
import {
  suggestRenewalDate,
  VALIDADE_RECEITA_DIAS,
  TIPO_RECEITA_LABELS,
} from "@/lib/health-utils";
import { db } from "@/lib/db";
import type { Attachment, Document, TipoReceita } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { PageTransition } from "@/components/PageTransition";
import { SelectionModal } from "@/components/SelectionModal";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

const TIPO_OPTIONS: TipoReceita[] = ["comum", "amarela", "azul", "branca"];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function NovoMedicamentoPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { user } = useAuth();
  const persons = usePersons();
  const { addDocument } = useSafeDb();
  const { addMedicamento } = useMedicamentos();
  const { medicos } = useMedicos();
  const { farmacias } = useFarmacias();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [personId, setPersonId] = useState<string>(persons[0]?.id || "");
  const [nome, setNome] = useState("");
  const [dosagem, setDosagem] = useState("");
  const [medicoId, setMedicoId] = useState<string>("");
  const [farmaciaId, setFarmaciaId] = useState<string>("");
  const [tipoReceita, setTipoReceita] = useState<TipoReceita>("comum");
  const [dataReceita, setDataReceita] = useState("");
  const [proximaRenovacao, setProximaRenovacao] = useState("");
  const [renovacaoEditadaManualmente, setRenovacaoEditadaManualmente] = useState(false);
  const [observacoes, setObservacoes] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [localFile, setLocalFile] = useState<File | null>(null);

  // Estoque
  const [estoqueAtivo, setEstoqueAtivo] = useState(false);
  const [estoqueQuantidade, setEstoqueQuantidade] = useState("");
  const [estoqueDataReferencia, setEstoqueDataReferencia] = useState(todayISO());
  const [estoqueUnidade, setEstoqueUnidade] = useState("comprimido(s)");
  const [estoqueUnidadePorDose, setEstoqueUnidadePorDose] = useState("1");
  const [horarios, setHorarios] = useState<string[]>([""]);

  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [isPharmacyModalOpen, setIsPharmacyModalOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const selectedMedico = medicos.find((m: any) => m.id === medicoId);
  const selectedFarmacia = farmacias.find((f: any) => f.id === farmaciaId);
  const diasValidade = VALIDADE_RECEITA_DIAS[tipoReceita];

  const handleDataReceitaChange = (value: string) => {
    setDataReceita(value);
    if (diasValidade && !renovacaoEditadaManualmente && value) {
      setProximaRenovacao(suggestRenewalDate(value, tipoReceita));
    }
  };

  const handleTipoReceitaChange = (tipo: TipoReceita) => {
    trigger("vibrate");
    setTipoReceita(tipo);
    const dias = VALIDADE_RECEITA_DIAS[tipo];
    if (dias && dataReceita && !renovacaoEditadaManualmente) {
      setProximaRenovacao(suggestRenewalDate(dataReceita, tipo));
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

  const consumoDiario =
    horarios.filter((h) => h).length * (Number(estoqueUnidadePorDose) || 1);
  const diasEstimados =
    estoqueAtivo && consumoDiario > 0 && Number(estoqueQuantidade) > 0
      ? Math.floor(Number(estoqueQuantidade) / consumoDiario)
      : null;

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
    if (attachment?.url.startsWith("blob:")) {
      URL.revokeObjectURL(attachment.url);
    }
    setAttachment(null);
    setLocalFile(null);
    trigger("vibrate");
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!personId) newErrors.personId = "Selecione uma pessoa";
    if (!nome.trim()) newErrors.nome = "Nome do medicamento é obrigatório";
    if (!dosagem.trim()) newErrors.dosagem = "Dosagem é obrigatória";
    if (!medicoId) newErrors.medicoId = "Selecione o médico";
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

    setLoading(true);
    setUploadProgress(0);

    try {
      const docData: Omit<Document, "id" | "created_at" | "updated_at" | "synced"> = {
        user_id: user?.id || "",
        person_id: personId,
        category_id: "saude",
        type: "receita",
        title: `Receita — ${nome.trim()}`,
        description: observacoes.trim() || undefined,
        metadata: {
          medication: nome.trim(),
          dosage: dosagem.trim(),
          doctor: selectedMedico?.nome || "",
          pharmacy: selectedFarmacia?.nome || "",
          prescription_date: dataReceita,
          renewal_date: proximaRenovacao,
        },
        attachments: attachment ? [attachment] : [],
        is_favorite: false,
      };

      const docId = await addDocument(docData);

      if (localFile && user && attachment) {
        const { url, error } = await uploadFile(user.id, localFile, "saude");
        if (!error && url) {
          await db.documents.update(docId, {
            attachments: [{ ...attachment, url }],
            updated_at: new Date().toISOString(),
            synced: false,
          });
          setUploadProgress(100);
          URL.revokeObjectURL(attachment.url);
        }
      }

      await addMedicamento({
        document_id: docId,
        nome: nome.trim(),
        dosagem: dosagem.trim(),
        medico: selectedMedico?.nome || "",
        farmacia: selectedFarmacia?.nome || undefined,
        data_receita: dataReceita,
        proxima_renovacao: proximaRenovacao,
        observacoes: observacoes.trim() || undefined,
        tipo_receita: tipoReceita,
        estoque_quantidade: estoqueAtivo ? Number(estoqueQuantidade) : undefined,
        estoque_data_referencia: estoqueAtivo ? estoqueDataReferencia : undefined,
        estoque_horarios: estoqueAtivo ? horarios.filter((h) => h) : undefined,
        estoque_unidade_por_dose: estoqueAtivo
          ? Number(estoqueUnidadePorDose) || 1
          : undefined,
        estoque_unidade_medida: estoqueAtivo ? estoqueUnidade.trim() || "comprimido(s)" : undefined,
      });

      trigger("success");
      router.push("/saude");
    } catch (error) {
      console.error("Erro ao salvar medicamento:", error);
      trigger("error");
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={handleFileSelect}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleCameraCapture}
        />

        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl">
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

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Pill size={16} className="text-ice" />
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">
                  Vault
                </p>
              </div>
              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">
                Novo medicamento
              </h1>
              <p className="mt-1 text-sm text-ink-muted">
                A receita anexada também entra na sua categoria Saúde.
              </p>
            </div>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-6">
          {/* Pessoa */}
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.28 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <p className="mb-3 text-sm font-medium text-ink-primary">
              Pessoa <span className="text-coral">*</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {persons.map((person: any) => {
                const active = personId === person.id;
                return (
                  <button
                    key={person.id}
                    onClick={() => {
                      trigger("vibrate");
                      setPersonId(person.id!);
                    }}
                    className={`rounded-full border px-4 py-2.5 text-sm font-medium transition-all active:scale-95 ${
                      active
                        ? "border-ice bg-ice/12 text-ice"
                        : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                    }`}
                  >
                    {person.name}
                  </button>
                );
              })}
            </div>
            {errors.personId && <p className="mt-2 text-xs text-coral">{errors.personId}</p>}
          </motion.div>

          {/* Tipo de receita */}
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
              <div className="mt-3 flex items-start gap-2 rounded-2xl bg-violet-400/8 px-3 py-2.5">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-violet-300" />
                <p className="text-xs leading-5 text-ink-muted">
                  Receita {TIPO_RECEITA_LABELS[tipoReceita].toLowerCase()} vale{" "}
                  <span className="font-medium text-ink-primary">{diasValidade} dias</span>. Já
                  sugeri a próxima renovação com base nisso — ajuste se precisar.
                </p>
              </div>
            )}
          </motion.div>

          {/* Dados do medicamento */}
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
                  errors.medicoId ? "border-coral/50" : "border-surface-border/50"
                } bg-surface-raised`}
              >
                {selectedMedico ? selectedMedico.nome : "Selecionar médico"}
              </button>
              {errors.medicoId && <p className="mt-1 text-xs text-coral">{errors.medicoId}</p>}
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
                {selectedFarmacia ? selectedFarmacia.nome : "Selecionar farmácia"}
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
                  onChange={(e) => handleDataReceitaChange(e.target.value)}
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
                  onChange={(e) => {
                    setProximaRenovacao(e.target.value);
                    setRenovacaoEditadaManualmente(true);
                  }}
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

          {/* Estoque */}
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
                    Receba alerta quando estiver acabando
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

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-ink-primary">
                          Contado em <span className="text-coral">*</span>
                        </label>
                        <input
                          type="date"
                          value={estoqueDataReferencia}
                          onChange={(e) => setEstoqueDataReferencia(e.target.value)}
                          className={`w-full rounded-2xl border bg-surface-raised px-4 py-3 text-ink-primary outline-none transition-all duration-200 focus:border-ice/50 focus:ring-2 focus:ring-ice/15 ${
                            errors.estoqueDataReferencia ? "border-coral/50" : "border-surface-border/50"
                          }`}
                        />
                        {errors.estoqueDataReferencia && (
                          <p className="text-xs text-coral">{errors.estoqueDataReferencia}</p>
                        )}
                      </div>

                      <Input
                        label="Unid. por dose"
                        type="number"
                        min="1"
                        inputMode="numeric"
                        value={estoqueUnidadePorDose}
                        onChange={(e) => setEstoqueUnidadePorDose(e.target.value)}
                      />
                    </div>

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

          {/* Notas */}
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

          {/* Anexo da receita */}
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.28, delay: 0.12 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="mb-3">
              <label className="block text-sm font-medium text-ink-primary">
                Foto da receita (opcional)
              </label>
              <p className="mt-1 text-xs text-ink-muted">
                Anexe pra ter a receita sempre à mão na hora de renovar.
              </p>
            </div>

            {!attachment ? (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="secondary"
                  className="flex items-center justify-center gap-2"
                  onClick={() => {
                    trigger("vibrate");
                    fileInputRef.current?.click();
                  }}
                  disabled={loading}
                >
                  <Upload size={16} />
                  Upload
                </Button>
                <Button
                  variant="secondary"
                  className="flex items-center justify-center gap-2"
                  onClick={() => {
                    trigger("vibrate");
                    cameraInputRef.current?.click();
                  }}
                  disabled={loading}
                >
                  <Camera size={16} />
                  Câmera
                </Button>
              </div>
            ) : (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-3 rounded-2xl border border-surface-border/50 bg-surface-raised px-3 py-3"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-surface-border/40 bg-surface">
                    {attachment.type === "image" ? (
                      <ImageIcon size={16} className="text-ice" />
                    ) : (
                      <FileText size={16} className="text-ice" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-primary">
                      {attachment.name}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {attachment.type === "image" ? "Imagem" : "PDF"}
                    </p>
                  </div>
                  <button
                    onClick={removeAttachment}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-border/40 hover:text-ink-primary"
                    disabled={loading}
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              </AnimatePresence>
            )}
          </motion.div>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center justify-center gap-2 shadow-lg shadow-ice/10"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {uploadProgress > 0 ? "Enviando receita..." : "Salvando..."}
              </>
            ) : (
              <>
                <Save size={16} />
                Salvar medicamento
              </>
            )}
          </Button>
        </div>

        <SelectionModal
          isOpen={isDoctorModalOpen}
          onClose={() => setIsDoctorModalOpen(false)}
          onSelect={(item: any) => {
            trigger("vibrate");
            setMedicoId(item.id!);
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
            setFarmaciaId(item.id!);
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
      </main>
    </PageTransition>
  );
}