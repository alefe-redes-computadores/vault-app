/** Pure pt-BR quantity labels for the A7/M5 recurring planner and record selector.
 * Zero clinical decisions, dates, scheduling, persistence or device access.
 */
export type ClinicalCountNounA7M5 = 'sessao' | 'horario' | 'registro' | 'data';
const LABELS_A7M5: Record<ClinicalCountNounA7M5, readonly [string, string]> = {
  sessao: ['sessão', 'sessões'],
  horario: ['horário', 'horários'],
  registro: ['registro', 'registros'],
  data: ['data', 'datas'],
};
export function pluralClinicalCountA7M5(count: number, noun: ClinicalCountNounA7M5): string {
  if (!Number.isSafeInteger(count) || count < 0) throw new Error('Contagem clínica inválida');
  const forms = LABELS_A7M5[noun];
  if (!forms) throw new Error('Unidade de contagem não reconhecida');
  return `${count} ${forms[count === 1 ? 0 : 1]}`;
}
