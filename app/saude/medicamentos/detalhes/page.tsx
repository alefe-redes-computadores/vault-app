"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, Pill, Circle, Droplet, Syringe, StickyNote, 
  ChevronRight, Edit3, Package, Stethoscope, Store,
  FileText, Activity, Brain, Flame, HeartPulse, ShieldAlert,
  AlertTriangle, CheckCircle2, Building2, Plus, Clock, Info, MapPin
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { computeEstoqueInfo, TIPO_RECEITA_LABELS, VALIDADE_RECEITA_DIAS } from "@/lib/health-utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BottomSheet } from "@/components/ui/BottomSheet";

const fadeUp = { initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0 } };

function formatDate(isoStr: string) {
  if (!isoStr) return "—";
  try { return format(new Date(isoStr), "dd MMM yyyy", { locale: ptBR }); }
  catch { return isoStr; }
}

function isReceitaVencida(dataRenovacao: string) {
  if (!dataRenovacao) return false;
  return new Date(dataRenovacao) < new Date();
}

function MedicamentoDetalhesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { trigger } = useHapticFeedback();
  const [infoModalOpen, setInfoModalOpen] = useState(false);

  // Consultas Dexie
  const med = useLiveQuery(() => id ? db.medicamentos.get(id) : undefined, [id]);
  const medico = useLiveQuery(() => med?.medico_id ? db.medicos.get(med.medico_id) : undefined, [med?.medico_id]);
  const estabelecimento = useLiveQuery(() => med?.estabelecimento_id ? db.table("hospitais").get(med.estabelecimento_id) : undefined, [med?.estabelecimento_id]);
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

  // Motores de inteligência
  const estoqueInfo = computeEstoqueInfo(med);
  const qtd = estoqueInfo?.quantidadeRestante ?? 0;
  const isVencida = med.proxima_renovacao ? isReceitaVencida(med.proxima_renovacao) : false;
  
  const getEstoqueStyle = () => {
    if (qtd <= 9) return { color: "text-coral animate-pulse font-bold", icon: AlertTriangle, label: "CRÍTICO" };
    if (qtd <= 14) return { color: "text-amber-400 font-semibold", icon: AlertTriangle, label: "BAIXO" };
    return { color: "text-emerald-400 font-bold", icon: CheckCircle2, label: "OK" };
  };
  const estoqueStatus = getEstoqueStyle();

  const getReceitaBadgeStyle = () => {
    if (med.tipo_receita === 'amarela') return 'border-amber-400/50 bg-amber-400/10 text-amber-300';
    if (med.tipo_receita === 'azul') return 'border-blue-400/50 bg-blue-400/10 text-blue-300';
    if (med.tipo_receita === 'branca') return 'border-zinc-300/50 bg-zinc-300/10 text-zinc-200';
    return 'border-ice/30 bg-ice/5 text-ice';
  };

  const abrirNoMapa = (enderecoStr?: string) => {
    if (!enderecoStr) return;
    trigger("vibrate");
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enderecoStr)}`;
    window.open(url, "_blank");
  };

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-20">
        <header className="sticky top-0 z-30 flex items-center justify-between px-5 pt-4 pb-2 bg-void/90 backdrop-blur-md">
          <button onClick={() => { trigger("vibrate"); router.back(); }} className="h-10 w-10 flex items-center justify-center rounded-full bg-surface-raised border border-surface-border active:scale-95 transition-transform">
            <ArrowLeft size={18} />
          </button>
          <h2 className="font-semibold text-ink-primary">Detalhes</h2>
          <button onClick={() => { trigger("vibrate"); router.push(`/saude/medicamentos/editar?id=${id}`); }} className="h-10 w-10 flex items-center justify-center rounded-full bg-surface-raised border border-surface-border active:scale-95 transition-transform">
            <Edit3 size={18} />
          </button>
        </header>

        <div className="px-5 mt-6 space-y-6">
          <div className="rounded-[32px] bg-surface p-6 border border-surface-border shadow-lg space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-ice/10 flex items-center justify-center text-ice shadow-inner">
                <Pill size={32} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-ink-primary uppercase tracking-wide">{med.nome}</h1>
                <p className="text-sm text-ink-muted">{med.dosagem} {med.formato ? `• ${med.formato}` : ""}</p>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border ${getReceitaBadgeStyle()}`}>
               <div className="flex justify-between items-center">
                 {/* CORREÇÃO DO BUILD: Adicionado 'as keyof typeof TIPO_RECEITA_LABELS' */}
                 <span className="text-xs font-bold uppercase tracking-wider">
                   Receita {TIPO_RECEITA_LABELS[med.tipo_receita as keyof typeof TIPO_RECEITA_LABELS] || med.tipo_receita}
                 </span>
                 <button onClick={() => { trigger("vibrate"); setInfoModalOpen(true); }} className="text-ink-muted hover:text-ink-primary transition-colors p-1">
                   <Info size={18} />
                 </button>
               </div>
               <div className="mt-2 flex items-center justify-between">
                 <div>
                   <p className={`text-base font-bold ${isVencida ? 'text-coral' : 'text-emerald-400'}`}>
                     {isVencida ? "⚠️ Receita Vencida" : "✓ Receita Válida"}
                   </p>
                   <p className="text-xs text-ink-muted mt-0.5">Próxima Renovação: {formatDate(med.proxima_renovacao)}</p>
                 </div>
                 {isVencida && (
                   <button onClick={() => { trigger("vibrate"); router.push(`/saude/renovacao/nova?medicamento_id=${id}`); }} className="px-3.5 py-2 rounded-xl bg-coral text-void text-xs font-bold shadow-md shadow-coral/20 active:scale-95 transition-transform">
                     Renovar agora
                   </button>
                 )}
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-void/50 rounded-2xl p-3.5 border border-surface-border">
                <span className="text-[10px] uppercase text-ink-muted font-medium">Quantidade Restante</span>
                <p className={`text-lg mt-1 flex items-center gap-1.5 ${estoqueStatus.color}`}>
                  <estoqueStatus.icon size={16} /> {qtd} {med.estoque_unidade_medida || "doses"}
                </p>
              </div>
              <div className="bg-void/50 rounded-2xl p-3.5 border border-surface-border">
                <span className="text-[10px] uppercase text-ink-muted font-medium">Preço Médio</span>
                <p className="text-lg mt-1 font-bold text-emerald-400 font-mono">R$ {med.preco ? Number(med.preco).toFixed(2) : "0,00"}</p>
              </div>
            </div>
          </div>

          {tratamentos.length > 0 && (
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
          )}

          <div className="space-y-3">
             <h3 className="text-sm font-semibold text-ink-primary">Rede de Apoio & Emissão</h3>
             <div className="space-y-2">
               <div className="bg-surface p-4 rounded-2xl border border-surface-border flex items-center gap-4">
                 <div className="h-10 w-10 rounded-xl bg-ice/10 flex items-center justify-center text-ice shrink-0"><Stethoscope size={20} /></div>
                 <div className="flex-1 min-w-0">
                   <p className="text-[10px] uppercase text-ink-muted">Médico Prescritor</p>
                   <p className="text-sm font-medium text-ink-primary truncate">{medico?.nome || med.medico || "Não informado"}</p>
                 </div>
               </div>

               {estabelecimento && (
                 <div className="bg-surface p-4 rounded-2xl border border-surface-border flex items-center justify-between gap-4">
                   <div className="flex items-center gap-4 min-w-0">
                     <div className="h-10 w-10 rounded-xl bg-violet-400/10 flex items-center justify-center text-violet-400 shrink-0"><Building2 size={20} /></div>
                     <div className="min-w-0">
                       <p className="text-[10px] uppercase text-ink-muted">Hospital Emissor</p>
                       <p className="text-sm font-medium text-ink-primary truncate">{estabelecimento.nome}</p>
                     </div>
                   </div>
                   {estabelecimento.endereco && (
                     <button onClick={() => abrirNoMapa(estabelecimento.endereco)} className="p-2.5 rounded-xl bg-violet-400/10 text-violet-300 shrink-0" title="Rota"><MapPin size={16} /></button>
                   )}
                 </div>
               )}
             </div>
          </div>
        </div>

        <BottomSheet isOpen={infoModalOpen} onClose={() => setInfoModalOpen(false)} title="Regulamentação">
          <div className="p-4 space-y-4 text-sm text-ink-muted">
             <div className="rounded-2xl bg-surface-raised p-4 border border-surface-border">
               <p>Prazo de validade: <b>{VALIDADE_RECEITA_DIAS[med.tipo_receita as keyof typeof VALIDADE_RECEITA_DIAS]} dias</b>.</p>
             </div>
             <Button fullWidth onClick={() => { setInfoModalOpen(false); router.push(`/saude/renovacao/nova?medicamento_id=${id}`); }}>Registrar Renovação</Button>
          </div>
        </BottomSheet>
      </main>
    </PageTransition>
  );
}

export default function DetalhesPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <MedicamentoDetalhesContent />
    </Suspense>
  );
}
