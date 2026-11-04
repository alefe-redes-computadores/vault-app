/** M63 — pure grouping of *scheduled* withdrawal reminders.
 * Groups only exact same owner, person, event date, offset and local fire instant.
 * Different days/times/people never collapse into one notification.
 */
export type GroupableHealthEvent = {
  id: string;
  userId: string;
  personId: string;
  kind: "consulta" | "exame" | "retirada" | "compra";
  date: string;
  title: string;
};

export type GroupableHealthReminder<T extends GroupableHealthEvent = GroupableHealthEvent> = {
  event: T;
  offsetMinutes: number;
  notifyAt: Date;
};

export type HealthReminderGroup<T extends GroupableHealthEvent = GroupableHealthEvent> = {
  members: Array<GroupableHealthReminder<T>>;
  notifyAt: Date;
  offsetMinutes: number;
};

export function groupWithdrawalReminders<T extends GroupableHealthEvent>(
  rows: readonly GroupableHealthReminder<T>[],
): HealthReminderGroup<T>[] {
  const groups = new Map<string, HealthReminderGroup<T>>();
  for (const row of rows) {
    // Non-withdrawal events must preserve their individual identity.
    const key = row.event.kind === "retirada"
      ? ["retirada", row.event.userId, row.event.personId, row.event.date,
          row.offsetMinutes, row.notifyAt.getTime()].join("|")
      : ["individual", row.event.kind, row.event.userId, row.event.personId,
          row.event.id, row.offsetMinutes, row.notifyAt.getTime()].join("|");
    const previous = groups.get(key);
    if (previous) {
      // Source reconciliation can briefly include duplicate rows. No duplicate member.
      if (!previous.members.some(item => item.event.id === row.event.id)) previous.members.push(row);
    } else {
      groups.set(key, { members: [row], notifyAt: row.notifyAt, offsetMinutes: row.offsetMinutes });
    }
  }
  return Array.from(groups.values()).map(group => ({
    ...group,
    members: [...group.members].sort((a, b) => a.event.id.localeCompare(b.event.id)),
  })).sort((a, b) => a.notifyAt.getTime() - b.notifyAt.getTime());
}

export function withdrawalGroupHref(date: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? `/saude/retiradas?data=${encodeURIComponent(date)}`
    : "/saude/retiradas";
}

export function withdrawalReminderText(count: number, offsetMinutes: number): string {
  const prefix = `${count} retiradas agendadas`;
  if (offsetMinutes === 0) return `${prefix} para hoje. Abra a lista e confira cada compromisso.`;
  if (offsetMinutes === 1440) return `${prefix} para amanhã. Confira cada compromisso.`;
  if (offsetMinutes > 0 && offsetMinutes % 1440 === 0) {
    return `${prefix} para daqui a ${offsetMinutes / 1440} dias. Confira cada compromisso.`;
  }
  if (offsetMinutes > 0 && offsetMinutes % 60 === 0) {
    return `${prefix} em ${offsetMinutes / 60} ${offsetMinutes === 60 ? "hora" : "horas"}. Confira cada compromisso.`;
  }
  return `${prefix} em ${offsetMinutes} minutos. Confira cada compromisso.`;
}
