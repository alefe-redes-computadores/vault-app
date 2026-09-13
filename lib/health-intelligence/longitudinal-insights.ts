import type { HealthInsight, HealthInsightContext } from "@/lib/health-insights";

type WindowStats = {
  count: number;
  days: number;
  average: number | null;
  values: number[];
};

type DatedRecord = HealthInsightContext["registrosSaude"][number];
type DatedDose = HealthInsightContext["doseLogs"][number];

const DAY = 86_400_000;

function localDate(value?: string | null): Date | null {
  if (!value) return null;
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return null;
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function dayDiff(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
  return Math.floor((b - a) / DAY);
}

function normalize(value?: string | null): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function recordKey(record: DatedRecord): string {
  return record.registro_chave || `${record.categoria || "registro"}:${normalize(record.tipo || record.nome || "geral")}`;
}

function recordLabel(record: DatedRecord): string {
  return record.nome || record.tipo || "Registro de saúde";
}

function inWindow(date: Date | null, today: Date, start: number, end: number): boolean {
  if (!date) return false;
  const age = dayDiff(date, today);
  return age >= start && age <= end;
}

function stats(records: DatedRecord[], today: Date, start: number, end: number): WindowStats {
  const selected = records.filter((item) => inWindow(localDate(item.data), today, start, end));
  const values = selected
    .map((item) => item.intensidade)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return {
    count: selected.length,
    days: new Set(selected.map((item) => item.data).filter(Boolean)).size,
    average: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null,
    values,
  };
}

function confidence(sample: number, coveredDays: number, windowDays: number): HealthInsight["confianca"] {
  const coverage = coveredDays / windowDays;
  if (sample >= 6 && coveredDays >= 4 && coverage >= 0.35) return "alta";
  if (sample >= 3 && coveredDays >= 2) return "media";
  return "baixa";
}

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

function explicitLinks(record: DatedRecord): string[] {
  const raw = record as DatedRecord & {
    tratamento_ids?: string[];
    cid_ids?: string[];
    tratamentos_ids?: string[];
    cids_ids?: string[];
  };
  return [
    ...(raw.tratamento_ids || raw.tratamentos_ids || []),
    ...(raw.cid_ids || raw.cids_ids || []),
  ].filter(Boolean);
}

function enrichments(records: DatedRecord[], context: HealthInsightContext): string[] {
  const ids = new Set(records.flatMap(explicitLinks));
  if (!ids.size) return [];
  const treatmentNames = context.tratamentos
    .filter((item) => item.id && ids.has(item.id))
    .map((item) => item.nome)
    .filter((value): value is string => Boolean(value));
  const cidNames = context.cids
    .filter((item) => item.id && ids.has(item.id))
    .map((item) => item.descricao || item.codigo)
    .filter((value): value is string => Boolean(value));
  return [...treatmentNames.map((name) => `Tratamento vinculado: ${name}`), ...cidNames.map((name) => `CID vinculado: ${name}`)];
}

function takenAt(dose: DatedDose): Date | null {
  const raw = dose.tomado_em || `${dose.data || ""}T${dose.horario || "00:00"}`;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? localDate(dose.data) : parsed;
}

function recordAt(record: DatedRecord): Date | null {
  if (!record.data) return null;
  const parsed = new Date(`${record.data}T${record.horario || "00:00"}`);
  return Number.isNaN(parsed.getTime()) ? localDate(record.data) : parsed;
}

function isTaken(dose: DatedDose): boolean {
  return Boolean(dose.tomado_em);
}

function buildWindowPatterns(context: HealthInsightContext, today: Date, windowDays: 7 | 30): HealthInsight[] {
  const symptomRecords = context.registrosSaude.filter(
    (item) => item.categoria === "sintoma" || typeof item.intensidade === "number"
  );
  const groups = new Map<string, DatedRecord[]>();
  symptomRecords.forEach((record) => {
    const key = recordKey(record);
    groups.set(key, [...(groups.get(key) || []), record]);
  });

  const insights: HealthInsight[] = [];
  for (const [key, records] of groups) {
    const current = stats(records, today, 0, windowDays - 1);
    const previous = stats(records, today, windowDays, windowDays * 2 - 1);
    if (current.count < 2 || current.days < 2) continue;

    const deltaCount = percentChange(current.count, previous.count);
    const deltaAverage = current.average !== null && previous.average !== null
      ? Number((current.average - previous.average).toFixed(1))
      : null;
    const worsening = (deltaAverage !== null && deltaAverage >= 1) || (deltaCount !== null && deltaCount >= 50 && current.count >= 3);
    const improving = (deltaAverage !== null && deltaAverage <= -1) || (deltaCount !== null && deltaCount <= -40);
    const persistent = !worsening && !improving && current.days >= Math.min(4, Math.ceil(windowDays / 4));
    if (!worsening && !improving && !persistent) continue;

    const label = recordLabel(records[0]);
    const state = worsening ? "aumentou" : improving ? "diminuiu" : "persistiu";
    const conf = confidence(current.count + previous.count, current.days + previous.days, windowDays * 2);
    insights.push({
      id: `longitudinal-${windowDays}-${normalize(key)}`,
      kind: "pattern",
      categoria: "sintomas",
      titulo: `${label}: o padrão ${state} no período`,
      mensagem: `Nos ${windowDays} dias atuais houve ${current.count} registro(s) em ${current.days} dia(s), comparados com ${previous.count} registro(s) em ${previous.days} dia(s) na janela anterior equivalente. É uma leitura do histórico registrado, não um diagnóstico.`,
      urgencia: worsening ? "media" : "baixa",
      confianca: conf,
      amostra: current.count + previous.count,
      periodoDias: windowDays,
      entidadeTipo: "linha_cuidado",
      link: "/saude/registros",
      evidencias: [
        `Janela atual: ${current.count} registro(s) em ${current.days}/${windowDays} dias`,
        `Janela anterior: ${previous.count} registro(s) em ${previous.days}/${windowDays} dias`,
        ...(current.average !== null ? [`Intensidade média atual: ${current.average.toFixed(1)}/10`] : []),
        ...(previous.average !== null ? [`Intensidade média anterior: ${previous.average.toFixed(1)}/10`] : []),
        ...enrichments(records, context),
      ],
      fontesInternas: ["Registros de Saúde", ...(enrichments(records, context).some((item) => item.startsWith("Tratamento")) ? ["Tratamentos vinculados"] : []), ...(enrichments(records, context).some((item) => item.startsWith("CID")) ? ["CIDs vinculados"] : [])],
      comparacao: {
        janelaAtual: `${windowDays} dias atuais`,
        janelaAnterior: `${windowDays} dias anteriores`,
        valorAtual: current.count,
        valorAnterior: previous.count,
        variacaoPercentual: deltaCount,
        tendencia: worsening ? "aumento" : improving ? "queda" : "estavel",
      },
      coberturaDias: { observados: current.days + previous.days, total: windowDays * 2 },
      acaoSegura: worsening ? "Revise a evolução registrada e leve o histórico para avaliação profissional." : "Continue registrando para confirmar se o padrão se mantém.",
    });
  }
  return insights;
}

function buildTemporalAssociations(context: HealthInsightContext, today: Date): HealthInsight[] {
  const symptoms = context.registrosSaude.filter(
    (item) => (item.categoria === "sintoma" || typeof item.intensidade === "number") && inWindow(localDate(item.data), today, 0, 29)
  );
  const doses = context.doseLogs.filter(
    (item) => (item.dose_kind === "sos" || item.dose_kind === "extra") && isTaken(item) && inWindow(localDate(item.data), today, 0, 29)
  );
  if (symptoms.length < 3 || doses.length < 2) return [];

  const pairs: Array<{ symptom: DatedRecord; dose: DatedDose; hours: number }> = [];
  for (const symptom of symptoms) {
    const symptomTime = recordAt(symptom);
    if (!symptomTime) continue;
    const candidates = doses
      .map((dose) => ({ dose, time: takenAt(dose) }))
      .filter((item): item is { dose: DatedDose; time: Date } => Boolean(item.time))
      .map((item) => ({ ...item, hours: Math.abs(item.time.getTime() - symptomTime.getTime()) / 3_600_000 }))
      .filter((item) => item.hours <= 6)
      .sort((a, b) => a.hours - b.hours);
    if (candidates[0]) pairs.push({ symptom, dose: candidates[0].dose, hours: candidates[0].hours });
  }
  const coveredDays = new Set(pairs.map((item) => item.symptom.data).filter(Boolean)).size;
  if (pairs.length < 3 || coveredDays < 2) return [];

  const medicationNames = new Map(context.medicamentos.map((item) => [item.id, item.nome || "Medicamento"]));
  const names = Array.from(new Set(pairs.map((item) => medicationNames.get(item.dose.medicamento_id) || "Medicamento removido")));
  return [{
    id: "longitudinal-associacao-sintoma-dose-30",
    kind: "pattern",
    categoria: "sintomas",
    titulo: "Sintomas e doses SOS/extra apareceram próximos",
    mensagem: `Em ${pairs.length} ocasião(ões), um registro de sintoma e uma dose SOS/extra ficaram a até 6 horas de distância. Isso mostra apenas proximidade temporal; não demonstra causa, efeito ou necessidade de alterar dose.`,
    urgencia: "baixa",
    confianca: confidence(pairs.length, coveredDays, 30),
    amostra: pairs.length,
    periodoDias: 30,
    entidadeTipo: "linha_cuidado",
    link: "/saude/registros?filtro=doses",
    evidencias: [`${coveredDays} dia(s) com associação temporal`, `Medicamentos envolvidos: ${names.join(", ")}`, "Janela de proximidade utilizada: até 6 horas"],
    fontesInternas: ["Registros de Saúde", "Registros de doses SOS/extra", "Medicamentos"],
    coberturaDias: { observados: coveredDays, total: 30 },
    acaoSegura: "Observe a linha do tempo e compartilhe o contexto com o profissional responsável, sem alterar a medicação por conta própria.",
  }];
}

export function buildLongitudinalHealthInsights(context: HealthInsightContext): HealthInsight[] {
  const today = localDate(context.hoje) || new Date();
  const scoped: HealthInsightContext = {
    ...context,
    medicamentos: context.medicamentos.filter((item) => item.person_id === context.personId),
    doseLogs: context.doseLogs.filter((item) => item.person_id === context.personId),
    renovacoes: context.renovacoes.filter((item) => item.person_id === context.personId),
    tratamentos: context.tratamentos.filter((item) => item.person_id === context.personId),
    registrosSaude: context.registrosSaude.filter((item) => item.person_id === context.personId),
    consultas: context.consultas.filter((item) => item.person_id === context.personId),
    exames: context.exames.filter((item) => item.person_id === context.personId),
    cirurgias: context.cirurgias.filter((item) => item.person_id === context.personId),
    cids: context.cids.filter((item) => item.person_id === context.personId),
    documentos: context.documentos.filter((item) => item.person_id === context.personId),
  };

  const candidates = [
    ...buildWindowPatterns(scoped, today, 7),
    ...buildWindowPatterns(scoped, today, 30),
    ...buildTemporalAssociations(scoped, today),
  ];

  const bySubject = new Map<string, HealthInsight>();
  for (const insight of candidates) {
    const subject = insight.id.replace(/longitudinal-(7|30)-/, "longitudinal-");
    const existing = bySubject.get(subject);
    if (!existing || (insight.periodoDias === 7 && insight.confianca !== "baixa")) bySubject.set(subject, insight);
  }
  return Array.from(bySubject.values());
}
