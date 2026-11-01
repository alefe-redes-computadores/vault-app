// VAULT M2 — origem e ordenacao dos alertas da Home sem hooks nem consulta.
import type { AlertaVisaoGeral } from "@/lib/health-insights";
import type { AlertLevel } from "@/lib/health-utils";
import { getDocumentAlerts } from "@/lib/health-utils";

export type HomeAlertKind = AlertaVisaoGeral["tipo"] | "documento";
export type HomeDashboardAlert<Icon> = {
  id: string;
  title: string;
  subtitle: string;
  level: AlertLevel;
  kind: HomeAlertKind;
  href: string;
  daysUntil: number | null;
  icon: Icon;
  color: string;
};

export function projectHomeDashboardAlerts<Icon>(
  healthInsights: readonly AlertaVisaoGeral[],
  documentInsights: readonly ReturnType<typeof getDocumentAlerts>[number][],
  view: {
    getLevel: (urgency: AlertaVisaoGeral["urgencia"]) => AlertLevel;
    getIcon: (kind: HomeAlertKind) => Icon;
    getColor: (level: AlertLevel) => string;
  },
): HomeDashboardAlert<Icon>[] {
  const result: HomeDashboardAlert<Icon>[] = [];
  for (const insight of healthInsights) {
    const level = view.getLevel(insight.urgencia);
    result.push({
      id: insight.id, title: insight.titulo, subtitle: insight.mensagem,
      level, kind: insight.tipo, href: insight.link,
      daysUntil: insight.dias ?? null,
      icon: view.getIcon(insight.tipo), color: view.getColor(level),
    });
  }
  for (const alert of documentInsights) {
    // Validade isolada de receita nao equivale a risco de falta de medicamento.
    const text = `${alert.title} ${alert.subtitle}`.toLocaleLowerCase("pt-BR");
    if (text.includes("receita")) continue;
    result.push({
      id: `documento-${alert.id}`, title: alert.title,
      subtitle: alert.subtitle, level: alert.level, kind: "documento",
      href: alert.href, daysUntil: alert.daysUntil,
      icon: view.getIcon("documento"), color: view.getColor(alert.level),
    });
  }
  const priority: Record<AlertLevel, number> = {
    vencido: 0, urgente: 1, atencao: 2, ok: 3,
  };
  return result.sort((a, b) => {
    const byLevel = (priority[a.level] ?? 4) - (priority[b.level] ?? 4);
    if (byLevel !== 0) return byLevel;
    return (a.daysUntil ?? 99999) - (b.daysUntil ?? 99999);
  }).slice(0, 6);
}
