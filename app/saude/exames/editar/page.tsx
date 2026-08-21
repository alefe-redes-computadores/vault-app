// app/saude/exames/editar/page.tsx
"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Save,
  Loader2,
  Stethoscope,
  Building2,
  Activity,
  Plus,
  X,
  Brain,
  Flame,
  HeartPulse,
  ShieldAlert,
  Calendar,
  Clock,
  Eraser,
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { useHapticFeedback } from "@/lib/haptics";
import { useSubmitAction } from "@/hooks/useSubmitAction";
import { useToast } from "@/components/ToastProvider";
import { PageTransition } from "@/components/PageTransition";
import { DetailSkeleton } from "@/components/loading/DetailSkeleton";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { SelectionModal } from "@/components/SelectionModal";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useMedicos } from "@/hooks/useMedicos";
import { useLocais } from "@/hooks/useLocais";
import { useTratamentos } from "@/hooks/useTratamentos";
import { db } from "@/lib/db";
import { examesRepository } from "@/lib/repositories/exames";
import type { Medico, LocalSaude, Tratamento, Exame } from "@/lib/types";

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

function EditarExameContent() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { showToast } = useToast();

  const { medicos, addMedico } = useMedicos();
  const { locais, addLocal } = useLocais();
  const { addTratamento } = useTratamentos();
  const { run, isSubmitting } = useSubmitAction();
  const isSubmitLocked = useRef(false);

  const [isLoading, setIsLoading] = useState(true);

  const [personId, setPersonId] = useState("");
  const [nome, setNome] = useState("");

  const [laboratorio, setLaboratorio] = useState("");
  const [localId, setLocalId] = useState("");

  const [medico, setMedico] = useState("");
  const [medicoId, setMedicoId] = useState("");

  const [dataSolicitacaoDisplay, setDataSolicitacaoDisplay] = useState("");
  const [horario, setHorario] = useState("");
  const [dataRetornoDisplay, setDataRetornoDisplay] = useState("");
  const [motivo, setMotivo] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [anexoUrl, setAnexoUrl] = useState("");

  const [tratamentosSelecionados, setTratamentosSelecionados] = useState<string[]>([]);
  const [isTratamentoModalOpen, setIsTratamentoModalOpen] = useState(false);
  const [isCreatingTratamento, setIsCreatingTratamento] = useState(false);
  const [newTratamentoName, setNewTratamentoName] = useState("");
  const [isSavingTratamento, setIsSavingTratamento] = useState(false);

  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [isLocalModalOpen, setIsLocalModalOpen] = useState(false);

  const [isCreatingDoctor, setIsCreatingDoctor] = useState(false);
  const [newDocName, setNewDocName] = useState("");
  const [newDocEspecialidade, setNewDocEspecialidade] = useState("");

  const [isCreatingLocal, setIsCreatingLocal] = useState(false);
  const [newLocalName, setNewLocalName] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  const tratamentos = useLiveQuery<Tratamento[]>(
    () => personId ? db.tratamentos.where('person_id').equals(personId).toArray() : Promise.resolve([]),
    [personId]
  ) || [];

  useEffect(() => {
    if (!id) {
      router.push("/saude/exames");
      return;
    }

    const loadExame = async () => {
      const data = await examesRepository.getById(id);
      if (data) {
        setPersonId(data.person_id || "");
        setNome(data.nome || "");
        setLaboratorio(data.laboratorio || "");
        setLocalId(data.local_id || "");
        setMedico(data.medico || "");
        setMedicoId(data.medico_id || "");
        setDataSolicitacaoDisplay(formatDateToDisplay(data.data || ""));
        setHorario((data as any).horario || "");
        setDataRetornoDisplay(formatDateToDisplay(data.data_retorno || ""));
        setMotivo(data.motivo || "");
        setObservacoes(data.observacoes || "");
        setAnexoUrl(data.anexo_url || "");
        setTratamentosSelecionados(data.tratamento_ids || []);
      } else {
        router.push("/saude/exames");
      }
      setIsLoading(false);
    };

    loadExame();
  }, [id, router]);

  const handleCreateDoctor = async () => {
    if (!newDocName.trim()) return;
    trigger("vibrate");
    try {
      const newId = await addMedico({
        nome: newDocName.trim(),
        especialidade: newDocEspecialidade.trim() || "Geral",
      });
      setMedicoId(newId);
      setMedico(newDocName.trim());
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
      setLaboratorio(newLocalName.trim());
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
    if (!newTratamentoName.trim() || !personId) return;
    setIsSavingTratamento(true);
    trigger("vibrate");
    try {
      const newId = await addTratamento({
        nome: newTratamentoName.trim(),
        status: "ativo",
      });
      setTratamentosSelecionados((prev: string[]) => [...prev, newId]);
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
    if (!nome.trim()) newErrors.nome = "Nome do exame é obrigatório";
    if (!dataSolicitacaoDisplay || dataSolicitacaoDisplay.length < 10) newErrors.data = "Data inválida";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!id) return;
    trigger("vibrate");
    if (!validate()) {
      trigger("error");
      return;
    }

    if (isSubmitLocked.current || isSubmitting) return;
    isSubmitLocked.current = true;

    run(
      async () => {
        try {
          const dataSolicitacaoISO = parseDateToISO(dataSolicitacaoDisplay);
          if (!dataSolicitacaoISO) throw new Error("Data inválida");

          const dataRetornoISO = dataRetornoDisplay ? parseDateToISO(dataRetornoDisplay) : undefined;

          await examesRepository.update(id, {
            person_id: personId || undefined,
            nome: nome.trim(),
            laboratorio: laboratorio.trim() || undefined,
            local_id: localId || undefined,
            medico: medico.trim() || undefined,
            medico_id: medicoId || undefined,
            data: dataSolicitacaoISO,
            horario: horario || undefined,
            data_retorno: dataRetornoISO,
            motivo: motivo.trim() || undefined,
            observacoes: observacoes.trim() || undefined,
            anexo_url: anexoUrl.trim() || undefined,
            tratamento_ids: tratamentosSelecionados.length > 0 ? tratamentosSelecionados : undefined,
          });
        } finally {
          isSubmitLocked.current = false;
        }
      },
      {
        successMessage: "Exame atualizado com sucesso",
        errorMessage: "Erro ao atualizar exame",
        goBackOnSuccess: false,
      }
    ).then(() => router.replace(`/saude/exames/detalhes?id=${id}`)).catch(() => {});
  };

  if (isLoading) return <DetailSkeleton />;

  return (
    <PageTransition>
      <main className="min-h-[100dvh] bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 header-safe-top backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { trigger("vibrate"); router.back(); }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="min-w-0">
              <h1 className="font-display text-xl font-semibold text-ink-primary">Editar Exame</h1>
              <p className="text-xs text-ink-muted">Atualizar dados e laudos</p>
            </div>
          </div>
        </header>

        <section className="px-5 pt-6 space-y-4">
          {/* 🔥 TRATAMENTOS COM LIMPAR (limpa todos de uma vez) */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="rounded-[28px] border border-violet-500/30 bg-surface p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-violet-400" />
                <label className="text-sm font-semibold text-ink-primary">Tratamentos / Motivos Vinculados</label>
              </div>
              {tratamentosSelecionados.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    trigger("vibrate");
                    setTratamentosSelecionados([]);
                  }}
                  className="flex items-center gap-1 text-[10px] font-bold text-coral bg-coral/10 px-2 py-0.5 rounded-md uppercase"
                >
                  <Eraser size={12} /> Limpar todos
                </button>
              )}
            </div>

            {tratamentosSelecionados.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {tratamentosSelecionados.map((tId) => {
                  const t = tratamentos.find((x: Tratamento) => x.id === tId);
                  if (!t) return null;
                  const IconComp = getTratamentoIcon(t.nome);
                  return (
                    <div key={tId} className="flex items-center gap-1.5 rounded-full bg-violet-400/10 border border-violet-400/20 px-3 py-1.5">
                      <IconComp size={14} className="text-violet-400" />
                      <span className="text-xs font-medium text-violet-300">{t.nome}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); trigger("vibrate"); setTratamentosSelecionados((prev) => prev.filter((item) => item !== tId)); }}
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
              <span className="text-sm font-medium">Adicionar Tratamento / CID</span>
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div>
              <Input
                label="Nome do Exame *"
                placeholder="Ex: Hemograma..."
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                error={errors.nome}
                required
              />
            </div>

            {/* 🔥 LABORATÓRIO COM LIMPAR */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-ink-primary">Laboratório / Hospital</label>
                {localId && laboratorio && (
                  <button
                    type="button"
                    onClick={() => {
                      trigger("vibrate");
                      setLocalId("");
                      setLaboratorio("");
                    }}
                    className="flex items-center gap-1 text-[10px] font-bold text-coral bg-coral/10 px-2 py-0.5 rounded-md uppercase"
                  >
                    <Eraser size={12} /> Limpar
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => { trigger("vibrate"); setIsLocalModalOpen(true); }}
                className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary flex items-center justify-between"
              >
                <span className="truncate">{laboratorio || "Selecionar laboratório ou hospital"}</span>
                <Building2 size={16} className="text-ink-muted shrink-0" />
              </button>
            </div>

            {/* 🔥 MÉDICO COM LIMPAR */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-ink-primary">Médico Solicitante</label>
                {medicoId && medico && (
                  <button
                    type="button"
                    onClick={() => {
                      trigger("vibrate");
                      setMedicoId("");
                      setMedico("");
                    }}
                    className="flex items-center gap-1 text-[10px] font-bold text-coral bg-coral/10 px-2 py-0.5 rounded-md uppercase"
                  >
                    <Eraser size={12} /> Limpar
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => { trigger("vibrate"); setIsDoctorModalOpen(true); }}
                className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary flex items-center justify-between"
              >
                <span className="truncate">{medico || "Selecionar médico"}</span>
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
              <label className="block text-sm font-medium text-ink-primary">Data Previsão / Retorno <span className="text-[10px] text-ink-faint">(Alerta)</span></label>
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

            <Input
              label="Motivo da Solicitação"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />

            <TextArea
              label="Observações / Resultados"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />

            <Input
              label="Link Externo (URL)"
              value={anexoUrl}
              onChange={(e) => setAnexoUrl(e.target.value)}
            />
          </motion.div>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleSave}
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isSubmitting ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>

        <SelectionModal<LocalSaude>
          isOpen={isLocalModalOpen}
          onClose={() => setIsLocalModalOpen(false)}
          onSelect={(item) => { trigger("vibrate"); setLocalId(item.id!); setLaboratorio(item.nome); }}
          items={locais}
          title="Selecionar Hospital / Laboratório"
          placeholder="Buscar local..."
          renderItem={(item) => <p className="font-medium text-ink-primary">{item.nome}</p>}
          getItemId={(item) => item.id!}
          getItemLabel={(item) => item.nome}
          onCreateNew={() => { setIsLocalModalOpen(false); trigger("vibrate"); }}
          createNewLabel=""
        />

        <SelectionModal<Medico>
          isOpen={isDoctorModalOpen}
          onClose={() => setIsDoctorModalOpen(false)}
          onSelect={(item) => { trigger("vibrate"); setMedicoId(item.id!); setMedico(item.nome); }}
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
          onCreateNew={() => { setIsDoctorModalOpen(false); trigger("vibrate"); }}
          createNewLabel=""
        />

        <SelectionModal<Tratamento>
          isOpen={isTratamentoModalOpen}
          onClose={() => setIsTratamentoModalOpen(false)}
          onSelect={(item) => {
            trigger("vibrate");
            if (!tratamentosSelecionados.includes(item.id!)) {
              setTratamentosSelecionados((prev) => [...prev, item.id!]);
            }
          }}
          items={tratamentos}
          title="Vincular a Tratamento/CID"
          placeholder="Buscar tratamento..."
          renderItem={(item) => {
            const IconComp = getTratamentoIcon(item.nome);
            return (
              <div className="flex items-center gap-2">
                <IconComp size={16} className="text-violet-400" />
                <span className="text-sm font-medium text-ink-primary">{item.nome}</span>
              </div>
            );
          }}
          getItemId={(item) => item.id!}
          getItemLabel={(item) => item.nome}
          onCreateNew={() => { setIsTratamentoModalOpen(false); trigger("vibrate"); }}
          createNewLabel=""
        />
      </main>
    </PageTransition>
  );
}

export default function EditarExamePage() {
  return <Suspense fallback={<DetailSkeleton />}><EditarExameContent /></Suspense>;
}