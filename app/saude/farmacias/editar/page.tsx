// app/saude/farmacias/editar/page.tsx
"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Save, Building2, Trash2, Pill, ExternalLink } from "lucide-react";
import { useFarmacias } from "@/hooks/useFarmacias";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useHapticFeedback } from "@/lib/haptics";
import { useToast } from "@/components/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageTransition } from "@/components/PageTransition";
import { DetailSkeleton } from "@/components/loading/DetailSkeleton";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import type { Farmacia, Medicamento } from "@/lib/types";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

function formatPhone(value: string): string {
  const clean = value.replace(/\D/g, "").slice(0, 11);
  if (clean.length <= 2) return clean;
  if (clean.length <= 6) return `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
  if (clean.length <= 10) return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
}

function EditarFarmaciaContent() {
  const { trigger } = useHapticFeedback();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "";
  const { getFarmacia, updateFarmacia, deleteFarmaciaSafe } = useFarmacias();
  const { medicamentos = [] } = useMedicamentos();

  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [nome, setNome] = useState("");
  const [endereco, setEndereco] = useState("");
  const [telefone, setTelefone] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }

    getFarmacia(id)
      .then((item) => {
        if (!item) {
          setNotFound(true);
        } else {
          setNome(item.nome || "");
          setEndereco(item.endereco || "");
          setTelefone(item.telefone || "");
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id, getFarmacia]);

  const medicamentosVinculados = useMemo(() => {
    if (!medicamentos.length || !id) return [];
    return medicamentos.filter((m: Medicamento) => m.farmacia_id === id);
  }, [medicamentos, id]);

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

    setSaving(true);
    try {
      await updateFarmacia(id, {
        nome: nome.trim(),
        endereco: endereco.trim() || undefined,
        telefone: telefone.trim() || undefined,
      });
      trigger("success");
      showToast("Farmácia atualizada com sucesso", "success");
      router.back();
    } catch (error) {
      trigger("error");
      showToast("Erro ao atualizar farmácia", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteFarmaciaSafe(id);
      trigger("success");
      showToast("Farmácia excluída com sucesso", "success");
      router.replace("/saude/farmacias");
    } catch (error) {
      trigger("error");
      showToast("Erro ao excluir farmácia", "error");
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (notFound) {
    return (
      <PageTransition>
        <main className="flex min-h-screen flex-col items-center justify-center bg-void px-6 text-center">
          <p className="font-display text-lg font-semibold text-ink-primary">
            Farmácia não encontrada
          </p>
          <button
            onClick={() => router.back()}
            className="mt-4 rounded-full bg-ice px-5 py-2.5 text-sm font-semibold text-void"
          >
            Voltar
          </button>
        </main>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(10rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { trigger("vibrate"); router.back(); }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
              aria-label="Voltar"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-amber-400" />
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-amber-400">
                  Hub de Farmácia
                </p>
              </div>
              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary truncate">
                {nome || "Editar farmácia"}
              </h1>
            </div>

            <button
              onClick={() => { trigger("vibrate"); setShowDeleteModal(true); }}
              aria-label="Excluir farmácia"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-coral/20 bg-coral/10 text-coral transition-all active:scale-95"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </header>

        <section className="space-y-5 px-5 pt-6">
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.28 }}
            className="space-y-3 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted px-1">Informações do Local</h2>
            <Input
              label="Nome *"
              placeholder="Ex: Farmácia Popular, Drogasil..."
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              error={errors.nome}
              required
            />
            <Input
              label="Endereço"
              placeholder="Rua, número, bairro"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
            />
            <Input
              label="Telefone"
              placeholder="(00) 00000-0000"
              value={telefone}
              onChange={(e) => setTelefone(formatPhone(e.target.value))}
            />
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.28, delay: 0.08 }}
            className="space-y-3 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                <Pill size={14} className="text-amber-400" /> Medicamentos Vinculados ({medicamentosVinculados.length})
              </h2>
            </div>

            {medicamentosVinculados.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-surface-border/60 bg-surface-raised/40 p-4 text-center">
                <p className="text-xs text-ink-muted">Nenhum medicamento vinculado a esta farmácia ainda.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {medicamentosVinculados.map((med: Medicamento) => (
                  <div
                    key={med.id}
                    onClick={() => {
                      trigger("vibrate");
                      router.push(`/saude/medicamentos/detalhes?id=${med.id}`);
                    }}
                    className="flex items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised/60 p-3 transition-all active:scale-[0.98] hover:bg-surface-raised cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
                        <Pill size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-ink-primary truncate">{med.nome}</p>
                        <p className="text-[10px] text-ink-muted">{med.dosagem || "Uso contínuo"}</p>
                      </div>
                    </div>
                    <ExternalLink size={14} className="text-ink-faint shrink-0" />
                  </div>
                ))}
              </div>
            )}
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
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save size={16} />
                Salvar alterações
              </>
            )}
          </Button>
        </div>

        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          title="Excluir farmácia"
          message={`Tem certeza que deseja excluir "${nome}"?`}
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          isLoading={deleting}
          type="danger"
        />
      </main>
    </PageTransition>
  );
}

export default function EditarFarmaciaPage() {
  return <Suspense fallback={<DetailSkeleton />}><EditarFarmaciaContent /></Suspense>;
}