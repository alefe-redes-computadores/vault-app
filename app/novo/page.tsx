"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Upload, Camera, X, Loader2, Save } from "lucide-react";
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
import { CustomDatePicker } from "@/components/DatePicker";
import { SelectionModal } from "@/components/SelectionModal";
import { useMedicos } from "@/hooks/useMedicos";
import { useFarmacias } from "@/hooks/useFarmacias";
import { useHospitais } from "@/hooks/useHospitais";

// ============================================================
// MÁSCARAS
// ============================================================
const applyMask = (value: string, type: string): string => {
  const digits = value.replace(/\D/g, '');
  
  if (type === 'cpf') {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .slice(0, 14);
  }
  
  if (type === 'rg') {
    return digits
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .slice(0, 13);
  }
  
  if (type === 'cnh') {
    return digits.slice(0, 11);
  }
  
  return value;
};

const getMaskType = (fieldKey: string, docType: DocumentType): string | null => {
  if (docType === 'cpf' && fieldKey === 'number') return 'cpf';
  if (docType === 'rg' && fieldKey === 'number') return 'rg';
  if (docType === 'cnh' && fieldKey === 'number') return 'cnh';
  return null;
};

type FormData = {
  person_id: number;
  category_id: CategoryId;
  type: DocumentType;
  title: string;
  description: string;
  metadata: Record<string, any>;
  attachments: Attachment[];
  vault_id?: number;
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
    person_id: persons[0]?.id || 0,
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

  const userVaults = useLiveQuery(
    () => db.vaults.where('user_id').equals(user?.id || '').toArray(),
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

  const handleFileUpload = async (file: File) => {
    if (!user) {
      trigger("error");
      return;
    }

    setUploading(true);
    try {
      const folder = formData.category_id;
      const { url, error } = await uploadFile(user.id, file, folder);
      if (error) throw error;

      const newAttachment: Attachment = {
        id: crypto.randomUUID(),
        url,
        name: file.name,
        type: file.type.startsWith("image") ? "image" : "pdf",
        uploaded_at: new Date().toISOString(),
      };

      setFormData((prev) => ({
        ...prev,
        attachments: [...prev.attachments, newAttachment],
      }));

      trigger("success");
    } catch (error) {
      console.error("Erro no upload:", error);
      trigger("error");
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      trigger("vibrate");
      handleFileUpload(file);
    }
    e.target.value = "";
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      trigger("vibrate");
      handleFileUpload(file);
    }
    e.target.value = "";
  };

  const removeAttachment = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((a) => a.id !== id),
    }));
    trigger("vibrate");
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.person_id) {
      newErrors.person_id = "Selecione uma pessoa";
    }
    if (!formData.title.trim()) {
      newErrors.title = "Título é obrigatório";
    }

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
    
    if (!validate()) {
      trigger("error");
      const firstErrorKey = Object.keys(errors)[0];
      if (firstErrorKey) {
        const element = document.querySelector(`[data-field="${firstErrorKey}"]`);
        if (element) {
          (element as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      return;
    }

    setLoading(true);
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

      const id = await addDocument(docData);

      if (formData.metadata?.expiry_date) {
        await scheduleDocumentExpiryNotification(
          id,
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
    }
  };

  const fields = DOCUMENT_FIELDS[formData.type] || [];

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
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

        <header className="sticky top-0 z-10 bg-void/80 backdrop-blur-xl border-b border-surface-border/30 px-5 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                trigger("vibrate");
                router.back();
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95 transition-all"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-ice">Vault</p>
              <h1 className="font-display text-xl font-semibold text-ink-primary">
                Novo documento
              </h1>
            </div>
          </div>
        </header>

        <section className="px-5 pt-6 space-y-4">
          {/* Pessoa */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <label className="block text-sm font-medium text-ink-primary mb-1.5">
              Pessoa <span className="text-coral">*</span>
            </label>
            <div className="flex gap-2 flex-wrap">
              {persons.map((person) => (
                <button
                  key={person.id}
                  onClick={() => {
                    trigger("vibrate");
                    handleChange("person_id", person.id!);
                  }}
                  className={`px-4 py-2 rounded-full border transition-all active:scale-95 ${
                    formData.person_id === person.id
                      ? "border-ice bg-ice/10 text-ice"
                      : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                  }`}
                >
                  <span className="text-sm font-medium">{person.name}</span>
                </button>
              ))}
            </div>
            {errors.person_id && (
              <p className="text-xs text-coral mt-1">{errors.person_id}</p>
            )}
          </motion.div>

          {/* Categoria */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
          >
            <label className="block text-sm font-medium text-ink-primary mb-1.5">
              Categoria <span className="text-coral">*</span>
            </label>
            <div className="flex gap-2 flex-wrap">
              {Object.values(CATEGORIES).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    trigger("vibrate");
                    handleChange("category_id", cat.id);
                  }}
                  className={`px-4 py-2 rounded-full border transition-all active:scale-95 ${
                    formData.category_id === cat.id
                      ? "border-ice bg-ice/10 text-ice"
                      : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                  }`}
                >
                  <span className="text-sm font-medium">{cat.name}</span>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Tipo */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <label className="block text-sm font-medium text-ink-primary mb-1.5">
              Tipo de documento <span className="text-coral">*</span>
            </label>
            <button
              onClick={() => {
                trigger("vibrate");
                setIsTypeModalOpen(true);
              }}
              className="w-full text-left px-4 py-3 rounded-xl bg-surface-raised border border-surface-border/50 text-ink-primary focus:outline-none focus:border-steel-light transition-colors"
            >
              {DOCUMENT_TYPE_LABELS[formData.type] || "Selecionar tipo..."}
            </button>
          </motion.div>

          {/* Título */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            <Input
              label="Título do documento"
              placeholder="Ex: Minha CNH, Receita Losartana, etc."
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              error={errors.title}
              required
            />
          </motion.div>

          {/* Campos dinâmicos */}
          {fields.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="space-y-3 border-t border-surface-border/50 pt-4"
            >
              <p className="text-sm font-medium text-ink-muted">Campos específicos</p>
              {fields.map((field) => {
                const maskType = getMaskType(field.key, formData.type);
                const rawValue = formData.metadata[field.key] || '';
                const displayedValue = maskType ? applyMask(rawValue, maskType) : rawValue;

                if (field.type === "date") {
                  return (
                    <CustomDatePicker
                      key={field.key}
                      data-field={field.key}
                      label={field.label}
                      value={rawValue}
                      onChange={(val) => handleMetadataChange(field.key, val)}
                      required={field.required}
                      error={errors[field.key]}
                    />
                  );
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
                        <p className="text-ink-primary font-medium">{item.nome}</p>
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
                        <p className="text-ink-primary font-medium">{item.nome}</p>
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
                        <p className="text-ink-primary font-medium">{item.nome}</p>
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
                      <button
                        onClick={() => {
                          trigger("vibrate");
                          setIsModalOpen(true);
                        }}
                        className={`w-full text-left px-4 py-3 rounded-xl bg-surface-raised border transition-colors ${
                          errors[field.key]
                            ? "border-coral/50 focus:border-coral"
                            : "border-surface-border/50 focus:border-steel-light"
                        } text-ink-primary focus:outline-none`}
                      >
                        {selectedItem ? selectedItem.nome : `Selecionar ${field.label.toLowerCase()}`}
                      </button>
                      {errors[field.key] && (
                        <p className="text-xs text-coral mt-1">{errors[field.key]}</p>
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
                        ? e.target.value.replace(/\D/g, '')
                        : e.target.value;
                      handleMetadataChange(field.key, raw);
                    }}
                    placeholder={field.options ? "Selecione..." : `Digite ${field.label.toLowerCase()}...`}
                    required={field.required}
                    error={errors[field.key]}
                  />
                );
              })}
            </motion.div>
          )}

          {/* Cofre */}
          {userVaults && userVaults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.25 }}
            >
              <label className="block text-sm font-medium text-ink-primary mb-1.5">
                Compartilhar com cofre (opcional)
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    trigger("vibrate");
                    handleChange("vault_id", undefined);
                  }}
                  className={`px-3 py-1.5 rounded-full border text-xs transition-all active:scale-95 ${
                    formData.vault_id === undefined
                      ? "border-ice bg-ice/10 text-ice"
                      : "border-surface-border/50 bg-surface text-ink-muted hover:text-ink-primary"
                  }`}
                >
                  Nenhum
                </button>
                {userVaults.map((vault) => (
                  <button
                    key={vault.id}
                    onClick={() => {
                      trigger("vibrate");
                      handleChange("vault_id", vault.id!);
                    }}
                    className={`px-3 py-1.5 rounded-full border text-xs transition-all active:scale-95 flex items-center gap-1 ${
                      formData.vault_id === vault.id
                        ? "border-ice bg-ice/10 text-ice"
                        : "border-surface-border/50 bg-surface text-ink-muted hover:text-ink-primary"
                    }`}
                  >
                    <span>{vault.icon || "🔒"}</span>
                    {vault.name}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Notas */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <TextArea
              label="Notas (opcional)"
              placeholder="Informações adicionais..."
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
            />
          </motion.div>

          {/* Upload */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.35 }}
            className="space-y-2"
          >
            <label className="block text-sm font-medium text-ink-primary">Anexos</label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="secondary"
                className="flex items-center justify-center gap-2"
                onClick={() => {
                  trigger("vibrate");
                  fileInputRef.current?.click();
                }}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Upload size={16} />
                )}
                Upload
              </Button>
              <Button
                variant="secondary"
                className="flex items-center justify-center gap-2"
                onClick={() => {
                  trigger("vibrate");
                  cameraInputRef.current?.click();
                }}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Camera size={16} />
                )}
                Câmera
              </Button>
            </div>

            {formData.attachments.length > 0 && (
              <div className="mt-2 space-y-1">
                {formData.attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-surface-raised border border-surface-border/50"
                  >
                    <span className="text-sm text-ink-muted truncate flex-1">{att.name}</span>
                    <button
                      onClick={() => removeAttachment(att.id)}
                      className="p-1 rounded-full hover:bg-surface-border transition-colors"
                    >
                      <X size={14} className="text-ink-muted" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
          >
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleSubmit}
              disabled={loading || uploading}
              className="flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Salvar documento
                </>
              )}
            </Button>
          </motion.div>
        </section>

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