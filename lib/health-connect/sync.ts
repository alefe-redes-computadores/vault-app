"use client";
import { db } from "@/lib/db";
import { getLocalFirstAuthUser } from "@/lib/supabase/local-auth";
import { healthConnectBridge, connectAvailable } from "./bridge";
import { importConnectRecords } from "@/lib/repositories/healthConnect";
import type { ConnectSyncRun } from "./types";
const flights = new Map<string,Promise<Awaited<ReturnType<typeof importConnectRecords>>>>();
const COOLDOWN_MS = 600000;
export async function syncHealthConnect(uid: string, personId: string, automatic = false) {
  if (!connectAvailable()) throw new Error("Instale o APK atualizado para conectar o Samsung Health.");
  const connection = await db.health_connect_connections.get(uid);
  if (!connection || connection.person_id !== personId) throw new Error("Confirme o vínculo desta pessoa em Minha saúde.");
  const lastAttempt = Date.parse(connection.last_attempt_at || connection.last_synced || "");
  if (automatic && (!connection.auto_sync || (Number.isFinite(lastAttempt) && Date.now() - lastAttempt < COOLDOWN_MS))) return null;
  // Recheck after async IndexedDB read: foreground event and button share one flight.
  if (flights.has(uid)) return flights.get(uid)!;
  const promise = (async () => {
    const startedAt = new Date().toISOString(), runId = crypto.randomUUID();
    try {
      await db.transaction("rw", db.health_connect_connections, async () => {
        const fresh = await db.health_connect_connections.get(uid);
        if (fresh?.revision !== connection.revision) throw new Error("O vínculo mudou antes da leitura. Tente novamente.");
        await db.health_connect_connections.update(uid, {
          last_attempt_at: startedAt,
          sync_history: [{ id: runId, started_at: startedAt, status: "running" as const }, ...(fresh.sync_history || []).map(run => run.status === "running" ? { ...run, completed_at: startedAt, status: "error" as const, error: "Interrompida antes de concluir; esta tentativa foi retomada." } : run)].slice(0, 10),
        });
      });
      const response = await healthConnectBridge.read({types:connection.types,days:28});
      if (!response.granted.some(t => connection.types.includes(t))) throw new Error("Autorize ao menos um tipo de dado no Health Connect.");
      const result = await importConnectRecords(connection,response.records);
      const completedAt = new Date().toISOString();
      await db.transaction("rw", db.health_connect_connections, async () => {
        const fresh = await db.health_connect_connections.get(uid);
        if (fresh?.revision === connection.revision) {
          await db.health_connect_connections.update(uid, {
            sync_history: (fresh.sync_history || []).map(run => run.id === runId ? { ...run, ...result, completed_at: completedAt, status: "success" } : run),
          });
        }
      });
      if (connection.types.some(t => !response.granted.includes(t))) {
        await db.transaction("rw",db.health_connect_connections,async () => {
          if ((await db.health_connect_connections.get(uid))?.revision === connection.revision) await db.health_connect_connections.update(uid,{last_error:"Algumas permissões não estão ativas. A leitura incluiu apenas os tipos autorizados."});
        });
      }
      return result;
    } catch(error) {
      const message = error instanceof Error ? error.message : "Não foi possível sincronizar.";
      const completedAt = new Date().toISOString();
      const auth = await getLocalFirstAuthUser();
      if (auth.data.user?.id === uid) await db.transaction("rw",db.health_connect_connections,async () => {
        const fresh = await db.health_connect_connections.get(uid);
        if (fresh?.revision === connection.revision) {
          await db.health_connect_connections.update(uid, {
            last_error: message,
            sync_history: (fresh.sync_history || []).map(run => run.id === runId ? { ...run, completed_at: completedAt, status: "error", error: message } : run),
          });
        }
      });
      throw error;
    } finally { flights.delete(uid); }
  })();
  flights.set(uid,promise);
  return promise;
}
