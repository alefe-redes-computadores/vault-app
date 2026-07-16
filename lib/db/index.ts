import Dexie, { type Table } from "dexie";
import type { VaultDocument, SyncQueueItem, Profile } from "@/lib/types";

class VaultDB extends Dexie {
  documents!: Table<VaultDocument, number>;
  syncQueue!: Table<SyncQueueItem, number>;
  profiles!: Table<Profile, number>;

  constructor() {
    super("vault-db");
    this.version(1).stores({
      documents:
        "++id, profileId, areaId, category, title, documentDate, expiryDate, synced, isFavorite, createdAt",
      syncQueue: "++id, table, operation, createdAt",
      profiles: "++id, name, createdAt",
    });
  }
}

export const db = new VaultDB();

/**
 * Inicializa perfis padrão se não existirem
 */
export async function initDefaultProfiles() {
  const count = await db.profiles.count();
  if (count === 0) {
    const now = new Date().toISOString();
    const defaultProfiles = [
      { name: "Eu", icon: "👤", createdAt: now },
      { name: "Mãe", icon: "👩", createdAt: now },
      { name: "Pai", icon: "👨", createdAt: now },
      { name: "Filha", icon: "👧", createdAt: now },
      { name: "Filho", icon: "👦", createdAt: now },
    ];
    await db.profiles.bulkAdd(defaultProfiles);
  }
}

/**
 * safeAdd / safeUpdate / safeDelete
 * Padrão local-first: toda escrita vai primeiro pro Dexie, dentro de
 * uma transação atômica, e depois entra na fila de sincronização.
 */

function nowIso() {
  return new Date().toISOString();
}

export async function safeAdd(
  doc: Omit<VaultDocument, "id" | "createdAt" | "updatedAt" | "synced">
): Promise<number> {
  const timestamp = nowIso();
  const fullDoc: VaultDocument = {
    ...doc,
    synced: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return db.transaction("rw", db.documents, db.syncQueue, async () => {
    const id = await db.documents.add(fullDoc);
    await db.syncQueue.add({
      table: "documents",
      operation: "add",
      payload: { ...fullDoc, id },
      createdAt: timestamp,
    });
    return id;
  });
}

export async function safeUpdate(
  id: number,
  changes: Partial<VaultDocument>
): Promise<void> {
  const timestamp = nowIso();

  await db.transaction("rw", db.documents, db.syncQueue, async () => {
    await db.documents.update(id, { ...changes, updatedAt: timestamp, synced: false });
    const updated = await db.documents.get(id);
    await db.syncQueue.add({
      table: "documents",
      operation: "update",
      payload: { id, ...updated },
      createdAt: timestamp,
    });
  });
}

export async function safeDelete(id: number): Promise<void> {
  const timestamp = nowIso();

  await db.transaction("rw", db.documents, db.syncQueue, async () => {
    await db.documents.delete(id);
    await db.syncQueue.add({
      table: "documents",
      operation: "delete",
      payload: { id },
      createdAt: timestamp,
    });
  });
}

export async function toggleFavorite(id: number): Promise<void> {
  const doc = await db.documents.get(id);
  if (!doc) return;
  await safeUpdate(id, { isFavorite: !doc.isFavorite });
}