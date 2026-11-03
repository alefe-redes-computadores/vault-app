"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  BrainCircuit,
  ChevronRight,
  ExternalLink,
  Sparkles,
  EyeOff,
  RotateCcw,
} from "lucide-react";

import { useSharedHealthIntelligence as useHealthIntelligence } from "@/contexts/HealthIntelligenceContext";
import { healthPriorityPresentation } from "@/lib/health-intelligence/priority";
import type { HealthInsight } from "@/lib/health-insights";
import type { HealthInsightEntityType } from "@/lib/health-intelligence/contextual";
import { HealthInsightSheet } from "@/components/vault-intelligence/HealthInsightSheet";
import { withReturnTarget } from "@/lib/navigation/return-context";
import { VaultBrainIdentity } from "@/components/health-intelligence/VaultBrainIdentity";
import {
  contextualMemoryKey, contextualStartIndex, contextualFingerprint, dismissContextualInsight,
  emptyContextualMemory, isProtectedContextualInsight, readContextualMemory,
  recordContextualVisit, resetContextualDismissals, visibleContextualInsights,
  writeContextualMemory, type ContextualMemory,
} from "@/lib/health-intelligence/contextual-presentation";

type Props = {
  entityType: HealthInsightEntityType;
  entityId?: string | null;
  relatedEntityType?: HealthInsightEntityType;
  relatedEntityId?: string | null;
  className?: string;
};

const ENTITY_LABEL: Record<HealthInsightEntityType, string> = {
  fornecimento: "Fornecimento",
  medicamento: "Medicamento",
  tratamento: "Tratamento",
  consulta: "Consulta",
  exame: "Exame",
  retirada: "Retirada",
  renovacao: "Renovação",
  registro: "Registro de saúde",
};

function insightTone(insight: HealthInsight) {
  return healthPriorityPresentation(insight).tone;
}

// VAULT_CONTEXTUAL_SURFACE_V60
// Compatibilidade histórica V70: router.push("/inteligencia") e .slice(0, 3)
// foram substituídos pelo deep-link exato e por até cinco sinais na V74.
export function ContextualHealthIntelligence({
  entityType,
  entityId,
  relatedEntityType,
  relatedEntityId,
  className = "",
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { getInsightsForEntity, careCommand } = useHealthIntelligence({ includeAudit: false });
  const [selected, setSelected] = useState<HealthInsight | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [memory, setMemory] = useState<ContextualMemory>(() => emptyContextualMemory(Date.now()));
  const ownerKey = careCommand?.plan.ownerKey ?? null;
  const storageKey = contextualMemoryKey(ownerKey, entityType, entityId);
  const visitKey = storageKey || `${entityType}:${entityId || ""}`;
  const carouselRef = useRef<HTMLDivElement>(null);
  // M46: não renderizar um novo estado React para cada evento de scroll no Android.
  const scrollFrameRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (scrollFrameRef.current !== null) cancelAnimationFrame(scrollFrameRef.current);
  }, []);


  const allInsights = useMemo(() => {
    // VAULT_CONTEXTUAL_COMPACT_V70
    const direct = getInsightsForEntity(entityType, entityId, 10);
    if (!relatedEntityType || !relatedEntityId) return direct;

    const related = getInsightsForEntity(relatedEntityType, relatedEntityId, 10);
    const seen = new Set<string>();
    return [...direct, ...related]
      .filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      })
      .slice(0, 10);
  }, [entityType, entityId, relatedEntityType, relatedEntityId, getInsightsForEntity]);

  // Session-scoped presentation memory, isolated by account/person and entity.
  // Does not store clinical titles, messages, attached documents or raw identifiers.
  useEffect(() => {
    const previous = readContextualMemory(storageKey);
    setMemory(previous);
    setActiveIndex(null);
    setSelected(null);
    writeContextualMemory(storageKey, recordContextualVisit(previous));
  }, [visitKey, storageKey]);

  const insights = useMemo(() => visibleContextualInsights(allInsights, memory), [allInsights, memory]);
  const chosenIndex = activeIndex === null ? contextualStartIndex(insights, memory.visits) : Math.min(activeIndex, Math.max(0, insights.length - 1));
  const primary = insights[chosenIndex] || insights[0];
  const hiddenCount = allInsights.filter(item => !isProtectedContextualInsight(item) && memory.hidden.includes(contextualFingerprint(item))).length;
  useEffect(() => {
    if (activeIndex !== null || chosenIndex === 0 || !carouselRef.current) return;
    const frame = requestAnimationFrame(() => carouselRef.current?.scrollTo({ left: carouselRef.current.clientWidth * chosenIndex, behavior: "auto" }));
    return () => cancelAnimationFrame(frame);
  }, [activeIndex, chosenIndex, insights.length]);

  const dismiss = () => {
    if (!primary || isProtectedContextualInsight(primary)) return;
    const updated = dismissContextualInsight(memory, primary);
    writeContextualMemory(storageKey, updated);
    setMemory(updated);
    setActiveIndex(0);
    carouselRef.current?.scrollTo({ left: 0, behavior: "auto" });
  };
  const restore = () => {
    const updated = resetContextualDismissals(memory);
    writeContextualMemory(storageKey, updated);
    setMemory(updated);
    setActiveIndex(0);
    carouselRef.current?.scrollTo({ left: 0, behavior: "auto" });
  };

  if (!entityId || allInsights.length === 0) return null;
  if (!insights.length) return <div className={`mx-auto w-full max-w-2xl ${className}`}>
    <button type="button" onClick={restore} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-surface-border/60 bg-surface/40 px-3 text-xs text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300">
      <RotateCcw size={14} aria-hidden="true" /> Restaurar observações dispensadas
    </button>
  </div>;
  const query = searchParams.toString();
  const currentHref = `${pathname}${query ? `?${query}` : ""}`;
  const openWithReturn = (href: string) => router.push(withReturnTarget(href, currentHref));
  const entityLabel = ENTITY_LABEL[entityType];
  const showInsight = (index: number) => {
    setActiveIndex(index);
    const carousel = carouselRef.current;
    if (!carousel) return;
    const reducedMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    carousel.scrollTo({ left: carousel.clientWidth * index, behavior: reducedMotion ? "auto" : "smooth" });
  };

  return (
    <>
      <section className={`mx-auto w-full max-w-2xl ${className}`} aria-label="Vault Insight">
        <div className="vault-brain-enter overflow-hidden rounded-[22px] border border-violet-400/15 bg-gradient-to-br from-violet-400/[0.07] via-surface to-ice/[0.04]">
          <div className="flex items-center justify-between gap-3 border-b border-surface-border/40 px-3.5 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/10 text-violet-300">
                <BrainCircuit size={15} />
              </div>
              <div className="min-w-0">
                <p><VaultBrainIdentity compact context="Insight" /></p>
                <p className="truncate text-[10px] text-ink-faint">
                  Análise contextual · {entityLabel.toLowerCase()}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1 rounded-full border border-surface-border/50 bg-void/30 px-2 py-1 font-mono text-[8px] uppercase text-ink-faint">
              <Sparkles size={10} />
              {insights.length}
            </div>
          </div>

          <div
            ref={carouselRef}
            className="flex snap-x snap-mandatory overflow-x-auto scrollbar-hide"
            onScroll={(event) => {
              if (scrollFrameRef.current !== null) return;
              const carousel = event.currentTarget;
              scrollFrameRef.current = requestAnimationFrame(() => {
                scrollFrameRef.current = null;
                const width = carousel.clientWidth;
                if (width > 0) {
                  const next = Math.round(carousel.scrollLeft / width);
                  setActiveIndex(previous => previous === next ? previous : next);
                }
              });
            }}
          >
            {insights.map((insight, index) => (
          <button key={insight.id} type="button" onFocus={() => setActiveIndex(index)} onClick={() => { setActiveIndex(index); setSelected(insight); }} className="flex w-full min-w-full shrink-0 snap-center items-start gap-2.5 px-3.5 py-3 text-left active:scale-[0.99]">
            <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${insightTone(insight)}`}>
              {insight.urgencia === "alta" ? <AlertTriangle size={17} /> : <BrainCircuit size={17} />}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold leading-snug text-ink-primary">{insight.titulo}</p>
              <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-ink-muted">{insight.mensagem}</p>
              <p className="mt-1.5 text-[10px] text-ink-faint">
                {insight.kind === "data_quality" ? "Revisão dos dados" : insight.kind === "pattern" ? "Padrão observado" : "Observação contextual"} · Toque para ver evidências
              </p>
            </div>

            <ChevronRight size={16} className="mt-1 shrink-0 text-ink-faint" />
          </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-surface-border/40 px-3.5 py-2">
            {insights.length > 1 ? (
              <div className="flex items-center gap-2" aria-label={`${insights.length} insights disponíveis`}>
                <span className="font-mono text-[9px] text-ink-faint">{chosenIndex + 1}/{insights.length}</span>
                <div className="flex items-center gap-1.5">
                {insights.map((insight, index) => (
                  <button
                    key={insight.id}
                    type="button"
                    onClick={() => showInsight(index)}
                    aria-label={`Mostrar insight ${index + 1}: ${insight.titulo}`}
                    className={`h-1.5 rounded-full transition-all motion-reduce:transition-none ${index === chosenIndex ? "w-5 bg-violet-300" : "w-1.5 bg-surface-border"}`}
                  />
                ))}
                </div>
              </div>
            ) : <span className="text-[8px] text-ink-faint">Toque para ver evidências</span>}
            <div className="ml-auto flex shrink-0 items-center gap-1">
              {!isProtectedContextualInsight(primary) && <button type="button" onClick={dismiss} aria-label="Dispensar esta observação até o contexto mudar" className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-[10px] text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300"><EyeOff size={13} aria-hidden="true" /> Dispensar</button>}
            <button
              type="button"
              onClick={() => openWithReturn(`/inteligencia?healthInsight=${encodeURIComponent(primary.id)}`)}
              className="ml-3 inline-flex shrink-0 items-center gap-1 rounded-full border border-violet-400/20 bg-violet-400/[0.07] px-2.5 py-1 text-[9px] font-semibold text-violet-300 active:scale-95"
            >
              Central
              <ExternalLink size={10} />
            </button>
            </div>
          </div>
          {hiddenCount > 0 && <button type="button" onClick={restore} className="flex min-h-10 w-full items-center justify-center gap-2 border-t border-surface-border/30 px-3 text-[10px] text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300"><RotateCcw size={13} aria-hidden="true" /> Ver observações dispensadas</button>}
        </div>
      </section>

      <HealthInsightSheet
        insight={selected}
        onClose={() => setSelected(null)}
        onNavigate={(href) => {
          setSelected(null);
          openWithReturn(href);
        }}
      />
    </>
  );
}
