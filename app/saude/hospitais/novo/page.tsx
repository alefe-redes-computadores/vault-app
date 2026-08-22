// app/saude/hospitais/novo/page.tsx
"use client";

import { useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Save, Building2, Stethoscope, FolderHeart, Plus, Eraser, X } from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { useSubmitAction } from "@/hooks/useSubmitAction";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { PageTransition } from "@/components/PageTransition";
import { SelectionModal } from "@/components/SelectionModal";
import { hospitaisRepository } from "@/lib/repositories/hospitais";
import { useLiveQuery } from "dexie-react-hooks";
import { useAuth } from "@/hooks/useAuth";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { db } from "@/lib/db";
import type { Medico, Tratamento } from "@/lib/types";

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

const TIPOS_HOSPITAL = [
  { id: "hospital", label: "Hospital" },
  { id: "clinica", label: "Clínica" },
  { id: "laboratorio", label: "Laboratório" },
  { id: "outro", label: "Outro" },
];

function formatPhone(value: string): string {
  const clean = value.replace(/\D/g, "").slice(0, 11);
  if (clean.length <= 2) return clean;
  if (clean.length <= 6) return `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
  if (clean.length <= 10) return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
}

export default function NovoHospitalPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { user } = useAuth();
  const { activePersonId } = useActivePersonId();
  const { run, isSubmitting } = useSubmitAction();
  const isSubmitLocked = useRef(false);

  const medicos = useLiveQuery(() => db.medicos.toArray(), [], []) || [];
  const tratamentos = useLiveQuery(() => db.tratamentos.toArray(), [], []) || [];

  const [nome, setNome] = useState("");
  const [endereco, setEndereco] = useState("");
  const [telefone, setTelefone] = useState("");
  const [tipo, setTipo] = useState("hospital");
  const [observacoes, setObservacoes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [medicoIds, setMedicoIds] = useState<string[]>([]);
  const [tratamentoIds, setTratamentoIds] = useState<string[]>([]);

  const [isMedModalOpen, setIsMedModalOpen] = useState(false);
  const [isTratModalOpen, setIsTratModalOpen] = useState(false);

  const medicosVinculados = useMemo(() => medicos.filter(m => medicoIds.includes(m.id!)), [medicos, medicoIds]);
  const tratamentosVinculados = useMemo(() => tratamentos.filter(t => tratamentoIds.includes(t.id!)), [tratamentos, tratamentoIds]);

  const handleAddMedico = (m: Medico) => { if (m.id && !medicoIds.includes(m.id)) setMedicoIds(p => [...p, m.id!]); };
  const handleRemoveMedico = (mid: string) => { trigger("vibrate"); setMedicoIds(p => p.filter(i => i !== mid)); };

  const handleAddTratamento = (t: Tratamento) => { if (t.id && !tratamentoIds.includes(t.id)) setTratamentoIds(p => [...p, t.id!]); };
  const handleRemoveTratamento = (tid: string) => { trigger("vibrate"); setTratamentoIds(p => p.filter(i => i !== tid)); };

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
          await hospitaisRepository.create({
            user_id: user.id,
            person_id: activePersonId || undefined,
            nome: nome.trim(),
            endereco: endereco.trim() || undefined,
            telefone: telefone.trim() || undefined,
            tipo: tipo || undefined,
            observacoes: observacoes.trim() || undefined,
            medico_ids: medicoIds,
            tratamento_ids: tratamentoIds,
          });
        },
        { successMessage: "Hospital cadastrado com sucesso", errorMessage: "Erro ao cadastrar hospital", goBackOnSuccess: true }
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
            <button onClick={() => { trigger("vibrate"); router.back(); }} className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95">
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="min-w-0">
              <h1 className="font-display text-xl font-semibold text-ink-primary">Novo hospital</h1>
              <p className="mt-1 text-sm text-ink-muted">Cadastre pra vincular em prontuários e laudos.</p>
            </div>
          </div>
        </header>

        <section className="space-y-5 px-5 pt-6">
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="space-y-3 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted px-1">Dados da Unidade</h2>
            <Input label="Nome *" placeholder="Ex: Hospital Regional, Santa Casa..." value={nome} onChange={(e) => setNome(e.target.value)} error={errors.nome} required />
            
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-primary">Tipo</label>
              <div className="flex flex-wrap gap-2">
                {TIPOS_HOSPITAL.map((tipoOption) => (
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

            <Input label="Endereço" placeholder="Rua, número, bairro" value={endereco} onChange={(e) => setEndereco(e.target.value)} />
            <Input label="Telefone" placeholder="(00) 00000-0000" value={telefone} onChange={(e) => setTelefone(formatPhone(e.target.value))} />
            <TextArea label="Observações" placeholder="Horário de visita, contatos úteis..." value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.05 }} className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <div>
              <div className="flex items-center justify-between px-1 mb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                  <Stethoscope size={14} className="text-ice" /> Corpo Clínico ({medicoIds.length})
                </h2>
                <div className="flex items-center gap-2">
                  {medicoIds.length > 0 && (
                    <button type="button" onClick={() => { trigger("vibrate"); setMedicoIds([]); }} className="flex items-center gap-1 text-[10px] font-bold text-coral bg-coral/10 px-2 py-0.5 rounded-md uppercase">
                      <Eraser size={12} /> Limpar
                    </button>
                  )}
                  <button onClick={() => { trigger("vibrate"); setIsMedModalOpen(true); }} className="flex items-center gap-1 text-[10px] font-bold text-ice bg-ice/10 px-2.5 py-1 rounded-full active:scale-95 transition-all">
                    <Plus size={12} /> Adicionar
                  </button>
                </div>
              </div>
              {medicosVinculados.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-surface-border/60 bg-surface-raised/40 p-3 text-center">
                  <p className="text-xs text-ink-muted">Nenhum médico vinculado.</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {medicosVinculados.map((m: Medico) => (
                    <div key={m.id} className="flex items-center gap-2 bg-surface-raised border border-surface-border/50 rounded-full pl-3 pr-1 py-1">
                      <span className="text-xs font-semibold text-ink-primary truncate max-w-[150px]">Dr(a). {m.nome.split(' ')[0]}</span>
                      <button onClick={() => handleRemoveMedico(m.id!)} className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-border/50 text-ink-muted hover:bg-coral/20 hover:text-coral transition-colors">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between px-1 mb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                  <FolderHeart size={14} className="text-violet-400" /> Polo de Tratamentos ({tratamentoIds.length})
                </h2>
                <div className="flex items-center gap-2">
                  {tratamentoIds.length > 0 && (
                    <button type="button" onClick={() => { trigger("vibrate"); setTratamentoIds([]); }} className="flex items-center gap-1 text-[10px] font-bold text-coral bg-coral/10 px-2 py-0.5 rounded-md uppercase">
                      <Eraser size={12} /> Limpar
                    </button>
                  )}
                  <button onClick={() => { trigger("vibrate"); setIsTratModalOpen(true); }} className="flex items-center gap-1 text-[10px] font-bold text-violet-400 bg-violet-400/10 px-2.5 py-1 rounded-full active:scale-95 transition-all">
                    <Plus size={12} /> Adicionar
                  </button>
                </div>
              </div>
              {tratamentosVinculados.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-surface-border/60 bg-surface-raised/40 p-3 text-center">
                  <p className="text-xs text-ink-muted">Nenhum tratamento vinculado.</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tratamentosVinculados.map((t: Tratamento) => (
                    <div key={t.id} className="flex items-center gap-2 bg-surface-raised border border-surface-border/50 rounded-full pl-3 pr-1 py-1" style={{ borderLeft: `3px solid ${t.cor || '#8B5CF6'}` }}>
                      <span className="text-xs font-semibold text-ink-primary truncate max-w-[150px]">{t.nome}</span>
                      <button onClick={() => handleRemoveTratamento(t.id!)} className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-border/50 text-ink-muted hover:bg-coral/20 hover:text-coral transition-colors">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <Button variant="primary" size="lg" fullWidth onClick={handleSubmit} disabled={isSubmitting} className="flex items-center justify-center gap-2 shadow-lg shadow-ice/10">
            {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Salvando...</> : <><Save size={16} /> Salvar hospital</>}
          </Button>
        </div>

        <SelectionModal<Medico>
          isOpen={isMedModalOpen}
          onClose={() => setIsMedModalOpen(false)}
          onSelect={handleAddMedico}
          items={medicos.filter(m => !medicoIds.includes(m.id!))}
          title="Vincular Médico"
          placeholder="Buscar médico..."
          getItemId={i => i.id!}
          getItemLabel={i => i.nome}
          renderItem={(item) => (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ice/10 text-ice"><Stethoscope size={16} /></div>
              <div><p className="text-sm font-semibold text-ink-primary">Dr(a). {item.nome}</p></div>
            </div>
          )}
          onCreateNew={() => { setIsMedModalOpen(false); router.push("/saude/medicos/novo"); }}
          createNewLabel="Cadastrar Novo Médico"
        />

        <SelectionModal<Tratamento>
          isOpen={isTratModalOpen}
          onClose={() => setIsTratModalOpen(false)}
          onSelect={handleAddTratamento}
          items={tratamentos.filter(t => !tratamentoIds.includes(t.id!))}
          title="Vincular Tratamento"
          placeholder="Buscar tratamento..."
          getItemId={i => i.id!}
          getItemLabel={i => i.nome}
          renderItem={(item) => (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-400/10 text-violet-400"><FolderHeart size={16} /></div>
              <div><p className="text-sm font-semibold text-ink-primary">{item.nome}</p></div>
            </div>
          )}
          onCreateNew={() => { setIsTratModalOpen(false); router.push("/saude/tratamentos/novo"); }}
          createNewLabel="Cadastrar Novo Tratamento"
        />
      </main>
    </PageTransition>
  );
}
