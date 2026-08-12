"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Loader2, FlaskConical, Building2, Stethoscope, Calendar, Plus, Trash2, Paperclip } from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { db, safeAddExame, safeAddMedico, safeAddHospital, safeAddLaboratorio } from "@/lib/db";
import { useMedicos } from "@/hooks/useMedicos";
import { useHospitais } from "@/hooks/useHospitais";
import { useLaboratorios } from "@/hooks/useLaboratorios"; // Certifique-se de ter ou use hospitais/farmacias
import { SelectionModal } from "@/components/SelectionModal";
import { BottomSheet } from "@/components/ui/BottomSheet";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function NovoExamePage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { medicos } = useMedicos();
  const { hospitais } = useHospitais();

  // Estados do Formulário
  const [nomesExames, setNomesExames] = useState(""); // Suporta múltiplos exames separados por vírgula ou linha
  const [localRealizacao, setLocalRealizacao] = useState("");
  const [medicoSolicitante, setMedicoSolicitante] = useState("");
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

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleCreateDoctor = async () => {
    if (!newDocName.trim()) return;
    trigger("vibrate");
    try {
      await safeAddMedico({
        nome: newDocName.trim(),
        especialidade: newDocEspecialidade.trim() || "Geral",
      });
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
      await safeAddHospital({
        nome: newLocalName.trim(),
      });
      setLocalRealizacao(newLocalName.trim());
      setIsCreatingLocal(false);
      setNewLocalName("");
      trigger("success");
    } catch (e) {
      console.error(e);
      trigger("error");
    }
  };

  const handleSave = async () => {
    trigger("vibrate");
    if (!nomesExames.trim()) {
      setErrors({ nomes: "Informe ao menos um exame" });
      trigger("error");
      return;
    }

    setSaving(true);
    try {
      // Separa os exames por vírgula ou quebra de linha para permitir múltiplos cadastros de uma vez
      const listaExames = nomesExames.split(/,|\n/).map(item => item.trim()).filter(Boolean);

      for (const nomeExame of listaExames) {
        await safeAddExame({
          nome: nomeExame,
          laboratorio: localRealizacao.trim() || undefined,
          medico: medicoSolicitante.trim() || undefined,
          data: dataSolicitacao,
          data_retorno: dataRetorno || undefined,
          motivo: motivo.trim() || undefined,
          observacoes: observacoes.trim() || undefined,
          anexo_url: anexoUrl || undefined,
        });
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
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div>
              <TextArea
                label="Nome do(s) Exame(s)"
                placeholder="Ex: Hemograma, Glicemia, Colesterol (Separe por vírgula para cadastrar vários de uma vez)"
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
                <input
                  type="date"
                  value={dataSolicitacao}
                  onChange={(e) => setDataSolicitacao(e.target.value)}
                  className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-xs text-ink-primary outline-none focus:border-ice/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-ink-primary">Data Apresentação <span className="text-[10px] text-ink-faint">(Alerta)</span></label>
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
              placeholder="Ex: Rotina anual, investigação de sintomas..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />

            <TextArea
              label="Observações / Resultados"
              placeholder="Adicione notas sobre os resultados..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />

            <Input
              label="Link ou Anexo (URL da foto/documento)"
              placeholder="https://..."
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
            {saving ? "Salvando..." : "Salvar Exame(s)"}
          </Button>
        </div>

        {/* MODAL DE SELEÇÃO DE LOCAL / HOSPITAL */}
        <SelectionModal
          isOpen={isLocalModalOpen}
          onClose={() => setIsLocalModalOpen(false)}
          onSelect={(item: any) => { trigger("vibrate"); setLocalRealizacao(item.nome); }}
          items={hospitais}
          title="Selecionar Hospital / Laboratório"
          placeholder="Buscar local..."
          renderItem={(item: any) => <p className="font-medium text-ink-primary">{item.nome}</p>}
          getItemId={(item: any) => item.id!}
          getItemLabel={(item: any) => item.nome}
          onCreateNew={() => {
            setIsLocalModalOpen(false);
            trigger("vibrate");
            setIsCreatingLocal(true);
          }}
          createNewLabel="Cadastrar Novo Local"
        />

        {/* MODAL DE SELEÇÃO DE MÉDICO */}
        <SelectionModal
          isOpen={isDoctorModalOpen}
          onClose={() => setIsDoctorModalOpen(false)}
          onSelect={(item: any) => { trigger("vibrate"); setMedicoSolicitante(item.nome); }}
          items={medicos}
          title="Selecionar Médico"
          placeholder="Buscar médico..."
          renderItem={(item: any) => (
            <div>
              <p className="font-medium text-ink-primary">{item.nome}</p>
              {item.especialidade && <p className="text-xs text-ink-muted">{item.especialidade}</p>}
            </div>
          )}
          getItemId={(item: any) => item.id!}
          getItemLabel={(item: any) => item.nome}
          onCreateNew={() => {
            setIsDoctorModalOpen(false);
            trigger("vibrate");
            setIsCreatingDoctor(true);
          }}
          createNewLabel="Cadastrar Novo Médico"
        />

        {/* BOTTOM SHEET PARA CRIAR MÉDICO RÁPIDO */}
        <BottomSheet isOpen={isCreatingDoctor} onClose={() => setIsCreatingDoctor(false)} title="Novo Médico">
          <div className="space-y-4 px-1 pb-2">
            <Input label="Nome do Médico" placeholder="Ex: Dr. João" value={newDocName} onChange={(e) => setNewDocName(e.target.value)} autoFocus />
            <Input label="Especialidade" placeholder="Ex: Cardiologista" value={newDocEspecialidade} onChange={(e) => setNewDocEspecialidade(e.target.value)} />
            <Button variant="primary" fullWidth onClick={handleCreateDoctor} disabled={!newDocName.trim()}>Salvar e Selecionar</Button>
          </div>
        </BottomSheet>

        {/* BOTTOM SHEET PARA CRIAR LOCAL RÁPIDO */}
        <BottomSheet isOpen={isCreatingLocal} onClose={() => setIsCreatingLocal(false)} title="Novo Local / Hospital">
          <div className="space-y-4 px-1 pb-2">
            <Input label="Nome do Hospital ou Laboratório" placeholder="Ex: Sabin, Hospital das Clínicas..." value={newLocalName} onChange={(e) => setNewLocalName(e.target.value)} autoFocus />
            <Button variant="primary" fullWidth onClick={handleCreateLocal} disabled={!newLocalName.trim()}>Salvar e Selecionar</Button>
          </div>
        </BottomSheet>
      </main>
    </PageTransition>
  );
}
