"use client";

import { useEffect } from "react";
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase/client";

type Row = Record<string, unknown> & { id?: string; user_id?: string; updated_at?: string };
type LocalTable = { get(id: string): Promise<Row | undefined>; put(row: Row): Promise<unknown>; delete(id: string): Promise<void> };
const TABLES: Record<string, { local: string; queue: string }> = {
  persons:{local:"persons",queue:"persons"}, documents:{local:"documents",queue:"documents"}, medicamentos:{local:"medicamentos",queue:"medicamentos"},
  tratamentos:{local:"tratamentos",queue:"tratamentos"}, registros_saude:{local:"registros_saude",queue:"registros_saude"}, health_reminders:{local:"health_reminders",queue:"health_reminders"},
  health_goals:{local:"health_goals",queue:"health_goals"}, dose_logs:{local:"doseLogs",queue:"doseLogs"}, medicos:{local:"medicos",queue:"medicos"}, farmacias:{local:"farmacias",queue:"farmacias"},
  hospitais:{local:"hospitais",queue:"hospitais"}, locais:{local:"locais",queue:"locais"}, instituicoes:{local:"instituicoes",queue:"instituicoes"}, cids:{local:"cids",queue:"cids"},
  exames:{local:"exames",queue:"exames"}, consultas:{local:"consultas",queue:"consultas"}, cirurgias:{local:"cirurgias",queue:"cirurgias"}, renovacoes:{local:"renovacoes",queue:"renovacoes"},
  retiradas:{local:"retiradas",queue:"retiradas"}, anexos_clinicos:{local:"anexos_clinicos",queue:"anexos_clinicos"}, credentials:{local:"credentials",queue:"credentials"}, cards:{local:"bankCards",queue:"cards"},
};

function normalize(table: string, row: Row): Row {
  if (table === "health_reminders") return { ...row, time: typeof row.time === "string" ? row.time.slice(0,5) : row.time, weekdays: Array.isArray(row.weekdays) ? row.weekdays.map(Number) : [], synced:true };
  if (table === "health_goals") return { ...row, target_value:Number(row.target_value), synced:true };
  if (table === "persons") return { ...row, isDefault: row.is_default ?? row.isDefault, synced:true };
  return { ...row, synced:true };
}

export function useSupabaseRealtime() {
  useEffect(() => {
    let disposed=false;
    let channel: ReturnType<typeof supabase.channel> | undefined;
    void supabase.auth.getUser().then(({data}) => {
      const user=data.user;
      if (!user || disposed) return;
      channel=supabase.channel(`vault-user-${user.id}`).on("postgres_changes", {event:"*",schema:"public"}, async payload => {
        const config=TABLES[payload.table];
        if (!config) return;
        const incoming=(payload.new || {}) as Row;
        const previous=(payload.old || {}) as Row;
        const id=incoming.id || previous.id;
        if (!id) return;
        const localTable=(db as unknown as Record<string, LocalTable>)[config.local];
        if (!localTable) return;
        const local=await localTable.get(id);
        const owner=incoming.user_id || previous.user_id || local?.user_id;
        if (owner !== user.id) return;
        const pending=await db.syncQueue.filter(item => item.table === config.queue && (item.payload as {id?:unknown})?.id === id).first();
        if (pending || local?.synced === false) return;
        if (payload.eventType === "DELETE") { await localTable.delete(id); return; }
        if (local?.updated_at && incoming.updated_at && Date.parse(local.updated_at) > Date.parse(incoming.updated_at)) return;
        await localTable.put(normalize(payload.table, incoming));
      }).subscribe();
    }).catch(error => console.error("[Realtime] Falha ao iniciar canal seguro:", error));
    return () => { disposed=true; if (channel) void supabase.removeChannel(channel); };
  }, []);
}
