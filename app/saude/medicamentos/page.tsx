"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Pill, Circle, Droplet, Syringe, StickyNote, ChevronRight, Activity, Calendar, AlertTriangle, Search, Check, Zap, EyeOff, Eye, Loader2, FileWarning } from "lucide-react";
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
import { Input } from "@/components/ui/Input";
// 🧠 Importação da Inteligência
import { sugerirRenovacao } from "@/lib/health-insights";

const FORMATOS = [
  { id: "comprimido", label: "Redondo", icon: Circle },
  { id: "capsula", label: "Cápsula", icon: Pill },
  { id: "gota", label: "Gotas", icon: Droplet },
  { id: "injecao", label: "Injeção", icon: Syringe },
  { id: "adesivo", label: "Adesivo", icon: StickyNote },
];

function formatDate(date?: string) {
  if (!date) return null;
  try { return format(new Date(date), "dd MMM", { locale: ptBR }); } catch { return null; }
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
  const { medicamentos, updateMedicamento } = useMedicamentos();
  const persons = usePersons();

  const [selectedPersonId, setSelectedPersonId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showDescontinuados, setShowDescontinuados] = useState(false);
  const [sortBy, setSortBy] = useState<"urgency" | "name" | "renewal">("urgency");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [tomandoDoseId, setTomandoDoseId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("vault_med_filtro_pessoa");
    if (saved) setSelectedPersonId(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("vault_med_filtro_pessoa", selectedPersonId);
  }, [selectedPersonId]);

  const tratamentos = useLiveQuery(() => db.tratamentos.toArray(), []) || [];

  const tratamentoMap = useMemo(() => {
    const map = new Map();
    tratamentos.forEach((t: any) => map.set(t.id, { nome: t.nome }));
    return map;
  }, [tratamentos]);

  const personMap = useMemo(() => {
    const map = new Map();
    persons.forEach((p: any) => map.set(p.id, p));
    return map;
  }, [persons]);

  const countByPerson = useMemo(() => {
    const map = new Map();
    medicamentos?.forEach((m: any) => {
      if (m.person_id && m.status !== "descontinuado") {
        map.set(m.person_id, (map.get(m.person_id) || 0) + 1);
      }
    });
    return map;
  }, [medicamentos]);

  const handleTomarAgora = useCallback(async (e: React.MouseEvent, med: any) => {
    e.stopPropagation();
    trigger("success");
    setTomandoDoseId(med.id);

    const estoqueInfo = computeEstoqueInfo(med);
    const atual = estoqueInfo?.quantidadeRestante ?? 0;
    const doseGasta = Number(med.estoque_unidade_por_dose) || 1;

    if (atual <= 0) {
      trigger("error");
      setToastMessage(`Estoque de ${med.nome} esgotado!`);
      setTomandoDoseId(null);
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const novoEstoque = Math.max(0, atual - doseGasta);

    try {
      await updateMedicamento(med.id, {
        estoque_quantidade: novoEstoque,
        estoque_data_referencia: new Date().toISOString().slice(0, 10),
      });

      const horaAtual = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      setToastMessage(`1 dose de ${med.nome} registrada às ${horaAtual}`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch {
      trigger("error");
      setToastMessage(`Erro ao registrar dose de ${med.nome}`);
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setTomandoDoseId(null);
    }
  }, [updateMedicamento, trigger]);

  const filteredAndSorted = useMemo(() => {
    if (!medicamentos) return [];

    let list = [...medicamentos];

    if (!showDescontinuados) {
      list = list.filter((m) => m.status !== "descontinuado");
    }

    if (selectedPersonId !== "all") {
      list = list.filter((m) => m.person_id === selectedPersonId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((m) => m.nome.toLowerCase().includes(q) || (m.medico && m.medico.toLowerCase().includes(q)));
    }

    return list.sort((a, b) => {
      if (sortBy === "name") {
        return a.nome.localeCompare(b.nome);
      }
      if (sortBy === "renewal") {
        const diasA = getDaysUntil(a.proxima_renovacao) ?? 9999;
        const diasB = getDaysUntil(b.proxima_renovacao) ?? 9999;
        return diasA - diasB;
      }

      const estoqueA = computeEstoqueInfo(a)?.quantidadeRestante ?? 9999;
      const estoqueB = computeEstoqueInfo(b)?.quantidadeRestante ?? 9999;
      const diasA = getDaysUntil(a.proxima_renovacao) ?? 9999;
      const diasB = getDaysUntil(b.proxima_renovacao) ?? 9999;

      const isCriticoA = estoqueA < 10;
      const isCriticoB = estoqueB < 10;

      if (isCriticoA && !isCriticoB) return -1;
      if (!isCriticoA && isCriticoB) return 1;

      return diasA - diasB;
    });
  }, [medicamentos, selectedPersonId, searchQuery, showDescontinuados, sortBy]);

  if (medicamentos === undefined) return <LoadingSkeleton />;

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28 relative">
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="fixed bottom-24 left-5 right-5 z-50 mx-auto max-w-md rounded-2xl bg-surface border border-ice/30 p-4 shadow-vault flex items-center gap-3 backdrop-blur-xl"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ice/15 text-ice">
                <Check size={20} />
              </div>
              <p className="text-sm font-semibold text-ink-primary">{toastMessage}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 header-safe-top backdrop-blur-xl space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => { trigger("vibrate"); router.back(); }} className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95"><ArrowLeft size={18} /></button>
              <div>
                <h1 className="font-display text-xl font-semibold text-ink-primary">Meus medicamentos</h1>
                <p className="text-sm text-ink-muted">{filteredAndSorted.length} ativos</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => { trigger("vibrate"); setShowDescontinuados(!showDescontinuados); }} 
                className={`flex h-11 w-11 items-center justify-center rounded-full border transition-colors ${showDescontinuados ? 'border-amber-400 bg-amber-400/10 text-amber-400' : 'border-surface-border/50 bg-surface-raised text-ink-muted'}`}
                title={showDescontinuados ? "Ocultar suspensos" : "Mostrar suspensos"}
              >
                {showDescontinuados ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
              {/* Botão de Adicionar removido (Agora vive no BottomNav) */}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
              <Input 
                placeholder="Buscar remédio ou médico..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 bg-surface-raised/60 text-sm h-11 rounded-2xl"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => { trigger("vibrate"); setSortBy(e.target.value as any); }}
              className="bg-surface-raised border border-surface-border/60 text-ink-muted text-xs font-semibold rounded-2xl px-3 h-11 outline-none"
            >
              <option value="urgency">Urgência</option>
              <option value="renewal">Renovação</option>
              <option value="name">Nome</option>
            </select>
          </div>

          {persons.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
              <button
                onClick={() => { trigger("vibrate"); setSelectedPersonId("all"); }}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all whitespace-nowrap border ${
                  selectedPersonId === "all" ? "bg-ice text-void border-transparent shadow-sm" : "bg-surface-raised text-ink-muted border-surface-border/50"
                }`}
              >
                Todos
              </button>
              {persons.map((p: any) => {
                const isSelected = selectedPersonId === p.id;
                const count = countByPerson.get(p.id) || 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => { trigger("vibrate"); setSelectedPersonId(p.id!); }}
                    className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all whitespace-nowrap border flex items-center gap-1.5 ${
                      isSelected ? "bg-ice/20 text-ice border-ice/40 shadow-sm" : "bg-surface-raised text-ink-muted border-surface-border/50"
                    }`}
                  >
                    <span>{p.name}</span>
                    <span className="rounded-full bg-void/50 px-1.5 py-0.2 text-[10px]">{count}</span>
                  </button>
                );
              })}
            </div>
          )}
        </header>

        <section className="space-y-4 px-5 pt-4">
          {filteredAndSorted.length === 0 ? (
            <div className="rounded-[28px] border border-surface-border/50 bg-surface p-10 text-center mt-10">
              <p className="font-display text-base font-semibold text-ink-primary">Nenhum medicamento encontrado</p>
              <p className="text-sm text-ink-muted mt-1">Tente mudar o filtro ou cadastre um novo medicamento.</p>
              {(searchQuery || selectedPersonId !== "all" || showDescontinuados) && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedPersonId("all");
                    setShowDescontinuados(false);
                    trigger("vibrate");
                  }}
                  className="mt-4 rounded-full bg-ice/10 px-4 py-2 text-sm font-medium text-ice border border-ice/20 active:scale-95"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          ) : (
            filteredAndSorted.map((med: any) => {
              const estoqueInfo = computeEstoqueInfo(med);
              const qtd = estoqueInfo?.quantidadeRestante ?? null;
              const person = med.person_id ? personMap.get(med.person_id) : null;
              const tIds = med.tratamento_ids || [];
              const isSuspenso = med.status === "descontinuado";
              const isControlado = med.tipo_receita === "amarela";
              
              // 🧠 Inteligência Injetada aqui
              const insight = isSuspenso ? null : sugerirRenovacao(med);
              
              const SelectedFormatIcon = FORMATOS.find(f => f.id === med.formato)?.icon || Pill;
              const color1 = med.cores?.[0] || "#60A5FA";

              return (
                <motion.button
                  key={med.id}
                  onClick={() => { trigger("vibrate"); router.push(`/saude/medicamentos/detalhes?id=${med.id}`); }}
                  className={`w-full rounded-[24px] border bg-surface p-4 text-left shadow-md hover:bg-surface-raised relative overflow-hidden transition-all ${isSuspenso ? 'opacity-60 border-coral/30' : 'border-surface-border'}`}
                  style={{ borderColor: person?.color && !isSuspenso ? `${person.color}40` : undefined }}
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-2 ${isSuspenso ? 'bg-coral' : med.tipo_receita === 'amarela' ? 'bg-amber-400' : med.tipo_receita === 'azul' ? 'bg-blue-400' : 'bg-ice/50'}`} />
                  
                  <div className="flex items-start gap-4 ml-1">
                    <div className="h-12 w-12 rounded-2xl flex items-center justify-center border border-surface-border shadow-inner shrink-0" style={{ backgroundColor: color1 + '15' }}>
                       <SelectedFormatIcon size={24} stroke={color1} strokeWidth={2.4} fill={color1 + '44'} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 overflow-hidden flex-wrap">
                        <p className="font-display text-base font-bold text-ink-primary uppercase truncate">{med.nome}</p>
                        <p className="text-[10px] font-medium text-ink-muted shrink-0 truncate">{med.dosagem}</p>
                        {person && <span className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase" style={{ backgroundColor: `${person.color || '#60A5FA'}20`, color: person.color || '#60A5FA' }}>{person.name}</span>}
                        {isControlado && <span className="shrink-0 rounded-full bg-amber-400/10 px-2 py-0.5 text-[9px] font-bold text-amber-400 border border-amber-400/20 uppercase">Controlado</span>}
                        {isSuspenso && <span className="shrink-0 rounded-full bg-coral/10 px-2 py-0.5 text-[9px] font-bold text-coral border border-coral/20 uppercase">Suspenso</span>}
                      </div>

                      <p className="text-xs font-medium text-ink-muted mt-0.5 truncate">{med.medico || "Médico não informado"}</p>

                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {tIds.map((tId: string) => {
                          const t = tratamentoMap.get(tId);
                          if (!t) return null;
                          return (
                            <span key={tId} className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide border ${getTratamentoStyle(t.nome)}`}>
                              {t.nome}
                            </span>
                          );
                        })}
                      </div>

                      {/* Alerta Inteligente Injetado no Card */}
                      {insight?.deveRenovar && (
                        <div className={`mt-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-semibold w-fit ${
                          insight.urgencia === 'alta' ? 'bg-coral/10 text-coral border-coral/20' : 'bg-amber-400/10 text-amber-400 border-amber-400/20'
                        }`}>
                          <FileWarning size={12} /> {insight.mensagem}
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-surface-border/40">
                         <div className="flex items-center gap-2">
                           <span className={`text-[11px] font-bold ${insight?.urgencia === 'alta' ? "text-coral animate-pulse" : "text-emerald-400"}`}>
                             {qtd !== null ? `${qtd} ${estoqueInfo?.unidade || 'doses'}` : 'Sem estoque'}
                           </span>
                           
                           {qtd !== null && qtd > 0 && !isSuspenso && (
                             <button
                               onClick={(e) => handleTomarAgora(e, med)}
                               disabled={tomandoDoseId === med.id}
                               className="flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-lg text-[10px] font-bold active:scale-95 transition-all disabled:opacity-50"
                               title="Tomar 1 dose agora"
                             >
                               {tomandoDoseId === med.id ? <Loader2 size={10} className="animate-spin" /> : <Zap size={10} />} Tomar
                             </button>
                           )}

                           {!isSuspenso && (
                             <button
                               onClick={(e) => {
                                 e.stopPropagation();
                                 trigger("vibrate");
                                 router.push(`/saude/renovacao/nova?medicamento_id=${med.id}`);
                               }}
                               className="flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-lg text-[10px] font-bold active:scale-95 transition-all"
                               title="Renovar receita"
                             >
                               <Calendar size={10} /> Renovar
                             </button>
                           )}
                         </div>

                         <span className="text-[11px] font-mono font-semibold text-amber-400 bg-amber-400/10 px-2 py-1 rounded-lg">
                           Renova: {formatDate(med.proxima_renovacao) || "—"}
                         </span>
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
