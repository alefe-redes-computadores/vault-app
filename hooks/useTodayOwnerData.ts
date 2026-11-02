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
  const dayData = useLiveQuery(async () => {
    if (!userId || !personId) return null;
    const owner = [userId, personId] as [string, string];
    const day = [userId, personId, date] as [string, string, string];
    const [tratamentos, renovacoes, medicos, farmacias, hospitais,
      consultasHoje, cirurgiasHoje, examesHoje, registrosHoje] = await Promise.all([
      db.tratamentos.where("[user_id+person_id]").equals(owner).toArray(),
      db.renovacoes.where("[user_id+person_id]").equals(owner).toArray(),
      db.medicos.where("[user_id+person_id]").equals(owner).toArray(),
      db.farmacias.where("[user_id+person_id]").equals(owner).toArray(),
      db.hospitais.where("[user_id+person_id]").equals(owner).toArray(),
      db.consultas.where("[user_id+person_id+data]").equals(day).toArray(),
      db.cirurgias.where("[user_id+person_id+data]").equals(day).toArray(),
      db.exames.where("[user_id+person_id+data]").equals(day).toArray(),
      db.registros_saude.where("[user_id+person_id+data]").equals(day).toArray(),
    ]);
    return { userId, personId, date, tratamentos, renovacoes, medicos, farmacias,
      hospitais, consultasHoje, cirurgiasHoje, examesHoje, registrosHoje };
  }, [userId, personId, date]);

  const historyData = useLiveQuery(async () => {
    if (!userId || !personId) return null;
    return { userId, personId, rows: await db.doseLogs
      .where("[user_id+person_id]").equals([userId, personId]).toArray() };
  }, [userId, personId]);

  const ready = Boolean(userId && personId && dayData?.userId === userId &&
    dayData.personId === personId && dayData.date === date);
  const historyReady = Boolean(userId && personId && historyData?.userId === userId &&
    historyData.personId === personId);
  return {
    ready,
    historyReady,
    tratamentos: ready ? dayData!.tratamentos : EMPTY_TODAY_ROWS,
    renovacoes: ready ? dayData!.renovacoes : EMPTY_TODAY_ROWS,
    medicos: ready ? dayData!.medicos : EMPTY_TODAY_ROWS,
    farmacias: ready ? dayData!.farmacias : EMPTY_TODAY_ROWS,
    hospitais: ready ? dayData!.hospitais : EMPTY_TODAY_ROWS,
    consultasHoje: ready ? dayData!.consultasHoje : EMPTY_TODAY_ROWS,
    cirurgiasHoje: ready ? dayData!.cirurgiasHoje : EMPTY_TODAY_ROWS,
    examesHoje: ready ? dayData!.examesHoje : EMPTY_TODAY_ROWS,
    registrosHoje: ready ? dayData!.registrosHoje : EMPTY_TODAY_ROWS,
    historicoDosesCompleto: historyReady ? historyData!.rows : EMPTY_TODAY_ROWS,
  };
}
