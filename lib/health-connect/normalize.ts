import { METRICS } from "@/lib/health-profile/types";
import { validateMetric, sleepDuration } from "@/lib/health-profile/metrics";
import { SAMSUNG_ORIGIN, type ConnectRecord } from "./types";
export function normalizeConnectRecord(raw: ConnectRecord, now = Date.now()) {
  if (!raw || raw.origin !== SAMSUNG_ORIGIN || !raw.id || raw.id.length > 300 || !Object.prototype.hasOwnProperty.call(METRICS, raw.type)) throw new Error("Origem ou tipo de dado inválido.");
  const time = new Date(raw.time);
  if (!Number.isFinite(time.getTime()) || time.getTime() > now || time.getTime() < now - 31 * 86400000) throw new Error("Data de importação fora do período.");
  validateMetric(raw.type, raw.value, raw.second);
  let start: string | null = null, end: string | null = null;
  if (raw.type === "sono" || raw.type === "caminhada") {
    const duration = sleepDuration(raw.start || "", raw.end || "");
    start = new Date(raw.start!).toISOString(); end = new Date(raw.end!).toISOString();
    if (duration !== raw.value || end !== time.toISOString()) throw new Error("Período e duração não correspondem.");
  } else if (raw.start || raw.end) throw new Error("Intervalo inesperado para esta medida.");
  if (raw.dailyAverage && raw.type !== "frequencia_cardiaca") throw new Error("Resumo diário inválido.");
  const date = `${time.getFullYear()}-${String(time.getMonth()+1).padStart(2,"0")}-${String(time.getDate()).padStart(2,"0")}`;
  const clock = `${String(time.getHours()).padStart(2,"0")}:${String(time.getMinutes()).padStart(2,"0")}`;
  const def = METRICS[raw.type];
  return {
    source_record_id: `${raw.origin}:${raw.type}:${raw.id}`,
    categoria: def.category, tipo: raw.type,
    nome: raw.dailyAverage ? "Batimentos · média diária" : def.label,
    data: date, horario: clock,
    inicio_em: start, fim_em: end,
    valor_numerico: raw.type === "pressao_arterial" ? undefined : raw.value,
    valor_medicao: raw.type === "pressao_arterial" ? `${raw.value}/${raw.second}` : `${raw.value} ${def.unit}`,
    unidade_medida: def.unit,
    duracao_minutos: ["sono", "caminhada"].includes(raw.type) ? raw.value : undefined,
    observacoes: raw.dailyAverage ? "Samsung Health via Health Connect. Média diária dos batimentos disponíveis, não uma medida pontual." : raw.type === "sono" ? "Samsung Health via Health Connect. Duração do intervalo da sessão; pode incluir períodos acordado." : "Samsung Health via Health Connect.",
  };
}
