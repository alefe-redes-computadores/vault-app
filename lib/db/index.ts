import Dexie, { type Table } from 'dexie';
import type { Person, Document, SyncQueueItem, CategoryId } from '@/lib/types';

class VaultDB extends Dexie {
  persons!: Table<Person, number>;
  documents!: Table<Document, number>;
  syncQueue!: Table<SyncQueueItem, number>;

  constructor() {
    super('vault-db');
    this.version(2).stores({
      persons: '++id, user_id, name, synced, created_at',
      documents: '++id, person_id, category_id, type, title, is_favorite, synced, created_at',
      syncQueue: '++id, table, operation, created_at',
    });
  }
}

export const db = new VaultDB();

// ============================================================
// OPERAÇÕES ATÔMICAS (safeAdd / safeUpdate / safeDelete)
// ============================================================
function nowIso() {
  return new Date().toISOString();
}

export async function safeAddPerson(
  person: Omit<Person, 'id' | 'created_at' | 'updated_at' | 'synced'>
): Promise<number> {
  const timestamp = nowIso();
  const full: Person = {
    ...person,
    synced: false,
    created_at: timestamp,
    updated_at: timestamp,
  };

  return db.transaction('rw', db.persons, db.syncQueue, async () => {
    const id = await db.persons.add(full);
    await db.syncQueue.add({
      table: 'persons',
      operation: 'add',
      payload: { ...full, id },
      created_at: timestamp,
    });
    return id;
  });
}

export async function safeAddDocument(
  doc: Omit<Document, 'id' | 'created_at' | 'updated_at' | 'synced'>
): Promise<number> {
  const timestamp = nowIso();
  const full: Document = {
    ...doc,
    synced: false,
    created_at: timestamp,
    updated_at: timestamp,
  };

  return db.transaction('rw', db.documents, db.syncQueue, async () => {
    const id = await db.documents.add(full);
    await db.syncQueue.add({
      table: 'documents',
      operation: 'add',
      payload: { ...full, id },
      created_at: timestamp,
    });
    return id;
  });
}

export async function safeUpdateDocument(
  id: number,
  changes: Partial<Document>
): Promise<void> {
  const timestamp = nowIso();

  await db.transaction('rw', db.documents, db.syncQueue, async () => {
    await db.documents.update(id, { ...changes, updated_at: timestamp, synced: false });
    const updated = await db.documents.get(id);
    await db.syncQueue.add({
      table: 'documents',
      operation: 'update',
      payload: { id, ...updated },
      created_at: timestamp,
    });
  });
}

export async function safeDeleteDocument(id: number): Promise<void> {
  const timestamp = nowIso();

  await db.transaction('rw', db.documents, db.syncQueue, async () => {
    await db.documents.delete(id);
    await db.syncQueue.add({
      table: 'documents',
      operation: 'delete',
      payload: { id },
      created_at: timestamp,
    });
  });
}

export async function toggleFavorite(id: number): Promise<void> {
  const doc = await db.documents.get(id);
  if (!doc) return;
  await safeUpdateDocument(id, { is_favorite: !doc.is_favorite });
}