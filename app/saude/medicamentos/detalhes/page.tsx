"use client";

import { useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Edit3, 
  Pill, 
  Circle, 
  Droplet, 
  Syringe, 
  StickyNote, 
  Calendar, 
  Clock, 
  User, 
  Stethoscope, 
  Store, 
  Activity,
  Brain,
  ShieldAlert,
  HeartPulse,
  Flame,
  AlertCircle,
  Package,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { TIPO_RECEITA_LABELS, getDaysUntil, computeEstoqueInfo } from "@/lib/health-utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const fadeUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.05 } }
};

const FORMATOS = [
  { id: "comprimido", label: "Redondo", icon: Circle },
  { id: "capsula", label: "Cápsula", icon: Pill },
  { id: "gota", label: "Gotas", icon: Droplet },
  { id: "injecao", label: "Injeção", icon: Syringe },
  { id: "adesivo", label: "Adesivo", icon: StickyNote },
];

function getTratamentoIcon(nome: string) {
  const n = nome.toLowerCase();
  if (n.includes("tdah")) return Brain;
  if (n.includes("dor") || n.includes("neuropática")) return Flame;
  if (n.includes("depress")) return HeartPulse;
  if (n.includes("ansied") || n.includes("ansiolítico")) return ShieldAlert;
  return Activity;
}

function MedicamentoDetalhesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { trigger } = useHapticFeedback();

  // 1. Busca o Medicamento
  const med = useLiveQuery(() => id ? db.medicamentos.get(id) : undefined, [id]);

  // 2. Busca os Dados Relacionais Cruzados
  const person = useLiveQuery(() => med?.person_id ? db.persons.get(med.person_id) : undefined, [med?.person_id]);
  const medico = useLiveQuery(() => med?.medico_id ? db.medicos.get(med.medico_id) : undefined, [med?.medico_id]);
  const farmacia = useLiveQuery(() => med?.farmacia_id ? db.farmacias.get(med.farmacia_id) : undefined, [med?.farmacia_id]);
  
  // 3. Busca Tratamentos (N:N)
  const tratamentos = useLiveQuery(async () => {
    if (!id) return [];
    const vinculos = await db.medicamento_tratamentos.where('medicamento_id').equals(id).toArray();
    let tIds = vinculos.map(v => v.tratamento_id);
    if (tIds.length === 0 && med?.tratamento_id) tIds = [med.tratamento_id]; // Fallback
    
    if (tIds.length === 0) return [];
    return await db.tratamentos.where('id').anyOf(tIds).toArray();
  }, [id, med?.tratamento_id]);

  if (med === undefined) return <LoadingSkeleton />;
  if (med === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-void text-ink-primary">
        <p>Medicamento não encontrado.</p>
        <button onClick={() => router.back()} className="mt-4 text-ice">Voltar</button>
      </main>
    );
  }

  const FormatIcon = FORMATOS.find(f => f.id === med.formato)?.icon || Pill;
  const cores = med.cores || [];
  const hasTwoColors = cores.length === 2;
  const color1 = cores[0] || "#9CA3AF";
  const color2 = hasTwoColors ? cores[1] : color1;
  const gradientId = `detail-split-${med.id}`;

  const isActive = med.status !== "descontinuado";
  const diasRenovacao = getDaysUntil(med.proxima_renovacao);
  const estoqueInfo = computeEstoqueInfo(med);

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))] selection:bg-ice/20">
        
        {/* MÁGICA DO SVG PARA O ÍCONE BICOLOR */}
        <svg width="0" height="0" className="absolute">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="50%" stopColor={color1} />
              <stop offset="50%" stopColor={color2} />
            </linearGradient>
          </defs>
        </svg>

        {/* HEADER FLUTUANTE */}
        <header className="sticky top-0 z-30 border-b border-surface-border/30 bg-void/80 px-5 pb-4 pt-4 header-safe-top backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <button onClick={() => { trigger("vibrate"); router.back(); }} className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95">
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <button onClick={() => { trigger("vibrate"); router.push(`/saude/medicamentos/editar?id=${med.id}`); }} className="flex h-11 w-11 items-center justify-center rounded-full bg-ice/10 text-ice transition-all active:scale-95">
              <Edit3 size={18} />
            </button>
          </div>
        </header>

        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="px-5 pt-6 space-y-6">
          
          {/* HERO SECTION - NOME E IDENTIDADE VISUAL */}
          <motion.section variants={fadeUp} className="flex flex-col items-center text-center">
            <div className="relative mb-4 flex h-24 w-24 items-center justify-center rounded-3xl bg-surface-raised border border-surface-border shadow-xl shadow-void/50">
              <FormatIcon size={48} stroke={hasTwoColors ? `url(#${gradientId})` : color1} strokeWidth={1.5} />
              
              {/* Badge de Status flutuante */}
              <div className={`absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-void ${isActive ? 'bg-emerald-400 text-void' : 'bg-coral text-void'}`}>
                {isActive ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
              </div>
            </div>
            
            <h1 className="font-display text-3xl font-bold text-ink-primary tracking-tight">{med.nome}</h1>
            <p className="mt-1 text-lg font-medium text-ink-muted">{med.dosagem}</p>
            
            {person && (
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-surface-border/60 bg-surface px-3 py-1.5 text-xs font-medium text-ink-primary shadow-sm">
                <User size={12} className="text-ink-muted" />
                <span>Perfil: {person.name}</span>
              </div>
            )}
          </motion.section>

          {/* TRATAMENTOS VINCULADOS */}
          {tratamentos && tratamentos.length > 0 && (
            <motion.section variants={fadeUp} className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted ml-1">Tratamentos</h3>
              <div className="flex flex-wrap gap-2">
                {tratamentos.map(t => {
                  const Icon = getTratamentoIcon(t.nome);
                  return (
                    <div key={t.id} className="flex items-center gap-2 rounded-2xl border border-violet-400/20 bg-violet-400/10 px-4 py-3 shadow-sm">
                      <Icon size={18} className="text-violet-400" />
                      <span className="text-sm font-semibold text-violet-300">{t.nome}</span>
                    </div>
                  );
                })}
              </div>
            </motion.section>
          )}

          {/* DADOS DA RECEITA & REDE DE APOIO (Relacional) */}
          <motion.section variants={fadeUp} className="grid grid-cols-2 gap-3">
            <div className="col-span-2 rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-ice/10 text-ice">
                  <Stethoscope size={18} />
                </div>
                <div>
                  <p className="text-xs text-ink-muted">Médico Prescritor</p>
                  <p className="font-semibold text-ink-primary text-sm mt-0.5">{medico ? medico.nome : med.medico || "Não informado"}</p>
                  {medico?.especialidade && <p className="text-[11px] text-ink-muted">{medico.especialidade}</p>}
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm">
              <p className="text-xs text-ink-muted mb-1">Tipo de Receita</p>
              <span className={`inline-block rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wide
                ${med.tipo_receita === 'amarela' ? 'bg-amber-400/20 text-amber-300' : 
                  med.tipo_receita === 'azul' ? 'bg-blue-400/20 text-blue-300' : 
                  med.tipo_receita === 'branca' ? 'bg-zinc-400/20 text-zinc-300' : 'bg-ice/20 text-ice'}
              `}>
                {TIPO_RECEITA_LABELS[med.tipo_receita as TipoReceita] || "Comum"}
              </span>
            </div>

            <div className="rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm">
              <p className="text-xs text-ink-muted mb-1">Próx. Renovação</p>
              {med.proxima_renovacao ? (
                <div>
                  <p className="font-semibold text-ink-primary text-sm">
                    {format(new Date(med.proxima_renovacao), "dd MMM, yyyy", { locale: ptBR })}
                  </p>
                  {diasRenovacao !== null && (
                    <p className={`text-[10px] font-medium mt-0.5 ${diasRenovacao <= 7 ? 'text-coral' : 'text-emerald-400'}`}>
                      {diasRenovacao > 0 ? `Em ${diasRenovacao} dias` : diasRenovacao === 0 ? "Hoje" : "Atrasada"}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm font-medium text-ink-muted">—</p>
              )}
            </div>

            {(farmacia || med.farmacia) && (
              <div className="col-span-2 flex items-center gap-3 rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm">
                <Store size={16} className="text-ink-muted shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-ink-muted">Comprado em</p>
                  <p className="truncate font-semibold text-ink-primary text-sm">{farmacia ? farmacia.nome : med.farmacia}</p>
                </div>
              </div>
            )}
          </motion.section>

          {/* CONTROLE DE ESTOQUE E POSOLOGIA */}
          {med.estoque_horarios && med.estoque_horarios.length > 0 && (
            <motion.section variants={fadeUp} className="rounded-[28px] border border-ice/20 bg-ice/5 p-5 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Clock size={100} />
              </div>
              
              <div className="relative z-10 flex items-center gap-2 mb-4">
                <Package size={18} className="text-ice" />
                <h3 className="text-sm font-bold text-ice">Controle de Estoque & Posologia</h3>
              </div>

              {estoqueInfo && (
                <div className="mb-5 relative z-10">
                  <div className="flex items-end justify-between mb-2">
                    <div>
                      <p className="text-2xl font-display font-bold text-ink-primary">
                        {estoqueInfo.quantidadeRestante} <span className="text-sm font-medium text-ink-muted">{med.estoque_unidade_medida || "unid."}</span>
                      </p>
                      <p className="text-xs text-ink-muted mt-1">Estoque atual estimado</p>
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-surface-raised overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }} 
                      animate={{ width: `${Math.min(100, (estoqueInfo.quantidadeRestante / (med.estoque_quantidade || 1)) * 100)}%` }} 
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={`h-full rounded-full ${estoqueInfo.quantidadeRestante <= 5 ? 'bg-coral' : estoqueInfo.quantidadeRestante <= 10 ? 'bg-amber-400' : 'bg-ice'}`}
                    />
                  </div>
                </div>
              )}

              <div className="relative z-10">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-2">Horários Diários</p>
                <div className="flex flex-wrap gap-2">
                  {med.estoque_horarios.map((h, i) => (
                    <div key={i} className="flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface px-3 py-2 text-sm font-medium text-ink-primary shadow-sm">
                      <Clock size={14} className="text-ice" />
                      {h}
                    </div>
                  ))}
                  <div className="flex items-center gap-1.5 rounded-xl bg-surface-raised px-3 py-2 text-xs font-medium text-ink-muted">
                    {med.estoque_unidade_por_dose || 1} {med.estoque_unidade_medida || "unid."} por dose
                  </div>
                </div>
              </div>
            </motion.section>
          )}

          {/* OBSERVAÇÕES CLÍNICAS */}
          {med.observacoes && (
            <motion.section variants={fadeUp} className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={16} className="text-ink-muted" />
                <h3 className="text-sm font-bold text-ink-primary">Notas Clínicas</h3>
              </div>
              <p className="text-sm leading-relaxed text-ink-muted whitespace-pre-wrap">
                {med.observacoes}
              </p>
            </motion.section>
          )}

        </motion.div>
      </main>
    </PageTransition>
  );
}

export default function MedicamentoDetalhesPage() {
  return <Suspense fallback={<LoadingSkeleton />}><MedicamentoDetalhesContent /></Suspense>;
}
