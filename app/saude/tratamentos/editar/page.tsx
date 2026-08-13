"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, Save, Trash2, ChevronRight, X, Plus, Search } from "lucide-react";
import { db } from "@/lib/db";
import { useHapticFeedback } from "@/lib/haptics";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import type { Tratamento } from "@/lib/types";
import { useCids } from "@/hooks/useCids";

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

function EditarTratamentoContent() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const { cids, addCid } = useCids();

  const [tratamento, setTratamento] = useState<Tratamento | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [nome, setNome] = useState("");
  const [condicao, setCondicao] = useState("");
  const [cidId, setCidId] = useState("");
  const [status, setStatus] = useState<"ativo" | "concluido" | "suspenso">("ativo");
  const [dataInicio, setDataInicio] = useState("");
  
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [error, setError] = useState("");

  const [showCidModal, setShowCidModal] = useState(false);
  const [buscaCid, setBuscaCid] = useState("");
  const [novoCidCodigo, setNovoCidCodigo] = useState("");
  const [novoCidDescricao, setNovoCidDescricao] = useState("");
  const [isAddingCid, setIsAddingCid] = useState(false);

  useEffect(() => {
    if (!id) { router.push("/saude"); return; }
    db.tratamentos.get(id).then(data => {
      if (data) {
        setTratamento(data);
        setNome(data.nome || "");
        setCondicao(data.condicao || "");
        setCidId(data.cid_id || "");
        setStatus(data.status || "ativo");
        setDataInicio(data.created_at ? data.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10));
      }
      setIsLoading(false);
    });
  }, [id, router]);

  const handleSubmit = async () => {
    trigger("vibrate");
    if (!nome.trim()) { setError("O nome é obrigatório"); trigger("error"); return; }
    if (!id) return;
    setSaving(true);
    try {
      const cidSelecionado = cids?.find(c => c.id === cidId);
      const condicaoTexto = cidSelecionado ? cidSelecionado.descricao : condicao.trim();

      await db.tratamentos.update(id, {
        nome: nome.trim(),
        condicao: condicaoTexto || undefined,
        cid_id: cidId || undefined,
        status,
        created_at: dataInicio ? new Date(dataInicio).toISOString() : tratamento?.created_at,
        updated_at: new Date().toISOString(),
      });

      trigger("success");
      router.replace(`/saude/tratamentos/detalhes?id=${id}`);
    } catch { trigger("error"); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    trigger("vibrate");
    if (!id) return;
    try {
      await db.tratamentos.delete(id);
      trigger("success");
      router.replace("/saude");
    } catch { trigger("error"); }
  };

  const cidSelecionadoInfo = cids?.find(c => c.id === cidId);
  const displayCondicao = cidSelecionadoInfo ? `${cidSelecionadoInfo.codigo !== "N/A" ? cidSelecionadoInfo.codigo + " - " : ""}${cidSelecionadoInfo.descricao}` : condicao;
  const cidsFiltrados = cids?.filter(c => c.descricao.toLowerCase().includes(buscaCid.toLowerCase()) || c.codigo.toLowerCase().includes(buscaCid.toLowerCase())) || [];

  if (isLoading) return <LoadingSkeleton />;

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-32">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 pt-6 backdrop-blur-xl flex items-center justify-between">
          <button onClick={() => router.back()} className="h-11 w-11 flex items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised"><ArrowLeft size={18} /></button>
          <h1 className="font-display text-xl font-semibold text-ink-primary">Editar tratamento</h1>
          <button onClick={() => setShowDeleteModal(true)} className="h-11 w-11 flex items-center justify-center rounded-full border border-coral/20 bg-coral/10 text-coral"><Trash2 size={16} /></button>
        </header>

        <section className="px-5 pt-6 space-y-4">
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="space-y-5 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <Input label="Nome do Tratamento" value={nome} onChange={(e) => setNome(e.target.value)} error={error} />
            
            <button type="button" onClick={() => setShowCidModal(true)} className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left">
              <span className={displayCondicao ? "text-ink-primary" : "text-ink-muted"}>{displayCondicao || "Toque para selecionar a condição (CID)"}</span>
              <ChevronRight size={18} className="text-ink-muted" />
            </button>
            
            <div className="grid grid-cols-3 gap-2">
              {(["ativo", "concluido", "suspenso"] as const).map((s) => (
                <button key={s} onClick={() => setStatus(s)} className={`rounded-2xl border py-2.5 text-xs font-medium capitalize ${status === s ? "border-violet-400 bg-violet-400/12 text-violet-300" : "border-surface-border/50 bg-surface-raised text-ink-muted"}`}>{s}</button>
              ))}
            </div>
          </motion.div>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <Button variant="primary" size="lg" fullWidth onClick={handleSubmit} disabled={saving}>Salvar alterações</Button>
        </div>

        <ConfirmationModal 
          isOpen={showDeleteModal} 
          onClose={() => setShowDeleteModal(false)} 
          onConfirm={handleDelete} 
          title="Excluir Tratamento" 
          message="Tem certeza que deseja excluir este tratamento? Essa ação não pode ser desfeita." 
        />

        <AnimatePresence>
          {showCidModal && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-void/80 backdrop-blur-sm p-0 sm:p-4">
              <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] border border-surface-border bg-surface p-5 shadow-xl max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between pb-4 border-b border-surface-border/40">
                  <h3 className="font-display text-lg font-bold text-ink-primary">Selecionar Condição ou CID</h3>
                  <button onClick={() => setShowCidModal(false)} className="h-8 w-8 rounded-full bg-surface-raised flex items-center justify-center text-ink-muted"><X size={16} /></button>
                </div>
                <div className="py-4 space-y-3">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                    <Input placeholder="Buscar por nome ou código..." value={buscaCid} onChange={(e) => setBuscaCid(e.target.value)} className="pl-9 bg-surface-raised" />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {cidsFiltrados.map((c) => (
                    <button key={c.id} onClick={() => { setCidId(c.id!); setCondicao(c.descricao); setShowCidModal(false); }} className="w-full text-left p-3 rounded-2xl bg-surface-raised hover:border-violet-400/40 border border-surface-border/50 transition-all flex items-center justify-between">
                      <div>
                        <p className="text-xs font-mono text-violet-300 font-semibold">{c.codigo}</p>
                        <p className="text-sm text-ink-primary font-medium mt-0.5">{c.descricao}</p>
                      </div>
                      <ChevronRight size={16} className="text-ink-muted" />
                    </button>
                  ))}
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
  return <Suspense fallback={<LoadingSkeleton />}><EditarTratamentoContent /></Suspense>;
}
