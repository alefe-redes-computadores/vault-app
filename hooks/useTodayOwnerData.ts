"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

// M18: missing/loading owner rows share one inert identity across renders.
// Account/person switches still fail closed while the indexed query refreshes.
const EMPTY_TODAY_ROWS: never[] = [];

/** Owner-scoped reads for Hoje. Day-bound tables stay indexed by selected date. */
export function useTodayOwnerData(input: {
  userId?: string;
  personId?: string | null;
  date: string;
}) {
  const { userId, personId, date } = input;
  // M64: owner-level records do not change when navigating between dates.
  // Keep independent Dexie subscriptions so date changes only reload day rows.
  const ownerData = useLiveQuery(async () => {
    if (!userId || !personId) return null;
    const owner = [userId, personId] as [string, string];
    const [tratamentos, renovacoes, medicos, farmacias, hospitais] = await Promise.all([
      db.tratamentos.where("[user_id+person_id]").equals(owner).toArray(),
      db.renovacoes.where("[user_id+person_id]").equals(owner).toArray(),
      db.medicos.where("[user_id+person_id]").equals(owner).toArray(),
      db.farmacias.where("[user_id+person_id]").equals(owner).toArray(),
      db.hospitais.where("[user_id+person_id]").equals(owner).toArray(),
    ]);
    return { userId, personId, tratamentos, renovacoes, medicos, farmacias, hospitais };
  }, [userId, personId]);

  const dayData = useLiveQuery(async () => {
    if (!userId || !personId) return null;
    const day = [userId, personId, date] as [string, string, string];
    const [consultasHoje, cirurgiasHoje, examesHoje, registrosHoje] = await Promise.all([
      db.consultas.where("[user_id+person_id+data]").equals(day).toArray(),
      db.cirurgias.where("[user_id+person_id+data]").equals(day).toArray(),
      db.exames.where("[user_id+person_id+data]").equals(day).toArray(),
      db.registros_saude.where("[user_id+person_id+data]").equals(day).toArray(),
    ]);
    return { userId, personId, date, consultasHoje, cirurgiasHoje, examesHoje, registrosHoje };
  }, [userId, personId, date]);

  const historyData = useLiveQuery(async () => {
    if (!userId || !personId) return null;
    return { userId, personId, rows: await db.doseLogs
      .where("[user_id+person_id]").equals([userId, personId]).toArray() };
  }, [userId, personId]);

  // A stale Dexie result for another owner/date must never reach this view.
  const ownerReady = Boolean(userId && personId && ownerData?.userId === userId &&
    ownerData.personId === personId);
  const dayReady = Boolean(userId && personId && dayData?.userId === userId &&
    dayData.personId === personId && dayData.date === date);
  const ready = ownerReady && dayReady;
  const historyReady = Boolean(userId && personId && historyData?.userId === userId &&
    historyData.personId === personId);
  return {
    ready,
    historyReady,
    tratamentos: ready ? ownerData!.tratamentos : EMPTY_TODAY_ROWS,
    renovacoes: ready ? ownerData!.renovacoes : EMPTY_TODAY_ROWS,
    medicos: ready ? ownerData!.medicos : EMPTY_TODAY_ROWS,
    farmacias: ready ? ownerData!.farmacias : EMPTY_TODAY_ROWS,
    hospitais: ready ? ownerData!.hospitais : EMPTY_TODAY_ROWS,
    consultasHoje: ready ? dayData!.consultasHoje : EMPTY_TODAY_ROWS,
    cirurgiasHoje: ready ? dayData!.cirurgiasHoje : EMPTY_TODAY_ROWS,
    examesHoje: ready ? dayData!.examesHoje : EMPTY_TODAY_ROWS,
    registrosHoje: ready ? dayData!.registrosHoje : EMPTY_TODAY_ROWS,
    historicoDosesCompleto: historyReady ? historyData!.rows : EMPTY_TODAY_ROWS,
  };
}
