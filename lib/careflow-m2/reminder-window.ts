/** A pressure plan cannot schedule beyond its user-confirmed calendar window. */
import type { HealthReminderRule } from '@/lib/health-reminders/types';
import { isIsoDateM2 } from './domain';
export function reminderDayEligibleM2(rule:Pick<HealthReminderRule,'careflow_m2'>,day:string):boolean {
  const window=rule.careflow_m2;
  if(!window)return true;
  return Boolean(isIsoDateM2(day)&&isIsoDateM2(window.start)&&isIsoDateM2(window.end)&&
    window.start<=day&&day<=window.end);
}
