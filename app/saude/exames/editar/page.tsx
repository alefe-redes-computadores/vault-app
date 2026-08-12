"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Loader2, Stethoscope, Building2 } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, safeUpdateExame, safeAddMedico, safeAddHospital } from "@/lib/db";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { useMedicos } from "@/hooks/useMedicos";
import { useHospitais } from "@/hooks/useHospitais";
import { SelectionModal } from "@/components/SelectionModal";
import { BottomSheet } from "@/components/ui/BottomSheet";

export default function EditarExamePage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const { medicos } = useMedicos();
  const { hospitais } = useHospitais();

  const exame = useLiveQuery(() => (id ? db.table("exames").get(id) : undefined), [id]);

  const [nome, setNome] = useState("");
  const [laboratorio, setLaboratorio] = useState("");
  const [medico, setMedico] = useState("");
  const [dataSolicitacao, setDataSolicitacao] = useState("");
  const [dataRetorno, setDataRetorno] = useState("");
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

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (exame) {
      setNome(exame.nome || "");
      setLaboratorio(exame.laboratorio || "");
      setMedico(exame.medico || "");
      setDataSolicitacao(exame.data || "");
      setDataRetorno(exame.data_retorno || "");
      setMotivo(exame.motivo || "");
      setObservacoes(exame.observacoes || "");
      setAnexoUrl(exame.anexo_url || "");
    }
  }, [exame]);

  if (!exame) {
    return <LoadingSkeleton />;
  }

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
        nome: nome.trim(),
        laboratorio: laboratorio.trim() || undefined,
        medico: medico.trim() || undefined,
        data: dataSolicitacao,
        data_retorno: dataRetorno || undefined,
        motivo: motivo.trim() || undefined,
        observacoes: observacoes.trim() || undefined,
        anexo_url: anexoUrl.trim() || undefined,
      });

      trigger("success");
      router.push(`/saude/exames/detalhes?id=${id}`);
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
          onSelect={(item: any) => { trigger("vibrate"); setLaboratorio(item.nome); }}
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
          onSelect={(item: any) => { trigger("vibrate"); setMedico(item.nome); }}
          items={medicos}
          title="Selecionar Médico"
          placeholder="Buscar médico..."
          renderItem={(item: any) => <p className="font-medium text-ink-primary">{item.nome}</p>}
          getItemId={(item: any) => item.id!}
          getItemLabel={(item: any) => item.nome}
          onCreateNew={() => { setIsDoctorModalOpen(false); setIsCreatingDoctor(true); }}
          createNewLabel="Cadastrar Novo Médico"
        />

        <BottomSheet isOpen={isCreatingDoctor} onClose={() => setIsCreatingDoctor(false)} title="Novo Médico">
          <div className="space-y-4 px-1 pb-2">
            <Input label="Nome" value={newDocName} onChange={(e) => setNewDocName(e.target.value)} autoFocus />
            <Input label="Especialidade" value={newDocEspecialidade} onChange={(e) => setNewDocEspecialidade(e.target.value)} />
            <Button variant="primary" fullWidth onClick={async () => {
              await safeAddMedico({ 
                user_id: "default_user", 
                nome: newDocName, 
                especialidade: newDocEspecialidade 
              });
              setMedico(newDocName);
              setIsCreatingDoctor(false);
            }}>Salvar e Selecionar</Button>
          </div>
        </BottomSheet>

        <BottomSheet isOpen={isCreatingLocal} onClose={() => setIsCreatingLocal(false)} title="Novo Local">
          <div className="space-y-4 px-1 pb-2">
            <Input label="Nome" value={newLocalName} onChange={(e) => setNewLocalName(e.target.value)} autoFocus />
            <Button variant="primary" fullWidth onClick={async () => {
              await safeAddHospital({ 
                user_id: "default_user", 
                nome: newLocalName 
              });
              setLaboratorio(newLocalName);
              setIsCreatingLocal(false);
            }}>Salvar e Selecionar</Button>
          </div>
        </BottomSheet>
      </main>
    </PageTransition>
  );
}
