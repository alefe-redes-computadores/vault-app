"use client";
// V234: catch-up de doses recentes ao voltar ao PWA; não requer reconciliação manual.
// Sem alteração de estoque, sem regravação remota e sem atualização destrutiva.
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase/client";
import type { DoseLog } from "@/lib/types";

let running: Promise<number> | null = null;
let runningUser: string | null = null;

function earliestDate(): string {
  const today = new Date();
  today.setDate(today.getDate() - 14);
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

export async function refreshRecentCloudDoses(userId: string): Promise<number> {
  if (!userId) throw new Error("Atualização de doses exige conta autenticada.");
  if (running) {
    if (runningUser !== userId) throw new Error("Outra conta possui atualização em andamento.");
    return running;
  }
  runningUser = userId;
  running = (async () => {
    const rows: DoseLog[] = [];
    const pageSize = 300;
    let completed = false;
    const earliest = earliestDate();
    // Limite explícito; se for alcançado, não anunciar dados incompletos como completos.
    for (let offset = 0; offset < 30000; offset += pageSize) {
      const response = await supabase.from("dose_logs").select("*")
        .eq("user_id", userId).gte("data", earliest)
        .order("id", { ascending: true }).range(offset, offset + pageSize - 1);
      if (response.error) throw new Error(`Não foi possível atualizar doses: ${response.error.message}`);
      const batch = (response.data ?? []) as DoseLog[];
      rows.push(...batch);
      if (batch.length < pageSize) { completed = true; break; }
    }
    if (!completed) throw new Error("Atualização de doses excedeu o limite de páginas.");
    let imported = 0;
    await db.transaction("rw", db.doseLogs, db.syncQueue, async () => {
      // Nunca sobrepor tomada pendente, mesmo que ainda não tenha marcado synced=false.
      const queued = await db.syncQueue.filter(item => item.table === "doseLogs").toArray();
      const queuedIds = new Set(queued.map(item => {
        const data = item.payload as {id?: unknown} | null;
        return typeof data?.id === "string" ? data.id : null;
      }).filter((id): id is string => !!id));
      const incoming = rows.filter(row => row.id && row.user_id === userId && row.person_id && row.medicamento_id);
      const previous = await db.doseLogs.bulkGet(incoming.map(row => row.id!));
      const writes: DoseLog[] = [];
      for (let i = 0; i < incoming.length; i++) {
        const remote = incoming[i];
        const local = previous[i];
        if (queuedIds.has(remote.id!)) continue;
        if (local?.synced === false) continue;
        if (local && local.user_id !== userId) continue;
        const localTime = Date.parse(local?.updated_at || "");
        const remoteTime = Date.parse(remote.updated_at || "");
        if (Number.isFinite(localTime) && Number.isFinite(remoteTime) && localTime > remoteTime) continue;
        writes.push({ ...remote, synced: true });
      }
      if (writes.length) { await db.doseLogs.bulkPut(writes); imported = writes.length; }
    });
    return imported;
  })();
  try { return await running; }
  finally { running = null; runningUser = null; }
}
