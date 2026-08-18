import type { Document, Medicamento, TipoReceita } from "@/lib/types";

export type AlertLevel = "vencido" | "urgente" | "atencao" | "ok";

export interface HealthAlert {
  id: string;
  kind: "medicamento" | "documento" | "consulta" | "estoque" | "exame" | "cirurgia" | "tratamento" | "renovacao";
  title: string;
  subtitle: string;
  date: string;
  daysUntil: number;
  level: AlertLevel;
  href: string;
  tipoReceita?: TipoReceita;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const URGENTE_DIAS = 5;
const ATENCAO_DIAS = 15;
const URGENTE_DIAS_CONTROLADA = 7;
const ATENCAO_DIAS_CONTROLADA = 18;

const URGENTE_DIAS_ESTOQUE = 3;
const ATENCAO_DIAS_ESTOQUE = 7;

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

export function suggestRenewalDate(dataReceita: string, tipo: TipoReceita): string {
  const dias = VALIDADE_RECEITA_DIAS[tipo];
  if (!dias) return "";
  const date = new Date(dataReceita);
  if (isNaN(date.getTime())) return "";
  date.setDate(date.getDate() + dias);
  return date.toISOString().slice(0, 10);
}

export interface EstoqueInfo {
  consumoDiario: number;
  quantidadeInicial: number;
  quantidadeRestante: number;
  diasRestantes: number;
  unidade: string;
}

export function temEstoqueConfigurado(med: Medicamento): boolean {
  return (
    typeof med.estoque_quantidade === "number" &&
    !!med.estoque_data_referencia &&
    !!med.estoque_horarios &&
    med.estoque_horarios.length > 0
  );
}

export function computeEstoqueInfo(med: Medicamento): EstoqueInfo | null {
  if (!temEstoqueConfigurado(med)) return null;

  const horarios = med.estoque_horarios!;
  const unidadePorDose = med.estoque_unidade_por_dose || 1;
  const consumoDiario = horarios.length * unidadePorDose;
  
  if (consumoDiario <= 0) return null;

  const quantidadeRestante = med.estoque_quantidade!;
  const diasRestantes = Math.floor(quantidadeRestante / consumoDiario);

  return {
    consumoDiario,
    quantidadeInicial: quantidadeRestante,
    quantidadeRestante,
    diasRestantes,
    unidade: med.estoque_unidade_medida || "unidade(s)",
  };
}

export function getEstoqueAlerts(medicamentos: Medicamento[]): HealthAlert[] {
  return medicamentos
    .filter((med) => !!med.id && temEstoqueConfigurado(med))
    .map((med) => {
      const info = computeEstoqueInfo(med)!;
      const daysUntil = info.diasRestantes;
      let level: AlertLevel = "ok";
      
      if (daysUntil <= 0) level = "vencido";
      else if (daysUntil <= URGENTE_DIAS_ESTOQUE) level = "urgente";
      else if (daysUntil <= ATENCAO_DIAS_ESTOQUE) level = "atencao";

      return {
        id: med.id!,
        kind: "estoque" as const,
        title: med.nome,
        subtitle: `${info.quantidadeRestante} ${info.unidade} restantes`,
        date: "",
        daysUntil,
        level,
        href: `/saude/medicamentos/editar?id=${med.id}`,
        tipoReceita: med.tipo_receita,
      };
    })
    .filter((a) => a.level !== "ok")
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

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
        subtitle: `${med.dosagem} · Dr(a). ${med.medico || "Não informado"}`,
        date: med.proxima_renovacao || "",
        daysUntil: daysUntil ?? 999,
        level: getAlertLevel(daysUntil, controlada),
        href: `/saude/medicamentos/editar?id=${med.id}`,
        tipoReceita: med.tipo_receita,
      };
    })
    .filter((a) => a.level !== "ok")
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

export function getDocumentAlerts(documents: Document[]): HealthAlert[] {
  return documents
    .filter((doc) => doc.category_id === "saude" && !!doc.id)
    .map((doc) => {
      const expiry = String(doc.metadata?.expiry_date || doc.metadata?.renewal_date || '');
      const daysUntil = getDaysUntil(expiry);
      return {
        id: doc.id!,
        kind: "documento" as const,
        title: doc.title,
        subtitle: doc.type === "receita" ? "Receita" : doc.type,
        date: expiry,
        daysUntil: daysUntil ?? 999,
        level: getAlertLevel(daysUntil),
        href: `/detalhes?id=${doc.id}`,
      };
    })
    .filter((a) => a.date && a.level !== "ok")
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

export function getUpcomingAppointments(documents: Document[]): HealthAlert[] {
  const relevantTypes = ["prontuario", "laudo", "encaminhamento"];
  return documents
    .filter(
      (doc) =>
        doc.category_id === "saude" && !!doc.id && relevantTypes.includes(doc.type)
    )
    .map((doc) => {
      const date = String(doc.metadata?.date || '');
      const subtitle = String(doc.metadata?.specialty || doc.metadata?.hospital || doc.type);
      const daysUntil = getDaysUntil(date);
      return {
        id: doc.id!,
        kind: "consulta" as const,
        title: doc.title,
        subtitle,
        date,
        daysUntil: daysUntil ?? -999,
        level: "ok" as AlertLevel,
        href: `/detalhes?id=${doc.id}`,
      };
    })
    .filter((a) => a.date && a.daysUntil >= 0 && a.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

export function getExameAlerts(exames: any[]): HealthAlert[] {
  return exames
    .filter((exame) => !!exame.id && !!exame.data_retorno)
    .map((exame) => {
      const daysUntil = getDaysUntil(exame.data_retorno);
      return {
        id: exame.id,
        kind: "exame" as const,
        title: `Retorno Exame: ${exame.nome}`,
        subtitle: `Laboratório: ${exame.laboratorio || "Não informado"}`,
        date: exame.data_retorno,
        daysUntil: daysUntil ?? 999,
        level: getAlertLevel(daysUntil),
        href: `/saude/exames/detalhes?id=${exame.id}`,
      };
    })
    .filter((a) => a.level !== "ok")
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

export function alertLevelColor(level: AlertLevel): string {
  switch (level) {
    case "vencido": return "#F87171";
    case "urgente": return "#FB923C";
    case "atencao": return "#FBBF24";
    default: return "#7C9CB5";
  }
}

export function alertLevelLabel(level: AlertLevel, daysUntil: number): string {
  if (level === "vencido") {
    const dias = Math.abs(daysUntil);
    return dias === 0 ? "Acabou hoje" : `Acabou há ${dias} dia${dias !== 1 ? "s" : ""}`;
  }
  if (daysUntil === 0) return "Vence hoje";
  return `Vence em ${daysUntil} dia${daysUntil !== 1 ? "s" : ""}`;
}

export function estoqueLevelLabel(level: AlertLevel, diasRestantes: number): string {
  if (level === "vencido") return "Acabou";
  if (diasRestantes === 0) return "Acaba hoje";
  return `Acaba em ${diasRestantes} dia${diasRestantes !== 1 ? "s" : ""}`;
}

export function getLocalTodayISO(): string {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
}

export function formatDateDisplay(isoStr: string): string {
  if (!isoStr) return "";
  const parts = isoStr.split("-");
  if (parts.length !== 3) return isoStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}