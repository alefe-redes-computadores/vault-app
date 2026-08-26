// app/saude/documentos/novo/page.tsx
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  Upload,
  Camera,
  X,
  Loader2,
  Save,
  FileText,
  Image as ImageIcon,
  ChevronRight,
  Plus,
  ChevronLeft,
  Pill,
  Heart,
  FileOutput,
  Stethoscope,
  Activity as ActivityIcon,
  Calendar,
  Layers3,
  User,
  AlertCircle,
} from "lucide-react";

import { usePersons } from "@/hooks/usePersons";
import { useAuth } from "@/hooks/useAuth";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { useHapticFeedback } from "@/lib/haptics";
import { uploadFile } from "@/lib/supabase/storage";
import { db, safeAddPerson } from "@/lib/db";
import { useSubmitAction } from "@/hooks/useSubmitAction";
import { documentsRepository } from "@/lib/repositories/documents";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import {
  CATEGORIES,
  type CategoryId,
  type DocumentType,
  type Attachment,
  type Person,
} from "@/lib/types";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { PageTransition } from "@/components/PageTransition";
import { SelectionModal } from "@/components/SelectionModal";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { scheduleDocumentExpiryNotification } from "@/lib/notifications";

const DEFAULT_PERSON_COLOR = "#34D399"; // Verde clínico para saúde

const HEALTH_TYPES: DocumentType[] = [
  "receita",
  "prontuario",
  "laudo",
  "encaminhamento",
  "consulta",
  "cirurgia",
  "exame_sangue",
  "exame_imagem",
];

const TYPE_ICONS: Record<string, LucideIcon> = {
  receita: Pill,
  prontuario: Heart,
  laudo: FileText,
  encaminhamento: FileOutput,
  consulta: Stethoscope,
  cirurgia: ActivityIcon,
  exame_sangue: ActivityIcon,
  exame_imagem: ActivityIcon,
};

const HEALTH_TYPE_LABELS: Record<string, string> = {
  receita: "Receita Médica",
  prontuario: "Prontuário Médico",
  laudo: "Laudo ou Parecer",
  encaminhamento: "Encaminhamento",
  consulta: "Registro de Consulta",
  cirurgia: "Relatório de Cirurgia",
  exame_sangue: "Exame de Sangue / Laboratório",
  exame_imagem: "Exame de Imagem (Raio-X, RM)",
};

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 50 : -50, opacity: 0 }),
  center: { zIndex: 1, x: 0, opacity: 1 },
  exit: (direction: number) => ({ zIndex: 0, x: direction < 0 ? 50 : -50, opacity: 0 }),
};

function handleDateMask(value: string): string {
  const clean = value.replace(/\D/g, "").slice(0, 8);
  if (clean.length > 4) return `${clean.slice(0, 2)}/${clean.slice(2, 4)}/${clean.slice(4)}`;
  if (clean.length > 2) return `${clean.slice(0, 2)}/${clean.slice(2)}`;
  return clean;
}

function parseDateToISO(displayStr: string): string {
  const clean = displayStr.replace(/\D/g, "");
  if (clean.length !== 8) return "";
  return `${clean.slice(4, 8)}-${clean.slice(2, 4)}-${clean.slice(0, 2)}`;
}

export default function NovoDocumentoSaudePage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { user } = useAuth();
  const { activePersonId } = useActivePersonId();
  const persons = usePersons() as Person[];
  const { medicamentos } = useMedicamentos();
  const { run, isSubmitting } = useSubmitAction();
  const isSubmitLocked = useRef(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [slideDirection, setSlideDirection] = useState(0);

  const [formData, setFormData] = useState({
    person_id: activePersonId || "",
    category_id: "saude" as CategoryId,
    type: "receita" as DocumentType,
    title: "",
    description: "",
    metadata: {} as Record<string, string>,
    attachments: [] as Attachment[],
  });

  const [customFields, setCustomFields] = useState<{ id: string; label: string; value: string }[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [localFiles, setLocalFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);
  const [isCreatingPerson, setIsCreatingPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [isSavingPerson, setIsSavingPerson] = useState(false);
  const [expiryWarning, setExpiryWarning] = useState<string | null>(null);

  const selectedPerson = persons.find((p) => p.id === formData.person_id);
  const personColor = selectedPerson?.color || DEFAULT_PERSON_COLOR;

  useEffect(() => {
    if (activePersonId && !formData.person_id) {
      setFormData((prev) => ({ ...prev, person_id: activePersonId }));
    } else if (!formData.person_id && persons.length > 0) {
      setFormData((prev) => ({ ...prev, person_id: persons[0].id! }));
    }
  }, [activePersonId, persons]);

  // Define campos dinâmicos com base no tipo de documento clínico escolhido
  const fields = useMemo(() => {
    switch (formData.type) {
      case "receita":
        return [
          { key: "medication", label: "Nome do Medicamento", type: "text", required: true },
          { key: "dosage", label: "Dosagem", type: "text", required: false },
          { key: "doctor", label: "Médico Prescritor", type: "text", required: false },
          { key: "prescription_date", label: "Data da Receita", type: "date", required: true },
          { key: "expiry_date", label: "Data de Validade / Vencimento", type: "date", required: false },
        ];
      case "consulta":
        return [
          { key: "specialty", label: "Especialidade", type: "text", required: false },
          { key: "hospital", label: "Clínica / Hospital", type: "text", required: false },
          { key: "date", label: "Data da Consulta", type: "date", required: true },
          { key: "reason", label: "Motivo / Sintomas", type: "text", required: false },
        ];
      case "cirurgia":
        return [
          { key: "procedure", label: "Procedimento Cirúrgico", type: "text", required: true },
          { key: "hospital", label: "Hospital / Unidade", type: "text", required: false },
          { key: "date", label: "Data da Cirurgia", type: "date", required: true },
        ];
      case "exame_sangue":
      case "exame_imagem":
        return [
          { key: "hospital", label: "Laboratório / Local", type: "text", required: false },
          { key: "data_exame", label: "Data do Exame", type: "date", required: true },
        ];
      default:
        return [
          { key: "specialty", label: "Especialidade / Área", type: "text", required: false },
          { key: "date", label: "Data do Documento", type: "date", required: true },
        ];
    }
  }, [formData.type]);

  const handleChange = <K extends keyof typeof formData>(field: K, value: (typeof formData)[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleMetadataChange = (key: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      metadata: { ...prev.metadata, [key]: value },
    }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));

    if (key.toLowerCase().includes("validade") || key.toLowerCase().includes("expiry")) {
      const iso = parseDateToISO(value);
      if (iso && new Date(iso) < new Date()) {
        setExpiryWarning("Atenção: A data inserida indica que esta receita/documento já está vencida!");
      } else {
        setExpiryWarning(null);
      }
    }
  };

  const addCustomField = () => {
    if (customFields.length < 5) {
      setCustomFields([...customFields, { id: crypto.randomUUID(), label: "", value: "" }]);
      trigger("vibrate");
    }
  };

  const updateCustomField = (id: string, key: "label" | "value", val: string) => {
    setCustomFields(customFields.map((f) => (f.id === id ? { ...f, [key]: val } : f)));
  };

  const removeCustomField = (id: string) => {
    setCustomFields(customFields.filter((f) => f.id !== id));
    trigger("vibrate");
  };

  const handleCreatePerson = async () => {
    if (!newPersonName.trim() || !user?.id) return;
    setIsSavingPerson(true);
    trigger("vibrate");

    try {
      const id = await safeAddPerson({
        user_id: user.id,
        name: newPersonName.trim(),
        color: DEFAULT_PERSON_COLOR,
      });

      handleChange("person_id", id);
      trigger("success");
      setIsCreatingPerson(false);
      setNewPersonName("");
    } catch (error) {
      console.error("Erro ao criar perfil:", error);
      trigger("error");
    } finally {
      setIsSavingPerson(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        trigger("error");
        alert("Arquivo muito grande. O limite máximo é 10MB.");
        event.target.value = "";
        return;
      }
      trigger("vibrate");
      setLocalFiles((prev) => [...prev, file]);
      const newAttachment: Attachment = {
        id: crypto.randomUUID(),
        url: URL.createObjectURL(file),
        name: file.name,
        type: file.type.startsWith("image") ? "image" : "pdf",
        uploaded_at: new Date().toISOString(),
      };
      setFormData((prev) => ({ ...prev, attachments: [...prev.attachments, newAttachment] }));
    }
    event.target.value = "";
  };

  const handleCameraCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        trigger("error");
        alert("Arquivo muito grande. O limite máximo é 10MB.");
        event.target.value = "";
        return;
      }
      trigger("vibrate");
      setLocalFiles((prev) => [...prev, file]);
      const newAttachment: Attachment = {
        id: crypto.randomUUID(),
        url: URL.createObjectURL(file),
        name: `foto_${Date.now()}.jpg`,
        type: "image",
        uploaded_at: new Date().toISOString(),
      };
      setFormData((prev) => ({ ...prev, attachments: [...prev.attachments, newAttachment] }));
    }
    event.target.value = "";
  };

  const removeAttachment = (id: string) => {
    const attachmentToRemove = formData.attachments.find((att) => att.id === id);
    if (attachmentToRemove && attachmentToRemove.url.startsWith("blob:")) {
      URL.revokeObjectURL(attachmentToRemove.url);
      setLocalFiles((prev) => prev.filter((file) => file.name !== attachmentToRemove.name));
    }
    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((att) => att.id !== id),
    }));
    trigger("vibrate");
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.person_id) newErrors.person_id = "Selecione o paciente responsável";
      if (!formData.title.trim()) newErrors.title = "O título é obrigatório";
    }

    if (step === 2) {
      fields.forEach((field) => {
        if (field.required && !formData.metadata[field.key]?.trim()) {
          newErrors[field.key] = `${field.label} é obrigatório`;
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    trigger("vibrate");
    if (validateStep(currentStep)) {
      setSlideDirection(1);
      setCurrentStep((prev) => Math.min(prev + 1, 3));
    } else {
      trigger("error");
    }
  };

  const prevStep = () => {
    trigger("vibrate");
    setSlideDirection(-1);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = () => {
    trigger("vibrate");
    if (!validateStep(3) || !user?.id) return;

    if (isSubmitLocked.current || isSubmitting) return;
    isSubmitLocked.current = true;

    run(
      async () => {
        try {
          setUploadProgress(0);
          const cleanMetadata: Record<string, string> = { ...formData.metadata };

          fields.forEach((field) => {
            if (field.type === "date" && cleanMetadata[field.key]) {
              const iso = parseDateToISO(cleanMetadata[field.key]);
              if (iso) cleanMetadata[field.key] = iso;
            }
          });

          customFields.forEach((cf) => {
            if (cf.label.trim()) cleanMetadata[cf.label.trim()] = cf.value.trim();
          });

          let finalAttachments = [...formData.attachments];

          if (localFiles.length > 0) {
            setUploadProgress(10);
            const uploadedAttachments: Attachment[] = [];

            for (let i = 0; i < localFiles.length; i++) {
              const file = localFiles[i];
              const attachment = formData.attachments[i];
              if (!attachment) continue;

              const { url, error } = await uploadFile(user.id, file, "saude");
              if (error) {
                console.error("Erro no upload:", error);
                continue;
              }

              uploadedAttachments.push({ ...attachment, url });
              setUploadProgress(Math.round(((i + 1) / localFiles.length) * 80));
            }

            if (uploadedAttachments.length > 0) {
              finalAttachments = formData.attachments.map((att) => {
                const updated = uploadedAttachments.find((u) => u.id === att.id);
                return updated || att;
              });
              formData.attachments.forEach((att) => {
                if (att.url.startsWith("blob:")) URL.revokeObjectURL(att.url);
              });
              setLocalFiles([]);
            }
          }

          await documentsRepository.create({
            user_id: user.id,
            person_id: formData.person_id || activePersonId || "",
            category_id: "saude",
            type: formData.type,
            title: formData.title.trim(),
            description: formData.description.trim() || undefined,
            metadata: cleanMetadata,
            attachments: finalAttachments,
            is_favorite: false,
          });

          if (cleanMetadata.expiry_date) {
            await scheduleDocumentExpiryNotification(
              crypto.randomUUID(),
              formData.title,
              cleanMetadata.expiry_date,
              "Saúde",
              7
            );
          }

          router.push("/saude/documentos");
        } finally {
          isSubmitLocked.current = false;
        }
      },
      {
        successMessage: "Documento de saúde salvo com sucesso",
        errorMessage: "Erro ao salvar documento clínico",
        goBackOnSuccess: false,
      }
    );
  };

  const SelectedTypeIcon = TYPE_ICONS[formData.type] || FileText;

  return (
    <PageTransition>
      <main className="min-h-[100dvh] bg-void pb-[calc(8rem+env(safe-area-inset-bottom))] overflow-x-hidden">
        <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCameraCapture} />

        <header className="sticky top-0 z-25 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  trigger("vibrate");
                  if (currentStep > 1) prevStep();
                  else router.back();
                }}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
              >
                <ArrowLeft size={18} className="text-ink-primary" />
              </button>
              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-emerald-400">Acervo Clínico</p>
                <h1 className="mt-1 font-display text-lg font-semibold text-ink-primary">
                  {currentStep === 1 && "Identificação Clínica"}
                  {currentStep === 2 && "Dados e Metadados"}
                  {currentStep === 3 && "Anexos e Receita"}
                </h1>
              </div>
            </div>
            <div className="text-xs font-mono font-medium text-ink-muted bg-surface-raised px-3 py-1 rounded-full border border-surface-border/40">
              {currentStep} / 3
            </div>
          </div>
          <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-surface-border/40">
            <motion.div
              className="h-full bg-emerald-400"
              initial={{ width: "33%" }}
              animate={{ width: `${(currentStep / 3) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </header>

        <section className="relative h-full px-5 pt-6">
          <AnimatePresence initial={false} custom={slideDirection} mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step1"
                custom={slideDirection}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="space-y-4"
              >
                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
                  <label className="mb-2 block text-sm font-medium text-ink-primary">
                    Paciente / Perfil <span className="text-coral">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      trigger("vibrate");
                      setIsPersonModalOpen(true);
                    }}
                    className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3.5 text-left text-ink-primary flex items-center justify-between"
                    style={{ borderColor: formData.person_id ? personColor : undefined }}
                  >
                    <span className="font-medium flex items-center gap-2">
                      <User size={16} className="text-emerald-400" />
                      {formData.person_id
                        ? persons.find((p) => p.id === formData.person_id)?.name
                        : "Selecionar paciente..."}
                    </span>
                    <span className="text-xs font-bold text-emerald-400">Alterar</span>
                  </button>
                  {errors.person_id && <p className="mt-1 text-xs text-coral">{errors.person_id}</p>}
                </div>

                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
                  <label className="mb-2 block text-sm font-medium text-ink-primary">
                    Tipo de documento de saúde <span className="text-coral">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      trigger("vibrate");
                      setIsTypeModalOpen(true);
                    }}
                    className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3.5 text-left text-ink-primary transition-colors hover:border-emerald-400/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
                        <SelectedTypeIcon size={18} />
                      </div>
                      <span className="font-semibold">{HEALTH_TYPE_LABELS[formData.type] || "Selecionar tipo..."}</span>
                    </div>
                    <ChevronRight size={16} className="text-ink-muted" />
                  </button>
                </div>

                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
                  <Input
                    label="Título do documento *"
                    placeholder="Ex: Receita Venvanse 30mg, Laudo Neurologia..."
                    value={formData.title}
                    onChange={(e) => handleChange("title", e.target.value)}
                    error={errors.title}
                    required
                  />
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step2"
                custom={slideDirection}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="space-y-4"
              >
                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-400">
                      <Layers3 size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink-primary">Informações Clínicas</p>
                      <p className="text-xs text-ink-muted">Preencha os dados essenciais para rastreio e alertas.</p>
                    </div>
                  </div>

                  {expiryWarning && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-4 flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-300"
                    >
                      <AlertCircle size={20} className="shrink-0 text-amber-400" />
                      <p className="text-xs font-medium leading-relaxed">{expiryWarning}</p>
                    </motion.div>
                  )}

                  <div className="space-y-4">
                    {fields.map((field) => {
                      if (field.type === "date") {
                        return (
                          <div key={field.key} className="space-y-1.5">
                            <label className="block text-sm font-medium text-ink-primary">
                              {field.label} {field.required && <span className="text-coral">*</span>}
                            </label>
                            <div className="relative">
                              <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
                              <input
                                type="text"
                                placeholder="DD/MM/AAAA"
                                maxLength={10}
                                value={formData.metadata[field.key] || ""}
                                onChange={(e) => handleMetadataChange(field.key, handleDateMask(e.target.value))}
                                className={`w-full rounded-2xl border ${
                                  errors[field.key] ? "border-coral/50" : "border-surface-border/50"
                                } bg-surface-raised pl-10 pr-4 py-3.5 text-ink-primary font-mono text-sm outline-none focus:border-emerald-400/50`}
                              />
                            </div>
                            {errors[field.key] && <p className="text-xs text-coral ml-1">{errors[field.key]}</p>}
                          </div>
                        );
                      }

                      return (
                        <Input
                          key={field.key}
                          label={field.label}
                          type="text"
                          value={formData.metadata[field.key] || ""}
                          onChange={(e) => handleMetadataChange(field.key, e.target.value)}
                          placeholder={`Digite ${field.label.toLowerCase()}...`}
                          required={field.required}
                          error={errors[field.key]}
                        />
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-ink-primary">Campos Adicionais</p>
                      <p className="text-xs text-ink-muted">Adicione até 5 campos customizados ({customFields.length}/5)</p>
                    </div>
                    {customFields.length < 5 && (
                      <button
                        type="button"
                        onClick={addCustomField}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-400 transition-transform active:scale-95"
                      >
                        <Plus size={14} /> Novo Campo
                      </button>
                    )}
                  </div>

                  {customFields.map((field) => (
                    <motion.div
                      key={field.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-2 pt-2"
                    >
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Título (ex: Lote)"
                          value={field.label}
                          onChange={(e) => updateCustomField(field.id, "label", e.target.value)}
                          className="w-full rounded-xl border border-surface-border/50 bg-surface-raised px-3.5 py-2.5 text-xs text-ink-primary outline-none focus:border-emerald-400/50 font-medium"
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Valor"
                          value={field.value}
                          onChange={(e) => updateCustomField(field.id, "value", e.target.value)}
                          className="w-full rounded-xl border border-surface-border/50 bg-surface-raised px-3.5 py-2.5 text-xs text-ink-primary outline-none focus:border-emerald-400/50"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCustomField(field.id)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-coral/10 text-coral transition-colors hover:bg-coral/20"
                      >
                        <X size={14} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                key="step3"
                custom={slideDirection}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="space-y-4"
              >
                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-ink-primary">Digitalizar ou Anexar Arquivo</label>
                    <p className="mt-1 text-xs text-ink-muted">Adicione a foto da receita ou laudo em PDF/Imagem.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="secondary"
                      className="flex items-center justify-center gap-2"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isSubmitting}
                    >
                      <Upload size={16} /> Arquivo
                    </Button>
                    <Button
                      variant="secondary"
                      className="flex items-center justify-center gap-2"
                      onClick={() => cameraInputRef.current?.click()}
                      disabled={isSubmitting}
                    >
                      <Camera size={16} /> Câmera
                    </Button>
                  </div>

                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="mt-4">
                      <div className="mb-1 flex items-center justify-between text-xs text-ink-muted">
                        <span>Enviando documento...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-surface-border/40">
                        <motion.div className="h-full bg-emerald-400" animate={{ width: `${uploadProgress}%` }} />
                      </div>
                    </div>
                  )}

                  <AnimatePresence>
                    {formData.attachments.map((attachment) => (
                      <motion.div
                        key={attachment.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="mt-4 flex items-center gap-3 rounded-2xl border border-surface-border/50 bg-surface-raised px-3.5 py-3"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-surface-border/40 bg-surface">
                          {attachment.type === "image" ? <ImageIcon className="text-emerald-400" size={16} /> : <FileText className="text-emerald-400" size={16} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink-primary">{attachment.name}</p>
                        </div>
                        <button type="button" onClick={() => removeAttachment(attachment.id)} className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted hover:text-ink-primary">
                          <X size={14} />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
                  <TextArea
                    label="Observações clínicas / Posologia (Opcional)"
                    placeholder="Ex: Tomar 1 comprimido pela manhã após o café..."
                    value={formData.description}
                    onChange={(e) => handleChange("description", e.target.value)}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <BottomSheet isOpen={isTypeModalOpen} onClose={() => setIsTypeModalOpen(false)} title="Selecionar tipo de documento clínico">
          <p className="mb-4 px-1 text-sm text-ink-muted">Escolha a categoria do registro médico</p>
          <div className="grid grid-cols-2 gap-3 px-1 pb-4">
            {HEALTH_TYPES.map((type) => {
              const Icon = TYPE_ICONS[type] || FileText;
              const isActive = formData.type === type;

              return (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  key={type}
                  onClick={() => {
                    trigger("vibrate");
                    handleChange("type", type);
                    setIsTypeModalOpen(false);
                  }}
                  className={`relative flex flex-col items-start rounded-[22px] border p-4 text-left transition-all ${
                    isActive ? "border-emerald-400 bg-emerald-400/10" : "border-surface-border/50 bg-surface hover:bg-surface-raised"
                  }`}
                >
                  <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full ${isActive ? "bg-emerald-400/20 text-emerald-400" : "bg-surface-raised text-ink-muted"}`}>
                    <Icon size={20} />
                  </div>
                  <span className={`text-sm font-semibold ${isActive ? "text-emerald-400" : "text-ink-primary"}`}>
                    {HEALTH_TYPE_LABELS[type]}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </BottomSheet>

        <SelectionModal
          isOpen={isPersonModalOpen}
          onClose={() => setIsPersonModalOpen(false)}
          onSelect={(item: Person) => {
            if (item.id) {
              handleChange("person_id", item.id);
              setIsPersonModalOpen(false);
            }
          }}
          items={persons}
          title="Selecionar Paciente"
          placeholder="Buscar pessoa..."
          renderItem={(item: Person) => <p className="font-medium text-ink-primary">{item.name}</p>}
          getItemId={(item: Person) => item.id!}
          getItemLabel={(item: Person) => item.name}
          onCreateNew={() => {
            setIsPersonModalOpen(false);
            setIsCreatingPerson(true);
          }}
          createNewLabel="Cadastrar Novo Paciente"
        />

        <BottomSheet isOpen={isCreatingPerson} onClose={() => { setIsCreatingPerson(false); setNewPersonName(""); }} title="Cadastrar novo paciente">
          <div className="space-y-4 px-1 pb-2">
            <Input label="Nome completo" placeholder="Ex: Maria Silva..." value={newPersonName} onChange={(e) => setNewPersonName(e.target.value)} autoFocus />
            <Button
              variant="primary"
              fullWidth
              onClick={handleCreatePerson}
              disabled={isSavingPerson || !newPersonName.trim()}
              className="flex items-center justify-center gap-2"
            >
              {isSavingPerson ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Salvar e selecionar
            </Button>
          </div>
        </BottomSheet>

        <div className="fixed inset-x-0 bottom-0 z-30 flex gap-3 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          {currentStep > 1 && (
            <Button variant="secondary" size="lg" onClick={prevStep} disabled={isSubmitting} className="flex w-1/3 items-center justify-center">
              <ChevronLeft size={20} />
            </Button>
          )}

          {currentStep < 3 ? (
            <Button variant="primary" size="lg" onClick={nextStep} disabled={isSubmitting} className={`${currentStep === 1 ? "w-full" : "w-2/3"} flex items-center justify-center gap-2 shadow-lg shadow-emerald-400/10`}>
              Próximo <ChevronRight size={18} />
            </Button>
          ) : (
            <Button variant="primary" size="lg" onClick={handleSubmit} disabled={isSubmitting} className="w-2/3 flex items-center justify-center gap-2 shadow-lg shadow-emerald-400/10">
              {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Salvando...</> : <><Save size={16} /> Finalizar Documento</>}
            </Button>
          )}
        </div>
      </main>
    </PageTransition>
  );
}
