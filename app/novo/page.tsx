"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, Camera, X, Loader2, CheckCircle2, Users } from "lucide-react";
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
} from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { PageTransition } from "@/components/PageTransition";
import { DocumentTypeSelector } from "@/components/DocumentTypeSelector";
import { scheduleDocumentExpiryNotification } from "@/lib/notifications";
import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";

// Mapeamento de campos por tipo de documento
const DOCUMENT_FIELDS: Record<
  DocumentType,
  Array<{ key: string; label: string; type: "text" | "date" | "select"; options?: string[]; required?: boolean }>
> = {
  rg: [
    { key: "number", label: "Número do RG", type: "text", required: true },
    { key: "issue_date", label: "Data de emissão", type: "date", required: true },
    { key: "expiry_date", label: "Data de validade", type: "date", required: true },
    { key: "issuer", label: "Órgão emissor", type: "text", required: true },
  ],
  cpf: [
    { key: "number", label: "Número do CPF", type: "text", required: true },
  ],
  cnh: [
    { key: "number", label: "Número da CNH", type: "text", required: true },
    {
      key: "category",
      label: "Categoria",
      type: "select",
      options: ["A", "B", "C", "D", "E"],
      required: true,
    },
    { key: "issue_date", label: "Data de emissão", type: "date", required: true },
    { key: "expiry_date", label: "Data de validade", type: "date", required: true },
  ],
  certificado: [
    { key: "institution", label: "Instituição de ensino", type: "text", required: true },
    { key: "course", label: "Curso", type: "text", required: true },
    { key: "duration", label: "Duração (ex: 120 horas)", type: "text", required: true },
    { key: "completion_date", label: "Data de conclusão", type: "date" },
  ],
  receita: [
    { key: "medication", label: "Medicamento", type: "text", required: true },
    { key: "dosage", label: "Dosagem", type: "text", required: true },
    { key: "doctor", label: "Médico", type: "text", required: true },
    { key: "pharmacy", label: "Farmácia (opcional)", type: "text" },
    { key: "prescription_date", label: "Data da receita", type: "date", required: true },
    { key: "renewal_date", label: "Próxima renovação", type: "date", required: true },
  ],
  prontuario: [
    { key: "hospital", label: "Hospital", type: "text", required: true },
    { key: "doctor", label: "Médico", type: "text", required: true },
    { key: "specialty", label: "Especialidade", type: "text", required: true },
    { key: "date", label: "Data", type: "date", required: true },
  ],
  laudo: [
    { key: "doctor", label: "Médico", type: "text", required: true },
    { key: "specialty", label: "Especialidade", type: "text", required: true },
    { key: "hospital", label: "Hospital", type: "text", required: true },
    { key: "date", label: "Data", type: "date", required: true },
  ],
  encaminhamento: [
    { key: "from", label: "Quem encaminhou", type: "text", required: true },
    { key: "to", label: "Para quem (opcional)", type: "text" },
    { key: "reason", label: "Motivo", type: "text", required: true },
    { key: "date", label: "Data", type: "date", required: true },
  ],
  outro: [
    { key: "custom_field_1", label: "Campo personalizado 1", type: "text" },
    { key: "custom_field_2", label: "Campo personalizado 2", type: "text" },
  ],
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

// Mapeamento de tipos para exibição no botão
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
  const [showSuccess, setShowSuccess] = useState(false);

  // Busca os cofres do usuário
  const userVaults = useLiveQuery(
    () => db.vaults.where('user_id').equals(user?.id || '').toArray(),
    [user?.id],
    []
  );

  // Reset metadata quando trocar o tipo
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
      handleFileUpload(file);
    }
    e.target.value = "";
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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
    if (!validate()) {
      trigger("error");
      return;
    }

    setLoading(true);
    try {
      const docData: Omit<Document, "id" | "created_at" | "updated_at" | "synced"> = {
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

      // Agenda notificação 30 dias antes do vencimento
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
      setShowSuccess(true);
      setTimeout(() => {
        router.push("/");
      }, 1500);
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

        <header className="glass-header sticky top-0 z-10 px-5 pb-4 pt-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                trigger("vibrate");
                router.back();
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border bg-surface-raised active:scale-[0.98]"
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
          <div>
            <label className="block text-sm font-medium text-ink-primary mb-1.5">
              Pessoa <span className="text-coral">*</span>
            </label>
            <div className="flex gap-2 flex-wrap">
              {persons.map((person) => (
                <button
                  key={person.id}
                  onClick={() => handleChange("person_id", person.id!)}
                  className={`px-4 py-2 rounded-full border transition-all active:scale-[0.98] ${
                    formData.person_id === person.id
                      ? "border-ice bg-ice/10 text-ice"
                      : "border-surface-border bg-surface-raised text-ink-muted hover:text-ink-primary"
                  }`}
                >
                  <span className="text-sm font-medium">{person.name}</span>
                </button>
              ))}
            </div>
            {errors.person_id && (
              <p className="text-xs text-coral mt-1">{errors.person_id}</p>
            )}
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-sm font-medium text-ink-primary mb-1.5">
              Categoria <span className="text-coral">*</span>
            </label>
            <div className="flex gap-2 flex-wrap">
              {Object.values(CATEGORIES).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleChange("category_id", cat.id)}
                  className={`px-4 py-2 rounded-full border transition-all active:scale-[0.98] ${
                    formData.category_id === cat.id
                      ? "border-ice bg-ice/10 text-ice"
                      : "border-surface-border bg-surface-raised text-ink-muted hover:text-ink-primary"
                  }`}
                >
                  <span className="text-sm font-medium">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-ink-primary mb-1.5">
              Tipo de documento <span className="text-coral">*</span>
            </label>
            <button
              onClick={() => setIsTypeModalOpen(true)}
              className="w-full text-left px-4 py-3 rounded-xl bg-surface-raised border border-surface-border text-ink-primary focus:outline-none focus:border-steel-light transition-colors"
            >
              {DOCUMENT_TYPE_LABELS[formData.type] || "Selecionar tipo..."}
            </button>
          </div>

          {/* Título */}
          <Input
            label="Título do documento"
            placeholder="Ex: Minha CNH, Receita Losartana, etc."
            value={formData.title}
            onChange={(e) => handleChange("title", e.target.value)}
            error={errors.title}
            required
          />

          {/* Campos dinâmicos */}
          {fields.length > 0 && (
            <div className="space-y-3 border-t border-surface-border pt-4">
              <p className="text-sm font-medium text-ink-muted">Campos específicos</p>
              {fields.map((field) => (
                <Input
                  key={field.key}
                  label={field.label}
                  type={field.type === "date" ? "date" : "text"}
                  value={formData.metadata[field.key] || ""}
                  onChange={(e) => handleMetadataChange(field.key, e.target.value)}
                  placeholder={
                    field.type === "select" ? "" : `Digite ${field.label.toLowerCase()}...`
                  }
                  required={field.required}
                  error={errors[field.key]}
                />
              ))}
            </div>
          )}

          {/* Cofre (compartilhamento) */}
          {userVaults && userVaults.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-ink-primary mb-1.5">
                Compartilhar com cofre (opcional)
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleChange("vault_id", undefined)}
                  className={`px-3 py-1.5 rounded-full border text-xs transition-all active:scale-[0.98] ${
                    formData.vault_id === undefined
                      ? "border-ice bg-ice/10 text-ice"
                      : "border-surface-border bg-surface text-ink-muted hover:text-ink-primary"
                  }`}
                >
                  Nenhum
                </button>
                {userVaults.map((vault) => (
                  <button
                    key={vault.id}
                    onClick={() => handleChange("vault_id", vault.id!)}
                    className={`px-3 py-1.5 rounded-full border text-xs transition-all active:scale-[0.98] flex items-center gap-1 ${
                      formData.vault_id === vault.id
                        ? "border-ice bg-ice/10 text-ice"
                        : "border-surface-border bg-surface text-ink-muted hover:text-ink-primary"
                    }`}
                  >
                    <span>{vault.icon || '🔒'}</span>
                    {vault.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Descrição */}
          <TextArea
            label="Notas (opcional)"
            placeholder="Informações adicionais..."
            value={formData.description}
            onChange={(e) => handleChange("description", e.target.value)}
          />

          {/* Anexos */}
          <div className="space-y-2">
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
                    className="flex items-center justify-between p-2 rounded-lg bg-surface-raised border border-surface-border"
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
          </div>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleSubmit}
            disabled={loading || uploading || showSuccess}
            className="mt-4 transition-all duration-300"
          >
            {showSuccess ? (
              <>
                <CheckCircle2 size={18} className="mr-2" />
                Salvo com sucesso!
              </>
            ) : loading ? (
              <>
                <Loader2 size={18} className="mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar documento"
            )}
          </Button>
        </section>

        <DocumentTypeSelector
          selected={formData.type}
          onChange={(type) => handleChange("type", type)}
          isOpen={isTypeModalOpen}
          onClose={() => setIsTypeModalOpen(false)}
        />
      </main>
    </PageTransition>
  );
}