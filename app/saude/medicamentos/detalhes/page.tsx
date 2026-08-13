"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ArrowLeft, Pill, Circle, Droplet, Syringe, StickyNote, 
  ChevronRight, Edit3, Package, Stethoscope, Store, User
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { computeEstoqueInfo } from "@/lib/health-utils";
import { format } from "date-fns";

const fadeUp = { initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0 } };
const staggerContainer = { animate: { transition: { staggerChildren: 0.05 } } };

const FORMATOS = [
  { id: "comprimido", label: "Redondo", icon: Circle },
  { id: "capsula", label: "Cápsula", icon: Pill },
  { id: "gota", label: "Gotas", icon: Droplet },
  { id: "injecao", label: "Injeção", icon: Syringe },
  { id: "adesivo", label: "Adesivo", icon: StickyNote },
];

function MedicamentoDetalhesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { trigger } = useHapticFeedback();

  const med = useLiveQuery(() => id ? db.medicamentos.get(id) : undefined, [id]);
  const medico = useLiveQuery(() => med?.medico_id ? db.medicos.get(med.medico_id) : undefined, [med?.medico_id]);
  const farmacia = useLiveQuery(() => med?.farmacia_id ? db.farmacias.get(med.farmacia_id) : undefined, [med?.farmacia_id]);
  const tratamentos = useLiveQuery(async () => {
    if (!id) return [];
    const vinculos = await db.medicamento_tratamentos.where('medicamento_id').equals(id).toArray();
    let tIds = vinculos.map(v => v.tratamento_id);
    if (tIds.length === 0 && med?.tratamento_id) tIds = [med.tratamento_id];
    return await db.tratamentos.where('id').anyOf(tIds).toArray();
  }, [id, med?.tratamento_id]);

  if (med === undefined) return <LoadingSkeleton />;
  if (!med) return <p className="text-center mt-20 text-ink-muted">Medicamento não encontrado.</p>;

  const FormatIcon = FORMATOS.find(f => f.id === med.formato)?.icon || Pill;
  const estoqueInfo = computeEstoqueInfo(med);

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-32">
        <header className="sticky top-0 z-30 border-b border-surface-border/30 bg-void/80 px-5 pb-4 pt-4 header-safe-top backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <button onClick={() => { trigger("vibrate"); router.back(); }} className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95">
              <ArrowLeft size={18} />
            </button>
            <div className="flex gap-2">
              <button onClick={() => { trigger("vibrate"); router.push(`/saude/medicamentos/editar?id=${med.id}`); }} className="h-11 w-11 flex items-center justify-center rounded-full bg-surface-raised border border-surface-border/50 active:scale-95">
                <Edit3 size={18} />
              </button>
            </div>
          </div>
        </header>

        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="px-5 pt-6 space-y-6">
          {/* HERO */}
          <motion.section variants={fadeUp} className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-3xl bg-surface-raised border border-surface-border shadow-lg">
              <FormatIcon size={40} className="text-ice" />
            </div>
            <h1 className="font-display text-3xl font-bold text-ink-primary">{med.nome}</h1>
            <p className="text-sm text-ink-muted mb-6">Finalidade: {(tratamentos || [])[0]?.nome || "Não especificada"}</p>
          </motion.section>

          {/* BLOCO 1: HORÁRIO */}
          <motion.section variants={fadeUp} className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-ink-primary">Horário</h3>
              <button className="text-xs font-bold text-ice">Editar</button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between border-b border-surface-border/30 pb-2">
                <span className="text-sm text-ink-muted">Frequência</span>
                <span className="text-sm font-medium">Diário, {med.estoque_horarios?.length || 1}x ao dia</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-ink-muted">Iniciado em</span>
                <span className="text-sm font-medium">{med.data_receita ? format(new Date(med.data_receita), "dd/MM/yyyy") : "—"}</span>
              </div>
            </div>
          </motion.section>

          {/* BLOCO 2: DOSE */}
          <motion.section variants={fadeUp} className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-ink-primary">Dose</h3>
              <button className="text-xs font-bold text-ice">Editar</button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between border-b border-surface-border/30 pb-2">
                <span className="text-sm text-ink-muted">Quantidade</span>
                <span className="text-sm font-medium">{med.estoque_unidade_por_dose || 1} {med.estoque_unidade_medida}</span>
              </div>
              <div className="flex justify-between border-b border-surface-border/30 pb-2">
                <span className="text-sm text-ink-muted">Dosagem</span>
                <span className="text-sm font-medium">{med.dosagem}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-ink-muted">Instruções</span>
                <span className="text-sm font-medium text-right max-w-[60%]">{med.observacoes || "—"}</span>
              </div>
            </div>
          </motion.section>

          {/* BLOCO 3: INVENTÁRIO */}
          <motion.section variants={fadeUp} className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-ink-primary">Inventário</h3>
              <button className="text-xs font-bold text-ice">Editar</button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between border-b border-surface-border/30 pb-2">
                <span className="text-sm text-ink-muted">Estoque atual</span>
                <span className="text-sm font-medium text-emerald-400">{estoqueInfo?.quantidadeRestante || 0}</span>
              </div>
              <div className="flex justify-between border-b border-surface-border/30 pb-2">
                <span className="text-sm text-ink-muted">Prescritor</span>
                <span className="text-sm font-medium truncate ml-4">{medico?.nome || med.medico || "Não informado"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-ink-muted">Farmácia</span>
                <span className="text-sm font-medium truncate ml-4">{farmacia?.nome || med.farmacia || "Não informada"}</span>
              </div>
            </div>
          </motion.section>
        </motion.div>
      </main>
    </PageTransition>
  );
}

export default function MedicamentoDetalhesPage() {
  return <Suspense fallback={<LoadingSkeleton />}><MedicamentoDetalhesContent /></Suspense>;
}
