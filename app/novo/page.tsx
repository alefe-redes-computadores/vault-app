"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Upload, Camera, X, Loader2, Save, Shield, FileText, Image as ImageIcon, ChevronRight, Plus,
} from "lucide-react";
import { usePersons } from "@/hooks/usePersons";
import { useSafeDb } from "@/hooks/useSafeDb";
import { useAuth } from "@/hooks/useAuth";
import { useHapticFeedback } from "@/lib/haptics";
import { uploadFile } from "@/lib/supabase/storage";
import { CATEGORIES, TYPE_CATEGORY_MAP, type CategoryId, type DocumentType, type Document, type Attachment, DOCUMENT_FIELDS } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { PageTransition } from "@/components/PageTransition";
import { scheduleDocumentExpiryNotification } from "@/lib/notifications";
import { db, safeAddInstituicao, safeAddTratamento, safeAddPerson } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { SelectionModal } from "@/components/SelectionModal";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useMedicos } from "@/hooks/useMedicos";
import { useFarmacias } from "@/hooks/useFarmacias";
import { useHospitais } from "@/hooks/useHospitais";

const applyMask = (value: string, type: string): string => {
  const digits = value.replace(/\D/g, "");

  if (type === "cpf") {
    return digits.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})/, "$1-$2").slice(0, 14);
  }
  if (type === "rg") {
    return digits.replace(/(\d{2})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})/, "$1-$2").slice(0, 13);
  }
  if (type === "cnh") {
    return digits.slice(0, 11);
  }
  if (type === "date") {
    return digits.replace(/(\d{2})(\d)/, "$1/$2").replace(/(\d{2})(\d)/, "$1/$2").slice(0, 10);
  }
  return value;
};

const getMaskType = (fieldKey: string, fieldType: string): string | null => {
  if (fieldKey === "cpf") return "cpf";
  if (fieldKey === "rg_number" || fieldKey === "number") return "rg";
  if (fieldType === "date") return "date"; // Aplica a máscara para todos os campos que seriam datas nativas
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
  outro: "Outro",
};

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function NewDocumentPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPersonId = searchParams.get("person_id");

  const { user } = useAuth();
  const { addDocument } = useSafeDb();
  const persons = usePersons();
  
  const { medicos } = useMedicos();
  const { farmacias } = useFarmacias();
  const { hospitais } = useHospitais();

  const instituicoes = useLiveQuery(() => db.instituicoes.toArray(), []) || [];
  const tratamentos = useLiveQuery(() => db.tratamentos.toArray(), []) || [];

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [localFiles, setLocalFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [isPharmacyModalOpen, setIsPharmacyModalOpen] = useState(false);
  const [isHospitalModalOpen, setIsHospitalModalOpen] = useState(false);
  const [isInstituicaoModalOpen, setIsInstituicaoModalOpen] = useState(false);
  const [isTratamentoModalOpen, setIsTratamentoModalOpen] = useState(false);
  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);

  const [isCreatingParent, setIsCreatingParent] = useState<{ type: "instituicao" | "tratamento" | "pessoa" | null }>({ type: null });
  const [newParentName, setNewParentName] = useState("");
  const [isSavingParent, setIsSavingParent] = useState(false);

  const userVaults = useLiveQuery(() => db.vaults.where("user_id").equals(user?.id || "").toArray(), [user?.id], []);

  // Garante que uma pessoa esteja selecionada
  useEffect(() => {
    if (persons.length > 0 && !formData.person_id && !initialPersonId) {
      setFormData(prev => ({ ...prev, person_id: persons[0].id! }));
    }
  }, [persons, formData.person_id, initialPersonId]);

  // Limpa os campos dinâmicos quando o tipo de documento muda
  useEffect(() => {
    const fields = DOCUMENT_FIELDS[formData.type] || [];
    const newMetadata: Record<string, any> = {};
    fields.forEach((field) => {
      newMetadata[field.key] = field.type === 'select' && field.options ? field.options[0] : "";
    });
    setFormData((prev) => ({ ...prev, metadata: newMetadata }));
  }, [formData.type]);

  // Filtra os tipos de documento baseado na categoria escolhida
  const availableTypes = useMemo(() => {
    return (Object.keys(TYPE_CATEGORY_MAP) as DocumentType[]).filter(
      type => TYPE_CATEGORY_MAP[type].includes(formData.category_id)
    );
  }, [formData.category_id]);

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

  const handleCreateParent = async () => {
    if (!newParentName.trim() || !user?.id) return;
    setIsSavingParent(true);
    trigger("vibrate");
    
    try {
      if (isCreatingParent.type === "instituicao") {
        const id = await safeAddInstituicao({ user_id: user.id, nome: newParentName.trim() });
        handleMetadataChange("institution", id);
      } else if (isCreatingParent.type === "tratamento") {
        const id = await safeAddTratamento({ user_id: user.id, nome: newParentName.trim(), status: "ativo" });
        handleMetadataChange("medication", id);
      } else if (isCreatingParent.type === "pessoa") {
        const id = await safeAddPerson({ user_id: user.id, name: newParentName.trim() });
        handleChange("person_id", id);
      }
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
    setFormData((prev) => ({ ...prev, attachments: prev.attachments.filter((a) => a.id !== id) }));
    trigger("vibrate");
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.person_id) newErrors.person_id = "Selecione uma pessoa";
    if (!formData.title.trim()) newErrors.title = "Título é obrigatório";

    const fields = DOCUMENT_FIELDS[formData.type] || [];
    fields.forEach((field) => {
      // Regra especial de validação para a C.I.N
      if (formData.type === 'rg' && field.key === 'rg_number') {
        const isOldRG = formData.metadata['modelo'] === 'RG (Antigo)';
        if (isOldRG && !formData.metadata[field.key]?.trim()) {
           newErrors[field.key] = "O número do RG é obrigatório no modelo antigo";
        }
        return;
      }
      if (field.required && !formData.metadata[field.key]?.trim()) {
        newErrors[field.key] = `${field.label} é obrigatório`;
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
          (element as HTMLElement).scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      // 1. Converter datas mascaradas de volta para um formato padrão YYYY-MM-DD para salvar no banco limpo
      const cleanMetadata = { ...formData.metadata };
      const fields = DOCUMENT_FIELDS[formData.type] || [];
      fields.forEach(field => {
        if (field.type === 'date' && cleanMetadata[field.key]) {
          const parts = cleanMetadata[field.key].split('/');
          if (parts.length === 3) {
            cleanMetadata[field.key] = `${parts[2]}-${parts[1]}-${parts[0]}`; // Convert DD/MM/YYYY to YYYY-MM-DD
          }
        }
      });

      const docData: Omit<Document, "id" | "created_at" | "updated_at" | "synced"> = {
        user_id: user?.id || "",
        person_id: formData.person_id,
        category_id: formData.category_id,
        type: formData.type,
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        metadata: cleanMetadata,
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

      if (cleanMetadata.expiry_date) {
        await scheduleDocumentExpiryNotification(docId, formData.title, cleanMetadata.expiry_date, CATEGORIES[formData.category_id].name, 30);
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

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCameraCapture} />

        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button onClick={() => { trigger("vibrate"); router.back(); }} className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95">
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">Vault</p>
              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">Novo documento</h1>
              <p className="mt-1 text-sm text-ink-muted">Preencha os dados e anexe arquivos.</p>
            </div>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-6">
          
          {/* Pessoa com Botão Personalizado */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
             <label className="mb-2 block text-sm font-medium text-ink-primary">Pessoa <span className="text-coral">*</span></label>
             <button
                onClick={() => { trigger("vibrate"); setIsPersonModalOpen(true); }}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${
                  errors.person_id ? "border-coral/50 bg-surface-raised" : "border-surface-border/50 bg-surface-raised"
                }`}
              >
                {formData.person_id ? persons.find(p => p.id === formData.person_id)?.name : "Selecionar pessoa..."}
             </button>
             {errors.person_id && <p className="mt-1 text-xs text-coral">{errors.person_id}</p>}
          </motion.div>

          {/* Categoria */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.04 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <p className="mb-3 text-sm font-medium text-ink-primary">Categoria <span className="text-coral">*</span></p>
            <div className="flex flex-wrap gap-2">
              {Object.values(CATEGORIES).map((cat: any) => {
                const active = formData.category_id === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      trigger("vibrate");
                      handleChange("category_id", cat.id);
                      // Reseta o tipo de documento se a nova categoria não contiver o tipo atual
                      if (!TYPE_CATEGORY_MAP[formData.type].includes(cat.id)) {
                         const firstValidType = (Object.keys(TYPE_CATEGORY_MAP) as DocumentType[]).find(t => TYPE_CATEGORY_MAP[t].includes(cat.id));
                         if (firstValidType) handleChange("type", firstValidType);
                      }
                    }}
                    className={`rounded-full border px-4 py-2.5 text-sm font-medium transition-all active:scale-95 ${
                      active ? "border-ice bg-ice/12 text-ice" : "border-surface-border/50 bg-surface-raised text-ink-muted"
                    }`}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* Tipo (Filtra baseado na Categoria) */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.08 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <label className="mb-2 block text-sm font-medium text-ink-primary">Tipo de documento <span className="text-coral">*</span></label>
            <button
              onClick={() => { trigger("vibrate"); setIsTypeModalOpen(true); }}
              className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary"
            >
              <span>{DOCUMENT_TYPE_LABELS[formData.type] || "Selecionar tipo..."}</span>
              <ChevronRight size={16} className="text-ink-muted" />
            </button>
          </motion.div>

          {/* Título */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.12 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <Input
              label="Título do documento"
              placeholder="Ex: Minha CNH, Nova Identidade..."
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              error={errors.title}
              required
            />
          </motion.div>

          {/* Campos dinâmicos */}
          <AnimatePresence mode="wait">
            {fields.length > 0 && (
              <motion.div key={formData.type} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
                <div className="mb-4">
                  <p className="text-sm font-medium text-ink-primary">Campos específicos</p>
                  <p className="mt-1 text-xs text-ink-muted">Os campos abaixo mudam conforme o tipo selecionado.</p>
                </div>

                <div className="space-y-4">
                  {fields.map((field) => {
                    
                    // Tratamento Especial para esconder RG no modelo C.I.N
                    if (formData.type === 'rg' && field.key === 'rg_number' && formData.metadata['modelo'] === 'C.I.N (Nova Identidade)') {
                       return null; 
                    }

                    const maskType = getMaskType(field.key, field.type);
                    const rawValue = formData.metadata[field.key] || "";
                    const displayedValue = maskType ? applyMask(rawValue, maskType) : rawValue;

                    // Select Simples em linha
                    if (field.type === 'select' && field.options) {
                      return (
                         <div key={field.key}>
                            <label className="mb-1.5 block text-sm font-medium text-ink-primary">{field.label}</label>
                            <div className="flex flex-wrap gap-2">
                               {field.options.map(opt => (
                                  <button
                                     key={opt}
                                     onClick={() => handleMetadataChange(field.key, opt)}
                                     className={`rounded-full border px-3.5 py-2 text-xs font-medium transition-all ${
                                        formData.metadata[field.key] === opt ? "border-ice bg-ice/12 text-ice" : "border-surface-border/50 bg-surface-raised text-ink-muted"
                                     }`}
                                  >
                                    {opt}
                                  </button>
                               ))}
                            </div>
                         </div>
                      );
                    }

                    const isComplexSelect = field.type === "select" || field.key === "institution" || field.key === "medication";
                    if (isComplexSelect && !field.options) {
                      let items: any[] = [];
                      let renderItem: any, getItemLabel: any, getItemId: any, isModalOpen = false, setIsModalOpen: any, onSelect: any, placeholder = "", title = "", onCreateNew: any, createNewLabel = "";

                      if (field.key === "doctor") {
                        items = medicos;
                        renderItem = (item: any) => (<div><p className="font-medium text-ink-primary">{item.nome}</p></div>);
                        getItemLabel = (item: any) => item.nome; getItemId = (item: any) => item.id!;
                        isModalOpen = isDoctorModalOpen; setIsModalOpen = setIsDoctorModalOpen;
                        onSelect = (item: any) => { handleMetadataChange(field.key, String(item.id)); };
                        title = "Médico"; createNewLabel = "Criar médico"; onCreateNew = () => { setIsModalOpen(false); router.push("/saude/medicos/novo"); };
                      } else if (field.key === "pharmacy") {
                         items = farmacias;
                         renderItem = (item: any) => (<div><p className="font-medium text-ink-primary">{item.nome}</p></div>);
                         getItemLabel = (item: any) => item.nome; getItemId = (item: any) => item.id!;
                         isModalOpen = isPharmacyModalOpen; setIsModalOpen = setIsPharmacyModalOpen;
                         onSelect = (item: any) => { handleMetadataChange(field.key, String(item.id)); };
                         title = "Farmácia"; createNewLabel = "Criar farmácia"; onCreateNew = () => { setIsModalOpen(false); router.push("/saude/farmacias/novo"); };
                      } else if (field.key === "hospital") {
                         items = hospitais;
                         renderItem = (item: any) => (<div><p className="font-medium text-ink-primary">{item.nome}</p></div>);
                         getItemLabel = (item: any) => item.nome; getItemId = (item: any) => item.id!;
                         isModalOpen = isHospitalModalOpen; setIsModalOpen = setIsHospitalModalOpen;
                         onSelect = (item: any) => { handleMetadataChange(field.key, String(item.id)); };
                         title = "Hospital"; createNewLabel = "Criar hospital"; onCreateNew = () => { setIsModalOpen(false); router.push("/saude/hospitais/novo"); };
                      }

                      const selectedItem = items.find((item: any) => String(item.id) === formData.metadata[field.key]);

                      return (
                        <div key={field.key}>
                          <label className="mb-1.5 block text-sm font-medium text-ink-primary">{field.label}</label>
                          <button
                            onClick={() => { trigger("vibrate"); setIsModalOpen(true); }}
                            className={`w-full rounded-2xl border px-4 py-3 text-left text-ink-primary ${errors[field.key] ? "border-coral/50 bg-surface-raised" : "border-surface-border/50 bg-surface-raised"}`}
                          >
                            {selectedItem ? selectedItem.nome : `Selecionar ${field.label.toLowerCase()}`}
                          </button>
                          {isModalOpen && (
                             <SelectionModal
                               isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSelect={onSelect} items={items}
                               title={title} placeholder="Buscar..." renderItem={renderItem} getItemId={getItemId} getItemLabel={getItemLabel} onCreateNew={onCreateNew} createNewLabel={createNewLabel}
                             />
                          )}
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
                          const raw = maskType ? e.target.value.replace(/\D/g, "") : e.target.value;
                          handleMetadataChange(field.key, raw);
                        }}
                        placeholder={field.type === 'date' ? "DD/MM/AAAA" : `Digite ${field.label.toLowerCase()}...`}
                        required={field.required}
                        error={errors[field.key]}
                      />
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Cofre */}
          {userVaults && userVaults.length > 0 && (
            <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.16 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
              <label className="mb-3 block text-sm font-medium text-ink-primary">Compartilhar com cofre</label>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => { trigger("vibrate"); handleChange("vault_id", undefined); }} className={`rounded-full border px-3 py-2 text-xs font-medium transition-all active:scale-95 ${formData.vault_id === undefined ? "border-ice bg-ice/12 text-ice" : "border-surface-border/50 bg-surface-raised text-ink-muted"}`}>Nenhum</button>
                {userVaults.map((vault: any) => (
                  <button key={vault.id} onClick={() => { trigger("vibrate"); handleChange("vault_id", vault.id!); }} className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-all active:scale-95 ${formData.vault_id === vault.id ? "border-ice bg-ice/12 text-ice" : "border-surface-border/50 bg-surface-raised text-ink-muted"}`}>
                    <Shield size={12} /> {vault.name}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Notas */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.2 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <TextArea label="Notas (opcional)" placeholder="Informações adicionais..." value={formData.description} onChange={(e) => handleChange("description", e.target.value)} />
          </motion.div>

          {/* Anexos */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.24 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <div className="mb-3">
              <label className="block text-sm font-medium text-ink-primary">Anexos</label>
              <p className="mt-1 text-xs text-ink-muted">PDF ou imagem direto pela câmera.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" className="flex items-center justify-center gap-2" onClick={() => fileInputRef.current?.click()} disabled={uploading || loading}>
                <Upload size={16} /> Upload
              </Button>
              <Button variant="secondary" className="flex items-center justify-center gap-2" onClick={() => cameraInputRef.current?.click()} disabled={uploading || loading}>
                <Camera size={16} /> Câmera
              </Button>
            </div>
            <AnimatePresence>
              {formData.attachments.map((att) => (
                <motion.div key={att.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="mt-4 flex items-center gap-3 rounded-2xl border border-surface-border/50 bg-surface-raised px-3 py-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface border border-surface-border/40">
                    {att.type === "image" ? <ImageIcon size={16} className="text-ice" /> : <FileText size={16} className="text-ice" />}
                  </div>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-ink-primary">{att.name}</p></div>
                  <button onClick={() => removeAttachment(att.id)} className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted hover:text-ink-primary"><X size={14} /></button>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </section>

        {/* Modal Dinâmico de Tipos */}
        <BottomSheet isOpen={isTypeModalOpen} onClose={() => setIsTypeModalOpen(false)} title="Selecionar tipo">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
             {availableTypes.map((typeObj) => (
               <button
                  key={typeObj}
                  onClick={() => { trigger("vibrate"); handleChange("type", typeObj); setIsTypeModalOpen(false); }}
                  className={`rounded-2xl border px-3 py-4 text-left transition-colors ${formData.type === typeObj ? "border-ice bg-ice/10 text-ice" : "border-surface-border/50 bg-surface text-ink-primary"}`}
               >
                 <span className="text-sm font-medium block">{DOCUMENT_TYPE_LABELS[typeObj]}</span>
               </button>
             ))}
          </div>
        </BottomSheet>

        {/* Modal de Seleção de Pessoas */}
        <SelectionModal
           isOpen={isPersonModalOpen} onClose={() => setIsPersonModalOpen(false)} onSelect={(item: any) => handleChange("person_id", item.id)} items={persons}
           title="Selecionar Pessoa" placeholder="Buscar perfil..."
           renderItem={(item: any) => (<p className="font-medium text-ink-primary">{item.name}</p>)}
           getItemId={(item: any) => item.id!} getItemLabel={(item: any) => item.name}
           onCreateNew={() => { setIsPersonModalOpen(false); setIsCreatingParent({ type: "pessoa" }); }} createNewLabel="Cadastrar Pessoa"
        />

        <BottomSheet isOpen={isCreatingParent.type !== null} onClose={() => { setIsCreatingParent({ type: null }); setNewParentName(""); }} title={`Cadastrar ${isCreatingParent.type}`}>
          <div className="space-y-4 px-1 pb-2">
            <Input label={`Nome`} placeholder="Digite o nome..." value={newParentName} onChange={(e) => setNewParentName(e.target.value)} autoFocus />
            <Button variant="primary" fullWidth onClick={handleCreateParent} disabled={isSavingParent || !newParentName.trim()} className="flex items-center justify-center gap-2">
              {isSavingParent ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Salvar e selecionar
            </Button>
          </div>
        </BottomSheet>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <Button variant="primary" size="lg" fullWidth onClick={handleSubmit} disabled={loading || uploading} className="flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Salvando...</> : <><Save size={16} /> Salvar documento</>}
          </Button>
        </div>
      </main>
    </PageTransition>
  );
}
