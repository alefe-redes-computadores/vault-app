// app/saude/tratamentos/editar/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, Trash2, ChevronRight, X, Check, FolderHeart } from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageTransition } from "@/components/PageTransition";
import { DetailSkeleton } from "@/components/loading/DetailSkeleton";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { SelectionModal } from "@/components/SelectionModal";
import { useTratamentos } from "@/hooks/useTratamentos";
import { useCids } from "@/hooks/useCids";
import { usePersons } from "@/hooks/usePersons";
import { useToast } from "@/components/ToastProvider";
import { enfileirarOperacao } from "@/lib/sync/enfileirarOperacao";
import type { Tratamento, Cid, Person } from "@/lib/types";

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

const CORES_TRATAMENTO = [
  { label: "Roxo", hex: "#8B5CF6" },
  { label: "Azul", hex: "#3B82F6" },
  { label: "Esmeralda", hex: "#10B981" },
  { label: "Amarelo", hex: "#F59E0B" },
  { label: "Coral", hex: "#EF4444" },
  { label: "Rosa", hex: "#EC4899" },
  { label: "Ciano", hex: "#06B6D4" },
];

function EditarTratamentoContent() {
  const { trigger } = useHapticFeedback();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const { getTratamento, updateTratamento, deleteTratamentoSafe } = useTratamentos();
  const { cids } = useCids();
  const persons = usePersons() as Person[];

  const [tratamento, setTratamento] = useState<Tratamento | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [personId, setPersonId] = useState<string>("");
  const [nome, setNome] = useState("");
  const [cidIds, setCidIds] = useState<string[]>([]);
  const [cor, setCor] = useState("#8B5CF6");
  const [status, setStatus] = useState<"ativo" | "concluido" | "suspenso">("ativo");
  const [observacoes, setObservacoes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [error, setError] = useState("");
  const [isCidModalOpen, setIsCidModalOpen] = useState(false);
  const [showAddCidPrompt, setShowAddCidPrompt] = useState(false);

  useEffect(() => {
    if (!id) {
      router.push("/saude");
      return;
    }
    const loadData = async () => {
      try {
        const data = await getTratamento(id);
        if (data) {
          setTratamento(data);
          setPersonId(data.person_id || "");
          setNome(data.nome || "");
          setCidIds(data.cid_ids || []);
          setCor(data.cor || "#8B5CF6");
          setStatus(data.status || "ativo");
          setObservacoes(data.observacoes || "");
        } else {
          router.push("/saude");
        }
      } catch (err) {
        console.error("Erro ao carregar tratamento:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [id, router, getTratamento]);

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
    if (!id) return;

    setSaving(true);
    try {
      const patch = {
        person_id: personId,
        nome: nome.trim(),
        cid_ids: cidIds.length > 0 ? cidIds : undefined,
        cor,
        status,
        observacoes: observacoes.trim() || undefined,
      };

      // 1. Atualiza no Dexie (UI otimista)
      await updateTratamento(id, patch);

      // 2. Enfileira para o Supabase (fonte de verdade)
      await enfileirarOperacao("tratamentos", "update", { id, ...patch });

      trigger("success");
      showToast("Tratamento atualizado com sucesso!", "success");
      router.back();
    } catch (err) {
      trigger("error");
      showToast("Erro ao atualizar tratamento", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    trigger("vibrate");
    if (!id) return;
    try {
      await deleteTratamentoSafe(id);

      // Enfileira a exclusão para o Supabase
      await enfileirarOperacao("tratamentos", "delete", { id });

      trigger("success");
      showToast("Tratamento excluído com sucesso!", "success");
      router.replace("/saude");
    } catch (err) {
      trigger("error");
      showToast("Erro ao excluir tratamento", "error");
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
    setCidIds(cidIds.filter((item) => item !== cidId));
  };

  const selectedCids = cids?.filter((c: Cid) => c.id && cidIds.includes(c.id)) || [];

  if (isLoading) return <DetailSkeleton />;
  if (!tratamento) return null;

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 header-safe-top backdrop-blur-xl flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => { trigger("vibrate"); router.back(); }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-violet-400">Edição</p>
              <h1 className="mt-1 truncate font-display text-lg font-semibold text-ink-primary">Editar Tratamento</h1>
            </div>
          </div>
          <button
            onClick={() => { trigger("vibrate"); setShowDeleteModal(true); }}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-coral/20 bg-coral/10 text-coral transition-all active:scale-95"
          >
            <Trash2 size={16} />
          </button>
        </header>

        <section className="px-5 pt-6 space-y-4">
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <p className="mb-3 text-sm font-medium text-ink-primary">Para quem? <span className="text-coral">*</span></p>
            <div className="flex flex-wrap gap-2">
              {persons.map((p: Person) => (
                <button
                  key={p.id}
                  onClick={() => { trigger("vibrate"); setPersonId(p.id!); }}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                    personId === p.id ? "border-ice bg-ice/12 text-ice" : "border-surface-border/50 bg-surface-raised text-ink-muted"
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
              onChange={(e) => { setNome(e.target.value); if (error) setError(""); }}
              error={error}
              required
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
              <label className="block text-sm font-medium text-ink-primary">Cor de Identificação Dinâmica</label>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {CORES_TRATAMENTO.map((item) => (
                  <button
                    key={item.hex}
                    type="button"
                    onClick={() => { trigger("vibrate"); setCor(item.hex); }}
                    className={`relative h-10 w-10 shrink-0 rounded-full border-2 transition-all active:scale-95 ${cor === item.hex ? "border-ice scale-110 shadow-md" : "border-transparent"}`}
                    style={{ backgroundColor: item.hex }}
                    title={item.label}
                  >
                    {cor === item.hex && <Check size={16} className="absolute inset-0 m-auto text-void" strokeWidth={3} />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-ink-primary">Status</label>
              <div className="grid grid-cols-3 gap-2">
                {(["ativo", "concluido", "suspenso"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => { trigger("vibrate"); setStatus(s); }}
                    className={`rounded-2xl border px-1 py-2.5 text-xs font-medium capitalize transition-all active:scale-95 text-center ${status === s ? "border-violet-400 bg-violet-400/12 text-violet-300" : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"}`}
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
          <Button variant="primary" size="lg" fullWidth onClick={handleSubmit} disabled={saving} className="shadow-lg shadow-ice/10">
            {saving ? <Loader2 size={18} className="animate-spin" /> : "Salvar alterações"}
          </Button>
        </div>

        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          title="Excluir Tratamento"
          message="Tem certeza que deseja excluir este tratamento? O histórico de medicamentos associados não será apagado, mas perderão este vínculo."
        />

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

        <AnimatePresence>
          {showAddCidPrompt && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-sm" onClick={() => setShowAddCidPrompt(false)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm rounded-[28px] border border-surface-border bg-surface p-6 shadow-xl space-y-4"
              >
                <div className="flex items-center gap-3 text-violet-400">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-400/10"><FolderHeart size={22} /></div>
                  <div>
                    <h3 className="font-display text-base font-bold text-ink-primary">Adicionar outro CID?</h3>
                    <p className="text-xs text-ink-muted">Você pode vincular múltiplos diagnósticos</p>
                  </div>
                </div>
                <p className="text-xs text-ink-muted leading-relaxed">Deseja adicionar outro CID a este tratamento?</p>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => { trigger("vibrate"); setShowAddCidPrompt(false); }} className="flex-1 rounded-2xl border border-surface-border/50 bg-surface-raised py-3 text-xs font-semibold text-ink-primary active:scale-95 transition-all">Não, finalizar</button>
                  <button onClick={() => { trigger("vibrate"); setShowAddCidPrompt(false); setIsCidModalOpen(true); }} className="flex-1 rounded-2xl bg-violet-400 py-3 text-xs font-semibold text-void active:scale-95 transition-all shadow-md shadow-violet-400/20">Sim, adicionar</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </PageTransition>
  );
}

export default function EditarTratamentoPage() {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <EditarTratamentoContent />
    </Suspense>
  );
}