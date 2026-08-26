// app/detalhes/editar/page.tsx
"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Save,
  Loader2,
  FileText,
  Layers3,
  Trash2,
  Upload,
  Camera,
  X,
  Image as ImageIcon,
  CheckCircle2,
  Contact,
  CreditCard,
  Scroll,
  Landmark,
  Award,
  Folder,
  Pill,
  Heart,
  FileOutput,
  Stethoscope,
  Activity as ActivityIcon,
} from "lucide-react";
import { useDocument } from "@/hooks/useDocuments";
import { usePersons } from "@/hooks/usePersons";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { useSafeDb } from "@/hooks/useSafeDb";
import { useHapticFeedback } from "@/lib/haptics";
import { useToast } from "@/components/ToastProvider";
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
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { SelectionModal } from "@/components/SelectionModal";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { uploadFile } from "@/lib/supabase/storage";
import { useAuth } from "@/hooks/useAuth";

const TYPE_CATEGORY_MAP: Record<string, CategoryId[]> = {
  rg: ["pessoal"],
  cpf: ["pessoal"],
  cnh: ["pessoal"],
  certidao_nascimento: ["pessoal"],
  titulo_eleitor: ["pessoal"],
  certificado: ["pessoal", "empresa"],
  receita: ["saude"],
  prontuario: ["saude"],
  laudo: ["saude"],
  encaminhamento: ["saude"],
  consulta: ["saude"],
  cirurgia: ["saude"],
  exame_sangue: ["saude"],
  exame_imagem: ["saude"],
  credencial: ["saude", "empresa", "outros"],
  outro: ["saude", "pessoal", "empresa", "outros"],
};

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
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
  exame_imagem: "Exame de Imagem",
  credencial: "Credencial / Carteirinha",
  outro: "Outro",
};

interface DocField {
  key: string;
  label: string;
  type: string;
  options?: string[];
}

const getFieldsForType = (type: string): DocField[] => {
  const map: Record<string, DocField[]> = {
    rg: [
      { key: "modelo", label: "Modelo", type: "select", options: ["C.I.N (Nova Identidade)", "RG Antigo"] },
      { key: "cpf", label: "CPF", type: "text" },
      { key: "rg_number", label: "Número do RG", type: "text" },
      { key: "issue_date", label: "Data de emissão", type: "date" },
      { key: "issuer", label: "Órgão emissor", type: "text" },
    ],
    cpf: [{ key: "number", label: "Número do CPF", type: "text" }],
    cnh: [
      { key: "number", label: "Número da CNH", type: "text" },
      { key: "category", label: "Categoria", type: "text" },
      { key: "issue_date", label: "Data de emissão", type: "date" },
      { key: "expiry_date", label: "Data de validade", type: "date" },
    ],
    receita: [
      { key: "medication", label: "Medicamento", type: "text" },
      { key: "dosage", label: "Dosagem", type: "text" },
      { key: "doctor", label: "Médico", type: "text" },
      { key: "prescription_date", label: "Data da receita", type: "date" },
    ],
    outro: [{ key: "custom_field_1", label: "Campo 1", type: "text" }],
  };
  return map[type] || map.outro;
};

const TYPE_ICONS: Record<string, any> = {
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

export default function EditarDetalhePage() {
  const { trigger } = useHapticFeedback();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "";

  const { user } = useAuth();
  const doc = useDocument(id);
  const persons = usePersons() as Person[];
  const { activePersonId } = useActivePersonId();
  const { updateDocument, deleteDocument } = useSafeDb();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [localFiles, setLocalFiles] = useState<File[]>([]);

  const [formData, setFormData] = useState({
    person_id: activePersonId || "",
    category_id: "pessoal" as CategoryId,
    type: "rg" as DocumentType,
    title: "",
    description: "",
    metadata: {} as Record<string, any>,
    attachments: [] as Attachment[],
  });

  useEffect(() => {
    if (doc) {
      setFormData({
        person_id: doc.person_id || activePersonId || "",
        category_id: doc.category_id,
        type: doc.type as DocumentType,
        title: doc.title,
        description: doc.description || "",
        metadata: doc.metadata || {},
        attachments: doc.attachments || [],
      });
    }
  }, [doc, activePersonId]);

  const fields = useMemo(() => getFieldsForType(formData.type), [formData.type]);

  const availableTypes = useMemo(() => {
    return (Object.keys(TYPE_CATEGORY_MAP) as DocumentType[]).filter((type) =>
      TYPE_CATEGORY_MAP[type].includes(formData.category_id)
    );
  }, [formData.category_id]);

  const handleChange = (field: keyof typeof formData, value: any) => {
    if (field === "category_id") {
      const allowedTypes = (Object.keys(TYPE_CATEGORY_MAP) as DocumentType[]).filter((t) =>
        TYPE_CATEGORY_MAP[t].includes(value)
      );
      const defaultType = allowedTypes.includes(formData.type) ? formData.type : allowedTypes[0] || "outro";
      setFormData((prev) => ({ ...prev, category_id: value, type: defaultType }));
      return;
    }

    if (field === "type") {
      setFormData((prev) => ({ ...prev, type: value, metadata: {} }));
      return;
    }

    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleMetadataChange = (key: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      metadata: { ...prev.metadata, [key]: value },
    }));
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
      setFormData((prev) => ({ ...prev, attachments: [...prev.attachments, newAttachment] }));
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
      setFormData((prev) => ({ ...prev, attachments: [...prev.attachments, newAttachment] }));
    }
    e.target.value = "";
  };

  const removeAttachment = (attId: string) => {
    const attachmentToRemove = formData.attachments.find((a) => a.id === attId);
    if (attachmentToRemove && attachmentToRemove.url.startsWith("blob:")) {
      URL.revokeObjectURL(attachmentToRemove.url);
      setLocalFiles((prev) => prev.filter((f) => f.name !== attachmentToRemove.name));
    }
    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((a) => a.id !== attId),
    }));
    trigger("vibrate");
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
      let finalAttachments = [...formData.attachments];
      if (localFiles.length > 0 && user) {
        const uploadedAttachments: Attachment[] = [];
        for (const file of localFiles) {
          const { url } = await uploadFile(user.id, file, formData.category_id);
          if (url) {
            const att = formData.attachments.find((a) => a.name === file.name || a.name.startsWith("foto_"));
            if (att) {
              uploadedAttachments.push({ ...att, url });
            }
          }
        }

        finalAttachments = formData.attachments.map((att) => {
          const updated = uploadedAttachments.find((u) => u.id === att.id);
          return updated || att;
        });

        formData.attachments.forEach((att) => {
          if (att.url.startsWith("blob:")) URL.revokeObjectURL(att.url);
        });
        setLocalFiles([]);
      }

      await updateDocument(id, {
        person_id: formData.person_id || activePersonId || "",
        category_id: formData.category_id,
        type: formData.type,
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        metadata: formData.metadata,
        attachments: finalAttachments,
      });

      trigger("success");
      showToast("Documento atualizado com sucesso", "success");
      router.replace(`/detalhes?id=${id}`);
    } catch (error) {
      trigger("error");
      showToast("Erro ao atualizar documento", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await deleteDocument(id);
      trigger("success");
      showToast("Documento excluído", "success");
      router.replace("/");
    } catch (error) {
      trigger("error");
      showToast("Erro ao excluir documento", "error");
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (!doc) {
    return (
      <PageTransition>
        <main className="flex min-h-screen items-center justify-center bg-void px-5">
          <div className="w-full max-w-sm rounded-[28px] border border-surface-border/50 bg-surface px-6 py-8 text-center shadow-sm">
            <p className="text-sm text-ink-muted">Documento não encontrado</p>
            <Button variant="primary" onClick={() => router.replace("/")} className="mt-5">
              Voltar
            </Button>
          </div>
        </main>
      </PageTransition>
    );
  }

  const selectedTypeLabel = DOCUMENT_TYPE_LABELS[formData.type] || "Selecione o tipo";
  const activePersonObj = persons.find((p) => p.id === formData.person_id) || persons[0];

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 pt-6 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  trigger("vibrate");
                  router.back();
                }}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
                type="button"
                aria-label="Voltar"
              >
                <ArrowLeft size={18} className="text-ink-primary" />
              </button>
              <div className="min-w-0">
                <h1 className="font-display text-xl font-semibold text-ink-primary">Editar documento</h1>
              </div>
            </div>

            <button
              onClick={() => {
                trigger("vibrate");
                setShowDeleteModal(true);
              }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-coral/20 bg-coral/10 text-coral transition-all active:scale-95"
              type="button"
              aria-label="Excluir documento"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-6">
          {/* PACIENTE / PERFIL VINCULADO AUTOMATICAMENTE */}
          <div className="rounded-[24px] border border-surface-border/50 bg-surface px-4 py-3 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ice/10 text-ice">
                <CheckCircle2 size={16} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-ink-muted font-mono">Vinculado ao perfil</p>
                <p className="text-xs font-bold text-ink-primary">{activePersonObj?.name || "Perfil Padrão"}</p>
              </div>
            </div>
            <span className="text-[10px] text-ice font-medium bg-ice/10 px-2 py-1 rounded-lg">Automático</span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: 0.03 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface px-4 py-4 shadow-sm"
          >
            <p className="mb-3 text-sm font-medium text-ink-primary">Categoria</p>
            <div className="flex flex-wrap gap-2">
              {Object.values(CATEGORIES).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleChange("category_id", cat.id)}
                  className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all active:scale-95 ${
                    formData.category_id === cat.id
                      ? "border-ice bg-ice/12 text-ice"
                      : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                  }`}
                  type="button"
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                  {cat.name}
                </button>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: 0.06 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface px-4 py-4 shadow-sm"
          >
            <label className="mb-3 block text-sm font-medium text-ink-primary">Tipo</label>
            <button
              onClick={() => {
                trigger("vibrate");
                setIsTypeModalOpen(true);
              }}
              className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary"
              type="button"
            >
              <span>{selectedTypeLabel}</span>
              <Layers3 size={16} className="text-ink-muted" />
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: 0.09 }}
            className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface px-4 py-4 shadow-sm"
          >
            <Input
              label="Título"
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              error={errors.title}
            />

            {fields.map((field) => (
              <Input
                key={field.key}
                label={field.label}
                type={field.type === "date" ? "date" : "text"}
                value={String(formData.metadata[field.key] ?? "")}
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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: 0.12 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="mb-3">
              <label className="block text-sm font-medium text-ink-primary">Anexos</label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="secondary"
                className="flex items-center justify-center gap-2"
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                <Upload size={16} /> Arquivo
              </Button>
              <Button
                variant="secondary"
                className="flex items-center justify-center gap-2"
                onClick={() => cameraInputRef.current?.click()}
                type="button"
              >
                <Camera size={16} /> Câmera
              </Button>
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
              <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={handleCameraCapture} className="hidden" />
            </div>

            <AnimatePresence>
              {formData.attachments.map((att) => (
                <motion.div
                  key={att.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="mt-4 flex items-center gap-3 rounded-2xl border border-surface-border/50 bg-surface-raised px-3.5 py-3"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface border border-surface-border/40">
                    {att.type === "image" ? <ImageIcon size={16} className="text-ice" /> : <FileText size={16} className="text-ice" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-primary">{att.name}</p>
                  </div>
                  <button
                    onClick={() => removeAttachment(att.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted hover:text-ink-primary"
                    type="button"
                    aria-label={`Remover anexo ${att.name}`}
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
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

        <BottomSheet isOpen={isTypeModalOpen} onClose={() => setIsTypeModalOpen(false)} title="Selecionar tipo">
          <div className="grid grid-cols-2 gap-3 px-1 pb-4">
            {availableTypes.map((typeObj) => {
              const Icon = TYPE_ICONS[typeObj] || FileText;
              const isActive = formData.type === typeObj;

              return (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  key={typeObj}
                  onClick={() => {
                    trigger("vibrate");
                    handleChange("type", typeObj);
                    setIsTypeModalOpen(false);
                  }}
                  className={`relative flex flex-col items-start rounded-[22px] border p-4 text-left transition-all ${
                    isActive ? "border-ice bg-ice/10" : "border-surface-border/50 bg-surface hover:bg-surface-raised"
                  }`}
                  type="button"
                >
                  <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full ${isActive ? 'bg-ice/20 text-ice' : 'bg-surface-raised text-ink-muted'}`}>
                    <Icon size={20} />
                  </div>
                  <span className={`text-sm font-semibold mb-1 ${isActive ? 'text-ice' : 'text-ink-primary'}`}>
                    {DOCUMENT_TYPE_LABELS[typeObj]}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </BottomSheet>

        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          title="Excluir documento"
          message={`Tem certeza que deseja excluir "${formData.title}"? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          isLoading={deleting}
          type="danger"
        />
      </main>
    </PageTransition>
  );
}
