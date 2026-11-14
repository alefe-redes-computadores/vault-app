/** M147 P0 — evento clínico declarado vs. lançamento no Diário.
 * Nunca deduz hora do acontecimento a partir da hora em que foi salvo.
 * Eventos de planejamento FUTURO são lançados hoje, não simulados como realizados.
 */
import { validLocalDayM144 } from './careEpisodes';

export type RecordedEventM147 = {
  tag: 'bridge' | 'course' | 'immunization' | 'procedure' | 'risk_benefit';
  start?: string;
};

/** Data da linha no Diário para gravações novas: dia real declarado (não futuro). */
export function diaryDayForEventM147(event: RecordedEventM147, today: string): string {
  const stated = event.start || '';
  if (!validLocalDayM144(today)) return today;
  if (event.tag === 'risk_benefit') return today;
  return validLocalDayM144(stated) && stated <= today ? stated : today;
}

/** Ordenação na central: data declarada, incluindo eventos futuros planejados. */
export function displayedEventDayM147(event: RecordedEventM147, diaryDay: string): string {
  return event.start && validLocalDayM144(event.start) ? event.start : diaryDay;
}
