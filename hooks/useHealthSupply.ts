"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useActivePersonId } from "./useActivePersonId";
import { useAuth } from "./useAuth";
import type { SupplyData } from "@/lib/health-supply/types";
export function useHealthSupply() {
  const { activePersonId } = useActivePersonId(),
    { user } = useAuth();
  const data = useLiveQuery(async (): Promise<SupplyData> => {
    if (!activePersonId || !user?.id)
      return { processos: [], ciclos: [], itens: [], documentos: [] };
    const [processos, ciclos, itens, documentos] = await Promise.all([
      db.fornecimentos.where("person_id").equals(activePersonId).toArray(),
      db.fornecimento_ciclos
        .where("person_id")
        .equals(activePersonId)
        .toArray(),
      db.fornecimento_itens.where("person_id").equals(activePersonId).toArray(),
      db.fornecimento_documentos
        .where("person_id")
        .equals(activePersonId)
        .toArray(),
    ]);
    const scoped = <T extends { user_id: string }>(rows: T[]) =>
      rows.filter((x) => x.user_id === user.id);
    return {
      processos: scoped(processos),
      ciclos: scoped(ciclos),
      itens: scoped(itens),
      documentos: scoped(documentos),
    };
  }, [activePersonId, user?.id]);
  return {
    data: data ?? { processos: [], ciclos: [], itens: [], documentos: [] },
    loading: data === undefined,
    personId: activePersonId,
  };
}
