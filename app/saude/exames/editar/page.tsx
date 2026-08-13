"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Loader2, Stethoscope, Building2, Activity, Plus, X, Brain, Flame, HeartPulse, ShieldAlert } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, safeUpdateExame, safeAddMedico, safeAddHospital, safeAddTratamento } from "@/lib/db";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { useMedicos } from "@/hooks/useMedicos";
import { useHospitais } from "@/hooks/useHospitais";
import { usePersons } from "@/hooks/usePersons";
import { SelectionModal } from "@/components/SelectionModal";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useAuth } from "@/hooks/useAuth";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

function getTratamentoIcon(nome: string) {
  const n = nome.toLowerCase();
  if (n.includes("tdah")) return Brain;
  if (n.includes("dor") || n.includes("neuropática")) return Flame;
  if (n.includes("depress")) return HeartPulse;
  if (n.includes("ansied") || n.includes("ansiolítico")) return ShieldAlert;
  return Activity;
}

export default function EditarExamePage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { user } = useAuth();

  const { medicos } = useMedicos();
  const { hospitais } = useHospitais();
  const persons = usePersons();

  const exame = useLiveQuery(() => (id ? db.table("exames").get(id) : undefined), [id]);

  const [personId, setPersonId] = useState("");
  const [nome, setNome] = useState("");
  
  const [laboratorio, setLaboratorio] = useState("");
  const [laboratorioId, setLaboratorioId] = useState("");
  
  const [medico, setMedico] = useState("");
  const [medicoId, setMedicoId] = useState("");
  
  const [dataSolicitacao, setDataSolicitacao] = useState("");
  const [dataRetorno, setDataRetorno] = useState("");
  const [motivo, setMotivo] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [anexoUrl, setAnexoUrl] = useState("");

  // Tratamentos Vinculados N:N
  const tratamentos = useLiveQuery(() => db.tratamentos.toArray(), []) || [];
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

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (exame) {
      setPersonId(exame.person_id || "");
      setNome(exame.nome || "");
      setLaboratorio(exame.laboratorio || "");
      setLaboratorioId(exame.laboratorio_id || "");
      setMedico(exame.medico || "");
      setMedicoId(exame.medico_id || "");
      setDataSolicitacao(exame.data || "");
      setDataRetorno(exame.data_retorno || "");
      setMotivo(exame.motivo || "");
      setObservacoes(exame.observacoes || "");
      setAnexoUrl(exame.anexo_url || "");

      // Busca vínculos N:N de tratamentos
      db.exame_tratamentos.where('exame_id').equals(id!).toArray().then(vinculos => {
        setTratamentosSelecionados(vinculos.map(v => v.tratamento_id));
      });
    }
  }, [id, exame]);

  if (!exame) {
    return <LoadingSkeleton />;
  }

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

  const handleSave = async () => {
    if (!id) return;
    trigger("vibrate");
    if (!nome.trim()) {
      setErrors({ nome: "Nome do exame é obrigatório" });
      trigger("error");
      return;
    }

    setSaving(true);
    try {
      await safeUpdateExame(id, {
        person_id: personId || undefined,
        nome: nome.trim(),
        laboratorio: laboratorio.trim() || undefined,
        laboratorio_id: laboratorioId || undefined,
        medico: medico.trim() || undefined,
        medico_id: medicoId || undefined,
        data: dataSolicitacao,
        data_retorno: dataRetorno || undefined,
        motivo: motivo.trim() || undefined,
        observacoes: observacoes.trim() || undefined,
        anexo_url: anexoUrl.trim() || undefined,
      });

      // Sincroniza a tabela N:N de exames e tratamentos
      await db.transaction('rw', db.exame_tratamentos, async () => {
        await db.exame_tratamentos.where('exame_id').equals(id).delete();
        for (const tId of tratamentosSelecionados) {
          await db.exame_tratamentos.put({
            id: crypto.randomUUID(),
            exame_id: id,
            tratamento_id: tId,
            user_id: user?.id || "default_user",
            synced: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      });

      trigger("success");
      router.replace(`/saude/exames/detalhes?id=${id}`);
    } catch (error) {
      console.error("Erro ao atualizar exame:", error);
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
              <h1 className="font-display text-xl font-semibold text-ink-primary">Editar Exame</h1>
              <p className="text-xs text-ink-muted">Atualizar dados e laudos</p>
            </div>
          </div>
        </header>

        <section className="px-5 pt-6 space-y-4">

          {/* SELETOR DE PESSOA */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <p className="mb-3 text-sm font-medium text-ink-primary">Pessoa <span className="text-coral">*</span></p>
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
          </motion.div>

          {/* TRATAMENTOS VINCULADOS */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="rounded-[28px] border border-violet-500/30 bg-surface p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-violet-400" />
                <label className="text-sm font-semibold text-ink-primary">Tratamentos / Motivos Vinculados</label>
              </div>
            </div>
            
            {tratamentosSelecionados.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {tratamentosSelecionados.map(tId => {
                  const t = tratamentos.find((x: any) => x.id === tId);
                  if (!t) return null;
                  const IconComp = getTratamentoIcon(t.nome);
                  return (
                    <div key={tId} className="flex items-center gap-1.5 rounded-full bg-violet-400/10 border border-violet-400/20 px-3 py-1.5">
                      <IconComp size={14} className="text-violet-400" />
                      <span className="text-xs font-medium text-violet-300">{t.nome}</span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); trigger("vibrate"); setTratamentosSelecionados(prev => prev.filter(item => item !== tId)); }}
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
            <Input
              label="Nome do Exame"
              placeholder="Ex: Hemograma..."
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              error={errors.nome}
              required
            />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-primary">Laboratório / Hospital</label>
              <button
                onClick={() => { trigger("vibrate"); setIsLocalModalOpen(true); }}
                className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary flex items-center justify-between"
              >
                <span>{laboratorio || "Selecionar laboratório ou hospital"}</span>
                <Building2 size={16} className="text-ink-muted" />
              </button>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-primary">Médico Solicitante</label>
              <button
                onClick={() => { trigger("vibrate"); setIsDoctorModalOpen(true); }}
                className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary flex items-center justify-between"
              >
                <span>{medico || "Selecionar médico"}</span>
                <Stethoscope size={16} className="text-ink-muted" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-ink-primary">Data da Solicitação</label>
                <input
                  type="date"
                  value={dataSolicitacao}
                  onChange={(e) => setDataSolicitacao(e.target.value)}
                  className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-xs text-ink-primary outline-none focus:border-ice/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-ink-primary">Data Apresentação</label>
                <input
                  type="date"
                  value={dataRetorno}
                  onChange={(e) => setDataRetorno(e.target.value)}
                  className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-xs text-ink-primary outline-none focus:border-ice/50"
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
              label="Link ou Anexo (URL)"
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
            disabled={saving}
            className="flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>

        <SelectionModal
          isOpen={isLocalModalOpen}
          onClose={() => setIsLocalModalOpen(false)}
          onSelect={(item: any) => { trigger("vibrate"); setLaboratorioId(item.id); setLaboratorio(item.nome); }}
          items={hospitais}
          title="Selecionar Hospital / Laboratório"
          placeholder="Buscar local..."
          renderItem={(item: any) => <p className="font-medium text-ink-primary">{item.nome}</p>}
          getItemId={(item: any) => item.id!}
          getItemLabel={(item: any) => item.nome}
          onCreateNew={() => { setIsLocalModalOpen(false); setIsCreatingLocal(true); }}
          createNewLabel="Cadastrar Novo Local"
        />

        <SelectionModal
          isOpen={isDoctorModalOpen}
          onClose={() => setIsDoctorModalOpen(false)}
          onSelect={(item: any) => { trigger("vibrate"); setMedicoId(item.id); setMedico(item.nome); }}
          items={medicos}
          title="Selecionar Médico"
          placeholder="Buscar médico..."
          renderItem={(item: any) => <p className="font-medium text-ink-primary">{item.nome}</p>}
          getItemId={(item: any) => item.id!}
          getItemLabel={(item: any) => item.nome}
          onCreateNew={() => { setIsDoctorModalOpen(false); setIsCreatingDoctor(true); }}
          createNewLabel="Cadastrar Novo Médico"
        />

        <SelectionModal
          isOpen={isTratamentoModalOpen}
          onClose={() => setIsTratamentoModalOpen(false)}
          onSelect={(item: any) => { 
            trigger("vibrate"); 
            if (!tratamentosSelecionados.includes(item.id!)) {
              setTratamentosSelecionados(prev => [...prev, item.id!]);
            }
          }}
          items={tratamentos}
          title="Vincular a Tratamento/CID"
          placeholder="Buscar tratamento..."
          renderItem={(item: any) => {
            const IconComp = getTratamentoIcon(item.nome);
            return (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-400/10 text-violet-400"><IconComp size={18} /></div>
                <div><p className="font-medium text-ink-primary">{item.nome}</p></div>
              </div>
            );
          }}
          getItemId={(item: any) => item.id!}
          getItemLabel={(item: any) => item.nome}
          onCreateNew={() => { setIsTratamentoModalOpen(false); trigger("vibrate"); setIsCreatingTratamento(true); }}
          createNewLabel="Novo Tratamento"
        />

        <BottomSheet isOpen={isCreatingTratamento} onClose={() => { trigger("vibrate"); setIsCreatingTratamento(false); setNewTratamentoName(""); }} title="Cadastrar Tratamento">
          <div className="space-y-4 px-1 pb-2">
            <Input label="Nome" placeholder="Ex: TDAH, Dor Crônica..." value={newTratamentoName} onChange={(e) => setNewTratamentoName(e.target.value)} autoFocus />
            <Button variant="primary" fullWidth onClick={handleCreateTratamento} disabled={isSavingTratamento || !newTratamentoName.trim()} className="flex items-center justify-center gap-2">
              {isSavingTratamento ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Salvar e selecionar
            </Button>
          </div>
        </BottomSheet>

        <BottomSheet isOpen={isCreatingDoctor} onClose={() => setIsCreatingDoctor(false)} title="Novo Médico">
          <div className="space-y-4 px-1 pb-2">
            <Input label="Nome" value={newDocName} onChange={(e) => setNewDocName(e.target.value)} autoFocus />
            <Input label="Especialidade" value={newDocEspecialidade} onChange={(e) => setNewDocEspecialidade(e.target.value)} />
            <Button variant="primary" fullWidth onClick={async () => {
              const newId = await safeAddMedico({ 
                user_id: user?.id || "default_user", 
                nome: newDocName, 
                especialidade: newDocEspecialidade 
              });
              setMedicoId(newId);
              setMedico(newDocName);
              setIsCreatingDoctor(false);
            }}>Salvar e Selecionar</Button>
          </div>
        </BottomSheet>

        <BottomSheet isOpen={isCreatingLocal} onClose={() => setIsCreatingLocal(false)} title="Novo Local">
          <div className="space-y-4 px-1 pb-2">
            <Input label="Nome" value={newLocalName} onChange={(e) => setNewLocalName(e.target.value)} autoFocus />
            <Button variant="primary" fullWidth onClick={async () => {
              const newId = await safeAddHospital({ 
                user_id: user?.id || "default_user", 
                nome: newLocalName 
              });
              setLaboratorioId(newId);
              setLaboratorio(newLocalName);
              setIsCreatingLocal(false);
            }}>Salvar e Selecionar</Button>
          </div>
        </BottomSheet>
      </main>
    </PageTransition>
  );
}
