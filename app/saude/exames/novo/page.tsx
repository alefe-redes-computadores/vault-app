"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Loader2, FlaskConical, Building2, Stethoscope, Calendar } from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { db } from "@/lib/db";
import { useMedicos } from "@/hooks/useMedicos";
import { useFarmacias } from "@/hooks/useFarmacias";
import { SelectionModal } from "@/components/SelectionModal";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function NovoExamePage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { medicos } = useMedicos();
  const { farmacias } = useFarmacias();

  const [nome, setNome] = useState("");
  const [laboratorio, setLaboratorio] = useState("");
  const [medico, setMedico] = useState("");
  const [dataExame, setDataExame] = useState(todayISO());
  const [observacoes, setObservacoes] = useState("");
  
  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [isLabModalOpen, setIsLabModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSave = async () => {
    trigger("vibrate");
    if (!nome.trim()) {
      setErrors({ nome: "Nome do exame é obrigatório" });
      trigger("error");
      return;
    }

    setSaving(true);
    try {
      // Salva na tabela exames do Dexie local (com sincronização para nuvem)
      await db.table("exames").add({
        nome: nome.trim(),
        laboratorio: laboratorio.trim() || undefined,
        medico: medico.trim() || undefined,
        data: dataExame,
        observacoes: observacoes.trim() || undefined,
        created_at: new Date().toISOString(),
        synced: false,
      });

      trigger("success");
      router.push("/saude/exames");
    } catch (error) {
      console.error("Erro ao salvar exame:", error);
      trigger("error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 header-safe-top backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { trigger("vibrate"); router.back(); }} 
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="min-w-0">
              <h1 className="font-display text-xl font-semibold text-ink-primary">Novo Exame</h1>
              <p className="text-xs text-ink-muted">Registro laboratorial</p>
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
              placeholder="Ex: Hemograma, Glicemia, Ressonância..."
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              error={errors.nome}
              required
            />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-primary">Laboratório / Hospital</label>
              <button
                onClick={() => { trigger("vibrate"); setIsLabModalOpen(true); }}
                className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary"
              >
                {laboratorio || "Selecionar laboratório ou local"}
              </button>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-primary">Médico Solicitante</label>
              <button
                onClick={() => { trigger("vibrate"); setIsDoctorModalOpen(true); }}
                className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary"
              >
                {medico || "Selecionar médico"}
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-ink-primary">Data do Exame</label>
              <input
                type="date"
                value={dataExame}
                onChange={(e) => setDataExame(e.target.value)}
                className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-ink-primary outline-none focus:border-ice/50"
              />
            </div>

            <TextArea
              label="Observações ou Resultados"
              placeholder="Adicione notas sobre os resultados ou valores de referência..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
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
            {saving ? "Salvando..." : "Salvar Exame"}
          </Button>
        </div>

        <SelectionModal
          isOpen={isLabModalOpen}
          onClose={() => setIsLabModalOpen(false)}
          onSelect={(item: any) => { trigger("vibrate"); setLaboratorio(item.nome); }}
          items={farmacias}
          title="Selecionar Local"
          placeholder="Buscar local..."
          renderItem={(item: any) => <p className="font-medium text-ink-primary">{item.nome}</p>}
          getItemId={(item: any) => item.id!}
          getItemLabel={(item: any) => item.nome}
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
        />
      </main>
    </PageTransition>
  );
}
