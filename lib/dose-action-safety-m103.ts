/** M103 P2: guards automatic Android dose actions; read-only policy. */
export type NativeDoseActionEvidenceM103 = {
  data: unknown;
  horario: unknown;
  personId: unknown;
  medicamentoId: unknown;
};
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Actions are meaningful only for an exact, plausible, recent notification slot.
 * A legacy alarm with no date is allowed to OPEN the app but never to write a
 * guessed date. History older than 48 h must be reviewed manually in VAULT.
 */
export function canApplyNativeDoseActionM103(value: NativeDoseActionEvidenceM103, now: Date = new Date()): boolean {
  if (typeof value.personId !== "string" || !value.personId.trim() || value.personId.length > 160 ||
      typeof value.medicamentoId !== "string" || !value.medicamentoId.trim() || value.medicamentoId.length > 160 ||
      typeof value.data !== "string" || typeof value.horario !== "string" ||
      !Number.isFinite(now.getTime())) return false;
  const day=DATE.exec(value.data), clock=TIME.exec(value.horario);
  if (!day || !clock) return false;
  const [year,month,date]=[Number(day[1]),Number(day[2]),Number(day[3])];
  if (year < 2020 || year > 2100) return false;
  const at=new Date(year,month-1,date,Number(clock[1]),Number(clock[2]),0,0);
  if (at.getFullYear()!==year || at.getMonth()!==month-1 || at.getDate()!==date ||
      at.getHours()!==Number(clock[1]) || at.getMinutes()!==Number(clock[2])) return false;
  const elapsed=now.getTime()-at.getTime();
  // Not even a delayed stale tap changes an unknown day into a clinical event.
  return elapsed>=-10*60_000 && elapsed<=48*60*60_000;
}
