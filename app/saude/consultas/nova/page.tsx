"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  Stethoscope,
  Calendar,
  Building2,
  UserCheck,
  Upload,
  Camera,
  X,
  Image as ImageIcon
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useHapticFeedback } from "@/lib/haptics";
import { uploadFile } from "@/lib/supabase/storage";
import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { PageTransition } from "@/components/PageTransition";
import { SelectionModal } from "@/components/SelectionModal";
import type { Attachment } from "@/lib/types";
import { useConsultas } from "@/hooks/useConsultas";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

function formatDateToDisplay(isoStr: string): string {
  if (!isoStr) return "";
  const parts = isoStr.split("-");
  if (parts.length !== 3) return isoStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function parseDateToISO(displayStr: string): string {
  const clean = displayStr.replace(/\D/g, "");
  if (clean.length !== 8) return new Date().toISOString().slice(0, 10);
  const day = clean.slice(0, 2);
  const month = clean.slice(2, 4);
  const year = clean.slice(4, 8);
  return `${year}-${month}-${day}`;
}

function handleDateMask(value: string): string {
  const clean = value.replace(/\D/g, "").slice(0, 8);
  if (clean.length > 4) {
    return `${clean.slice(0, 2)}/${clean.slice(2, 4)}/${clean.slice(4)}`;
  }
  if (clean.length > 2) {
    return `${clean.slice(0, 2)}/${clean.slice(2)}`;
  }
  return clean;
}

export default function NovaConsultaPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { user } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const medicos = useLiveQuery(() => db.medicos.toArray(), []) || [];
  const hospitais = useLiveQuery(() => db.hospitais.toArray(), []) || [];

  const { addConsulta } = useConsultas();

  const [medicoId, setMedicoId] = useState("");
  const [hospitalId, setHospitalId] = useState("");
  const [isMedicoModalOpen, setIsMedicoModalOpen] = useState(false);
  const [isHospitalModalOpen, setIsHospitalModalOpen] = useState(false);

  const todayISO = new Date().toISOString().slice(0, 10);
  const [dataDisplay, setDataDisplay] = useState(formatDateToDisplay(todayISO));
  
  const [status, setStatus] = useState<"agendada" | "realizada" | "cancelada">("agendada");
  const [motivo, setMotivo] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [localFile, setLocalFile] = useState<File | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const selectedMedico = medicos.find((m: any) => m.id === medicoId);
  const selectedHospital = hospitais.find((h: any) => h.id === hospitalId);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      trigger("vibrate");
      setLocalFile(file);
      setAttachment({
        id: crypto.randomUUID(),
        url: URL.createObjectURL(file),
        name: file.name,
        type: file.type.startsWith("image") ? "image" : "pdf",
        uploaded_at: new Date().toISOString(),
      });
    }
    e.target.value = "";
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      trigger("vibrate");
      setLocalFile(file);
      setAttachment({
        id: crypto.randomUUID(),
        url: URL.createObjectURL(file),
        name: `consulta_${Date.now()}.jpg`,
        type: "image",
        uploaded_at: new Date().toISOString(),
      });
    }
    e.target.value = "";
  };

  const removeAttachment = () => {
    if (attachment?.url.startsWith("blob:")) URL.revokeObjectURL(attachment.url);
    setAttachment(null);
    setLocalFile(null);
    trigger("vibrate");
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!medicoId) newErrors.medicoId = "Selecione o médico";
    if (!dataDisplay || dataDisplay.length < 10) newErrors.data = "Data inválida";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    trigger("vibrate");
    if (!validate()) {
      trigger("error");
      return;
    }

    setLoading(true);
    try {
      let anexoUrl: string | undefined;

      if (localFile && user) {
        const { url, error } = await uploadFile(user.id, localFile, "saude");
        if (!error && url) {
          anexoUrl = url;
          if (attachment?.url.startsWith("blob:")) URL.revokeObjectURL(attachment.url);
        }
      }

      const dataISO = parseDateToISO(dataDisplay);

      await addConsulta({
        especialidade: selectedMedico?.especialidade || "Geral",
        medico: selectedMedico?.nome || "Médico",
        medico_id: medicoId,
        hospital_id: hospitalId || undefined,
        data: dataISO,
        status,
        motivo: motivo.trim() || undefined,
        observacoes: observacoes.trim() || undefined,
      });

      trigger("success");
      router.push("/saude/consultas");
    } catch (error) {
      console.error("Erro ao salvar consulta:", error);
      trigger("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCameraCapture} />

        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { trigger("vibrate"); router.back(); }} 
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Stethoscope size={16} className="text-ice" />
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">Agenda</p>
              </div>
              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">Nova Consulta</h1>
            </div>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-6">
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <label className="mb-1.5 block text-sm font-medium text-ink-primary">Médico <span className="text-coral">*</span></label>
            <button 
              type="button"
              onClick={() => { trigger("vibrate"); setIsMedicoModalOpen(true); }} 
              className={`w-full rounded-2xl border px-4 py-3 text-left text-ink-primary transition-colors ${errors.medicoId ? "border-coral/50" : "border-surface-border/50"} bg-surface-raised flex items-center justify-between`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <UserCheck size={16} className="text-ice shrink-0" />
                <span className="truncate">{selectedMedico ? `Dr(a). ${selectedMedico.nome} (${selectedMedico.especialidade || 'Geral'})` : "Selecionar médico"}</span>
              </div>
            </button>
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.03 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <label className="mb-1.5 block text-sm font-medium text-ink-primary">Hospital / Clínica (Opcional)</label>
            <button 
              type="button"
              onClick={() => { trigger("vibrate"); setIsHospitalModalOpen(true); }} 
              className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Building2 size={16} className="text-ice shrink-0" />
                <span className="truncate">{selectedHospital ? selectedHospital.nome : "Selecionar local de atendimento"}</span>
              </div>
            </button>
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.06 }} className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-ink-primary">Data da Consulta <span className="text-coral">*</span></label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
                <input 
                  type="text" 
                  placeholder="DD/MM/AAAA"
                  maxLength={10}
                  value={dataDisplay} 
                  onChange={(e) => setDataDisplay(handleDateMask(e.target.value))} 
                  className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised pl-9 pr-4 py-3 text-ink-primary font-mono text-sm" 
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-ink-primary">Status</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["agendada", "realizada", "cancelada"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => { trigger("vibrate"); setStatus(st); }}
                    className={`rounded-xl border py-2 text-[11px] font-medium capitalize transition-all ${
                      status === st 
                        ? "border-ice bg-ice/15 text-ice shadow-sm" 
                        : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.09 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <Input label="Motivo / Assunto (Opcional)" placeholder="Ex: Retorno de exames, dor neuropática..." value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.12 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <TextArea label="Anotações e Prescrições (Opcional)" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Instruções do médico, exames solicitados..." />
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.15 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <div className="mb-3"><label className="block text-sm font-medium text-ink-primary">Comprovante / Anexo</label></div>
            {!attachment ? (
              <div className="grid grid-cols-2 gap-3">
                <Button variant="secondary" onClick={() => fileInputRef.current?.click()}><Upload size={16} />Upload</Button>
                <Button variant="secondary" onClick={() => cameraInputRef.current?.click()}><Camera size={16} />Câmera</Button>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-2xl border border-surface-border/50 bg-surface-raised px-3 py-3">
                <ImageIcon size={16} className="text-ice" />
                <p className="truncate text-sm font-medium flex-1">{attachment.name}</p>
                <button onClick={removeAttachment} className="text-ink-muted"><X size={14} /></button>
              </div>
            )}
          </motion.div>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <Button variant="primary" size="lg" fullWidth onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : "Salvar Consulta"}
          </Button>
        </div>

        <SelectionModal isOpen={isMedicoModalOpen} onClose={() => setIsMedicoModalOpen(false)} onSelect={(item: any) => setMedicoId(item.id!)} items={medicos} title="Selecionar Médico" renderItem={(item: any) => <div><p className="font-medium text-ink-primary">Dr(a). {item.nome}</p><p className="text-xs text-ink-muted">{item.especialidade || "Especialidade não informada"}</p></div>} getItemId={(item: any) => item.id!} getItemLabel={(item: any) => item.nome} onCreateNew={() => {}} createNewLabel="" />
        <SelectionModal isOpen={isHospitalModalOpen} onClose={() => setIsHospitalModalOpen(false)} onSelect={(item: any) => setHospitalId(item.id!)} items={hospitais} title="Selecionar Hospital / Clínica" renderItem={(item: any) => <div><p className="font-medium text-ink-primary">{item.nome}</p><p className="text-xs text-ink-muted">{item.endereco || "Endereço não informado"}</p></div>} getItemId={(item: any) => item.id!} getItemLabel={(item: any) => item.nome} onCreateNew={() => {}} createNewLabel="" />
      </main>
    </PageTransition>
  );
}