"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Save, FolderHeart, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { useHapticFeedback } from "@/lib/haptics";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import type { Tratamento } from "@/lib/types";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

function EditarTratamentoContent() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [tratamento, setTratamento] = useState<Tratamento | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [nome, setNome] = useState("");
  const [condicao, setCondicao] = useState("");
  const [status, setStatus] = useState<"ativo" | "concluido" | "suspenso">("ativo");
  const [dataInicio, setDataInicio] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      router.push("/saude");
      return;
    }

    const fetchTratamento = async () => {
      try {
        const data = await db.tratamentos.get(id);
        if (data) {
          setTratamento(data);
          setNome(data.nome || "");
          setCondicao(data.condicao || "");
          setStatus(data.status || "ativo");
          // Pega a data de criação ou data personalizada se houver
          setDataInicio(data.created_at ? data.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10));
        } else {
          router.push("/saude");
        }
      } catch (err) {
        console.error("Erro ao carregar tratamento:", err);
        router.push("/saude");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTratamento();
  }, [id, router]);

  const handleSubmit = async () => {
    trigger("vibrate");
    if (!nome.trim()) {
      setError("O nome do tratamento é obrigatório");
      trigger("error");
      return;
    }

    if (!id) return;

    setSaving(true);
    try {
      await db.tratamentos.update(id, {
        nome: nome.trim(),
        condicao: condicao.trim() || undefined,
        status,
        created_at: dataInicio ? new Date(dataInicio).toISOString() : tratamento?.created_at,
        updated_at: new Date().toISOString(),
      });

      trigger("success");
      router.push(`/saude/tratamentos?id=${id}`);
    } catch (err) {
      console.error("Erro ao atualizar tratamento:", err);
      trigger("error");
      setError("Erro ao salvar alterações.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    trigger("vibrate");
    try {
      await db.tratamentos.delete(id);
      trigger("success");
      router.push("/saude");
    } catch (err) {
      console.error("Erro ao excluir tratamento:", err);
      trigger("error");
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (isLoading) return <LoadingSkeleton />;
  if (!tratamento) return null;

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 header-safe-top backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { trigger("vibrate"); router.back(); }}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
              >
                <ArrowLeft size={18} className="text-ink-primary" />
              </button>
              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-violet-300">Tratamento</p>
                <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">Editar tratamento</h1>
              </div>
            </div>

            <button
              onClick={() => { trigger("vibrate"); setShowDeleteModal(true); }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-coral/20 bg-coral/10 text-coral transition-all active:scale-95"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-6">
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.28 }}
            className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <Input
              label="Nome do Tratamento"
              placeholder="Ex: TDAH, Depressão..."
              value={nome}
              onChange={(e) => { setNome(e.target.value); if (error) setError(""); }}
              error={error}
              required
            />

            <Input
              label="CID / Condição (opcional)"
              placeholder="Ex: CID F90 ou descrição"
              value={condicao}
              onChange={(e) => setCondicao(e.target.value)}
            />

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-ink-primary">Data de início</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-ink-primary outline-none focus:border-ice/50"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-ink-primary">Status</label>
              <div className="grid grid-cols-3 gap-2">
                {(["ativo", "concluido", "suspenso"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => { trigger("vibrate"); setStatus(s); }}
                    className={`rounded-2xl border px-3 py-2.5 text-xs font-medium capitalize transition-all active:scale-95 ${
                      status === s ? "border-violet-400 bg-violet-400/12 text-violet-300" : "border-surface-border/50 bg-surface-raised text-ink-muted"
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
            disabled={saving}
            className="flex items-center justify-center gap-2 shadow-lg shadow-violet-400/10"
          >
            {saving ? <><Loader2 size={16} className="animate-spin" /> Salvando...</> : <><Save size={16} /> Salvar alterações</>}
          </Button>
        </div>

        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          title="Excluir tratamento"
          message={`Tem certeza que deseja excluir o tratamento "${tratamento.nome}"? Os documentos vinculados não serão apagados.`}
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          isLoading={deleting}
          type="danger"
        />
      </main>
    </PageTransition>
  );
}

export default function EditarTratamentoPage() {
  return <Suspense fallback={<LoadingSkeleton />}><EditarTratamentoContent /></Suspense>;
}
