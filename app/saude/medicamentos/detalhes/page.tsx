"use client";

import { Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ArrowLeft, Pill, Circle, Droplet, Syringe, StickyNote, 
  ChevronRight, Edit3, Package, Stethoscope, Store, User,
  FileText, Calendar, Activity, Brain, Flame, HeartPulse, ShieldAlert,
  AlertTriangle, DollarSign, CheckCircle2, History, Building2, Plus, Sparkles, RefreshCw
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

  // Cálculo de Preço Médio com Retrocompatibilidade e Gratuito SUS
  const precoMedioInfo = useMemo(() => {
    if (renovacoes.length === 0) {
      return { texto: med?.preco ? `R$ ${Number(med.preco).toFixed(2).replace(".", ",")}` : "Não informado", gratuito: false };
    }
    
    const precosValidos = renovacoes.filter((r: any) => r.preco !== undefined && r.preco !== null && r.preco >= 0);
    if (precosValidos.length === 0) return { texto: "Gratuito (SUS / Estadual)", gratuito: true };

    const soma = precosValidos.reduce((acc: number, r: any) => acc + Number(r.preco), 0);
    const media = soma / precosValidos.length;
    
    if (media === 0) return { texto: "Gratuito (SUS / Estadual)", gratuito: true };
    return { texto: `R$ ${media.toFixed(2).replace(".", ",")}`, gratuito: false };
  }, [renovacoes, med]);

  if (med === undefined) return <LoadingSkeleton />;
  if (!med) return <p className="text-center mt-20 text-ink-muted">Medicamento não encontrado.</p>;

  const FormatIcon = FORMATOS.find(f => f.id === med.formato)?.icon || Pill;
  const estoqueInfo = computeEstoqueInfo(med);
  const qtdRestante = estoqueInfo?.quantidadeRestante ?? 0;

  // Cores dinâmicas para o alerta de quantidade restante (Regra de Negócio: Verde, Amarelo, Vermelho Piscante)
  let qtdCorClass = "text-emerald-400 font-bold";
  let QtdIcon = CheckCircle2;
  if (qtdRestante <= 9) {
    qtdCorClass = "text-coral animate-pulse font-bold";
    QtdIcon = AlertTriangle;
  } else if (qtdRestante <= 14) {
    qtdCorClass = "text-amber-400 font-bold";
    QtdIcon = AlertTriangle;
  }

  const hasTwoColors = !!(med.cores && med.cores.length === 2);
  const color1 = med.cores?.[0] || "#9CA3AF";
  const color2 = hasTwoColors ? med.cores?.[1] || color1 : color1;
  const gradientId = `detalhe-grad-${id}`;

  const isDescontinuado = med.status === "descontinuado";

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
          {/* Card Principal Repaginado (Estilo Painel Clínico de Tratamento) */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="relative overflow-hidden rounded-[32px] border border-surface-border/50 bg-surface p-6 shadow-sm">
            <div className="absolute right-0 top-0 p-6 opacity-5 pointer-events-none">
              <FormatIcon size={140} stroke={hasTwoColors ? `url(#${gradientId})` : color1} />
            </div>

            <div className="flex items-center gap-4 relative z-10">
              <div 
                className="flex h-16 w-16 items-center justify-center rounded-2xl border border-surface-border/50 shadow-sm shrink-0" 
                style={{ backgroundColor: color1 + '22' }}
              >
                <FormatIcon 
                  size={32} 
                  stroke={hasTwoColors ? `url(#${gradientId})` : color1} 
                  strokeWidth={2.4} 
                  fill={color1 + '44'} 
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-2xl font-bold text-ink-primary truncate">{med.nome}</h1>
                  {isDescontinuado && (
                    <span className="rounded-full bg-coral/20 px-2.5 py-0.5 text-[10px] font-bold text-coral uppercase tracking-wide">
                      Descontinuado
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium text-ice mt-0.5">{med.dosagem}</p>
              </div>
            </div>

            {/* Grid de Informações Cruciais */}
            <div className="mt-6 grid grid-cols-2 gap-3 pt-4 border-t border-surface-border/40 relative z-10">
              <div className="rounded-2xl bg-surface-raised p-3 border border-surface-border/30">
                <p className="text-[11px] text-ink-muted uppercase tracking-wider">Estoque Atual</p>
                <div className={`mt-1 flex items-center gap-1.5 text-sm ${qtdCorClass}`}>
                  <QtdIcon size={16} />
                  <span>{qtdRestante} {estoqueInfo?.unidade || "unid."}</span>
                </div>
              </div>

              <div className="rounded-2xl bg-surface-raised p-3 border border-surface-border/30">
                <p className="text-[11px] text-ink-muted uppercase tracking-wider">Custo / Preço Médio</p>
                <div className="mt-1 flex items-center gap-1.5 text-sm font-bold text-emerald-400">
                  <DollarSign size={16} />
                  <span className="truncate">{precoMedioInfo.texto}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* 💡 Insight Inteligente se o estoque estiver baixo ou zerado */}
          {qtdRestante <= 10 && !isDescontinuado && (
            <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.02 }} className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 flex items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/20 text-amber-400">
                  <Sparkles size={20} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-amber-300 uppercase tracking-wide">Estoque Baixo</p>
                  <p className="text-xs text-ink-muted mt-0.5">Deseja registrar uma nova compra ou renovação?</p>
                </div>
              </div>
              <button 
                onClick={() => { trigger("vibrate"); router.push(`/saude/renovacao/nova?medicamento_id=${id}`); }}
                className="shrink-0 rounded-xl bg-amber-400 text-void px-3.5 py-2 text-xs font-bold transition-transform active:scale-95"
              >
                Renovar
              </button>
            </motion.div>
          )}

          {/* Tratamentos e CIDs Vinculados */}
          {tratamentos && tratamentos.length > 0 && (
            <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.04 }} className="space-y-3">
              <h3 className="font-display text-sm font-semibold text-ink-primary px-1">Tratamentos Associados</h3>
              <div className="flex flex-wrap gap-2">
                {tratamentos.map((t: any) => {
                  const IconComp = getTratamentoIcon(t.nome);
                  return (
                    <div key={t.id} className="flex items-center gap-2 rounded-2xl border border-violet-400/30 bg-violet-400/10 px-4 py-2.5">
                      <IconComp size={16} className="text-violet-400" />
                      <span className="text-xs font-semibold text-violet-300">{t.nome}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Rede de Apoio (Médico e Farmácia) */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.06 }} className="space-y-4 pt-2">
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

          {/* Histórico de Retirada (Últimas Compras / Renovações) */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.08 }} className="space-y-4 pt-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-display text-base font-semibold text-ink-primary">
                Histórico de Retirada
              </h3>
              <button 
                onClick={() => { trigger("vibrate"); router.push(`/saude/renovacao/nova?medicamento_id=${id}`); }}
                className="text-xs font-semibold text-ice bg-ice/10 px-3.5 py-2 rounded-xl hover:bg-ice/20 transition-colors flex items-center gap-1.5"
              >
                <Plus size={14} /> Nova Receita
              </button>
            </div>

            <div className="rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm space-y-3">
              {renovacoes.length === 0 ? (
                <p className="text-xs text-ink-muted py-3 text-center">Nenhum registro de renovação ou compra para este medicamento.</p>
              ) : (
                <div className="space-y-2">
                  {renovacoes.sort((a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime()).map((r: any) => (
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
                            {r.preco !== undefined && r.preco !== null && r.preco > 0 ? `Custo: R$ ${Number(r.preco).toFixed(2).replace(".", ",")}` : "Gratuito (SUS / Estadual)"}
                          </p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-ink-faint" />
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
