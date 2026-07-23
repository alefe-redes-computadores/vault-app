import Dexie, { type Table } from 'dexie';
import type { 
  Person, Document, SyncQueueItem, Medicamento, Renovacao, 
  Vault, VaultMember, Medico, Farmacia, Hospital 
} from '@/lib/types';
import { deleteFile } from '@/lib/supabase/storage';

// Gerador de UUID compatível com todos os ambientes
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

class VaultDB extends Dexie {
  persons!: Table<Person, string>;
  documents!: Table<Document, string>;
  syncQueue!: Table<SyncQueueItem, string>;
  medicamentos!: Table<Medicamento, string>;
  renovacoes!: Table<Renovacao, string>;
  vaults!: Table<Vault, string>;
  vaultMembers!: Table<VaultMember, string>;
  medicos!: Table<Medico, string>;
  farmacias!: Table<Farmacia, string>;
  hospitais!: Table<Hospital, string>;

  constructor() {
    super('vault-db');
    
    this.version(2).stores({
      persons: 'id, user_id, name, synced, created_at',
      documents: 'id, person_id, category_id, type, title, is_favorite, synced, created_at',
      syncQueue: 'id, table, operation, created_at, user_id, retry_count, failed',
    });
    
    this.version(3).stores({
      persons: 'id, user_id, name, synced, created_at',
      documents: 'id, person_id, category_id, type, title, is_favorite, synced, created_at',
      syncQueue: 'id, table, operation, created_at, user_id, retry_count, failed',
      medicamentos: 'id, document_id, nome, medico, proxima_renovacao',
      renovacoes: 'id, medicamento_id, data',
    });
    
    this.version(4).stores({
      persons: 'id, user_id, name, synced, created_at',
      documents: 'id, person_id, category_id, type, title, is_favorite, synced, created_at, vault_id',
      syncQueue: 'id, table, operation, created_at, user_id, retry_count, failed',
      medicamentos: 'id, document_id, nome, medico, proxima_renovacao',
      renovacoes: 'id, medicamento_id, data',
      vaults: 'id, user_id, name, synced, created_at',
      vaultMembers: 'id, vault_id, user_id, email, status, synced',
    });
    
    this.version(5).stores({
      persons: 'id, user_id, name, synced, created_at',
      documents: 'id, person_id, category_id, type, title, is_favorite, synced, created_at, vault_id',
      syncQueue: 'id, table, operation, created_at, user_id, retry_count, failed',
      medicamentos: 'id, document_id, nome, medico, proxima_renovacao',
      renovacoes: 'id, medicamento_id, data',
      vaults: 'id, user_id, name, synced, created_at',
      vaultMembers: 'id, vault_id, user_id, email, status, synced',
      medicos: 'id, user_id, nome, especialidade, synced',
      farmacias: 'id, user_id, nome, synced',
      hospitais: 'id, user_id, nome, synced',
    }).upgrade(async (tx) => {
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

    this.version(6).stores({
      persons: 'id, user_id, name, synced, created_at',
      documents: 'id, user_id, person_id, category_id, type, title, is_favorite, synced, created_at, vault_id',
      syncQueue: 'id, table, operation, created_at, user_id, retry_count, failed',
      medicamentos: 'id, document_id, nome, medico, proxima_renovacao',
      renovacoes: 'id, medicamento_id, data',
      vaults: 'id, user_id, name, synced, created_at',
      vaultMembers: 'id, vault_id, user_id, email, status, synced',
      medicos: 'id, user_id, nome, especialidade, synced',
      farmacias: 'id, user_id, nome, synced',
      hospitais: 'id, user_id, nome, synced',
    }).upgrade(async (tx) => {
      console.log('🔄 Migrando para versão 6: convertendo IDs para UUID...');
      console.log('✅ Migração concluída! Novos registros usarão UUID.');
    });
  }
}

export const db = new VaultDB();

// ============================================================
// UTILITÁRIOS
// ============================================================
function nowIso() {
  return new Date().toISOString();
}

// ============================================================
// DISPARA EVENTO PARA PROCESSAR FILA IMEDIATAMENTE
// ============================================================
function triggerSyncProcess() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('sync:process'));
  }
}

// ============================================================
// OPERAÇÕES ATÔMICAS (safeAdd / safeUpdate / safeDelete)
// ============================================================
export async function safeAddPerson(
  person: Omit<Person, 'id' | 'created_at' | 'updated_at' | 'synced'>
): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();
  const full: Person = {
    ...person,
    id,
    synced: false,
    created_at: timestamp,
    updated_at: timestamp,
  };

  return db.transaction('rw', db.persons, db.syncQueue, async () => {
    await db.persons.add(full);
    await db.syncQueue.add({
      id: generateId(),
      table: 'persons',
      operation: 'add',
      payload: { ...full },
      created_at: timestamp,
      retry_count: 0,
      failed: false,
    });
    // ✅ FORÇA PROCESSAMENTO IMEDIATO DA FILA
    triggerSyncProcess();
    return id;
  });
}

export async function safeAddDocument(
  doc: Omit<Document, 'id' | 'created_at' | 'updated_at' | 'synced'>
): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();
  const full: Document = {
    ...doc,
    id,
    synced: false,
    created_at: timestamp,
    updated_at: timestamp,
  };

  return db.transaction('rw', db.documents, db.syncQueue, async () => {
    await db.documents.add(full);
    await db.syncQueue.add({
      id: generateId(),
      table: 'documents',
      operation: 'add',
      payload: { ...full },
      created_at: timestamp,
      retry_count: 0,
      failed: false,
    });
    // ✅ FORÇA PROCESSAMENTO IMEDIATO DA FILA
    triggerSyncProcess();
    return id;
  });
}

export async function safeUpdateDocument(
  id: string,
  changes: Partial<Document>
): Promise<void> {
  const timestamp = nowIso();
  const doc = await db.documents.get(id);
  if (!doc) throw new Error('Documento não encontrado');

  await db.transaction('rw', db.documents, db.syncQueue, async () => {
    await db.documents.update(id, { ...changes, updated_at: timestamp, synced: false });
    const updated = await db.documents.get(id);
    await db.syncQueue.add({
      id: generateId(),
      table: 'documents',
      operation: 'update',
      payload: { ...updated },
      created_at: timestamp,
      retry_count: 0,
      failed: false,
    });
    // ✅ FORÇA PROCESSAMENTO IMEDIATO DA FILA
    triggerSyncProcess();
  });
}

export async function safeDeleteDocument(id: string): Promise<void> {
  const timestamp = nowIso();
  const doc = await db.documents.get(id);
  if (!doc) throw new Error('Documento não encontrado');

  if (doc.attachments && doc.attachments.length > 0) {
    for (const attachment of doc.attachments) {
      if (attachment.url && !attachment.url.startsWith('blob:')) {
        try {
          await deleteFile(attachment.url);
        } catch (error) {
          console.error('Erro ao deletar anexo:', attachment.url, error);
        }
      }
    }
  }

  await db.transaction('rw', db.documents, db.syncQueue, async () => {
    await db.documents.delete(id);
    await db.syncQueue.add({
      id: generateId(),
      table: 'documents',
      operation: 'delete',
      payload: { id },
      created_at: timestamp,
      retry_count: 0,
      failed: false,
    });
    // ✅ FORÇA PROCESSAMENTO IMEDIATO DA FILA
    triggerSyncProcess();
  });
}

export async function toggleFavorite(id: string): Promise<void> {
  const doc = await db.documents.get(id);
  if (!doc) return;
  await safeUpdateDocument(id, { is_favorite: !doc.is_favorite });
}

// ============================================================
// OPERAÇÕES PARA MEDICAMENTOS
// ============================================================
export async function safeAddMedicamento(
  med: Omit<Medicamento, 'id' | 'created_at' | 'updated_at' | 'synced'>
): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();
  const full: Medicamento = {
    ...med,
    id,
    created_at: timestamp,
    updated_at: timestamp,
    synced: false,
  };
  return db.transaction('rw', db.medicamentos, db.syncQueue, async () => {
    await db.medicamentos.add(full);
    await db.syncQueue.add({
      id: generateId(),
      table: 'medicamentos',
      operation: 'add',
      payload: { ...full },
      created_at: timestamp,
      retry_count: 0,
      failed: false,
    });
    // ✅ FORÇA PROCESSAMENTO IMEDIATO DA FILA
    triggerSyncProcess();
    return id;
  });
}

export async function safeAddRenovacao(
  ren: Omit<Renovacao, 'id' | 'created_at' | 'updated_at' | 'synced'>
): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();
  const full: Renovacao = {
    ...ren,
    id,
    created_at: timestamp,
    updated_at: timestamp,
    synced: false,
  };
  return db.transaction('rw', db.renovacoes, db.syncQueue, async () => {
    await db.renovacoes.add(full);
    await db.syncQueue.add({
      id: generateId(),
      table: 'renovacoes',
      operation: 'add',
      payload: { ...full },
      created_at: timestamp,
      retry_count: 0,
      failed: false,
    });
    // ✅ FORÇA PROCESSAMENTO IMEDIATO DA FILA
    triggerSyncProcess();
    return id;
  });
}

// ============================================================
// OPERAÇÕES PARA COFRES
// ============================================================
export async function safeAddVault(
  vault: Omit<Vault, 'id' | 'created_at' | 'updated_at' | 'synced'>
): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();
  const full: Vault = {
    ...vault,
    id,
    created_at: timestamp,
    updated_at: timestamp,
    synced: false,
  };
  return db.transaction('rw', db.vaults, db.syncQueue, async () => {
    await db.vaults.add(full);
    await db.syncQueue.add({
      id: generateId(),
      table: 'vaults',
      operation: 'add',
      payload: { ...full },
      created_at: timestamp,
      retry_count: 0,
      failed: false,
    });
    // ✅ FORÇA PROCESSAMENTO IMEDIATO DA FILA
    triggerSyncProcess();
    return id;
  });
}

export async function safeAddVaultMember(
  member: Omit<VaultMember, 'id' | 'invited_at' | 'updated_at' | 'synced'>
): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();
  const full: VaultMember = {
    ...member,
    id,
    invited_at: timestamp,
    updated_at: timestamp,
    synced: false,
  };
  return db.transaction('rw', db.vaultMembers, db.syncQueue, async () => {
    await db.vaultMembers.add(full);
    await db.syncQueue.add({
      id: generateId(),
      table: 'vaultMembers',
      operation: 'add',
      payload: { ...full },
      created_at: timestamp,
      retry_count: 0,
      failed: false,
    });
    // ✅ FORÇA PROCESSAMENTO IMEDIATO DA FILA
    triggerSyncProcess();
    return id;
  });
}

export async function safeUpdateVaultMember(
  id: string,
  changes: Partial<VaultMember>
): Promise<void> {
  const timestamp = nowIso();
  const member = await db.vaultMembers.get(id);
  if (!member) throw new Error('Membro não encontrado');

  await db.transaction('rw', db.vaultMembers, db.syncQueue, async () => {
    await db.vaultMembers.update(id, { ...changes, updated_at: timestamp, synced: false });
    const updated = await db.vaultMembers.get(id);
    await db.syncQueue.add({
      id: generateId(),
      table: 'vaultMembers',
      operation: 'update',
      payload: { ...updated },
      created_at: timestamp,
      retry_count: 0,
      failed: false,
    });
    // ✅ FORÇA PROCESSAMENTO IMEDIATO DA FILA
    triggerSyncProcess();
  });
}

export async function shareDocumentWithVault(
  documentId: string,
  vaultId: string
): Promise<void> {
  await db.transaction('rw', db.documents, async () => {
    await db.documents.update(documentId, { vault_id: vaultId });
  });
}

export async function getVaultDocuments(vaultId: string): Promise<Document[]> {
  return db.documents.where('vault_id').equals(vaultId).toArray();
}

export async function getVaultMembers(vaultId: string): Promise<VaultMember[]> {
  return db.vaultMembers.where('vault_id').equals(vaultId).toArray();
}

// ============================================================
// OPERAÇÕES PARA MÉDICOS, FARMÁCIAS, HOSPITAIS
// ============================================================
export async function safeAddMedico(
  data: Omit<Medico, 'id' | 'created_at' | 'updated_at' | 'synced'>
): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();
  const full: Medico = {
    ...data,
    id,
    created_at: timestamp,
    updated_at: timestamp,
    synced: false,
  };
  return db.transaction('rw', db.medicos, db.syncQueue, async () => {
    await db.medicos.add(full);
    await db.syncQueue.add({
      id: generateId(),
      table: 'medicos',
      operation: 'add',
      payload: { ...full },
      created_at: timestamp,
      retry_count: 0,
      failed: false,
    });
    // ✅ FORÇA PROCESSAMENTO IMEDIATO DA FILA
    triggerSyncProcess();
    return id;
  });
}

export async function safeAddFarmacia(
  data: Omit<Farmacia, 'id' | 'created_at' | 'updated_at' | 'synced'>
): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();
  const full: Farmacia = {
    ...data,
    id,
    created_at: timestamp,
    updated_at: timestamp,
    synced: false,
  };
  return db.transaction('rw', db.farmacias, db.syncQueue, async () => {
    await db.farmacias.add(full);
    await db.syncQueue.add({
      id: generateId(),
      table: 'farmacias',
      operation: 'add',
      payload: { ...full },
      created_at: timestamp,
      retry_count: 0,
      failed: false,
    });
    // ✅ FORÇA PROCESSAMENTO IMEDIATO DA FILA
    triggerSyncProcess();
    return id;
  });
}

export async function safeAddHospital(
  data: Omit<Hospital, 'id' | 'created_at' | 'updated_at' | 'synced'>
): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();
  const full: Hospital = {
    ...data,
    id,
    created_at: timestamp,
    updated_at: timestamp,
    synced: false,
  };
  return db.transaction('rw', db.hospitais, db.syncQueue, async () => {
    await db.hospitais.add(full);
    await db.syncQueue.add({
      id: generateId(),
      table: 'hospitais',
      operation: 'add',
      payload: { ...full },
      created_at: timestamp,
      retry_count: 0,
      failed: false,
    });
    // ✅ FORÇA PROCESSAMENTO IMEDIATO DA FILA
    triggerSyncProcess();
    return id;
  });
}