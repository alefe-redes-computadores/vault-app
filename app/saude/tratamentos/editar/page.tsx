"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, Save, Trash2, ChevronRight, X, Plus, Search, Palette } from "lucide-react";
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

export default function EditarTratamentoPage() {
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
  const [cor, setCor] = useState("#8B5CF6"); // <-- NOVO: Estado da cor
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
        setCor(data.cor || "#8B5CF6"); // <-- Carrega a cor salva
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
        cor: cor, // <-- Salva a cor no banco
        status,
        created_at: dataInicio ? new Date(dataInicio).toISOString() : tratamento?.created_at,
        updated_at: new Date().toISOString(),
      });

      trigger("success");
      router.replace(`/saude/tratamentos/detalhes?id=${id}`);
    } catch { trigger("error"); } finally { setSaving(false); }
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
            
            {/* NOVO: SELETOR DE COR */}
            <div className="space-y-1.5">
               <label className="block text-sm font-medium text-ink-primary">Cor de Identificação</label>
               <div className="flex items-center gap-4 p-3 bg-surface-raised rounded-2xl border border-surface-border/50">
                 <Palette size={20} className="text-ink-muted" />
                 <input type="color" value={cor} onChange={(e) => setCor(e.target.value)} className="h-10 w-full cursor-pointer bg-transparent" />
               </div>
            </div>

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
      </main>
    </PageTransition>
  );
}
