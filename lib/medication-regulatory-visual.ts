import type { Medicamento, TipoReceita } from "@/lib/types";
import type { MedicationReference, MedicationRegulatoryPrescriptionModelCode } from "@/lib/medication-intelligence/types";
import { isMedicationRegulatoryRuleActive } from "@/lib/medication-catalog/regulatory";

export type MedicationRegulatoryTone = "neutral" | "red" | "black" | "yellow" | "unknown";

export type MedicationRegulatoryVisual = {
  tone: MedicationRegulatoryTone;
  label: string;
  detail: string;
  verified: boolean;
  sourceLabel?: string;
  accent: string;
  badgeClass: string;
};

const UNKNOWN: MedicationRegulatoryVisual = {
  tone: "unknown",
  label: "Classificação não confirmada",
  detail: "O catálogo não forneceu evidência suficiente para esta apresentação.",
  verified: false,
  accent: "#64748b",
  badgeClass: "border-slate-500/30 bg-slate-500/10 text-slate-300",
};

function visualForModel(code?: MedicationRegulatoryPrescriptionModelCode, model?: string): MedicationRegulatoryVisual | null {
  const source = "Catálogo regulatório";
  switch (code) {
    case "notificacao_b":
      return { tone: "black", label: "Notificação B", detail: model || "Receituário de controle especial", verified: true, sourceLabel: source, accent: "#94a3b8", badgeClass: "border-white/25 bg-black text-white" };
    case "notificacao_b2":
      return { tone: "black", label: "Notificação B2", detail: model || "Receituário de controle especial", verified: true, sourceLabel: source, accent: "#94a3b8", badgeClass: "border-white/25 bg-black text-white" };
    case "notificacao_a":
      return { tone: "yellow", label: "Notificação A", detail: model || "Receituário de controle especial", verified: true, sourceLabel: source, accent: "#facc15", badgeClass: "border-yellow-400/35 bg-yellow-400/10 text-yellow-300" };
    case "notificacao_retinoides":
      return { tone: "red", label: "Notificação especial", detail: model || "Retinoides de uso sistêmico", verified: true, sourceLabel: source, accent: "#fb7185", badgeClass: "border-rose-400/35 bg-rose-400/10 text-rose-300" };
    case "notificacao_talidomida":
      return { tone: "red", label: "Notificação especial", detail: model || "Talidomida", verified: true, sourceLabel: source, accent: "#fb7185", badgeClass: "border-rose-400/35 bg-rose-400/10 text-rose-300" };
    case "receita_controle_especial":
      return { tone: "red", label: "Controle especial", detail: model || "Receita de controle especial", verified: true, sourceLabel: source, accent: "#f87171", badgeClass: "border-red-400/35 bg-red-400/10 text-red-300" };
    case "receita_comum":
      return { tone: "neutral", label: "Receita comum", detail: model || "Venda sob prescrição", verified: true, sourceLabel: source, accent: "#cbd5e1", badgeClass: "border-slate-300/25 bg-slate-300/10 text-slate-200" };
    default:
      return null;
  }
}

function visualForLegacy(type?: TipoReceita): MedicationRegulatoryVisual {
  if (!type || type === "comum") return UNKNOWN;
  const values: Record<Exclude<TipoReceita, "comum">, MedicationRegulatoryVisual> = {
    amarela: { tone: "yellow", label: "Receita amarela", detail: "Informação registrada manualmente; confira o documento.", verified: false, accent: "#facc15", badgeClass: "border-yellow-400/30 bg-yellow-400/10 text-yellow-300" },
    azul: { tone: "black", label: "Receita azul", detail: "Informação registrada manualmente; não confirma sozinha a tarja da embalagem.", verified: false, accent: "#94a3b8", badgeClass: "border-white/20 bg-black text-white" },
    branca: { tone: "red", label: "Controle especial", detail: "Informação registrada manualmente; confira o documento.", verified: false, accent: "#f87171", badgeClass: "border-red-400/30 bg-red-400/10 text-red-300" },
  };
  return values[type];
}

export function resolveMedicationRegulatoryVisual(medication: Medicamento, reference?: MedicationReference | null, at = new Date()): MedicationRegulatoryVisual {
  const rules = (reference?.regulatoryRules || []).filter((rule) => isMedicationRegulatoryRuleActive(rule, at));
  if (rules.length) {
    const safeRules = rules.filter((rule) => !rule.hasMalformedExceptions && (rule.exceptions?.length || 0) === 0);
    const visuals = safeRules.map((rule) => visualForModel(rule.prescriptionModelCode, rule.prescriptionModel)).filter((item): item is MedicationRegulatoryVisual => Boolean(item));
    const unique = new Map(visuals.map((item) => [`${item.tone}:${item.label}`, item]));
    if (unique.size === 1) {
      const visual = [...unique.values()][0];
      const sourceLabel = rules.flatMap((rule) => rule.sources || []).map((source) => source.label).filter(Boolean)[0];
      return { ...visual, sourceLabel: sourceLabel || visual.sourceLabel };
    }
    return UNKNOWN;
  }
  return visualForLegacy(medication.tipo_receita);
}
