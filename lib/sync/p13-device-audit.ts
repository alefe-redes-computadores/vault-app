"use client";
/** P13 R2 — auditoria multiaparelho, somente leitura. Nunca modifica doses, estoque ou fila. */
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase/client";
import type { DoseLog, SyncQueueItem } from "@/lib/types";

export interface DeviceDoseAudit {
  checkedAt: string;
  local: number;
  cloud: number;
  onlyLocal: number;
  onlyCloud: number;
  divergent: number;
  pendingLocal: number;
  same: number;
}

type DoseSnapshot = Pick<DoseLog, "id" | "user_id" | "person_id" | "medicamento_id" | "data" | "horario" | "tomado_em" | "ignorado_em" | "quantidade" | "dose_kind" | "motivo">;

/** Comparação clínica; `synced` é metadado local, jamais uma divergência. */
function signature(row: DoseSnapshot): string {
  return JSON.stringify([
    row.person_id || "", row.medicamento_id, row.data, row.horario,
    row.tomado_em || null, row.ignorado_em || null,
    row.quantidade == null ? null : Number(row.quantidade),
    row.dose_kind || null, row.motivo || null,
  ]);
}

export function compareDeviceDoses(
  local: DoseLog[], remote: DoseLog[], queue: SyncQueueItem[],
  userId: string, personId: string,
): Omit<DeviceDoseAudit, "checkedAt"> {
  if (!userId.trim() || !personId.trim()) throw new Error("Conta e pessoa obrigatórias.");
  const scoped = (row: DoseLog) => row.user_id === userId && row.person_id === personId && typeof row.id === "string" && !!row.id;
  const localScoped = local.filter(scoped);
  const remoteScoped = remote.filter(scoped);
  const localMap = new Map(localScoped.map(row => [row.id!, row]));
  const remoteMap = new Map(remoteScoped.map(row => [row.id!, row]));
  const queuedIds = new Set(queue.filter(item =>
    item.table === "doseLogs" &&
    item.payload?.user_id === userId && item.payload?.person_id === personId &&
    typeof item.payload?.id === "string",
  ).map(item => String(item.payload.id)));
  let onlyLocal = 0, onlyCloud = 0, divergent = 0, pendingLocal = 0, same = 0;
  for (const [id, row] of localMap) {
    const cloud = remoteMap.get(id);
    if (queuedIds.has(id) || row.synced === false) { pendingLocal++; continue; }
    if (!cloud) { onlyLocal++; continue; }
    if (signature(row) === signature(cloud)) same++;
    else divergent++;
  }
  for (const id of remoteMap.keys()) if (!localMap.has(id)) onlyCloud++;
  return {
    local: localMap.size, cloud: remoteMap.size,
    onlyLocal, onlyCloud, divergent, pendingLocal, same,
  };
}

const PAGE_SIZE = 300;
const MAX_PAGES = 100;
/** Janela de 14 dias, alinhada ao catch-up oficial já usado no PWA/APK. */
function earliestDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 14);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
let inFlight: Promise<DoseLog[]> | null = null;
let inFlightScope: string | null = null;

/** Mesmo escopo compartilha leitura; escopo diferente é recusado até o término. */
export function downloadDeviceDoses(userId: string, personId: string): Promise<DoseLog[]> {
  const user = userId.trim();
  const person = personId.trim();
  if (!user || !person) return Promise.reject(new Error("Conta e pessoa obrigatórias antes de consultar a nuvem."));
  const scope = JSON.stringify([user, person]);
  if (inFlight) {
    if (inFlightScope !== scope) return Promise.reject(new Error("Outra conta ou pessoa está em conferência."));
    return inFlight;
  }
  // A inicialização síncrona impede duas chamadas simultâneas ao mesmo escopo.
  inFlightScope = scope;
  const task = (async () => {
    const rows: DoseLog[] = [];
    const earliest = earliestDate();
    for (let page = 0; page < MAX_PAGES; page++) {
      const offset = page * PAGE_SIZE;
      const response = await supabase.from("dose_logs")
        .select("id,user_id,person_id,medicamento_id,data,horario,tomado_em,ignorado_em,quantidade,dose_kind,motivo,updated_at")
        .eq("user_id", user).eq("person_id", person).gte("data", earliest)
        .order("id", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);
      if (response.error) throw new Error(`Falha ao conferir doses na nuvem: ${response.error.message}`);
      const batch = (response.data || []) as DoseLog[];
      // Servidor/conta é autoridade de escopo; falhar fechado diante de retorno estranho.
      if (batch.some(row => row.user_id !== user || row.person_id !== person || !row.id)) {
        throw new Error("A consulta retornou doses fora da pessoa/conta autorizada.");
      }
      rows.push(...batch);
      if (batch.length < PAGE_SIZE) return rows;
    }
    throw new Error("Limite de 30 mil doses atingido. A conferência não é completa.");
  })();
  inFlight = task;
  void task.then(
    () => { if (inFlight === task) { inFlight = null; inFlightScope = null; } },
    () => { if (inFlight === task) { inFlight = null; inFlightScope = null; } },
  );
  return task;
}

/** Nenhum efeito colateral: somente leituras Dexie + Supabase. */
export async function inspectDeviceDoses(userId: string, personId: string): Promise<DeviceDoseAudit> {
  const user = userId.trim(), person = personId.trim();
  if (!user || !person) throw new Error("Conta e pessoa obrigatórias.");
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new Error("Conecte-se à internet para conferir a outra instalação.");
  }
  // Baixar primeiro; se falhar, não anunciar auditoria parcial.
  const remote = await downloadDeviceDoses(user, person);
  const earliest = earliestDate();
  const [local, queue] = await Promise.all([
    db.doseLogs.where("user_id").equals(user).filter(row => row.person_id === person && row.data >= earliest).toArray(),
    db.syncQueue.filter(item => item.table === "doseLogs" && item.payload?.user_id === user && item.payload?.person_id === person).toArray(),
  ]);
  return { checkedAt: new Date().toISOString(), ...compareDeviceDoses(local, remote, queue, user, person) };
}
