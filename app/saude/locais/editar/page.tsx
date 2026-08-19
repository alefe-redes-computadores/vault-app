// app/saude/locais/editar/page.tsx
"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, Loader2, Save, MapPin, Trash2, Calendar, DollarSign, Pill,
} from "lucide-react";
import { useLocais } from "@/hooks/useLocais";
import { useRenovacoes } from "@/hooks/useRenovacoes";
import { useHapticFeedback } from "@/lib/haptics";
import { useSubmitAction } from "@/hooks/useSubmitAction";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageTransition } from "@/components/PageTransition";
import { DetailSkeleton } from "@/components/loading/DetailSkeleton";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import type { LocalSaude, Renovacao } from "@/lib/types";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

const TIPOS_LOCAL = [
  { id: "posto_saude", label: "Posto de Saúde" },
  { id: "laboratorio", label: "Laboratório" },
  { id: "clinica", label: "Clínica" },
  { id: "outro", label: "Outro" },
];

function formatDateDisplay(isoStr: string): string {
  if (!isoStr) return "";
  const parts = isoStr.split("-");
  if (parts.length !== 3) return isoStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatPhone(value: string): string {
  const clean = value.replace(/\D/g, "").slice(0, 11);
  if (clean.length <= 2) return clean;
  if (clean.length <= 6) return `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
  if (clean.length <= 10) return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
}

function EditarLocalContent() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "";

  const { getLocal, updateLocal, deleteLocal } = useLocais();
  const { renovacoes = [] } = useRenovacoes();

  const saveAction = useSubmitAction();
  const deleteAction = useSubmitAction();

  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("posto_saude");
  const [endereco, setEndereco] = useState("");
  const [telefone, setTelefone] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }

    getLocal(id)
      .then((item) => {
        if (!item) {
          setNotFound(true);
        } else {
          setNome(item.nome || "");
          setTipo(item.tipo || "posto_saude");
          setEndereco(item.endereco || "");
          setTelefone(item.telefone || "");
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id, getLocal]);

  const renovacoesVinculadas = useMemo(() => {
    if (!id || !renovacoes.length) return [];
    return renovacoes.filter((r: Renovacao) => r.local_id === id);
  }, [renovacoes, id]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!nome.trim()) newErrors.nome = "Nome é obrigatório";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    trigger("vibrate");
    if (!validate()) {
      trigger("error");
      return;
    }

    saveAction.run(
      () =>
        updateLocal(id, {
          nome: nome.trim(),
          tipo: tipo || undefined,
          endereco: endereco.trim() || undefined,
          telefone: telefone.trim() || undefined,
        }),
      {
        successMessage: "Local atualizado com sucesso",
        errorMessage: "Erro ao atualizar local",
        goBackOnSuccess: true,
      }
    );
  };

  const handleDelete = () => {
    deleteAction.run(
      async () => {
        await deleteLocal(id);
        router.replace("/saude/locais");
      },
      {
        successMessage: "Local excluído com sucesso",
        errorMessage: "Erro ao excluir local",
      }
    );
  };

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (notFound) {
    return (
      <PageTransition>
        <main className="flex min-h-screen flex-col items-center justify-center bg-void px-6 text-center">
          <p className="font-display text-lg font-semibold text-ink-primary">
            Local não encontrado
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
                <MapPin size={16} className="text-emerald-400" />
              </div>
              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary truncate">
                {nome || "Editar local"}
              </h1>
            </div>

            <button
              onClick={() => { trigger("vibrate"); setShowDeleteModal(true); }}
              aria-label="Excluir local"
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
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted px-1">Dados do Local</h2>
            <Input
              label="Nome *"
              placeholder="Ex: UBS Central, Laboratório Sabin..."
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              error={errors.nome}
              required
            />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-primary">Tipo</label>
              <div className="flex flex-wrap gap-2">
                {TIPOS_LOCAL.map((tipoOption) => (
                  <button
                    key={tipoOption.id}
                    onClick={() => { trigger("vibrate"); setTipo(tipoOption.id); }}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all active:scale-95 ${
                      tipo === tipoOption.id
                        ? "border-emerald-400 bg-emerald-400/10 text-emerald-400"
                        : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                    }`}
                  >
                    {tipoOption.label}
                  </button>
                ))}
              </div>
            </div>

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
                <Pill size={14} className="text-amber-400" /> Renovações Vinculadas ({renovacoesVinculadas.length})
              </h2>
            </div>

            {renovacoesVinculadas.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-surface-border/60 bg-surface-raised/40 p-4 text-center">
                <p className="text-xs text-ink-muted">Nenhuma renovação vinculada a este local.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {renovacoesVinculadas.slice(0, 5).map((renovacao: Renovacao) => (
                  <div
                    key={renovacao.id}
                    className="flex items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised/60 p-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
                        <Calendar size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-ink-primary truncate">
                          {formatDateDisplay(renovacao.data)}
                        </p>
                        {renovacao.observacoes && (
                          <p className="text-[10px] text-ink-muted truncate">{renovacao.observacoes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-emerald-400 font-bold text-sm shrink-0">
                      <DollarSign size={14} />
                      {renovacao.preco ? `R$ ${Number(renovacao.preco).toFixed(2).replace(".", ",")}` : "SUS"}
                    </div>
                  </div>
                ))}
                {renovacoesVinculadas.length > 5 && (
                  <p className="text-[10px] text-center text-ink-muted pt-1">
                    E mais {renovacoesVinculadas.length - 5} renovação(ões)...
                  </p>
                )}
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
            disabled={saveAction.isSubmitting}
            className="flex items-center justify-center gap-2 shadow-lg shadow-ice/10"
          >
            {saveAction.isSubmitting ? (
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
          title="Excluir local"
          message={`Tem certeza que deseja excluir "${nome}"?`}
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          isLoading={deleteAction.isSubmitting}
          type="danger"
        />
      </main>
    </PageTransition>
  );
}

export default function EditarLocalPage() {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <EditarLocalContent />
    </Suspense>
  );
}