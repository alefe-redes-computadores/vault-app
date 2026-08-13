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

  // Busca dados do local e histórico de renovações relacionadas
  const local = useLiveQuery(() => db.table("locais").get(id), [id]);
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
      await db.table("locais").update(id, { nome, endereco, telefone, updated_at: new Date().toISOString() });
      // Adicionar lógica de sync na nuvem aqui (ex: db.syncQueue.add({ table: 'locais', ... }))
      trigger("success");
      router.back();
    } catch (e) {
      trigger("error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    await db.table("locais").delete(id);
    trigger("success");
    router.push("/saude/locais");
  };

  if (!local) return <LoadingSkeleton />;

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 pt-6 backdrop-blur-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
             <button onClick={() => router.back()} className="h-11 w-11 flex items-center justify-center rounded-full bg-surface-raised"><ArrowLeft size={18}/></button>
             <h1 className="font-semibold">Editar {nome}</h1>
          </div>
          <button onClick={() => setShowDeleteModal(true)} className="text-coral"><Trash2 size={18}/></button>
        </header>

        <section className="px-5 pt-6 space-y-6">
          {/* Formulário */}
          <div className="p-4 bg-surface rounded-2xl border border-surface-border space-y-3">
            <Input label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
            <Input label="Endereço" value={endereco} onChange={(e) => setEndereco(e.target.value)} />
            <Input label="Telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
          </div>

          {/* Histórico Relacional de Renovação neste local */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase text-ink-muted px-1">Histórico de Preços/Renovações</h2>
            {renovacoes?.map((r: any) => (
              <div key={r.id} className="p-4 bg-surface rounded-2xl flex justify-between items-center border border-surface-border">
                <div className="flex items-center gap-3">
                  <Calendar size={16} className="text-ice" />
                  <div>
                    <p className="font-semibold text-sm">{r.data}</p>
                    <p className="text-[10px] text-ink-muted">{r.observacoes || "Sem notas"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-emerald-400 font-bold">
                  <DollarSign size={14}/>
                  {r.preco?.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="fixed bottom-0 w-full p-5 bg-void/80 backdrop-blur-md border-t border-surface-border">
            <Button fullWidth onClick={handleUpdate} disabled={saving}>{saving ? "Salvando..." : "Salvar Alterações"}</Button>
        </div>

        <ConfirmationModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={handleDelete} title="Excluir local" message="Tem certeza?" />
      </main>
    </PageTransition>
  );
}
