"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
} from "lucide-react";
import { usePersons } from "@/hooks/usePersons";
import { useSafeDb } from "@/hooks/useSafeDb";
import { useAuth } from "@/hooks/useAuth";
import { useHapticFeedback } from "@/lib/haptics";
import { uploadFile } from "@/lib/supabase/storage";
import {
  CATEGORIES,
  type CategoryId,
  type DocumentType,
  type Document,
  type Attachment,
  DOCUMENT_FIELDS,
} from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { PageTransition } from "@/components/PageTransition";
import { DocumentTypeSelector } from "@/components/DocumentTypeSelector";
import { scheduleDocumentExpiryNotification } from "@/lib/notifications";
import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { SelectionModal } from "@/components/SelectionModal";
import { useMedicos } from "@/hooks/useMedicos";
import { useFarmacias } from "@/hooks/useFarmacias";
import { useHospitais } from "@/hooks/useHospitais";

const applyMask = (value: string, type: string): string => {
  const digits = value.replace(/D/g, "");

  if (type === "cpf") {
    return digits
      .replace(/(d{3})(d)/, "$1.$2")
      .replace(/(d{3})(d)/, "$1.$2")
      .replace(/(d{3})(d{1,2})/, "$1-$2")
      .slice(0, 14);
  }

  if (type === "rg") {
    return digits
      .replace(/(d{2})(d)/, "$1.$2")
      .replace(/(d{3})(d)/, "$1.$2")
      .replace(/(d{3})(d{1,2})/, "$1-$2")
      .slice(0, 13);
  }

  if (type === "cnh") {
    return digits.slice(0, 11);
  }

  return value;
};

const getMaskType = (fieldKey: string, docType: DocumentType): string | null => {
  if (docType === "cpf" && fieldKey === "number") return "cpf";
  if (docType === "rg" && fieldKey === "number") return "rg";
  if (docType === "cnh" && fieldKey === "number") return "cnh";
  return null;
};

type FormData = {
  person_id: string;
  category_id: CategoryId;
  type: DocumentType;
  title: string;
  description: string;
  metadata: Record<string, any>;
  attachments: Attachment[];
  vault_id?: string;
};

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  rg: "RG",
  cpf: "CPF",
  cnh: "CNH",
  certificado: "Certificado",
  receita: "Receita médica",
  prontuario: "Prontuário",
  laudo: "Laudo",
  encaminhamento: "Encaminhamento",
  outro: "Outro",
};

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function NewDocumentPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { user } = useAuth();
  const { addDocument } = useSafeDb();
  const persons = usePersons();
  const { medicos } = useMedicos();
  const { farmacias } = useFarmacias();
  const { hospitais } = useHospitais();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<FormData>({
    person_id: persons[0]?.id || "",
    category_id: "pessoal",
    type: "rg",
    title: "",
    description: "",
    metadata: {},
    attachments: [],
    vault_id: undefined,
  });

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);

  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [isPharmacyModalOpen, setIsPharmacyModalOpen] = useState(false);
  const [isHospitalModalOpen, setIsHospitalModalOpen] = useState(false);

  const [localFiles, setLocalFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const userVaults = useLiveQuery(
    () => db.vaults.where("user_id").equals(user?.id || "").toArray(),
    [user?.id],
    []
  );

  useEffect(() => {
    const fields = DOCUMENT_FIELDS[formData.type] || [];
    const newMetadata: Record<string, any> = {};
    fields.forEach((field) => {
      newMetadata[field.key] = "";
    });
    setFormData((prev) => ({ ...prev, metadata: newMetadata }));
  }, [formData.type]);

  const handleChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleMetadataChange = (key: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      metadata: { ...prev.metadata, [key]: value },
    }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: "" }));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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
    e.target.value = "";
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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
    e.target.value = "";
  };

  const removeAttachment = (id: string) => {
    const attachmentToRemove = formData.attachments.find((a) => a.id === id);
    if (attachmentToRemove && attachmentToRemove.url.startsWith("blob:")) {
      URL.revokeObjectURL(attachmentToRemove.url);
      const fileIndex = localFiles.findIndex((f) => f.name === attachmentToRemove.name);
      if (fileIndex !== -1) {
        const newFiles = [...localFiles];
        newFiles.splice(fileIndex, 1);
        setLocalFiles(newFiles);
      }
    }

    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((a) => a.id !== id),
    }));

    trigger("vibrate");
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.person_id) newErrors.person_id = "Selecione uma pessoa";
    if (!formData.title.trim()) newErrors.title = "Título é obrigatório";

    const fields = DOCUMENT_FIELDS[formData.type] || [];
    fields.forEach((field) => {
      if (field.required && !formData.metadata[field.key]?.trim()) {
        newErrors[field.key] = `${field.label} é obrigatório(a)`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    trigger("vibrate");

    const newErrors: Record<string, string> = {};
    if (!formData.person_id) newErrors.person_id = "Selecione uma pessoa";
    if (!formData.title.trim()) newErrors.title = "Título é obrigatório";

    const dynamicFields = DOCUMENT_FIELDS[formData.type] || [];
    dynamicFields.forEach((field) => {
      if (field.required && !formData.metadata[field.key]?.trim()) {
        newErrors[field.key] = `${field.label} é obrigatório(a)`;
      }
    });

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      trigger("error");
      const firstErrorKey = Object.keys(newErrors)[0];
      const element = document.querySelector(`[data-field="${firstErrorKey}"]`);
      if (element) {
        (element as HTMLElement).scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      const docData: Omit<Document, "id" | "created_at" | "updated_at" | "synced"> = {
        user_id: user?.id || "",
        person_id: formData.person_id,
        category_id: formData.category_id,
        type: formData.type,
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        metadata: formData.metadata,
        attachments: formData.attachments,
        is_favorite: false,
        vault_id: formData.vault_id || undefined,
      };

      const docId = await addDocument(docData);

      if (localFiles.length > 0 && user) {
        const folder = formData.category_id;
        const uploadedAttachments: Attachment[] = [];

        for (let i = 0; i < localFiles.length; i++) {
          const file = localFiles[i];
          const attachment = formData.attachments[i];
          if (!attachment) continue;

          const { url, error } = await uploadFile(user.id, file, folder);
          if (error) {
            console.error("Erro no upload:", error);
            continue;
          }

          uploadedAttachments.push({ ...attachment, url });
          setUploadProgress(Math.round(((i + 1) / localFiles.length) * 100));
        }

        if (uploadedAttachments.length > 0) {
          const finalAttachments = formData.attachments.map((att) => {
            const updated = uploadedAttachments.find((u) => u.id === att.id);
            return updated || att;
          });

          await db.documents.update(docId, {
            attachments: finalAttachments,
            updated_at: new Date().toISOString(),
            synced: false,
          });

          formData.attachments.forEach((att) => {
            if (att.url.startsWith("blob:")) URL.revokeObjectURL(att.url);
          });

          setLocalFiles([]);
        }
      }

      if (formData.metadata?.expiry_date) {
        await scheduleDocumentExpiryNotification(
          docId,
          formData.title,
          formData.metadata.expiry_date,
          CATEGORIES[formData.category_id].name,
          30
        );
      }

      trigger("success");
      router.push("/");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      trigger("error");
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const fields = DOCUMENT_FIELDS[formData.type] || [];

  const renderDateInput = (field: any) => {
    return (
      <div key={field.key} className="space-y-1.5">
        <label className="block text-sm font-medium text-ink-primary">
          {field.label} {field.required && <span className="text-coral">*</span>}
        </label>
        <input
          type="date"
          data-field={field.key}
          value={formData.metadata[field.key] || ""}
          onChange={(e) => handleMetadataChange(field.key, e.target.value)}
          className={`
            w-full rounded-2xl border bg-surface-raised px-4 py-3 text-ink-primary
            placeholder:text-ink-muted/50 outline-none transition-all duration-200
            focus:border-ice/50 focus:ring-2 focus:ring-ice/15
            ${errors[field.key] ? "border-coral/50 focus:border-coral/50 focus:ring-coral/15" : "border-surface-border/50"}
          `}
        />
        {errors[field.key] && <p className="text-xs text-coral">{errors[field.key]}</p>}
      </div>
    );
  };

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(7rem+env(safe-area-inset-bottom))]">
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

        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 pt-6 backdrop-blur-xl">
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
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">
                Vault
              </p>
              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">
                Novo documento
              </h1>
              <p className="mt-1 text-sm text-ink-muted">
                Preencha os dados e anexe arquivos com segurança.
              </p>
            </div>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-6">
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
                const active = formData.person_id === person.id;
                return (
                  <button
                    key={person.id}
                    onClick={() => {
                      trigger("vibrate");
                      handleChange("person_id", person.id!);
                    }}
                    className={`rounded-full border px-4 py-2.5 text-sm font-medium transition-all active:scale-95 ${
                      active
                        ? "border-ice bg-ice/12 text-ice shadow-[0_0_0_1px_rgba(125,211,252,0.1)]"
                        : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                    }`}
                  >
                    {person.name}
                  </button>
                );
              })}
            </div>

            {errors.person_id && <p className="mt-2 text-xs text-coral">{errors.person_id}</p>}
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.28, delay: 0.04 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <p className="mb-3 text-sm font-medium text-ink-primary">
              Categoria <span className="text-coral">*</span>
            </p>

            <div className="flex flex-wrap gap-2">
              {Object.values(CATEGORIES).map((cat: any) => {
                const active = formData.category_id === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      trigger("vibrate");
                      handleChange("category_id", cat.id);
                    }}
                    className={`rounded-full border px-4 py-2.5 text-sm font-medium transition-all active:scale-95 ${
                      active
                        ? "border-ice bg-ice/12 text-ice shadow-[0_0_0_1px_rgba(125,211,252,0.1)]"
                        : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                    }`}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.28, delay: 0.08 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <label className="mb-2 block text-sm font-medium text-ink-primary">
              Tipo de documento <span className="text-coral">*</span>
            </label>

            <button
              onClick={() => {
                trigger("vibrate");
                setIsTypeModalOpen(true);
              }}
              className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary transition-colors"
            >
              <span>{DOCUMENT_TYPE_LABELS[formData.type] || "Selecionar tipo..."}</span>
              <ChevronRight size={16} className="text-ink-muted" />
            </button>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.28, delay: 0.12 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <Input
              label="Título do documento"
              placeholder="Ex: Minha CNH, Receita Losartana..."
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              error={errors.title}
              required
            />
          </motion.div>

          <AnimatePresence mode="wait">
            {fields.length > 0 && (
              <motion.div
                key={formData.type}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.22 }}
                className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
              >
                <div className="mb-4">
                  <p className="text-sm font-medium text-ink-primary">Campos específicos</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    Os campos abaixo mudam conforme o tipo selecionado.
                  </p>
                </div>

                <div className="space-y-3">
                  {fields.map((field) => {
                    const maskType = getMaskType(field.key, formData.type);
                    const rawValue = formData.metadata[field.key] || "";
                    const displayedValue = maskType ? applyMask(rawValue, maskType) : rawValue;

                    if (field.type === "date") {
                      return renderDateInput(field);
                    }

                    if (field.type === "select") {
                      let items: any[] = [];
                      let renderItem: any;
                      let getItemLabel: any;
                      let getItemId: any;
                      let isModalOpen = false;
                      let setIsModalOpen: any;
                      let onSelect: any;
                      let placeholder = "";
                      let title = "";
                      let createPath = "";

                      if (field.key === "doctor") {
                        items = medicos;
                        renderItem = (item: any) => (
                          <div>
                            <p className="font-medium text-ink-primary">{item.nome}</p>
                            {item.especialidade && (
                              <p className="text-xs text-ink-muted">{item.especialidade}</p>
                            )}
                          </div>
                        );
                        getItemLabel = (item: any) => item.nome;
                        getItemId = (item: any) => item.id!;
                        isModalOpen = isDoctorModalOpen;
                        setIsModalOpen = setIsDoctorModalOpen;
                        onSelect = (item: any) => {
                          trigger("vibrate");
                          handleMetadataChange(field.key, String(item.id));
                        };
                        placeholder = "Buscar médico...";
                        title = "Selecionar médico";
                        createPath = "/saude/medicos/novo";
                      } else if (field.key === "pharmacy") {
                        items = farmacias;
                        renderItem = (item: any) => (
                          <div>
                            <p className="font-medium text-ink-primary">{item.nome}</p>
                            {item.endereco && (
                              <p className="text-xs text-ink-muted">{item.endereco}</p>
                            )}
                          </div>
                        );
                        getItemLabel = (item: any) => item.nome;
                        getItemId = (item: any) => item.id!;
                        isModalOpen = isPharmacyModalOpen;
                        setIsModalOpen = setIsPharmacyModalOpen;
                        onSelect = (item: any) => {
                          trigger("vibrate");
                          handleMetadataChange(field.key, String(item.id));
                        };
                        placeholder = "Buscar farmácia...";
                        title = "Selecionar farmácia";
                        createPath = "/saude/farmacias/novo";
                      } else if (field.key === "hospital") {
                        items = hospitais;
                        renderItem = (item: any) => (
                          <div>
                            <p className="font-medium text-ink-primary">{item.nome}</p>
                            {item.endereco && (
                              <p className="text-xs text-ink-muted">{item.endereco}</p>
                            )}
                          </div>
                        );
                        getItemLabel = (item: any) => item.nome;
                        getItemId = (item: any) => item.id!;
                        isModalOpen = isHospitalModalOpen;
                        setIsModalOpen = setIsHospitalModalOpen;
                        onSelect = (item: any) => {
                          trigger("vibrate");
                          handleMetadataChange(field.key, String(item.id));
                        };
                        placeholder = "Buscar hospital...";
                        title = "Selecionar hospital";
                        createPath = "/saude/hospitais/novo";
                      }

                      const selectedId = formData.metadata[field.key];
                      const selectedItem = items.find((item: any) => String(item.id) === selectedId);

                      return (
                        <div key={field.key}>
                          <label className="mb-1.5 block text-sm font-medium text-ink-primary">
                            {field.label} {field.required && <span className="text-coral">*</span>}
                          </label>

                          <button
                            onClick={() => {
                              trigger("vibrate");
                              setIsModalOpen(true);
                            }}
                            className={`w-full rounded-2xl border px-4 py-3 text-left text-ink-primary transition-colors ${
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
                            <p className="mt-1 text-xs text-coral">{errors[field.key]}</p>
                          )}

                          <SelectionModal
                            isOpen={isModalOpen}
                            onClose={() => setIsModalOpen(false)}
                            onSelect={onSelect}
                            items={items}
                            title={title}
                            placeholder={placeholder}
                            renderItem={renderItem}
                            getItemId={getItemId}
                            getItemLabel={getItemLabel}
                            onCreateNew={() => {
                              setIsModalOpen(false);
                              trigger("vibrate");
                              router.push(createPath);
                            }}
                            createNewLabel={`Criar ${field.label.toLowerCase()}`}
                          />
                        </div>
                      );
                    }

                    return (
                      <Input
                        key={field.key}
                        data-field={field.key}
                        label={field.label}
                        type="text"
                        value={displayedValue}
                        onChange={(e) => {
                          const raw = maskType
                            ? e.target.value.replace(/D/g, "")
                            : e.target.value;
                          handleMetadataChange(field.key, raw);
                        }}
                        placeholder={`Digite ${field.label.toLowerCase()}...`}
                        required={field.required}
                        error={errors[field.key]}
                      />
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {userVaults && userVaults.length > 0 && (
            <motion.div
              variants={fadeUp}
              initial="initial"
              animate="animate"
              transition={{ duration: 0.28, delay: 0.16 }}
              className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
            >
              <label className="mb-3 block text-sm font-medium text-ink-primary">
                Compartilhar com cofre
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    trigger("vibrate");
                    handleChange("vault_id", undefined);
                  }}
                  className={`rounded-full border px-3 py-2 text-xs font-medium transition-all active:scale-95 ${
                    formData.vault_id === undefined
                      ? "border-ice bg-ice/12 text-ice"
                      : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                  }`}
                >
                  Nenhum
                </button>

                {userVaults.map((vault: any) => (
                  <button
                    key={vault.id}
                    onClick={() => {
                      trigger("vibrate");
                      handleChange("vault_id", vault.id!);
                    }}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-all active:scale-95 ${
                      formData.vault_id === vault.id
                        ? "border-ice bg-ice/12 text-ice"
                        : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                    }`}
                  >
                    <Shield size={12} />
                    {vault.name}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.28, delay: 0.2 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <TextArea
              label="Notas (opcional)"
              placeholder="Informações adicionais..."
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
            />
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.28, delay: 0.24 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="mb-3">
              <label className="block text-sm font-medium text-ink-primary">Anexos</label>
              <p className="mt-1 text-xs text-ink-muted">
                Envie PDF ou imagem, ou capture direto pela câmera.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="secondary"
                className="flex items-center justify-center gap-2"
                onClick={() => {
                  trigger("vibrate");
                  fileInputRef.current?.click();
                }}
                disabled={uploading || loading}
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
                disabled={uploading || loading}
              >
                <Camera size={16} />
                Câmera
              </Button>
            </div>

            <AnimatePresence>
              {formData.attachments.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.2 }}
                  className="mt-4 space-y-2"
                >
                  {formData.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center gap-3 rounded-2xl border border-surface-border/50 bg-surface-raised px-3 py-3"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface border border-surface-border/40">
                        {att.type === "image" ? (
                          <ImageIcon size={16} className="text-ice" />
                        ) : (
                          <FileText size={16} className="text-ice" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink-primary">{att.name}</p>
                        <p className="text-xs text-ink-muted">
                          {att.type === "image" ? "Imagem" : "PDF"}
                        </p>
                      </div>

                      <button
                        onClick={() => removeAttachment(att.id)}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-border/40 hover:text-ink-primary"
                        disabled={loading}
                        aria-label={`Remover ${att.name}`}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {localFiles.length > 0 && (
              <div className="mt-3 rounded-2xl border border-ice/15 bg-ice/5 px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium text-ink-primary">
                    {localFiles.length} arquivo{localFiles.length > 1 ? "s" : ""} pronto
                    {localFiles.length > 1 ? "s" : ""} para upload
                  </p>
                  {uploadProgress > 0 && (
                    <span className="text-xs font-medium text-ice">{uploadProgress}%</span>
                  )}
                </div>

                {uploadProgress > 0 && (
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-border/40">
                    <div
                      className="h-full rounded-full bg-ice transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleSubmit}
            disabled={loading || uploading}
            className="flex items-center justify-center gap-2 shadow-lg shadow-ice/10"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {uploadProgress > 0 ? `Enviando anexos ${uploadProgress}%` : "Salvando..."}
              </>
            ) : (
              <>
                <Save size={16} />
                Salvar documento
              </>
            )}
          </Button>
        </div>

        <DocumentTypeSelector
          selected={formData.type}
          onChange={(type) => {
            trigger("vibrate");
            handleChange("type", type);
          }}
          isOpen={isTypeModalOpen}
          onClose={() => setIsTypeModalOpen(false)}
        />
      </main>
    </PageTransition>
  );
}