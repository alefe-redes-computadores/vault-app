// app/saude/medicamentos/page.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Droplet,
  Syringe,
  StickyNote,
  Calendar,
  Zap,
  EyeOff,
  Eye,
  Store,
  Building2,
  Stethoscope,
  Pill,
  AlertTriangle,
  Info,
  Circle,
  CheckCircle2,
  Sun,
  Moon
} from "lucide-react";

import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useDoseLogs } from "@/hooks/useDoseLogs";
import { usePersons } from "@/hooks/usePersons";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { useHapticFeedback } from "@/lib/haptics";
import { useToast } from "@/components/ToastProvider";
import { PageTransition } from "@/components/PageTransition";
import { CardListSkeleton } from "@/components/loading/CardListSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Person } from "@/lib/types";
import { QuickDoseModal } from "@/components/saude/QuickDoseModal";

import { processarListaMedicamentos, ProcessedMed } from "@/lib/health-insights";

// Nossos componentes modulares
import {
  ListPageHeader,
  ListSearch,
  ListFilters,
  ListCard,
} from "@/components/list";
import { DailyProgress } from "@/components/saude/DailyProgress";

function getMedicamentoIconComponent(formato?: string) {
  const f = (formato || "").toLowerCase().trim();
  if (f.includes("gota")) return Droplet;
  if (f.includes("injecao") || f.includes("injeção")) return Syringe;
  if (f.includes("adesivo")) return StickyNote;
  if (f.includes("partido") || f.includes("comprimido") || f.includes("inteiro")) return Circle;
  return Pill; 
}

// Subcomponente local para renderizar os títulos das seções
const SectionTitle = ({ icon: Icon, title }: { icon: any; title: string }) => (
  <div className="mb-2 mt-6 flex items-center gap-2 pl-2 opacity-80">
    <Icon size={16} className="text-ink-muted" />
    <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted">{title}</h2>
  </div>
);

export default function MedicamentosListPage() {
  const router = useRouter();
  const { trigger } = useHapticFeedback();
  const { showToast } = useToast();

  const { medicamentos: medicamentosTodas } = useMedicamentos();
  const { activePersonId } = useActivePersonId();
  const persons = usePersons() as Person[];

  const hojeString = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const { doseLogs } = useDoseLogs(hojeString);

  const [searchQuery, setSearchQuery] = useState("");
  const [showDescontinuados, setShowDescontinuados] = useState(false);
  const [quickDoseMedId, setQuickDoseMedId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedSuspended = localStorage.getItem("@vault:meds_showSuspended");
      if (savedSuspended) setShowDescontinuados(savedSuspended === "true");
    }
  }, []);

  const medicamentosDaPessoa = useMemo(() => {
    if (!activePersonId) return [];
    return (medicamentosTodas || []).filter((m) => m.person_id === activePersonId);
  }, [medicamentosTodas, activePersonId]);

  const listaProcessada = useMemo(() => {
    let processados = processarListaMedicamentos(medicamentosDaPessoa, doseLogs || []);
    
    if (!showDescontinuados) {
      processados = processados.filter(p => !p.isSuspenso);
    }
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      processados = processados.filter(p => 
        (p.med.nome?.toLowerCase() || "").includes(q) || 
        (p.med.medico?.toLowerCase() || "").includes(q)
      );
    }
    return processados;
  }, [medicamentosDaPessoa, doseLogs, showDescontinuados, searchQuery]);

  // Cálculos para a Barra de Progresso (Ignora SOS e Suspensos)
  const statsProgresso = useMemo(() => {
    const continuos = listaProcessada.filter(p => !p.isSOS && !p.isSuspenso);
    return {
      total: continuos.length,
      completados: continuos.filter(p => p.foiTomadoHoje).length
    };
  }, [listaProcessada]);

  // Agrupamento por Turnos
  const { medsManha, medsTardeNoite, medsSOS, medsSuspensos } = useMemo(() => {
    const manha: ProcessedMed[] = [];
    const tardeNoite: ProcessedMed[] = [];
    const sos: ProcessedMed[] = [];
    const suspensos: ProcessedMed[] = [];

    listaProcessada.forEach(item => {
      if (item.isSuspenso) {
        suspensos.push(item);
        return;
      }
      if (item.isSOS) {
        sos.push(item);
        return;
      }
      
      // Define o turno baseado no primeiro horário cadastrado (ou assume manhã se vazio)
      const primeiroHorario = item.med.estoque_horarios?.[0] || "08:00";
      const hora = parseInt(primeiroHorario.split(":")[0], 10);
      
      if (hora < 12) {
        manha.push(item);
      } else {
        tardeNoite.push(item);
      }
    });

    return { medsManha: manha, medsTardeNoite: tardeNoite, medsSOS: sos, medsSuspensos: suspensos };
  }, [listaProcessada]);

  useEffect(() => {
    if (listaProcessada.length > 0) {
      const pendentesContínuos = listaProcessada.filter(p => !p.isSOS && !p.isSuspenso && !p.foiTomadoHoje).length;
      if (pendentesContínuos > 0) {
        showToast(`Você tem ${pendentesContínuos} dose(s) contínua(s) pendente(s) hoje.`, "info");
      }
    }
  }, [listaProcessada.length]);

  const handleToggleSuspensos = () => {
    trigger("vibrate");
    setShowDescontinuados((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") localStorage.setItem("@vault:meds_showSuspended", String(next));
      return next;
    });
  };

  // Função auxiliar para renderizar um card individual
  const renderCard = (item: ProcessedMed, index: number) => {
    const { med, isSOS, isSuspenso, foiTomadoHoje, horarioTomado, insight, receita, textoEstoque, isEstoqueZerado, isEstoqueCritico } = item;
    const formatoBanco = med.formato?.toLowerCase().trim() || "comprimido";
    const SelectedFormatIcon = getMedicamentoIconComponent(formatoBanco);
    const isCustomIcon = ["comprimido", "partido", "capsula", "cápsula", "inteiro"].some(val => formatoBanco.includes(val));
    
    const cor1 = med.cores && med.cores.length > 0 ? med.cores[0] : "#60A5FA";
    const hasTwoColors = med.cores && med.cores.length > 1 && isCustomIcon;
    const fillValue = hasTwoColors ? `url(#grad-${med.id})` : (isCustomIcon ? cor1 : "none");
    const strokeValue = isCustomIcon ? "none" : cor1;

    const cardColor = isSuspenso ? "#fb7185" : (receita?.corBorda || cor1);

    return (
      <ListCard
        key={med.id!}
        id={med.id!}
        color={cardColor}
        onClick={() => { trigger("vibrate"); router.push(`/saude/medicamentos/detalhes?id=${med.id}`); }}
        isDisabled={isSuspenso}
        icon={<SelectedFormatIcon size={24} fill={fillValue} stroke={strokeValue} />}
      >
        <div className="flex flex-col h-full min-h-[96px]">
          {/* LINHA 1 */}
          <div className="flex min-w-0 items-center justify-between gap-2">
            <div className="flex items-baseline gap-2 min-w-0 flex-1">
              <h3 className="truncate font-display text-base font-bold uppercase text-ink-primary">{med.nome}</h3>
              {med.dosagem && <span className="shrink-0 text-xs font-semibold text-ink-muted">{med.dosagem}</span>}
            </div>
            {insight?.deveRenovar && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); trigger("light"); showToast(insight.mensagem, insight.urgencia === "alta" ? "error" : "info"); }}
                className={`flex shrink-0 items-center justify-center rounded-full w-6 h-6 transition-all active:scale-90 ${insight.urgencia === "alta" ? "bg-coral/15 text-coral" : "bg-amber-400/15 text-amber-500"}`}
              >
                <AlertTriangle size={14} />
              </button>
            )}
          </div>

          {/* LINHA 2 */}
          <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[10px] text-ink-muted">
            {receita && (
              <button onClick={(e) => { e.stopPropagation(); trigger("light"); showToast(receita.tooltip, "info"); }} className={`flex items-center gap-0.5 font-bold uppercase transition-transform active:scale-95 ${receita.textColorClass}`}>
                {receita.sigla} <Info size={10} className="opacity-70" />
              </button>
            )}
            {receita && (med.medico || med.farmacia) && <span className="text-surface-border/60">•</span>}
            {med.medico && (
              <span className="flex items-center gap-1 truncate max-w-[90px]">
                <Stethoscope size={10} className="shrink-0 opacity-50" />
                <span className="truncate">{med.medico}</span>
              </span>
            )}
            <span className="text-surface-border/60">•</span>
            <span className={`font-bold ${isEstoqueZerado ? "text-coral" : isEstoqueCritico ? "text-amber-400" : "text-emerald-400"}`}>
              Estoque: {textoEstoque}
            </span>
          </div>

          {/* LINHA 3 */}
          <div className="mt-auto pt-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {isSOS && <span className="flex items-center gap-0.5 rounded-md bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-400"><Zap size={8} fill="currentColor" /> SOS</span>}
              {!isSuspenso && (
                foiTomadoHoje ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500">
                    <CheckCircle2 size={12} /> Tomado {horarioTomado ? `às ${horarioTomado}` : 'hoje'}
                  </span>
                ) : (
                  !isEstoqueZerado && (
                    <button type="button" onClick={(e) => { e.stopPropagation(); trigger("vibrate"); setQuickDoseMedId(med.id!); }} className="flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-400 active:scale-95 transition-transform">
                      <Zap size={10} fill="currentColor" /> Tomar
                    </button>
                  )
                )
              )}
            </div>
            {!isSuspenso && insight.deveRenovar && (
              <button type="button" onClick={(e) => { e.stopPropagation(); trigger("vibrate"); router.push(`/saude/renovacao/nova?medicamento_id=${med.id}`); }} className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[10px] font-bold transition-transform active:scale-95 ${insight.urgencia === "alta" ? "border-coral/30 bg-coral/10 text-coral" : "border-amber-400/30 bg-amber-400/10 text-amber-500"}`}>
                <Calendar size={10} /> Renovar
              </button>
            )}
          </div>
        </div>
      </ListCard>
    );
  };

  if (medicamentosTodas === undefined || doseLogs === undefined) return <CardListSkeleton />;

  return (
    <PageTransition>
      <main className="relative min-h-screen bg-void pb-28">
        
        <svg width="0" height="0" className="absolute">
          <defs>
            {listaProcessada.map(({ med }) => {
              if (med.cores && med.cores.length > 1) {
                return (
                  <linearGradient key={`grad-${med.id}`} id={`grad-${med.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="50%" stopColor={med.cores[0]} />
                    <stop offset="50%" stopColor={med.cores[1]} />
                  </linearGradient>
                );
              }
              return null;
            })}
          </defs>
        </svg>

        <ListPageHeader
          title="Meus medicamentos"
          subtitle={`${listaProcessada.length} ${listaProcessada.length === 1 ? "ativo" : "ativos"}`}
          rightAction={
            <button
              type="button"
              onClick={handleToggleSuspensos}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-all active:scale-95 ${
                showDescontinuados ? "border-amber-400/50 bg-amber-400/10 text-amber-400" : "border-surface-border/50 bg-surface-raised text-ink-muted"
              }`}
            >
              {showDescontinuados ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
          }
        >
          <div className="flex items-center gap-2 w-full">
            <ListSearch value={searchQuery} onChange={setSearchQuery} placeholder="Buscar remédio ou médico..." />
          </div>
          <ListFilters onClear={showDescontinuados ? () => { setShowDescontinuados(false); trigger("vibrate"); } : undefined} clearLabel="Limpar">{null}</ListFilters>
        </ListPageHeader>

        <section className="px-5 pt-4">
          <DailyProgress total={statsProgresso.total} completed={statsProgresso.completados} />

          {listaProcessada.length === 0 ? (
            <EmptyState icon={Pill} title="Nenhum medicamento encontrado" description="Busca vazia ou nenhum cadastro." actionLabel={searchQuery ? "Limpar" : undefined} onAction={searchQuery ? () => setSearchQuery("") : undefined} />
          ) : (
            <div className="space-y-3.5 pb-8">
              {medsManha.length > 0 && (
                <>
                  <SectionTitle icon={Sun} title="Manhã" />
                  {medsManha.map((item, index) => renderCard(item, index))}
                </>
              )}
              
              {medsTardeNoite.length > 0 && (
                <>
                  <SectionTitle icon={Moon} title="Tarde / Noite" />
                  {medsTardeNoite.map((item, index) => renderCard(item, index))}
                </>
              )}

              {medsSOS.length > 0 && (
                <>
                  <SectionTitle icon={Zap} title="Uso Esporádico (SOS)" />
                  {medsSOS.map((item, index) => renderCard(item, index))}
                </>
              )}

              {medsSuspensos.length > 0 && (
                <>
                  <SectionTitle icon={EyeOff} title="Suspensos" />
                  {medsSuspensos.map((item, index) => renderCard(item, index))}
                </>
              )}
            </div>
          )}
        </section>

        <QuickDoseModal isOpen={!!quickDoseMedId} onClose={() => setQuickDoseMedId(null)} preselectedMedicamentoId={quickDoseMedId || undefined} onSuccess={() => { if (typeof window !== "undefined") window.dispatchEvent(new Event("sync:process")); }} />
      </main>
    </PageTransition>
  );
}
