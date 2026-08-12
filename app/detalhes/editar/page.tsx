"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Save, Loader2, FileText, Layers3, Trash2,
  Contact, CreditCard, Scroll, Landmark, Award, Pill, Heart, FileOutput, Stethoscope, Activity as ActivityIcon, Folder,
  Upload, Camera, X, Image as ImageIcon
} from "lucide-react";
import { useDocument } from "@/hooks/useDocuments";
import { usePersons } from "@/hooks/usePersons";
import { useSafeDb } from "@/hooks/useSafeDb";
import { useHapticFeedback } from "@/lib/haptics";
import { CATEGORIES, TYPE_CATEGORY_MAP, type CategoryId, type DocumentType, DOCUMENT_FIELDS, type Attachment } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { PageTransition } from "@/components/PageTransition";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { SelectionModal } from "@/components/SelectionModal";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { db } from "@/lib/db";
import { useMedicos } from "@/hooks/useMedicos";
import { useFarmacias } from "@/hooks/useFarmacias";
import { useHospitais } from "@/hooks/useHospitais";
import { useLiveQuery } from "dexie-react-hooks";
import { uploadFile } from "@/lib/supabase/storage";
import { useAuth } from "@/hooks/useAuth";

// FUNÇÕES DE MÁSCARA IGUAIS À TELA DE CRIAÇÃO
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
  if (fieldType === "date") return "date"; 
  return null;
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

export default function EditarDetalhePage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "";

  const { user } = useAuth();
  const doc = useDocument(id);
  const persons = usePersons();
  const { updateDocument } = useSafeDb();

  const { medicos } = useMedicos();
  const { farmacias } = useFarmacias();
  const { hospitais } = useHospitais();
  const instituicoes = useLiveQuery(() => db.instituicoes.toArray(), []) || [];
  const tratamentos = useLiveQuery(() => db.tratamentos.toArray(), []) || [];

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);

  // Modais dinâmicos
  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [isPharmacyModalOpen, setIsPharmacyModalOpen] = useState(false);
  const [isHospitalModalOpen, setIsHospitalModalOpen] = useState(false);
  
  const [localFiles, setLocalFiles] = useState<File[]>([]);
  
  const [formData, setFormData] = useState({
    person_id: "",
    category_id: "pessoal" as CategoryId,
    type: "rg" as DocumentType,
    title: "",
    description: "",
    metadata: {} as Record<string, any>,
    attachments: [] as Attachment[],
  });

  useEffect(() => {
    if (doc) {
      const loadedMetadata = { ...doc.metadata };
      
      // Converte datas YYYY-MM-DD ou números brutos do banco para DD/MM/YYYY visualmente
      Object.keys(loadedMetadata).forEach((key) => {
        const val = loadedMetadata[key];
        if (typeof val === 'string') {
          if (val.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [y, m, d] = val.split('-');
            loadedMetadata[key] = `${d}/${m}/${y}`;
          } else if (val.match(/^\d{8}$/)) { // Salva o dia que o usuário digitou sem barra ex: 23052025
            const d = val.substring(0, 2);
            const m = val.substring(2, 4);
            const y = val.substring(4, 8);
            loadedMetadata[key] = `${d}/${m}/${y}`;
          }
        }
      });

      setFormData({
        person_id: doc.person_id || "",
        category_id: doc.category_id,
        type: doc.type as DocumentType,
        title: doc.title,
        description: doc.description || "",
        metadata: loadedMetadata,
        attachments: doc.attachments || [],
      });
    }
  }, [doc]);

  const fields = useMemo(() => DOCUMENT_FIELDS[formData.type] || [], [formData.type]);
  const availableTypes = useMemo(() => {
    return (Object.keys(TYPE_CATEGORY_MAP) as DocumentType[]).filter(
      type => TYPE_CATEGORY_MAP[type].includes(formData.category_id)
    );
  }, [formData.category_id]);

  const handleChange = (field: keyof typeof formData, value: any) => {
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
      const cleanMetadata = { ...formData.metadata };
      
      // Converte DD/MM/YYYY de volta para YYYY-MM-DD para salvar certo no banco
      fields.forEach(field => {
        if (field.type === 'date' && cleanMetadata[field.key]) {
          const parts = cleanMetadata[field.key].split('/');
          if (parts.length === 3) {
            cleanMetadata[field.key] = `${parts[2]}-${parts[1]}-${parts[0]}`; 
          }
        }
      });

      // Lógica de upload de novos arquivos
      let finalAttachments = [...formData.attachments];
      if (localFiles.length > 0 && user) {
        setUploading(true);
        const folder = formData.category_id;
        const uploadedAttachments: Attachment[] = [];

        for (let i = 0; i < localFiles.length; i++) {
          const file = localFiles[i];
          const attachment = formData.attachments.find(a => a.name === file.name || a.name.startsWith("foto_"));
          if (!attachment) continue;

          const { url, error } = await uploadFile(user.id, file, folder);
          if (!error && url) {
            uploadedAttachments.push({ ...attachment, url });
          }
        }

        finalAttachments = formData.attachments.map((att) => {
          const updated = uploadedAttachments.find((u) => u.id === att.id);
          return updated || att;
        });

        formData.attachments.forEach((att) => {
          if (att.url.startsWith("blob:")) URL.revokeObjectURL(att.url);
        });
      }

      await updateDocument(id, {
        person_id: formData.person_id,
        category_id: formData.category_id,
        type: formData.type,
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        metadata: cleanMetadata,
        attachments: finalAttachments,
      });

      trigger("success");
      router.push(`/detalhes?id=${id}`);
    } catch (error) {
      console.error("Erro ao atualizar:", error);
      trigger("error");
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await db.documents.delete(id);
      await db.syncQueue.add({
        id: crypto.randomUUID(),
        table: 'documents',
        operation: 'delete',
        payload: { id },
        created_at: new Date().toISOString()
      });
      trigger("success");
      router.push("/"); 
    } catch (error) {
      console.error("Erro ao excluir:", error);
      trigger("error");
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
            <Button variant="primary" onClick={() => router.push("/")} className="mt-5">Voltar</Button>
          </div>
        </main>
      </PageTransition>
    );
  }

  const selectedTypeLabel = DOCUMENT_TYPE_LABELS[formData.type] || "Selecione o tipo";

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 pt-6 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { trigger("vibrate"); router.back(); }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">Vault</p>
              <h1 className="font-display text-xl font-semibold text-ink-primary">Editar documento</h1>
            </div>
            <button
              onClick={() => { trigger("vibrate"); setShowDeleteModal(true); }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-coral/20 bg-coral/10 text-coral transition-all active:scale-95"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-[28px] border border-surface-border/50 bg-surface px-5 py-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-surface-border/50 bg-surface-raised">
                <FileText size={22} className="text-ice" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-ink-muted">Documento atual</p>
                <h2 className="line-clamp-2 break-words font-display text-lg font-semibold leading-tight text-ink-primary">
                  {formData.title || "Sem título"}
                </h2>
                <p className="mt-1 text-xs leading-5 text-ink-faint">Atualize os dados visíveis do documento.</p>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }} className="rounded-[28px] border border-surface-border/50 bg-surface px-4 py-4 shadow-sm">
            <p className="mb-3 text-sm font-medium text-ink-primary">Pessoa</p>
            <div className="flex flex-wrap gap-2">
              {persons.map((person: any) => (
                <button
                  key={person.id}
                  onClick={() => handleChange("person_id", person.id!)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${formData.person_id === person.id ? "border-ice bg-ice/12 text-ice" : "border-surface-border/50 bg-surface-raised text-ink-muted"}`}
                >
                  {person.name}
                </button>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className="rounded-[28px] border border-surface-border/50 bg-surface px-4 py-4 shadow-sm">
            <p className="mb-3 text-sm font-medium text-ink-primary">Categoria</p>
            <div className="flex flex-wrap gap-2">
              {Object.values(CATEGORIES).map((cat: any) => (
                <button
                  key={cat.id}
                  onClick={() => handleChange("category_id", cat.id)}
                  className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all ${formData.category_id === cat.id ? "border-ice bg-ice/12 text-ice" : "border-surface-border/50 bg-surface-raised text-ink-muted"}`}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                  {cat.name}
                </button>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }} className="rounded-[28px] border border-surface-border/50 bg-surface px-4 py-4 shadow-sm">
            <label className="mb-3 block text-sm font-medium text-ink-primary">Tipo</label>
            <button
               onClick={() => { trigger("vibrate"); setIsTypeModalOpen(true); }}
               className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary"
             >
               <span>{selectedTypeLabel}</span>
               <Layers3 size={16} className="text-ink-muted" />
             </button>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface px-4 py-4 shadow-sm">
            <Input label="Título" value={formData.title} onChange={(e) => handleChange("title", e.target.value)} error={errors.title} />

            {/* RENDERIZAÇÃO INTELIGENTE DOS CAMPOS (IGUAL À CRIAÇÃO) */}
            {fields.map((field: any) => {
               if (formData.type === 'rg' && field.key === 'rg_number' && formData.metadata['modelo'] === 'C.I.N (Nova Identidade)') {
                  return null; 
               }

               const maskType = getMaskType(field.key, field.type);
               const rawValue = formData.metadata[field.key] || "";
               const displayedValue = maskType ? applyMask(rawValue, maskType) : rawValue;

               if (field.type === 'select' && field.options) {
                 return (
                    <div key={field.key}>
                       <label className="mb-1.5 block text-sm font-medium text-ink-primary">{field.label}</label>
                       <div className="flex flex-wrap gap-2">
                          {field.options.map((opt: string) => (
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
                 let renderItem: any, getItemLabel: any, getItemId: any, isModalOpen = false, setIsModalOpen: any, onSelect: any, title = "";

                 if (field.key === "doctor") {
                   items = medicos; title = "Médico";
                   renderItem = (item: any) => (<p className="font-medium text-ink-primary">{item.nome}</p>);
                   getItemLabel = (item: any) => item.nome; getItemId = (item: any) => item.id!;
                   isModalOpen = isDoctorModalOpen; setIsModalOpen = setIsDoctorModalOpen;
                   onSelect = (item: any) => { handleMetadataChange(field.key, String(item.id)); };
                 } else if (field.key === "pharmacy") {
                    items = farmacias; title = "Farmácia";
                    renderItem = (item: any) => (<p className="font-medium text-ink-primary">{item.nome}</p>);
                    getItemLabel = (item: any) => item.nome; getItemId = (item: any) => item.id!;
                    isModalOpen = isPharmacyModalOpen; setIsModalOpen = setIsPharmacyModalOpen;
                    onSelect = (item: any) => { handleMetadataChange(field.key, String(item.id)); };
                 } else if (field.key === "hospital") {
                    items = hospitais; title = "Hospital";
                    renderItem = (item: any) => (<p className="font-medium text-ink-primary">{item.nome}</p>);
                    getItemLabel = (item: any) => item.nome; getItemId = (item: any) => item.id!;
                    isModalOpen = isHospitalModalOpen; setIsModalOpen = setIsHospitalModalOpen;
                    onSelect = (item: any) => { handleMetadataChange(field.key, String(item.id)); };
                 }

                 const selectedItem = items.find((item: any) => String(item.id) === formData.metadata[field.key]);

                 return (
                   <div key={field.key}>
                     <label className="mb-1.5 block text-sm font-medium text-ink-primary">{field.label}</label>
                     <button onClick={() => { trigger("vibrate"); setIsModalOpen(true); }} className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary">
                       {selectedItem ? selectedItem.nome : `Selecionar ${field.label.toLowerCase()}`}
                     </button>
                     {isModalOpen && (
                        <SelectionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSelect={onSelect} items={items} title={title} placeholder="Buscar..." renderItem={renderItem} getItemId={getItemId} getItemLabel={getItemLabel} onCreateNew={() => setIsModalOpen(false)} createNewLabel="" />
                     )}
                   </div>
                 );
               }

               return (
                 <Input
                   key={field.key}
                   label={field.label}
                   type="text"
                   value={displayedValue}
                   onChange={(e) => {
                     const raw = maskType ? e.target.value.replace(/\D/g, "") : e.target.value;
                     handleMetadataChange(field.key, raw);
                   }}
                   placeholder={field.type === 'date' ? "DD/MM/AAAA" : `Digite ${field.label.toLowerCase()}...`}
                 />
               );
            })}

            <TextArea label="Notas" value={formData.description} onChange={(e) => handleChange("description", e.target.value)} />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
             <div className="mb-3">
               <label className="block text-sm font-medium text-ink-primary">Anexos</label>
             </div>
             <div className="grid grid-cols-2 gap-3">
               <Button variant="secondary" className="flex items-center justify-center gap-2" onClick={() => fileInputRef.current?.click()} disabled={uploading || loading}>
                 <Upload size={16} /> Arquivo
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

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
            <Button variant="primary" size="lg" fullWidth onClick={handleSubmit} disabled={loading || deleting || uploading} className="flex items-center justify-center gap-2">
              {loading || uploading ? <><Loader2 size={16} className="animate-spin" /> Salvando...</> : <><Save size={16} /> Salvar alterações</>}
            </Button>
          </motion.div>
        </section>

        {/* Modal de Tipo */}
        <BottomSheet isOpen={isTypeModalOpen} onClose={() => setIsTypeModalOpen(false)} title="Selecionar tipo">
          <div className="grid grid-cols-2 gap-3 px-1 pb-4">
             {availableTypes.map((typeObj) => {
               const TYPE_ICONS: Record<string, any> = {
                 rg: Contact, cpf: FileText, cnh: CreditCard,
                 certidao_nascimento: Scroll, titulo_eleitor: Landmark, certificado: Award,
                 receita: Pill, prontuario: Heart, laudo: FileText,
                 encaminhamento: FileOutput, consulta: Stethoscope, cirurgia: ActivityIcon, 
                 exame_sangue: ActivityIcon, exame_imagem: ActivityIcon, credencial: Contact,
                 outro: Folder,
               };
               const Icon = TYPE_ICONS[typeObj] || FileText;
               const isActive = formData.type === typeObj;

               return (
                 <motion.button
                    whileTap={{ scale: 0.95 }}
                    key={typeObj}
                    onClick={() => { trigger("vibrate"); handleChange("type", typeObj); setIsTypeModalOpen(false); }}
                    className={`relative flex flex-col items-start rounded-[22px] border p-4 text-left transition-all ${isActive ? "border-ice bg-ice/10" : "border-surface-border/50 bg-surface hover:bg-surface-raised"}`}
                 >
                   <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full ${isActive ? 'bg-ice/20 text-ice' : 'bg-surface-raised text-ink-muted'}`}><Icon size={20} /></div>
                   <span className={`text-sm font-semibold mb-1 ${isActive ? 'text-ice' : 'text-ink-primary'}`}>{DOCUMENT_TYPE_LABELS[typeObj]}</span>
                 </motion.button>
               );
             })}
          </div>
        </BottomSheet>

        <ConfirmationModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={handleDelete} title="Excluir documento" message={`Tem certeza que deseja excluir "${formData.title}"? Esta ação não pode ser desfeita.`} confirmLabel="Excluir" cancelLabel="Cancelar" isLoading={deleting} type="danger" />
      </main>
    </PageTransition>
  );
}
