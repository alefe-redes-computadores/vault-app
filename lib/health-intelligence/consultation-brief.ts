import type { ClinicalReport } from "@/lib/clinical-report";

/**
 * V224 — Preparação de consulta com evidências já existentes no prontuário.
 * Sem nova tabela, sem upload, sem interpretação clínica automática.
 * O texto não presume uso de medicamentos a partir de ausência de registros.
 */
export interface ConsultationBrief {
  period: string;
  overview: string[];
  focus: string[];
  questions: string[];
  limitations: string[];
}

const compact = (value: string, max = 160) => value.trim().slice(0, max);

export function buildConsultationBrief(report: ClinicalReport): ConsultationBrief {
  const { current, periodDays, totals, coverage, medications, symptoms, activeTreatments, insights, dataQuality } = report;
  const overview = [
    `Período ${current.start} a ${current.end}: ${coverage.currentDays}/${periodDays} dias com dados registrados.`,
    `${totals.records} registros de saúde; ${totals.scheduledTaken} doses programadas tomadas; ${totals.ignored} doses explicitamente ignoradas.`,
    `${totals.sosTaken + totals.extraTaken} doses SOS/extra registradas como tomadas; ${activeTreatments.length} tratamento(s) ativo(s).`,
  ];
  const focus: string[] = [];
  for (const symptom of symptoms.slice(0, 4)) {
    focus.push(`${compact(symptom.label, 75)}: ${symptom.occurrences} relato(s) em ${symptom.days} dia(s)${symptom.averageIntensity === null ? "" : `; intensidade média registrada ${symptom.averageIntensity}/10`}.`);
  }
  for (const medication of medications.slice(0, 6)) {
    focus.push(`${compact(medication.name, 75)}${medication.dosage ? ` (${compact(medication.dosage, 55)})` : ""}: ${medication.scheduledTaken} programadas tomadas, ${medication.sosTaken} SOS, ${medication.extraTaken} extras e ${medication.ignored} ignoradas, conforme registros.`);
  }
  for (const treatment of activeTreatments.slice(0, 5)) {
    focus.push(`Tratamento ativo informado: ${compact(treatment.name, 100)}.`);
  }
  for (const insight of insights.slice(0, 3)) {
    focus.push(`Padrão observado (${insight.confianca} confiança): ${compact(insight.titulo, 100)}. ${compact(insight.mensagem, 180)}`);
  }
  if (focus.length === 0) focus.push("Ainda não há sintomas, doses ou tratamentos suficientes para detalhar este período.");

  const questions = [
    "Quais sinais devo acompanhar até o próximo atendimento?",
    "Há informações que devo registrar com mais frequência para facilitar a avaliação?",
  ];
  if (symptoms.length) questions.unshift("Como interpretar a evolução dos sintomas relatados junto ao histórico clínico?");
  if (medications.length) questions.push("Há dúvidas sobre a lista de medicamentos, os horários registrados ou o fornecimento?");
  if (insights.length) questions.push("Os padrões do histórico justificam alguma investigação profissional adicional?");

  const limitations = [
    "O VAULT resume apenas o que foi registrado; dias vazios não significam ausência de sintomas ou doses não tomadas.",
    "Associações temporais e variações de registro não demonstram causa, diagnóstico ou necessidade de alterar tratamento.",
  ];
  if (!dataQuality.comparable) limitations.push("Não há cobertura suficiente no período anterior para comparação confiável.");
  const unsynced = dataQuality.pendingSync.records + dataQuality.pendingSync.doses;
  if (unsynced > 0) limitations.push(`${unsynced} evento(s) do período marcados como pendentes de sincronização: o resumo reflete a cópia local.`);
  if (dataQuality.discardedRecords > 0) limitations.push(`${dataQuality.discardedRecords} registro(s) com data inválida foram excluídos da análise.`);
  return { period: `${current.start} a ${current.end}`, overview, focus, questions, limitations };
}

export function formatConsultationBrief(brief: ConsultationBrief): string {
  return [
    "VAULT — PREPARAÇÃO PARA CONSULTA",
    `Período: ${brief.period}`,
    "",
    "PANORAMA",
    ...brief.overview.map((line) => `• ${line}`),
    "",
    "DADOS PARA DISCUTIR",
    ...brief.focus.map((line) => `• ${line}`),
    "",
    "PERGUNTAS PARA O ATENDIMENTO",
    ...brief.questions.map((line) => `• ${line}`),
    "",
    "LIMITAÇÕES",
    ...brief.limitations.map((line) => `• ${line}`),
    "",
    "Resumo descritivo; não substitui avaliação profissional.",
  ].join("\n");
}
