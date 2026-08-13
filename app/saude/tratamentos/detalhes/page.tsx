"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, Activity, Brain, Flame, HeartPulse, ShieldAlert, Pill, FileText,
  AlertTriangle, Clock, MoreVertical, Edit3, Trash2, X, Plus, Palette
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, safeUpdateTratamento, safeDeleteTratamento } from "@/lib/db";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { DocumentCard } from "@/components/DocumentCard";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ConfirmationModal } from "@/components/ConfirmationModal";

const fadeUp = { initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0 } };

function getTratamentoIcon(nome: string) {
  const n = nome.toLowerCase();
  if (n.includes("tdah")) return Brain;
  if (n.includes("dor") || n.includes("neuropática")) return Flame;
  if (n.includes("depress")) return HeartPulse;
  if (n.includes("ansied") || n.includes("ansiolítico")) return ShieldAlert;
  return Activity;
}

export default function TratamentoDetalhesPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const [editNome, setEditNome] = useState("");
  const [editCor, setEditCor] = useState("#8B5CF6");

  const tratamento = useLiveQuery(() => (id ? db.tratamentos.get(id) : undefined), [id]);
  const medicamentosVinculados = useLiveQuery(() => (id ? db.medicamentos.toArray() : []), [id]) 
    ?.filter(m => m.tratamento_ids?.includes(id!)) || []; // Ajustado para a nova estrutura N:N

  const [deleting, setDeleting] = useState(false);

  // Verificação de segurança para exclusão
  const countVinculos = useLiveQuery(async () => {
    if (!id) return 0;
    const medCount = (await db.medicamento_tratamentos.where('tratamento_id').equals(id).toArray()).length;
    const exCount = (await db.exame_tratamentos.where('tratamento_id').equals(id).toArray()).length;
    return medCount + exCount;
  }, [id]) || 0;

  if (!id || tratamento === undefined) return <LoadingSkeleton />;
  if (tratamento === null) return <p>Tratamento não encontrado.</p>;

  const handleUpdate = async () => {
    await safeUpdateTratamento(id, { nome: editNome, cor: editCor });
    trigger("success");
    setIsEditModalOpen(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    await safeDeleteTratamento(id);
    trigger("success");
    router.replace("/saude");
  };

  const IconComp = getTratamentoIcon(tratamento.nome);

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-32">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 pt-6 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <button onClick={() => router.back()} className="h-11 w-11 flex items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised"><ArrowLeft size={18} /></button>
            <button onClick={() => { trigger("vibrate"); setIsMenuOpen(true); }} className="h-11 w-11 flex items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised"><MoreVertical size={18} /></button>
          </div>
        </header>

        <section className="px-5 pt-6 space-y-6">
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="rounded-[32px] border border-violet-500/30 bg-surface p-6 shadow-sm" style={{ borderLeft: `6px solid ${tratamento.cor || "#8B5CF6"}` }}>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-400/10 text-violet-400"><IconComp size={28} /></div>
              <h2 className="font-display text-2xl font-bold text-ink-primary">{tratamento.nome}</h2>
            </div>
          </motion.div>

          {/* LISTA DE MEDICAMENTOS ATIVOS */}
          <div className="space-y-3">
             <h3 className="font-semibold text-ink-primary px-1">Medicamentos em Uso</h3>
             {medicamentosVinculados.map((med: any) => (
                <div key={med.id} onClick={() => router.push(`/saude/medicamentos/detalhes?id=${med.id}`)} className="rounded-2xl border border-surface-border/50 bg-surface p-4 flex items-center justify-between">
                  <p className="font-semibold">{med.nome}</p>
                  <ChevronRight size={16} />
                </div>
             ))}
          </div>
        </section>

        {/* MENU DE AÇÕES */}
        <BottomSheet isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} title="Gerenciar Tratamento">
          <div className="p-4 space-y-3">
            <Button variant="secondary" fullWidth onClick={() => { setIsMenuOpen(false); setEditNome(tratamento.nome); setEditCor(tratamento.cor || "#8B5CF6"); setIsEditModalOpen(true); }}><Edit3 size={16} className="mr-2"/> Editar Tratamento</Button>
            <Button variant="danger" fullWidth onClick={() => { setIsMenuOpen(false); setShowDeleteModal(true); }}><Trash2 size={16} className="mr-2"/> Excluir Tratamento</Button>
          </div>
        </BottomSheet>

        {/* MODAL EDITAR */}
        <BottomSheet isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Editar Detalhes">
           <div className="p-4 space-y-4">
             <Input label="Nome" value={editNome} onChange={(e) => setEditNome(e.target.value)} />
             <div className="flex items-center gap-4">
               <Palette size={20} className="text-ink-muted" />
               <input type="color" value={editCor} onChange={(e) => setEditCor(e.target.value)} className="h-10 w-full cursor-pointer" />
             </div>
             <Button variant="primary" fullWidth onClick={handleUpdate}>Salvar Alterações</Button>
           </div>
        </BottomSheet>

        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          title="Excluir Tratamento"
          message={countVinculos > 0 ? `Este tratamento possui ${countVinculos} vínculo(s). Ao excluir, eles serão desvinculados automaticamente. Deseja prosseguir?` : "Tem certeza que deseja excluir?"}
          confirmLabel="Excluir"
          type="danger"
        />
      </main>
    </PageTransition>
  );
}
