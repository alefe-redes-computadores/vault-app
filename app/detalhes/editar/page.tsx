"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Save,
  Loader2,
  User,
  Layers3,
  FileText,
  Activity,
} from "lucide-react";
import { useDocument } from "@/hooks/useDocuments";
import { usePersons } from "@/hooks/usePersons";
import { useSafeDb } from "@/hooks/useSafeDb";
import { useHapticFeedback } from "@/lib/haptics";
import { CATEGORIES, type CategoryId, type DocumentType } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { PageTransition } from "@/components/PageTransition";
import { useToast } from "@/components/ToastProvider";
import { SelectionModal } from "@/components/SelectionModal";
import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";

const getFieldsForType = (type: DocumentType) => {
  const commonFields = [
    { key: "number", label: "Número", type: "text" },
    { key: "issue_date", label: "Data de emissão", type: "date" },
    { key: "expiry_date", label: "Data de validade", type: "date" },
    { key: "issuer", label: "Órgão emissor", type: "text" },
  ];

  const fieldMap: Record<
    DocumentType,
    Array<{ key: string; label: string; type: string }>
  > = {
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
    consulta: [
      { key: "doctor", label: "Médico", type: "text" },
      { key: "specialty", label: "Especialidade", type: "text" },
      { key: "hospital", label: "Clínica / Hospital", type: "text" },
      { key: "date", label: "Data da Consulta", type: "date" },
      { key: "reason", label: "Motivo da Consulta", type: "text" },
    ],
    cirurgia: [
      { key: "procedure", label: "Procedimento", type: "text" },
      { key: "doctor", label: "Médico Cirurgião", type: "text" },
      { key: "hospital", label: "Hospital", type: "text" },
      { key: "date", label: "Data da Cirurgia", type: "date" },
    ],
    outro: [
      { key: "custom_field_1", label: "Campo 1", type: "text" },
      { key: "custom_field_2", label: "Campo 2", type: "text" },
    ],
  };

  return fieldMap[type] || [];
};

const DOCUMENT_TYPES: { id: DocumentType; label: string }[] = [
  { id: "rg", label: "RG" },
  { id: "cpf", label: "CPF" },
  { id: "cnh", label: "CNH" },
  { id: "certificado", label: "Certificado" },
  { id: "receita", label: "Receita" },
  { id: "prontuario", label: "Prontuário" },
  { id: "laudo", label: "Laudo" },
  { id: "encaminhamento", label: "Encaminhamento" },
  { id: "consulta", label: "Consulta" },
  { id: "cirurgia", label: "Cirurgia" },
  { id: "outro", label: "Outro" },
];

export default function EditarDetalhePage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { showToast } = useToast();

  const doc = useDocument(id || "");
  const persons = usePersons();
  const { updateDocument } = useSafeDb();

  const tratamentos = useLiveQuery(() => db.tratamentos.toArray(), []) || [];
  const [isTratamentoModalOpen, setIsTratamentoModalOpen] = useState(false);

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

  const selectedTratamento = tratamentos.find(
    (t: any) => String(t.id) === formData.metadata.tratamento_id
  );

  const fields = getFieldsForType(formData.type);

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
      showToast("Documento atualizado com sucesso!", "success");
      router.push(`/detalhes?id=${id}`);
    } catch (error) {
      console.error("Erro ao atualizar:", error);
      trigger("error");
      showToast("Erro ao atualizar documento", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!doc) {
    return (
      <PageTransition>
        <main className="flex min-h-screen items-center justify-center bg-void px-5">
          <div className="rounded-[28px] border border-surface-border/50 bg-surface px-6 py-10 text-center shadow-sm">
            <p className="text-sm text-ink-muted">Documento não encontrado</p>
            <Button
              variant="primary"
              onClick={() => router.push("/")}
              className="mt-4"
            >
              Voltar
            </Button>
          </div>
        </main>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-32">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 pt-6 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                trigger("vibrate");
                router.back();
              }}
              aria-label="Voltar"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>

            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">
                Vault
              </p>
              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">
                Editar documento
              </h1>
              <p className="mt-1 truncate text-sm text-ink-muted">
                Atualize as informações de “{doc.title}”
              </p>
            </div>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface px-5 py-5 shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-[20px] border border-surface-border/50 bg-surface-raised shadow-sm">
                <FileText size={28} className="text-ice" />
              </div>

              <div className="min-w-0">
                <p className="text-sm text-ink-muted">Edição</p>
                <p className="truncate font-display text-lg font-semibold text-ink-primary">
                  {formData.title || "Sem título"}
                </p>
                <p className="mt-1 text-xs leading-5 text-ink-faint">
                  Revise os dados do documento e salve as alterações com segurança.
                </p>
              </div>
            </div>
          </motion.div>

          {/* VÍNCULO COM TRATAMENTO */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.02 }}
            className="rounded-[28px] border border-violet-500/30 bg-surface px-5 py-6 shadow-sm"
          >
            <div className="mb-3 flex items-center gap-2">
              <Activity size={16} className="text-violet-400" />
              <h2 className="font-display text-lg font-semibold text-ink-primary">
                Tratamento Vinculado
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                trigger("vibrate");
                setIsTratamentoModalOpen(true);
              }}
              className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3.5 text-left text-ink-primary transition-colors hover:border-violet-400/40"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Activity size={18} className="text-violet-400 shrink-0" />
                <span className="truncate font-medium">
                  {selectedTratamento ? selectedTratamento.nome : "Nenhum tratamento vinculado (Opcional)"}
                </span>
              </div>
              <span className="text-xs text-violet-400 shrink-0 font-medium">Alterar</span>
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.03 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface px-5 py-6 shadow-sm"
          >
            <div className="mb-5 flex items-center gap-2">
              <User size={16} className="text-ice" />
              <h2 className="font-display text-lg font-semibold text-ink-primary">
                Pessoa vinculada
              </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              {persons.map((person: any) => (
                <button
                  key={person.id}
                  onClick={() => handleChange("person_id", person.id!)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-all active:scale-95 ${
                    formData.person_id === person.id
                      ? "border-ice bg-ice/10 text-ice"
                      : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                  }`}
                >
                  {person.name}
                </button>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.06 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface px-5 py-6 shadow-sm"
          >
            <div className="mb-5 flex items-center gap-2">
              <Layers3 size={16} className="text-ice" />
              <h2 className="font-display text-lg font-semibold text-ink-primary">
                Classificação
              </h2>
            </div>

            <div className="mb-5">
              <label className="mb-2 block text-sm font-medium text-ink-primary">
                Categoria
              </label>
              <div className="flex flex-wrap gap-2">
                {Object.values(CATEGORIES).map((cat: any) => (
                  <button
                    key={cat.id}
                    onClick={() => handleChange("category_id", cat.id)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition-all active:scale-95 ${
                      formData.category_id === cat.id
                        ? "border-ice bg-ice/10 text-ice"
                        : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* SELETOR DE TIPO ESTILIZADO EM CARDS (SUBSTITUINDO O SELECT NATIVO) */}
            <div>
              <label className="mb-2 block text-sm font-medium text-ink-primary">
                Tipo de documento
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {DOCUMENT_TYPES.map((typeObj) => {
                  const active = formData.type === typeObj.id;
                  return (
                    <button
                      key={typeObj.id}
                      type="button"
                      onClick={() => {
                        trigger("vibrate");
                        handleChange("type", typeObj.id);
                      }}
                      className={`rounded-2xl border px-3 py-3 text-left text-xs font-medium transition-all active:scale-95 ${
                        active
                          ? "border-ice bg-ice/12 text-ice"
                          : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                      }`}
                    >
                      {typeObj.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.09 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface px-5 py-6 shadow-sm"
          >
            <div className="mb-5 flex items-center gap-2">
              <FileText size={16} className="text-ice" />
              <h2 className="font-display text-lg font-semibold text-ink-primary">
                Informações principais
              </h2>
            </div>

            <div className="space-y-4">
              <Input
                label="Título"
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                error={errors.title}
              />

              {fields.map((field: any, index: number) => (
                <motion.div
                  key={field.key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, delay: 0.02 * index }}
                >
                  <Input
                    label={field.label}
                    type={field.type === "date" ? "date" : "text"}
                    value={formData.metadata[field.key] || ""}
                    onChange={(e) =>
                      handleMetadataChange(field.key, e.target.value)
                    }
                  />
                </motion.div>
              ))}

              <TextArea
                label="Notas"
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: 0.16 }}
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

        {/* MODAL PARA SELECIONAR O TRATAMENTO */}
        <SelectionModal
          isOpen={isTratamentoModalOpen}
          onClose={() => setIsTratamentoModalOpen(false)}
          onSelect={(item: any) => {
            trigger("vibrate");
            handleMetadataChange("tratamento_id", item.id!);
          }}
          items={tratamentos}
          title="Vincular a Tratamento"
          placeholder="Buscar tratamento..."
          renderItem={(item: any) => (
            <div>
              <p className="font-medium text-ink-primary">{item.nome}</p>
              {item.condicao && (
                <p className="text-xs text-ink-muted capitalize">{item.condicao}</p>
              )}
            </div>
          )}
          getItemId={(item: any) => item.id!}
          getItemLabel={(item: any) => item.nome}
          onCreateNew={() => {
            setIsTratamentoModalOpen(false);
            trigger("vibrate");
            router.push("/saude/tratamentos/novo");
          }}
          createNewLabel="Novo Tratamento"
        />
      </main>
    </PageTransition>
  );
}
