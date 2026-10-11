"use client";
import { db } from "@/lib/db";
import { getLocalFirstAuthUser } from "@/lib/supabase/local-auth";
import { healthConnectBridge, connectAvailable } from "./bridge";
import { importConnectRecords } from "@/lib/repositories/healthConnect";
const flights = new Map<string,Promise<Awaited<ReturnType<typeof importConnectRecords>>>>();
const attempts = new Map<string,number>();
export async function syncHealthConnect(uid: string, personId: string, automatic = false) {
  if (!connectAvailable()) throw new Error("Instale o APK atualizado para conectar o Samsung Health.");
  const connection = await db.health_connect_connections.get(uid);
  if (!connection || connection.person_id !== personId) throw new Error("Confirme o vínculo desta pessoa em Minha saúde.");
  if (automatic && (!connection.auto_sync || Date.now() - (attempts.get(uid) || Date.parse(connection.last_synced || "") || 0) < 600000)) return null;
  // Recheck after async IndexedDB read: foreground event and button share one flight.
  if (flights.has(uid)) return flights.get(uid)!;
  attempts.set(uid,Date.now());
  const promise = (async () => {
    try {
      const response = await healthConnectBridge.read({types:connection.types,days:28});
      if (!response.granted.some(t => connection.types.includes(t))) throw new Error("Autorize ao menos um tipo de dado no Health Connect.");
      const result = await importConnectRecords(connection,response.records);
      if (connection.types.some(t => !response.granted.includes(t))) {
        await db.transaction("rw",db.health_connect_connections,async () => {
          if ((await db.health_connect_connections.get(uid))?.revision === connection.revision) await db.health_connect_connections.update(uid,{last_error:"Algumas permissões não estão ativas. A leitura incluiu apenas os tipos autorizados."});
        });
      }
      return result;
    } catch(error) {
      const auth = await getLocalFirstAuthUser();
      if (auth.data.user?.id === uid) await db.transaction("rw",db.health_connect_connections,async () => {
        if ((await db.health_connect_connections.get(uid))?.revision === connection.revision) await db.health_connect_connections.update(uid,{last_error:error instanceof Error ? error.message : "Não foi possível sincronizar."});
      });
      throw error;
    } finally { flights.delete(uid); }
  })();
  flights.set(uid,promise);
  return promise;
}
