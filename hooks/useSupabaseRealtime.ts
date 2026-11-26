"use client";

import { useEffect } from "react";
import { db } from "@/lib/db";
import {mergeTreatmentRemoteR03,refreshTreatmentVisualProjectionR03} from "@/lib/sync/treatment-visual-transport-r03";
import {readMacro02DoseReceipts} from "@/lib/sync/macro02-dose-receipts";
import { checkDoseIngress, canAcceptDoseDelete, verifyRemoteDoseReceipt } from "@/lib/dose-premium/ingress-guard";
import { recordPullTable } from "@/lib/sync/diagnostics";
import { supabase } from "@/lib/supabase/client";
import {vitalTable} from '@/lib/vital/cloud-transport';
import {mergeCanonicalVitalRealtime} from '@/lib/vital-runtime/canonical';

type Row = Record<string, unknown> & { id?: string; user_id?: string; updated_at?: string };
type LocalTable = {
  get(id: string): Promise<Row | undefined>;
  put(row: Row): Promise<unknown>;
  delete(id: string): Promise<void>;
};

const TABLES: Record<string, { local: string; queue: string }> = {
  fornecimentos: {local:"fornecimentos",queue:"fornecimentos"},
  fornecimento_ciclos: {local:"fornecimento_ciclos",queue:"fornecimento_ciclos"},
  fornecimento_itens: {local:"fornecimento_itens",queue:"fornecimento_itens"},
  fornecimento_documentos: {local:"fornecimento_documentos",queue:"fornecimento_documentos"},
  persons: { local: "persons", queue: "persons" },
  documents: { local: "documents", queue: "documents" },
  medicamentos: { local: "medicamentos", queue: "medicamentos" },
  tratamentos: { local: "tratamentos", queue: "tratamentos" },
  registros_saude: { local: "registros_saude", queue: "registros_saude" },
  health_reminders: { local: "health_reminders", queue: "health_reminders" },
  notification_policies_p2: {local:"notification_policies_p2",queue:"notification_policies_p2"},
  health_goals: { local: "health_goals", queue: "health_goals" },
  dose_logs: { local: "doseLogs", queue: "doseLogs" },
  medicos: { local: "medicos", queue: "medicos" },
  farmacias: { local: "farmacias", queue: "farmacias" },
  hospitais: { local: "hospitais", queue: "hospitais" },
  locais: { local: "locais", queue: "locais" },
  instituicoes: { local: "instituicoes", queue: "instituicoes" },
  cids: { local: "cids", queue: "cids" },
  exames: { local: "exames", queue: "exames" },
  consultas: { local: "consultas", queue: "consultas" },
  cirurgias: { local: "cirurgias", queue: "cirurgias" },
  renovacoes: { local: "renovacoes", queue: "renovacoes" },
  retiradas: { local: "retiradas", queue: "retiradas" },
  anexos_clinicos: { local: "anexos_clinicos", queue: "anexos_clinicos" },
  credentials: { local: "credentials", queue: "credentials" },
  cards: { local: "bankCards", queue: "cards" },
};

function normalize(table: string, row: Row): Row {
  if (table === "health_reminders") {
    return {
      ...row,
      time: typeof row.time === "string" ? row.time.slice(0, 5) : row.time,
      weekdays: Array.isArray(row.weekdays) ? row.weekdays.map(Number) : [],
      synced: true,
    };
  }
  if (table === "health_goals") {
    return { ...row, target_value: Number(row.target_value), synced: true };
  }
  if (table === "persons") {
    return { ...row, isDefault: row.is_default ?? row.isDefault, synced: true };
  }
  return { ...row, synced: true };
}

// VAULT_REALTIME_AUTH_REUSE_V85
// A identidade já restaurada pelo AuthProvider é a fonte do canal. Não fazemos
// outro getUser remoto nem instalamos um segundo listener global de autenticação.
export function useSupabaseRealtime(userId?: string) {
  useEffect(() => {
    if (!userId) return;

    let disposed = false;
    const channel = supabase
      .channel(`vault-user-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public" },
        async (payload) => {
          if (disposed) return;
          if(vitalTable(payload.table)){
            const incoming=(payload.new||{}) as Row;
            if(incoming.user_id!==userId||payload.eventType==='DELETE')return;
            try{await mergeCanonicalVitalRealtime(payload.table,userId,incoming,payload.eventType);}catch{ /* canonical full pull reports and preserves conflicts */ }
            return;
          }
          const config = TABLES[payload.table];
          if (!config) return;

          const incoming = (payload.new || {}) as Row;
          const previous = (payload.old || {}) as Row;
          const id = incoming.id || previous.id;
          if (!id) return;

          if(payload.table==="tratamentos"&&payload.eventType!=="DELETE"){
            if(incoming.user_id===userId&&!disposed){try{await mergeTreatmentRemoteR03(incoming,userId);}catch{console.warn("Tratamentos: revisão visual remota requer conferência no pull.");}}
            return;
          }

          const localTable = (db as unknown as Record<string, LocalTable>)[config.local];
          if (!localTable) return;

          const observed=payload.table==="dose_logs"?await localTable.get(id):undefined;
          const needsProof=payload.table==="dose_logs"&&!!observed&&observed.user_id===userId&&(payload.eventType==="DELETE"?!canAcceptDoseDelete(userId,observed):checkDoseIngress(userId,observed,incoming)==="review");
          const proof=needsProof?(await readMacro02DoseReceipts(userId,[id])).get(id):undefined;
          const merge = async () => {
          const local = await localTable.get(id);
          if (disposed) return;

          const owner = incoming.user_id || previous.user_id || local?.user_id;
          if (owner !== userId) return;

          const pending = await db.syncQueue
            .filter(
              (item) =>
                (item.table === config.queue && (item.payload as { id?: unknown })?.id === id)||
                (payload.table==='medicamentos'&&item.payload.macro02_atomic!==undefined&&item.payload.medicamento_id===id&&item.payload.user_id===userId)||
                (payload.table==='retiradas'&&item.payload.user_id===userId&&(item.payload.macro02_atomic as {withdrawalId?:string}|undefined)?.withdrawalId===id)
            )
            .first();

          if (disposed || pending || local?.synced === false) return;

          if (payload.eventType === "DELETE") {
            if (payload.table === "dose_logs" && !canAcceptDoseDelete(userId, local) && !verifyRemoteDoseReceipt(userId,local,null,proof)) {
              if (local) recordPullTable("dose_logs", 0, false);
              return;
            }
            await localTable.delete(id);
            return;
          }

          if (
            local?.updated_at &&
            incoming.updated_at &&
            Date.parse(local.updated_at) > Date.parse(incoming.updated_at)
          ) {
            return;
          }

          if (payload.table === "dose_logs" && checkDoseIngress(userId, local, incoming) === "review" && !verifyRemoteDoseReceipt(userId,local,incoming,proof)) {
            recordPullTable("dose_logs", 0, false);
            return;
          }
          if (!disposed) await localTable.put(normalize(payload.table, incoming));
          };
          if (payload.table === "dose_logs") {
            try { await db.transaction("rw", [db.doseLogs, db.syncQueue], merge); }
            catch { recordPullTable("dose_logs", 0, false); }
          } else if(payload.table==='medicamentos'||payload.table==='retiradas'){try{await db.transaction('rw',[payload.table==='medicamentos'?db.medicamentos:db.retiradas,db.syncQueue],merge);}catch{recordPullTable('medicamentos',0,false);}}else await merge();
        }
      )
      .subscribe();

    // Treatment visual projection is not published by the current Realtime configuration.
    // No extra subscription or broad publication. One bounded foreground refresh at most
    // every 90 s, with a 120 s active-app cadence; the initial full pull remains canonical.
    let refreshingVisual=false;
    let lastVisualAttempt=-Infinity;
    const refreshVisual=()=>{
      if(disposed||refreshingVisual||!navigator.onLine||document.visibilityState!=='visible')return;
      if(performance.now()-lastVisualAttempt<90_000)return;
      lastVisualAttempt=performance.now();refreshingVisual=true;
      void refreshTreatmentVisualProjectionR03(supabase,userId,()=>!disposed&&navigator.onLine&&document.visibilityState==='visible')
        .catch(()=>{if(!disposed)console.warn('Tratamentos: atualização visual pendente.');})
        .finally(()=>{refreshingVisual=false;});
    };
    window.addEventListener('focus',refreshVisual);
    window.addEventListener('online',refreshVisual);
    document.addEventListener('visibilitychange',refreshVisual);
    const visualTimer=window.setInterval(refreshVisual,120_000);
    return () => {
      disposed = true;
      window.removeEventListener('focus',refreshVisual);
      window.removeEventListener('online',refreshVisual);
      document.removeEventListener('visibilitychange',refreshVisual);
      window.clearInterval(visualTimer);
      void supabase.removeChannel(channel);
    };
  }, [userId]);
}
