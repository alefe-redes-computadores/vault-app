// app/novo/page.tsx
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
  Shield,
  FileText,
  Image as ImageIcon,
  ChevronRight,
  Plus,
  ChevronLeft,
  Contact,
  CreditCard,
  Scroll,
  Landmark,
  Award,
  Pill,
  Heart,
  FileOutput,
  Stethoscope,
  Activity as ActivityIcon,
  Folder,
} from "lucide-react";

import { usePersons } from "@/hooks/usePersons";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { useSafeDb } from "@/hooks/useSafeDb";
import { useAuth } from "@/hooks/useAuth";
import { useHapticFeedback } from "@/lib/haptics";
import { uploadFile } from "@/lib/supabase/storage";
import {
  CATEGORIES,
  TYPE_CATEGORY_MAP,
  type CategoryId,
  type DocumentType,
  type Document,
  type Attachment,
  type Person,
  type Vault,
  DOCUMENT_FIELDS,
} from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { PageTransition } from "@/components/PageTransition";
import { scheduleDocumentExpiryNotification } from "@/lib/notifications";
import { db, safeAddPerson } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { SelectionModal } from "@/components/SelectionModal";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useMedicos } from "@/hooks/useMedicos";
import { useFarmacias } from "@/hooks/useFarmacias";
import { useHospitais } from "@/hooks/useHospitais";
import { useSubmitAction } from "@/hooks/useSubmitAction";

const DEFAULT_PERSON_COLOR = "#7C9CB5";

const TYPE_ICONS: Record<DocumentType, LucideIcon> = {
  rg: Contact,
  cpf: FileText,
  cnh: CreditCard,
  certidao_nascimento: Scroll,
  titulo_eleitor: Landmark,
  certificado: Award,
  receita: Pill,
  prontuario: Heart,
  laudo: FileText,
  encaminhamento: FileOutput,
  consulta: Stethoscope,
  cirurgia: ActivityIcon,
  exame_sangue: ActivityIcon,
  exame_imagem: ActivityIcon,
  credencial: Contact,
  outro: Folder,
};

const TYPE_DESCRIPTIONS: Record<DocumentType, string> = {
  rg: "Registro Geral ou C.I.N",
  cpf: "Cadastro de Pessoa Física",
  cnh: "Carteira de Habilitação",
  certidao_nascimento: "Nascimento ou Casamento",
  titulo_eleitor: "Justiça Eleitoral",
  certificado: "Certificados e diplomas",
  receita: "Receitas médicas",
  prontuario: "Prontuários médicos",
  laudo: "Laudos e exames",
  encaminhamento: "Encaminhamentos médicos",
  consulta: "Consultas médicas",
  cirurgia: "Cirurgias e procedimentos",
  exame_sangue: "Exames laboratoriais",
  exame_imagem: "Ressonâncias, Raio-X, etc",
  credencial: "Carteirinhas e credenciais",
  outro: "Outros documentos",
};

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  rg: "C.I.N / Identidade",
  cpf: "CPF",
  cnh: "CNH",
  certidao_nascimento: "Certidão de Nascimento",
  titulo_eleitor: "Título de Eleitor",
  certificado: "Certificado",
  receita: "Receita médica",
  prontuario: "Prontuário",
  laudo: "Laudo",
  encaminhamento: "Encaminhamento",
  consulta: "Consulta",
  cirurgia: "Cirurgia",
  exame_sangue: "Exame de Sangue",
  exame_imagem: "Exame de Imagem (Raio-X, RM)",
  credencial: "Credencial / Carteirinha",
  outro: "Outro",
};

const applyMask = (value: string, type: string): string => {
  const digits = value.replace(/\D/g, "");

  if (type === "cpf") {
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})/, "$1-$2")
      .slice(0, 14);
  }

  if (type === "rg") {
    return digits
      .replace(/(\d{2})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})/, "$1-$2")
      .slice(0, 13);
  }

  if (type === "cnh") {
    return digits.slice(0, 11);
  }

  if (type === "date") {
    return digits
      .replace(/(\d{2})(\d)/, "$1/$2")
      .replace(/(\d{2})(\d)/, "$1/$2")
      .slice(0, 10);
  }

  return value;
};

const getMaskType = (
  fieldKey: string,
  fieldType: string,
): string | null => {
  if (fieldKey === "cpf") return "cpf";
  if (fieldKey === "rg_number" || fieldKey === "number") return "rg";
  if (fieldType === "date") return "date";

  return null;
};

type FormData = {
  person_id: string;
  category_id: CategoryId;
  type: DocumentType;
  title: string;
  description: string;
  metadata: Record<string, string>;
  attachments: Attachment[];
  vault_id?: string;
};

type NamedEntity = {
  id?: string;
  nome: string;
};

type SelectionConfig = {
  items: NamedEntity[];
  title: string;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onCreateNew?: () => void;
  createNewLabel?: string;
};

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 50 : -50,
    opacity: 0,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 50 : -50,
    opacity: 0,
  }),
};

export default function NewDocumentPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPersonId = searchParams.get("person_id");

  const { user } = useAuth();
  const { addDocument } = useSafeDb();
  const persons = usePersons();
  const { activePersonId } = useActivePersonId();
  const { medicos } = useMedicos();
  const { farmacias } = useFarmacias();
  const { hospitais } = useHospitais();
  const { run, isSubmitting } = useSubmitAction();

  const laboratorios = useLiveQuery(
    () =>
      db.locais
        .where("user_id")
        .equals(user?.id || "")
        .and((local) => local.tipo === "laboratorio")
        .toArray(),
    [user?.id],
    []
  ) || [];

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [slideDirection, setSlideDirection] = useState(0);

  const [formData, setFormData] = useState<FormData>({
    person_id: initialPersonId || "",
    category_id: "pessoal",
    type: "rg",
    title: "",
    description: "",
    metadata: {},
    attachments: [],
    vault_id: undefined,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [localFiles, setLocalFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [isPharmacyModalOpen, setIsPharmacyModalOpen] = useState(false);
  const [isHospitalModalOpen, setIsHospitalModalOpen] = useState(false);
  const [isLaboratoryModalOpen, setIsLaboratoryModalOpen] = useState(false);
  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);

  const [isCreatingParent, setIsCreatingParent] = useState<{
    type: "pessoa" | null;
  }>({ type: null });

  const [newParentName, setNewParentName] = useState("");
  const [isSavingParent, setIsSavingParent] = useState(false);

  const userVaults =
    useLiveQuery(
      () =>
        db.vaults
          .where("user_id")
          .equals(user?.id || "")
          .toArray(),
      [user?.id],
      [],
    ) || [];

  const selectedPerson = persons.find((p) => p.id === formData.person_id);
  const personColor = selectedPerson?.color || DEFAULT_PERSON_COLOR;

  useEffect(() => {
    if (persons.length > 0 && !formData.person_id && !initialPersonId) {
      const defaultPerson = persons.find((p) => p.id === activePersonId);
      setFormData((prev) => ({
        ...prev,
        person_id: defaultPerson?.id || persons[0].id!,
      }));
    }
  }, [persons, formData.person_id, initialPersonId, activePersonId]);

  useEffect(() => {
    const fields = DOCUMENT_FIELDS[formData.type] || [];
    const newMetadata: Record<string, string> = {};

    fields.forEach((field) => {
      newMetadata[field.key] =
        field.type === "select" && field.options?.[0]
          ? field.options[0]
          : "";
    });

    setFormData((prev) => ({
      ...prev,
      metadata: newMetadata,
    }));
  }, [formData.type]);

  const availableTypes = useMemo(() => {
    return (Object.keys(TYPE_CATEGORY_MAP) as DocumentType[]).filter((type) =>
      TYPE_CATEGORY_MAP[type].includes(formData.category_id),
    );
  }, [formData.category_id]);

  const fields = DOCUMENT_FIELDS[formData.type] || [];

  const handleChange = <K extends keyof FormData>(
    field: K,
    value: FormData[K],
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const handleMetadataChange = (key: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        [key]: value,
      },
    }));

    if (errors[key]) {
      setErrors((prev) => ({
        ...prev,
        [key]: "",
      }));
    }
  };

  const handleCreateParent = async () => {
    if (!newParentName.trim() || !user?.id) return;

    setIsSavingParent(true);
    trigger("vibrate");

    try {
      const id = await safeAddPerson({
        user_id: user.id,
        name: newParentName.trim(),
        color: DEFAULT_PERSON_COLOR,
      });

      handleChange("person_id", id);
      trigger("success");
      setIsCreatingParent({ type: null });
      setNewParentName("");
    } catch (error) {
      console.error("Erro ao criar cadastro rápido:", error);
      trigger("error");
    } finally {
      setIsSavingParent(false);
    }
  };

  const handleFileSelect = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (file) {
      // Sugestão: validar tamanho máximo de 10MB
      if (file.size > 10 * 1024 * 1024) {
        trigger("error");
        alert("Arquivo muito grande. Máximo 10MB.");
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

      setFormData((prev) => ({
        ...prev,
        attachments: [...prev.attachments, newAttachment],
      }));
    }

    event.target.value = "";
  };

  const handleCameraCapture = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        trigger("error");
        alert("Arquivo muito grande. Máximo 10MB.");
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

      setFormData((prev) => ({
        ...prev,
        attachments: [...prev.attachments, newAttachment],
      }));
    }

    event.target.value = "";
  };

  const removeAttachment = (id: string) => {
    const attachmentToRemove = formData.attachments.find(
      (attachment) => attachment.id === id,
    );

    if (
      attachmentToRemove &&
      attachmentToRemove.url.startsWith("blob:")
    ) {
      URL.revokeObjectURL(attachmentToRemove.url);

      const fileIndex = localFiles.findIndex(
        (file) => file.name === attachmentToRemove.name,
      );

      if (fileIndex !== -1) {
        setLocalFiles((prev) =>
          prev.filter((_, index) => index !== fileIndex),
        );
      }
    }

    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments.filter(
        (attachment) => attachment.id !== id,
      ),
    }));

    trigger("vibrate");
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.person_id) {
        newErrors.person_id = "Selecione uma pessoa";
      }

      if (!formData.title.trim()) {
        newErrors.title = "Título é obrigatório";
      }
    }

    if (step === 2) {
      fields.forEach((field) => {
        if (
          formData.type === "rg" &&
          field.key === "rg_number"
        ) {
          const isOldRG =
            formData.metadata.modelo === "RG (Antigo)";

          if (
            isOldRG &&
            !formData.metadata[field.key]?.trim()
          ) {
            newErrors[field.key] =
              "O número do RG é obrigatório no modelo antigo";
          }

          return;
        }

        if (
          field.required &&
          !formData.metadata[field.key]?.trim()
        ) {
          newErrors[field.key] =
            `${field.label} é obrigatório`;
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

    if (!validateStep(3)) return;
    if (!user?.id) {
      trigger("error");
      return;
    }

    run(
      async () => {
        setUploadProgress(0);

        const cleanMetadata: Record<string, string> = {
          ...formData.metadata,
        };

        fields.forEach((field) => {
          if (
            field.type === "date" &&
            cleanMetadata[field.key]
          ) {
            const parts = cleanMetadata[field.key].split("/");

            if (parts.length === 3) {
              cleanMetadata[field.key] =
                `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
          }
        });

        const docData: Omit<
          Document,
          "id" | "created_at" | "updated_at" | "synced"
        > = {
          user_id: user.id,
          person_id: formData.person_id,
          category_id: formData.category_id,
          type: formData.type,
          title: formData.title.trim(),
          description:
            formData.description.trim() || undefined,
          metadata: cleanMetadata,
          attachments: formData.attachments,
          is_favorite: false,
          vault_id: formData.vault_id || undefined,
        };

        const docId = await addDocument(docData);

        if (localFiles.length > 0) {
          const folder = formData.category_id;
          const uploadedAttachments: Attachment[] = [];

          for (
            let index = 0;
            index < localFiles.length;
            index++
          ) {
            const file = localFiles[index];
            const attachment = formData.attachments[index];

            if (!attachment) continue;

            const { url, error } = await uploadFile(
              user.id,
              file,
              folder,
            );

            if (error) {
              console.error("Erro no upload:", error);
              continue;
            }

            uploadedAttachments.push({
              ...attachment,
              url,
            });

            setUploadProgress(
              Math.round(
                ((index + 1) / localFiles.length) * 100,
              ),
            );
          }

          if (uploadedAttachments.length > 0) {
            const finalAttachments =
              formData.attachments.map((attachment) => {
                const updated = uploadedAttachments.find(
                  (uploaded) =>
                    uploaded.id === attachment.id,
                );

                return updated || attachment;
              });

            await db.documents.update(docId, {
              attachments: finalAttachments,
              updated_at: new Date().toISOString(),
              synced: false,
            });

            formData.attachments.forEach((attachment) => {
              if (attachment.url.startsWith("blob:")) {
                URL.revokeObjectURL(attachment.url);
              }
            });

            setLocalFiles([]);
          }
        }

        if (cleanMetadata.expiry_date) {
          await scheduleDocumentExpiryNotification(
            docId,
            formData.title,
            cleanMetadata.expiry_date,
            CATEGORIES[formData.category_id].name,
            30,
          );
        }

        // Navegar após sucesso
        router.push("/");
      },
      {
        successMessage: "Documento salvo com sucesso",
        errorMessage: "Erro ao salvar documento",
        goBackOnSuccess: false, // usamos router.push dentro
      }
    );
  };

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))] overflow-x-hidden">
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
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  trigger("vibrate");

                  if (currentStep > 1) {
                    prevStep();
                  } else {
                    router.back();
                  }
                }}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
              >
                <ArrowLeft
                  size={18}
                  className="text-ink-primary"
                />
              </button>

              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">
                  Novo Documento
                </p>

                <h1 className="mt-1 font-display text-lg font-semibold text-ink-primary">
                  {currentStep === 1 && "Identificação"}
                  {currentStep === 2 &&
                    "Campos Específicos"}
                  {currentStep === 3 && "Anexos e Extras"}
                </h1>
              </div>
            </div>

            <div className="text-xs font-mono font-medium text-ink-muted">
              {currentStep} / 3
            </div>
          </div>

          <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-surface-border/40">
            <motion.div
              className="h-full bg-ice"
              initial={{ width: "33%" }}
              animate={{
                width: `${(currentStep / 3) * 100}%`,
              }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </header>

        <section className="relative h-full px-5 pt-6">
          <AnimatePresence
            initial={false}
            custom={slideDirection}
            mode="wait"
          >
            {currentStep === 1 && (
              <motion.div
                key="step1"
                custom={slideDirection}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  duration: 0.3,
                  ease: "easeInOut",
                }}
                className="space-y-4"
              >
                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
                  <label className="mb-2 block text-sm font-medium text-ink-primary">
                    Pessoa{" "}
                    <span className="text-coral">*</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      trigger("vibrate");
                      setIsPersonModalOpen(true);
                    }}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${
                      errors.person_id
                        ? "border-coral/50 bg-surface-raised"
                        : "border-surface-border/50 bg-surface-raised text-ink-primary"
                    }`}
                    style={{
                      borderColor: formData.person_id
                        ? personColor
                        : undefined,
                    }}
                  >
                    {formData.person_id
                      ? persons.find(
                          (person) =>
                            person.id ===
                            formData.person_id,
                        )?.name
                      : "Selecionar pessoa..."}
                  </button>

                  {errors.person_id && (
                    <p className="mt-1 text-xs text-coral">
                      {errors.person_id}
                    </p>
                  )}
                </div>

                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
                  <p className="mb-3 text-sm font-medium text-ink-primary">
                    Categoria{" "}
                    <span className="text-coral">*</span>
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {Object.values(CATEGORIES).map(
                      (category) => {
                        const active =
                          formData.category_id ===
                          category.id;

                        return (
                          <button
                            type="button"
                            key={category.id}
                            onClick={() => {
                              trigger("vibrate");

                              handleChange(
                                "category_id",
                                category.id,
                              );

                              if (
                                !TYPE_CATEGORY_MAP[
                                  formData.type
                                ].includes(category.id)
                              ) {
                                const firstValidType = (
                                  Object.keys(
                                    TYPE_CATEGORY_MAP,
                                  ) as DocumentType[]
                                ).find((type) =>
                                  TYPE_CATEGORY_MAP[
                                    type
                                  ].includes(category.id),
                                );

                                if (firstValidType) {
                                  handleChange(
                                    "type",
                                    firstValidType,
                                  );
                                }
                              }
                            }}
                            className={`rounded-full border px-4 py-2.5 text-sm font-medium transition-all active:scale-95 ${
                              active
                                ? "border-ice bg-ice/12 text-ice"
                                : "border-surface-border/50 bg-surface-raised text-ink-muted"
                            }`}
                          >
                            {category.name}
                          </button>
                        );
                      },
                    )}
                  </div>
                </div>

                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
                  <label className="mb-2 block text-sm font-medium text-ink-primary">
                    Tipo de documento{" "}
                    <span className="text-coral">*</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      trigger("vibrate");
                      setIsTypeModalOpen(true);
                    }}
                    className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary"
                  >
                    <span>
                      {DOCUMENT_TYPE_LABELS[
                        formData.type
                      ] || "Selecionar tipo..."}
                    </span>

                    <ChevronRight
                      size={16}
                      className="text-ink-muted"
                    />
                  </button>
                </div>

                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
                  <Input
                    label="Título do documento"
                    placeholder="Ex: Minha CNH, Nova Identidade..."
                    value={formData.title}
                    onChange={(event) =>
                      handleChange(
                        "title",
                        event.target.value,
                      )
                    }
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
                transition={{
                  duration: 0.3,
                  ease: "easeInOut",
                }}
                className="space-y-4"
              >
                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ice/10">
                      <FileText
                        size={18}
                        className="text-ice"
                      />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-ink-primary">
                        Dados do Documento
                      </p>

                      <p className="text-xs text-ink-muted">
                        Preencha de acordo com o papel
                        original.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {fields.map((field) => {
                      if (
                        formData.type === "rg" &&
                        field.key === "rg_number" &&
                        formData.metadata.modelo ===
                          "C.I.N (Nova Identidade)"
                      ) {
                        return null;
                      }

                      const selection =
                        // @ts-ignore
                        selectionConfig[field.key];

                      if (
                        field.type === "select" &&
                        selection
                      ) {
                        const selectedItem =
                          selection.items.find(
                            (item: any) =>
                              String(item.id) ===
                              formData.metadata[
                                field.key
                              ],
                          );

                        return (
                          <div key={field.key}>
                            <label className="mb-1.5 block text-sm font-medium text-ink-primary">
                              {field.label}
                            </label>

                            <button
                              type="button"
                              onClick={() => {
                                trigger("vibrate");
                                selection.setIsOpen(true);
                              }}
                              className={`w-full rounded-2xl border px-4 py-3 text-left text-ink-primary ${
                                errors[field.key]
                                  ? "border-coral/50 bg-surface-raised"
                                  : "border-surface-border/50 bg-surface-raised"
                              }`}
                            >
                              {selectedItem
                                ? selectedItem.nome
                                : `Selecionar ${field.label.toLowerCase()}`}
                            </button>

                            {errors[field.key] && (
                              <p className="mt-1 text-xs text-coral">
                                {errors[field.key]}
                              </p>
                            )}

                            <SelectionModal
                              isOpen={selection.isOpen}
                              onClose={() =>
                                selection.setIsOpen(
                                  false,
                                )
                              }
                              onSelect={(
                                item: NamedEntity,
                              ) => {
                                if (!item.id) return;

                                handleMetadataChange(
                                  field.key,
                                  item.id,
                                );
                                selection.setIsOpen(
                                  false,
                                );
                              }}
                              items={selection.items}
                              title={selection.title}
                              placeholder="Buscar..."
                              renderItem={(
                                item: NamedEntity,
                              ) => (
                                <div>
                                  <p className="font-medium text-ink-primary">
                                    {item.nome}
                                  </p>
                                </div>
                              )}
                              getItemId={(
                                item: NamedEntity,
                              ) => item.id!}
                              getItemLabel={(
                                item: NamedEntity,
                              ) => item.nome}
                              onCreateNew={
                                selection.onCreateNew
                              }
                              createNewLabel={
                                selection.createNewLabel
                              }
                            />
                          </div>
                        );
                      }

                      if (
                        field.type === "select" &&
                        field.options
                      ) {
                        return (
                          <div key={field.key}>
                            <label className="mb-1.5 block text-sm font-medium text-ink-primary">
                              {field.label}
                            </label>

                            <div className="flex flex-wrap gap-2">
                              {field.options.map(
                                (option) => (
                                  <button
                                    type="button"
                                    key={option}
                                    onClick={() =>
                                      handleMetadataChange(
                                        field.key,
                                        option,
                                      )
                                    }
                                    className={`rounded-full border px-3.5 py-2 text-xs font-medium transition-all ${
                                      formData.metadata[
                                        field.key
                                      ] === option
                                        ? "border-ice bg-ice/12 text-ice"
                                        : "border-surface-border/50 bg-surface-raised text-ink-muted"
                                    }`}
                                  >
                                    {option}
                                  </button>
                                ),
                              )}
                            </div>

                            {errors[field.key] && (
                              <p className="mt-1 text-xs text-coral">
                                {errors[field.key]}
                              </p>
                            )}
                          </div>
                        );
                      }

                      const maskType = getMaskType(
                        field.key,
                        field.type,
                      );

                      const rawValue =
                        formData.metadata[field.key] || "";

                      const displayedValue = maskType
                        ? applyMask(rawValue, maskType)
                        : rawValue;

                      return (
                        <Input
                          key={field.key}
                          data-field={field.key}
                          label={field.label}
                          type="text"
                          value={displayedValue}
                          onChange={(event) => {
                            const raw = maskType
                              ? event.target.value.replace(
                                  /\D/g,
                                  "",
                                )
                              : event.target.value;

                            handleMetadataChange(
                              field.key,
                              raw,
                            );
                          }}
                          placeholder={
                            field.type === "date"
                              ? "DD/MM/AAAA"
                              : `Digite ${field.label.toLowerCase()}...`
                          }
                          required={field.required}
                          error={errors[field.key]}
                        />
                      );
                    })}
                  </div>
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
                transition={{
                  duration: 0.3,
                  ease: "easeInOut",
                }}
                className="space-y-4"
              >
                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-ink-primary">
                      Anexos Físicos
                    </label>

                    <p className="mt-1 text-xs text-ink-muted">
                      Digitalize o documento pela câmera
                      ou envie o PDF.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="secondary"
                      className="flex items-center justify-center gap-2"
                      onClick={() =>
                        fileInputRef.current?.click()
                      }
                      disabled={isSubmitting}
                    >
                      <Upload size={16} />
                      Arquivo
                    </Button>

                    <Button
                      variant="secondary"
                      className="flex items-center justify-center gap-2"
                      onClick={() =>
                        cameraInputRef.current?.click()
                      }
                      disabled={isSubmitting}
                    >
                      <Camera size={16} />
                      Câmera
                    </Button>
                  </div>

                  {uploadProgress > 0 &&
                    uploadProgress < 100 && (
                      <div className="mt-4">
                        <div className="mb-1 flex items-center justify-between text-xs text-ink-muted">
                          <span>Enviando anexos...</span>
                          <span>
                            {uploadProgress}%
                          </span>
                        </div>

                        <div className="h-1.5 overflow-hidden rounded-full bg-surface-border/40">
                          <motion.div
                            className="h-full bg-ice"
                            initial={{ width: 0 }}
                            animate={{
                              width: `${uploadProgress}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                  <AnimatePresence>
                    {formData.attachments.map(
                      (attachment) => (
                        <motion.div
                          key={attachment.id}
                          initial={{
                            opacity: 0,
                            y: 8,
                          }}
                          animate={{
                            opacity: 1,
                            y: 0,
                          }}
                          exit={{
                            opacity: 0,
                            y: 8,
                          }}
                          className="mt-4 flex items-center gap-3 rounded-2xl border border-surface-border/50 bg-surface-raised px-3 py-3"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-surface-border/40 bg-surface">
                            {attachment.type ===
                            "image" ? (
                              <ImageIcon
                                size={16}
                                className="text-ice"
                              />
                            ) : (
                              <FileText
                                size={16}
                                className="text-ice"
                              />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-ink-primary">
                              {attachment.name}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              removeAttachment(
                                attachment.id,
                              )
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted hover:text-ink-primary"
                          >
                            <X size={14} />
                          </button>
                        </motion.div>
                      ),
                    )}
                  </AnimatePresence>
                </div>

                {userVaults.length > 0 && (
                  <div className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
                    <label className="mb-3 block text-sm font-medium text-ink-primary">
                      Compartilhar com cofre
                      (Opcional)
                    </label>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          trigger("vibrate");
                          handleChange(
                            "vault_id",
                            undefined,
                          );
                        }}
                        className={`rounded-full border px-3 py-2 text-xs font-medium transition-all active:scale-95 ${
                          formData.vault_id === undefined
                            ? "border-ice bg-ice/12 text-ice"
                            : "border-surface-border/50 bg-surface-raised text-ink-muted"
                        }`}
                      >
                        Nenhum
                      </button>

                      {userVaults.map(
                        (vault: Vault) => (
                          <button
                            type="button"
                            key={vault.id}
                            onClick={() => {
                              trigger("vibrate");

                              if (vault.id) {
                                handleChange(
                                  "vault_id",
                                  vault.id,
                                );
                              }
                            }}
                            className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-all active:scale-95 ${
                              formData.vault_id ===
                              vault.id
                                ? "border-ice bg-ice/12 text-ice"
                                : "border-surface-border/50 bg-surface-raised text-ink-muted"
                            }`}
                          >
                            <Shield size={12} />
                            {vault.name}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                )}

                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
                  <TextArea
                    label="Notas extras (Opcional)"
                    placeholder="Ex: Cópia autenticada guardada na gaveta 2..."
                    value={formData.description}
                    onChange={(event) =>
                      handleChange(
                        "description",
                        event.target.value,
                      )
                    }
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <BottomSheet
          isOpen={isTypeModalOpen}
          onClose={() => setIsTypeModalOpen(false)}
          title="Selecionar tipo"
        >
          <p className="mb-4 px-1 text-sm text-ink-muted">
            Escolha o tipo para carregar os campos
            corretos do formulário
          </p>

          <div className="grid grid-cols-2 gap-3 px-1 pb-4">
            {availableTypes.map((type) => {
              const Icon = TYPE_ICONS[type];
              const isActive =
                formData.type === type;

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
                    isActive
                      ? "border-ice bg-ice/10"
                      : "border-surface-border/50 bg-surface hover:bg-surface-raised"
                  }`}
                >
                  <div
                    className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full ${
                      isActive
                        ? "bg-ice/20 text-ice"
                        : "bg-surface-raised text-ink-muted"
                    }`}
                  >
                    <Icon size={20} />
                  </div>

                  <span
                    className={`mb-1 text-sm font-semibold ${
                      isActive
                        ? "text-ice"
                        : "text-ink-primary"
                    }`}
                  >
                    {DOCUMENT_TYPE_LABELS[type]}
                  </span>

                  <span className="text-xs leading-tight text-ink-muted">
                    {TYPE_DESCRIPTIONS[type]}
                  </span>

                  {isActive && (
                    <motion.div
                      layoutId="activeTypeBorder"
                      className="absolute inset-0 rounded-[22px] border-2 border-ice shadow-[0_0_15px_rgba(125,211,252,0.15)]"
                      initial={false}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 20,
                      }}
                    />
                  )}
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
          title="Selecionar Pessoa"
          placeholder="Buscar perfil..."
          renderItem={(item: Person) => (
            <p className="font-medium text-ink-primary">
              {item.name}
            </p>
          )}
          getItemId={(item: Person) => item.id!}
          getItemLabel={(item: Person) => item.name}
          onCreateNew={() => {
            setIsPersonModalOpen(false);
            setIsCreatingParent({
              type: "pessoa",
            });
          }}
          createNewLabel="Cadastrar Nova Pessoa"
        />

        <BottomSheet
          isOpen={isCreatingParent.type !== null}
          onClose={() => {
            setIsCreatingParent({ type: null });
            setNewParentName("");
          }}
          title="Cadastrar pessoa"
        >
          <div className="space-y-4 px-1 pb-2">
            <Input
              label="Nome"
              placeholder="Digite o nome..."
              value={newParentName}
              onChange={(event) =>
                setNewParentName(
                  event.target.value,
                )
              }
              autoFocus
            />

            <Button
              variant="primary"
              fullWidth
              onClick={handleCreateParent}
              disabled={
                isSavingParent ||
                !newParentName.trim()
              }
              className="flex items-center justify-center gap-2"
            >
              {isSavingParent ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <Plus size={16} />
              )}
              Salvar e selecionar
            </Button>
          </div>
        </BottomSheet>

        <div className="fixed inset-x-0 bottom-0 z-30 flex gap-3 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          {currentStep > 1 && (
            <Button
              variant="secondary"
              size="lg"
              onClick={prevStep}
              disabled={isSubmitting}
              className="flex w-1/3 items-center justify-center"
            >
              <ChevronLeft size={20} />
            </Button>
          )}

          {currentStep < 3 ? (
            <Button
              variant="primary"
              size="lg"
              onClick={nextStep}
              disabled={isSubmitting}
              className={`${
                currentStep === 1
                  ? "w-full"
                  : "w-2/3"
              } flex items-center justify-center gap-2 shadow-lg shadow-ice/10`}
            >
              Próximo
              <ChevronRight size={18} />
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-2/3 flex items-center justify-center gap-2 shadow-lg shadow-ice/10"
            >
              {isSubmitting ? (
                <>
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                  Salvando...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Finalizar
                </>
              )}
            </Button>
          )}
        </div>
      </main>
    </PageTransition>
  );
}