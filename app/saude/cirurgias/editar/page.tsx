"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  Activity,
  Calendar,
  Building2,
  UserCheck
} from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { SelectionModal } from "@/components/SelectionModal";

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
  if (clean.length !== 8) return new Date().toISOString().slice(0, 10);
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

function EditarCirurgiaContent() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const medicos = useLiveQuery(() => db.medicos.toArray(), []) || [];
  const hospitais = useLiveQuery(() => db.hospitais.toArray(), []) || [];

  const [isLoading, setIsLoading] = useState(true);
  const [procedimento, setProcedimento] = useState("");
  const [medicoId, setMedicoId] = useState("");
  const [hospitalId, setHospitalId] = useState("");
  
  const [isMedicoModalOpen, setIsMedicoModalOpen] = useState(false);
  const [isHospitalModalOpen, setIsHospitalModalOpen] = useState(false);

  const [dataDisplay, setDataDisplay] = useState("");
  const [status, setStatus] = useState<"agendada" | "realizada" | "cancelada">("agendada");
  const [observacoes, setObservacoes] = useState("");

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!id) {
      router.push("/saude/cirurgias");
      return;
    }
    db.cirurgias.get(id).then((data) => {
      if (data) {
        setProcedimento(data.procedimento);
        setMedicoId(data.medico_id || "");
        setHospitalId(data.hospital_id || "");
        setDataDisplay(formatDateToDisplay(data.data));
        setStatus(data.status || "agendada");
        setObservacoes(data.observacoes || "");
      } else {
        router.push("/saude/cirurgias");
      }
      setIsLoading(false);
    });
  }, [id, router]);

  const selectedMedico = medicos.find((m: any) => m.id === medicoId);
  const selectedHospital = hospitais.find((h: any) => h.id === hospitalId);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!procedimento.trim()) newErrors.procedimento = "O nome do procedimento é obrigatório";
    if (!dataDisplay || dataDisplay.length < 10) newErrors.data = "Data inválida";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    trigger("vibrate");
    if (!validate()) {
      trigger("error");
      return;
    }
    if (!id) return;

    setSaving(true);
    try {
      const dataISO = parseDateToISO(dataDisplay);

      await db.cirurgias.update(id, {
        procedimento: procedimento.trim(),
        medico_id: medicoId || undefined,
        hospital_id: hospitalId || undefined,
        data: dataISO,
        status,
        observacoes: observacoes.trim() || undefined,
        updated_at: new Date().toISOString(),
        synced: false,
      });

      trigger("success");
      router.replace(`/saude/cirurgias/detalhes?id=${id}`);
    } catch (err) {
      console.error("Erro ao atualizar cirurgia:", err);
      trigger("error");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <LoadingSkeleton />;

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { trigger("vibrate"); router.replace(`/saude/cirurgias/detalhes?id=${id}`); }} 
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-coral" />
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-coral/90">Edição</p>
              </div>
              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">Editar Cirurgia</h1>
            </div>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-6">
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <Input
              label="Procedimento / Cirurgia"
              placeholder="Ex: Artrodese..."
              value={procedimento}
              onChange={(e) => setProcedimento(e.target.value)}
              error={errors.procedimento}
              required
            />
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.03 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <label className="mb-1.5 block text-sm font-medium text-ink-primary">Médico / Cirurgião Responsável (Opcional)</label>
            <button 
              type="button"
              onClick={() => { trigger("vibrate"); setIsMedicoModalOpen(true); }} 
              className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <UserCheck size={16} className="text-coral shrink-0" />
                <span className="truncate">{selectedMedico ? `Dr(a). ${selectedMedico.nome}` : "Selecionar equipe médica"}</span>
              </div>
            </button>
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.06 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <label className="mb-1.5 block text-sm font-medium text-ink-primary">Hospital / Unidade (Opcional)</label>
            <button 
              type="button"
              onClick={() => { trigger("vibrate"); setIsHospitalModalOpen(true); }} 
              className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Building2 size={16} className="text-coral shrink-0" />
                <span className="truncate">{selectedHospital ? selectedHospital.nome : "Selecionar local da cirurgia"}</span>
              </div>
            </button>
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.09 }} className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-ink-primary">Data da Cirurgia <span className="text-coral">*</span></label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
                <input 
                  type="text" 
                  placeholder="DD/MM/AAAA"
                  maxLength={10}
                  value={dataDisplay} 
                  onChange={(e) => setDataDisplay(handleDateMask(e.target.value))} 
                  className={`w-full rounded-2xl border ${errors.data ? "border-coral/50" : "border-surface-border/50"} bg-surface-raised pl-9 pr-4 py-3 text-ink-primary font-mono text-sm`} 
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-ink-primary">Status</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["agendada", "realizada", "cancelada"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => { trigger("vibrate"); setStatus(st); }}
                    className={`rounded-xl border py-2 text-[11px] font-medium capitalize transition-all ${
                      status === st 
                        ? "border-coral bg-coral/15 text-coral shadow-sm" 
                        : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.12 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <TextArea 
              label="Orientações e Preparo (Opcional)" 
              value={observacoes} 
              onChange={(e) => setObservacoes(e.target.value)} 
              placeholder="Jejum, itens para levar..." 
            />
          </motion.div>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <Button 
            variant="primary" 
            size="lg" 
            fullWidth 
            onClick={handleSubmit} 
            disabled={saving}
            className="bg-coral text-void hover:bg-coral-light border-none"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : "Salvar Alterações"}
          </Button>
        </div>

        <SelectionModal 
          isOpen={isMedicoModalOpen} 
          onClose={() => setIsMedicoModalOpen(false)} 
          onSelect={(item: any) => setMedicoId(item.id!)} 
          items={medicos} 
          title="Selecionar Cirurgião" 
          renderItem={(item: any) => (
            <div>
              <p className="font-medium text-ink-primary">Dr(a). {item.nome}</p>
              <p className="text-xs text-ink-muted">{item.especialidade || "Especialidade não informada"}</p>
            </div>
          )} 
          getItemId={(item: any) => item.id!} 
          getItemLabel={(item: any) => item.nome} 
          onCreateNew={() => {}} 
          createNewLabel="" 
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
              <p className="text-xs text-ink-muted">{item.endereco || "Endereço não informado"}</p>
            </div>
          )} 
          getItemId={(item: any) => item.id!} 
          getItemLabel={(item: any) => item.nome} 
          onCreateNew={() => {}} 
          createNewLabel="" 
        />
      </main>
    </PageTransition>
  );
}

export default function EditarCirurgiaPage() {
  return <Suspense fallback={<LoadingSkeleton />}><EditarCirurgiaContent /></Suspense>;
}
