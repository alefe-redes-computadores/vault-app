import type { Farmacia, LocalSaude, Medicamento, Renovacao, Retirada } from "@/lib/types";

/**
 * A3 P1: purely factual read model. Never persists, mutates stock or creates clinical events.
 * Records are joined strictly by owned IDs; a medication link is NOT a cycle-level link.
 */
export type SupplyContinuityKindA3 =
  | "prescription"
  | "acquisition"
  | "legacy_uncertain"
  | "withdrawal_scheduled"
  | "withdrawal_realized"
  | "withdrawal_cancelled"
  | "withdrawal_not_realized";

export type SupplyContinuityEventA3 = {
  key: string;
  source: "renovacoes" | "retiradas";
  id: string;
  medicationId: string;
  medicationName: string;
  kind: SupplyContinuityKindA3;
  date: string;
  pharmacyName: string | null;
  locationName: string | null;
  /** Each historical event stores the location ID; displayed name is current directory data. */
  pharmacyId: string | null;
  locationId: string | null;
  linkedWithdrawalId: string | null;
  quantity: number | null;
  href: string;
};

export type SupplyContinuityInputA3 = {
  userId: string;
  personId: string;
  medicationIds: ReadonlySet<string>;
  medications: readonly Medicamento[];
  renewals: readonly Renovacao[];
  withdrawals: readonly Retirada[];
  pharmacies: readonly Farmacia[];
  places: readonly LocalSaude[];
  today: string;
};

const validDay = (value: string | null | undefined): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(`${value}T12:00:00Z`)) &&
  new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;

/** User-scoped directory lookup. Unknown IDs must never resolve to another account. */
export function projectSupplyContinuityA3(input: SupplyContinuityInputA3) {
  const {userId, personId, medicationIds, medications, renewals, withdrawals, pharmacies, places, today} = input;
  const events: SupplyContinuityEventA3[] = [];
  const own = (row: {user_id: string; person_id?: string | null}) =>
    !!userId && !!personId && row.user_id === userId && row.person_id === personId;
  if (!userId || !personId || !medicationIds.size) {
    return {events, prescriptions: 0, acquisitions: 0, realizedWithdrawals: 0,
      scheduledWithdrawals: 0, overdueWithdrawals: 0, uncertainLegacy: 0, nextScheduled: null as SupplyContinuityEventA3 | null};
  }
  const medicationById = new Map(medications.filter(m => !!m.id && own(m)).map(m => [m.id!,m]));
  const pharmacyById = new Map(pharmacies.filter(p => !!p.id && p.user_id === userId).map(p => [p.id!,p.nome]));
  const placeById = new Map(places.filter(p => !!p.id && p.user_id === userId).map(p => [p.id!,p.nome]));
  const sourceWithdrawalByReceiptId = new Map<string, string>();
  const seen = new Set<string>();
  const safeId = (value: string | null | undefined): string | null => typeof value === "string" && value.trim() ? value : null;
  const label = (mid: string, snapshot?: string | null) =>
    snapshot?.trim() || medicationById.get(mid)?.nome?.trim() || "Medicamento sem identificação disponível";
  const loc = (id: string | null, map: Map<string,string>) => id ? (map.get(id) || null) : null;
  for (const w of withdrawals) {
    if (!own(w) || !medicationIds.has(w.medicamento_id)) continue;
    if (w.status === "realizada" && w.renovacao_realizada_id && w.id) sourceWithdrawalByReceiptId.set(w.renovacao_realizada_id,w.id);
  }
  for (const r of renewals) {
    if (!r.id || !own(r) || !medicationIds.has(r.medicamento_id) || !validDay(r.data)) continue;
    const acquired = validDay(r.data_aquisicao) && typeof r.quantidade === "number" && Number.isFinite(r.quantidade) && r.quantidade > 0;
    const onlyPrescription = r.data_aquisicao === null && r.quantidade == null && !r.tipo_aquisicao;
    const kind: SupplyContinuityKindA3 = acquired ? "acquisition" : onlyPrescription ? "prescription" : "legacy_uncertain";
    const day = acquired ? r.data_aquisicao! : r.data;
    const key = `renovacoes:${r.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const pharmacyId=safeId(r.farmacia_id), locationId=safeId(r.local_id);
    events.push({key, source:"renovacoes", id:r.id,medicationId:r.medicamento_id,
      medicationName:label(r.medicamento_id,r.medicamento_nome),kind,date:day,
      pharmacyId,locationId,pharmacyName:loc(pharmacyId,pharmacyById),locationName:loc(locationId,placeById),
      linkedWithdrawalId:sourceWithdrawalByReceiptId.get(r.id)||null,
      quantity:acquired?r.quantidade!:null,
      href:`/saude/renovacao/detalhes?id=${encodeURIComponent(r.id)}`});
  }
  for (const r of withdrawals) {
    if (!r.id || !own(r) || !medicationIds.has(r.medicamento_id) || !validDay(r.data)) continue;
    const kind: SupplyContinuityKindA3 = r.status === "realizada" ? "withdrawal_realized" :
      r.status === "cancelada" ? "withdrawal_cancelled" :
      r.status === "nao_realizada" ? "withdrawal_not_realized" : "withdrawal_scheduled";
    const key = `retiradas:${r.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const pharmacyId=safeId(r.farmacia_id),locationId=safeId(r.local_id);
    events.push({key,source:"retiradas",id:r.id,medicationId:r.medicamento_id,
      medicationName:label(r.medicamento_id,r.medicamento_nome),kind,date:r.data,
      pharmacyId,locationId,pharmacyName:loc(pharmacyId,pharmacyById),locationName:loc(locationId,placeById),
      linkedWithdrawalId:null,quantity:typeof r.quantidade_retirada === "number" && r.quantidade_retirada >= 0 ? r.quantidade_retirada : null,
      href:`/saude/retiradas/detalhes?id=${encodeURIComponent(r.id)}`});
  }
  events.sort((a,b)=>b.date.localeCompare(a.date)||a.source.localeCompare(b.source)||a.id.localeCompare(b.id));
  const scheduled = events.filter(e=>e.kind==="withdrawal_scheduled");
  // Missing today's date cannot turn scheduled into overdue.
  const overdue = validDay(today) ? scheduled.filter(e=>e.date<today).length : 0;
  const nextScheduled = (validDay(today) ? scheduled.filter(e=>e.date>=today) : scheduled)
    .slice().sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id))[0] || null;
  return {
    events,
    prescriptions:events.filter(e=>e.kind==="prescription").length,
    acquisitions:events.filter(e=>e.kind==="acquisition" && !e.linkedWithdrawalId).length,
    realizedWithdrawals:events.filter(e=>e.kind==="withdrawal_realized").length,
    scheduledWithdrawals:scheduled.length,
    overdueWithdrawals:overdue,
    uncertainLegacy:events.filter(e=>e.kind==="legacy_uncertain").length,
    nextScheduled,
  };
}
