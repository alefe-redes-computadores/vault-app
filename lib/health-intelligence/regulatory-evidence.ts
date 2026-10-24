import type { HealthInsight } from "@/lib/health-insights";

export type RegulatorySource = NonNullable<HealthInsight["fontesExternas"]>[number];
export type RegulatoryFreshness = "current" | "review_due" | "invalid";

export const BRAZIL_REGULATORY_AUTHORITIES = {
  bulario: {
    titulo: "Bulário Eletrônico — bulas vigentes",
    autoridade: "Anvisa",
    url: "https://www.gov.br/anvisa/pt-br/sistemas/bulario-eletronico",
    revisadoEm: "2026-10-24",
  },
  controlledPrescriptions: {
    titulo: "SNCR — modelos vigentes de receituário físico",
    autoridade: "Anvisa",
    url: "https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/controlados/sncr/receituario-fisico",
    revisadoEm: "2026-10-24",
  },
  farmaciaPopular: {
    titulo: "Programa Farmácia Popular — documentos para acesso",
    autoridade: "Ministério da Saúde",
    url: "https://www.gov.br/saude/pt-br/composicao/sectics/farmacia-popular",
    revisadoEm: "2026-10-24",
  },
} as const satisfies Record<string, RegulatorySource>;

const DAY = 86400000;
export function regulatorySourceFreshness(source: RegulatorySource, now = new Date()): RegulatoryFreshness {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(source.revisadoEm)) return "invalid";
  const reviewed = Date.parse(`${source.revisadoEm}T12:00:00Z`);
  if (!Number.isFinite(reviewed) || reviewed > now.getTime() + DAY) return "invalid";
  return now.getTime() - reviewed > 180 * DAY ? "review_due" : "current";
}

export function summarizeRegulatorySources(sources: readonly RegulatorySource[], now = new Date()) {
  const unique = [...new Map(sources.filter(source => /^https:\/\//.test(source.url)).map(source => [source.url, source])).values()];
  const freshness = unique.map(source => ({ source, freshness: regulatorySourceFreshness(source, now) }));
  return {
    sources: freshness,
    current: freshness.filter(item => item.freshness === "current").length,
    reviewDue: freshness.filter(item => item.freshness === "review_due").length,
    invalid: freshness.filter(item => item.freshness === "invalid").length,
  };
}

export function hasCurrentRegulatorySource(sources: readonly RegulatorySource[] | undefined, now = new Date()): boolean {
  return summarizeRegulatorySources(sources ?? [], now).current > 0;
}
