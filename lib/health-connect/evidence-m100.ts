/** M100 P1 — estado da CONEXÃO, não certificação clínica da medição. */
import type { ConnectConnection, ConnectStatus } from "./types";
export type ConnectEvidenceM100 = {
  linked: boolean;
  permissionState: "unknown" | "granted" | "partial" | "denied";
  lastImportAt: string | null;
  ageHours: number | null;
  recentImport: boolean;
  selectedMetrics: number;
  permittedMetrics: number;
  message: string;
};
export function projectConnectEvidenceM100(connection: ConnectConnection | null | undefined,
  status: ConnectStatus | null | undefined, personId: string, now = Date.now()): ConnectEvidenceM100 {
  const linked = Boolean(personId.trim() && connection?.person_id === personId);
  if (!linked || !connection) return { linked: false, permissionState: "unknown", lastImportAt: null, ageHours: null, recentImport: false, selectedMetrics: 0, permittedMetrics: 0, message: "Este perfil não possui vínculo Health Connect neste celular." };
  const types = Array.from(new Set(connection.types));
  const granted = status?.granted || [];
  const permitted = types.filter(type => granted.includes(type)).length;
  const permissionState = !status || status.availability !== "available" ? "unknown" : permitted === 0 ? "denied" : permitted === types.length ? "granted" : "partial";
  const parsed = connection.last_synced ? Date.parse(connection.last_synced) : NaN;
  const validDate = Number.isFinite(parsed) && parsed > 0 && Number.isFinite(now) && parsed <= now;
  const ageHours = validDate ? Math.floor((now - parsed) / 3_600_000) : null;
  const recentImport = ageHours !== null && ageHours < 72;
  const message = connection.last_error ? "A última tentativa registrou um alerta. Consulte o histórico." :
    !validDate ? "Nenhuma importação concluída registrada neste vínculo." :
    recentImport ? "Importação recente registrada; isso não comprova leitura recente pelo sensor." :
    "Última importação há 3 dias ou mais; verifique quando desejar atualizar.";
  return { linked, permissionState, lastImportAt: validDate ? new Date(parsed).toISOString() : null, ageHours, recentImport, selectedMetrics: types.length, permittedMetrics: permitted, message };
}
export const UNSUPPORTED_CONNECT_METRICS_M100 = ["Passos", "HRV", "Estágios do sono", "Glicose", "Energia ativa"] as const;
export const HEALTH_CONNECT_SOURCE_WARNING_M100 = "Samsung Health é o app de origem; a identificação individual de relógio ou anel não é comprovada automaticamente.";
