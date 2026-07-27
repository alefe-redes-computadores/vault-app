import type { Document, Medicamento, TipoReceita } from "@/lib/types";

export type AlertLevel = "vencido" | "urgente" | "atencao" | "ok";

export interface HealthAlert {
  id: string;
  kind: "medicamento" | "documento" | "consulta";
  title: string;
  subtitle: string;
  date: string;
  daysUntil: number;
  level: AlertLevel;
  href: string;
  tipoReceita?: TipoReceita;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Janelas de alerta padrão (receita comum)
const URGENTE_DIAS = 5;
const ATENCAO_DIAS = 15;

// Janelas mais rigorosas para qualquer receita controlada (amarela/azul/branca) —
// tem validade curta e é mais difícil de renovar em cima da hora.
const URGENTE_DIAS_CONTROLADA = 7;
const ATENCAO_DIAS_CONTROLADA = 18;

// Validade padrão de cada cor de receita, em dias, usada só pra SUGERIR
// a "próxima renovação" no formulário — o usuário pode sempre ajustar.
export const VALIDADE_RECEITA_DIAS: Record<TipoReceita, number | null> = {
  comum: null,
  amarela: 30,
  azul: 60,
  branca: 60,
};

export const TIPO_RECEITA_LABELS: Record<TipoReceita, string> = {
  comum: "Comum",
  amarela: "Amarela",
  azul: "Azul",
  branca: "Branca controlada",
};

export function isControlada(tipo?: TipoReceita): boolean {
  return !!tipo && tipo !== "comum";
}

export function getDaysUntil(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / DAY_MS);
}

export function getAlertLevel(
  daysUntil: number | null,
  controlada: boolean = false
): AlertLevel {
  if (daysUntil === null) return "ok";
  if (daysUntil < 0) return "vencido";
  const urgenteLimite = controlada ? URGENTE_DIAS_CONTROLADA : URGENTE_DIAS;
  const atencaoLimite = controlada ? ATENCAO_DIAS_CONTROLADA : ATENCAO_DIAS;
  if (daysUntil <= urgenteLimite) return "urgente";
  if (daysUntil <= atencaoLimite) return "atencao";
  return "ok";
}

/**
 * Sugere a data de próxima renovação com base na cor da receita.
 * Amarela = +30 dias, Azul/Branca controlada = +60 dias, Comum = sem sugestão.
 */
export function suggestRenewalDate(dataReceita: string, tipo: TipoReceita): string {
  const dias = VALIDADE_RECEITA_DIAS[tipo];
  if (!dias) return "";
  const date = new Date(dataReceita);
  if (isNaN(date.getTime())) return "";
  date.setDate(date.getDate() + dias);
  return date.toISOString().slice(0, 10);
}

/**
 * Alertas de medicamento — baseado em `proxima_renovacao`.
 * Qualquer receita controlada (amarela/azul/branca) usa janelas mais rigorosas.
 */
export function getMedicamentoAlerts(medicamentos: Medicamento[]): HealthAlert[] {
  return medicamentos
    .filter((med) => !!med.id)
    .map((med) => {
      const controlada = isControlada(med.tipo_receita);
      const daysUntil = getDaysUntil(med.proxima_renovacao);
      return {
        id: med.id!,
        kind: "medicamento" as const,
        title: med.nome,
        subtitle: `${med.dosagem} · Dr(a). ${med.medico}`,
        date: med.proxima_renovacao,
        daysUntil: daysUntil ?? 999,
        level: getAlertLevel(daysUntil, controlada),
        href: `/saude/medicamentos/editar?id=${med.id}`,
        tipoReceita: med.tipo_receita,
      };
    })
    .filter((a) => a.level !== "ok")
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

/**
 * Alertas de documentos da categoria Saúde (receitas, RG de convênio etc.)
 * que tenham `expiry_date` ou `renewal_date` no metadata.
 */
export function getDocumentAlerts(documents: Document[]): HealthAlert[] {
  return documents
    .filter((doc) => doc.category_id === "saude" && !!doc.id)
    .map((doc) => {
      const expiry = doc.metadata?.expiry_date || doc.metadata?.renewal_date;
      const daysUntil = getDaysUntil(expiry);
      return {
        id: doc.id!,
        kind: "documento" as const,
        title: doc.title,
        subtitle: doc.type === "receita" ? "Receita" : doc.type,
        date: expiry || "",
        daysUntil: daysUntil ?? 999,
        level: getAlertLevel(daysUntil),
        href: `/detalhes?id=${doc.id}`,
      };
    })
    .filter((a) => a.date && a.level !== "ok")
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

/**
 * Consultas/exames próximos — usa a data de documentos do tipo
 * prontuario/laudo/encaminhamento que caiam nos próximos 30 dias.
 */
export function getUpcomingAppointments(documents: Document[]): HealthAlert[] {
  const relevantTypes = ["prontuario", "laudo", "encaminhamento"];
  return documents
    .filter(
      (doc) =>
        doc.category_id === "saude" && !!doc.id && relevantTypes.includes(doc.type)
    )
    .map((doc) => {
      const date = doc.metadata?.date;
      const daysUntil = getDaysUntil(date);
      return {
        id: doc.id!,
        kind: "consulta" as const,
        title: doc.title,
        subtitle: doc.metadata?.specialty || doc.metadata?.hospital || doc.type,
        date: date || "",
        daysUntil: daysUntil ?? -999,
        level: "ok" as AlertLevel,
        href: `/detalhes?id=${doc.id}`,
      };
    })
    .filter((a) => a.date && a.daysUntil >= 0 && a.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

export function alertLevelColor(level: AlertLevel): string {
  switch (level) {
    case "vencido":
      return "#F87171";
    case "urgente":
      return "#FB923C";
    case "atencao":
      return "#FBBF24";
    default:
      return "#7C9CB5";
  }
}

export function alertLevelLabel(level: AlertLevel, daysUntil: number): string {
  if (level === "vencido") {
    const dias = Math.abs(daysUntil);
    return `Vencido há ${dias} dia${dias !== 1 ? "s" : ""}`;
  }
  if (daysUntil === 0) return "Vence hoje";
  return `Vence em ${daysUntil} dia${daysUntil !== 1 ? "s" : ""}`;
}
