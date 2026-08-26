// hooks/useSupabaseRealtime.ts
"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase/client"; // 🛡️ Caminho correto do cliente Supabase
import { db } from "@/lib/db";

export function useSupabaseRealtime() {
  useEffect(() => {
    // Cria o canal de escuta para todo o schema 'public'
    const channel = supabase
      .channel("global-db-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public" },
        async (payload: { table: string; eventType: string; new: any; old: any }) => {
          const { table, eventType, new: newRecord, old: oldRecord } = payload;

          // 1. Verifica se a tabela que mudou na nuvem existe no nosso Dexie local
          const dexieTable = (db as Record<string, any>)[table];
          if (!dexieTable) return;

          try {
            console.log(`[Realtime] Recebido ${eventType} na tabela ${table}`);

            // 2. Aplica a mudança no Dexie local
            // A flag __isCloudUpdate é a nossa trava para o Anti-Eco
            (window as Record<string, any>).__isCloudUpdate = true; 

            if (eventType === "INSERT" || eventType === "UPDATE") {
              // Garante que o registro local já nasça com synced: true
              await dexieTable.put({ ...newRecord, synced: true });
            } else if (eventType === "DELETE") {
              if (oldRecord && oldRecord.id) {
                await dexieTable.delete(oldRecord.id);
              }
            }
          } catch (error) {
            console.error(`[Realtime] Erro ao sincronizar tabela ${table}:`, error);
          } finally {
            // Desliga a flag de nuvem após a operação
            (window as Record<string, any>).__isCloudUpdate = false;
          }
        }
      )
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          console.log("[Realtime] 🟢 Conectado ao Supabase Realtime!");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
