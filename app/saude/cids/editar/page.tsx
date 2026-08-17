"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, Save, CheckCircle2, AlertCircle, X, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { useHapticFeedback } from "@/lib/haptics";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import type { Cid } from "@/lib/types";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

function EditarCidContent() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [isLoading, setIsLoading] = useState(true);
  const [codigo, setCodigo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dataDiagnostico, setDataDiagnostico] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    if (!id) {
      router.push("/saude/cids");
      return;
    }
    db.cids.get(id).then((data) => {
      if (data) {
        setCodigo(data.codigo || "");
        setDescricao(data.descricao || "");
        // Se houver dados extras salvos no registro local
        setObservacoes((data as any).observacoes || "");
        setDataDiagnostico((data as any).data_diagnostico || "");
      } else {
        router.push("/saude/cids");
      }
      setIsLoading(false);
    });
  }, [id, router]);

  const handleDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 8) value = value.slice(0, 8);
    if (value.length > 4) {
      value = `${value.slice(0, 2)}/${value.slice(2, 4)}/${value.slice(4)}`;
    } else if (value.length > 2) {
      value = `${value.slice(0, 2)}/${value.slice(2)}`;
    }
    setDataDiagnostico(value);
  };

  const handleSubmit = async () => {
    trigger("vibrate");
    if (!descricao.trim()) {
      setError("A descrição é obrigatória");
      trigger("error");
      showToast("Preencha a descrição da condição.", "error");
      return;
    }
    if (!id) return;

    setSaving(true);
    try {
      await db.cids.update(id, {
        codigo: codigo.trim().toUpperCase() || "N/A",
        descricao: descricao.trim(),
        updated_at: new Date().toISOString(),
        // Salvando campos estendidos de forma segura
        ...( { observacoes: observacoes.trim(), data_diagnostico: dataDiagnostico } as any )
      });

      trigger("success");
      showToast("Alterações salvas com sucesso.");
      setTimeout(() => router.replace(`/saude/cids/detalhes?id=${id}`), 800);
    } catch (err) {
      console.error("Erro ao atualizar CID:", err);
      trigger("error");
      showToast("Erro ao salvar alterações.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <LoadingSkeleton />;

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-32">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 header-safe-top pt-6 backdrop-blur-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { trigger("vibrate"); router.back(); }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice">Base de Saúde</p>
              <h1 className="font-display text-lg font-semibold text-ink-primary">Editar Diagnóstico (CID)</h1>
            </div>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-6">
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            className="space-y-5 rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm"
          >
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <Input
                  label="Código CID"
                  placeholder="Ex: F90.0"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <Input
                  label="Data Diagnóstico"
                  placeholder="DD/MM/AAAA"
                  value={dataDiagnostico}
                  onChange={handleDataChange}
                  maxLength={10}
                />
              </div>
            </div>

            <Input
              label="Nome / Descrição da Condição"
              placeholder="Ex: Transtorno de Déficit de Atenção com Hiperatividade"
              value={descricao}
              onChange={(e) => {
                setDescricao(e.target.value);
                if (error) setError("");
              }}
              error={error}
              required
            />

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-ink-primary">Histórico e Observações Pessoais</label>
              <textarea
                rows={3}
                placeholder="Ex: Diagnosticado pelo Dr. Carlos, acompanhamento no Hospital Sarah..."
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
            disabled={saving}
            className="flex items-center justify-center gap-2 shadow-lg shadow-ice/10"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Salvar Alterações
          </Button>
        </div>

        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="fixed bottom-24 inset-x-5 z-50 mx-auto max-w-sm flex items-center gap-3 rounded-2xl border border-surface-border bg-surface p-4 shadow-2xl"
            >
              {toastMessage.type === 'success' ? (
                <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle size={20} className="text-coral shrink-0" />
              )}
              <p className="text-xs font-medium text-ink-primary flex-1">{toastMessage.text}</p>
              <button onClick={() => setToastMessage(null)} className="text-ink-muted hover:text-ink-primary">
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </PageTransition>
  );
}

export default function EditarCidPage() {
  return <Suspense fallback={<LoadingSkeleton />}><EditarCidContent /></Suspense>;
}
