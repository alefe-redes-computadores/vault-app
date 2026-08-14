"use client";

import { Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ArrowLeft, Pill, Circle, Droplet, Syringe, StickyNote, 
  ChevronRight, Edit3, Package, Stethoscope, Store, User,
  FileText, Calendar, Activity, Brain, Flame, HeartPulse, ShieldAlert
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { computeEstoqueInfo } from "@/lib/health-utils";
import { format } from "date-fns";

const fadeUp = { initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0 } };

const FORMATOS = [
  { id: "comprimido", label: "Redondo", icon: Circle },
  { id: "capsula", label: "Cápsula", icon: Pill },
  { id: "gota", label: "Gotas", icon: Droplet },
  { id: "injecao", label: "Injeção", icon: Syringe },
  { id: "adesivo", label: "Adesivo", icon: StickyNote },
];

function getTratamentoIcon(nome: string) {
  const n = (nome || "").toLowerCase();
  if (n.includes("tdah")) return Brain;
  if (n.includes("dor") || n.includes("neuropática")) return Flame;
  if (n.includes("depress")) return HeartPulse;
  if (n.includes("ansied") || n.includes("ansiolítico")) return ShieldAlert;
  return Activity;
}

function formatDateDisplay(isoStr: string): string {
  if (!isoStr) return "";
  const parts = isoStr.split("-");
  if (parts.length !== 3) return isoStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
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

  const FormatIcon = FORMATOS.find(f => f.id === med.formato)?.icon || Pill;
  const estoqueInfo = computeEstoqueInfo(med);
  
  const hasTwoColors = !!(med.cores && med.cores.length === 2);
  const color1 = med.cores?.[0] || "#9CA3AF";
  // AQUI FOI CORRIGIDO: med.cores?.[1]
  const color2 = hasTwoColors ? med.cores?.[1] || color1 : color1;
  const gradientId = `detalhe-${id}`;

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <svg width="0" height="0" className="absolute">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="50%" stopColor={color1} />
              <stop offset="50%" stopColor={color2} />
            </linearGradient>
          </defs>
        </svg>

        <header className="sticky top-0 z-30 border-b border-surface-border/30 bg-void/80 px-5 pb-4 pt-4 header-safe-top backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <button onClick={() => { trigger("vibrate"); router.back(); }} className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95">
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="flex gap-2">
              <button onClick={() => { trigger("vibrate"); router.push(`/saude/medicamentos/editar?id=${med.id}`); }} className="h-11 w-11 flex items-center justify-center rounded-full bg-surface-raised border border-surface-border/50 active:scale-95 hover:text-ice hover:border-ice/30">
                <Edit3 size={18} />
              </button>
            </div>
          </div>
        </header>

        <section className="px-5 pt-6 space-y-5">
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="flex flex-col items-center text-center rounded-[32px] border border-surface-border/50 bg-surface p-6 shadow-sm">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-surface-raised border border-surface-border/50 shadow-sm">
              <FormatIcon size={36} stroke={hasTwoColors ? `url(#${gradientId})` : color1} strokeWidth={2} />
            </div>
            <h1 className="font-display text-2xl font-bold text-ink-primary">{med.nome}</h1>
            <p className="text-sm font-medium text-ice mt-1">{med.dosagem}</p>
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.05 }} className="space-y-4 pt-2">
            <h3 className="font-display text-base font-semibold text-ink-primary px-1">Rede de Apoio</h3>

            <div className="grid grid-cols-1 gap-3">
              <div 
                onClick={() => { if(medico) { trigger("vibrate"); router.push(`/saude/medicos/detalhes?id=${medico.id}`); } }}
                className={`flex items-center justify-between rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm ${medico ? 'cursor-pointer hover:border-ice/30 transition-all active:scale-[0.98]' : ''}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-ice/10 text-ice">
                    <Stethoscope size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-ink-muted">Médico Prescritor</p>
                    <p className="text-sm font-semibold text-ink-primary truncate">{medico ? `Dr(a). ${medico.nome}` : med.medico || "Não vinculado"}</p>
                  </div>
                </div>
                {medico && <ChevronRight size={16} className="text-ink-faint" />}
              </div>

              <div 
                onClick={() => { if(farmacia) { trigger("vibrate"); router.push(`/saude/locais/detalhes?id=${farmacia.id}`); } }}
                className={`flex items-center justify-between rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm ${farmacia ? 'cursor-pointer hover:border-amber-400/30 transition-all active:scale-[0.98]' : ''}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-400">
                    <Store size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-ink-muted">Retirada / Compra</p>
                    <p className="text-sm font-semibold text-ink-primary truncate">{farmacia ? farmacia.nome : med.farmacia || "Não vinculado"}</p>
                  </div>
                </div>
                {farmacia && <ChevronRight size={16} className="text-ink-faint" />}
              </div>
            </div>
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.1 }} className="space-y-4 pt-2">
            <h3 className="font-display text-base font-semibold text-ink-primary px-1">
              Histórico de Retirada
            </h3>

            <div className="rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-emerald-400" />
                <h4 className="text-sm font-semibold text-ink-primary">Renovações ({renovacoes.length})</h4>
              </div>
              
              {renovacoes.length === 0 ? (
                <p className="text-xs text-ink-muted py-2">Nenhum registro de renovação ou compra para este medicamento.</p>
              ) : (
                <div className="space-y-2">
                  {renovacoes.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()).map((r: any) => (
                    <div 
                      key={r.id} 
                      onClick={() => { trigger("vibrate"); router.push(`/saude/renovacao/detalhes?id=${r.id}`); }}
                      className="flex items-center justify-between rounded-xl bg-surface-raised p-3.5 border border-surface-border/40 cursor-pointer hover:border-emerald-400/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface">
                          <Calendar size={14} className="text-ink-muted" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-ink-primary font-mono">{formatDateDisplay(r.data)}</p>
                          <p className="text-[11px] font-medium text-emerald-400 mt-0.5">
                            {r.preco ? `Custo: R$ ${Number(r.preco).toFixed(2).replace(".", ",")}` : "Sem custo (SUS)"}
                          </p>
                        </div>
                      </div>
                      <FileText size={18} className="text-ice/70" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

        </section>
      </main>
    </PageTransition>
  );
}

export default function MedicamentoDetalhesPage() {
  return <Suspense fallback={<LoadingSkeleton />}><MedicamentoDetalhesContent /></Suspense>;
}
