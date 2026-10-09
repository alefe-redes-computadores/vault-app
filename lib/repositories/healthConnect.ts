import { db } from "@/lib/db";
import { getLocalFirstAuthUser } from "@/lib/supabase/local-auth";
import { enfileirarOperacao, solicitarProcessamentoSync } from "@/lib/sync/enfileirarOperacao";
import { normalizeRegistroSaudeFields } from "@/lib/health-records";
import { CONNECT_METRICS, type ConnectConnection, type ConnectRecord } from "@/lib/health-connect/types";
import { normalizeConnectRecord } from "@/lib/health-connect/normalize";
import type { RegistroSaude } from "@/lib/types";
async function owner() {
  const { data, error } = await getLocalFirstAuthUser();
  if (error || !data.user) throw new Error("Entre na sua conta para conectar os dados.");
  return data.user.id;
}
export async function saveConnectConnection(input: Pick<ConnectConnection,"person_id"|"types"|"device_ids"|"auto_sync">) {
  const uid = await owner();
  const types = [...new Set(input.types)];
  if (!types.length || types.some(t => !CONNECT_METRICS.includes(t))) throw new Error("Selecione os dados que deseja importar.");
  const row: ConnectConnection = { ...input, types, device_ids: Object.fromEntries(types.filter(type => input.device_ids[type]).map(type => [type,input.device_ids[type]])), id: uid, user_id: uid, revision: crypto.randomUUID(), last_synced: null, last_error: null };
  await db.transaction("rw", [db.persons,db.health_devices,db.health_connect_connections],async () => {
    const person = await db.persons.get(input.person_id);
    if (person?.user_id !== uid) throw new Error("Pessoa não pertence à conta atual.");
    for (const [type,id] of Object.entries(row.device_ids)) {
      if (!id) continue;
      const d = await db.health_devices.get(id);
      if (!d || d.user_id !== uid || d.person_id !== input.person_id || !d.active || !d.capabilities.includes(type as any)) throw new Error("Confira o aparelho relacionado à medida.");
    }
    await db.health_connect_connections.put(row);
  });
  return row;
}
export async function disconnectHealthConnect() {
  const uid = await owner();
  await db.health_connect_connections.delete(uid);
}
/** The ledger prevents deleted imports from returning on a later scan. No health data is written to Android. */
export async function importConnectRecords(connection: ConnectConnection, raw: ConnectRecord[]) {
  if (await owner() !== connection.user_id) throw new Error("A conta mudou durante a leitura.");
  if (raw.length > 6000) throw new Error("Muitos dados recebidos. Reduza o período de importação.");
  const seen = new Set<string>();
  let invalid = 0;
  const normalized = raw.flatMap(r => {
    try {
      if (!connection.types.includes(r.type)) throw new Error("Tipo não autorizado.");
      const record = normalizeConnectRecord(r);
      if (seen.has(record.source_record_id)) return [];
      seen.add(record.source_record_id); return [record];
    } catch { invalid++; return []; }
  });
  // Stable UUIDs also survive a fresh local cache before the remote pull finishes.
  const ids = new Map(await Promise.all(normalized.map(async n => {
    const bytes = await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify([connection.user_id,connection.person_id,n.source_record_id])));
    const hex = Array.from(new Uint8Array(bytes)).map(v=>v.toString(16).padStart(2,"0")).join("").slice(0,32).split("");
    hex[12]="8";hex[16]=((parseInt(hex[16],16)&3)|8).toString(16);
    const h=hex.join("");return [n.source_record_id,`${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`] as const;
  })));
  if (await owner() !== connection.user_id) throw new Error("A conta mudou durante a preparação dos dados.");
  let added = 0, updated = 0, duplicate = 0, deleted = 0;
  const stamp = new Date().toISOString();
  await db.transaction("rw", [db.persons,db.health_devices,db.registros_saude,db.syncQueue,db.health_connect_connections,db.health_connect_imports],async () => {
    const fresh = await db.health_connect_connections.get(connection.id);
    const person = await db.persons.get(connection.person_id);
    if (fresh?.revision !== connection.revision || person?.user_id !== connection.user_id) throw new Error("O vínculo mudou durante a leitura. Tente novamente.");
    const rows = (await db.registros_saude.where("person_id").equals(connection.person_id).toArray()).filter(r => r.user_id === connection.user_id);
    for (const n of normalized) {
      const key = JSON.stringify([connection.user_id,connection.person_id,n.source_record_id]);
      const ledger = await db.health_connect_imports.get(key);
      const existing = rows.find(r => r.source === "health_connect" && r.source_record_id === n.source_record_id);
      if (ledger && !existing) { deleted++; continue; }
      const sameInterval = !existing && n.inicio_em && rows.find(r => r.tipo === n.tipo && r.inicio_em && r.fim_em && Date.parse(r.inicio_em) === Date.parse(n.inicio_em!) && Date.parse(r.fim_em) === Date.parse(n.fim_em!));
      const sameMeasure = !existing && !n.inicio_em && rows.find(r => r.tipo === n.tipo && r.data === n.data && r.horario === n.horario && r.valor_medicao === n.valor_medicao && (n.nome !== "Batimentos · média diária" || r.nome === n.nome));
      const match = sameInterval || sameMeasure;
      if (match) {
        duplicate++;
        await db.health_connect_imports.put({id:key,user_id:connection.user_id,person_id:connection.person_id,record_id:match.id!});
        continue;
      }
      let deviceId = connection.device_ids[n.tipo];
      if (deviceId) {
        const d = await db.health_devices.get(deviceId);
        if (!d || d.user_id !== connection.user_id || d.person_id !== connection.person_id || !d.active || !d.capabilities.includes(n.tipo)) deviceId = undefined;
      }
      const fields = { ...n, observacoes: existing?.observacoes ?? n.observacoes };
      const row: RegistroSaude = { ...existing, ...fields, ...normalizeRegistroSaudeFields(fields), id: existing?.id || ids.get(n.source_record_id)!, user_id:connection.user_id,person_id:connection.person_id,source:"health_connect",device_id:existing ? existing.device_id : deviceId || null,created_at:existing?.created_at || stamp,updated_at:stamp,synced:false };
      const changed = !existing || Object.entries(n).some(([k,v]) => k !== "observacoes" && ((existing as any)[k] ?? null) !== (v ?? null));
      if (changed) {
        await db.registros_saude.put(row);
        await enfileirarOperacao("registros_saude",existing ? "update" : "add",row,{dispatchSync:false});
        if (existing) { updated++; rows[rows.indexOf(existing)] = row; } else { added++; rows.push(row); }
      } else duplicate++;
      await db.health_connect_imports.put({id:key,user_id:connection.user_id,person_id:connection.person_id,record_id:row.id!});
    }
    await db.health_connect_connections.update(connection.id,{last_synced:stamp,last_error:invalid ? `${invalid} registro(s) fora do contrato foram ignorados.` : null});
  });
  if (added || updated) solicitarProcessamentoSync();
  return { added,updated,duplicate,deleted,invalid };
}
