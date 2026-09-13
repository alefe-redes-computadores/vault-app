import type { HealthInsight, HealthInsightContext } from "@/lib/health-insights";

type Medication = HealthInsightContext["medicamentos"][number];
type Dose = HealthInsightContext["doseLogs"][number];
type SafetySeverity = NonNullable<HealthInsight["gravidadeSeguranca"]>;

type DrugProfile = {
  substance: string;
  aliases: string[];
  classes: string[];
};

const OFFICIAL_ZOLPIDEM_LABEL = {
  titulo: "Bula regulatória de zolpidem — DailyMed/FDA",
  autoridade: "FDA / National Library of Medicine",
  url: "https://dailymed.nlm.nih.gov/dailymed/search.cfm?query=zolpidem",
  revisadoEm: "2026-09-13",
};

const FDA_SLEEP_WARNING = {
  titulo: "Alerta máximo sobre comportamentos complexos durante o sono",
  autoridade: "U.S. Food and Drug Administration",
  url: "https://www.fda.gov/drugs/drug-safety-and-availability/fda-adds-boxed-warning-risk-serious-injuries-caused-sleepwalking-certain-prescription-insomnia",
  revisadoEm: "2026-09-13",
};

/*
 * Vocabulário fechado e auditável. Ele não tenta adivinhar qualquer marca.
 * Novos aliases só devem entrar acompanhados de fonte regulatória revisada.
 */
const PROFILES: DrugProfile[] = [
  { substance: "zolpidem", aliases: ["zolpidem"], classes: ["z_hipnotico", "depressor_snc"] },
  { substance: "metadona", aliases: ["metadona"], classes: ["opioide", "depressor_snc"] },
  { substance: "clonazepam", aliases: ["clonazepam", "rivotril"], classes: ["benzodiazepinico", "depressor_snc"] },
  { substance: "clorpromazina", aliases: ["clorpromazina", "amplictil"], classes: ["antipsicotico", "depressor_snc"] },
];

function normalize(value?: string | null): string {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function profileFor(medication: Medication): DrugProfile | null {
  const name = normalize(medication.nome);
  return PROFILES.find((profile) => profile.aliases.some((alias) => name === alias || name.startsWith(`${alias} `))) || null;
}

function dateAt(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function doseAt(dose: Dose): Date | null {
  return dateAt(dose.tomado_em) || dateAt(dose.data ? `${dose.data}T${dose.horario || "00:00"}` : null);
}

function isTaken(dose: Dose): boolean {
  return Boolean(dose.tomado_em);
}

function isUnplanned(dose: Dose): boolean {
  return dose.dose_kind === "sos" || dose.dose_kind === "extra";
}

function hoursBetween(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / 3_600_000;
}

function recent(logs: Dose[], now: Date, hours: number): Dose[] {
  return logs.filter((dose) => {
    const time = doseAt(dose);
    return isTaken(dose) && Boolean(time && time <= now && hoursBetween(time!, now) <= hours);
  });
}

function shortestInterval(logs: Dose[]): number | null {
  const times = logs.map(doseAt).filter((item): item is Date => Boolean(item)).map((item) => item.getTime()).sort((a, b) => a - b);
  let shortest: number | null = null;
  for (let index = 1; index < times.length; index += 1) {
    const minutes = Math.round((times[index] - times[index - 1]) / 60_000);
    shortest = shortest === null ? minutes : Math.min(shortest, minutes);
  }
  return shortest;
}

function medicationLogs(context: HealthInsightContext, medicationId?: string): Dose[] {
  if (!medicationId) return [];
  return context.doseLogs.filter((dose) => dose.person_id === context.personId && dose.medicamento_id === medicationId);
}

function severityForPattern(sevenDays: number, last24h: number, shortest: number | null): SafetySeverity {
  if (last24h >= 3 || (shortest !== null && shortest <= 120) || sevenDays >= 14) return "importante";
  if (last24h >= 2 || sevenDays >= 7) return "atencao";
  return "informativa";
}

function urgency(severity: SafetySeverity): HealthInsight["urgencia"] {
  return severity === "critica" || severity === "importante" ? "alta" : severity === "atencao" ? "media" : "baixa";
}

function buildUsePattern(context: HealthInsightContext, medication: Medication, now: Date): HealthInsight | null {
  const logs = medicationLogs(context, medication.id).filter((dose) => isTaken(dose) && isUnplanned(dose));
  const last24h = recent(logs, now, 24);
  const last7d = recent(logs, now, 24 * 7);
  if (last7d.length < 4 && last24h.length < 2) return null;
  const shortest = shortestInterval(last7d);
  const severity = severityForPattern(last7d.length, last24h.length, shortest);
  const days = new Set(last7d.map((dose) => dose.data).filter(Boolean)).size;

  return {
    // Reutiliza a identidade canônica para substituir o padrão V1 na deduplicação final.
    id: `padrao-sos-v1-${medication.id}`,
    kind: severity === "importante" ? "alert" : "pattern",
    categoria: "uso_sos",
    titulo: `${medication.nome}: uso SOS/extra concentrado`,
    mensagem: `Foram registradas ${last7d.length} tomadas SOS/extra em ${days} dia(s), sendo ${last24h.length} nas últimas 24 horas. Isso descreve o histórico salvo; sozinho, não confirma superdosagem, tolerância ou uso inadequado.`,
    urgencia: urgency(severity),
    gravidadeSeguranca: severity,
    confianca: last7d.length >= 7 ? "alta" : "media",
    amostra: last7d.length,
    periodoDias: 7,
    entidadeTipo: "medicamento",
    entidadeId: medication.id,
    link: `/saude/medicamentos/historico?id=${medication.id}`,
    evidencias: [
      `${last7d.length} tomada(s) SOS/extra nos últimos 7 dias`,
      `${last24h.length} tomada(s) SOS/extra nas últimas 24 horas`,
      `${days} dia(s) com uso registrado`,
      ...(shortest !== null ? [`Menor intervalo observado: ${shortest} minuto(s)`] : []),
    ],
    fontesInternas: ["Medicamentos", "Registros de doses SOS/extra"],
    acaoSegura: severity === "importante"
      ? "Confira imediatamente se os registros e horários estão corretos. Não repita nem altere doses por conta própria; procure orientação profissional se houver dúvida ou sintomas importantes."
      : "Revise o histórico e leve o padrão ao profissional responsável antes de qualquer mudança.",
    limitacaoSeguranca: "O Vault não conhece, por estes registros isolados, a indicação clínica, tolerância individual, álcool, medicamentos externos ou a dose efetivamente absorvida.",
  };
}

function buildZolpidemCombination(context: HealthInsightContext, now: Date): HealthInsight | null {
  const profiled = context.medicamentos
    .filter((medication) => medication.person_id === context.personId && medication.status !== "descontinuado")
    .map((medication) => ({ medication, profile: profileFor(medication) }))
    .filter((item): item is { medication: Medication; profile: DrugProfile } => Boolean(item.profile));
  const zolpidem = profiled.find((item) => item.profile.substance === "zolpidem");
  if (!zolpidem) return null;
  const zolpidemDoses = recent(medicationLogs(context, zolpidem.medication.id), now, 24);
  if (!zolpidemDoses.length) return null;

  const companions = profiled.filter((item) => item.profile.substance !== "zolpidem" && item.profile.classes.includes("depressor_snc"))
    .filter((item) => recent(medicationLogs(context, item.medication.id), now, 24).length > 0);
  if (!companions.length) return null;

  const names = companions.map((item) => item.medication.nome);
  const opioid = companions.some((item) => item.profile.classes.includes("opioide"));
  return {
    id: `seguranca-zolpidem-depressores-${zolpidem.medication.id}`,
    kind: "alert",
    categoria: "uso_sos",
    titulo: "Zolpidem e outros depressores do sistema nervoso central",
    mensagem: `Há tomadas registradas de ${zolpidem.medication.nome} e ${names.join(", ")} dentro das mesmas 24 horas. A bula regulatória descreve efeito depressor aditivo com opioides e outros depressores do sistema nervoso central. O registro temporal não prova que ocorreu uma reação.`,
    urgencia: "alta",
    gravidadeSeguranca: "importante",
    confianca: "alta",
    amostra: zolpidemDoses.length + companions.length,
    periodoDias: 1,
    entidadeTipo: "medicamento",
    entidadeId: zolpidem.medication.id,
    link: `/saude/medicamentos/historico?id=${zolpidem.medication.id}`,
    evidencias: [
      `${zolpidemDoses.length} tomada(s) de zolpidem registrada(s) nas últimas 24 horas`,
      `Outros medicamentos com tomada registrada no período: ${names.join(", ")}`,
      opioid ? "A combinação observada inclui um medicamento classificado como opioide" : "A combinação observada inclui outro depressor do sistema nervoso central",
    ],
    fontesInternas: ["Medicamentos", "Registros de doses"],
    fontesExternas: [OFFICIAL_ZOLPIDEM_LABEL, FDA_SLEEP_WARNING],
    acaoSegura: "Não tome dose adicional nem altere o esquema com base neste alerta. Confira os horários registrados e procure orientação do prescritor ou farmacêutico; diante de dificuldade para respirar, desmaio, confusão intensa ou dificuldade para despertar, procure atendimento de urgência.",
    limitacaoSeguranca: "A regra cobre somente identidades reconhecidas pelo vocabulário auditado e tomadas registradas no Vault; não examina álcool, substâncias ou medicamentos ausentes do aplicativo.",
  };
}

export function buildMedicationSafetyInsights(context: HealthInsightContext): HealthInsight[] {
  const contextualNow = context.hoje ? new Date(`${context.hoje}T23:59:59`) : new Date();
  const now = Number.isNaN(contextualNow.getTime()) ? new Date() : contextualNow;
  const scoped = { ...context, medicamentos: context.medicamentos.filter((item) => item.person_id === context.personId), doseLogs: context.doseLogs.filter((item) => item.person_id === context.personId) };
  const patterns = scoped.medicamentos.map((medication) => buildUsePattern(scoped, medication, now)).filter((item): item is HealthInsight => Boolean(item));
  const combination = buildZolpidemCombination(scoped, now);
  return [...(combination ? [combination] : []), ...patterns];
}
