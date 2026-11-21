/** M63 — destination validation for native event payloads. Never mutates health data. */
import { withdrawalGroupHref } from "./event-grouping";

const EVENT_ROUTES: Record<string, string> = {
  consulta: "/saude/consultas/detalhes",
  exame: "/saude/exames/detalhes",
  retirada: "/saude/retiradas/detalhes",
  compra: "/saude/renovacao/detalhes",
  cirurgia: "/saude/cirurgias/detalhes",
  reabilitacao: "/saude/reabilitacao/detalhes",
  retorno: "/saude/exames/detalhes",
  checkin: "/saude/lembretes",
};

export type HealthEventActionData = {
  eventKind?: string;
  eventId?: string;
  eventIds?: string[];
  eventDate?: string;
  targetRoute?: string;
};

/** Route is derived from the known record ID, not from arbitrary native payload paths. */
export function resolveHealthEventDestination(data: HealthEventActionData): string | null {
  const kind = data.eventKind || "";
  const path = EVENT_ROUTES[kind];
  if (!path) return null;
  const ids = Array.isArray(data.eventIds)
    ? [...new Set(data.eventIds.filter(id => typeof id === "string" && id.trim() && id.length <= 160))]
    : [];
  if (kind === "retirada" && ids.length > 1) {
    return withdrawalGroupHref(data.eventDate || "");
  }
  const id = (data.eventId || (ids.length === 1 ? ids[0] : "")).trim();
  if (!id || id.length > 160) return null;
  if(kind==="checkin"){
    const match=/^(.+):D(1|3|10)$/.exec(id);
    if(!match||!match[1]||match[1].length>130)return null;
    return `/saude/lembretes?checkin=${encodeURIComponent(match[1])}&dia=${match[2]}`;
  }
  return `${path}?id=${encodeURIComponent(id)}`;
}

export function isSafeVaultNotificationRoute(route: unknown): route is string {
  return typeof route === "string" && route.startsWith("/") &&
    !route.startsWith("//") && !route.includes("\\") && !/[\u0000-\u001f]/.test(route);
}
