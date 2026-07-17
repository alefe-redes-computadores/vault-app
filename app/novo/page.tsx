"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, Camera, X, Loader2 } from "lucide-react";
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

// Mapeamento de campos por tipo de documento
const DOCUMENT_FIELDS: Record<
  DocumentType,
  Array<{ key: string; label: string; type: "text" | "date" | "select"; options?: string[] }>
> = {
  rg: [
    { key: "number", label: "Número do RG", type: "text" },
    { key: "issue_date", label: "Data de emissão", type: "date" },
    { key: "expiry_date", label: "Data de validade", type: "date" },
    { key: "issuer", label: "Órgão emissor", type: "text" },
  ],
  cpf: [{ key: "number", label: "Número do CPF", type: "text" }],
  cnh: [
    { key: "number", label: "Número da CNH", type: "text" },
    {
      key: "category",
      label: "Categoria",
      type: "select",
      options: ["A", "B", "C", "D", "E"],
    },
    { key: "issue_date", label: "Data de emissão", type: "date" },
    { key: "expiry_date", label: "Data de validade", type: "date" },
  ],
  certificado: [
    { key: "institution", label: "Instituição de ensino", type: "text" },
    { key: "course", label: "Curso", type: "text" },
    { key: "duration", label: "Duração (ex: 120 horas)", type: "text" },
    { key: "completion_date", label: "Data de conclusão", type: "date" },
  ],
  receita: [
    { key: "medication", label: "Medicamento", type: "text" },
    { key: "dosage", label: "Dosagem", type: "text" },
    { key: "doctor", label: "Médico", type: "text" },
    { key: "pharmacy", label: "Farmácia (opcional)", type: "text" },
    { key: "prescription_date", label: "Data da receita", type: "date" },
    { key: "renewal_date", label: "Próxima renovação", type: "date" },
  ],
  prontuario: [
    { key: "hospital", label: "Hospital", type: "text" },
    { key: "doctor", label: "Médico", type: "text" },
    { key: "specialty", label: "Especialidade", type: "text" },
    { key: "date", label: "Data", type: "date" },
  ],
  laudo: [
    { key: "doctor", label: "Médico", type: "text" },
    { key: "specialty", label: "Especialidade", type: "text" },
    { key: "hospital", label: "Hospital", type: "text" },
    { key: "date", label: "Data", type: "date" },
  ],
  encaminhamento: [
    { key: "from", label: "Quem encaminhou", type: "text" },
    { key: "to", label: "Para quem (opcional)", type: "text" },
    { key: "reason", label: "Motivo", type: "text" },
    { key: "date", label: "Data", type: "date" },
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
  });

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);

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
      };

      await addDocument(docData);
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
        {/* Inputs ocultos para upload */}
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
              Pessoa
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
              Categoria
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

          {/* Tipo de Documento - COM MODAL */}
          <div>
            <label className="block text-sm font-medium text-ink-primary mb-1.5">
              Tipo de documento
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
                />
              ))}
            </div>
          )}

          {/* Descrição/Notas */}
          <TextArea
            label="Notas (opcional)"
            placeholder="Informações adicionais..."
            value={formData.description}
            onChange={(e) => handleChange("description", e.target.value)}
          />

          {/* Upload de arquivo */}
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
            disabled={loading || uploading}
            className="mt-4"
          >
            {loading ? "Salvando..." : "Salvar documento"}
          </Button>
        </section>

        {/* MODAL DE SELEÇÃO DE TIPO */}
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