import Dexie, { type Table } from 'dexie';
import type { 
  Person, Document, SyncQueueItem, Medicamento, Renovacao, 
  Vault, VaultMember, Medico, Farmacia, Hospital, DoseLog,
  Credential, BankCard, InstituicaoEnsino, Tratamento
} from '@/lib/types';
import { deleteFile } from '@/lib/supabase/storage';

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
  doseLogs!: Table<DoseLog, string>;
  credentials!: Table<Credential, string>; 
  cards!: Table<BankCard, string>;         
  instituicoes!: Table<InstituicaoEnsino, string>; 
  tratamentos!: Table<Tratamento, string>;         

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
    }).upgrade(async () => {
      console.log('🔄 Migrando para versão 6...');
    });

    this.version(7).stores({
      persons: 'id, user_id, name, synced, created_at',
      documents: 'id, user_id, person_id, category_id, type, title, is_favorite, synced, created_at, vault_id',
      syncQueue: 'id, table, operation, created_at, user_id, retry_count, failed',
      medicamentos: null,
      renovacoes: null,
      vaults: 'id, user_id, name, synced, created_at',
      vaultMembers: 'id, vault_id, user_id, email, status, synced',
      medicos: 'id, user_id, nome, especialidade, synced',
      farmacias: 'id, user_id, nome, synced',
      hospitais: 'id, user_id, nome, synced',
    });

    this.version(8).stores({
      persons: 'id, user_id, name, synced, created_at',
      documents: 'id, user_id, person_id, category_id, type, title, is_favorite, synced, created_at, vault_id',
      syncQueue: 'id, table, operation, created_at, user_id, retry_count, failed',
      medicamentos: 'id, user_id, document_id, nome, medico, proxima_renovacao',
      renovacoes: 'id, user_id, medicamento_id, data',
      vaults: 'id, user_id, name, synced, created_at',
      vaultMembers: 'id, vault_id, user_id, email, status, synced',
      medicos: 'id, user_id, nome, especialidade, synced',
      farmacias: 'id, user_id, nome, synced',
      hospitais: 'id, user_id, nome, synced',
    }).upgrade(async () => {
      console.log('✅ v8: medicamentos e renovacoes recriadas com user_id indexado.');
    });

    this.version(9).stores({
      persons: 'id, user_id, name, synced, created_at',
      documents: 'id, user_id, person_id, category_id, type, title, is_favorite, synced, created_at, vault_id',
      syncQueue: 'id, table, operation, created_at, user_id, retry_count, failed',
      medicamentos: 'id, user_id, document_id, nome, medico, proxima_renovacao',
      renovacoes: 'id, user_id, medicamento_id, data',
      vaults: 'id, user_id, name, synced, created_at',
      vaultMembers: 'id, vault_id, user_id, email, status, synced',
      medicos: 'id, user_id, nome, especialidade, synced',
      farmacias: 'id, user_id, nome, synced',
      hospitais: 'id, user_id, nome, synced',
      doseLogs: 'id, user_id, medicamento_id, data, horario',
    }).upgrade(async () => {
      console.log('✅ v9: tabela doseLogs criada.');
    });

    this.version(10).stores({
      persons: 'id, user_id, name, synced, created_at',
      documents: 'id, user_id, person_id, category_id, type, title, is_favorite, synced, created_at, vault_id',
      syncQueue: 'id, table, operation, created_at, user_id, retry_count, failed',
      medicamentos: 'id, user_id, document_id, nome, medico, proxima_renovacao',
      renovacoes: 'id, user_id, medicamento_id, data',
      vaults: 'id, user_id, name, synced, created_at',
      vaultMembers: 'id, vault_id, user_id, email, status, synced',
      medicos: 'id, user_id, nome, especialidade, synced',
      farmacias: 'id, user_id, nome, synced',
      hospitais: 'id, user_id, nome, synced',
      doseLogs: 'id, user_id, medicamento_id, data, horario',
      credentials: 'id, user_id, vault_id, title, category, synced',
    }).upgrade(async () => {
      console.log('✅ v10: tabela de credenciais (senhas) adicionada.');
    });

    this.version(11).stores({
      persons: 'id, user_id, name, synced, created_at',
      documents: 'id, user_id, person_id, category_id, type, title, is_favorite, synced, created_at, vault_id',
      syncQueue: 'id, table, operation, created_at, user_id, retry_count, failed',
      medicamentos: 'id, user_id, document_id, nome, medico, proxima_renovacao',
      renovacoes: 'id, user_id, medicamento_id, data',
      vaults: 'id, user_id, name, synced, created_at',
      vaultMembers: 'id, vault_id, user_id, email, status, synced',
      medicos: 'id, user_id, nome, especialidade, synced',
      farmacias: 'id, user_id, nome, synced',
      hospitais: 'id, user_id, nome, synced',
      doseLogs: 'id, user_id, medicamento_id, data, horario',
      credentials: 'id, user_id, vault_id, title, category, synced',
      cards: 'id, user_id, title, bank_name, type, brand, synced',
    }).upgrade(async () => {
      console.log('✅ v11: tabela de cartões e contas (cards) adicionada.');
    });

    this.version(12).stores({
      persons: 'id, user_id, name, synced, created_at',
      documents: 'id, user_id, person_id, category_id, type, title, is_favorite, synced, created_at, vault_id',
      syncQueue: 'id, table, operation, created_at, user_id, retry_count, failed',
      medicamentos: 'id, user_id, document_id, nome, medico, proxima_renovacao, tratamento_id',
      renovacoes: 'id, user_id, medicamento_id, data',
      vaults: 'id, user_id, name, synced, created_at',
      vaultMembers: 'id, vault_id, user_id, email, status, synced',
      medicos: 'id, user_id, nome, especialidade, synced',
      farmacias: 'id, user_id, nome, synced',
      hospitais: 'id, user_id, nome, synced',
      doseLogs: 'id, user_id, medicamento_id, data, horario',
      credentials: 'id, user_id, vault_id, title, category, synced',
      cards: 'id, user_id, title, bank_name, type, brand, synced',
      instituicoes: 'id, user_id, nome, synced',
      tratamentos: 'id, user_id, nome, status, synced',
    }).upgrade(async () => {
      console.log('✅ v12: tabelas de Instituições e Tratamentos criadas.');
    });
  }
}

export const db = new VaultDB();

function nowIso() { return new Date().toISOString(); }
function triggerSyncProcess() { if (typeof window !== 'undefined') window.dispatchEvent(new Event('sync:process')); }

// (As funções CRUD continuam abaixo, mantendo as suas inalteradas conforme solicitado)
export async function safeAddPerson(person: Omit<Person, 'id' | 'created_at' | 'updated_at' | 'synced'>): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();
  const full: Person = { ...person, id, synced: false, created_at: timestamp, updated_at: timestamp };
  return db.transaction('rw', db.persons, db.syncQueue, async () => {
    await db.persons.add(full);
    await db.syncQueue.add({ id: generateId(), table: 'persons', operation: 'add', payload: { ...full }, created_at: timestamp, retry_count: 0, failed: false });
    triggerSyncProcess();
    return id;
  });
}

export async function safeAddDocument(doc: Omit<Document, 'id' | 'created_at' | 'updated_at' | 'synced'>): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();
  const full: Document = { ...doc, id, synced: false, created_at: timestamp, updated_at: timestamp };
  return db.transaction('rw', db.documents, db.syncQueue, async () => {
    await db.documents.add(full);
    await db.syncQueue.add({ id: generateId(), table: 'documents', operation: 'add', payload: { ...full }, created_at: timestamp, retry_count: 0, failed: false });
    triggerSyncProcess();
    return id;
  });
}

export async function safeUpdateDocument(id: string, changes: Partial<Document>): Promise<void> {
  const timestamp = nowIso();
  const doc = await db.documents.get(id);
  if (!doc) throw new Error('Documento não encontrado');
  await db.transaction('rw', db.documents, db.syncQueue, async () => {
    await db.documents.update(id, { ...changes, updated_at: timestamp, synced: false });
    const updated = await db.documents.get(id);
    await db.syncQueue.add({ id: generateId(), table: 'documents', operation: 'update', payload: { ...updated }, created_at: timestamp, retry_count: 0, failed: false });
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
        try { await deleteFile(attachment.url); } catch (error) { console.error('Erro ao deletar anexo:', attachment.url, error); }
      }
    }
  }
  await db.transaction('rw', db.documents, db.syncQueue, async () => {
    await db.documents.delete(id);
    await db.syncQueue.add({ id: generateId(), table: 'documents', operation: 'delete', payload: { id }, created_at: timestamp, retry_count: 0, failed: false });
    triggerSyncProcess();
  });
}

export async function toggleFavorite(id: string): Promise<void> {
  const doc = await db.documents.get(id);
  if (!doc) return;
  await safeUpdateDocument(id, { is_favorite: !doc.is_favorite });
}

export async function safeAddMedicamento(med: Omit<Medicamento, 'id' | 'created_at' | 'updated_at' | 'synced'>): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();
  const full: Medicamento = { ...med, id, created_at: timestamp, updated_at: timestamp, synced: false };
  return db.transaction('rw', db.medicamentos, db.syncQueue, async () => {
    await db.medicamentos.add(full);
    await db.syncQueue.add({ id: generateId(), table: 'medicamentos', operation: 'add', payload: { ...full }, created_at: timestamp, retry_count: 0, failed: false });
    triggerSyncProcess();
    return id;
  });
}

export async function safeUpdateMedicamento(id: string, changes: Partial<Medicamento>): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.medicamentos, db.syncQueue, async () => {
    await db.medicamentos.update(id, { ...changes, updated_at: timestamp, synced: false });
    const updated = await db.medicamentos.get(id);
    await db.syncQueue.add({ id: generateId(), table: 'medicamentos', operation: 'update', payload: { ...updated }, created_at: timestamp, retry_count: 0, failed: false });
    triggerSyncProcess();
  });
}

export async function safeDeleteMedicamento(id: string): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.medicamentos, db.syncQueue, async () => {
    await db.medicamentos.delete(id);
    await db.syncQueue.add({ id: generateId(), table: 'medicamentos', operation: 'delete', payload: { id }, created_at: timestamp, retry_count: 0, failed: false });
    triggerSyncProcess();
  });
}

export async function safeAddRenovacao(ren: Omit<Renovacao, 'id' | 'created_at' | 'updated_at' | 'synced'>): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();
  const full: Renovacao = { ...ren, id, created_at: timestamp, updated_at: timestamp, synced: false };
  return db.transaction('rw', db.renovacoes, db.syncQueue, async () => {
    await db.renovacoes.add(full);
    await db.syncQueue.add({ id: generateId(), table: 'renovacoes', operation: 'add', payload: { ...full }, created_at: timestamp, retry_count: 0, failed: false });
    triggerSyncProcess();
    return id;
  });
}

export async function safeUpdateRenovacao(id: string, changes: Partial<Renovacao>): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.renovacoes, db.syncQueue, async () => {
    await db.renovacoes.update(id, { ...changes, updated_at: timestamp, synced: false });
    const updated = await db.renovacoes.get(id);
    await db.syncQueue.add({ id: generateId(), table: 'renovacoes', operation: 'update', payload: { ...updated }, created_at: timestamp, retry_count: 0, failed: false });
    triggerSyncProcess();
  });
}

export async function safeSetDoseLog(data: Omit<DoseLog, 'id' | 'created_at' | 'updated_at' | 'synced'>): Promise<string> {
  const timestamp = nowIso();
  const existing = await db.doseLogs.where('medicamento_id').equals(data.medicamento_id).filter((l) => l.data === data.data && l.horario === data.horario).first();
  if (existing) {
    await db.transaction('rw', db.doseLogs, db.syncQueue, async () => {
      await db.doseLogs.update(existing.id!, { tomado_em: data.tomado_em, updated_at: timestamp, synced: false });
      const updated = await db.doseLogs.get(existing.id!);
      await db.syncQueue.add({ id: generateId(), table: 'doseLogs', operation: 'update', payload: { ...updated }, created_at: timestamp, retry_count: 0, failed: false });
      triggerSyncProcess();
    });
    return existing.id!;
  }
  const id = generateId();
  const full: DoseLog = { ...data, id, created_at: timestamp, updated_at: timestamp, synced: false };
  return db.transaction('rw', db.doseLogs, db.syncQueue, async () => {
    await db.doseLogs.add(full);
    await db.syncQueue.add({ id: generateId(), table: 'doseLogs', operation: 'add', payload: { ...full }, created_at: timestamp, retry_count: 0, failed: false });
    triggerSyncProcess();
    return id;
  });
}

export async function safeAddVault(vault: Omit<Vault, 'id' | 'created_at' | 'updated_at' | 'synced'>): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();
  const full: Vault = { ...vault, id, created_at: timestamp, updated_at: timestamp, synced: false };
  return db.transaction('rw', db.vaults, db.syncQueue, async () => {
    await db.vaults.add(full);
    await db.syncQueue.add({ id: generateId(), table: 'vaults', operation: 'add', payload: { ...full }, created_at: timestamp, retry_count: 0, failed: false });
    triggerSyncProcess();
    return id;
  });
}

export async function safeAddVaultMember(member: Omit<VaultMember, 'id' | 'invited_at' | 'updated_at' | 'synced'>): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();
  const full: VaultMember = { ...member, id, invited_at: timestamp, updated_at: timestamp, synced: false };
  return db.transaction('rw', db.vaultMembers, db.syncQueue, async () => {
    await db.vaultMembers.add(full);
    await db.syncQueue.add({ id: generateId(), table: 'vaultMembers', operation: 'add', payload: { ...full }, created_at: timestamp, retry_count: 0, failed: false });
    triggerSyncProcess();
    return id;
  });
}

export async function safeUpdateVaultMember(id: string, changes: Partial<VaultMember>): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.vaultMembers, db.syncQueue, async () => {
    await db.vaultMembers.update(id, { ...changes, updated_at: timestamp, synced: false });
    const updated = await db.vaultMembers.get(id);
    await db.syncQueue.add({ id: generateId(), table: 'vaultMembers', operation: 'update', payload: { ...updated }, created_at: timestamp, retry_count: 0, failed: false });
    triggerSyncProcess();
  });
}

export async function shareDocumentWithVault(documentId: string, vaultId: string): Promise<void> {
  await db.transaction('rw', db.documents, async () => { await db.documents.update(documentId, { vault_id: vaultId }); });
}

export async function getVaultDocuments(vaultId: string): Promise<Document[]> { return db.documents.where('vault_id').equals(vaultId).toArray(); }
export async function getVaultMembers(vaultId: string): Promise<VaultMember[]> { return db.vaultMembers.where('vault_id').equals(vaultId).toArray(); }

export async function safeAddMedico(data: Omit<Medico, 'id' | 'created_at' | 'updated_at' | 'synced'>): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();
  const full: Medico = { ...data, id, created_at: timestamp, updated_at: timestamp, synced: false };
  return db.transaction('rw', db.medicos, db.syncQueue, async () => {
    await db.medicos.add(full);
    await db.syncQueue.add({ id: generateId(), table: 'medicos', operation: 'add', payload: { ...full }, created_at: timestamp, retry_count: 0, failed: false });
    triggerSyncProcess();
    return id;
  });
}

export async function safeUpdateMedico(id: string, changes: Partial<Medico>): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.medicos, db.syncQueue, async () => {
    await db.medicos.update(id, { ...changes, updated_at: timestamp, synced: false });
    const updated = await db.medicos.get(id);
    await db.syncQueue.add({ id: generateId(), table: 'medicos', operation: 'update', payload: { ...updated }, created_at: timestamp, retry_count: 0, failed: false });
    triggerSyncProcess();
  });
}

export async function safeDeleteMedico(id: string): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.medicos, db.syncQueue, async () => {
    await db.medicos.delete(id);
    await db.syncQueue.add({ id: generateId(), table: 'medicos', operation: 'delete', payload: { id }, created_at: timestamp, retry_count: 0, failed: false });
    triggerSyncProcess();
  });
}

export async function safeAddFarmacia(data: Omit<Farmacia, 'id' | 'created_at' | 'updated_at' | 'synced'>): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();
  const full: Farmacia = { ...data, id, created_at: timestamp, updated_at: timestamp, synced: false };
  return db.transaction('rw', db.farmacias, db.syncQueue, async () => {
    await db.farmacias.add(full);
    await db.syncQueue.add({ id: generateId(), table: 'farmacias', operation: 'add', payload: { ...full }, created_at: timestamp, retry_count: 0, failed: false });
    triggerSyncProcess();
    return id;
  });
}

export async function safeUpdateFarmacia(id: string, changes: Partial<Farmacia>): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.farmacias, db.syncQueue, async () => {
    await db.farmacias.update(id, { ...changes, updated_at: timestamp, synced: false });
    const updated = await db.farmacias.get(id);
    await db.syncQueue.add({ id: generateId(), table: 'farmacias', operation: 'update', payload: { ...updated }, created_at: timestamp, retry_count: 0, failed: false });
    triggerSyncProcess();
  });
}

export async function safeDeleteFarmacia(id: string): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.farmacias, db.syncQueue, async () => {
    await db.farmacias.delete(id);
    await db.syncQueue.add({ id: generateId(), table: 'farmacias', operation: 'delete', payload: { id }, created_at: timestamp, retry_count: 0, failed: false });
    triggerSyncProcess();
  });
}

export async function safeAddHospital(data: Omit<Hospital, 'id' | 'created_at' | 'updated_at' | 'synced'>): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();
  const full: Hospital = { ...data, id, created_at: timestamp, updated_at: timestamp, synced: false };
  return db.transaction('rw', db.hospitais, db.syncQueue, async () => {
    await db.hospitais.add(full);
    await db.syncQueue.add({ id: generateId(), table: 'hospitais', operation: 'add', payload: { ...full }, created_at: timestamp, retry_count: 0, failed: false });
    triggerSyncProcess();
    return id;
  });
}

export async function safeUpdateHospital(id: string, changes: Partial<Hospital>): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.hospitais, db.syncQueue, async () => {
    await db.hospitais.update(id, { ...changes, updated_at: timestamp, synced: false });
    const updated = await db.hospitais.get(id);
    await db.syncQueue.add({ id: generateId(), table: 'hospitais', operation: 'update', payload: { ...updated }, created_at: timestamp, retry_count: 0, failed: false });
    triggerSyncProcess();
  });
}

export async function safeDeleteHospital(id: string): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.hospitais, db.syncQueue, async () => {
    await db.hospitais.delete(id);
    await db.syncQueue.add({ id: generateId(), table: 'hospitais', operation: 'delete', payload: { id }, created_at: timestamp, retry_count: 0, failed: false });
    triggerSyncProcess();
  });
}

export async function safeAddCredential(cred: Omit<Credential, 'id' | 'created_at' | 'updated_at' | 'synced'>): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();
  const full: Credential = { ...cred, id, created_at: timestamp, updated_at: timestamp, synced: false };
  return db.transaction('rw', db.credentials, db.syncQueue, async () => {
    await db.credentials.add(full);
    await db.syncQueue.add({ id: generateId(), table: 'credentials', operation: 'add', payload: { ...full }, created_at: timestamp, retry_count: 0, failed: false });
    triggerSyncProcess();
    return id;
  });
}

export async function safeUpdateCredential(id: string, changes: Partial<Credential>): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.credentials, db.syncQueue, async () => {
    await db.credentials.update(id, { ...changes, updated_at: timestamp, synced: false });
    const updated = await db.credentials.get(id);
    await db.syncQueue.add({ id: generateId(), table: 'credentials', operation: 'update', payload: { ...updated }, created_at: timestamp, retry_count: 0, failed: false });
    triggerSyncProcess();
  });
}

export async function safeDeleteCredential(id: string): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.credentials, db.syncQueue, async () => {
    await db.credentials.delete(id);
    await db.syncQueue.add({ id: generateId(), table: 'credentials', operation: 'delete', payload: { id }, created_at: timestamp, retry_count: 0, failed: false });
    triggerSyncProcess();
  });
}

export async function safeAddCard(card: Omit<BankCard, 'id' | 'created_at' | 'updated_at' | 'synced'>): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();
  const full: BankCard = { ...card, id, created_at: timestamp, updated_at: timestamp, synced: false };
  return db.transaction('rw', db.cards, db.syncQueue, async () => {
    await db.cards.add(full);
    await db.syncQueue.add({ id: generateId(), table: 'cards', operation: 'add', payload: { ...full }, created_at: timestamp, retry_count: 0, failed: false });
    triggerSyncProcess();
    return id;
  });
}

export async function safeUpdateCard(id: string, changes: Partial<BankCard>): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.cards, db.syncQueue, async () => {
    await db.cards.update(id, { ...changes, updated_at: timestamp, synced: false });
    const updated = await db.cards.get(id);
    await db.syncQueue.add({ id: generateId(), table: 'cards', operation: 'update', payload: { ...updated }, created_at: timestamp, retry_count: 0, failed: false });
    triggerSyncProcess();
  });
}

export async function safeDeleteCard(id: string): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.cards, db.syncQueue, async () => {
    await db.cards.delete(id);
    await db.syncQueue.add({ id: generateId(), table: 'cards', operation: 'delete', payload: { id }, created_at: timestamp, retry_count: 0, failed: false });
    triggerSyncProcess();
  });
}

export async function safeAddInstituicao(data: Omit<InstituicaoEnsino, 'id' | 'created_at' | 'updated_at' | 'synced'>): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();
  const full: InstituicaoEnsino = { ...data, id, created_at: timestamp, updated_at: timestamp, synced: false };
  return db.transaction('rw', db.instituicoes, db.syncQueue, async () => {
    await db.instituicoes.add(full);
    await db.syncQueue.add({ id: generateId(), table: 'instituicoes', operation: 'add', payload: { ...full }, created_at: timestamp, retry_count: 0, failed: false });
    triggerSyncProcess();
    return id;
  });
}

export async function safeUpdateInstituicao(id: string, changes: Partial<InstituicaoEnsino>): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.instituicoes, db.syncQueue, async () => {
    await db.instituicoes.update(id, { ...changes, updated_at: timestamp, synced: false });
    const updated = await db.instituicoes.get(id);
    await db.syncQueue.add({ id: generateId(), table: 'instituicoes', operation: 'update', payload: { ...updated }, created_at: timestamp, retry_count: 0, failed: false });
    triggerSyncProcess();
  });
}

export async function safeDeleteInstituicao(id: string): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.instituicoes, db.syncQueue, async () => {
    await db.instituicoes.delete(id);
    await db.syncQueue.add({ id: generateId(), table: 'instituicoes', operation: 'delete', payload: { id }, created_at: timestamp, retry_count: 0, failed: false });
    triggerSyncProcess();
  });
}

export async function safeAddTratamento(data: Omit<Tratamento, 'id' | 'created_at' | 'updated_at' | 'synced'>): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();
  const full: Tratamento = { ...data, id, created_at: timestamp, updated_at: timestamp, synced: false };
  return db.transaction('rw', db.tratamentos, db.syncQueue, async () => {
    await db.tratamentos.add(full);
    await db.syncQueue.add({ id: generateId(), table: 'tratamentos', operation: 'add', payload: { ...full }, created_at: timestamp, retry_count: 0, failed: false });
    triggerSyncProcess();
    return id;
  });
}

export async function safeUpdateTratamento(id: string, changes: Partial<Tratamento>): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.tratamentos, db.syncQueue, async () => {
    await db.tratamentos.update(id, { ...changes, updated_at: timestamp, synced: false });
    const updated = await db.tratamentos.get(id);
    await db.syncQueue.add({ id: generateId(), table: 'tratamentos', operation: 'update', payload: { ...updated }, created_at: timestamp, retry_count: 0, failed: false });
    triggerSyncProcess();
  });
}

export async function safeDeleteTratamento(id: string): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.tratamentos, db.syncQueue, async () => {
    await db.tratamentos.delete(id);
    await db.syncQueue.add({ id: generateId(), table: 'tratamentos', operation: 'delete', payload: { id }, created_at: timestamp, retry_count: 0, failed: false });
    triggerSyncProcess();
  });
}
