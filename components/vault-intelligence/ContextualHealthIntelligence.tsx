"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BrainCircuit,
  ChevronRight,
  ExternalLink,
  Sparkles,
} from "lucide-react";

import { useHealthIntelligence } from "@/hooks/useHealthIntelligence";
import type { HealthInsight } from "@/lib/health-insights";
import type { HealthInsightEntityType } from "@/lib/health-intelligence/contextual";
import { HealthInsightSheet } from "@/components/vault-intelligence/HealthInsightSheet";

type Props = {
  entityType: HealthInsightEntityType;
  entityId?: string | null;
  className?: string;
};

const ENTITY_LABEL: Record<HealthInsightEntityType, string> = {
  medicamento: "Medicamento",
  tratamento: "Tratamento",
  consulta: "Consulta",
  exame: "Exame",
  retirada: "Retirada",
  renovacao: "Renovação",
  registro: "Registro de saúde",
};

function insightTone(insight: HealthInsight) {
  if (insight.gravidadeSeguranca === "critica" || insight.urgencia === "alta") {
    return "border-coral/25 bg-coral/[0.07] text-coral";
  }
  if (insight.kind === "pattern") {
    return "border-violet-400/20 bg-violet-400/[0.06] text-violet-300";
  }
  return "border-ice/20 bg-ice/[0.05] text-ice";
}

// VAULT_CONTEXTUAL_SURFACE_V60
export function ContextualHealthIntelligence({
  entityType,
  entityId,
  className = "",
}: Props) {
  const router = useRouter();
  const { getInsightsForEntity } = useHealthIntelligence();
  const [selected, setSelected] = useState<HealthInsight | null>(null);

  const insights = useMemo(
    () => getInsightsForEntity(entityType, entityId, 3),
    [entityType, entityId, getInsightsForEntity]
  );

  if (!entityId || insights.length === 0) return null;

  const primary = insights[0];
  const entityLabel = ENTITY_LABEL[entityType];

  return (
    <>
      <section className={`mx-auto w-full max-w-2xl px-5 ${className}`} aria-label="Vault Insight">
        <div className="overflow-hidden rounded-[26px] border border-violet-400/15 bg-gradient-to-br from-violet-400/[0.07] via-surface to-ice/[0.04]">
          <div className="flex items-center justify-between gap-3 border-b border-surface-border/40 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/10 text-violet-300">
                <BrainCircuit size={15} />
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-violet-300">
                  VAULT INSIGHT · V60
                </p>
                <p className="truncate text-[10px] text-ink-faint">
                  Cérebro comportamental · {entityLabel.toLowerCase()}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1 rounded-full border border-surface-border/50 bg-void/30 px-2 py-1 font-mono text-[8px] uppercase text-ink-faint">
              <Sparkles size={10} />
              {insights.length}
            </div>
          </div>

          <button type="button" onClick={() => setSelected(primary)} className="flex w-full items-start gap-3 p-4 text-left active:scale-[0.99]">
            <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${insightTone(primary)}`}>
              {primary.urgencia === "alta" ? <AlertTriangle size={17} /> : <BrainCircuit size={17} />}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-ink-primary">{primary.titulo}</p>
              <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-ink-muted">{primary.mensagem}</p>
              <p className="mt-2 font-mono text-[8px] uppercase text-ink-faint">
                Confiança {primary.confianca} · amostra {primary.amostra}
                {insights.length > 1 ? ` · +${insights.length - 1} sinal(is)` : ""}
              </p>
            </div>

            <ChevronRight size={16} className="mt-1 shrink-0 text-ink-faint" />
          </button>

          {insights.length > 1 && (
            <div className="border-t border-surface-border/40 px-4 py-2.5">
              <div className="flex gap-2 overflow-x-auto">
                {insights.slice(1).map((insight) => (
                  <button
                    key={insight.id}
                    type="button"
                    onClick={() => setSelected(insight)}
                    className="shrink-0 rounded-full border border-surface-border/60 bg-void/30 px-3 py-1.5 text-[9px] text-ink-muted"
                  >
                    {insight.titulo}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-surface-border/40 px-4 py-2.5">
            <p className="text-[9px] text-ink-faint">
              Fontes, contexto, confiança e limitações ficam na explicação.
            </p>
            <button
              type="button"
              onClick={() => router.push("/inteligencia")}
              className="ml-3 inline-flex shrink-0 items-center gap-1 rounded-full border border-violet-400/20 bg-violet-400/[0.07] px-2.5 py-1 text-[9px] font-semibold text-violet-300 active:scale-95"
            >
              Central
              <ExternalLink size={10} />
            </button>
          </div>
        </div>
      </section>

      <HealthInsightSheet
        insight={selected}
        onClose={() => setSelected(null)}
        onNavigate={(href) => {
          setSelected(null);
          router.push(href);
        }}
      />
    </>
  );
}
