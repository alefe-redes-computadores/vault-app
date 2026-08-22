// app/saude/medicos/novo/page.tsx
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, Save, Building2, MapPin, FolderHeart, Check, X, Plus, Eraser } from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { useSubmitAction } from "@/hooks/useSubmitAction";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageTransition } from "@/components/PageTransition";
import { medicosRepository } from "@/lib/repositories/medicos";
import { useLiveQuery } from "dexie-react-hooks";
import { useAuth } from "@/hooks/useAuth";
import { useActivePersonId } from "@/hooks/useActivePersonId"; // 👈 1. IMPORTADO AQUI
import { db } from "@/lib/db";
import type { Medico, Tratamento, Hospital, LocalSaude } from "@/lib/types";

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

function formatPhone(value: string): string {
  const clean = value.replace(/\D/g, "").slice(0, 11);
  if (clean.length <= 2) return clean;
  if (clean.length <= 6) return `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
  if (clean.length <= 10) return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
}

export default function NovoMedicoPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { user } = useAuth();
  const { activePersonId } = useActivePersonId(); // 👈 2. CAPTURADO O ID DA PESSOA ATIVA
  const { run, isSubmitting } = useSubmitAction();
  const isSubmitLocked = useRef(false);

  const hospitais = useLiveQuery(() => db.hospitais.toArray(), [], []) || [];
  const locais = useLiveQuery(() => db.locais.toArray(), [], []) || [];
  const tratamentos = useLiveQuery(
    () => user ? db.tratamentos.where('user_id').equals(user.id).toArray() : [],
    [user?.id],
    []
  ) || [];

  const [nome, setNome] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [crm, setCrm] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [hospitalIds, setHospitalIds] = useState<string[]>([]);
  const [tratamentoIds, setTratamentoIds] = useState<string[]>([]);
  const [localIds, setLocalIds] = useState<string[]>([]);

  const [isHospModalOpen, setIsHospModalOpen] = useState(false);
  const [isTratModalOpen, setIsTratModalOpen] = useState(false);
  const [isLocalModalOpen, setIsLocalModalOpen] = useState(false);

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
          await medicosRepository.create({
            nome: nome.trim(),
            especialidade: especialidade.trim() || undefined,
            crm: crm.trim() || undefined,
            user_id: user?.id,
            person_id: activePersonId || undefined, // 👈 3. INJETADO NA RAIZ AQUI!
            telefone: telefone.trim() || undefined,
            email: email.trim() || undefined,
            hospital_ids: hospitalIds,
            tratamento_ids: tratamentoIds,
            local_ids: localIds,
          });
        },
        {
          successMessage: "Médico cadastrado com sucesso",
          errorMessage: "Erro ao cadastrar médico",
          goBackOnSuccess: true,
        }
      );
    } finally {
      isSubmitLocked.current = false;
    }
  };

  const MultiSelectModal = ({ isOpen, onClose, title, items, selectedIds, onChange, icon: Icon, onCreateNew, createLabel }: any) => {
    const toggle = (id: string) => {
      trigger("vibrate");
      if (selectedIds.includes(id)) onChange(selectedIds.filter((i: string) => i !== id));
      else onChange([...selectedIds, id]);
    };
    return (
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} className="fixed bottom-0 left-0 right-0 z-50 flex max-h-[85vh] flex-col rounded-t-[32px] bg-surface pb-safe shadow-2xl">
              <div className="flex items-center justify-between border-b border-surface-border/50 px-6 py-4">
                <h3 className="font-display text-lg font-semibold text-ink-primary flex items-center gap-2"><Icon size={18} className="text-ice"/> {title}</h3>
                <button onClick={onClose} className="rounded-full bg-surface-raised p-2 active:scale-95"><X size={18} className="text-ink-muted" /></button>
              </div>
              <div className="overflow-y-auto p-4 space-y-2">
                {items.length === 0 ? <p className="text-center text-sm text-ink-muted py-6">Nenhum registro encontrado.</p> : items.map((item: any) => {
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <button key={item.id} onClick={() => toggle(item.id)} className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-all active:scale-[0.98] ${isSelected ? "border-ice bg-ice/10" : "border-surface-border/50 bg-surface-raised"}`}>
                      <span className={`font-medium ${isSelected ? "text-ice" : "text-ink-primary"}`}>{item.nome}</span>
                      <div className={`flex h-6 w-6 items-center justify-center rounded-full border ${isSelected ? "border-ice bg-ice text-void" : "border-surface-border bg-transparent"}`}>
                        {isSelected && <Check size={14} strokeWidth={3} />}
                      </div>
                    </button>
                  );
                })}
                <button onClick={() => { onClose(); onCreateNew(); }} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-ice/40 bg-ice/5 py-4 text-sm font-semibold text-ice active:scale-95"><Plus size={18} /> {createLabel}</button>
              </div>
              <div className="p-4 border-t border-surface-border/50"><Button variant="primary" fullWidth onClick={onClose}>Confirmar {selectedIds.length} Selecionado(s)</Button></div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  };

  return (
    <PageTransition>
      <main className="min-h-[100dvh] bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button onClick={() => { trigger("vibrate"); router.back(); }} className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95" aria-label="Voltar">
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="min-w-0">
              <h1 className="font-display text-xl font-semibold text-ink-primary">Novo médico</h1>
              <p className="mt-1 text-sm text-ink-muted">Cadastre pra vincular em receitas e consultas.</p>
            </div>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-6">
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="space-y-3 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <Input label="Nome *" placeholder="Dr(a). Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} error={errors.nome} required />
            <Input label="Especialidade" placeholder="Ex: Cardiologia, Ortopedia..." value={especialidade} onChange={(e) => setEspecialidade(e.target.value)} />
            <Input label="CRM" placeholder="Ex: 12345-MG" value={crm} onChange={(e) => setCrm(e.target.value)} />
            <Input label="Telefone" placeholder="(00) 00000-0000" value={telefone} onChange={(e) => setTelefone(formatPhone(e.target.value))} />
            <Input label="E-mail" type="email" placeholder="opcional" value={email} onChange={(e) => setEmail(e.target.value)} />
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.05 }} className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted px-1">Atuação e Relacionamento</h2>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-ink-primary">Hospitais e Unidades que atende</label>
                {hospitalIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => { trigger("vibrate"); setHospitalIds([]); }}
                    className="flex items-center gap-1 text-[10px] font-bold text-coral bg-coral/10 px-2 py-0.5 rounded-md uppercase"
                  >
                    <Eraser size={12} /> Limpar
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => { trigger("vibrate"); setIsHospModalOpen(true); }}
                className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <Building2 size={16} className="text-violet-400" />
                  {hospitalIds.length > 0 ? `${hospitalIds.length} hospital(is) vinculado(s)` : "Vincular hospitais..."}
                </span>
                <span className="text-xs text-ice font-medium">Alterar</span>
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-ink-primary">Clínicas, Postos e Laboratórios</label>
                {localIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => { trigger("vibrate"); setLocalIds([]); }}
                    className="flex items-center gap-1 text-[10px] font-bold text-coral bg-coral/10 px-2 py-0.5 rounded-md uppercase"
                  >
                    <Eraser size={12} /> Limpar
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => { trigger("vibrate"); setIsLocalModalOpen(true); }}
                className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <MapPin size={16} className="text-emerald-400" />
                  {localIds.length > 0 ? `${localIds.length} local(is) vinculado(s)` : "Vincular locais de atendimento..."}
                </span>
                <span className="text-xs text-ice font-medium">Alterar</span>
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-ink-primary">Tratamentos acompanhados</label>
                {tratamentoIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => { trigger("vibrate"); setTratamentoIds([]); }}
                    className="flex items-center gap-1 text-[10px] font-bold text-coral bg-coral/10 px-2 py-0.5 rounded-md uppercase"
                  >
                    <Eraser size={12} /> Limpar
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => { trigger("vibrate"); setIsTratModalOpen(true); }}
                className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <FolderHeart size={16} className="text-coral" />
                  {tratamentoIds.length > 0 ? `${tratamentoIds.length} tratamento(s) vinculado(s)` : "Vincular tratamentos..."}
                </span>
                <span className="text-xs text-ice font-medium">Alterar</span>
              </button>
            </div>
          </motion.div>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <Button variant="primary" size="lg" fullWidth onClick={handleSubmit} disabled={isSubmitting} className="flex items-center justify-center gap-2 shadow-lg shadow-ice/10">
            {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Salvando...</> : <><Save size={16} /> Salvar médico</>}
          </Button>
        </div>

        <MultiSelectModal isOpen={isHospModalOpen} onClose={() => setIsHospModalOpen(false)} title="Hospitais Vinculados" items={hospitais} selectedIds={hospitalIds} onChange={setHospitalIds} icon={Building2} onCreateNew={() => router.push("/saude/hospitais/novo")} createLabel="Cadastrar Novo Hospital" />
        <MultiSelectModal isOpen={isLocalModalOpen} onClose={() => setIsLocalModalOpen(false)} title="Locais e Clínicas" items={locais} selectedIds={localIds} onChange={setLocalIds} icon={MapPin} onCreateNew={() => router.push("/saude/locais/novo")} createLabel="Cadastrar Novo Local" />
        <MultiSelectModal isOpen={isTratModalOpen} onClose={() => setIsTratModalOpen(false)} title="Tratamentos Acompanhados" items={tratamentos} selectedIds={tratamentoIds} onChange={setTratamentoIds} icon={FolderHeart} onCreateNew={() => router.push("/saude/tratamentos/novo")} createLabel="Cadastrar Novo Tratamento" />
      </main>
    </PageTransition>
  );
}
