import type { ActiveProbe } from "./types";
/** Limite visual adicional. A autoridade de consentimento, agenda e RLS continua no core/repository. */
export function probeDisplayAllowedP6(probe: ActiveProbe, ledger: readonly ActiveProbe[], now: Date, opts: {
  quietStart?:number; quietEnd?:number; maxOtherPromptsToday?:number;
} = {}): boolean {
  if (!Number.isFinite(now.getTime()) || !probe.user_id || !probe.person_id) return false;
  if (probe.status !== "eligible" && probe.status !== "shown") return false;
  const start = opts.quietStart ?? 22, end = opts.quietEnd ?? 8;
  if (![start,end].every(hour=>Number.isInteger(hour)&&hour>=0&&hour<24)) return false;
  const hour=now.getHours();
  const quiet=start>end ? hour>=start||hour<end : start<end && hour>=start&&hour<end;
  // Uma pergunta já mostrada deve permanecer disponível para resposta, sem desaparecer à noite.
  if (probe.status !== "shown" && quiet) return false;
  const today=now.getFullYear()*10000+(now.getMonth()+1)*100+now.getDate();
  const others=ledger.filter(row=>row.id!==probe.id&&row.user_id===probe.user_id&&row.person_id===probe.person_id&&
    (row.status==="shown"||row.status==="answered"||row.status==="dismissed")&&
    Number.isFinite(Date.parse(row.updated_at))&&(()=>{const t=new Date(row.updated_at);return t.getFullYear()*10000+(t.getMonth()+1)*100+t.getDate()===today;})());
  return probe.status === "shown" || others.length < (opts.maxOtherPromptsToday ?? 1);
}
