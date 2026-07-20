import Dexie, { type Table } from 'dexie';
import type { Person, Document, SyncQueueItem, Medicamento, Renovacao, Vault, VaultMember, Medico, Farmacia, Hospital } from '@/lib/types';

class VaultDB extends Dexie {
  persons!: Table<Person, number>;
  documents!: Table<Document, number>;
  syncQueue!: Table<SyncQueueItem, number>;
  medicamentos!: Table<Medicamento, number>;
  renovacoes!: Table<Renovacao, number>;
  vaults!: Table<Vault, number>;
  vaultMembers!: Table<VaultMember, number>;
  medicos!: Table<Medico, number>;
  farmacias!: Table<Farmacia, number>;
  hospitais!: Table<Hospital, number>;

  constructor() {
    super('vault-db');
    
    // Versão 2
    this.version(2).stores({
      persons: '++id, user_id, name, synced, created_at',
      documents: '++id, person_id, category_id, type, title, is_favorite, synced, created_at',
      syncQueue: '++id, table, operation, created_at',
    });
    
    // Versão 3 - Medicamentos e Renovações
    this.version(3).stores({
      persons: '++id, user_id, name, synced, created_at',
      documents: '++id, person_id, category_id, type, title, is_favorite, synced, created_at',
      syncQueue: '++id, table, operation, created_at',
      medicamentos: '++id, document_id, nome, medico, proxima_renovacao',
      renovacoes: '++id, medicamento_id, data',
    });
    
    // Versão 4 - Cofres
    this.version(4).stores({
      persons: '++id, user_id, name, synced, created_at',
      documents: '++id, person_id, category_id, type, title, is_favorite, synced, created_at, vault_id',
      syncQueue: '++id, table, operation, created_at',
      medicamentos: '++id, document_id, nome, medico, proxima_renovacao',
      renovacoes: '++id, medicamento_id, data',
      vaults: '++id, user_id, name, synced, created_at',
      vaultMembers: '++id, vault_id, user_id, email, status, synced',
    });
    
    // Versão 5 - Médicos, Farmácias, Hospitais
    this.version(5).stores({
      persons: '++id, user_id, name, synced, created_at',
      documents: '++id, person_id, category_id, type, title, is_favorite, synced, created_at, vault_id',
      syncQueue: '++id, table, operation, created_at, user_id',
      medicamentos: '++id, document_id, nome, medico, proxima_renovacao',
      renovacoes: '++id, medicamento_id, data',
      vaults: '++id, user_id, name, synced, created_at',
      vaultMembers: '++id, vault_id, user_id, email, status, synced',
      medicos: '++id, user_id, nome, especialidade, synced',
      farmacias: '++id, user_id, nome, synced',
      hospitais: '++id, user_id, nome, synced',
    }).upgrade(async (tx) => {
      // Inicializar synced para registros existentes
      await tx.table('medicos').toCollection().modify((item: any) => {
        if (!item.synced) item.synced = true;
      });
      await tx.table('farmacias').toCollection().modify((item: any) => {
        if (!item.synced) item.synced = true;
      });
      await tx.table('hospitais').toCollection().modify((item: any) => {
        if (!item.synced) item.synced = true;
      });
    });

    // ============================================================
    // VERSÃO 6 - CORRIGE ÍNDICE user_id EM documents
    // ============================================================
    this.version(6).stores({
      persons: '++id, user_id, name, synced, created_at',
      documents: '++id, user_id, person_id, category_id, type, title, is_favorite, synced, created_at, vault_id', // ← ADICIONADO user_id
      syncQueue: '++id, table, operation, created_at, user_id',
      medicamentos: '++id, document_id, nome, medico, proxima_renovacao',
      renovacoes: '++id, medicamento_id, data',
      vaults: '++id, user_id, name, synced, created_at',
      vaultMembers: '++id, vault_id, user_id, email, status, synced',
      medicos: '++id, user_id, nome, especialidade, synced',
      farmacias: '++id, user_id, nome, synced',
      hospitais: '++id, user_id, nome, synced',
    }).upgrade(async (tx) => {
      // Não precisa modificar dados, apenas adicionar o índice
      console.log('🔄 Atualizando banco para versão 6 (adicionando índice user_id em documents)');
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
      payload: { ...full, id, user_id: full.user_id },
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

// ============================================================
// OPERAÇÕES PARA MEDICAMENTOS
// ============================================================
export async function safeAddMedicamento(
  med: Omit<Medicamento, 'id' | 'created_at' | 'updated_at' | 'synced'>
): Promise<number> {
  const timestamp = nowIso();
  const full: Medicamento = {
    ...med,
    created_at: timestamp,
    updated_at: timestamp,
    synced: false,
  };
  return db.transaction('rw', db.medicamentos, db.syncQueue, async () => {
    const id = await db.medicamentos.add(full);
    await db.syncQueue.add({
      table: 'medicamentos',
      operation: 'add',
      payload: { ...full, id },
      created_at: timestamp,
    });
    return id;
  });
}

export async function safeAddRenovacao(
  ren: Omit<Renovacao, 'id' | 'created_at' | 'updated_at' | 'synced'>
): Promise<number> {
  const timestamp = nowIso();
  const full: Renovacao = {
    ...ren,
    created_at: timestamp,
    updated_at: timestamp,
    synced: false,
  };
  return db.transaction('rw', db.renovacoes, db.syncQueue, async () => {
    const id = await db.renovacoes.add(full);
    await db.syncQueue.add({
      table: 'renovacoes',
      operation: 'add',
      payload: { ...full, id },
      created_at: timestamp,
    });
    return id;
  });
}

// ============================================================
// OPERAÇÕES PARA COFRES FAMILIARES
// ============================================================
export async function safeAddVault(
  vault: Omit<Vault, 'id' | 'created_at' | 'updated_at' | 'synced'>
): Promise<number> {
  const timestamp = nowIso();
  const full: Vault = {
    ...vault,
    created_at: timestamp,
    updated_at: timestamp,
    synced: false,
  };
  return db.transaction('rw', db.vaults, db.syncQueue, async () => {
    const id = await db.vaults.add(full);
    await db.syncQueue.add({
      table: 'vaults',
      operation: 'add',
      payload: { ...full, id, user_id: full.user_id },
      created_at: timestamp,
    });
    return id;
  });
}

export async function safeAddVaultMember(
  member: Omit<VaultMember, 'id' | 'invited_at' | 'updated_at' | 'synced'>
): Promise<number> {
  const timestamp = nowIso();
  const full: VaultMember = {
    ...member,
    invited_at: timestamp,
    updated_at: timestamp,
    synced: false,
  };
  return db.transaction('rw', db.vaultMembers, db.syncQueue, async () => {
    const id = await db.vaultMembers.add(full);
    await db.syncQueue.add({
      table: 'vaultMembers',
      operation: 'add',
      payload: { ...full, id },
      created_at: timestamp,
    });
    return id;
  });
}

export async function safeUpdateVaultMember(
  id: number,
  changes: Partial<VaultMember>
): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.vaultMembers, db.syncQueue, async () => {
    await db.vaultMembers.update(id, { ...changes, updated_at: timestamp, synced: false });
    const updated = await db.vaultMembers.get(id);
    await db.syncQueue.add({
      table: 'vaultMembers',
      operation: 'update',
      payload: { id, ...updated },
      created_at: timestamp,
    });
  });
}

export async function shareDocumentWithVault(
  documentId: number,
  vaultId: number
): Promise<void> {
  await db.transaction('rw', db.documents, async () => {
    await db.documents.update(documentId, { vault_id: vaultId });
  });
}

export async function getVaultDocuments(vaultId: number): Promise<Document[]> {
  return db.documents.where('vault_id').equals(vaultId).toArray();
}

export async function getVaultMembers(vaultId: number): Promise<VaultMember[]> {
  return db.vaultMembers.where('vault_id').equals(vaultId).toArray();
}

// ============================================================
// OPERAÇÕES PARA MÉDICOS, FARMÁCIAS, HOSPITAIS
// ============================================================
export async function safeAddMedico(
  data: Omit<Medico, 'id' | 'created_at' | 'updated_at' | 'synced'>
): Promise<number> {
  const timestamp = nowIso();
  const full: Medico = {
    ...data,
    created_at: timestamp,
    updated_at: timestamp,
    synced: false,
  };
  return db.transaction('rw', db.medicos, db.syncQueue, async () => {
    const id = await db.medicos.add(full);
    await db.syncQueue.add({
      table: 'medicos',
      operation: 'add',
      payload: { ...full, id, user_id: full.user_id },
      created_at: timestamp,
    });
    return id;
  });
}

export async function safeAddFarmacia(
  data: Omit<Farmacia, 'id' | 'created_at' | 'updated_at' | 'synced'>
): Promise<number> {
  const timestamp = nowIso();
  const full: Farmacia = {
    ...data,
    created_at: timestamp,
    updated_at: timestamp,
    synced: false,
  };
  return db.transaction('rw', db.farmacias, db.syncQueue, async () => {
    const id = await db.farmacias.add(full);
    await db.syncQueue.add({
      table: 'farmacias',
      operation: 'add',
      payload: { ...full, id, user_id: full.user_id },
      created_at: timestamp,
    });
    return id;
  });
}

export async function safeAddHospital(
  data: Omit<Hospital, 'id' | 'created_at' | 'updated_at' | 'synced'>
): Promise<number> {
  const timestamp = nowIso();
  const full: Hospital = {
    ...data,
    created_at: timestamp,
    updated_at: timestamp,
    synced: false,
  };
  return db.transaction('rw', db.hospitais, db.syncQueue, async () => {
    const id = await db.hospitais.add(full);
    await db.syncQueue.add({
      table: 'hospitais',
      operation: 'add',
      payload: { ...full, id, user_id: full.user_id },
      created_at: timestamp,
    });
    return id;
  });
}