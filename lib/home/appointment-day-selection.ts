/** P15 R9 R9: one source of truth for the existing Home-day selection rules.
 * Inputs are already scoped by the existing repositories and owner context.
 * Read-only: no extra query, no new source of appointment authority.
 */
export function selectHomeDayEvents<T extends { data?: string | null; status?: string | null }>(
  events: readonly T[], day: string, scheduledOnly: boolean,
): T[] {
  return events.filter(event => event.data === day && (!scheduledOnly || event.status === "agendada"));
}
