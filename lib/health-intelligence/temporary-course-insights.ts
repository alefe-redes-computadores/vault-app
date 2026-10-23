import type { HealthInsight, HealthInsightContext } from "@/lib/health-insights";
import { TEMPORARY_COURSE_PREFIX } from "@/lib/health-supply/temporary-course";

/** A registered course is evidence of a user-entered plan, never a diagnosis. */
export function temporaryCourseSummaries(context: Pick<HealthInsightContext, "personId" | "userId" | "hoje" | "medicamentos" | "doseLogs">, includeSettled = false) {
  const { personId, userId, hoje: today, medicamentos, doseLogs } = context;
  if (!personId || !userId || !/^\d{4}-\d{2}-\d{2}$/.test(today || "")) return [];
  const owned = new Map(medicamentos.filter(m => m.id && m.person_id === personId && m.user_id === userId).map(m => [m.id!, m]));
  const groups = new Map<string, typeof doseLogs>();
  for (const log of doseLogs) {
    const med = owned.get(log.medicamento_id);
    if (!med || log.person_id !== personId || log.user_id !== userId || !log.motivo?.startsWith(TEMPORARY_COURSE_PREFIX)) continue;
    const key = `${med.id!}|${log.motivo}`;
    const bucket = groups.get(key) || [];
    bucket.push(log); groups.set(key, bucket);
  }
  return [...groups].flatMap(([key, rows]) => {
    const id = rows[0].medicamento_id;
    const med = owned.get(id)!;
    const open = rows.filter(r => !r.tomado_em && !r.ignorado_em);
    if (!open.length && !includeSettled) return [];
    const dates = rows.map(r => r.data).sort();
    return [{ key, medicamentoId: id, nome: med.nome,
      from: dates[0], through: dates[dates.length - 1],
      pending: open.filter(r => r.data >= today!).length,
      overdue: open.filter(r => r.data < today!).length,
      taken: rows.filter(r => r.tomado_em).length,
      ignored: rows.filter(r => r.ignorado_em).length }];
  }).sort((a, b) => b.from.localeCompare(a.from) || a.nome.localeCompare(b.nome, "pt-BR"));
}

export function buildTemporaryCourseInsights(context: HealthInsightContext): HealthInsight[] {
  return temporaryCourseSummaries(context).slice(0, 3).map(item => ({
    id: `v230-temporary-course-${encodeURIComponent(item.key)}`,
    kind: "observation", categoria: "rotina", titulo: `Período registrado para ${item.nome}`,
    mensagem: `${item.pending} dose(s) em aberto a partir de hoje e ${item.overdue} de dias anteriores no período registrado para ${item.nome} até ${item.through}. Há ${item.taken} tomada(s) confirmada(s) e ${item.ignored} ignorada(s). Confira o histórico e os horários com sua prescrição.`,
    urgencia: "baixa", confianca: "alta", amostra: item.pending + item.overdue + item.taken + item.ignored,
    entidadeTipo: "medicamento", entidadeId: item.medicamentoId,
    link: `/saude/medicamentos/detalhes?id=${encodeURIComponent(item.medicamentoId)}`,
    evidencias: [`Período registrado: ${item.from} a ${item.through}`, `${item.pending + item.overdue} agendamento(s) sem decisão`, `${item.overdue} de dia(s) anterior(es)`],
    fontesInternas: ["DoseLogs planejados da pessoa ativa"],
    acaoSegura: "Confirme apenas doses realmente tomadas. Ajuste o período se a prescrição mudar.",
    limitacaoSeguranca: "Não deduz diagnóstico, duração ou adesão a partir de cadastro ou ausência de registro.",
  }));
}
