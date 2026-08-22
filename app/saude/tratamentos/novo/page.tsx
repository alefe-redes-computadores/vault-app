// app/saude/tratamentos/novo/page.tsx
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, Save, FolderHeart, ChevronRight, X, Check, Stethoscope, Building2, MapPin, Plus } from "lucide-react";
import { useCids } from "@/hooks/useCids";
import { usePersons } from "@/hooks/usePersons";
import { useAuth } from "@/hooks/useAuth";
import { useHapticFeedback } from "@/lib/haptics";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { useSubmitAction } from "@/hooks/useSubmitAction";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageTransition } from "@/components/PageTransition";
import { SelectionModal } from "@/components/SelectionModal";
import { tratamentosRepository } from "@/lib/repositories/tratamentos";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import type { Cid, Person, Medico, Hospital, LocalSaude } from "@/lib/types";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

const CORES_TRATAMENTO = [
  { label: "Roxo", hex: "#8B5CF6" },
  { label: "Azul", hex: "#3B82F6" },
  { label: "Esmeralda", hex: "#10B981" },
  { label: "Amarelo", hex: "#F59E0B" },
  { label: "Coral", hex: "#EF4444" },
  { label: "Rosa", hex: "#EC4899" },
  { label: "Ciano", hex: "#06B6D4" },
];

export default function NovoTratamentoPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { user } = useAuth();
  const { activePersonId } = useActivePersonId();
  const { cids } = useCids();
  const persons = usePersons() as Person[];
  const { run, isSubmitting } = useSubmitAction();
  const isSubmitLocked = useRef(false);

  const medicos = useLiveQuery(() => db.medicos.toArray(), [], []) || [];
  const hospitais = useLiveQuery(() => db.hospitais.toArray(), [], []) || [];
  const locais = useLiveQuery(() => db.locais.toArray(), [], []) || [];

  const [personId, setPersonId] = useState<string>(persons[0]?.id || "");
  const [nome, setNome] = useState("");
  const [cidIds, setCidIds] = useState<string[]>([]);
  const [status, setStatus] = useState<"ativo" | "concluido" | "suspenso">("ativo");
  const [cor, setCor] = useState("#8B5CF6");
  const [observacoes, setObservacoes] = useState("");
  
  const [medicoIds, setMedicoIds] = useState<string[]>([]);
  const [hospitalIds, setHospitalIds] = useState<string[]>([]);
  const [localIds, setLocalIds] = useState<string[]>([]);

  const [error, setError] = useState("");

  const [isCidModalOpen, setIsCidModalOpen] = useState(false);
  const [showAddCidPrompt, setShowAddCidPrompt] = useState(false);
  const [isMedicoModalOpen, setIsMedicoModalOpen] = useState(false);
  const [isHospitalModalOpen, setIsHospitalModalOpen] = useState(false);
  const [isLocalModalOpen, setIsLocalModalOpen] = useState(false);

  const medicosVinculados = medicos.filter(m => medicoIds.includes(m.id!));
  const hospitaisVinculados = hospitais.filter(h => hospitalIds.includes(h.id!));
  const locaisVinculados = locais.filter(l => localIds.includes(l.id!));

  const handleSubmit = async () => {
    trigger("vibrate");
    if (!personId) {
      setError("Selecione uma pessoa");
      trigger("error");
      return;
    }
    if (!nome.trim()) {
      setError("Nome do tratamento é obrigatório");
      trigger("error");
      return;
    }
    if (!user?.id) {
      setError("Usuário não autenticado");
      trigger("error");
      return;
    }

    if (isSubmitLocked.current || isSubmitting) return;
    isSubmitLocked.current = true;

    try {
      await run(
        async () => {
          const cleanCids = cidIds.length > 0 ? Array.from(new Set(cidIds)) : undefined;

          await tratamentosRepository.create({
            user_id: user.id,
            person_id: personId || (activePersonId as string) || undefined,
            nome: nome.trim(),
            cid_ids: cleanCids,
            status,
            cor,
            observacoes: observacoes.trim() || undefined,
            medico_ids: medicoIds,
            hospital_ids: hospitalIds,
            local_ids: localIds,
          });
        },
        {
          successMessage: "Tratamento cadastrado com sucesso",
          errorMessage: "Erro ao salvar tratamento",
          goBackOnSuccess: true,
        }
      );
    } finally {
      isSubmitLocked.current = false;
    }
  };

  const handleAddCid = (cidId: string) => {
    trigger("vibrate");
    if (!cidIds.includes(cidId)) {
      setCidIds([...cidIds, cidId]);
    }
    setIsCidModalOpen(false);
    setShowAddCidPrompt(true);
  };

  const handleRemoveCid = (cidId: string) => {
    trigger("vibrate");
    setCidIds(cidIds.filter((id) => id !== cidId));
  };

  const handleAddMedico = (m: Medico) => { if (m.id && !medicoIds.includes(m.id)) setMedicoIds(p => [...p, m.id!]); };
  const handleRemoveMedico = (id: string) => { trigger("vibrate"); setMedicoIds(p => p.filter(i => i !== id)); };

  const handleAddHospital = (h: Hospital) => { if (h.id && !hospitalIds.includes(h.id)) setHospitalIds(p => [...p, h.id!]); };
  const handleRemoveHospital = (id: string) => { trigger("vibrate"); setHospitalIds(p => p.filter(i => i !== id)); };

  const handleAddLocal = (l: LocalSaude) => { if (l.id && !localIds.includes(l.id)) setLocalIds(p => [...p, l.id!]); };
  const handleRemoveLocal = (id: string) => { trigger("vibrate"); setLocalIds(p => p.filter(i => i !== id)); };

  const selectedCids = cids?.filter((c: Cid) => c.id && cidIds.includes(c.id)) || [];

  return (
    <PageTransition>
      <main className="min-h-[100dvh] bg-void pb-[calc(10rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 header-safe-top backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { trigger("vibrate"); router.back(); }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">Novo Tratamento</h1>
            </div>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-6">
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <p className="mb-3 text-sm font-medium text-ink-primary">Para quem? <span className="text-coral">*</span></p>
            <div className="flex flex-wrap gap-2">
              {persons.map((p: Person) => (
                <button
                  key={p.id}
                  onClick={() => { trigger("vibrate"); setPersonId(p.id!); }}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                    personId === p.id
                      ? "border-ice bg-ice/12 text-ice"
                      : "border-surface-border/50 bg-surface-raised text-ink-muted"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
            {error && !personId && <p className="mt-2 text-xs text-coral">Selecione uma pessoa</p>}
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.02 }} className="space-y-5 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <Input
              label="Nome do Tratamento"
              placeholder="Ex: TDAH, Dor Crônica, Depressão..."
              value={nome}
              onChange={(e) => {
                setNome(e.target.value);
                if (error) setError("");
              }}
              error={error}
              required
              autoFocus
            />

            <div className="space-y-2">
              <label className="block text-sm font-medium text-ink-primary">Diagnósticos (CIDs)</label>
              {selectedCids.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedCids.map((c: Cid) => (
                    <div key={c.id} className="flex items-center gap-1.5 rounded-full bg-violet-400/10 border border-violet-400/20 px-3 py-1.5">
                      <span className="text-xs font-medium text-violet-300">
                        {c.codigo !== "N/A" ? `${c.codigo} - ` : ""}{c.descricao}
                      </span>
                      <button onClick={() => handleRemoveCid(c.id!)} className="text-violet-400/60 hover:text-coral transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => { trigger("vibrate"); setIsCidModalOpen(true); }}
                className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left transition-all active:scale-95"
              >
                <span className="text-ink-muted">
                  {selectedCids.length > 0 ? "Adicionar outro CID" : "Toque para adicionar CID (opcional)"}
                </span>
                <ChevronRight size={18} className="text-ink-muted shrink-0 ml-2" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-ink-primary">Identificação Visual</label>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {CORES_TRATAMENTO.map((item) => (
                  <button
                    key={item.hex}
                    type="button"
                    onClick={() => { trigger("vibrate"); setCor(item.hex); }}
                    className={`relative h-10 w-10 shrink-0 rounded-full border-2 transition-all active:scale-95 ${
                      cor === item.hex ? "border-ice scale-110 shadow-md" : "border-transparent"
                    }`}
                    style={{ backgroundColor: item.hex }}
                    title={item.label}
                  >
                    {cor === item.hex && <Check size={16} className="absolute inset-0 m-auto text-void" strokeWidth={3} />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-ink-primary">Status inicial</label>
              <div className="grid grid-cols-3 gap-2">
                {(["ativo", "concluido", "suspenso"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => { trigger("vibrate"); setStatus(s); }}
                    className={`rounded-2xl border px-1 py-2.5 text-xs font-medium capitalize transition-all active:scale-95 text-center ${
                      status === s ? "border-violet-400 bg-violet-400/12 text-violet-300" : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                    }`}
                  >
                    {s === "ativo" ? "Em andamento" : s === "concluido" ? "Concluído" : "Suspenso"}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-ink-primary">Observações</label>
              <textarea
                rows={3}
                placeholder="Histórico, sintomas, detalhes..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-sm text-ink-primary outline-none focus:border-ice/50 resize-none"
              />
            </div>
          </motion.div>

          {/* EQUIPE MÉDICA E LOCAIS (DIRETOS) */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.04 }} className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            
            {/* Médicos */}
            <div>
              <div className="flex items-center justify-between px-1 mb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5"><Stethoscope size={14} className="text-ice" /> Médicos Responsáveis</h2>
                <button onClick={() => setIsMedicoModalOpen(true)} className="flex items-center gap-1 text-[10px] font-bold text-ice bg-ice/10 px-2.5 py-1 rounded-full active:scale-95 transition-all"><Plus size={12} /> Adicionar</button>
              </div>
              {medicosVinculados.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-surface-border/60 bg-surface-raised/40 p-3 text-center"><p className="text-xs text-ink-muted">Nenhum médico vinculado.</p></div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {medicosVinculados.map((m) => (
                    <div key={m.id} className="flex items-center gap-2 bg-surface-raised border border-surface-border/50 rounded-full pl-3 pr-1 py-1"><span className="text-xs font-semibold text-ink-primary truncate max-w-[150px]">Dr(a). {m.nome.split(' ')[0]}</span><button onClick={() => handleRemoveMedico(m.id!)} className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-border/50 text-ink-muted hover:bg-coral/20 hover:text-coral transition-colors"><X size={12} /></button></div>
                  ))}
                </div>
              )}
            </div>

            {/* Hospitais */}
            <div>
              <div className="flex items-center justify-between px-1 mb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5"><Building2 size={14} className="text-violet-400" /> Hospitais / Clínicas</h2>
                <button onClick={() => setIsHospitalModalOpen(true)} className="flex items-center gap-1 text-[10px] font-bold text-violet-400 bg-violet-400/10 px-2.5 py-1 rounded-full active:scale-95 transition-all"><Plus size={12} /> Adicionar</button>
              </div>
              {hospitaisVinculados.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-surface-border/60 bg-surface-raised/40 p-3 text-center"><p className="text-xs text-ink-muted">Nenhum hospital vinculado.</p></div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {hospitaisVinculados.map((h) => (
                    <div key={h.id} className="flex items-center gap-2 bg-surface-raised border border-surface-border/50 rounded-full pl-3 pr-1 py-1"><span className="text-xs font-semibold text-ink-primary truncate max-w-[150px]">{h.nome}</span><button onClick={() => handleRemoveHospital(h.id!)} className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-border/50 text-ink-muted hover:bg-coral/20 hover:text-coral transition-colors"><X size={12} /></button></div>
                  ))}
                </div>
              )}
            </div>

            {/* Locais */}
            <div>
              <div className="flex items-center justify-between px-1 mb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5"><MapPin size={14} className="text-emerald-400" /> Postos de Saúde / C.A.P.S</h2>
                <button onClick={() => setIsLocalModalOpen(true)} className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full active:scale-95 transition-all"><Plus size={12} /> Adicionar</button>
              </div>
              {locaisVinculados.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-surface-border/60 bg-surface-raised/40 p-3 text-center"><p className="text-xs text-ink-muted">Nenhum posto ou local vinculado.</p></div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {locaisVinculados.map((l) => (
                    <div key={l.id} className="flex items-center gap-2 bg-surface-raised border border-surface-border/50 rounded-full pl-3 pr-1 py-1"><span className="text-xs font-semibold text-ink-primary truncate max-w-[150px]">{l.nome}</span><button onClick={() => handleRemoveLocal(l.id!)} className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-border/50 text-ink-muted hover:bg-coral/20 hover:text-coral transition-colors"><X size={12} /></button></div>
                  ))}
                </div>
              )}
            </div>

          </motion.div>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 shadow-lg shadow-violet-400/10"
          >
            {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Salvando...</> : <><Save size={16} /> Salvar tratamento</>}
          </Button>
        </div>

        <SelectionModal<Cid>
          isOpen={isCidModalOpen}
          onClose={() => setIsCidModalOpen(false)}
          onSelect={(item) => handleAddCid(item.id!)}
          items={cids || []}
          title="Adicionar Diagnóstico (CID)"
          placeholder="Buscar por código ou descrição..."
          renderItem={(item: Cid) => (
            <div>
              <p className="font-medium text-ink-primary">{item.descricao}</p>
              {item.codigo && item.codigo !== "N/A" && <p className="text-xs text-ink-muted">CID: {item.codigo}</p>}
            </div>
          )}
          getItemId={(item: Cid) => item.id!}
          getItemLabel={(item: Cid) => item.descricao}
          onCreateNew={() => { setIsCidModalOpen(false); router.push("/saude/cids/novo"); }}
          createNewLabel="Cadastrar Novo CID"
        />

        <SelectionModal<Medico>
          isOpen={isMedicoModalOpen}
          onClose={() => setIsMedicoModalOpen(false)}
          onSelect={handleAddMedico}
          items={medicos.filter(m => !medicoIds.includes(m.id!))}
          title="Vincular Médico"
          placeholder="Buscar médico..."
          getItemId={(item) => item.id!}
          getItemLabel={(item) => item.nome}
          renderItem={(item) => (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ice/10 text-ice"><Stethoscope size={16} /></div>
              <div><p className="text-sm font-semibold text-ink-primary">Dr(a). {item.nome}</p></div>
            </div>
          )}
          onCreateNew={() => { setIsMedicoModalOpen(false); router.push("/saude/medicos/novo"); }}
          createNewLabel="Cadastrar Novo Médico"
        />

        <SelectionModal<Hospital>
          isOpen={isHospitalModalOpen}
          onClose={() => setIsHospitalModalOpen(false)}
          onSelect={handleAddHospital}
          items={hospitais.filter(h => !hospitalIds.includes(h.id!))}
          title="Vincular Hospital"
          placeholder="Buscar hospital..."
          getItemId={(item) => item.id!}
          getItemLabel={(item) => item.nome}
          renderItem={(item) => (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-400/10 text-violet-400"><Building2 size={16} /></div>
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
          title="Vincular Posto/Local"
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

        <AnimatePresence>
          {showAddCidPrompt && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-sm"
              onClick={() => setShowAddCidPrompt(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm rounded-[28px] border border-surface-border bg-surface p-6 shadow-xl space-y-4"
              >
                <div className="flex items-center gap-3 text-violet-400">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-400/10">
                    <FolderHeart size={22} />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-bold text-ink-primary">Adicionar outro CID?</h3>
                    <p className="text-xs text-ink-muted">Você pode vincular múltiplos diagnósticos</p>
                  </div>
                </div>
                <p className="text-sm text-ink-muted leading-relaxed">Deseja adicionar outro CID a este tratamento?</p>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => { trigger("vibrate"); setShowAddCidPrompt(false); }}
                    className="flex-1 rounded-2xl border border-surface-border/50 bg-surface-raised py-3 text-xs font-semibold text-ink-primary active:scale-95 transition-all"
                  >
                    Não, finalizar
                  </button>
                  <button
                    onClick={() => { trigger("vibrate"); setShowAddCidPrompt(false); setIsCidModalOpen(true); }}
                    className="flex-1 rounded-2xl bg-violet-400 py-3 text-xs font-semibold text-void active:scale-95 transition-all shadow-md shadow-violet-400/20"
                  >
                    Sim, adicionar
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </PageTransition>
  );
}
