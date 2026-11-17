/** CI360 P6 P2 — evidência bilateral da consulta. Sem vínculos por coincidência. */
import type { Consulta, Medicamento, DoseLog, RegistroSaude } from '@/lib/types';

type Owner = { user_id: string; person_id: string };
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const civil = (v?: string | null) => String(v || '').slice(0, 10);
function validDay(s: string) {
  if (!DAY.test(s)) return false;
  const d = new Date(`${s}T12:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
function move(s: string, days: number): string {
  const d = new Date(`${s}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
const owned = (x: {user_id?: string | null; person_id?: string | null}, owner: Owner) =>
  Boolean(owner.user_id && owner.person_id && x.user_id === owner.user_id && x.person_id === owner.person_id);

export function consultationTimelineForMedicationP6P2(
  medication: Pick<Medicamento, 'id'|'user_id'|'person_id'>,
  consultations: readonly Consulta[],
) {
  if (!medication.id || !medication.user_id || !medication.person_id) return [];
  const owner = {user_id: medication.user_id, person_id: medication.person_id};
  const unique = new Set<string>();
  return consultations.filter(c => {
    if (!c.id || unique.has(c.id) || !owned(c, owner) || !c.medicamento_ids?.includes(medication.id!)) return false;
    unique.add(c.id);
    return true;
  }).map(c => ({
    id: c.id!, date: civil(c.data), time: c.horario || null,
    physician: c.medico || 'Profissional não informado',
    specialty: c.especialidade || 'Especialidade não informada',
    status: c.status,
    personal: c.percepcao_paciente?.trim() || null,
    professional: c.orientacao_profissional?.trim() || null,
    followUp: c.proximos_passos?.trim() || null,
    source: 'consultation_explicit' as const,
  })).sort((a,b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}

export type ObservedWindowP6P2 = {
  from: string; through: string; confirmed: number; ignored: number;
  sosExtra: number; observations: number; evidenceRefs: string[];
};
/** Janelas são descritivas, não uma comparação de eficácia nem de adesão. */
export function consultationBeforeAfterEvidenceP6P2(input: {
  owner: Owner; consultation: Consulta; medications: readonly Medicamento[];
  doses: readonly DoseLog[]; records: readonly RegistroSaude[];
  today: string; days?: number;
}) {
  const {owner, consultation:c} = input;
  const date = civil(c.data), today = civil(input.today);
  const span = Math.min(30, Math.max(1, Math.trunc(input.days ?? 7)));
  if (!owned(c, owner) || !c.id || !validDay(date) || !validDay(today)) {
    return {state:'unavailable' as const,reason:'Consulta, titular ou dia de referência não confirmado.',before:null,after:null,comparable:false};
  }
  if (c.status !== 'realizada' || date > today) {
    return {state:'unavailable' as const,reason:'Atendimento não confirmado como realizado ou registrado no futuro.',before:null,after:null,comparable:false};
  }
  const meds = new Set(input.medications.filter(m => m.id && owned(m, owner)).map(m => m.id!));
  const linked = new Set((c.medicamento_ids || []).filter(id => meds.has(id)));
  const beforeFrom = move(date, -span), beforeEnd = move(date,-1);
  const afterFrom = move(date,1), afterEnd = move(date,span);
  const cappedAfterEnd = afterEnd < today ? afterEnd : today;
  function summarize(from:string,through:string): ObservedWindowP6P2 {
    const sourceIds = new Set<string>();
    let confirmed = 0, ignored = 0, sosExtra = 0, observations = 0;
    if (from > through) return {from,through,confirmed,ignored,sosExtra,observations,evidenceRefs:[]};
    for (const d of input.doses) {
      if (!owned(d,owner) || !d.id || !linked.has(d.medicamento_id) || !validDay(civil(d.data)) || civil(d.data)<from || civil(d.data)>through || sourceIds.has(`dose:${d.id}`)) continue;
      sourceIds.add(`dose:${d.id}`);
      const timestamp = typeof d.tomado_em === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(d.tomado_em) ? Date.parse(d.tomado_em) : NaN;
      if (Number.isFinite(timestamp) && timestamp <= Date.now() && !d.ignorado_em) {confirmed++; if (d.dose_kind === 'sos' || d.dose_kind === 'extra') sosExtra++;}
      else if (d.ignorado_em && !d.tomado_em) ignored++;
    }
    for (const r of input.records) {
      if (!owned(r,owner) || !r.id || !r.medicamento_id || !linked.has(r.medicamento_id) || !validDay(civil(r.data)) || civil(r.data)<from || civil(r.data)>through || sourceIds.has(`record:${r.id}`)) continue;
      sourceIds.add(`record:${r.id}`);observations++;
    }
    return {from,through,confirmed,ignored,sosExtra,observations,evidenceRefs:[...sourceIds]};
  }
  if (!linked.size) return {state:'unavailable' as const,reason:'Consulta sem medicamentos explicitamente vinculados e válidos.',before:null,after:null,comparable:false};
  const before = summarize(beforeFrom,beforeEnd);
  const after = summarize(afterFrom,cappedAfterEnd);
  const complete = today >= afterEnd;
  return {state:'ready' as const,reason: complete ? null : 'Janela posterior ainda em andamento; nenhuma ausência foi inferida.',before,after,comparable:complete && before.evidenceRefs.length>0 && after.evidenceRefs.length>0,
    source:'consultation_explicit' as const,linkedMedicationCount:linked.size,
    limitation:'Os números descrevem registros e lacunas. Não comprovam efeito do atendimento, causalidade, diagnóstico ou adesão.'};
}
