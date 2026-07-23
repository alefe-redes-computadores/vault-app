"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Loader2, FileText, Layers3 } from "lucide-react";
import { useDocument } from "@/hooks/useDocuments";
import { usePersons } from "@/hooks/usePersons";
import { useSafeDb } from "@/hooks/useSafeDb";
import { useHapticFeedback } from "@/lib/haptics";
import { CATEGORIES, type CategoryId, type DocumentType } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { PageTransition } from "@/components/PageTransition";

const getFieldsForType = (type: DocumentType) => {
  const commonFields = [
    { key: "number", label: "Número", type: "text" },
    { key: "issue_date", label: "Data de emissão", type: "date" },
    { key: "expiry_date", label: "Data de validade", type: "date" },
    { key: "issuer", label: "Órgão emissor", type: "text" },
  ];

  const fieldMap: Record<DocumentType, Array<{ key: string; label: string; type: string }>> = {
    rg: commonFields,
    cpf: [{ key: "number", label: "Número do CPF", type: "text" }],
    cnh: [
      { key: "number", label: "Número da CNH", type: "text" },
      { key: "category", label: "Categoria", type: "text" },
      { key: "issue_date", label: "Data de emissão", type: "date" },
      { key: "expiry_date", label: "Data de validade", type: "date" },
    ],
    certificado: [
      { key: "institution", label: "Instituição", type: "text" },
      { key: "course", label: "Curso", type: "text" },
      { key: "duration", label: "Duração", type: "text" },
      { key: "completion_date", label: "Data de conclusão", type: "date" },
    ],
    receita: [
      { key: "medication", label: "Medicamento", type: "text" },
      { key: "dosage", label: "Dosagem", type: "text" },
      { key: "doctor", label: "Médico", type: "text" },
      { key: "pharmacy", label: "Farmácia", type: "text" },
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
      { key: "to", label: "Para quem", type: "text" },
      { key: "reason", label: "Motivo", type: "text" },
      { key: "date", label: "Data", type: "date" },
    ],
    outro: [
      { key: "custom_field_1", label: "Campo 1", type: "text" },
      { key: "custom_field_2", label: "Campo 2", type: "text" },
    ],
  };

  return fieldMap[type] || [];
};

const sectionMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

export default function EditarDetalhePage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "";

  const doc = useDocument(id);
  const persons = usePersons();
  const { updateDocument } = useSafeDb();

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    person_id: "",
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
        person_id: doc.person_id || "",
        category_id: doc.category_id,
        type: doc.type as DocumentType,
        title: doc.title,
        description: doc.description || "",
        metadata: doc.metadata || {},
        attachments: doc.attachments || [],
      });
    }
  }, [doc]);

  const fields = useMemo(() => getFieldsForType(formData.type), [formData.type]);

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
    if (!validate() || !doc || !id) {
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
      router.push(`/detalhes?id=${id}`);
    } catch (error) {
      console.error("Erro ao atualizar:", error);
      trigger("error");
    } finally {
      setLoading(false);
    }
  };

  if (!doc) {
    return (
      <PageTransition>
        <main className="flex min-h-screen items-center justify-center bg-void px-5">
          <div className="w-full max-w-sm rounded-[28px] border border-surface-border/50 bg-surface px-6 py-8 text-center shadow-sm">
            <p className="text-sm text-ink-muted">Documento não encontrado</p>
            <Button variant="primary" onClick={() => router.push("/")} className="mt-5">
              Voltar
            </Button>
          </div>
        </main>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
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
              <h1 className="font-display text-xl font-semibold text-ink-primary">
                Editar documento
              </h1>
            </div>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-6">
          <motion.div
            {...sectionMotion}
            transition={{ duration: 0.22 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface px-5 py-5 shadow-sm"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-surface-border/50 bg-surface-raised">
                <FileText size={22} className="text-ice" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-ink-muted">Documento atual</p>
                <h2 className="truncate font-display text-lg font-semibold text-ink-primary">
                  {formData.title || "Sem título"}
                </h2>
                <p className="mt-1 text-xs leading-5 text-ink-faint">
                  Atualize os dados visíveis do documento sem alterar o fluxo já existente.
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            {...sectionMotion}
            transition={{ duration: 0.22, delay: 0.03 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface px-4 py-4 shadow-sm"
          >
            <p className="mb-3 text-sm font-medium text-ink-primary">Pessoa</p>
            <div className="flex flex-wrap gap-2">
              {persons.map((person: any) => (
                <button
                  key={person.id}
                  onClick={() => handleChange("person_id", person.id!)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-all active:scale-95 ${
                    formData.person_id === person.id
                      ? "border-ice bg-ice/12 text-ice"
                      : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                  }`}
                >
                  {person.name}
                </button>
              ))}
            </div>
          </motion.div>

          <motion.div
            {...sectionMotion}
            transition={{ duration: 0.22, delay: 0.06 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface px-4 py-4 shadow-sm"
          >
            <p className="mb-3 text-sm font-medium text-ink-primary">Categoria</p>
            <div className="flex flex-wrap gap-2">
              {Object.values(CATEGORIES).map((cat: any) => (
                <button
                  key={cat.id}
                  onClick={() => handleChange("category_id", cat.id)}
                  className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all active:scale-95 ${
                    formData.category_id === cat.id
                      ? "border-ice bg-ice/12 text-ice"
                      : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  {cat.name}
                </button>
              ))}
            </div>
          </motion.div>

          <motion.div
            {...sectionMotion}
            transition={{ duration: 0.22, delay: 0.09 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface px-4 py-4 shadow-sm"
          >
            <label className="mb-2 block text-sm font-medium text-ink-primary">Tipo</label>
            <div className="relative">
              <Layers3
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
              />
              <select
                value={formData.type}
                onChange={(e) => handleChange("type", e.target.value as DocumentType)}
                className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised py-3 pl-10 pr-4 text-ink-primary outline-none transition-colors focus:border-ice/50"
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
          </motion.div>

          <motion.div
            {...sectionMotion}
            transition={{ duration: 0.22, delay: 0.12 }}
            className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface px-4 py-4 shadow-sm"
          >
            <Input
              label="Título"
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              error={errors.title}
            />

            {fields.map((field: any) => (
              <Input
                key={field.key}
                label={field.label}
                type={field.type === "date" ? "date" : "text"}
                value={formData.metadata[field.key] || ""}
                onChange={(e) => handleMetadataChange(field.key, e.target.value)}
              />
            ))}

            <TextArea
              label="Notas"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
            />
          </motion.div>

          <motion.div
            {...sectionMotion}
            transition={{ duration: 0.22, delay: 0.15 }}
          >
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleSubmit}
              disabled={loading}
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
                  Salvar alterações
                </>
              )}
            </Button>
          </motion.div>
        </section>
      </main>
    </PageTransition>
  );
}