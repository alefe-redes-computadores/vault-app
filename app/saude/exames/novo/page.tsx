// app/saude/exames/novo/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Save,
  Loader2,
  FlaskConical,
  Building2,
  Stethoscope,
  Calendar,
  Plus,
  X,
  Brain,
  Flame,
  HeartPulse,
  ShieldAlert,
  Activity,
} from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { useToast } from "@/components/ToastProvider";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { useMedicos } from "@/hooks/useMedicos";
import { useLocais } from "@/hooks/useLocais";
import { useTratamentos } from "@/hooks/useTratamentos";
import { usePersons } from "@/hooks/usePersons";
import { useExames } from "@/hooks/useExames";
import { SelectionModal } from "@/components/SelectionModal";
import { BottomSheet } from "@/components/ui/BottomSheet";
import type { Medico, LocalSaude, Tratamento, Person } from "@/lib/types";

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
  if (clean.length !== 8) return todayISO();
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
  const { showToast } = useToast();
  const router = useRouter();

  const { medicos, addMedico } = useMedicos();
  const { locais, addLocal } = useLocais();
  const { addTratamento } = useTratamentos();
  const persons = usePersons() as Person[];
  const { addExame } = useExames();

  const [personId, setPersonId] = useState<string>(persons[0]?.id || "");
  const [nomesExames, setNomesExames] = useState("");

  const [localRealizacao, setLocalRealizacao] = useState("");
  const [localId, setLocalId] = useState("");

  const [medicoSolicitante, setMedicoSolicitante] = useState("");
  const [medicoId, setMedicoId] = useState("");

  const [dataSolicitacaoDisplay, setDataSolicitacaoDisplay] = useState(formatDateToDisplay(todayISO()));
  const [dataRetornoDisplay, setDataRetornoDisplay] = useState("");
  const [motivo, setMotivo] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [anexoUrl, setAnexoUrl] = useState("");

  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [isLocalModalOpen, setIsLocalModalOpen] = useState(false);

  const [isCreatingDoctor, setIsCreatingDoctor] = useState(false);
  const [newDocName, setNewDocName] = useState("");
  const [newDocEspecialidade, setNewDocEspecialidade] = useState("");

  const [isCreatingLocal, setIsCreatingLocal] = useState(false);
  const [newLocalName, setNewLocalName] = useState("");

  const tratamentos = useLiveQuery(() => db.tratamentos.toArray(), []) || [];
  const [tratamentosSelecionados, setTratamentosSelecionados] = useState<string[]>([]);
  const [isTratamentoModalOpen, setIsTratamentoModalOpen] = useState(false);
  const [isCreatingTratamento, setIsCreatingTratamento] = useState(false);
  const [newTratamentoName, setNewTratamentoName] = useState("");
  const [isSavingTratamento, setIsSavingTratamento] = useState(false);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    if (!newTratamentoName.trim()) return;
    setIsSavingTratamento(true);
    trigger("vibrate");
    try {
      const newId = await addTratamento({
        person_id: personId,
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
    if (!personId) newErrors.personId = "Selecione uma pessoa";
    if (!nomesExames.trim()) newErrors.nomes = "Informe ao menos um exame";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    trigger("vibrate");
    if (!validate()) {
      trigger("error");
      return;
    }

    setSaving(true);
    try {
      const listaExames = nomesExames.split(/,|\n/).map((item) => item.trim()).filter(Boolean);
      const dataSolicitacaoISO = parseDateToISO(dataSolicitacaoDisplay);
      const dataRetornoISO = dataRetornoDisplay ? parseDateToISO(dataRetornoDisplay) : undefined;

      for (const nomeExame of listaExames) {
        await addExame({
          person_id: personId,
          nome: nomeExame,
          laboratorio: localRealizacao.trim() || undefined,
          local_id: localId || undefined,
          medico: medicoSolicitante.trim() || undefined,
          medico_id: medicoId || undefined,
          data: dataSolicitacaoISO,
          data_retorno: dataRetornoISO,
          motivo: motivo.trim() || undefined,
          observacoes: observacoes.trim() || undefined,
          anexo_url: anexoUrl.trim() || undefined,
          tratamento_ids: tratamentosSelecionados.length > 0 ? tratamentosSelecionados : undefined,
        });
      }

      trigger("success");
      showToast("Exame(s) cadastrado(s)", "success");
      router.back();
    } catch (error) {
      trigger("error");
      showToast("Erro ao salvar exame(s)", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-32">
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
          {/* Seletor de Pessoa */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <p className="mb-3 text-sm font-medium text-ink-primary">Para quem é o exame? <span className="text-coral">*</span></p>
            <div className="flex flex-wrap gap-2">
              {persons.map((person) => {
                const active = personId === person.id;
                return (
                  <button
                    key={person.id}
                    onClick={() => { trigger("vibrate"); setPersonId(person.id!); }}
                    className={`rounded-full border px-4 py-2.5 text-sm font-medium transition-all active:scale-95 ${
                      active ? "border-ice bg-ice/12 text-ice" : "border-surface-border/50 bg-surface-raised text-ink-muted"
                    }`}
                  >
                    {person.name}
                  </button>
                );
              })}
            </div>
            {errors.personId && <p className="mt-2 text-xs text-coral">{errors.personId}</p>}
          </motion.div>

          {/* Tratamentos Vinculados */}
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

          {/* Formulário */}
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
                onClick={() => { trigger("vibrate"); setIsLocalModalOpen(true); }}
                className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary flex items-center justify-between"
              >
                <span>{localRealizacao || "Selecionar laboratório ou hospital"}</span>
                <Building2 size={16} className="text-ink-muted" />
              </button>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-primary">Médico Solicitante</label>
              <button
                onClick={() => { trigger("vibrate"); setIsDoctorModalOpen(true); }}
                className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary flex items-center justify-between"
              >
                <span>{medicoSolicitante || "Selecionar médico"}</span>
                <Stethoscope size={16} className="text-ink-muted" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-ink-primary">Data da Solicitação</label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
                  <input
                    type="text"
                    placeholder="DD/MM/AAAA"
                    maxLength={10}
                    value={dataSolicitacaoDisplay}
                    onChange={(e) => setDataSolicitacaoDisplay(handleDateMask(e.target.value))}
                    className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised pl-9 pr-4 py-3 text-ink-primary font-mono text-sm outline-none focus:border-ice/50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-ink-primary">Data Apresentação <span className="text-[10px] text-ink-faint">(Alerta)</span></label>
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
            </div>

            <Input label="Motivo da Solicitação" placeholder="Ex: Rotina anual, investigação..." value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            <TextArea label="Observações / Resultados" placeholder="Adicione notas sobre os resultados..." value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
            <Input label="Link ou Anexo (URL)" placeholder="https://..." value={anexoUrl} onChange={(e) => setAnexoUrl(e.target.value)} />
          </motion.div>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <Button variant="primary" size="lg" fullWidth onClick={handleSave} disabled={saving} className="flex items-center justify-center gap-2">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {saving ? "Salvando..." : "Salvar Exame(s)"}
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
              <p className="font-medium text-ink-primary">{item.nome}</p>
              {item.especialidade && <p className="text-xs text-ink-muted">{item.especialidade}</p>}
            </div>
          )}
          getItemId={(item) => item.id!}
          getItemLabel={(item) => item.nome}
          onCreateNew={() => { setIsDoctorModalOpen(false); trigger("vibrate"); setIsCreatingDoctor(true); }}
          createNewLabel="Cadastrar Novo Médico"
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
          title="Vincular a Tratamento"
          placeholder="Buscar tratamento..."
          renderItem={(item) => {
            const IconComp = getTratamentoIcon(item.nome);
            return (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-400/10 text-violet-400">
                  <IconComp size={18} />
                </div>
                <div>
                  <p className="font-medium text-ink-primary">{item.nome}</p>
                </div>
              </div>
            );
          }}
          getItemId={(item) => item.id!}
          getItemLabel={(item) => item.nome}
          onCreateNew={() => { setIsTratamentoModalOpen(false); trigger("vibrate"); setIsCreatingTratamento(true); }}
          createNewLabel="Novo Tratamento"
        />

        <BottomSheet isOpen={isCreatingDoctor} onClose={() => setIsCreatingDoctor(false)} title="Novo Médico">
          <div className="space-y-4 px-1 pb-2">
            <Input label="Nome do Médico" placeholder="Ex: Dr. João" value={newDocName} onChange={(e) => setNewDocName(e.target.value)} autoFocus />
            <Input label="Especialidade" placeholder="Ex: Cardiologista" value={newDocEspecialidade} onChange={(e) => setNewDocEspecialidade(e.target.value)} />
            <Button variant="primary" fullWidth onClick={handleCreateDoctor} disabled={!newDocName.trim()}>Salvar e Selecionar</Button>
          </div>
        </BottomSheet>

        <BottomSheet isOpen={isCreatingLocal} onClose={() => setIsCreatingLocal(false)} title="Novo Local / Hospital">
          <div className="space-y-4 px-1 pb-2">
            <Input label="Nome do Hospital ou Laboratório" placeholder="Ex: Sabin, Hospital das Clínicas..." value={newLocalName} onChange={(e) => setNewLocalName(e.target.value)} autoFocus />
            <Button variant="primary" fullWidth onClick={handleCreateLocal} disabled={!newLocalName.trim()}>Salvar e Selecionar</Button>
          </div>
        </BottomSheet>

        <BottomSheet isOpen={isCreatingTratamento} onClose={() => { setIsCreatingTratamento(false); setNewTratamentoName(""); }} title="Cadastrar Tratamento">
          <div className="space-y-4 px-1 pb-2">
            <Input label="Nome" placeholder="Ex: TDAH, Dor Crônica..." value={newTratamentoName} onChange={(e) => setNewTratamentoName(e.target.value)} autoFocus />
            <Button variant="primary" fullWidth onClick={handleCreateTratamento} disabled={isSavingTratamento || !newTratamentoName.trim()} className="flex items-center justify-center gap-2">
              {isSavingTratamento ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Salvar e selecionar
            </Button>
          </div>
        </BottomSheet>
      </main>
    </PageTransition>
  );
}