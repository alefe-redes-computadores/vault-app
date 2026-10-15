/** Keep slot identity independent from the time at which the person confirms taking it. */
export function pendingDoseCustomTime(dose: {data:string;horario:string}): string {
  return `${dose.data}T${dose.horario}`;
}
