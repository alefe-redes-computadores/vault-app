"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, Save, FolderHeart, Activity, ChevronRight, X, Plus, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { safeAddTratamento } from "@/lib/db";
import { useHapticFeedback } from "@/lib/haptics";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageTransition } from "@/components/PageTransition";
import { useCids } from "@/hooks/useCids";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function NovoTratamentoPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { user } = useAuth();
  const { cids, addCid } = useCids();

  const [nome, setNome] = useState("");
  const [condicao, setCondicao] = useState(""); // Legado
  const [cidId, setCidId] = useState(""); // Novo Relacional
  const [status, setStatus] = useState<"ativo" | "concluido" | "suspenso">("ativo");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Estados da Modal de CID
  const [showCidModal, setShowCidModal] = useState(false);
  const [buscaCid, setBuscaCid] = useState("");
  const [novoCidCodigo, setNovoCidCodigo] = useState("");
  const [novoCidDescricao, setNovoCidDescricao] = useState("");
  const [isAddingCid, setIsAddingCid] = useState(false);

  const handleSubmit = async () => {
    trigger("vibrate");
    if (!nome.trim()) {
      setError("Nome do tratamento é obrigatório");
      trigger("error");
      return;
    }

    setLoading(true);
    try {
      const cidSelecionado = cids?.find(c => c.id === cidId);
      const condicaoTexto = cidSelecionado ? cidSelecionado.descricao : condicao.trim();

      await safeAddTratamento({
        user_id: user?.id || "",
        person_id: "", // Preparado para o módulo de perfis depois
        nome: nome.trim(),
        condicao: condicaoTexto || undefined,
        cid_id: cidId || undefined,
        status,
      });

      trigger("success");
      router.push("/saude");
    } catch (err) {
      console.error("Erro ao salvar tratamento:", err);
      trigger("error");
      setError("Erro ao salvar tratamento. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleCriarCid = async () => {
    if (!novoCidDescricao.trim()) return;
    setIsAddingCid(true);
    try {
      const novoId = await addCid({
        codigo: novoCidCodigo.trim() || "N/A",
        descricao: novoCidDescricao.trim(),
      });
      setCidId(novoId);
      setShowCidModal(false);
      setNovoCidCodigo("");
      setNovoCidDescricao("");
      trigger("success");
    } catch (err) {
      console.error("Erro ao criar CID:", err);
      trigger("error");
    } finally {
      setIsAddingCid(false);
    }
  };

  const cidSelecionadoInfo = cids?.find(c => c.id === cidId);
  const displayCondicao = cidSelecionadoInfo ? `${cidSelecionadoInfo.codigo !== "N/A" ? cidSelecionadoInfo.codigo + " - " : ""}${cidSelecionadoInfo.descricao}` : condicao;
  
  const cidsFiltrados = cids?.filter(c => 
    c.descricao.toLowerCase().includes(buscaCid.toLowerCase()) || 
    c.codigo.toLowerCase().includes(buscaCid.toLowerCase())
  ) || [];

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 header-safe-top backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                trigger("vibrate");
                router.back();
              }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
              aria-label="Voltar"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <FolderHeart size={16} className="text-violet-400" />
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-violet-300">
                  Vault
                </p>
              </div>
              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">
                Novo Tratamento
              </h1>
            </div>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-6">
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.28 }}
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

            {/* SELETOR DE CID */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-ink-primary">Condição / CID (opcional)</label>
              <button
                type="button"
                onClick={() => { trigger("vibrate"); setShowCidModal(true); }}
                className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left transition-all active:scale-95"
              >
                <span className={displayCondicao ? "text-ink-primary truncate" : "text-ink-muted truncate"}>
                  {displayCondicao || "Toque para selecionar a condição"}
                </span>
                <ChevronRight size={18} className="text-ink-muted shrink-0 ml-2" />
              </button>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-ink-primary">
                Status inicial
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["ativo", "concluido", "suspenso"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      trigger("vibrate");
                      setStatus(s);
                    }}
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
              <>
                <Loader2 size={16} className="animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save size={16} />
                Salvar tratamento
              </>
            )}
          </Button>
        </div>

        {/* MODAL DE SELEÇÃO E CRIAÇÃO DE CID */}
        <AnimatePresence>
          {showCidModal && (
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-0 z-[100] flex flex-col bg-void"
            >
              <header className="flex items-center justify-between border-b border-surface-border/30 bg-surface/50 px-5 pb-4 header-safe-top backdrop-blur-md">
                <h2 className="font-display text-lg font-semibold text-ink-primary">Selecionar Condição</h2>
                <button 
                  onClick={() => { trigger("vibrate"); setShowCidModal(false); setBuscaCid(""); }} 
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-raised text-ink-muted active:scale-95"
                >
                  <X size={20} />
                </button>
              </header>

              <div className="p-4 border-b border-surface-border/30">
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                  <input
                    type="text"
                    placeholder="Buscar doença ou CID..."
                    value={buscaCid}
                    onChange={(e) => setBuscaCid(e.target.value)}
                    className="w-full rounded-xl border border-surface-border/50 bg-surface px-10 py-3 text-sm text-ink-primary outline-none focus:border-violet-500/50"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {cidsFiltrados.length > 0 ? (
                  cidsFiltrados.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        trigger("vibrate");
                        setCidId(c.id!);
                        setShowCidModal(false);
                      }}
                      className={`w-full flex items-center justify-between rounded-2xl border p-4 text-left transition-all active:scale-95 ${
                        cidId === c.id ? "border-violet-400 bg-violet-400/10" : "border-surface-border/50 bg-surface"
                      }`}
                    >
                      <div>
                        <p className={`font-medium ${cidId === c.id ? "text-violet-300" : "text-ink-primary"}`}>{c.descricao}</p>
                        {c.codigo && c.codigo !== "N/A" && (
                          <p className="text-xs text-ink-muted mt-1">CID: {c.codigo}</p>
                        )}
                      </div>
                      {cidId === c.id && <div className="h-2 w-2 rounded-full bg-violet-400" />}
                    </button>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-surface-border p-6 text-center">
                    <p className="text-sm text-ink-muted mb-4">Nenhuma condição encontrada. Deseja cadastrar?</p>
                    <div className="space-y-3">
                      <Input
                        label="Descrição (Ex: Depressão)"
                        placeholder="Nome da doença/condição"
                        value={novoCidDescricao}
                        onChange={(e) => setNovoCidDescricao(e.target.value)}
                      />
                      <Input
                        label="Código CID (Opcional)"
                        placeholder="Ex: F32"
                        value={novoCidCodigo}
                        onChange={(e) => setNovoCidCodigo(e.target.value)}
                      />
                      <Button
                        variant="primary"
                        fullWidth
                        onClick={handleCriarCid}
                        disabled={!novoCidDescricao.trim() || isAddingCid}
                        className="mt-2 flex items-center justify-center gap-2"
                      >
                        {isAddingCid ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                        Cadastrar e Selecionar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>
    </PageTransition>
  );
}
