"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

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
    tratamentos: ready ? dayData!.tratamentos : [],
    renovacoes: ready ? dayData!.renovacoes : [],
    medicos: ready ? dayData!.medicos : [],
    farmacias: ready ? dayData!.farmacias : [],
    hospitais: ready ? dayData!.hospitais : [],
    consultasHoje: ready ? dayData!.consultasHoje : [],
    cirurgiasHoje: ready ? dayData!.cirurgiasHoje : [],
    examesHoje: ready ? dayData!.examesHoje : [],
    registrosHoje: ready ? dayData!.registrosHoje : [],
    historicoDosesCompleto: historyReady ? historyData!.rows : [],
  };
}
