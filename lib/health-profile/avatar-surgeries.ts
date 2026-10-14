import type { Cirurgia } from '@/lib/types';
import { validDate } from './metrics';

const VALID_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
export function surgeryTime(value?: string): string {
  return value && VALID_TIME.test(value) ? value : '';
}

/** Existing records only. A past scheduled date never changes its status. */
export function avatarSurgeryAgenda(
  surgeries: Cirurgia[], personId: string, userId: string, today: string,
) {
  const upcoming: Cirurgia[] = [], unconfirmed: Cirurgia[] = [], completed: Cirurgia[] = [];
  if (!personId || !userId || !validDate(today)) return { upcoming, unconfirmed, completed, total: 0 };
  const since = new Date(Date.parse(`${today}T12:00:00Z`) - 89 * 86400000).toISOString().slice(0, 10);
  for (const surgery of surgeries) {
    if (surgery.person_id !== personId || surgery.user_id !== userId || !validDate(surgery.data)) continue;
    if (surgery.status === 'agendada') {
      (surgery.data >= today ? upcoming : unconfirmed).push(surgery);
    } else if (surgery.status === 'realizada' && surgery.data >= since && surgery.data <= today) {
      completed.push(surgery);
    }
  }
  const chronological = (a: Cirurgia, b: Cirurgia) =>
    `${a.data}T${surgeryTime(a.horario) || '00:00'}`.localeCompare(`${b.data}T${surgeryTime(b.horario) || '00:00'}`)
    || (a.id || '').localeCompare(b.id || '');
  upcoming.sort(chronological);
  unconfirmed.sort((a, b) => chronological(b, a));
  completed.sort((a, b) => chronological(b, a));
  return { upcoming, unconfirmed, completed, total: upcoming.length + unconfirmed.length + completed.length };
}
