/** M153 P5: ordem factual da fila do dia, sem gerar tomadas nem agendamentos. */
export type MedicationPendingRowP5 = {
  med: { id?:string|null; nome?:string|null; tipo_uso?:string|null; estoque_horarios?:readonly string[]|null };
  dosesPendentesHoje: number;
  isSOS: boolean;
  isSuspenso: boolean;
};
export type MedicationDayLogP5 = {
  medicamento_id:string; horario?:string|null; dose_kind?:string|null;
  tomado_em?:string|null; ignorado_em?:string|null;
};
const VALID = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
export function pendingClockP5(row:MedicationPendingRowP5, logs:readonly MedicationDayLogP5[]):string|null {
  if(row.isSuspenso||row.isSOS||row.dosesPendentesHoje<=0||!row.med.id)return null;
  const own=logs.filter(log=>log.medicamento_id===row.med.id);
  const clocks=row.med.tipo_uso==='temporario'
    ? own.filter(log=>log.dose_kind==='planned').map(log=>log.horario||'')
    : row.med.estoque_horarios||[];
  return [...new Set(clocks)].filter(hour=>VALID.test(hour) &&
    !own.some(log=>log.horario===hour && (log.tomado_em||log.ignorado_em))).sort()[0]||null;
}
/** Return 0 to let the existing comparator handle stable ties. */
export function createMedicationPendingPriorityP5(logs:readonly MedicationDayLogP5[]){
  return (a:MedicationPendingRowP5,b:MedicationPendingRowP5):number=>{
    const kind=(row:MedicationPendingRowP5)=>row.isSuspenso?3:row.isSOS?2:row.dosesPendentesHoje>0?0:1;
    const diff=kind(a)-kind(b);
    if(diff)return diff;
    if(kind(a)!==0)return 0;
    return (pendingClockP5(a,logs)||'99:99').localeCompare(pendingClockP5(b,logs)||'99:99');
  };
}
