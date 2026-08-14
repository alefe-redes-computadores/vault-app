"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Pill, Circle, Droplet, Syringe, StickyNote, Plus, ChevronRight, Activity, Calendar, AlertTriangle } from "lucide-react";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { usePersons } from "@/hooks/usePersons";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { computeEstoqueInfo, getDaysUntil } from "@/lib/health-utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

const FORMATOS = [
  { id: "comprimido", label: "Redondo", icon: Circle },
  { id: "capsula", label: "Cápsula", icon: Pill },
  { id: "gota", label: "Gotas", icon: Droplet },
  { id: "injecao", label: "Injeção", icon: Syringe },
  { id: "adesivo", label: "Adesivo", icon: StickyNote },
];

function formatDate(date?: string) {
  if (!date) return null;
  return format(new Date(date), "dd MMM", { locale: ptBR });
}

const getTratamentoStyle = (nome: string) => {
  const n = nome.toLowerCase();
  if (n.includes("tdah")) return "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";
  if (n.includes("dor")) return "bg-coral/10 border-coral/20 text-coral";
  if (n.includes("depress")) return "bg-blue-500/10 border-blue-500/20 text-blue-400";
  if (n.includes("ansied")) return "bg-amber-400/10 border-amber-400/20 text-amber-400";
  return "bg-violet-500/10 border-violet-500/20 text-violet-400";
};

export default function MedicamentosListPage() {
  const router = useRouter();
  const { trigger } = useHapticFeedback();
  const { medicamentos } = useMedicamentos();
  const persons = usePersons();

  const tratamentos = useLiveQuery(() => db.tratamentos.toArray(), []) || [];
  const vinculos = useLiveQuery(() => db.medicamento_tratamentos.toArray(), []) || [];

  const tratamentoMap = useMemo(() => {
    const map = new Map();
    tratamentos.forEach((t: any) => map.set(t.id, { nome: t.nome }));
    return map;
  }, [tratamentos]);

  const personMap = useMemo(() => {
    const map = new Map();
    persons.forEach((p: any) => map.set(p.id, p.name));
    return map;
  }, [persons]);

  const vinculosMap = useMemo(() => {
    const map = new Map<string, string[]>();
    vinculos.forEach((v: any) => {
      if (!map.has(v.medicamento_id)) map.set(v.medicamento_id, []);
      map.get(v.medicamento_id)!.push(v.tratamento_id);
    });
    return map;
  }, [vinculos]);

  const sorted = useMemo(() => [...(medicamentos || [])].sort((a, b) => (getDaysUntil(a.proxima_renovacao) ?? 9999) - (getDaysUntil(b.proxima_renovacao) ?? 9999)), [medicamentos]);

  if (medicamentos === undefined) return <LoadingSkeleton />;

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 header-safe-top backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button onClick={() => { trigger("vibrate"); router.back(); }} className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95"><ArrowLeft size={18} /></button>
            <div>
              <h1 className="font-display text-xl font-semibold text-ink-primary">Meus medicamentos</h1>
              <p className="text-sm text-ink-muted">{sorted.length} ativos</p>
            </div>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-5">
          {sorted.map((med, index) => {
            const estoqueInfo = computeEstoqueInfo(med);
            const qtd = estoqueInfo?.quantidadeRestante ?? null;
            const isEstoqueCritico = qtd !== null && qtd < 10;
            const personName = med.person_id ? personMap.get(med.person_id) : null;
            let tIds = med.id ? vinculosMap.get(med.id) || [] : [];
            
            const SelectedFormatIcon = FORMATOS.find(f => f.id === med.formato)?.icon || Pill;
            const color1 = med.cores?.[0] || "#60A5FA";

            return (
              <motion.button
                key={med.id}
                onClick={() => { trigger("vibrate"); router.push(`/saude/medicamentos/detalhes?id=${med.id}`); }}
                className="w-full rounded-[24px] border border-surface-border bg-surface p-4 text-left shadow-md hover:bg-surface-raised relative overflow-hidden"
              >
                <div className={`absolute left-0 top-0 bottom-0 w-2 ${med.tipo_receita === 'amarela' ? 'bg-amber-400' : med.tipo_receita === 'azul' ? 'bg-blue-400' : 'bg-ice/50'}`} />
                
                <div className="flex items-start gap-4 ml-1">
                  <div className="h-12 w-12 rounded-2xl flex items-center justify-center border border-surface-border shadow-inner" style={{ backgroundColor: color1 + '15' }}>
                     <SelectedFormatIcon size={24} stroke={color1} strokeWidth={2.4} fill={color1 + '44'} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    {/* Linha 1: NOME (MAIÚSCULO) + DOSAGEM + PESSOA */}
                    <div className="flex items-baseline gap-2 overflow-hidden">
                      <p className="font-display text-base font-bold text-ink-primary uppercase truncate">{med.nome}</p>
                      <p className="text-[10px] font-medium text-ink-muted shrink-0 truncate">{med.dosagem}</p>
                      {personName && <span className="shrink-0 rounded-full bg-ice/10 px-2 py-0.5 text-[9px] font-bold text-ice uppercase">{personName}</span>}
                    </div>

                    {/* Linha 2: Médico */}
                    <p className="text-xs font-medium text-ink-muted mt-0.5 truncate">{med.medico}</p>

                    {/* Linha 3: Tratamentos */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {tIds.map(tId => {
                        const t = tratamentoMap.get(tId);
                        if (!t) return null;
                        return (
                          <span key={tId} className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide border ${getTratamentoStyle(t.nome)}`}>
                            {t.nome}
                          </span>
                        );
                      })}
                    </div>

                    {/* Linha 4: Estoque e Data */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-surface-border/40">
                       <span className={`text-[11px] font-bold ${isEstoqueCritico ? "text-coral animate-pulse" : "text-emerald-400"}`}>
                         {qtd !== null ? `${qtd} ${estoqueInfo?.unidade || 'doses'}` : 'Sem estoque'}
                       </span>
                       <span className="text-[11px] font-mono font-semibold text-amber-400 bg-amber-400/10 px-2 py-1 rounded-lg">
                         Renova: {formatDate(med.proxima_renovacao) || "—"}
                       </span>
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}

          <button onClick={() => { trigger("vibrate"); router.push("/saude/medicamentos/novo"); }} className="flex w-full items-center justify-center gap-2 rounded-[24px] border border-dashed border-surface-border/60 bg-surface/40 py-4 text-sm font-medium text-ink-muted hover:border-ice/30 hover:text-ice">
            <Plus size={16} /> Cadastrar medicamento
          </button>
        </section>
      </main>
    </PageTransition>
  );
}
