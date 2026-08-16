"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Save, Building2, Trash2, Calendar, DollarSign } from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { ConfirmationModal } from "@/components/ConfirmationModal";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function EditarLocalPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "";

  // ✅ CORRIGIDO: db.locais
  const local = useLiveQuery(() => db.locais.get(id), [id]);
  const renovacoes = useLiveQuery(() => db.renovacoes.where({ local_id: id }).toArray(), [id]);

  const [nome, setNome] = useState("");
  const [endereco, setEndereco] = useState("");
  const [telefone, setTelefone] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (local) {
      setNome(local.nome || "");
      setEndereco(local.endereco || "");
      setTelefone(local.telefone || "");
    }
  }, [local]);

  const handleUpdate = async () => {
    trigger("vibrate");
    setSaving(true);
    try {
      // ✅ CORRIGIDO: db.locais.update
      await db.locais.update(id, {
        nome,
        endereco,
        telefone,
        updated_at: new Date().toISOString(),
        synced: false,
      });
      // Aqui você pode adicionar lógica de sync se necessário
      trigger("success");
      router.back();
    } catch (e) {
      console.error("Erro ao atualizar local:", e);
      trigger("error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      // ✅ CORRIGIDO: db.locais.delete
      await db.locais.delete(id);
      trigger("success");
      router.push("/saude/locais");
    } catch (e) {
      console.error("Erro ao excluir local:", e);
      trigger("error");
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (!local) return <LoadingSkeleton />;

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 pt-6 backdrop-blur-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => { trigger("vibrate"); router.back(); }} className="h-11 w-11 flex items-center justify-center rounded-full bg-surface-raised border border-surface-border/50 active:scale-95">
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <h1 className="font-display text-lg font-semibold text-ink-primary">Editar {nome}</h1>
          </div>
          <button onClick={() => setShowDeleteModal(true)} className="flex h-11 w-11 items-center justify-center rounded-full border border-coral/20 bg-coral/10 text-coral active:scale-95">
            <Trash2 size={16} />
          </button>
        </header>

        <section className="px-5 pt-6 space-y-6">
          <div className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm space-y-3">
            <Input label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
            <Input label="Endereço" value={endereco} onChange={(e) => setEndereco(e.target.value)} />
            <Input label="Telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
          </div>

          {renovacoes && renovacoes.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase text-ink-muted px-1 flex items-center gap-1.5">
                <Calendar size={14} className="text-ice" /> Histórico de Renovações ({renovacoes.length})
              </h2>
              {renovacoes.slice(0, 5).map((r: any) => (
                <div key={r.id} className="p-4 bg-surface rounded-2xl flex justify-between items-center border border-surface-border/50">
                  <div className="flex items-center gap-3">
                    <Calendar size={16} className="text-ice" />
                    <div>
                      <p className="font-semibold text-sm text-ink-primary">{formatDateDisplay(r.data)}</p>
                      {r.observacoes && <p className="text-[10px] text-ink-muted">{r.observacoes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-400 font-bold text-sm">
                    <DollarSign size={14} />
                    {r.preco ? `R$ ${Number(r.preco).toFixed(2).replace(".", ",")}` : "SUS"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <Button variant="primary" size="lg" fullWidth onClick={handleUpdate} disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar alterações
          </Button>
        </div>

        <ConfirmationModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={handleDelete} title="Excluir local" message={`Tem certeza que deseja excluir "${nome}"?`} isLoading={deleting} type="danger" />
      </main>
    </PageTransition>
  );
}

// Função auxiliar (se não existir em health-utils)
function formatDateDisplay(isoStr: string): string {
  if (!isoStr) return "";
  const parts = isoStr.split("-");
  if (parts.length !== 3) return isoStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}