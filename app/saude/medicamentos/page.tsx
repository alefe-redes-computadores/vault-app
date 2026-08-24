// app/saude/medicamentos/page.tsx
"use client";

import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, Pill, Circle, Droplet, Syringe, StickyNote, ChevronRight,
  Activity, Calendar, AlertTriangle, Search, Check, Zap, EyeOff, Eye,
  Loader2, FileWarning, Store, Building2, Stethoscope,
} from "lucide-react";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { usePersons } from "@/hooks/usePersons";
import { useTratamentos } from "@/hooks/useTratamentos";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { useHapticFeedback } from "@/lib/haptics";
import { useToast } from "@/components/ToastProvider";
import { PageTransition } from "@/components/PageTransition";
import { CardListSkeleton } from "@/components/loading/CardListSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { Input } from "@/components/ui/Input";
import { computeEstoqueInfo, getDaysUntil } from "@/lib/health-utils";
import { sugerirRenovacao, isReceitaVencidaSegura } from "@/lib/health-insights";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Medicamento, Person, Tratamento } from "@/lib/types";

// 🔥 Formatos atualizados mapeando rigorosamente com o fluxo de cadastro
const FORMATOS = [
  { id: "inteiro", label: "Inteiro", icon: Circle },
  { id: "comprimido", label: "Inteiro", icon: Circle },
  { id: "partido", label: "Partido", icon: Pill },
  { id: "capsula", label: "Cápsula", icon: Pill },
  { id: "gota", label: "Gotas", icon: Droplet },
  { id: "gotas", label: "Gotas", icon: Droplet },
  { id: "injecao", label: "Injeção", icon: Syringe },
  { id: "adesivo", label: "Adesivo", icon: StickyNote },
];

function formatDate(date?: string) {
  if (!date) return null;
  try {
    return format(new Date(date), "dd MMM", { locale: ptBR });
  } catch {
    return null;
  }
}

function getTratamentoStyle(nome: string, cor?: string) {
  if (cor) return { bg: `${cor}20`, border: `${cor}40`, text: cor };
  const n = (nome || "").toLowerCase();
  if (n.includes("tdah")) return { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400" };
  if (n.includes("dor")) return { bg: "bg-coral/10", border: "border-coral/20", text: "text-coral" };
  if (n.includes("depress")) return { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400" };
  if (n.includes("ansied")) return { bg: "bg-amber-400/10", border: "border-amber-400/20", text: "text-amber-400" };
  return { bg: "bg-violet-500/10", border: "border-violet-500/20", text: "text-violet-400" };
}

export default function MedicamentosListPage() {
  const router = useRouter();
  const { trigger } = useHapticFeedback();
  const { showToast } = useToast();
  const { medicamentos: medicamentosTodas, updateMedicamento } = useMedicamentos();
  const { activePersonId } = useActivePersonId();
  const persons = usePersons() as Person[];
  const { tratamentos = [] } = useTratamentos();

  const [searchQuery, setSearchQuery] = useState("");
  const [showDescontinuados, setShowDescontinuados] = useState(false);
  const [sortBy, setSortBy] = useState<"urgency" | "name" | "renewal">("urgency");
  const [tomandoDoseId, setTomandoDoseId] = useState<string | null>(null);

  const medicamentos = useMemo(() => {
    if (!activePersonId) return [];
    return (medicamentosTodas || []).filter(m => m.person_id === activePersonId);
  }, [medicamentosTodas, activePersonId]);

  const tratamentoMap = useMemo(() => {
    const map = new Map<string, { nome: string; cor?: string }>();
    (tratamentos || []).forEach(t => { if (t.id) map.set(t.id, { nome: t.nome, cor: t.cor }); });
    return map;
  }, [tratamentos]);

  const activePerson = (persons || []).find((p) => p.id === activePersonId);
  const activePersonColor = activePerson?.color || "#38BDF8";

  const handleTomarAgora = useCallback(
    async (e: React.MouseEvent, med: Medicamento) => {
      e.stopPropagation();
      trigger("success");
      setTomandoDoseId(med.id!);

      const isSOS = med.tipo_uso !== "continuo";
      const estoqueInfo = computeEstoqueInfo(med);
      
      const atual = isSOS ? (med.estoque_quantidade ?? 0) : (estoqueInfo?.quantidadeRestante ?? med.estoque_quantidade ?? 0);
      const doseGasta = Number(med.estoque_unidade_por_dose) || 1;

      if (atual <= 0) {
        trigger("error");
        showToast(`Estoque de ${med.nome} esgotado!`, "error");
        setTomandoDoseId(null);
        return;
      }

      const novoEstoque = Math.max(0, atual - doseGasta);

      try {
        await updateMedicamento(med.id!, {
          estoque_quantidade: novoEstoque,
          estoque_data_referencia: new Date().toISOString().slice(0, 10),
        });

        const horaAtual = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        showToast(`1 dose de ${med.nome} registrada às ${horaAtual}`, "success");
      } catch {
        trigger("error");
        showToast(`Erro ao registrar dose de ${med.nome}`, "error");
      } finally {
        setTomandoDoseId(null);
      }
    },
    [updateMedicamento, trigger, showToast]
  );

  const filteredAndSorted = useMemo(() => {
    if (!medicamentos) return [];
    let list = [...medicamentos];

    if (!showDescontinuados) list = list.filter((m) => m.status !== "descontinuado");

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(m => m.nome.toLowerCase().includes(q) || (m.medico && m.medico.toLowerCase().includes(q)));
    }

    return list.sort((a, b) => {
      if (sortBy === "name") return a.nome.localeCompare(b.nome);
      if (sortBy === "renewal") {
        const diasA = getDaysUntil(a.proxima_renovacao) ?? 9999;
        const diasB = getDaysUntil(b.proxima_renovacao) ?? 9999;
        return diasA - diasB;
      }

      const aVencida = isReceitaVencidaSegura(a.proxima_renovacao);
      const bVencida = isReceitaVencidaSegura(b.proxima_renovacao);
      if (aVencida && !bVencida) return -1;
      if (!aVencida && bVencida) return 1;

      const isSOSA = a.tipo_uso !== "continuo";
      const isSOSB = b.tipo_uso !== "continuo";
      
      const estoqueA = isSOSA ? (a.estoque_quantidade ?? 9999) : (computeEstoqueInfo(a)?.quantidadeRestante ?? a.estoque_quantidade ?? 9999);
      const estoqueB = isSOSB ? (b.estoque_quantidade ?? 9999) : (computeEstoqueInfo(b)?.quantidadeRestante ?? b.estoque_quantidade ?? 9999);
      
      const isCriticoA = estoqueA < 10;
      const isCriticoB = estoqueB < 10;

      if (isCriticoA && !isCriticoB) return -1;
      if (!isCriticoA && isCriticoB) return 1;

      const diasA = getDaysUntil(a.proxima_renovacao) ?? 9999;
      const diasB = getDaysUntil(b.proxima_renovacao) ?? 9999;
      return diasA - diasB;
    });
  }, [medicamentos, searchQuery, showDescontinuados, sortBy]);

  if (medicamentosTodas === undefined) return <CardListSkeleton />;

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28 relative">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 header-safe-top backdrop-blur-xl space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => { trigger("vibrate"); router.back(); }} className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95">
                <ArrowLeft size={18} />
              </button>
              <div>
                <h1 className="font-display text-xl font-semibold text-ink-primary">Meus medicamentos</h1>
                <p className="text-sm text-ink-muted">{filteredAndSorted.length} ativos</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => { trigger("vibrate"); setShowDescontinuados(!showDescontinuados); }}
                className={`flex h-11 w-11 items-center justify-center rounded-full border transition-colors ${showDescontinuados ? "border-amber-400 bg-amber-400/10 text-amber-400" : "border-surface-border/50 bg-surface-raised text-ink-muted"}`}
              >
                {showDescontinuados ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
              <Input placeholder="Buscar remédio ou médico..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 bg-surface-raised/60 text-sm h-11 rounded-2xl" />
            </div>
            <select value={sortBy} onChange={(e) => { trigger("vibrate"); setSortBy(e.target.value as "urgency" | "name" | "renewal"); }} className="bg-surface-raised border border-surface-border/60 text-ink-muted text-xs font-semibold rounded-2xl px-3 h-11 outline-none">
              <option value="urgency">Urgência</option>
              <option value="renewal">Renovação</option>
              <option value="name">Nome</option>
            </select>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-4">
          {filteredAndSorted.length === 0 ? (
            <EmptyState icon={Pill} title="Nenhum medicamento encontrado" description="Tente mudar os filtros ou cadastre um novo medicamento." actionLabel="Limpar filtros" onAction={() => { setSearchQuery(""); setShowDescontinuados(false); trigger("vibrate"); }} />
          ) : (
            filteredAndSorted.map((med: Medicamento) => {
              const isSOS = med.tipo_uso !== "continuo";
              const estoqueInfo = computeEstoqueInfo(med);
              const qtd = isSOS ? (med.estoque_quantidade ?? null) : (estoqueInfo?.quantidadeRestante ?? med.estoque_quantidade ?? null);
              
              const tIds = med.tratamento_ids || [];
              const isSuspenso = med.status === "descontinuado";
              const isControlado = med.tipo_receita === "amarela" || med.tipo_receita === "azul";
              const insight = isSuspenso ? null : sugerirRenovacao(med);
              const receitaVencida = isReceitaVencidaSegura(med.proxima_renovacao);

              // 🔥 FORMATO E CORES DUPLAS (SUPORTE A BICOLOR / GRADIENTE)
              const formatoBanco = med.formato?.toLowerCase().trim() || "inteiro";
              const itemFormato = FORMATOS.find(f => f.id === formatoBanco) || FORMATOS[0];
              const SelectedFormatIcon = itemFormato.icon;
              
              const cor1 = med.cores && med.cores.length > 0 ? med.cores[0] : "#60A5FA";
              const cor2 = med.cores && med.cores.length > 1 ? med.cores[1] : null;
              const cardBorderColor = activePersonColor || cor1;

              // Estilo de gradiente bicolor para o ícone se houver 2 cores
              const iconContainerStyle = cor2
                ? { background: `linear-gradient(135deg, ${cor1}25 50%, ${cor2}25 50%)`, borderColor: cor1 }
                : { backgroundColor: `${cor1}15`, borderColor: `${cor1}40` };

              return (
                <motion.button
                  key={med.id}
                  onClick={() => { trigger("vibrate"); router.push(`/saude/medicamentos/detalhes?id=${med.id}`); }}
                  className={`w-full rounded-[24px] border bg-surface p-4 text-left shadow-md hover:bg-surface-raised relative overflow-hidden transition-all ${isSuspenso ? "opacity-60 border-coral/30" : "border-surface-border"}`}
                  style={{ borderColor: !isSuspenso ? `${cardBorderColor}40` : undefined }}
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-2 ${isSuspenso ? "bg-coral" : med.tipo_receita === "amarela" ? "bg-amber-400" : med.tipo_receita === "azul" ? "bg-blue-400" : cardBorderColor}`} />

                  <div className="flex items-start gap-3.5 ml-1">
                    <div className="h-12 w-12 rounded-2xl flex items-center justify-center border shadow-inner shrink-0" style={iconContainerStyle}>
                      <SelectedFormatIcon size={24} style={{ color: cor1 }} strokeWidth={2.4} />
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* TOPO: NOME, DOSAGEM E ETAGETAS ORGANIZADAS */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <h3 className="font-display text-base font-bold text-ink-primary uppercase truncate">{med.nome}</h3>
                          <span className="text-xs font-semibold text-ink-muted shrink-0">{med.dosagem}</span>
                        </div>
                      </div>

                      {/* BADGES / ETIQUETAS */}
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {isSOS && (
                          <span className="shrink-0 rounded-md bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-400 border border-amber-400/20 uppercase flex items-center gap-0.5">
                            <Zap size={8} fill="currentColor"/> SOS
                          </span>
                        )}
                        {isControlado && (
                          <span className="shrink-0 rounded-md bg-blue-400/10 px-1.5 py-0.5 text-[9px] font-bold text-blue-400 border border-blue-400/20 uppercase">
                            Controlado
                          </span>
                        )}
                        {receitaVencida && !isSuspenso && (
                          <span className="shrink-0 rounded-md bg-coral/10 px-1.5 py-0.5 text-[9px] font-bold text-coral border border-coral/20 uppercase">
                            Vencida
                          </span>
                        )}
                        {isSuspenso && (
                          <span className="shrink-0 rounded-md bg-coral/10 px-1.5 py-0.5 text-[9px] font-bold text-coral border border-coral/20 uppercase">
                            Suspenso
                          </span>
                        )}
                      </div>

                      {/* MEIO: MÉDICO E LOCAL / FARMÁCIA */}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <p className="text-xs font-medium text-ink-muted flex items-center gap-1.5 truncate">
                          <Stethoscope size={11} className="text-ink-faint"/> {med.medico || "Médico não informado"}
                        </p>
                        {med.farmacia && (
                          <span className="flex items-center gap-1 text-[10px] text-ink-muted border-l border-surface-border/60 pl-2">
                            <Store size={10} className="text-emerald-400/80" /> {med.farmacia}
                          </span>
                        )}
                        {med.hospital_id && !med.farmacia && (
                          <span className="flex items-center gap-1 text-[10px] text-ink-muted border-l border-surface-border/60 pl-2">
                            <Building2 size={10} className="text-violet-400/80" /> Hospital
                          </span>
                        )}
                      </div>

                      {/* TRATAMENTOS VINCULADOS */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {tIds.map((tId: string) => {
                          const t = tratamentoMap.get(tId);
                          if (!t) return null;
                          const style = getTratamentoStyle(t.nome, t.cor);
                          return (
                            <span key={tId} className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide border ${style.bg} ${style.border} ${style.text}`}>
                              {t.nome}
                            </span>
                          );
                        })}
                      </div>

                      {insight?.deveRenovar && (
                        <div className={`mt-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-semibold w-fit ${insight.urgencia === "alta" ? "bg-coral/20 text-coral-200 border-coral/30" : "bg-amber-400/20 text-amber-200 border-amber-400/30"}`}>
                          <FileWarning size={12} /> {insight.mensagem}
                        </div>
                      )}

                      {/* RODAPÉ: ESTOQUE, TOMAR E RENOVAR INTELIGENTE LIMPO E ALINHADO */}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-surface-border/40">
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-bold ${insight?.urgencia === "alta" ? "text-coral animate-pulse" : "text-emerald-400"}`}>
                            {qtd !== null ? `${qtd} ${med.estoque_unidade_medida || "unidades"}` : "Sem estoque"}
                          </span>

                          {qtd !== null && qtd > 0 && !isSuspenso && (
                            <button
                              onClick={(e) => handleTomarAgora(e, med)}
                              disabled={tomandoDoseId === med.id}
                              className="flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-[10px] font-bold active:scale-95 transition-all disabled:opacity-50"
                            >
                              {tomandoDoseId === med.id ? <Loader2 size={10} className="animate-spin" /> : <Zap size={10} fill="currentColor" />} Tomar
                            </button>
                          )}
                        </div>

                        {!isSuspenso && (
                          <div className="flex items-center rounded-lg border border-surface-border bg-surface-raised overflow-hidden">
                            <button
                               onClick={(e) => { e.stopPropagation(); trigger("vibrate"); router.push(`/saude/renovacao/nova?medicamento_id=${med.id}`); }}
                               className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-ink-muted hover:text-ink-primary active:bg-surface-border transition-colors"
                            >
                               <Calendar size={10} className={insight?.urgencia === 'alta' ? 'text-coral' : 'text-amber-400'} /> Renovar
                            </button>
                            {med.proxima_renovacao && (
                              <span className="px-2 py-1 text-[9px] font-bold text-ink-muted border-l border-surface-border bg-surface">
                                {formatDate(med.proxima_renovacao)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                </motion.button>
              );
            })
          )}
        </section>
      </main>
    </PageTransition>
  );
}
