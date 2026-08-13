"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Pill, 
  Circle, 
  Droplet, 
  Syringe, 
  StickyNote, 
  Plus, 
  ChevronRight, 
  Activity 
} from "lucide-react";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { usePersons } from "@/hooks/usePersons";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import {
  computeEstoqueInfo,
  getDaysUntil,
  TIPO_RECEITA_LABELS,
} from "@/lib/health-utils";
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
  try { return format(new Date(date), "dd/MM/yyyy", { locale: ptBR }); } 
  catch { return null; }
}

function getReceitaBadgeStyle(tipo?: string) {
  switch (tipo) {
    case "amarela": return "bg-amber-400/20 text-amber-300 border border-amber-400/30";
    case "azul": return "bg-blue-400/20 text-blue-300 border border-blue-400/30";
    case "branca": return "bg-zinc-400/20 text-zinc-300 border border-zinc-400/30";
    default: return "bg-violet-400/15 text-violet-300 border border-violet-400/30";
  }
}

export default function MedicamentosListPage() {
  const router = useRouter();
  const { trigger } = useHapticFeedback();
  const { medicamentos } = useMedicamentos();
  const persons = usePersons();

  const tratamentos = useLiveQuery(() => db.tratamentos.toArray(), []) || [];
  const vinculos = useLiveQuery(() => db.medicamento_tratamentos.toArray(), []) || [];

  const tratamentoMap = useMemo(() => {
    const map = new Map();
    tratamentos.forEach((t: any) => map.set(t.id, t.nome));
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

  const sorted = useMemo(() => {
    return [...(medicamentos || [])].sort((a, b) => {
      const da = getDaysUntil(a.proxima_renovacao) ?? 9999;
      const db = getDaysUntil(b.proxima_renovacao) ?? 9999;
      return da - db;
    });
  }, [medicamentos]);

  const isLoading = medicamentos === undefined;

  if (isLoading) return <LoadingSkeleton />;

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 header-safe-top backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button onClick={() => { trigger("vibrate"); router.back(); }} aria-label="Voltar" className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95">
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Pill size={18} className="text-ice" />
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">Vault</p>
              </div>
              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">Meus medicamentos</h1>
              <p className="mt-1 text-sm text-ink-muted">{sorted.length} cadastrado{sorted.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
        </header>

        <section className="space-y-3 px-5 pt-5">
          {sorted.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }} className="flex flex-col items-center justify-center rounded-[28px] border border-surface-border/50 bg-surface px-6 py-14 text-center shadow-sm">
              <div className="glow-ice mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-ice/15 bg-surface-raised">
                <Pill size={22} className="text-ice/60" />
              </div>
              <h3 className="font-display text-base font-semibold text-ink-primary">Nenhum medicamento cadastrado</h3>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-ink-muted">Cadastre pra acompanhar renovação de receita e estoque.</p>
              <button onClick={() => { trigger("vibrate"); router.push("/saude/medicamentos/novo"); }} className="glow-ice mt-6 inline-flex items-center gap-2 rounded-full bg-ice px-5 py-2.5 text-sm font-semibold text-void transition-all duration-200 active:scale-95">
                <Plus size={16} /> Cadastrar medicamento
              </button>
            </motion.div>
          ) : (
            <>
              {sorted.map((med, index) => {
                const estoqueInfo = computeEstoqueInfo(med);
                const qtd = estoqueInfo?.quantidadeRestante ?? null;
                const isEstoqueCritico = qtd !== null && qtd < 5;
                const isEstoqueBaixo = qtd !== null && qtd >= 5 && qtd < 10;
                const personName = med.person_id ? personMap.get(med.person_id) : null;
                
                let tIds = vinculosMap.get(med.id) || [];
                if (tIds.length === 0 && med.tratamento_id) tIds = [med.tratamento_id];

                // Identidade Visual
                const SelectedFormatIcon = FORMATOS.find(f => f.id === med.formato)?.icon || Pill;
                const cores = med.cores || [];
                const hasTwoColors = cores.length === 2;
                const color1 = cores[0] || "#9CA3AF";
                const color2 = hasTwoColors ? cores[1] : color1;
                const gradientId = `list-split-${med.id}`;

                return (
                  <motion.button
                    key={med.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: Math.min(index * 0.04, 0.3) }}
                    onClick={() => {
                      trigger("vibrate");
                      // AGORA NAVEGA PARA A TELA DE DETALHES VIA QUERY PARAMS
                      router.push(`/saude/medicamentos/detalhes?id=${med.id}`);
                    }}
                    className="flex w-full items-start gap-3 rounded-[22px] border border-surface-border/50 bg-surface p-4 text-left shadow-sm transition-all active:scale-[0.985] hover:bg-surface-raised/80 relative overflow-hidden"
                  >
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${med.tipo_receita === 'amarela' ? 'bg-amber-400' : med.tipo_receita === 'azul' ? 'bg-blue-400' : 'bg-ice/40'}`} />

                    {/* MÁGICA SVG PARA ESTE CARD ESPECÍFICO */}
                    <svg width="0" height="0" className="absolute">
                      <defs>
                        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="50%" stopColor={color1} />
                          <stop offset="50%" stopColor={color2} />
                        </linearGradient>
                      </defs>
                    </svg>

                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface-raised border border-surface-border/50 ml-1">
                      <SelectedFormatIcon size={20} stroke={hasTwoColors ? `url(#${gradientId})` : color1} strokeWidth={2} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="truncate font-display text-sm font-semibold text-ink-primary">{med.nome}</p>
                        {personName && <span className="shrink-0 rounded-full border border-surface-border/50 bg-surface-raised px-2 py-0.5 text-[9px] font-semibold text-ink-muted uppercase tracking-wide">👤 {personName}</span>}
                        {med.tipo_receita && <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${getReceitaBadgeStyle(med.tipo_receita)}`}>{TIPO_RECEITA_LABELS[med.tipo_receita] || med.tipo_receita}</span>}
                        {tIds.map(tId => {
                          const tName = tratamentoMap.get(tId);
                          if (!tName) return null;
                          return (
                            <span key={tId} className="shrink-0 inline-flex items-center gap-1 rounded-full bg-violet-400/10 border border-violet-400/20 px-2 py-0.5 text-[9px] font-semibold text-violet-300">
                              <Activity size={10} /> {tName}
                            </span>
                          );
                        })}
                      </div>

                      <p className="mt-0.5 text-xs text-ink-muted">{med.dosagem} · Dr(a). {med.medico}</p>

                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                        <span className="text-ink-muted">Renova em {formatDate(med.proxima_renovacao) || "—"}</span>
                        {estoqueInfo && (
                          <span className={`font-medium ${isEstoqueCritico ? "text-coral font-semibold animate-pulse" : isEstoqueBaixo ? "text-amber-400" : "text-ice/80"}`}>
                            {qtd} {estoqueInfo.unidade} restantes {isEstoqueCritico ? "⚠️" : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    <ChevronRight size={16} className="mt-1 shrink-0 text-ink-faint" />
                  </motion.button>
                );
              })}

              <button onClick={() => { trigger("vibrate"); router.push("/saude/medicamentos/novo"); }} className="flex w-full items-center justify-center gap-2 rounded-[24px] border border-dashed border-surface-border/60 bg-surface/40 py-4 text-sm font-medium text-ink-muted transition-all active:scale-[0.985] hover:border-ice/30 hover:text-ice">
                <Plus size={16} /> Cadastrar medicamento
              </button>
            </>
          )}
        </section>
      </main>
    </PageTransition>
  );
}
