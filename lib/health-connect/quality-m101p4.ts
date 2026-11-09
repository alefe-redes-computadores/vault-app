/**
 * VAULT M101 P4 — qualidade e continuidade observáveis.
 * Não lê sensores, não infere diagnósticos, não inventa medições ausentes.
 * Os valores de cobertura são produzidos pelo M101 P1 com isolamento conta+pessoa.
 */
import type { ConnectConnection, ConnectStatus } from "./types";
import type { ConnectCoverageM101, ConnectMetricCoverageM101 } from "./coverage-m101";
import type { HealthMetric } from "@/lib/health-profile/types";

export type ConnectQualityLabelM101P4 =
  | "permitido_com_dados" | "sem_dados_recentes" | "sem_dados_28d"
  | "permissao_revogada" | "apk_desatualizado" | "estado_indisponivel";
export type ConnectQualityMetricM101P4 = {
  metric: HealthMetric;
  state: ConnectQualityLabelM101P4;
  label: string;
  detail: string;
  observedDays7: number;
  unobservedDays7: number;
};
export type ConnectQualityReportM101P4 = {
  linked: boolean;
  lastSyncState: "none" | "success" | "error" | "running";
  lastAttemptAt: string | null;
  lastImportAt: string | null;
  summary: string;
  items: ConnectQualityMetricM101P4[];
};

function safeInstant(value: string | null | undefined, now: number): string | null {
  if (!value || !Number.isFinite(now)) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) && time > 0 && time <= now ? new Date(time).toISOString() : null;
}

function describeMetric(item: ConnectMetricCoverageM101): ConnectQualityMetricM101P4 {
  const missing = Math.max(0, 7 - Math.min(7, Math.max(0, item.days7)));
  const common = { metric: item.metric, observedDays7: item.days7, unobservedDays7: missing };
  if (item.permission === "apk_update") return {
    ...common, state: "apk_desatualizado", label: "Requer APK atualizado",
    detail: "Este plugin Android não declara suporte ao indicador. Registros anteriores permanecem no histórico."
  };
  if (item.permission === "unknown") return {
    ...common, state: "estado_indisponivel", label: "Permissão não verificada",
    detail: "Não foi possível consultar as permissões Android neste momento; registros existentes não são apagados."
  };
  if (item.permission === "denied") return {
    ...common, state: "permissao_revogada", label: "Sem permissão ativa",
    detail: "Confira a autorização no Health Connect. Dados já importados permanecem preservados."
  };
  if (!item.samples28 || item.latestDay === null || item.ageDays === null) return {
    ...common, state: "sem_dados_28d", label: "Nenhum registro nos 28 dias",
    detail: "O indicador está autorizado, mas nenhuma medição importada foi encontrada no intervalo; não significa valor zero."
  };
  if (item.ageDays >= 7) return {
    ...common, state: "sem_dados_recentes", label: "Sem registro nos últimos 7 dias",
    detail: `Última data registrada há ${item.ageDays} dia(s). Isso não comprova falha do sensor.`
  };
  return {
    ...common, state: "permitido_com_dados", label: "Há registros no período",
    detail: `${item.days7} dia(s) com registros nos últimos 7; ${missing} sem registro importado. Não indica falha do sensor.`
  };
}

/** Nenhuma informação atravessa a conta ou perfil vigente. */
export function evaluateConnectQualityM101P4(
  coverage: ConnectCoverageM101,
  connection: ConnectConnection | null | undefined,
  status: ConnectStatus | null | undefined,
  userId: string | null | undefined,
  personId: string,
  now = Date.now()
): ConnectQualityReportM101P4 {
  const linked = Boolean(coverage.linked && userId && personId &&
    connection?.user_id === userId && connection.person_id === personId);
  if (!linked) return {
    linked: false, lastSyncState: "none", lastAttemptAt: null, lastImportAt: null,
    summary: "Sem vínculo confirmado com esta conta e pessoa. Nenhuma informação de outra pessoa é exibida.", items: []
  };
  const lastAttemptAt = safeInstant(connection!.last_attempt_at, now);
  const lastImportAt = safeInstant(connection!.last_synced, now);
  const latestRun = connection!.sync_history?.find(run => safeInstant(run.started_at, now)) ?? null;
  const lastSyncState = latestRun?.status === "success" ? "success" :
    latestRun?.status === "error" ? "error" :
    latestRun?.status === "running" ? "running" : "none";
  const items = coverage.metrics.filter(item => item.selected).map(describeMetric);
  const revoked = items.filter(item => item.state === "permissao_revogada").length;
  const incompatible = items.filter(item => item.state === "apk_desatualizado").length;
  const missing = items.filter(item => item.state === "sem_dados_28d").length;
  const summary = !status || status.availability !== "available"
    ? "Estado do Health Connect indisponível; histórico anteriormente importado foi preservado."
    : lastSyncState === "error"
      ? "A última tentativa de sincronização falhou. Confira os detalhes no histórico de sincronização."
      : lastSyncState === "running"
        ? "Há uma tentativa registrada como em andamento. Isso não garante que o aplicativo ainda esteja lendo."
        : incompatible > 0
          ? `${incompatible} indicador(es) exigem APK compatível; isso não significa permissão recusada.`
          : revoked > 0
            ? `${revoked} indicador(es) estão sem autorização; dados já importados continuam disponíveis.`
            : !lastImportAt
              ? "Nenhuma importação concluída registrada neste vínculo."
              : missing > 0
                ? `${missing} indicador(es) autorizados sem registros importados nos últimos 28 dias. Não são valores zero.`
                : "Cobertura baseada em datas registradas; importação concluída não comprova leitura recente do sensor.";
  return { linked, lastSyncState, lastAttemptAt, lastImportAt, summary, items };
}
