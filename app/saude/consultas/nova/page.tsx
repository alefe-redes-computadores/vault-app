// app/saude/consultas/nova/page.tsx
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
  MapPin,
  Clock,
  Image as ImageIcon,
  Eraser,
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
import type { Attachment, Medico, Hospital, LocalSaude, Consulta } from "@/lib/types";
import { useToast } from "@/components/ToastProvider";
import { useSubmitAction } from "@/hooks/useSubmitAction";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { consultasRepository } from "@/lib/repositories/consultas";

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
  if (clean.length !== 8) return "";
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

function handleTimeMask(value: string): string {
  const clean = value.replace(/\D/g, "").slice(0, 4);
  if (clean.length > 2) {
    return `${clean.slice(0, 2)}:${clean.slice(2)}`;
  }
  return clean;
}

export default function NovaConsultaPage() {
  const { trigger } = useHapticFeedback();
  const { showToast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const { activePersonId } = useActivePersonId();
  const { run, isSubmitting } = useSubmitAction();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const medicos = useLiveQuery(() => db.medicos.toArray(), []) || [];
  const hospitais = useLiveQuery(() => db.hospitais.toArray(), []) || [];
  const locais = useLiveQuery(() => db.locais.toArray(), []) || [];

  const [medicoId, setMedicoId] = useState("");
  const [hospitalId, setHospitalId] = useState("");
  const [localId, setLocalId] = useState("");
  
  const [isMedicoModalOpen, setIsMedicoModalOpen] = useState(false);
  const [isHospitalModalOpen, setIsHospitalModalOpen] = useState(false);
  const [isLocalModalOpen, setIsLocalModalOpen] = useState(false);

  const todayISO = new Date().toISOString().slice(0, 10);
  const [dataDisplay, setDataDisplay] = useState(formatDateToDisplay(todayISO));
  const [horario, setHorario] = useState("");

  const [status, setStatus] = useState<"agendada" | "realizada" | "cancelada">("agendada");
  const [motivo, setMotivo] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedMedico = medicos.find((m: any) => m.id === medicoId);
  const selectedHospital = hospitais.find((h: any) => h.id === hospitalId);
  const selectedLocal = locais.find((l: any) => l.id === localId);

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
    if (!validate()) { trigger("error"); return; }
    if (!user?.id) return;

    await run(
      async () => {
        let anexoUrl: string | undefined;
        if (localFile && user) {
          const { url, error } = await uploadFile(user.id, localFile, "saude");
          if (!error && url) anexoUrl = url;
        }

        const dataISO = parseDateToISO(dataDisplay);
        if (!dataISO) throw new Error("Data inválida");
        
        await consultasRepository.create({
          user_id: user.id,
          person_id: activePersonId || undefined,
          especialidade: selectedMedico?.especialidade || "Geral",
          medico: selectedMedico?.nome || "Médico",
          medico_id: medicoId,
          hospital_id: hospitalId || undefined,
          local_id: localId || undefined,
          data: dataISO,
          horario: horario || undefined,
          status,
          motivo: motivo.trim() || undefined,
          observacoes: observacoes.trim() || undefined,
          anexo_url: anexoUrl,
        });
      },
      { successMessage: "Consulta criada", errorMessage: "Erro ao salvar", goBackOnSuccess: true }
    );
  };

  return (
    <PageTransition>
      <main className="min-h-[100dvh] bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCameraCapture} />
        
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button onClick={() => { trigger("vibrate"); router.back(); }} className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"><ArrowLeft size={18} className="text-ink-primary" /></button>
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
          {/* 🔥 MÉDICO COM LIMPAR */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-ink-primary">Médico <span className="text-coral">*</span></label>
              {medicoId && selectedMedico && (
                <button
                  type="button"
                  onClick={() => {
                    trigger("vibrate");
                    setMedicoId("");
                  }}
                  className="flex items-center gap-1 text-[10px] font-bold text-coral bg-coral/10 px-2 py-0.5 rounded-md uppercase"
                >
                  <Eraser size={12} /> Limpar
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsMedicoModalOpen(true)}
              className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${errors.medicoId ? "border-coral/50" : "border-surface-border/50"} bg-surface-raised flex items-center justify-between`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <UserCheck size={16} className="text-ice shrink-0" />
                <span className="truncate text-ink-primary">{selectedMedico ? `Dr(a). ${selectedMedico.nome} (${selectedMedico.especialidade || 'Geral'})` : "Selecionar médico"}</span>
              </div>
            </button>
            {errors.medicoId && <p className="mt-1 text-xs text-coral ml-1">{errors.medicoId}</p>}
          </motion.div>

          {/* 🔥 HOSPITAL E LOCAL COM LIMPAR */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.03 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-ink-primary">Hospital (Opcional)</label>
                {hospitalId && selectedHospital && (
                  <button
                    type="button"
                    onClick={() => {
                      trigger("vibrate");
                      setHospitalId("");
                    }}
                    className="flex items-center gap-1 text-[10px] font-bold text-coral bg-coral/10 px-2 py-0.5 rounded-md uppercase"
                  >
                    <Eraser size={12} /> Limpar
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsHospitalModalOpen(true)}
                className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left flex items-center justify-between text-ink-primary"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Building2 size={16} className="text-violet-400 shrink-0" />
                  <span className="truncate">{selectedHospital ? selectedHospital.nome : "Vincular hospital..."}</span>
                </div>
              </button>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-ink-primary">Clínica / Posto (Opcional)</label>
                {localId && selectedLocal && (
                  <button
                    type="button"
                    onClick={() => {
                      trigger("vibrate");
                      setLocalId("");
                    }}
                    className="flex items-center gap-1 text-[10px] font-bold text-coral bg-coral/10 px-2 py-0.5 rounded-md uppercase"
                  >
                    <Eraser size={12} /> Limpar
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsLocalModalOpen(true)}
                className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left flex items-center justify-between text-ink-primary"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <MapPin size={16} className="text-emerald-400 shrink-0" />
                  <span className="truncate">{selectedLocal ? selectedLocal.nome : "Vincular local / laboratório..."}</span>
                </div>
              </button>
            </div>
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.06 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-ink-primary">Data <span className="text-coral">*</span></label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
                  <input
                    type="text"
                    placeholder="DD/MM/AAAA"
                    maxLength={10}
                    value={dataDisplay}
                    onChange={(e) => setDataDisplay(handleDateMask(e.target.value))}
                    className={`w-full rounded-2xl border ${errors.data ? "border-coral/50" : "border-surface-border/50"} bg-surface-raised pl-9 pr-4 py-3 text-ink-primary font-mono text-sm outline-none focus:border-ice/50`}
                  />
                </div>
                {errors.data && <p className="text-xs text-coral ml-1">{errors.data}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-ink-primary">Horário</label>
                <div className="relative">
                  <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
                  <input
                    type="text"
                    placeholder="00:00"
                    maxLength={5}
                    value={horario}
                    onChange={(e) => setHorario(handleTimeMask(e.target.value))}
                    className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised pl-9 pr-4 py-3 text-ink-primary font-mono text-sm outline-none focus:border-ice/50"
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-1.5 pt-2 border-t border-surface-border/30">
                <label className="text-sm font-medium text-ink-primary">Status</label>
                <div className="grid grid-cols-3 gap-1.5">
                    {(["agendada", "realizada", "cancelada"] as const).map(st => (
                        <button key={st} onClick={() => { trigger("vibrate"); setStatus(st); }} className={`text-[11px] font-bold uppercase tracking-wider py-2.5 rounded-xl transition-colors ${status === st ? 'bg-ice text-void shadow-sm' : 'bg-surface-raised text-ink-muted border border-surface-border/50'}`}>{st}</button>
                    ))}
                </div>
            </div>
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.09 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <Input label="Motivo / Assunto (Opcional)" placeholder="Ex: Retorno..." value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.12 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <TextArea label="Anotações (Opcional)" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Instruções do médico, exames solicitados..." />
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.15 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <div className="mb-3"><label className="block text-sm font-medium text-ink-primary">Comprovante / Anexo</label></div>
            {!attachment ? (
              <div className="grid grid-cols-2 gap-3">
                <Button variant="secondary" onClick={() => fileInputRef.current?.click()}><Upload size={16} />Arquivo</Button>
                <Button variant="secondary" onClick={() => cameraInputRef.current?.click()}><Camera size={16} />Câmera</Button>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-2xl border border-surface-border/50 bg-surface-raised px-3 py-3">
                <ImageIcon size={16} className="text-ice" />
                <p className="truncate text-sm font-medium flex-1 text-ink-primary">{attachment.name}</p>
                <button onClick={removeAttachment} className="text-ink-muted"><X size={14} /></button>
              </div>
            )}
          </motion.div>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <Button variant="primary" size="lg" fullWidth onClick={handleSubmit} disabled={isSubmitting}>{isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Salvando...</> : "Salvar Consulta"}</Button>
        </div>
        
        <SelectionModal
          isOpen={isMedicoModalOpen}
          onClose={() => setIsMedicoModalOpen(false)}
          onSelect={(item: any) => setMedicoId(item.id!)}
          items={medicos}
          title="Selecionar Médico"
          renderItem={(item: any) => (
            <div>
              <p className="font-medium text-ink-primary">Dr(a). {item.nome}</p>
              {item.especialidade && <p className="text-xs text-ink-muted">{item.especialidade}</p>}
            </div>
          )}
          getItemId={(item: any) => item.id!}
          getItemLabel={(item: any) => item.nome}
          onCreateNew={() => { setIsMedicoModalOpen(false); router.push("/saude/medicos/novo"); }}
          createNewLabel="Cadastrar Médico"
        />
        <SelectionModal
          isOpen={isHospitalModalOpen}
          onClose={() => setIsHospitalModalOpen(false)}
          onSelect={(item: any) => setHospitalId(item.id!)}
          items={hospitais}
          title="Selecionar Hospital"
          renderItem={(item: any) => (
            <div>
              <p className="font-medium text-ink-primary">{item.nome}</p>
            </div>
          )}
          getItemId={(item: any) => item.id!}
          getItemLabel={(item: any) => item.nome}
          onCreateNew={() => { setIsHospitalModalOpen(false); router.push("/saude/hospitais/novo"); }}
          createNewLabel="Cadastrar Hospital"
        />
        <SelectionModal
          isOpen={isLocalModalOpen}
          onClose={() => setIsLocalModalOpen(false)}
          onSelect={(item: any) => setLocalId(item.id!)}
          items={locais}
          title="Selecionar Local / Posto"
          renderItem={(item: any) => (
            <div>
              <p className="font-medium text-ink-primary">{item.nome}</p>
            </div>
          )}
          getItemId={(item: any) => item.id!}
          getItemLabel={(item: any) => item.nome}
          onCreateNew={() => { setIsLocalModalOpen(false); router.push("/saude/locais/novo"); }}
          createNewLabel="Cadastrar Local"
        />
      </main>
    </PageTransition>
  );
}