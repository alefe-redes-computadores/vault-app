/**
 * M148 P3: deterministic presentation ordering for medication list.
 * This does not create, reschedule, confirm or ignore any dose.
 * Planned times for a medication are kept in clock order; unscheduled and SOS
 * appear after clocked medications, and ties use a stable pt-BR name order.
 */
type TimeRow = { med:{ nome?:string|null; tipo_uso?:string|null; estoque_horarios?:readonly string[]|null }};
const CLOCK=/^(?:[01]\d|2[0-3]):[0-5]\d$/;
export function medicationFirstClockM148(m:TimeRow['med']):number {
  if(m.tipo_uso==='sos'||m.tipo_uso==='esporadico')return 1440;
  const hours=(m.estoque_horarios||[]).filter(v=>CLOCK.test(v));
  if(!hours.length)return 1440;
  return Math.min(...hours.map(v=>Number(v.slice(0,2))*60+Number(v.slice(3,5))));
}
export function compareMedicationTimeM148(a:TimeRow,b:TimeRow):number {
  const delta=medicationFirstClockM148(a.med)-medicationFirstClockM148(b.med);
  return delta||String(a.med.nome||'').localeCompare(String(b.med.nome||''),'pt-BR');
}
