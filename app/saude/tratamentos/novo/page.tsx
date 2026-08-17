"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, Save, FolderHeart, ChevronRight, X, Plus, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTratamentos } from "@/hooks/useTratamentos";
import { useCids } from "@/hooks/useCids";
import { usePersons } from "@/hooks/usePersons";
import { useHapticFeedback } from "@/lib/haptics";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageTransition } from "@/components/PageTransition";
import { SelectionModal } from "@/components/SelectionModal";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

const CORES_TRATAMENTO = ["#8B5CF6", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#EC4899", "#6366F1"];

export default function NovoTratamentoPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { user } = useAuth();
  const { addTratamento } = useTratamentos();
  const { cids } = useCids();
  const persons = usePersons();

  const [personId, setPersonId] = useState<string>("");
  const [nome, setNome] = useState("");
  const [cidIds, setCidIds] = useState<string[]>([]);
  const [status, setStatus] = useState<"ativo" | "concluido" | "suspenso">("ativo");
  const [cor, setCor] = useState("#8B5CF6");
  const [observacoes, setObservacoes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [isCidModalOpen, setIsCidModalOpen] = useState(false);
  const [showAddCidPrompt, setShowAddCidPrompt] = useState(false);

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

    setLoading(true);
    try {
      await addTratamento({
        person_id: personId,
        nome: nome.trim(),
        cid_ids: cidIds.length > 0 ? cidIds : undefined,
        status,
        cor,
        observacoes: observacoes.trim() || undefined,
      });

      trigger("success");
      // Volta para a tela anterior (não para dashboard)
      router.back();
    } catch (err) {
      console.error("Erro ao salvar tratamento:", err);
      trigger("error");
      setError("Erro ao salvar tratamento. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCid = (cidId: string) => {
    trigger("vibrate");
    if (!cidIds.includes(cidId)) {
      setCidIds([...cidIds, cidId]);
    }
    setIsCidModalOpen(false);
    // Pergunta se deseja adicionar outro
    setShowAddCidPrompt(true);
  };

  const handleRemoveCid = (cidId: string) => {
    trigger("vibrate");
    setCidIds(cidIds.filter(id => id !== cidId));
  };

  const selectedCids = cids?.filter(c => c.id && cidIds.includes(c.id)) || [];

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 header-safe-top backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { trigger("vibrate"); router.back(); }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <FolderHeart size={16} className="text-violet-400" />
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-violet-300">Vault</p>
              </div>
              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">Novo Tratamento</h1>
            </div>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-6">
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <p className="mb-3 text-sm font-medium text-ink-primary">Para quem? <span className="text-coral">*</span></p>
            <div className="flex flex-wrap gap-2">
              {persons.map((p: any) => (
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

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.02 }}
            className="space-y-5 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
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
                  {selectedCids.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-1.5 rounded-full bg-violet-400/10 border border-violet-400/20 px-3 py-1.5"
                    >
                      <span className="text-xs font-medium text-violet-300">
                        {c.codigo !== "N/A" ? `${c.codigo} - ` : ""}{c.descricao}
                      </span>
                      <button
                        onClick={() => handleRemoveCid(c.id!)}
                        className="text-violet-400/60 hover:text-coral transition-colors"
                      >
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
              <label className="block text-sm font-medium text-ink-primary">Cor de Identificação</label>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {CORES_TRATAMENTO.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => { trigger("vibrate"); setCor(c); }}
                    className={`relative h-10 w-10 shrink-0 rounded-full border-2 transition-all active:scale-95 ${
                      cor === c ? 'border-ice scale-110 shadow-md' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  >
                    {cor === c && <Check size={16} className="absolute inset-0 m-auto text-void" strokeWidth={3} />}
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
                      status === s
                        ? "border-violet-400 bg-violet-400/12 text-violet-300"
                        : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
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
        </section>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center justify-center gap-2 shadow-lg shadow-violet-400/10"
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> Salvando...</>
            ) : (
              <><Save size={16} /> Salvar tratamento</>
            )}
          </Button>
        </div>

        {/* Modal de seleção de CIDs */}
        <SelectionModal
          isOpen={isCidModalOpen}
          onClose={() => setIsCidModalOpen(false)}
          onSelect={handleAddCid}
          items={cids || []}
          title="Adicionar Diagnóstico (CID)"
          placeholder="Buscar por código ou descrição..."
          renderItem={(item: any) => (
            <div>
              <p className="font-medium text-ink-primary">{item.descricao}</p>
              {item.codigo && item.codigo !== "N/A" && (
                <p className="text-xs text-ink-muted">CID: {item.codigo}</p>
              )}
            </div>
          )}
          getItemId={(item: any) => item.id!}
          getItemLabel={(item: any) => item.descricao}
          onCreateNew={() => {
            setIsCidModalOpen(false);
            router.push("/saude/cids/novo");
          }}
          createNewLabel="Cadastrar Novo CID"
          multiSelect
        />

        {/* Prompt para adicionar outro CID */}
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
                <p className="text-sm text-ink-muted leading-relaxed">
                  Deseja adicionar outro CID a este tratamento?
                </p>
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