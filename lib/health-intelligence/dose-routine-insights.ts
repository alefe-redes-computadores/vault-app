import type { HealthInsight, HealthInsightContext } from "@/lib/health-insights";

/**
 * V226 — leitura dos atos explicitamente registrados, não da adesão presumida.
 * Ignorar é uma decisão clínica anotada; uma ausência de DoseLog não é dose ignorada.
 * SOS, extra e planejadas não pertencem ao denominador de doses programadas.
 */
type RecordedOutcome = "taken" | "ignored";
type ScheduledRecord = HealthInsightContext["doseLogs"][number];

const DAY = 86_400_000;
const MIN_DECISIONS = 6;
const MIN_DAYS = 4;
const MIN_IGNORED = 3;
const MIN_IGNORED_DAYS = 3;

function localDateKey(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return value;
}

function noon(value: string): number {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12).getTime();
}

function normalizeTime(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function daypart(time: string): "manha" | "tarde" | "noite" {
  const hour = Number(time.slice(0, 2));
  return hour >= 5 && hour < 12 ? "manha" : hour >= 12 && hour < 18 ? "tarde" : "noite";
}

function resolveOutcome(records: ScheduledRecord[]): RecordedOutcome | null {
  // Duplicidade legada contraditória não vira evidência de adesão nem de omissão.
  const taken = records.some((item) => Boolean(item.tomado_em));
  const ignored = records.some((item) => Boolean(item.ignorado_em));
  if (taken === ignored) return null;
  return taken ? "taken" : "ignored";
}

export function buildRecordedDoseRoutineInsights(context: HealthInsightContext): HealthInsight[] {
  const today = localDateKey(context.hoje);
  if (!today || !context.personId?.trim()) return [];
  const todayNoon = noon(today);
  // Quem possui o medicamento é a referência do proprietário. Sem vínculo verificável,
  // não cruzar contas que eventualmente tenham importado um ID semelhante.
  const ownerId = context.medicamentos.find((med) => med.person_id === context.personId && med.user_id)?.user_id;
  if (!ownerId) return [];
  const knownIds = new Set(context.medicamentos.filter((med) => med.person_id === context.personId && med.user_id === ownerId && Boolean(med.id)).map((med) => med.id));
  const slots = new Map<string, ScheduledRecord[]>();
  for (const log of context.doseLogs) {
    if (log.person_id !== context.personId || log.user_id !== ownerId || !knownIds.has(log.medicamento_id)) continue;
    if (log.dose_kind === "sos" || log.dose_kind === "extra" || log.dose_kind === "planned") continue;
    const day = localDateKey(log.data);
    const time = normalizeTime(log.horario);
    if (!day || !time) continue;
    const age = Math.round((todayNoon - noon(day)) / DAY);
    if (age < 0 || age >= 14) continue;
    const key = `${log.medicamento_id}|${day}|${time}`;
    const group = slots.get(key) || [];
    group.push(log);
    slots.set(key, group);
  }

  const byPart = new Map<ReturnType<typeof daypart>, {taken: number; ignored: number; days: Set<string>; ignoredDays: Set<string>}>();
  for (const [key, records] of slots) {
    const status = resolveOutcome(records);
    if (!status) continue;
    const [, day, time] = key.split("|");
    const part = daypart(time);
    const tally = byPart.get(part) || {taken: 0, ignored: 0, days: new Set<string>(), ignoredDays: new Set<string>()};
    tally[status] += 1;
    tally.days.add(day);
    if (status === "ignored") tally.ignoredDays.add(day);
    byPart.set(part, tally);
  }

  const labels = {manha: "manhã", tarde: "tarde", noite: "noite"};
  const observations: HealthInsight[] = [];
  for (const part of ["manha", "tarde", "noite"] as const) {
    const item = byPart.get(part);
    if (!item) continue;
    const total = item.taken + item.ignored;
    if (total < MIN_DECISIONS || item.days.size < MIN_DAYS || item.ignored < MIN_IGNORED || item.ignoredDays.size < MIN_IGNORED_DAYS) continue;
    observations.push({
      id: `v226-dose-ignored-${part}`,
      kind: "pattern",
      categoria: "rotina",
      titulo: `Doses registradas como ignoradas à ${labels[part]}`,
      mensagem: `Nos últimos 14 dias, ${item.ignored} de ${total} decisões registradas para doses programadas neste período do dia foram marcadas como ignoradas, em ${item.ignoredDays.size} dias distintos. Dias sem registro não foram contados.`,
      urgencia: "baixa",
      confianca: item.days.size >= 7 && total >= 12 ? "alta" : "media",
      amostra: total,
      periodoDias: 14,
      entidadeTipo: "linha_cuidado",
      link: "/saude/registros",
      evidencias: [`${item.taken} tomadas confirmadas`, `${item.ignored} ignoradas explicitamente`, `${item.days.size} dias com decisão registrada`, `${item.ignoredDays.size} dias distintos com registro de ignorada`],
      fontesInternas: ["DoseLogs explícitos", "Cadastro de medicamentos"],
      coberturaDias: {observados: item.days.size, total: 14},
      acaoSegura: "Revise seus horários e anotações com o profissional responsável. Não altere a dose por conta própria.",
      limitacaoSeguranca: "Não estima doses previstas, adesão ou risco clínico: usa somente ações registradas, sem SOS/extra nem dados de outros perfis.",
    });
  }
  return observations;
}
