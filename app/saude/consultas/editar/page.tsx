// app/saude/consultas/editar/page.tsx
"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  Stethoscope,
  Calendar,
  Building2,
  UserCheck,
  MapPin,
  Clock,
  Eraser,
  Save,
  Activity,
  Brain,
  Flame,
  HeartPulse,
  ShieldAlert,
  Plus,
  X,
} from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { PageTransition } from "@/components/PageTransition";
import { DetailSkeleton } from "@/components/loading/DetailSkeleton";
import { SelectionModal } from "@/components/SelectionModal";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useSubmitAction } from "@/hooks/useSubmitAction";
import { consultasRepository } from "@/lib/repositories/consultas";
import { getClinicalTheme } from "@/lib/health-utils";
import { useToast } from "@/components/ToastProvider";
import { tratamentosRepository } from "@/lib/repositories/tratamentos";
import { cidsRepository } from "@/lib/repositories/cids";
import type { Consulta, Medico, Hospital, LocalSaude, Tratamento, Cid } from "@/lib/types";

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

function getTratamentoIcon(nome: string) {
  const n = nome.toLowerCase();
  if (n.includes("tdah")) return Brain;
  if (n.includes("dor") || n.includes("neuropática")) return Flame;
  if (n.includes("depress")) return HeartPulse;
  if (n.includes("ansied") || n.includes("ansiolítico")) return ShieldAlert;
  return Activity;
}

function EditarConsultaContent() {
  const { trigger } = useHapticFeedback();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { run, isSubmitting } = useSubmitAction();
  const isSubmitLocked = useRef(false);

  const medicos = useLiveQuery(() => db.medicos.toArray(), []) || [];
  const hospitais = useLiveQuery(() => db.hospitais.toArray(), []) || [];
  const locais = useLiveQuery(() => db.locais.toArray(), []) || [];
  const tratamentos = useLiveQuery(() => db.tratamentos.toArray(), []) || [];
  const cids = useLiveQuery(() => db.cids.toArray(), []) || [];

  const [isLoading, setIsLoading] = useState(true);
  const [medicoId, setMedicoId] = useState("");
  const [hospitalId, setHospitalId] = useState("");
  const [localId, setLocalId] = useState("");

  const [isMedicoModalOpen, setIsMedicoModalOpen] = useState(false);
  const [isHospitalModalOpen, setIsHospitalModalOpen] = useState(false);
  const [isLocalModalOpen, setIsLocalModalOpen] = useState(false);

  // Múltipla seleção
  const [tratamentosSelecionados, setTratamentosSelecionados] = useState<string[]>([]);
  const [cidsSelecionados, setCidsSelecionados] = useState<string[]>([]);
  const [isTratamentoModalOpen, setIsTratamentoModalOpen] = useState(false);
  const [isCidModalOpen, setIsCidModalOpen] = useState(false);

  // Criação rápida
  const [isCreatingTratamento, setIsCreatingTratamento] = useState(false);
  const [newTratamentoName, setNewTratamentoName] = useState("");
  const [isSavingTratamento, setIsSavingTratamento] = useState(false);

  const [isCreatingCid, setIsCreatingCid] = useState(false);
  const [newCidCodigo, setNewCidCodigo] = useState("");
  const [newCidDescricao, setNewCidDescricao] = useState("");

  const [dataDisplay, setDataDisplay] = useState("");
  const [horario, setHorario] = useState("");
  const [status, setStatus] = useState<"agendada" | "realizada" | "cancelada">("agendada");
  const [motivo, setMotivo] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      router.push("/saude/consultas");
      return;
    }
    const loadConsulta = async () => {
      const data = await consultasRepository.getById(id);
      if (data) {
        setMedicoId(data.medico_id || "");
        setHospitalId(data.hospital_id || "");
        setLocalId(data.local_id || "");
        setDataDisplay(formatDateToDisplay(data.data));
        setHorario(data.horario || "");
        setStatus(data.status || "agendada");
        setMotivo(data.motivo || "");
        setObservacoes(data.observacoes || "");
        setTratamentosSelecionados(data.tratamento_ids || []);
        setCidsSelecionados(data.cid_ids || []);
      } else {
        router.push("/saude/consultas");
      }
      setIsLoading(false);
    };
    loadConsulta();
  }, [id, router]);

  const selectedMedico = medicos.find((m: any) => m.id === medicoId);
  const selectedHospital = hospitais.find((h: any) => h.id === hospitalId);
  const selectedLocal = locais.find((l: any) => l.id === localId);

  const handleCreateTratamento = async () => {
    if (!newTratamentoName.trim()) return;
    setIsSavingTratamento(true);
    trigger("vibrate");
    try {
      const newId = await tratamentosRepository.create({
        nome: newTratamentoName.trim(),
        status: "ativo",
      });
      setTratamentosSelecionados((prev) => [...prev, newId]);
      showToast("Tratamento cadastrado", "success");
      setIsCreatingTratamento(false);
      setNewTratamentoName("");
    } catch (error) {
      console.error(error);
      showToast("Erro ao cadastrar tratamento", "error");
    } finally {
      setIsSavingTratamento(false);
    }
  };

  const handleCreateCid = async () => {
    if (!newCidCodigo.trim() || !newCidDescricao.trim()) return;
    trigger("vibrate");
    try {
      const newId = await cidsRepository.create({
        codigo: newCidCodigo.trim(),
        descricao: newCidDescricao.trim(),
      });
      setCidsSelecionados((prev) => [...prev, newId]);
      showToast("CID cadastrado", "success");
      setIsCreatingCid(false);
      setNewCidCodigo("");
      setNewCidDescricao("");
    } catch (error) {
      console.error(error);
      showToast("Erro ao cadastrar CID", "error");
    }
  };

  const handleSubmit = async () => {
    trigger("vibrate");
    if (!medicoId) {
      setError("Selecione o médico");
      trigger("error");
      return;
    }
    if (!id) return;

    if (isSubmitLocked.current || isSubmitting) return;
    isSubmitLocked.current = true;

    try {
      await run(
        async () => {
          const dataISO = parseDateToISO(dataDisplay);
          if (!dataISO) throw new Error("Data inválida");

          await consultasRepository.update(id, {
            medico_id: medicoId,
            hospital_id: hospitalId || undefined,
            local_id: localId || undefined,
            data: dataISO,
            horario: horario || undefined,
            status,
            motivo: motivo.trim() || undefined,
            observacoes: observacoes.trim() || undefined,
            tratamento_ids: tratamentosSelecionados.length > 0 ? tratamentosSelecionados : undefined,
            cid_ids: cidsSelecionados.length > 0 ? cidsSelecionados : undefined,
          });
        },
        {
          successMessage: "Consulta atualizada com sucesso",
          errorMessage: "Erro ao atualizar consulta",
          goBackOnSuccess: true,
        }
      );
    } finally {
      isSubmitLocked.current = false;
    }
  };

  if (isLoading) return <DetailSkeleton />;

  return (
    <PageTransition>
      <main className="min-h-[100dvh] bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { trigger("vibrate"); router.replace(`/saude/consultas/detalhes?id=${id}`); }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Stethoscope size={16} className="text-ice" />
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">Edição</p>
              </div>
              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">Editar Consulta</h1>
            </div>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-6">
          {/* TRATAMENTOS E CIDs COM LIMPAR */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.01 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-violet-400" />
                <label className="text-sm font-semibold text-ink-primary">Tratamentos e CIDs Relacionados</label>
              </div>
              {(tratamentosSelecionados.length > 0 || cidsSelecionados.length > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    trigger("vibrate");
                    setTratamentosSelecionados([]);
                    setCidsSelecionados([]);
                  }}
                  className="flex items-center gap-1 text-[10px] font-bold text-coral bg-coral/10 px-2 py-0.5 rounded-md uppercase"
                >
                  <Eraser size={12} /> Limpar todos
                </button>
              )}
            </div>

            {/* Tratamentos selecionados */}
            {tratamentosSelecionados.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {tratamentosSelecionados.map((tId) => {
                  const t = tratamentos.find((x) => x.id === tId);
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

            {/* CIDs selecionados */}
            {cidsSelecionados.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {cidsSelecionados.map((cId) => {
                  const c = cids.find((x) => x.id === cId);
                  if (!c) return null;
                  const theme = getClinicalTheme(c.descricao || c.codigo);
                  const IconComp = theme.icon;
                  return (
                    <div key={cId} className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 ${theme.tagClass}`}>
                      <IconComp size={14} />
                      <span className="text-xs font-medium">{c.codigo}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); trigger("vibrate"); setCidsSelecionados((prev) => prev.filter((item) => item !== cId)); }}
                        className="ml-1 text-current/60 hover:text-coral transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => { trigger("vibrate"); setIsTratamentoModalOpen(true); }}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-violet-400/30 bg-violet-400/5 px-4 py-3 text-violet-300 transition-colors hover:bg-violet-400/10"
              >
                <Plus size={16} />
                <span className="text-sm font-medium">Vincular Tratamento</span>
              </button>
              <button
                onClick={() => { trigger("vibrate"); setIsCidModalOpen(true); }}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-emerald-400/30 bg-emerald-400/5 px-4 py-3 text-emerald-300 transition-colors hover:bg-emerald-400/10"
              >
                <Plus size={16} />
                <span className="text-sm font-medium">Vincular CID</span>
              </button>
            </div>
          </motion.div>

          {/* MÉDICO COM LIMPAR */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.02 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-ink-primary">Médico <span className="text-coral">*</span></label>
              {medicoId && selectedMedico && (
                <button
                  type="button"
                  onClick={() => {
                    trigger("vibrate");
                    setMedicoId("");
                    setError("");
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
              className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${error ? "border-coral/50" : "border-surface-border/50"} bg-surface-raised flex items-center justify-between`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <UserCheck size={16} className="text-ice shrink-0" />
                <span className="truncate text-ink-primary">{selectedMedico ? `Dr(a). ${selectedMedico.nome} (${selectedMedico.especialidade || 'Geral'})` : "Selecionar médico"}</span>
              </div>
            </button>
            {error && <p className="mt-1 text-xs text-coral">{error}</p>}
          </motion.div>

          {/* HOSPITAL E LOCAL COM LIMPAR */}
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
                    className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised pl-9 pr-4 py-3 text-ink-primary font-mono text-sm outline-none focus:border-ice/50"
                  />
                </div>
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
            <TextArea label="Anotações (Opcional)" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Instruções do médico..." />
          </motion.div>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <Button variant="primary" size="lg" fullWidth onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Salvando...</> : <><Save size={16} /> Salvar Alterações</>}
          </Button>
        </div>

        {/* Modais - mesmos do novo */}
        <SelectionModal
          isOpen={isMedicoModalOpen}
          onClose={() => setIsMedicoModalOpen(false)}
          onSelect={(item: any) => { trigger("vibrate"); setMedicoId(item.id!); }}
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
          onSelect={(item: any) => { trigger("vibrate"); setHospitalId(item.id!); }}
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
          onSelect={(item: any) => { trigger("vibrate"); setLocalId(item.id!); }}
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

        <SelectionModal
          isOpen={isTratamentoModalOpen}
          onClose={() => setIsTratamentoModalOpen(false)}
          onSelect={(item: Tratamento) => {
            trigger("vibrate");
            if (!tratamentosSelecionados.includes(item.id!)) {
              setTratamentosSelecionados((prev) => [...prev, item.id!]);
            }
          }}
          items={tratamentos}
          title="Vincular Tratamentos"
          placeholder="Buscar tratamento..."
          renderItem={(item: Tratamento) => {
            const IconComp = getTratamentoIcon(item.nome);
            const isSelected = tratamentosSelecionados.includes(item.id!);
            return (
              <div className="flex items-center gap-2 w-full">
                <IconComp size={16} className="text-violet-400" />
                <span className={`text-sm font-medium ${isSelected ? "text-violet-400" : "text-ink-primary"}`}>
                  {item.nome}
                </span>
                {isSelected && <span className="ml-auto text-[10px] text-emerald-400">✓</span>}
              </div>
            );
          }}
          getItemId={(item: Tratamento) => item.id!}
          getItemLabel={(item: Tratamento) => item.nome}
          onCreateNew={() => { setIsTratamentoModalOpen(false); setIsCreatingTratamento(true); }}
          createNewLabel="Cadastrar Novo Tratamento"
        />

        <SelectionModal
          isOpen={isCidModalOpen}
          onClose={() => setIsCidModalOpen(false)}
          onSelect={(item: Cid) => {
            trigger("vibrate");
            if (!cidsSelecionados.includes(item.id!)) {
              setCidsSelecionados((prev) => [...prev, item.id!]);
            }
          }}
          items={cids}
          title="Vincular CIDs"
          placeholder="Buscar CID..."
          renderItem={(item: Cid) => {
            const theme = getClinicalTheme(item.descricao || item.codigo);
            const IconComp = theme.icon;
            const isSelected = cidsSelecionados.includes(item.id!);
            return (
              <div className="flex items-center gap-2 w-full">
                <IconComp size={16} className={theme.textClass} />
                <span className={`text-sm font-medium ${isSelected ? theme.textClass : "text-ink-primary"}`}>
                  {item.codigo} - {item.descricao}
                </span>
                {isSelected && <span className="ml-auto text-[10px] text-emerald-400">✓</span>}
              </div>
            );
          }}
          getItemId={(item: Cid) => item.id!}
          getItemLabel={(item: Cid) => `${item.codigo} - ${item.descricao}`}
          onCreateNew={() => { setIsCidModalOpen(false); setIsCreatingCid(true); }}
          createNewLabel="Cadastrar Novo CID"
        />

        <BottomSheet isOpen={isCreatingTratamento} onClose={() => setIsCreatingTratamento(false)} title="Novo Tratamento">
          <div className="space-y-4 px-1 pb-2">
            <Input label="Nome do Tratamento" value={newTratamentoName} onChange={(e) => setNewTratamentoName(e.target.value)} autoFocus />
            <Button variant="primary" fullWidth onClick={handleCreateTratamento} disabled={!newTratamentoName.trim() || isSavingTratamento}>
              {isSavingTratamento ? <Loader2 size={16} className="animate-spin" /> : "Salvar e Selecionar"}
            </Button>
          </div>
        </BottomSheet>

        <BottomSheet isOpen={isCreatingCid} onClose={() => setIsCreatingCid(false)} title="Novo CID">
          <div className="space-y-4 px-1 pb-2">
            <Input label="Código CID" placeholder="Ex: F90.0" value={newCidCodigo} onChange={(e) => setNewCidCodigo(e.target.value)} autoFocus />
            <Input label="Descrição" placeholder="Ex: Transtorno de déficit de atenção" value={newCidDescricao} onChange={(e) => setNewCidDescricao(e.target.value)} />
            <Button variant="primary" fullWidth onClick={handleCreateCid} disabled={!newCidCodigo.trim() || !newCidDescricao.trim()}>
              Salvar e Selecionar
            </Button>
          </div>
        </BottomSheet>
      </main>
    </PageTransition>
  );
}

export default function EditarConsultaPage() {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <EditarConsultaContent />
    </Suspense>
  );
}