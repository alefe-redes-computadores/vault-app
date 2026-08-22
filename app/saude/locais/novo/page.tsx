// app/saude/locais/novo/page.tsx
"use client";

import { useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Save, MapPin, Stethoscope, Activity, Plus, Eraser, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { useHapticFeedback } from "@/lib/haptics";
import { useSubmitAction } from "@/hooks/useSubmitAction";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageTransition } from "@/components/PageTransition";
import { SelectionModal } from "@/components/SelectionModal";
import { locaisRepository } from "@/lib/repositories/locais";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import type { LocalSaude, Medico, Tratamento } from "@/lib/types";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

const TIPOS_LOCAL = [
  { id: "posto_saude", label: "Posto de Saúde" },
  { id: "laboratorio", label: "Laboratório" },
  { id: "clinica", label: "Clínica" },
  { id: "outro", label: "Outro" },
];

function formatPhone(value: string): string {
  const clean = value.replace(/\D/g, "").slice(0, 11);
  if (clean.length <= 2) return clean;
  if (clean.length <= 6) return `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
  if (clean.length <= 10) return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
}

export default function NovoLocalPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { user } = useAuth();
  const { activePersonId } = useActivePersonId();
  const { run, isSubmitting } = useSubmitAction();
  const isSubmitLocked = useRef(false);

  const medicos = useLiveQuery(() => db.medicos.toArray(), [], []) || [];
  const tratamentos = useLiveQuery(() => db.tratamentos.toArray(), [], []) || [];

  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<string>("posto_saude");
  const [endereco, setEndereco] = useState("");
  const [telefone, setTelefone] = useState("");
  
  const [medicoIds, setMedicoIds] = useState<string[]>([]);
  const [tratamentoIds, setTratamentoIds] = useState<string[]>([]);

  const [isMedicoModalOpen, setIsMedicoModalOpen] = useState(false);
  const [isTratamentoModalOpen, setIsTratamentoModalOpen] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const medicosVinculadosObjects = useMemo(() => medicos.filter(m => medicoIds.includes(m.id!)), [medicos, medicoIds]);
  const tratamentosVinculadosObjects = useMemo(() => tratamentos.filter(t => tratamentoIds.includes(t.id!)), [tratamentos, tratamentoIds]);

  const handleAddMedico = (medico: Medico) => {
    if (medico.id && !medicoIds.includes(medico.id)) setMedicoIds(prev => [...prev, medico.id!]);
  };
  const handleRemoveMedico = (medicoId: string) => {
    trigger("vibrate");
    setMedicoIds(prev => prev.filter(id => id !== medicoId));
  };

  const handleAddTratamento = (tratamento: Tratamento) => {
    if (tratamento.id && !tratamentoIds.includes(tratamento.id)) setTratamentoIds(prev => [...prev, tratamento.id!]);
  };
  const handleRemoveTratamento = (tratamentoId: string) => {
    trigger("vibrate");
    setTratamentoIds(prev => prev.filter(id => id !== tratamentoId));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!nome.trim()) newErrors.nome = "Nome é obrigatório";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    trigger("vibrate");
    if (!validate()) {
      trigger("error");
      return;
    }
    if (!user?.id) return;

    if (isSubmitLocked.current || isSubmitting) return;
    isSubmitLocked.current = true;

    try {
      await run(
        async () => {
          await locaisRepository.create({
            user_id: user.id,
            person_id: activePersonId || undefined,
            nome: nome.trim(),
            tipo: tipo || undefined,
            endereco: endereco.trim() || undefined,
            telefone: telefone.trim() || undefined,
            medico_ids: medicoIds,
            tratamento_ids: tratamentoIds,
          });
        },
        {
          successMessage: "Local cadastrado com sucesso",
          errorMessage: "Erro ao cadastrar local",
          goBackOnSuccess: true,
        }
      );
    } finally {
      isSubmitLocked.current = false;
    }
  };

  return (
    <PageTransition>
      <main className="min-h-[100dvh] bg-void pb-[calc(10rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { trigger("vibrate"); router.back(); }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
              aria-label="Voltar"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>

            <div className="min-w-0">
              <h1 className="font-display text-xl font-semibold text-ink-primary">
                Novo local
              </h1>
              <p className="mt-1 text-sm text-ink-muted">
                Cadastre postos, laboratórios e clínicas.
              </p>
            </div>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-6">
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.28 }}
            className="space-y-3 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <Input
              label="Nome *"
              placeholder="Ex: UBS Central, Laboratório Sabin..."
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              error={errors.nome}
              required
            />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-primary">Tipo</label>
              <div className="flex flex-wrap gap-2">
                {TIPOS_LOCAL.map((tipoOption) => (
                  <button
                    key={tipoOption.id}
                    onClick={() => { trigger("vibrate"); setTipo(tipoOption.id); }}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all active:scale-95 ${
                      tipo === tipoOption.id
                        ? "border-emerald-400 bg-emerald-400/10 text-emerald-400"
                        : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                    }`}
                  >
                    {tipoOption.label}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Endereço"
              placeholder="Rua, número, bairro"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
            />
            <Input
              label="Telefone"
              placeholder="(00) 00000-0000"
              value={telefone}
              onChange={(e) => setTelefone(formatPhone(e.target.value))}
            />
          </motion.div>

          {/* VÍNCULO DE MÉDICOS */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="space-y-3 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                <Stethoscope size={14} className="text-ice" /> Médicos do Local
              </h2>
              <button onClick={() => { trigger("vibrate"); setIsMedicoModalOpen(true); }} className="flex items-center gap-1 text-[10px] font-bold text-ice bg-ice/10 px-2.5 py-1 rounded-full active:scale-95 transition-all">
                <Plus size={12} /> Adicionar
              </button>
            </div>
            {medicosVinculadosObjects.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-surface-border/60 bg-surface-raised/40 p-4 text-center"><p className="text-xs text-ink-muted">Nenhum médico vinculado.</p></div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {medicosVinculadosObjects.map((med) => (
                  <div key={med.id} className="flex items-center gap-2 bg-surface-raised border border-surface-border/50 rounded-full pl-3 pr-1 py-1">
                    <span className="text-xs font-semibold text-ink-primary truncate max-w-[150px]">Dr(a). {med.nome.split(' ')[0]}</span>
                    <button onClick={() => handleRemoveMedico(med.id!)} className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-border/50 text-ink-muted hover:bg-coral/20 hover:text-coral transition-colors"><X size={12} /></button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* VÍNCULO DE TRATAMENTOS */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="space-y-3 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                <Activity size={14} className="text-violet-400" /> Polo de Tratamentos
              </h2>
              <button onClick={() => { trigger("vibrate"); setIsTratamentoModalOpen(true); }} className="flex items-center gap-1 text-[10px] font-bold text-violet-400 bg-violet-400/10 px-2.5 py-1 rounded-full active:scale-95 transition-all">
                <Plus size={12} /> Adicionar
              </button>
            </div>
            {tratamentosVinculadosObjects.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-surface-border/60 bg-surface-raised/40 p-4 text-center"><p className="text-xs text-ink-muted">Nenhum tratamento vinculado a este local.</p></div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tratamentosVinculadosObjects.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 bg-surface-raised border border-surface-border/50 rounded-full pl-3 pr-1 py-1" style={{ borderLeft: `3px solid ${t.cor || '#8B5CF6'}` }}>
                    <span className="text-xs font-semibold text-ink-primary truncate max-w-[150px]">{t.nome}</span>
                    <button onClick={() => handleRemoveTratamento(t.id!)} className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-border/50 text-ink-muted hover:bg-coral/20 hover:text-coral transition-colors"><X size={12} /></button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 shadow-lg shadow-ice/10"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save size={16} />
                Salvar local
              </>
            )}
          </Button>
        </div>

        <SelectionModal<Medico>
          isOpen={isMedicoModalOpen}
          onClose={() => setIsMedicoModalOpen(false)}
          onSelect={handleAddMedico}
          items={medicos.filter(m => !medicoIds.includes(m.id!))}
          title="Selecionar Médico"
          placeholder="Buscar médico..."
          getItemId={(item) => item.id!}
          getItemLabel={(item) => item.nome}
          renderItem={(item) => (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ice/10 text-ice"><Stethoscope size={16} /></div>
              <div><p className="text-sm font-semibold text-ink-primary">Dr(a). {item.nome}</p></div>
            </div>
          )}
          onCreateNew={() => { setIsMedicoModalOpen(false); router.push("/saude/medicos/novo"); }}
          createNewLabel="Cadastrar Novo Médico"
        />

        <SelectionModal<Tratamento>
          isOpen={isTratamentoModalOpen}
          onClose={() => setIsTratamentoModalOpen(false)}
          onSelect={handleAddTratamento}
          items={tratamentos.filter(t => !tratamentoIds.includes(t.id!))}
          title="Selecionar Tratamento"
          placeholder="Buscar tratamento..."
          getItemId={(item) => item.id!}
          getItemLabel={(item) => item.nome}
          renderItem={(item) => (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-400/10 text-violet-400"><Activity size={16} /></div>
              <div><p className="text-sm font-semibold text-ink-primary">{item.nome}</p></div>
            </div>
          )}
          onCreateNew={() => { setIsTratamentoModalOpen(false); router.push("/saude/tratamentos/novo"); }}
          createNewLabel="Cadastrar Novo Tratamento"
        />
      </main>
    </PageTransition>
  );
}
