// app/saude/medicos/novo/page.tsx
"use client";

import { useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Save, Building2, MapPin, FolderHeart, Plus, Eraser, X, Stethoscope } from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { useSubmitAction } from "@/hooks/useSubmitAction";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageTransition } from "@/components/PageTransition";
import { SelectionModal } from "@/components/SelectionModal";
import { medicosRepository } from "@/lib/repositories/medicos";
import { useLiveQuery } from "dexie-react-hooks";
import { useAuth } from "@/hooks/useAuth";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { db } from "@/lib/db";
import type { Hospital, LocalSaude, Tratamento } from "@/lib/types";

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
  const { activePersonId } = useActivePersonId();
  const { run, isSubmitting } = useSubmitAction();
  const isSubmitLocked = useRef(false);

  const hospitais = useLiveQuery(() => db.hospitais.toArray(), [], []) || [];
  const locais = useLiveQuery(() => db.locais.toArray(), [], []) || [];
  const tratamentos = useLiveQuery(() => db.tratamentos.toArray(), [], []) || [];

  const [nome, setNome] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [crm, setCrm] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [hospitalIds, setHospitalIds] = useState<string[]>([]);
  const [localIds, setLocalIds] = useState<string[]>([]);
  const [tratamentoIds, setTratamentoIds] = useState<string[]>([]);

  const [isHospitalModalOpen, setIsHospitalModalOpen] = useState(false);
  const [isLocalModalOpen, setIsLocalModalOpen] = useState(false);
  const [isTratamentoModalOpen, setIsTratamentoModalOpen] = useState(false);

  const hospitaisVinculados = useMemo(() => hospitais.filter(h => hospitalIds.includes(h.id!)), [hospitais, hospitalIds]);
  const locaisVinculados = useMemo(() => locais.filter(l => localIds.includes(l.id!)), [locais, localIds]);
  const tratamentosVinculados = useMemo(() => tratamentos.filter(t => tratamentoIds.includes(t.id!)), [tratamentos, tratamentoIds]);

  const handleAddHospital = (h: Hospital) => { if (h.id && !hospitalIds.includes(h.id)) setHospitalIds(p => [...p, h.id!]); };
  const handleRemoveHospital = (id: string) => { trigger("vibrate"); setHospitalIds(p => p.filter(i => i !== id)); };

  const handleAddLocal = (l: LocalSaude) => { if (l.id && !localIds.includes(l.id)) setLocalIds(p => [...p, l.id!]); };
  const handleRemoveLocal = (id: string) => { trigger("vibrate"); setLocalIds(p => p.filter(i => i !== id)); };

  const handleAddTratamento = (t: Tratamento) => { if (t.id && !tratamentoIds.includes(t.id)) setTratamentoIds(p => [...p, t.id!]); };
  const handleRemoveTratamento = (id: string) => { trigger("vibrate"); setTratamentoIds(p => p.filter(i => i !== id)); };

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
            user_id: user.id,
            person_id: activePersonId || undefined,
            nome: nome.trim(),
            especialidade: especialidade.trim() || undefined,
            crm: crm.trim() || undefined,
            telefone: telefone.trim() || undefined,
            email: email.trim() || undefined,
            hospital_ids: hospitalIds,
            local_ids: localIds,
            tratamento_ids: tratamentoIds,
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

  return (
    <PageTransition>
      <main className="min-h-[100dvh] bg-void pb-[calc(10rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button onClick={() => { trigger("vibrate"); router.back(); }} className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95" aria-label="Voltar">
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="min-w-0">
              <h1 className="font-display text-xl font-semibold text-ink-primary">Novo médico</h1>
              <p className="mt-1 text-sm text-ink-muted">Cadastre pra vincular em receitas e consultas.</p>
            </div>
          </div>
        </header>

        <section className="space-y-5 px-5 pt-6">
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="space-y-3 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted px-1">Dados do Profissional</h2>
            <Input label="Nome *" placeholder="Dr(a). Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} error={errors.nome} required />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Especialidade" placeholder="Ex: Cardiologia..." value={especialidade} onChange={(e) => setEspecialidade(e.target.value)} />
              <Input label="CRM" placeholder="Ex: 12345-MG" value={crm} onChange={(e) => setCrm(e.target.value)} />
            </div>
            <Input label="Telefone" placeholder="(00) 00000-0000" value={telefone} onChange={(e) => setTelefone(formatPhone(e.target.value))} />
            <Input label="E-mail" type="email" placeholder="medico@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.05 }} className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted px-1">Atuação e Relacionamento</h2>

            {/* Hospitais */}
            <div>
              <div className="flex items-center justify-between px-1 mb-2">
                <label className="block text-sm font-medium text-ink-primary">Hospitais e Unidades que atende</label>
                <div className="flex items-center gap-2">
                  {hospitalIds.length > 0 && (
                    <button type="button" onClick={() => { trigger("vibrate"); setHospitalIds([]); }} className="flex items-center gap-1 text-[10px] font-bold text-coral bg-coral/10 px-2 py-0.5 rounded-md uppercase">
                      <Eraser size={12} /> Limpar
                    </button>
                  )}
                  <button onClick={() => { trigger("vibrate"); setIsHospitalModalOpen(true); }} className="flex items-center gap-1 text-[10px] font-bold text-ice bg-ice/10 px-2.5 py-1 rounded-full active:scale-95 transition-all">
                    <Plus size={12} /> Adicionar
                  </button>
                </div>
              </div>
              {hospitaisVinculados.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-surface-border/60 bg-surface-raised/40 p-3 text-center"><p className="text-xs text-ink-muted">Nenhum hospital vinculado.</p></div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {hospitaisVinculados.map((h) => (
                    <div key={h.id} className="flex items-center gap-2 bg-surface-raised border border-surface-border/50 rounded-full pl-3 pr-1 py-1">
                      <span className="text-xs font-semibold text-ink-primary truncate max-w-[150px]">{h.nome}</span>
                      <button onClick={() => handleRemoveHospital(h.id!)} className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-border/50 text-ink-muted hover:bg-coral/20 hover:text-coral transition-colors"><X size={12} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Locais */}
            <div>
              <div className="flex items-center justify-between px-1 mb-2">
                <label className="block text-sm font-medium text-ink-primary">Clínicas, Postos e Laboratórios</label>
                <div className="flex items-center gap-2">
                  {localIds.length > 0 && (
                    <button type="button" onClick={() => { trigger("vibrate"); setLocalIds([]); }} className="flex items-center gap-1 text-[10px] font-bold text-coral bg-coral/10 px-2 py-0.5 rounded-md uppercase">
                      <Eraser size={12} /> Limpar
                    </button>
                  )}
                  <button onClick={() => { trigger("vibrate"); setIsLocalModalOpen(true); }} className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full active:scale-95 transition-all">
                    <Plus size={12} /> Adicionar
                  </button>
                </div>
              </div>
              {locaisVinculados.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-surface-border/60 bg-surface-raised/40 p-3 text-center"><p className="text-xs text-ink-muted">Nenhum local vinculado.</p></div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {locaisVinculados.map((l) => (
                    <div key={l.id} className="flex items-center gap-2 bg-surface-raised border border-surface-border/50 rounded-full pl-3 pr-1 py-1">
                      <span className="text-xs font-semibold text-ink-primary truncate max-w-[150px]">{l.nome}</span>
                      <button onClick={() => handleRemoveLocal(l.id!)} className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-border/50 text-ink-muted hover:bg-coral/20 hover:text-coral transition-colors"><X size={12} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tratamentos */}
            <div>
              <div className="flex items-center justify-between px-1 mb-2">
                <label className="block text-sm font-medium text-ink-primary">Tratamentos acompanhados</label>
                <div className="flex items-center gap-2">
                  {tratamentoIds.length > 0 && (
                    <button type="button" onClick={() => { trigger("vibrate"); setTratamentoIds([]); }} className="flex items-center gap-1 text-[10px] font-bold text-coral bg-coral/10 px-2 py-0.5 rounded-md uppercase">
                      <Eraser size={12} /> Limpar
                    </button>
                  )}
                  <button onClick={() => { trigger("vibrate"); setIsTratamentoModalOpen(true); }} className="flex items-center gap-1 text-[10px] font-bold text-violet-400 bg-violet-400/10 px-2.5 py-1 rounded-full active:scale-95 transition-all">
                    <Plus size={12} /> Adicionar
                  </button>
                </div>
              </div>
              {tratamentosVinculados.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-surface-border/60 bg-surface-raised/40 p-3 text-center"><p className="text-xs text-ink-muted">Nenhum tratamento vinculado.</p></div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tratamentosVinculados.map((t) => (
                    <div key={t.id} className="flex items-center gap-2 bg-surface-raised border border-surface-border/50 rounded-full pl-3 pr-1 py-1" style={{ borderLeft: `3px solid ${t.cor || '#8B5CF6'}` }}>
                      <span className="text-xs font-semibold text-ink-primary truncate max-w-[150px]">{t.nome}</span>
                      <button onClick={() => handleRemoveTratamento(t.id!)} className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-border/50 text-ink-muted hover:bg-coral/20 hover:text-coral transition-colors"><X size={12} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <Button variant="primary" size="lg" fullWidth onClick={handleSubmit} disabled={isSubmitting} className="flex items-center justify-center gap-2 shadow-lg shadow-ice/10">
            {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Salvando...</> : <><Save size={16} /> Salvar médico</>}
          </Button>
        </div>

        <SelectionModal<Hospital>
          isOpen={isHospitalModalOpen}
          onClose={() => setIsHospitalModalOpen(false)}
          onSelect={handleAddHospital}
          items={hospitais.filter(h => !hospitalIds.includes(h.id!))}
          title="Selecionar Hospital"
          placeholder="Buscar hospital..."
          getItemId={(item) => item.id!}
          getItemLabel={(item) => item.nome}
          renderItem={(item) => (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ice/10 text-ice"><Building2 size={16} /></div>
              <div><p className="text-sm font-semibold text-ink-primary">{item.nome}</p></div>
            </div>
          )}
          onCreateNew={() => { setIsHospitalModalOpen(false); router.push("/saude/hospitais/novo"); }}
          createNewLabel="Cadastrar Novo Hospital"
        />

        <SelectionModal<LocalSaude>
          isOpen={isLocalModalOpen}
          onClose={() => setIsLocalModalOpen(false)}
          onSelect={handleAddLocal}
          items={locais.filter(l => !localIds.includes(l.id!))}
          title="Selecionar Local"
          placeholder="Buscar local..."
          getItemId={(item) => item.id!}
          getItemLabel={(item) => item.nome}
          renderItem={(item) => (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-400"><MapPin size={16} /></div>
              <div><p className="text-sm font-semibold text-ink-primary">{item.nome}</p></div>
            </div>
          )}
          onCreateNew={() => { setIsLocalModalOpen(false); router.push("/saude/locais/novo"); }}
          createNewLabel="Cadastrar Novo Local"
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
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-400/10 text-violet-400"><FolderHeart size={16} /></div>
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
