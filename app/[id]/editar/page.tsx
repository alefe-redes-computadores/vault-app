"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useDocument } from "@/hooks/useDocuments";
import { usePersons } from "@/hooks/usePersons";
import { useSafeDb } from "@/hooks/useSafeDb";
import { useHapticFeedback } from "@/lib/haptics";
import { CATEGORIES, DOCUMENT_FIELDS, type CategoryId, type DocumentType } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";

export default function EditDocumentPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

  const doc = useDocument(id);
  const persons = usePersons();
  const { updateDocument } = useSafeDb();

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    person_id: 0,
    category_id: "pessoal" as CategoryId,
    type: "rg" as DocumentType,
    title: "",
    description: "",
    metadata: {} as Record<string, any>,
    attachments: [] as any[],
  });

  useEffect(() => {
    if (doc) {
      setFormData({
        person_id: doc.person_id,
        category_id: doc.category_id,
        type: doc.type as DocumentType,
        title: doc.title,
        description: doc.description || "",
        metadata: doc.metadata || {},
        attachments: doc.attachments || [],
      });
    }
  }, [doc]);

  const fields = DOCUMENT_FIELDS[formData.type] || [];

  const handleChange = (field: keyof typeof formData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleMetadataChange = (key: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      metadata: { ...prev.metadata, [key]: value },
    }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = "Título é obrigatório";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !doc) {
      trigger("error");
      return;
    }

    setLoading(true);
    try {
      await updateDocument(id, {
        person_id: formData.person_id,
        category_id: formData.category_id,
        type: formData.type,
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        metadata: formData.metadata,
        attachments: formData.attachments,
      });
      trigger("success");
      router.push(`/${id}`);
    } catch (error) {
      console.error("Erro ao atualizar:", error);
      trigger("error");
    } finally {
      setLoading(false);
    }
  };

  if (!doc) {
    return (
      <main className="min-h-screen bg-void flex items-center justify-center">
        <div className="text-center">
          <p className="text-ink-muted">Documento não encontrado</p>
          <Button variant="primary" onClick={() => router.push("/")} className="mt-4">
            Voltar
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-void pb-28">
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
            <h1 className="font-display text-xl font-semibold text-ink-primary">Editar documento</h1>
          </div>
        </div>
      </header>

      <section className="px-5 pt-6 space-y-4">
        {/* Pessoa */}
        <div>
          <label className="block text-sm font-medium text-ink-primary mb-1.5">Pessoa</label>
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
        </div>

        {/* Categoria */}
        <div>
          <label className="block text-sm font-medium text-ink-primary mb-1.5">Categoria</label>
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
          <label className="block text-sm font-medium text-ink-primary mb-1.5">Tipo</label>
          <select
            value={formData.type}
            onChange={(e) => handleChange("type", e.target.value as DocumentType)}
            className="w-full rounded-xl bg-surface-raised border border-surface-border px-4 py-3 text-ink-primary focus:outline-none focus:border-steel-light"
          >
            <option value="rg">RG</option>
            <option value="cpf">CPF</option>
            <option value="cnh">CNH</option>
            <option value="certificado">Certificado</option>
            <option value="receita">Receita</option>
            <option value="prontuario">Prontuário</option>
            <option value="laudo">Laudo</option>
            <option value="encaminhamento">Encaminhamento</option>
            <option value="outro">Outro</option>
          </select>
        </div>

        {/* Título */}
        <Input
          label="Título"
          value={formData.title}
          onChange={(e) => handleChange("title", e.target.value)}
          error={errors.title}
        />

        {/* Campos dinâmicos */}
        {fields.map((field) => (
          <Input
            key={field.key}
            label={field.label}
            type={field.type === "date" ? "date" : "text"}
            value={formData.metadata[field.key] || ""}
            onChange={(e) => handleMetadataChange(field.key, e.target.value)}
          />
        ))}

        {/* Notas */}
        <TextArea
          label="Notas"
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
        />

        <Button variant="primary" size="lg" fullWidth onClick={handleSubmit} disabled={loading}>
          {loading ? "Salvando..." : "Salvar alterações"}
        </Button>
      </section>
    </main>
  );
}