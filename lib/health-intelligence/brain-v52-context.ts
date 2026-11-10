/**
 * VAULT M112 · Brain V5.2 — correlações temporais conservadoras.
 * Somente evidência owner/person scoped; nenhuma inferência de causalidade,
 * adesão a partir de logs ausentes, dose segura, intoxicação ou abstinência.
 * Read-only; nenhum acesso a rede, banco, notificações ou armazenamento.
 */
import type { HealthInsight, HealthInsightContext } from "@/lib/health-insights";

type Medication = HealthInsightContext["medicamentos"][number];
type Dose = HealthInsightContext["doseLogs"][number];
type RecordRow = HealthInsightContext["registrosSaude"][number];

type DrugKind = "maintenance_opioid" | "short_snri" | "stimulant" | "sedative";
type Drug = { kind: DrugKind; aliases: readonly string[] };
const PROFILES: readonly Drug[] = [
  { kind: "maintenance_opioid", aliases: ["metadona", "metadon"] },
  { kind: "short_snri", aliases: ["desvenlafaxina", "pristiq"] },
  { kind: "stimulant", aliases: ["lisdexanfetamina", "venvanse", "metilfenidato", "ritalina", "concerta"] },
  { kind: "sedative", aliases: ["clonazepam", "rivotril", "zolpidem", "clorpromazina", "amplictil", "prometazina", "fenergan"] },
];
const FDA_DESVENLAFAXINE = {
  titulo: "Desvenlafaxina — riscos de descontinuação",
  autoridade: "FDA / National Library of Medicine — DailyMed",
  url: "https://www.dailymed.nlm.nih.gov/dailymed/fda/fdaDrugXsl.cfm?setid=56c9e8ee-1460-4a4c-8033-65d9afb358c8&type=display",
  revisadoEm: "2026-11-10",
};
const SAMHSA_METHADONE = {
  titulo: "TIP 63 — avaliação após doses de metadona não realizadas",
  autoridade: "SAMHSA",
  url: "https://www.samhsa.gov/sites/default/files/pep21-02-01-002.pdf",
  revisadoEm: "2026-11-10",
};
const norm = (value?: string | null) => String(value || "").normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const profile = (med: Medication): DrugKind | null => {
  const name = norm(med.nome);
  return PROFILES.find(item => item.aliases.some(alias => name === alias || name.startsWith(`${alias} `)))?.kind ?? null;
};
const validDay = (value: string): boolean => {
  if (!/^\d{4}-\d\d-\d\d$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const stamp = Date.UTC(year, month - 1, day);
  const actual = new Date(stamp);
  return actual.getUTCFullYear() === year && actual.getUTCMonth() === month - 1 && actual.getUTCDate() === day;
};
const dayMillis = (value: string): number | null => {
  if (!validDay(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
};
const localDay = (value: Date): string => [
  String(value.getFullYear()), String(value.getMonth() + 1).padStart(2, "0"),
  String(value.getDate()).padStart(2, "0"),
].join("-");
const priorDay = (value: string, offset: number): string | null => {
  const stamp = dayMillis(value);
  if (stamp === null) return null;
  return new Date(stamp - offset * 86400000).toISOString().slice(0, 10);
};
const validTime = (value: string) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
const recordedAt = (value?: string | null): number | null => {
  if (!value || !/^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(value) || !validDay(value.slice(0, 10))) return null;
  const stamp = Date.parse(value);
  return Number.isFinite(stamp) ? stamp : null;
};
const takenAt = (dose: Dose, now: number, maxAgeHours = 24): number | null => {
  if (!dose.tomado_em || dose.ignorado_em) return null;
  const stamp = recordedAt(dose.tomado_em);
  return stamp !== null && stamp <= now && now - stamp <= maxAgeHours * 3600000 ? stamp : null;
};
const owned = (row: { user_id?: string | null; person_id?: string | null }, ctx: HealthInsightContext) =>
  Boolean(ctx.userId && ctx.personId && row.user_id === ctx.userId && row.person_id === ctx.personId);
const unplanned = (dose: Dose) => dose.dose_kind === "extra" || dose.dose_kind === "sos";
const scheduled = (dose: Dose) => !unplanned(dose) && dose.dose_kind !== "planned";
const historyLink = (id: string) => `/saude/medicamentos/historico?id=${encodeURIComponent(id)}`;
const SAFE_ACTION = "Não aumente, repita, compense, suspenda ou reinicie doses com base neste alerta. Confira os registros com o prescritor; dor no peito, falta de ar, desmaio, confusão intensa ou dificuldade para despertar exigem avaliação de urgência (SAMU 192).";
const LIMITATION = "Correlação apenas temporal, com registros explicitamente salvos e medicamentos reconhecidos. Não comprova abstinência, intoxicação, efeito individual nem motivo de uma tomada; medicamentos externos e ausência de registros não são avaliados.";

export type V52SkippedEvidence = { days: number; dates: string[]; records: number };
/**
 * No missing DoseLog is ever interpreted as missed. Only complete PAST dates
 * where every configured scheduled time has a positive ignored log count.
 * A taken log on the same date invalidates the full-day inference.
 */
export function v52ExplicitSkippedDays(
  med: Medication, logs: readonly Dose[], today: string, maxDays = 14, asOfMs = Date.now(),
): V52SkippedEvidence {
  const times = [...new Set((med.estoque_horarios || []).filter((x): x is string => typeof x === "string" && validTime(x)))];
  if (!times.length || !validDay(today)) return { days: 0, dates: [], records: 0 };
  const dates: string[] = [];
  let count = 0;
  for (let step = 1; step <= maxDays; step += 1) {
    const date = priorDay(today, step);
    if (!date) break;
    const daily = logs.filter(d => d.data === date && d.medicamento_id === med.id && scheduled(d));
    const hasTaken = daily.some(d => Boolean(d.tomado_em));
    if (hasTaken || !times.every(time => daily.some(d => {
      const ignoredAt = recordedAt(d.ignorado_em);
      return d.horario === time && ignoredAt !== null && ignoredAt <= asOfMs && !d.tomado_em;
    }))) break;
    dates.push(date);
    count += daily.filter(d => {const at = recordedAt(d.ignorado_em); return at !== null && at <= asOfMs && !d.tomado_em;}).length;
  }
  return { days: dates.length, dates, records: count };
}

// Only discrete structured reasons count as an administrative barrier.
// Free prose about reasons is neither parsed nor attributed to public services.
const REASONS: Readonly<Record<string, string>> = {
  "sem estoque": "sem estoque informado", "falta de estoque": "falta de estoque informada",
  "sem receita": "receita pendente informada", "receita pendente": "receita pendente informada",
  "lme pendente": "LME pendente informada", "falta no posto": "falta no posto informada",
};
function explicitBarrier(logs: readonly Dose[], now: number): { label: string; log: Dose } | null {
  for (const log of logs) {
    if (!scheduled(log) || !log.ignorado_em || log.tomado_em) continue;
    const at = recordedAt(log.ignorado_em);
    if (at === null || at > now || now - at > 14 * 86400000) continue;
    const label = REASONS[norm(log.motivo)];
    if (label) return {label, log};
  }
  return null;
}
const SYMPTOMS = ["tontura", "vertigem", "sensacao de choque", "choque na cabeca", "pesadelo", "pesadelos", "insonia"];
const recognizedSymptom = (row: RecordRow) => row.categoria === "sintoma" && SYMPTOMS.some(s => {
  const n = norm(row.nome || row.tipo);
  return n === s || n.startsWith(`${s} `);
});
const linkedSymptom = (row: RecordRow, med: Medication) => Boolean(
  row.medicamento_id === med.id || (med.tratamento_ids || []).some(id => row.tratamento_ids?.includes(id)),
);

/** Stable identity for every signal: no now/time phase or symptom count in IDs. */
export function buildBrainV52ContextInsights(ctx: HealthInsightContext, now = new Date()): HealthInsight[] {
  if (!ctx.userId || !ctx.personId || !Number.isFinite(now.getTime())) return [];
  const today = ctx.hoje || localDay(now);
  // Historical replay and future planning must not produce "current emergency" signals.
  if (!validDay(today) || today !== localDay(now)) return [];
  const clock = now.getTime();
  const medicines = ctx.medicamentos.filter(m => Boolean(m.id) && owned(m, ctx) && m.status !== "descontinuado");
  const ownMedicationIds = new Set(medicines.map(m => m.id));
  const logs = ctx.doseLogs.filter(d => owned(d, ctx) && ownMedicationIds.has(d.medicamento_id));
  const result: HealthInsight[] = [];
  const maintenance: Array<{med: Medication; gap: V52SkippedEvidence}> = [];
  const snri: Array<{med: Medication; gap: V52SkippedEvidence}> = [];
  const stimulants: Array<{med: Medication; dose: Dose}> = [];
  const sedatives: Array<{med: Medication; dose: Dose}> = [];
  for (const med of medicines) {
    const kind = profile(med);
    if (!kind || !med.id) continue;
    const ownLogs = logs.filter(d => d.medicamento_id === med.id);
    const gap = v52ExplicitSkippedDays(med, ownLogs, today, 14, clock);
    const recent = ownLogs.filter(d => takenAt(d, clock) !== null);
    if (kind === "maintenance_opioid" && gap.days >= 3 && med.tipo_uso === "continuo") {
      maintenance.push({med, gap});
      result.push({
        id: `v52-manutencao-interrupcao-registros-${med.id}`, kind: "alert", categoria: "rotina",
        titulo: `${med.nome}: confirme a continuidade do tratamento`,
        mensagem: "O histórico contém vários dias consecutivos com todos os horários programados marcados como ignorados. Isso não confirma que o medicamento deixou de ser usado, mas pode exigir reavaliação profissional antes de retomar a rotina habitual, especialmente quando há redução de tolerância.",
        urgencia: "alta", gravidadeSeguranca: "importante", confianca: "media", amostra: Math.min(gap.records, 3), periodoDias: 14,
        entidadeTipo: "medicamento", entidadeId: med.id, link: historyLink(med.id),
        evidencias: ["Pelo menos três dias anteriores consecutivos com horários explicitamente ignorados", "Nenhuma tomada registrada nesses dias; isso não comprova ausência de uso"],
        fontesInternas: ["Horários cadastrados", "DoseLogs marcados como ignorados"], fontesExternas: [SAMHSA_METHADONE],
        acaoSegura: "Se a interrupção foi real, converse com o serviço responsável antes de retomar qualquer dose; após dias sem metadona a tolerância pode mudar. Não utilize a dose anterior sem reavaliação profissional.",
        limitacaoSeguranca: LIMITATION,
      });
    }
    if (kind === "short_snri" && gap.days >= 1 && med.tipo_uso === "continuo") snri.push({med, gap});
    if (kind === "stimulant") for (const dose of recent.filter(unplanned)) stimulants.push({med, dose});
    if (kind === "sedative") for (const dose of recent) sedatives.push({med, dose});
    const barrier = explicitBarrier(ownLogs, clock);
    if (barrier && med.tipo_uso === "continuo") {
      const pending = ctx.retiradas.find(r => owned(r, ctx) && r.medicamento_id === med.id &&
        r.status === "agendada" && validDay(r.data) && r.data >= today);
      result.push({
        id: `v52-barreira-informada-${med.id}`, kind: "observation", categoria: "tratamento",
        titulo: `${med.nome}: dificuldade de acesso registrada`,
        mensagem: `Uma dose foi marcada como ignorada, com motivo informado: ${barrier.label}. Isso não prova falha administrativa nem que o medicamento realmente deixou de ser tomado.${pending ? " Há retirada futura agendada, mas o agendamento não comprova entrega." : ""}`,
        urgencia: "media", gravidadeSeguranca: "atencao", confianca: "media", amostra: 1, periodoDias: 14,
        entidadeTipo: "medicamento", entidadeId: med.id, link: historyLink(med.id),
        ...(pending?.id ? {relacoesContextuais:[{tipo:"retirada",id:pending.id}]} : {}),
        evidencias: [`Motivo explícito no DoseLog: ${barrier.label}`, ...(pending ? ["Retirada futura somente agendada (não realizada)"] : [])],
        fontesInternas: ["DoseLogs com motivo informado", "Agenda de retiradas"],
        acaoSegura: "Revise o registro e informe ao serviço de saúde ou prescritor a dificuldade de acesso. Se estiver sem o medicamento, não compense nem retome doses sem orientação.",
        limitacaoSeguranca: "Motivo declarado pela pessoa, não verificação de falha de farmácia, LME ou SUS. Um agendamento não confirma que houve entrega.",
      });
    }
  }
  // Structured symptom association: same owner, explicit medication/treatment link;
  // no scanning free notes for self-harm, no assigning a diagnosis.
  for (const {med} of snri) {
    const records = ctx.registrosSaude.filter(r => owned(r,ctx) && recognizedSymptom(r) && linkedSymptom(r,med) &&
      validDay(r.data) && r.data <= today && (dayMillis(today)! - dayMillis(r.data)!) <= 5 * 86400000);
    if (!records.length || !med.id) continue;
    result.push({
      id: `v52-snri-registros-temporais-${med.id}`, kind: "observation", categoria: "rotina",
      titulo: `${med.nome}: registros próximos merecem revisão`,
      mensagem: "Há horários explicitamente ignorados e sintomas cadastrados com vínculo explícito ao mesmo medicamento ou tratamento. A proximidade temporal não confirma síndrome de descontinuação nem sua causa.",
      urgencia: "media", gravidadeSeguranca: "atencao", confianca: "media", amostra: 1, periodoDias: 5,
      entidadeTipo: "medicamento", entidadeId: med.id, link: historyLink(med.id),
      evidencias: ["Ao menos um dia anterior com horários de dose explicitamente ignorados", "Relato(s) de sintomas vinculados registrados nos últimos cinco dias"],
      fontesInternas: ["DoseLogs explícitos", "Registros de saúde vinculados"], fontesExternas: [FDA_DESVENLAFAXINE],
      acaoSegura: "Converse com seu prescritor para revisar a interrupção e os sintomas. Não compense ou reinicie doses por conta própria. Piora intensa ou pensamentos de autoagressão exigem ajuda humana imediata.",
      limitacaoSeguranca: LIMITATION,
    });
  }
  // One stable insight per pair — never infer why the extra dose was taken.
  const pairs = new Set<string>();
  for (const {med: stimulus} of stimulants) {
    if (!stimulus.id) continue;
    for (const {med: base} of maintenance) {
      if (!base.id) continue;
      const key = `${base.id}:${stimulus.id}`;
      if (pairs.has(key)) continue;
      pairs.add(key);
      result.push({
        id: `v52-extra-durante-lacuna-${base.id}-${stimulus.id}`, kind: "alert", categoria: "uso_sos",
        titulo: "Registros de manutenção e estimulante merecem atenção",
        mensagem: "Há dias com horários de medicamento de manutenção marcados como ignorados e um registro recente de dose extra/SOS de estimulante. Os registros não informam o motivo da dose extra nem permitem estimar resposta de humor, abstinência ou eficácia.",
        urgencia: "alta", gravidadeSeguranca: "importante", confianca: "media", amostra: 2, periodoDias: 14,
        entidadeTipo: "medicamento", entidadeId: base.id, entidadeIds: [base.id, stimulus.id], link: historyLink(base.id),
        evidencias: ["Doses de manutenção marcadas como ignoradas em dias anteriores", "Estimulante extra/SOS com tomada nas últimas 24h"],
        fontesInternas: ["Medicamentos", "DoseLogs explícitos"],
        acaoSegura: SAFE_ACTION, limitacaoSeguranca: LIMITATION,
      });
    }
    for (const {med: sedative} of sedatives) {
      if (!sedative.id || sedative.id === stimulus.id) continue;
      const key = `sedative:${stimulus.id}:${sedative.id}`;
      if (pairs.has(key)) continue;
      pairs.add(key);
      result.push({
        id: `v52-estimulante-sedativo-${stimulus.id}-${sedative.id}`, kind: "observation", categoria: "uso_sos",
        titulo: "Estimulante extra e sedativo registrados no mesmo período",
        mensagem: "Existe registro de dose extra/SOS de estimulante e tomada de medicamento sedativo em até 24 horas. Isso não demonstra que o sedativo foi usado para compensar efeitos, nem calcula risco individual ou janela de rebote.",
        urgencia: "media", gravidadeSeguranca: "atencao", confianca: "media", amostra: 2, periodoDias: 1,
        entidadeTipo: "medicamento", entidadeId: stimulus.id, entidadeIds: [stimulus.id, sedative.id], link: historyLink(stimulus.id),
        evidencias: ["Estimulante extra/SOS com tomada nas últimas 24h", "Sedativo com tomada nas últimas 24h"],
        fontesInternas: ["Medicamentos", "DoseLogs explícitos"],
        acaoSegura: SAFE_ACTION, limitacaoSeguranca: LIMITATION,
      });
    }
  }
  return result;
}
