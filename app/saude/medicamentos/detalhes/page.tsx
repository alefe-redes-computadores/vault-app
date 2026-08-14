"use client";

import { Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ArrowLeft, Pill, Circle, Droplet, Syringe, StickyNote, 
  ChevronRight, Edit3, Package, Stethoscope, Store,
  FileText, Calendar, Activity, Brain, Flame, HeartPulse, ShieldAlert,
  AlertTriangle, DollarSign, CheckCircle2, Building2, Sparkles, Plus, Clock
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { computeEstoqueInfo, TIPO_RECEITA_LABELS } from "@/lib/health-utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const fadeUp = { initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0 } };

function formatDate(isoStr: string) {
  if (!isoStr) return "—";
  try { return format(new Date(isoStr), "dd MMM yyyy", { locale: ptBR }); }
  catch { return isoStr; }
}

function MedicamentoDetalhesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { trigger } = useHapticFeedback();

  const med = useLiveQuery(() => id ? db.medicamentos.get(id) : undefined, [id]);
  const medico = useLiveQuery(() => med?.medico_id ? db.medicos.get(med.medico_id) : undefined, [med?.medico_id]);
  const farmacia = useLiveQuery(() => med?.farmacia_id ? db.farmacias.get(med.farmacia_id) : undefined, [med?.farmacia_id]);
  
  const renovacoes = useLiveQuery(
    () => db.table("renovacoes").where("medicamento_id").equals(id || "").toArray(),
    [id]
  ) || [];

  const tratamentos = useLiveQuery(async () => {
    if (!id) return [];
    const vinculos = await db.medicamento_tratamentos.where('medicamento_id').equals(id).toArray();
    let tIds = vinculos.map(v => v.tratamento_id);
    if (tIds.length === 0 && med?.tratamento_id) tIds = [med.tratamento_id];
    return await db.tratamentos.where('id').anyOf(tIds).toArray();
  }, [id, med?.tratamento_id]);

  if (med === undefined) return <LoadingSkeleton />;
  if (!med) return <p className="text-center mt-20 text-ink-muted">Medicamento não encontrado.</p>;

  const estoqueInfo = computeEstoqueInfo(med);
  const qtd = estoqueInfo?.quantidadeRestante ?? 0;
  
  // Lógica de cores de estoque (verde > 14, amarelo 14-10, vermelho piscante < 10)
  const getEstoqueStyle = () => {
    if (qtd <= 9) return { color: "text-coral animate-pulse font-bold", icon: AlertTriangle, label: "CRÍTICO" };
    if (qtd <= 14) return { color: "text-amber-400 font-semibold", icon: AlertTriangle, label: "BAIXO" };
    return { color: "text-emerald-400 font-bold", icon: CheckCircle2, label: "OK" };
  };
  const estoqueStatus = getEstoqueStyle();

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-20">
        <header className="sticky top-0 z-30 flex items-center justify-between px-5 pt-4 pb-2 bg-void/90 backdrop-blur-md">
          <button onClick={() => router.back()} className="h-10 w-10 flex items-center justify-center rounded-full bg-surface-raised border border-surface-border"><ArrowLeft size={18} /></button>
          <h2 className="font-semibold text-ink-primary">Detalhes</h2>
          <button onClick={() => router.push(`/saude/medicamentos/editar?id=${id}`)} className="h-10 w-10 flex items-center justify-center rounded-full bg-surface-raised border border-surface-border"><Edit3 size={18} /></button>
        </header>

        <div className="px-5 mt-6 space-y-6">
          {/* Card de Identidade */}
          <div className="rounded-[32px] bg-surface p-6 border border-surface-border shadow-lg">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-16 w-16 rounded-2xl bg-ice/10 flex items-center justify-center text-ice"><Pill size={32} /></div>
              <div>
                <h1 className="text-2xl font-bold text-ink-primary">{med.nome}</h1>
                <p className="text-sm text-ink-muted">{med.dosagem}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-void/50 rounded-2xl p-3 border border-surface-border">
                <span className="text-[10px] uppercase text-ink-muted">Quantidade Restante</span>
                <p className={`text-lg mt-1 flex items-center gap-1.5 ${estoqueStatus.color}`}>
                  <estoqueStatus.icon size={16} /> {qtd} {med.estoque_unidade_medida || "unid."}
                </p>
              </div>
              <div className="bg-void/50 rounded-2xl p-3 border border-surface-border">
                <span className="text-[10px] uppercase text-ink-muted">Preço Médio</span>
                <p className="text-lg mt-1 font-bold text-emerald-400">R$ {med.preco ? Number(med.preco).toFixed(2) : "0,00"}</p>
              </div>
            </div>
          </div>

          {/* Tratamentos */}
          <div>
            <h3 className="text-sm font-semibold text-ink-primary mb-3">Vinculado a Tratamentos</h3>
            <div className="flex flex-wrap gap-2">
               {tratamentos.map((t: any) => (
                 <div key={t.id} className="flex items-center gap-2 rounded-full bg-violet-400/10 border border-violet-400/20 px-4 py-2">
                   <Activity size={14} className="text-violet-400" />
                   <span className="text-xs font-semibold text-violet-300">{t.nome}</span>
                 </div>
               ))}
            </div>
          </div>

          {/* Rede de Apoio */}
          <div className="space-y-3">
             <h3 className="text-sm font-semibold text-ink-primary">Rede de Apoio</h3>
             <div className="space-y-2">
               <div className="bg-surface p-4 rounded-2xl border border-surface-border flex items-center gap-4">
                 <div className="h-10 w-10 rounded-xl bg-ice/10 flex items-center justify-center text-ice"><Stethoscope size={20} /></div>
                 <div>
                   <p className="text-[10px] uppercase text-ink-muted">Médico</p>
                   <p className="text-sm font-medium text-ink-primary">{medico?.nome || med.medico}</p>
                 </div>
               </div>
               <div className="bg-surface p-4 rounded-2xl border border-surface-border flex items-center gap-4">
                 <div className="h-10 w-10 rounded-xl bg-amber-400/10 flex items-center justify-center text-amber-400"><Store size={20} /></div>
                 <div>
                   <p className="text-[10px] uppercase text-ink-muted">Retirada/Compra</p>
                   <p className="text-sm font-medium text-ink-primary">{farmacia?.nome || med.farmacia}</p>
                 </div>
               </div>
             </div>
          </div>

          {/* Histórico */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
               <h3 className="text-sm font-semibold text-ink-primary">Últimas Compras</h3>
               <button onClick={() => router.push(`/saude/renovacao/nova?medicamento_id=${id}`)} className="text-xs font-bold text-ice bg-ice/10 px-3 py-1.5 rounded-lg">+ Nova</button>
            </div>
            {renovacoes.slice(0, 3).map((r: any) => (
              <div key={r.id} className="bg-surface p-4 rounded-2xl border border-surface-border flex justify-between items-center">
                <div>
                  <p className="text-sm font-semibold">{formatDate(r.data)}</p>
                  <p className="text-xs text-emerald-400 font-mono">R$ {Number(r.preco || 0).toFixed(2)}</p>
                </div>
                <ChevronRight size={16} className="text-ink-muted" />
              </div>
            ))}
          </div>
        </section>
      </main>
    </PageTransition>
  );
}

export default function DetalhesPage() {
  return <Suspense fallback={<LoadingSkeleton />}><MedicamentoDetalhesContent /></Suspense>;
}
