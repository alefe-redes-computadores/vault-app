import type { BrainCarePlanItem } from "@/lib/health-intelligence/care-plan";

/** Future explicit dose schedules are planning, not late/ignored care.
 *  Never suppress today's doses, recorded withdrawals or medication supply alerts.
 */
export function isFutureDosePlanningM145(
  item: Pick<BrainCarePlanItem, "evidenceKind" | "phenomenon" | "title" | "dueDate">,
  todayISO: string
): boolean {
  const date = item.dueDate?.slice(0, 10) ?? "";
  return item.evidenceKind === "projected" &&
    (item.phenomenon === "schedule" || /\b(?:dose|doses|hor[aá]rio|tomada|tomadas)\b/i.test(item.title)) &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    /^\d{4}-\d{2}-\d{2}$/.test(todayISO) && date > todayISO;
}
