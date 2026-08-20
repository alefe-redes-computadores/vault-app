// app/saude/exames/novo/page.tsx
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  Save,
  Activity,
  Building2,
  Stethoscope,
  Calendar,
  Plus,
  X,
  Brain,
  Flame,
  HeartPulse,
  ShieldAlert,
  Clock,
  Image as ImageIcon,
  Upload,
  Camera
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useHapticFeedback } from "@/lib/haptics";
import { useSubmitAction } from "@/hooks/useSubmitAction";
import { useToast } from "@/components/ToastProvider";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { db } from "@/lib/db";
import { enfileirarOperacao } from "@/lib/sync/enfileirarOperacao";
import { useLiveQuery } from "dexie-react-hooks";
import { useMedicos } from "@/hooks/useMedicos";
import { useLocais } from "@/hooks/useLocais";
import { useTratamentos } from "@/hooks/useTratamentos";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { SelectionModal } from "@/components/SelectionModal";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { uploadFile } from "@/lib/supabase/storage";
import type { Medico, LocalSaude, Tratamento, Attachment, Exame } from "@/lib/types";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

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

function getTratamentoIcon(nome: string) {
  const n = nome.toLowerCase();
  if (n.includes("tdah")) return Brain;
  if (n.includes("dor") || n.includes("neuropática")) return Flame;
  if (n.includes("depress")) return HeartPulse;
  if (n.includes("ansied") || n.includes("ansiolítico")) return ShieldAlert;
  return Activity;
}

export default function NovoExamePage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { user } = useAuth();
  const { activePersonId } = useActivePersonId();
  const { showToast } = useToast();
  const { run, isSubmitting } = useSubmitAction();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const { medicos, addMedico } = useMedicos();
  const { locais, addLocal } = useLocais();
  const { addTratamento } = useTratamentos();

  const [nomesExames, setNomesExames] = useState("");
  const [localRealizacao, setLocalRealizacao] = useState("");
  const [localId, setLocalId] = useState("");
  const [medicoSolicitante, setMedicoSolicitante] = useState("");
  const [medicoId, setMedicoId] = useState("");

  const [dataSolicitacaoDisplay, setDataSolicitacaoDisplay] = useState(formatDateToDisplay(todayISO()));
  const [horario, setHorario] = useState("");
  const [dataRetornoDisplay, setDataRetornoDisplay] = useState("");
  const [motivo, setMotivo] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [anexoUrl, setAnexoUrl] = useState("");

  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [localFile, setLocalFile] = useState<File | null>(null);

  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [isLocalModalOpen, setIsLocalModalOpen] = useState(false);

  const [isCreatingDoctor, setIsCreatingDoctor] = useState(false);
  const [newDocName, setNewDocName] = useState("");
  const [newDocEspecialidade, setNewDocEspecialidade] = useState("");

  const [isCreatingLocal, setIsCreatingLocal] = useState(false);
  const [newLocalName, setNewLocalName] = useState("");

  const tratamentos = useLiveQuery<Tratamento[]>(
    () => activePersonId ? db.tratamentos.where('person_id').equals(activePersonId).toArray() : Promise.resolve([]),
    [activePersonId]
  ) || [];

  const [tratamentosSelecionados, setTratamentosSelecionados] = useState<string[]>([]);
  const [isTratamentoModalOpen, setIsTratamentoModalOpen] = useState(false);
  const [isCreatingTratamento, setIsCreatingTratamento] = useState(false);
  const [newTratamentoName, setNewTratamentoName] = useState("");
  const [isSavingTratamento, setIsSavingTratamento] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

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
        name: `exame_${Date.now()}.jpg`,
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

  const handleCreateDoctor = async () => {
    if (!newDocName.trim()) return;
    trigger("vibrate");
    try {
      const newId = await addMedico({
        nome: newDocName.trim(),
        especialidade: newDocEspecialidade.trim() || "Geral",
      });
      setMedicoId(newId);
      setMedicoSolicitante(newDocName.trim());
      setIsCreatingDoctor(false);
      setNewDocName("");
      setNewDocEspecialidade("");
      trigger("success");
      showToast("Médico cadastrado", "success");
    } catch (error) {
      trigger("error");
      showToast("Erro ao cadastrar médico", "error");
    }
  };

  const handleCreateLocal = async () => {
    if (!newLocalName.trim()) return;
    trigger("vibrate");
    try {
      const newId = await addLocal({
        nome: newLocalName.trim(),
        tipo: "laboratorio",
      });
      setLocalId(newId);
      setLocalRealizacao(newLocalName.trim());
      setIsCreatingLocal(false);
      setNewLocalName("");
      trigger("success");
      showToast("Local cadastrado", "success");
    } catch (error) {
      trigger("error");
      showToast("Erro ao cadastrar local", "error");
    }
  };

  const handleCreateTratamento = async () => {
    if (!newTratamentoName.trim() || !activePersonId) return;
    setIsSavingTratamento(true);
    trigger("vibrate");
    try {
      const newId = await addTratamento({
        person_id: activePersonId,
        nome: newTratamentoName.trim(),
        status: "ativo",
      });
      setTratamentosSelecionados((prev) => [...prev, newId]);
      trigger("success");
      showToast("Tratamento cadastrado", "success");
      setIsCreatingTratamento(false);
      setNewTratamentoName("");
    } catch (error) {
      trigger("error");
      showToast("Erro ao cadastrar tratamento", "error");
    } finally {
      setIsSavingTratamento(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!activePersonId) newErrors.person = "Nenhuma pessoa ativa selecionada";
    if (!nomesExames.trim()) newErrors.nomes = "Informe ao menos um exame";
    if (!dataSolicitacaoDisplay || dataSolicitacaoDisplay.length < 10) newErrors.data = "Data inválida";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    trigger("vibrate");
    if (!validate() || !activePersonId || !user?.id) {
      trigger("error");
      return;
    }

    run(
      async () => {
        const dataSolicitacaoISO = parseDateToISO(dataSolicitacaoDisplay);
        if (!dataSolicitacaoISO) throw new Error("Data inválida");

        const dataRetornoISO = dataRetornoDisplay ? parseDateToISO(dataRetornoDisplay) : undefined;
        const listaExames = nomesExames.split(/,|\n/).map((item) => item.trim()).filter(Boolean);

        let urlUpload = anexoUrl;
        if (localFile && user) {
          const { url, error } = await uploadFile(user.id, localFile, "saude");
          if (!error && url) {
            urlUpload = url;
            if (attachment?.url.startsWith("blob:")) URL.revokeObjectURL(attachment.url);
          }
        }

        await db.transaction("rw", db.exames, db.syncQueue, async () => {
          for (const nomeExame of listaExames) {
            const novoId = crypto.randomUUID();
            const novoExame: Exame = {
              id: novoId,
              user_id: user.id,
              person_id: activePersonId,
              nome: nomeExame,
              laboratorio: localRealizacao.trim() || undefined,
              local_id: localId || undefined,
              medico: medicoSolicitante.trim() || undefined,
              medico_id: medicoId || undefined,
              data: dataSolicitacaoISO,
              data_retorno: dataRetornoISO,
              motivo: motivo.trim() || undefined,
              observacoes: observacoes.trim() || undefined,
              anexo_url: urlUpload.trim() || undefined,
              tratamento_ids: tratamentosSelecionados.length > 0 ? tratamentosSelecionados : undefined,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              synced: false
            };

            (novoExame as any).horario = horario || undefined;

            await db.exames.add(novoExame);
            await enfileirarOperacao("exames", "add", novoExame);
          }
        });
      },
      {
        successMessage: "Exame(s) cadastrado(s)",
        errorMessage: "Erro ao salvar exame(s)",
        goBackOnSuccess: true,
      }
    );
  };

  return (
    <PageTransition>
      <main className="min-h-[100dvh] bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCameraCapture} />
        
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 header-safe-top backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { trigger("vibrate"); router.back(); }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="min-w-0">
              <h1 className="font-display text-xl font-semibold text-ink-primary">Cadastrar Exames</h1>
              <p className="text-xs text-ink-muted">Múltiplos registros e laudos</p>
            </div>
          </div>
        </header>

        <section className="px-5 pt-6 space-y-4">
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="rounded-[28px] border border-violet-500/30 bg-surface p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-violet-400" />
                <label className="text-sm font-semibold text-ink-primary">Motivo / Tratamento (Opcional)</label>
              </div>
            </div>

            {tratamentosSelecionados.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {tratamentosSelecionados.map((id) => {
                  const t = tratamentos.find((x: Tratamento) => x.id === id);
                  if (!t) return null;
                  const IconComp = getTratamentoIcon(t.nome);
                  return (
                    <div key={id} className="flex items-center gap-1.5 rounded-full bg-violet-400/10 border border-violet-400/20 px-3 py-1.5">
                      <IconComp size={14} className="text-violet-400" />
                      <span className="text-xs font-medium text-violet-300">{t.nome}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); trigger("vibrate"); setTratamentosSelecionados((prev) => prev.filter((item) => item !== id)); }}
                        className="ml-1 text-violet-400/60 hover:text-coral transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <button onClick={() => { trigger("vibrate"); setIsTratamentoModalOpen(true); }} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-violet-400/30 bg-violet-400/5 px-4 py-3 text-violet-300 transition-colors hover:bg-violet-400/10">
              <Plus size={16} />
              <span className="text-sm font-medium">Vincular Tratamento</span>
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div>
              <TextArea
                label="Nome do(s) Exame(s) *"
                placeholder="Ex: Hemograma, Glicemia (Separe por vírgula para cadastrar vários)"
                value={nomesExames}
                onChange={(e) => setNomesExames(e.target.value)}
                required
              />
              {errors.nomes && <p className="mt-1 text-xs text-coral">{errors.nomes}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-primary">Laboratório / Hospital</label>
              <button
                type="button"
                onClick={() => { trigger("vibrate"); setIsLocalModalOpen(true); }}
                className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary flex items-center justify-between"
              >
                <span className="truncate">{localRealizacao || "Selecionar laboratório ou hospital"}</span>
                <Building2 size={16} className="text-ink-muted shrink-0" />
              </button>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-primary">Médico Solicitante</label>
              <button
                type="button"
                onClick={() => { trigger("vibrate"); setIsDoctorModalOpen(true); }}
                className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary flex items-center justify-between"
              >
                <span className="truncate">{medicoSolicitante || "Selecionar médico"}</span>
                <Stethoscope size={16} className="text-ink-muted shrink-0" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-ink-primary">Data da Coleta <span className="text-coral">*</span></label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
                  <input
                    type="text"
                    placeholder="DD/MM/AAAA"
                    maxLength={10}
                    value={dataSolicitacaoDisplay}
                    onChange={(e) => setDataSolicitacaoDisplay(handleDateMask(e.target.value))}
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
              <label className="block text-sm font-medium text-ink-primary">Data Previsão / Retorno</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
                <input
                  type="text"
                  placeholder="DD/MM/AAAA"
                  maxLength={10}
                  value={dataRetornoDisplay}
                  onChange={(e) => setDataRetornoDisplay(handleDateMask(e.target.value))}
                  className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised pl-9 pr-4 py-3 text-ink-primary font-mono text-sm outline-none focus:border-ice/50"
                />
              </div>
            </div>

            <Input label="Motivo da Solicitação" placeholder="Ex: Rotina anual, investigação..." value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            <TextArea label="Observações / Resultados" placeholder="Adicione notas sobre os resultados..." value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
            <Input label="Link Externo (URL)" placeholder="https://..." value={anexoUrl} onChange={(e) => setAnexoUrl(e.target.value)} />
          </motion.div>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <Button variant="primary" size="lg" fullWidth onClick={handleSave} disabled={isSubmitting} className="flex items-center justify-center gap-2">
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {isSubmitting ? "Salvando..." : "Salvar Exame(s)"}
          </Button>
        </div>

        <SelectionModal<LocalSaude>
          isOpen={isLocalModalOpen}
          onClose={() => setIsLocalModalOpen(false)}
          onSelect={(item) => { trigger("vibrate"); setLocalId(item.id!); setLocalRealizacao(item.nome); }}
          items={locais}
          title="Selecionar Hospital / Laboratório"
          placeholder="Buscar local..."
          renderItem={(item) => <p className="font-medium text-ink-primary">{item.nome}</p>}
          getItemId={(item) => item.id!}
          getItemLabel={(item) => item.nome}
          onCreateNew={() => { setIsLocalModalOpen(false); trigger("vibrate"); setIsCreatingLocal(true); }}
          createNewLabel="Cadastrar Novo Local"
        />

        <SelectionModal<Medico>
          isOpen={isDoctorModalOpen}
          onClose={() => setIsDoctorModalOpen(false)}
          onSelect={(item) => { trigger("vibrate"); setMedicoId(item.id!); setMedicoSolicitante(item.nome); }}
          items={medicos}
          title="Selecionar Médico"
          placeholder="Buscar médico..."
          renderItem={(item) => (
            <div>
              <p className="font-medium text-ink-primary">Dr(a). {item.nome}</p>
              {item.especialidade && <p className="text-xs text-ink-muted">{item.especialidade}</p>}
            </div>
          )}
          getItemId={(item) => item.id!}
          getItemLabel={(item) => item.nome}
          onCreateNew={() => { setIsDoctorModalOpen(false); trigger("vibrate"); setIsCreatingDoctor(true); }}
          createNewLabel="Cadastrar Novo Médico"
        />

        <BottomSheet isOpen={isCreatingDoctor} onClose={() => setIsCreatingDoctor(false)} title="Novo Médico">
          <div className="space-y-4 px-1 pb-2">
            <Input label="Nome" value={newDocName} onChange={(e) => setNewDocName(e.target.value)} autoFocus />
            <Input label="Especialidade" value={newDocEspecialidade} onChange={(e) => setNewDocEspecialidade(e.target.value)} />
            <Button variant="primary" fullWidth onClick={handleCreateDoctor} disabled={!newDocName.trim()}>Salvar e Selecionar</Button>
          </div>
        </BottomSheet>

        <BottomSheet isOpen={isCreatingLocal} onClose={() => setIsCreatingLocal(false)} title="Novo Local">
          <div className="space-y-4 px-1 pb-2">
            <Input label="Nome" value={newLocalName} onChange={(e) => setNewLocalName(e.target.value)} autoFocus />
            <Button variant="primary" fullWidth onClick={handleCreateLocal} disabled={!newLocalName.trim()}>Salvar e Selecionar</Button>
          </div>
        </BottomSheet>
      </main>
    </PageTransition>
  );
}
