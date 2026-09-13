import type { HealthInsight, HealthInsightContext } from "@/lib/health-insights";
import { assessDoseQuantitySafety } from "@/lib/health-intelligence/dose-quantity-safety";

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

const OFFICIAL_METHADONE_LABEL = {
  titulo: "Bula regulatória de metadona — riscos com depressores do SNC",
  autoridade: "FDA / National Library of Medicine",
  url: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=cedfe8fa-b57d-4cb1-a047-0af5a8ef199e",
  revisadoEm: "2026-09-13",
};

const OFFICIAL_LISDEXAMFETAMINE_LABEL = {
  titulo: "Bula regulatória de lisdexanfetamina — abuso e síndrome serotoninérgica",
  autoridade: "FDA / National Library of Medicine",
  url: "https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=36c40404-fe94-6fb7-e063-6394a90a2657",
  revisadoEm: "2026-09-13",
};

const OFFICIAL_BUPROPION_LABEL = {
  titulo: "Bula regulatória de bupropiona — risco relacionado à dose",
  autoridade: "FDA / National Library of Medicine",
  url: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=92f0c82c-8b9b-4bad-9de2-6e1b81588000",
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
  { substance: "prometazina", aliases: ["prometazina", "fenergan"], classes: ["anti_histaminico_sedativo", "depressor_snc"] },
  { substance: "lisdexanfetamina", aliases: ["lisdexanfetamina", "venvanse"], classes: ["estimulante", "serotonergico"] },
  { substance: "desvenlafaxina", aliases: ["desvenlafaxina", "pristiq"], classes: ["snri", "serotonergico"] },
  { substance: "trazodona", aliases: ["trazodona", "donaren"], classes: ["antidepressivo", "serotonergico", "depressor_snc"] },
  { substance: "bupropiona", aliases: ["bupropiona", "bup"], classes: ["antidepressivo", "limiar_convulsivo"] },
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

function treatmentEvidence(context: HealthInsightContext, medicationIds: string[]): string[] {
  const names = context.tratamentos
    .filter((treatment) => treatment.person_id === context.personId && treatment.status === "ativo")
    .filter((treatment) => medicationIds.some((id) => treatment.medicamento_ids?.includes(id)))
    .map((treatment) => treatment.nome)
    .filter(Boolean);
  return names.length ? [`Tratamento(s) ativo(s) relacionado(s): ${Array.from(new Set(names)).join(", ")}`] : [];
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

function buildConfirmedQuantityInsight(context: HealthInsightContext, medication: Medication, now: Date): HealthInsight | null {
  const logs = medicationLogs(context, medication.id)
    .filter((dose) => isTaken(dose) && typeof dose.quantidade === "number" && dose.quantidade > 0)
    .sort((a, b) => (doseAt(a)?.getTime() || 0) - (doseAt(b)?.getTime() || 0));
  const recentLogs = logs.filter((dose) => {
    const time = doseAt(dose);
    return Boolean(time && time <= now && hoursBetween(time!, now) <= 24 * 7);
  });
  if (!recentLogs.length) return null;

  let strongest: { dose: Dose; level: "review" | "high"; ratio: number | null; baseline: number | null; unit: string } | null = null;
  for (const dose of recentLogs) {
    const index = logs.indexOf(dose);
    const historical = logs.slice(0, index).map((item) => item.quantidade).filter((value): value is number => typeof value === "number" && value > 0);
    const assessment = assessDoseQuantitySafety({
      quantity: dose.quantidade!,
      configuredQuantity: medication.estoque_unidade_por_dose,
      historicalQuantities: medication.estoque_unidade_por_dose ? [] : historical,
      unitLabel: medication.estoque_unidade_medida || "unidade(s)",
    });
    if (assessment.level === "normal") continue;
    if (!strongest || assessment.level === "high" || (assessment.ratio || 0) > (strongest.ratio || 0)) {
      strongest = { dose, level: assessment.level, ratio: assessment.ratio, baseline: assessment.baseline, unit: assessment.unitLabel };
    }
  }
  if (!strongest) return null;

  const isHigh = strongest.level === "high";
  const strongestAt = doseAt(strongest.dose);
  const closeRepeat = Boolean(strongestAt && logs.some((dose) => dose !== strongest!.dose && doseAt(dose) && hoursBetween(doseAt(dose)!, strongestAt!) <= 4));
  const isCriticalTriage = isHigh && closeRepeat;
  return {
    id: `quantidade-confirmada-${medication.id}-${strongest.dose.id || strongest.dose.tomado_em}`,
    kind: "alert",
    categoria: "uso_sos",
    titulo: `${medication.nome}: quantidade confirmada fora do padrão`,
    mensagem: `Foi salvo um registro de ${strongest.dose.quantidade} ${strongest.unit}${strongest.ratio ? `, cerca de ${strongest.ratio}× a referência interna` : ""}. A confirmação informa que não foi erro de digitação; não demonstra, sozinha, intoxicação ou dose clinicamente inadequada.`,
    urgencia: isHigh ? "alta" : "media",
    gravidadeSeguranca: isCriticalTriage ? "critica" : isHigh ? "importante" : "atencao",
    confianca: strongest.baseline !== null ? "alta" : "media",
    amostra: logs.length,
    periodoDias: 7,
    entidadeTipo: "medicamento",
    entidadeId: medication.id,
    link: `/saude/medicamentos/historico?id=${medication.id}`,
    evidencias: [
      `Quantidade registrada: ${strongest.dose.quantidade} ${strongest.unit}`,
      ...(strongest.baseline !== null ? [`Referência interna: ${strongest.baseline} ${strongest.unit}`] : []),
      ...(strongest.ratio !== null ? [`Relação observada: ${strongest.ratio}×`] : []),
      `Horário salvo: ${strongest.dose.tomado_em || `${strongest.dose.data} ${strongest.dose.horario}`}`,
      ...(closeRepeat ? ["Existe outra tomada registrada em intervalo de até 4 horas"] : []),
      ...treatmentEvidence(context, medication.id ? [medication.id] : []),
    ],
    fontesInternas: ["Cadastro do medicamento", "Histórico de doses"],
    acaoSegura: isHigh ? "Confira o registro e não tome outra dose para compensar ou corrigir sem orientação. Se essa quantidade foi ingerida e houver preocupação ou sintomas, procure imediatamente orientação profissional ou o Disque-Intoxicação 0800 722 6001." : "Confira o registro e leve essa diferença ao profissional responsável antes de modificar a rotina.",
    limitacaoSeguranca: "Esta regra compara somente a quantidade salva com a configuração ou o histórico da própria pessoa. Não calcula dose máxima, tóxica ou letal e não substitui avaliação clínica.",
  };
}

function buildDailyScheduleDeviation(context: HealthInsightContext, medication: Medication, now: Date): HealthInsight | null {
  if (!medication.id || medication.status === "descontinuado") return null;
  const logs = recent(medicationLogs(context, medication.id), now, 24);
  const planned = new Set((medication.estoque_horarios || []).filter(Boolean)).size;
  const profile = profileFor(medication);
  const unplanned = logs.filter(isUnplanned).length;
  const exceedsPlan = planned > 0 && logs.length > planned;
  const repeatedControlledPattern = profile?.classes.includes("estimulante") && logs.length >= 2 && unplanned > 0;
  if (!exceedsPlan && !repeatedControlledPattern) return null;

  const shortest = shortestInterval(logs);
  const critical = unplanned > 0 && logs.length >= Math.max(3, planned + 2) && shortest !== null && shortest <= 240;
  const source = profile?.substance === "lisdexanfetamina" ? [OFFICIAL_LISDEXAMFETAMINE_LABEL] : profile?.substance === "bupropiona" ? [OFFICIAL_BUPROPION_LABEL] : [];
  return {
    id: `rotina-excedida-${medication.id}-${context.hoje || now.toISOString().slice(0, 10)}`,
    kind: "alert",
    categoria: "rotina",
    titulo: `${medication.nome}: tomadas acima da rotina registrada`,
    mensagem: `Há ${logs.length} tomada(s) nas últimas 24 horas${planned ? ` para ${planned} horário(s) configurado(s)` : ""}. O Vault sinaliza a diferença, mas não conclui uso inadequado, tolerância ou superdosagem.`,
    urgencia: "alta",
    gravidadeSeguranca: critical ? "critica" : "importante",
    confianca: planned > 0 ? "alta" : "media",
    amostra: logs.length,
    periodoDias: 1,
    entidadeTipo: "medicamento",
    entidadeId: medication.id,
    link: `/saude/medicamentos/historico?id=${medication.id}`,
    evidencias: [
      `${logs.length} tomada(s) registradas nas últimas 24 horas`,
      ...(planned ? [`${planned} horário(s) configurado(s) no medicamento`] : []),
      `${unplanned} registro(s) SOS/extra`,
      ...(shortest !== null ? [`Menor intervalo observado: ${shortest} minuto(s)`] : []),
      ...treatmentEvidence(context, [medication.id]),
    ],
    fontesInternas: ["Cadastro do medicamento", "Horários configurados", "Registros de doses", "Tratamentos ativos"],
    fontesExternas: source,
    acaoSegura: "Confira os registros agora e não compense, repita ou interrompa doses por conta própria. Se as tomadas ocorreram e houver sonolência intensa, confusão, desmaio, convulsão, falta de ar ou dificuldade para despertar, procure atendimento de urgência; para possível intoxicação, Disque-Intoxicação 0800 722 6001.",
    limitacaoSeguranca: "A comparação usa a rotina cadastrada e os eventos salvos. Ela não conhece mudanças médicas ainda não registradas, absorção, peso, tolerância ou medicamentos externos.",
  };
}

function buildOpioidDepressantCombination(context: HealthInsightContext, now: Date): HealthInsight | null {
  const active = context.medicamentos
    .filter((medication) => medication.person_id === context.personId && medication.status !== "descontinuado" && medication.id)
    .map((medication) => ({ medication, profile: profileFor(medication), logs: recent(medicationLogs(context, medication.id), now, 24) }))
    .filter((item) => item.profile && item.logs.length > 0);
  const opioid = active.find((item) => item.profile!.classes.includes("opioide"));
  if (!opioid) return null;
  const depressants = active.filter((item) => item.medication.id !== opioid.medication.id && item.profile!.classes.includes("depressor_snc"));
  if (!depressants.length) return null;
  const ids = [opioid.medication.id!, ...depressants.map((item) => item.medication.id!)];
  const unplanned = [opioid, ...depressants].some((item) => item.logs.some(isUnplanned));
  return {
    id: `seguranca-opioide-depressores-${opioid.medication.id}`,
    kind: "alert",
    categoria: "uso_sos",
    titulo: "Opioide e outros depressores do sistema nervoso central",
    mensagem: `Há tomadas de ${opioid.medication.nome} e ${depressants.map((item) => item.medication.nome).join(", ")} nas mesmas 24 horas. A bula regulatória descreve risco de sedação profunda e depressão respiratória nessa combinação; os registros não provam que uma reação ocorreu.`,
    urgencia: "alta",
    gravidadeSeguranca: unplanned ? "critica" : "importante",
    confianca: "alta",
    amostra: [opioid, ...depressants].reduce((sum, item) => sum + item.logs.length, 0),
    periodoDias: 1,
    entidadeTipo: "medicamento",
    entidadeId: opioid.medication.id,
    link: `/saude/medicamentos/historico?id=${opioid.medication.id}`,
    evidencias: [
      `Opioide reconhecido: ${opioid.medication.nome}`,
      `Outros depressores com tomada: ${depressants.map((item) => item.medication.nome).join(", ")}`,
      ...(unplanned ? ["O período inclui ao menos uma dose SOS/extra"] : []),
      ...treatmentEvidence(context, ids),
    ],
    fontesInternas: ["Medicamentos", "Registros de doses", "Tratamentos ativos"],
    fontesExternas: [OFFICIAL_METHADONE_LABEL],
    acaoSegura: "Não tome dose adicional nem altere o tratamento por conta própria. Se houver respiração lenta ou difícil, desmaio, confusão intensa ou dificuldade para despertar, procure atendimento de urgência imediatamente.",
    limitacaoSeguranca: "A regra só considera medicamentos reconhecidos e tomadas registradas. Não conhece álcool, substâncias ou medicamentos ausentes do Vault e não substitui avaliação profissional.",
  };
}

function buildSerotonergicCombination(context: HealthInsightContext, now: Date): HealthInsight | null {
  const active = context.medicamentos
    .filter((medication) => medication.person_id === context.personId && medication.status !== "descontinuado" && medication.id)
    .map((medication) => ({ medication, profile: profileFor(medication), logs: recent(medicationLogs(context, medication.id), now, 24) }))
    .filter((item) => item.profile && item.logs.length > 0);
  const stimulant = active.find((item) => item.profile!.classes.includes("estimulante"));
  if (!stimulant) return null;
  const partners = active.filter((item) => item.medication.id !== stimulant.medication.id && item.profile!.classes.includes("serotonergico"));
  const planned = new Set((stimulant.medication.estoque_horarios || []).filter(Boolean)).size;
  const deviated = stimulant.logs.some(isUnplanned) || (planned > 0 && stimulant.logs.length > planned);
  if (!partners.length || !deviated) return null;
  const ids = [stimulant.medication.id!, ...partners.map((item) => item.medication.id!)];
  return {
    id: `seguranca-serotonergica-${stimulant.medication.id}`,
    kind: "alert",
    categoria: "uso_sos",
    titulo: "Estimulante repetido com medicamentos serotoninérgicos",
    mensagem: `Há tomada SOS/extra ou acima da rotina de ${stimulant.medication.nome} no mesmo período de ${partners.map((item) => item.medication.nome).join(", ")}. A bula regulatória descreve aumento do risco de síndrome serotoninérgica com agentes serotoninérgicos; isto é uma triagem, não um diagnóstico.`,
    urgencia: "alta",
    gravidadeSeguranca: "importante",
    confianca: "alta",
    amostra: stimulant.logs.length + partners.reduce((sum, item) => sum + item.logs.length, 0),
    periodoDias: 1,
    entidadeTipo: "medicamento",
    entidadeId: stimulant.medication.id,
    link: `/saude/medicamentos/historico?id=${stimulant.medication.id}`,
    evidencias: [
      `${stimulant.logs.length} tomada(s) de ${stimulant.medication.nome} nas últimas 24 horas`,
      `Agentes serotoninérgicos reconhecidos no período: ${partners.map((item) => item.medication.nome).join(", ")}`,
      ...treatmentEvidence(context, ids),
    ],
    fontesInternas: ["Medicamentos", "Registros de doses", "Tratamentos ativos"],
    fontesExternas: [OFFICIAL_LISDEXAMFETAMINE_LABEL],
    acaoSegura: "Não repita nem altere doses por conta própria. Procure avaliação urgente diante de agitação intensa, confusão, febre, suor excessivo, tremores, rigidez, batimento acelerado, convulsão ou piora rápida.",
    limitacaoSeguranca: "A regra exige tomada registrada e desvio da rotina do estimulante. Ela não confirma síndrome serotoninérgica nem avalia medicamentos ou substâncias não cadastrados.",
  };
}

export function buildMedicationSafetyInsights(context: HealthInsightContext): HealthInsight[] {
  const contextualNow = context.hoje ? new Date(`${context.hoje}T23:59:59`) : new Date();
  const now = Number.isNaN(contextualNow.getTime()) ? new Date() : contextualNow;
  const scoped = { ...context, medicamentos: context.medicamentos.filter((item) => item.person_id === context.personId), doseLogs: context.doseLogs.filter((item) => item.person_id === context.personId) };
  const patterns = scoped.medicamentos.map((medication) => buildUsePattern(scoped, medication, now)).filter((item): item is HealthInsight => Boolean(item));
  const quantityAlerts = scoped.medicamentos.map((medication) => buildConfirmedQuantityInsight(scoped, medication, now)).filter((item): item is HealthInsight => Boolean(item));
  const scheduleAlerts = scoped.medicamentos.map((medication) => buildDailyScheduleDeviation(scoped, medication, now)).filter((item): item is HealthInsight => Boolean(item));
  const combination = buildZolpidemCombination(scoped, now);
  const opioidCombination = buildOpioidDepressantCombination(scoped, now);
  const serotonergicCombination = buildSerotonergicCombination(scoped, now);
  return [...quantityAlerts, ...scheduleAlerts, ...(opioidCombination ? [opioidCombination] : []), ...(!opioidCombination && combination ? [combination] : []), ...(serotonergicCombination ? [serotonergicCombination] : []), ...patterns];
}
