/** Presentation only. No inference of adherence from absent log records. */
export function routineNarrativeP7R3(input: {
  scheduled: number; completed: number; overdue: number; localHour: number;
}): { title: string; description: string; tone: "positive" | "attention" | "neutral" } {
  const scheduled = Number.isFinite(input.scheduled) ? Math.max(0,Math.floor(input.scheduled)) : 0;
  const completed = Number.isFinite(input.completed) ? Math.max(0,Math.min(scheduled,Math.floor(input.completed))) : 0;
  const overdue = Number.isFinite(input.overdue) ? Math.max(0,Math.floor(input.overdue)) : 0;
  if (!scheduled) return { title:"Seu dia de cuidado", description:"Não há horários contínuos programados nesta rotina. Outros registros podem aparecer em Hoje.", tone:"neutral" };
  if (overdue) return { title:"Rotina com registros para revisar", description:`${completed} de ${scheduled} horários registrados. Há ${overdue} registro${overdue===1?"":"s"} aguardando revisão; ausência de registro não comprova dose não tomada.`, tone:"attention" };
  if (completed >= scheduled) return { title:"Rotina registrada hoje", description:`Os ${scheduled} horários previstos nesta rotina têm registros de conclusão. Outros compromissos são acompanhados separadamente.`, tone:"positive" };
  if (!completed && input.localHour < 12) return { title:"Seu cuidado começa hoje", description:`Há ${scheduled} horário${scheduled===1?"":"s"} programado${scheduled===1?"":"s"} para esta rotina. Confira os horários quando precisar.`, tone:"neutral" };
  return { title:"Sua rotina está em andamento", description:`${completed} de ${scheduled} horários registrados. Os demais podem estar programados para mais tarde; consulte Hoje para os horários.`, tone:"neutral" };
}
