"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, Save, Loader2, FlaskConical, Building2, 
  Stethoscope, Calendar, Plus, Trash2, Paperclip, Activity, Brain, Flame, HeartPulse, ShieldAlert, X
} from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { db, safeAddExame, safeAddMedico, safeAddHospital, safeAddTratamento } from "@/lib/db";
import { useMedicos } from "@/hooks/useMedicos";
import { useHospitais } from "@/hooks/useHospitais";
import { usePersons } from "@/hooks/usePersons"; // <-- Importamos perfis
import { SelectionModal } from "@/components/SelectionModal";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useAuth } from "@/hooks/useAuth";
import { useLiveQuery } from "dexie-react-hooks";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
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
  
  const { medicos } = useMedicos();
  const { hospitais } = useHospitais();
  const persons = usePersons();

  // Estados do Formulário e Relacionais
  const [personId, setPersonId] = useState<string>(persons[0]?.id || "");
  const [nomesExames, setNomesExames] = useState(""); 
  
  const [localRealizacao, setLocalRealizacao] = useState("");
  const [laboratorioId, setLaboratorioId] = useState(""); // Novo
  
  const [medicoSolicitante, setMedicoSolicitante] = useState("");
  const [medicoId, setMedicoId] = useState(""); // Novo
  
  const [dataSolicitacao, setDataSolicitacao] = useState(todayISO());
  const [dataRetorno, setDataRetorno] = useState("");
  const [motivo, setMotivo] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [anexoUrl, setAnexoUrl] = useState("");

  // Modais de Seleção e Criação rápida
  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [isLocalModalOpen, setIsLocalModalOpen] = useState(false);
  
  const [isCreatingDoctor, setIsCreatingDoctor] = useState(false);
  const [newDocName, setNewDocName] = useState("");
  const [newDocEspecialidade, setNewDocEspecialidade] = useState("");

  const [isCreatingLocal, setIsCreatingLocal] = useState(false);
  const [newLocalName, setNewLocalName] = useState("");

  // Relacionamento com Tratamentos N:N
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
      const newId = await safeAddMedico({
        user_id: user?.id || "default_user",
        nome: newDocName.trim(),
        especialidade: newDocEspecialidade.trim() || "Geral",
      });
      setMedicoId(newId);
      setMedicoSolicitante(newDocName.trim());
      setIsCreatingDoctor(false);
      setNewDocName("");
      setNewDocEspecialidade("");
      trigger("success");
    } catch (e) {
      console.error(e);
      trigger("error");
    }
  };

  const handleCreateLocal = async () => {
    if (!newLocalName.trim()) return;
    trigger("vibrate");
    try {
      const newId = await safeAddHospital({
        user_id: user?.id || "default_user",
        nome: newLocalName.trim(),
      });
      setLaboratorioId(newId);
      setLocalRealizacao(newLocalName.trim());
      setIsCreatingLocal(false);
      setNewLocalName("");
      trigger("success");
    } catch (e) {
      console.error(e);
      trigger("error");
    }
  };

  const handleCreateTratamento = async () => {
    if (!newTratamentoName.trim()) return;
    setIsSavingTratamento(true);
    trigger("vibrate");
    try {
      const newId = await safeAddTratamento({
        user_id: user?.id || "",
        person_id: personId,
        nome: newTratamentoName.trim(),
        status: "ativo",
      });
      setTratamentosSelecionados(prev => [...prev, newId]);
      trigger("success");
      setIsCreatingTratamento(false);
      setNewTratamentoName("");
    } catch (error) {
      trigger("error");
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
      const listaExames = nomesExames.split(/,|\n/).map(item => item.trim()).filter(Boolean);

      for (const nomeExame of listaExames) {
        const exameId = await safeAddExame({
          user_id: user?.id || "default_user",
          person_id: personId, // NOVO: Vincula o dono do exame
          nome: nomeExame,
          laboratorio: localRealizacao.trim() || undefined,
          laboratorio_id: laboratorioId || undefined, // NOVO
          medico: medicoSolicitante.trim() || undefined,
          medico_id: medicoId || undefined, // NOVO
          data: dataSolicitacao,
          data_retorno: dataRetorno || undefined,
          motivo: motivo.trim() || undefined,
          observacoes: observacoes.trim() || undefined,
          anexo_url: anexoUrl || undefined,
        });

        // Sincroniza Relação N:N (Tabela exame_tratamentos)
        if (tratamentosSelecionados.length > 0) {
          await db.transaction('rw', db.exame_tratamentos, async () => {
            for (const tId of tratamentosSelecionados) {
              await db.exame_tratamentos.put({
                id: crypto.randomUUID(),
                exame_id: exameId,
                tratamento_id: tId,
                user_id: user?.id || "default_user",
                synced: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
            }
          });
        }
      }

      trigger("success");
      router.push("/saude/exames");
    } catch (error) {
      console.error("Erro ao salvar exames:", error);
      trigger("error");
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

          <motion.div variants={fadeUp} initial="initial" animate="animate" className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <p className="mb-3 text-sm font-medium text-ink-primary">Para quem é o exame? <span className="text-coral">*</span></p>
            <div className="flex flex-wrap gap-2">
              {persons.map((person: any) => {
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

          {/* TRATAMENTOS VINCULADOS */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="rounded-[28px] border border-violet-500/30 bg-surface p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-violet-400" />
                <label className="text-sm font-semibold text-ink-primary">Motivo / Tratamento (Opcional)</label>
              </div>
            </div>
            
            {tratamentosSelecionados.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {tratamentosSelecionados.map(id => {
                  const t = tratamentos.find((x: any) => x.id === id);
                  if (!t) return null;
                  const IconComp = getTratamentoIcon(t.nome);
                  return (
                    <div key={id} className="flex items-center gap-1.5 rounded-full bg-violet-400/10 border border-violet-400/20 px-3 py-1.5">
                      <IconComp size={14} className="text-violet-400" />
                      <span className="text-xs font-medium text-violet-300">{t.nome}</span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); trigger("vibrate"); setTratamentosSelecionados(prev => prev.filter(item => item !== id)); }}
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
                label="Nome do(s) Exame(s)"
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
                <input type="date" value={dataSolicitacao} onChange={(e) => setDataSolicitacao(e.target.value)} className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-xs text-ink-primary outline-none focus:border-ice/50" />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-ink-primary">Data Apresentação <span className="text-[10px] text-ink-faint">(Alerta)</span></label>
                <input type="date" value={dataRetorno} onChange={(e) => setDataRetorno(e.target.value)} className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-xs text-ink-primary outline-none focus:border-ice/50" />
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

        {/* MODAIS MANTIDAS IGUAIS */}
        <SelectionModal isOpen={isLocalModalOpen} onClose={() => setIsLocalModalOpen(false)} onSelect={(item: any) => { trigger("vibrate"); setLaboratorioId(item.id); setLocalRealizacao(item.nome); }} items={hospitais} title="Selecionar Hospital / Laboratório" placeholder="Buscar local..." renderItem={(item: any) => <p className="font-medium text-ink-primary">{item.nome}</p>} getItemId={(item: any) => item.id!} getItemLabel={(item: any) => item.nome} onCreateNew={() => { setIsLocalModalOpen(false); trigger("vibrate"); setIsCreatingLocal(true); }} createNewLabel="Cadastrar Novo Local" />
        <SelectionModal isOpen={isDoctorModalOpen} onClose={() => setIsDoctorModalOpen(false)} onSelect={(item: any) => { trigger("vibrate"); setMedicoId(item.id); setMedicoSolicitante(item.nome); }} items={medicos} title="Selecionar Médico" placeholder="Buscar médico..." renderItem={(item: any) => (<div><p className="font-medium text-ink-primary">{item.nome}</p>{item.especialidade && <p className="text-xs text-ink-muted">{item.especialidade}</p>}</div>)} getItemId={(item: any) => item.id!} getItemLabel={(item: any) => item.nome} onCreateNew={() => { setIsDoctorModalOpen(false); trigger("vibrate"); setIsCreatingDoctor(true); }} createNewLabel="Cadastrar Novo Médico" />
        <SelectionModal isOpen={isTratamentoModalOpen} onClose={() => setIsTratamentoModalOpen(false)} onSelect={(item: any) => { trigger("vibrate"); if (!tratamentosSelecionados.includes(item.id!)) setTratamentosSelecionados(prev => [...prev, item.id!]); }} items={tratamentos} title="Vincular a Tratamento" placeholder="Buscar tratamento..." renderItem={(item: any) => { const IconComp = getTratamentoIcon(item.nome); return (<div className="flex items-center gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-400/10 text-violet-400"><IconComp size={18} /></div><div><p className="font-medium text-ink-primary">{item.nome}</p></div></div>); }} getItemId={(item: any) => item.id!} getItemLabel={(item: any) => item.nome} onCreateNew={() => { setIsTratamentoModalOpen(false); trigger("vibrate"); setIsCreatingTratamento(true); }} createNewLabel="Novo Tratamento" />

        {/* BOTTOM SHEETS MANTIDOS */}
        <BottomSheet isOpen={isCreatingDoctor} onClose={() => setIsCreatingDoctor(false)} title="Novo Médico"><div className="space-y-4 px-1 pb-2"><Input label="Nome do Médico" placeholder="Ex: Dr. João" value={newDocName} onChange={(e) => setNewDocName(e.target.value)} autoFocus /><Input label="Especialidade" placeholder="Ex: Cardiologista" value={newDocEspecialidade} onChange={(e) => setNewDocEspecialidade(e.target.value)} /><Button variant="primary" fullWidth onClick={handleCreateDoctor} disabled={!newDocName.trim()}>Salvar e Selecionar</Button></div></BottomSheet>
        <BottomSheet isOpen={isCreatingLocal} onClose={() => setIsCreatingLocal(false)} title="Novo Local / Hospital"><div className="space-y-4 px-1 pb-2"><Input label="Nome do Hospital ou Laboratório" placeholder="Ex: Sabin, Hospital das Clínicas..." value={newLocalName} onChange={(e) => setNewLocalName(e.target.value)} autoFocus /><Button variant="primary" fullWidth onClick={handleCreateLocal} disabled={!newLocalName.trim()}>Salvar e Selecionar</Button></div></BottomSheet>
        <BottomSheet isOpen={isCreatingTratamento} onClose={() => { setIsCreatingTratamento(false); setNewTratamentoName(""); }} title="Cadastrar Tratamento" ><div className="space-y-4 px-1 pb-2"><Input label="Nome" placeholder="Ex: TDAH, Dor Crônica..." value={newTratamentoName} onChange={(e) => setNewTratamentoName(e.target.value)} autoFocus /><Button variant="primary" fullWidth onClick={handleCreateTratamento} disabled={isSavingTratamento || !newTratamentoName.trim()} className="flex items-center justify-center gap-2">{isSavingTratamento ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Salvar e selecionar</Button></div></BottomSheet>
      </main>
    </PageTransition>
  );
}
