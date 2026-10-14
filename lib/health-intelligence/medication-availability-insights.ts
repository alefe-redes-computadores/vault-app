import type { HealthInsight, HealthInsightContext } from "@/lib/health-insights";
import { hasKnownEmptyMedicationStock } from "@/lib/medication-availability";

/** Operational evidence only: no withdrawal diagnosis and no assumed reason. */
export function buildMedicationAvailabilityInsights(context: HealthInsightContext): HealthInsight[] {
  const day = context.hoje;
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return [];
  const result: HealthInsight[] = [];
  for (const med of context.medicamentos) {
    if (!med.id || med.person_id !== context.personId || med.status === "descontinuado" || med.tipo_uso === "sos" || med.tipo_uso === "esporadico" || !hasKnownEmptyMedicationStock(med)) continue;
    const schedules = new Set(med.estoque_horarios || []);
    const planned = context.doseLogs.filter(log => log.person_id === context.personId && log.user_id === med.user_id && log.medicamento_id === med.id && log.data === day && schedules.has(log.horario) && log.dose_kind !== "sos" && log.dose_kind !== "extra");
    const taken = new Set(planned.filter(log => log.tomado_em).map(log => log.horario));
    const ignored = new Set(planned.filter(log => log.ignorado_em && !log.tomado_em && !taken.has(log.horario)).map(log => log.horario));
    if (!ignored.size) continue;
    const confirmedStock = new Set(planned.filter(log=>ignored.has(log.horario)&&log.ignorado_em&&!log.tomado_em&&log.motivo === "sem_estoque").map(log=>log.horario));
    result.push({
      id: `availability-review-${med.id}`, kind: "data_quality", categoria: "rotina",
      titulo: `${med.nome}: dose ignorada e estoque a revisar`,
      mensagem: confirmedStock.size ? `Você confirmou que ${confirmedStock.size} dose(s) não foram tomadas por falta de estoque em ${day.split("-").reverse().join("/")}. ${ignored.size-confirmedStock.size} outra(s) dose(s) ignorada(s) estão sem esse motivo confirmado. Confira o fornecimento e os registros; essas doses não contam como tomadas.` : `Você marcou ${ignored.size} dose(s) programada(s) como ignorada(s) em ${day.split("-").reverse().join("/")}, e o estoque cadastrado está zerado. São dois registros distintos; o Vault não presume o motivo nem considera essas doses tomadas.`,
      urgencia: "media", confianca: "alta", amostra: ignored.size, periodoDias: 1,
      gravidadeSeguranca: "informativa", entidadeTipo: "medicamento", entidadeId: med.id,
      link: `/saude/medicamentos/detalhes?id=${encodeURIComponent(med.id)}`,
      evidencias: [`Dia registrado: ${day}`, `${ignored.size} horário(s) explicitamente ignorado(s)`, `Estoque cadastrado: ${med.estoque_quantidade}`, ...(confirmedStock.size ? [`Falta de estoque confirmada pelo usuário: ${confirmedStock.size} horário(s)`] : [])],
      fontesInternas: ["Histórico de doses", "Horários programados", "Estoque cadastrado"],
      acaoSegura: "Confira o estoque físico e registre uma aquisição ou retirada somente se aconteceu. Se a dose realmente não foi tomada, converse com o profissional responsável sobre a continuidade; não compense ou ajuste doses por conta própria.",
      limitacaoSeguranca: "Estoque cadastrado não prova ausência física do medicamento. O motivo confirmado é uma declaração do usuário; os demais registros não permitem inferir a causa. Este aviso não diagnostica abstinência nem altera o tratamento.",
    });
  }
  return result;
}
