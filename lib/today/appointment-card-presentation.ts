import { isOverdueWithdrawal, withdrawalDaysOverdue } from "@/lib/withdrawal-agenda";

/** Pure, read-only representation. The appointment's recorded status is authoritative. */
export type TodayAppointmentCardItem = {
  id?: string;
  tipo?: string;
  status?: string;
  data?: string;
  horario?: string;
  especialidade?: string;
  procedimento?: string;
  nome?: string;
  medicamento_nome?: string;
  medicamento_id?: string;
  [key: string]: unknown;
};

export function presentTodayAppointment(item: TodayAppointmentCardItem, today: string, dateLabel: string) {
  const isConsultation = item.tipo === "consulta";
  const isSurgery = item.tipo === "cirurgia";
  const isWithdrawal = item.tipo === "retirada";
  const completed = item.status === "realizada";
  const closed = item.status === "cancelada" || item.status === "nao_realizada";
  // Never treat a closed withdrawal as overdue, nor a planned visit as completed.
  const overdue = !completed && !closed && isWithdrawal &&
    isOverdueWithdrawal(item as Parameters<typeof isOverdueWithdrawal>[0], today);
  const overdueDays = overdue && item.data ? withdrawalDaysOverdue(item.data, today) : 0;
  const label = completed ? "Compromisso concluído" : closed ? "Compromisso encerrado" :
    isConsultation ? "Consulta agendada" : isSurgery ? "Procedimento cirúrgico" :
    isWithdrawal ? overdue ? "Retirada pendente" : "Retirada de medicamento" : "Realização de exame";
  const description = item.especialidade || item.procedimento || item.nome || item.medicamento_nome || "Compromisso de saúde";
  const badge = completed ? "Concluído" : closed ? "Encerrado" : overdue ? `Atrasada · ${overdueDays}d` : dateLabel;
  const cardClass = completed ? "border-emerald-400/35 bg-emerald-400/8" : closed ? "border-surface-border/50 bg-surface/60 opacity-70" :
    isConsultation ? "border-ice/30 bg-ice/5" : isSurgery ? "border-coral/30 bg-coral/5" :
    isWithdrawal ? "border-amber-400/25 bg-amber-400/5" : "border-emerald-400/30 bg-emerald-400/5";
  const badgeClass = completed ? "bg-emerald-400/15 text-emerald-400" : closed ? "bg-ink-muted/10 text-ink-muted" :
    isConsultation ? "bg-ice/10 text-ice" : isSurgery ? "bg-coral/10 text-coral" :
    overdue ? "bg-amber-400/15 text-amber-300" : isWithdrawal ? "bg-ice/10 text-ice" : "bg-emerald-400/10 text-emerald-400";
  return {isConsultation,isSurgery,isWithdrawal,completed,closed,overdue,label,description,badge,cardClass,badgeClass};
}
