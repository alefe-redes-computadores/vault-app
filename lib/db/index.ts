import Dexie, { type Table } from 'dexie';
import type {
  Person, Document, SyncQueueItem, Medicamento, Renovacao,
  Vault, VaultMember, Medico, Farmacia, Hospital, Laboratorio, DoseLog,
  Credential, BankCard, InstituicaoEnsino, Tratamento, Exame, Cid, LocalSaude,
  Consulta, Cirurgia
} from '@/lib/types';
import { deleteFile } from '@/lib/supabase/storage';
import { getLocalTodayISO } from '@/lib/health-utils';

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
  locais!: Table<LocalSaude, string>;
  laboratorios!: Table<Laboratorio, string>;
  exames!: Table<Exame, string>;
  doseLogs!: Table<DoseLog, string>;
  credentials!: Table<Credential, string>;
  cards!: Table<BankCard, string>;
  instituicoes!: Table<InstituicaoEnsino, string>;
  tratamentos!: Table<Tratamento, string>;
  medicamento_tratamentos!: Table<any, string>;
  anexos_clinicos!: Table<any, string>;
  cids!: Table<Cid, string>;
  exame_tratamentos!: Table<any, string>;
  consultas!: Table<Consulta, string>;
  cirurgias!: Table<Cirurgia, string>;

  constructor() {
    super('vault-db');
    
    this.version(2).stores({ persons: 'id, user_id, name, synced, created_at', documents: 'id, person_id, category_id, type, title, is_favorite, synced, created_at', syncQueue: 'id, table, operation, created_at, user_id, retry_count, failed' });
    this.version(3).stores({ persons: 'id, user_id, name, synced, created_at', documents: 'id, person_id, category_id, type, title, is_favorite, synced, created_at', syncQueue: 'id, table, operation, created_at, user_id, retry_count, failed', medicamentos: 'id, document_id, nome, medico, proxima_renovacao', renovacoes: 'id, medicamento_id, data' });
    this.version(4).stores({ persons: 'id, user_id, name, synced, created_at', documents: 'id, person_id, category_id, type, title, is_favorite, synced, created_at, vault_id', syncQueue: 'id, table, operation, created_at, user_id, retry_count, failed', medicamentos: 'id, document_id, nome, medico, proxima_renovacao', renovacoes: 'id, medicamento_id, data', vaults: 'id, user_id, name, synced, created_at', vaultMembers: 'id, vault_id, user_id, email, status, synced' });
    this.version(5).stores({ persons: 'id, user_id, name, synced, created_at', documents: 'id, person_id, category_id, type, title, is_favorite, synced, created_at, vault_id', syncQueue: 'id, table, operation, created_at, user_id, retry_count, failed', medicamentos: 'id, document_id, nome, medico, proxima_renovacao', renovacoes: 'id, medicamento_id, data', vaults: 'id, user_id, name, synced, created_at', vaultMembers: 'id, vault_id, user_id, email, status, synced', medicos: 'id, user_id, nome, especialidade, synced', farmacias: 'id, user_id, nome, synced', hospitais: 'id, user_id, nome, synced' });
    this.version(6).stores({ persons: 'id, user_id, name, synced, created_at', documents: 'id, user_id, person_id, category_id, type, title, is_favorite, synced, created_at, vault_id', syncQueue: 'id, table, operation, created_at, user_id, retry_count, failed', medicamentos: 'id, document_id, nome, medico, proxima_renovacao', renovacoes: 'id, medicamento_id, data', vaults: 'id, user_id, name, synced, created_at', vaultMembers: 'id, vault_id, user_id, email, status, synced', medicos: 'id, user_id, nome, especialidade, synced', farmacias: 'id, user_id, nome, synced', hospitais: 'id, user_id, nome, synced' });
    this.version(7).stores({ persons: 'id, user_id, name, synced, created_at', documents: 'id, user_id, person_id, category_id, type, title, is_favorite, synced, created_at, vault_id', syncQueue: 'id, table, operation, created_at, user_id, retry_count, failed', medicamentos: null, renovacoes: null, vaults: 'id, user_id, name, synced, created_at', vaultMembers: 'id, vault_id, user_id, email, status, synced', medicos: 'id, user_id, nome, especialidade, synced', farmacias: 'id, user_id, nome, synced', hospitais: 'id, user_id, nome, synced' });
    this.version(8).stores({ persons: 'id, user_id, name, synced, created_at', documents: 'id, user_id, person_id, category_id, type, title, is_favorite, synced, created_at, vault_id', syncQueue: 'id, table, operation, created_at, user_id, retry_count, failed', medicamentos: 'id, user_id, document_id, nome, medico, proxima_renovacao', renovacoes: 'id, user_id, medicamento_id, data', vaults: 'id, user_id, name, synced, created_at', vaultMembers: 'id, vault_id, user_id, email, status, synced', medicos: 'id, user_id, nome, especialidade, synced', farmacias: 'id, user_id, nome, synced', hospitais: 'id, user_id, nome, synced' });
    this.version(9).stores({ persons: 'id, user_id, name, synced, created_at', documents: 'id, user_id, person_id, category_id, type, title, is_favorite, synced, created_at, vault_id', syncQueue: 'id, table, operation, created_at, user_id, retry_count, failed', medicamentos: 'id, user_id, document_id, nome, medico, proxima_renovacao', renovacoes: 'id, user_id, medicamento_id, data', vaults: 'id, user_id, name, synced, created_at', vaultMembers: 'id, vault_id, user_id, email, status, synced', medicos: 'id, user_id, nome, especialidade, synced', farmacias: 'id, user_id, nome, synced', hospitais: 'id, user_id, nome, synced', doseLogs: 'id, user_id, medicamento_id, data, horario' });
    this.version(10).stores({ persons: 'id, user_id, name, synced, created_at', documents: 'id, user_id, person_id, category_id, type, title, is_favorite, synced, created_at, vault_id', syncQueue: 'id, table, operation, created_at, user_id, retry_count, failed', medicamentos: 'id, user_id, document_id, nome, medico, proxima_renovacao', renovacoes: 'id, user_id, medicamento_id, data', vaults: 'id, user_id, name, synced, created_at', vaultMembers: 'id, vault_id, user_id, email, status, synced', medicos: 'id, user_id, nome, especialidade, synced', farmacias: 'id, user_id, nome, synced', hospitais: 'id, user_id, nome, synced', doseLogs: 'id, user_id, medicamento_id, data, horario', credentials: 'id, user_id, vault_id, title, category, synced' });
    this.version(11).stores({ persons: 'id, user_id, name, synced, created_at', documents: 'id, user_id, person_id, category_id, type, title, is_favorite, synced, created_at, vault_id', syncQueue: 'id, table, operation, created_at, user_id, retry_count, failed', medicamentos: 'id, user_id, document_id, nome, medico, proxima_renovacao', renovacoes: 'id, user_id, medicamento_id, data', vaults: 'id, user_id, name, synced, created_at', vaultMembers: 'id, vault_id, user_id, email, status, synced', medicos: 'id, user_id, nome, especialidade, synced', farmacias: 'id, user_id, nome, synced', hospitais: 'id, user_id, nome, synced', doseLogs: 'id, user_id, medicamento_id, data, horario', credentials: 'id, user_id, vault_id, title, category, synced', cards: 'id, user_id, title, bank_name, type, brand, synced' });
    this.version(12).stores({ persons: 'id, user_id, name, synced, created_at', documents: 'id, user_id, person_id, category_id, type, title, is_favorite, synced, created_at, vault_id', syncQueue: 'id, table, operation, created_at, user_id, retry_count, failed', medicamentos: 'id, user_id, document_id, nome, medico, proxima_renovacao, tratamento_id', renovacoes: 'id, user_id, medicamento_id, data', vaults: 'id, user_id, name, synced, created_at', vaultMembers: 'id, vault_id, user_id, email, status, synced', medicos: 'id, user_id, nome, especialidade, synced', farmacias: 'id, user_id, nome, synced', hospitais: 'id, user_id, nome, synced', doseLogs: 'id, user_id, medicamento_id, data, horario', credentials: 'id, user_id, vault_id, title, category, synced', cards: 'id, user_id, title, bank_name, type, brand, synced', instituicoes: 'id, user_id, nome, synced', tratamentos: 'id, user_id, nome, status, synced' });
    this.version(13).stores({ persons: 'id, user_id, name, synced, created_at', documents: 'id, user_id, person_id, category_id, type, title, is_favorite, synced, created_at, vault_id', syncQueue: 'id, table, operation, created_at, user_id, retry_count, failed', medicamentos: 'id, user_id, document_id, nome, medico, proxima_renovacao, tratamento_id, status', renovacoes: 'id, user_id, medicamento_id, data', vaults: 'id, user_id, name, synced, created_at', vaultMembers: 'id, vault_id, user_id, email, status, synced', medicos: 'id, user_id, nome, especialidade, synced', farmacias: 'id, user_id, nome, synced', hospitais: 'id, user_id, nome, synced', laboratorios: 'id, user_id, nome, synced', doseLogs: 'id, user_id, medicamento_id, data, horario', credentials: 'id, user_id, vault_id, title, category, synced', cards: 'id, user_id, title, bank_name, type, brand, synced', instituicoes: 'id, user_id, nome, synced', tratamentos: 'id, user_id, nome, status, synced' });
    this.version(14).stores({ persons: 'id, user_id, name, synced, created_at', documents: 'id, user_id, person_id, category_id, type, title, is_favorite, synced, created_at, vault_id', syncQueue: 'id, table, operation, created_at, user_id, retry_count, failed', medicamentos: 'id, user_id, document_id, nome, medico, proxima_renovacao, tratamento_id, status', renovacoes: 'id, user_id, medicamento_id, data', vaults: 'id, user_id, name, synced, created_at', vaultMembers: 'id, vault_id, user_id, email, status, synced', medicos: 'id, user_id, nome, especialidade, synced', farmacias: 'id, user_id, nome, synced', hospitais: 'id, user_id, nome, synced', laboratorios: 'id, user_id, nome, synced', exames: 'id, user_id, nome, laboratorio, data, synced', doseLogs: 'id, user_id, medicamento_id, data, horario', credentials: 'id, user_id, vault_id, title, category, synced', cards: 'id, user_id, title, bank_name, type, brand, synced', instituicoes: 'id, user_id, nome, synced', tratamentos: 'id, user_id, nome, status, synced' });
    this.version(15).stores({ persons: 'id, user_id, name, synced, created_at', documents: 'id, user_id, person_id, category_id, type, title, is_favorite, synced, created_at, vault_id', syncQueue: 'id, table, operation, created_at, user_id, retry_count, failed', medicamentos: 'id, user_id, document_id, nome, medico, proxima_renovacao, tratamento_id, status', renovacoes: 'id, user_id, medicamento_id, data', vaults: 'id, user_id, name, synced, created_at', vaultMembers: 'id, vault_id, user_id, email, status, synced', medicos: 'id, user_id, nome, especialidade, synced', farmacias: 'id, user_id, nome, synced', hospitais: 'id, user_id, nome, synced', laboratorios: 'id, user_id, nome, synced', exames: 'id, user_id, nome, laboratorio, data, synced', doseLogs: 'id, user_id, medicamento_id, data, horario', credentials: 'id, user_id, vault_id, title, category, synced', cards: 'id, user_id, title, bank_name, type, brand, synced', instituicoes: 'id, user_id, nome, synced', tratamentos: 'id, user_id, nome, status, synced', medicamento_tratamentos: 'id, medicamento_id, tratamento_id', anexos_clinicos: 'id, user_id, person_id, tratamento_id, medicamento_id, tipo, *tags, created_at' });
    this.version(16).stores({ persons: 'id, user_id, name, synced, created_at', documents: 'id, user_id, person_id, category_id, type, title, is_favorite, synced, created_at, vault_id', syncQueue: 'id, table, operation, created_at, user_id, retry_count, failed', medicamentos: 'id, user_id, person_id, document_id, nome, medico_id, farmacia_id, proxima_renovacao, status, tratamento_id', renovacoes: 'id, user_id, medicamento_id, data', vaults: 'id, user_id, name, synced, created_at', vaultMembers: 'id, vault_id, user_id, email, status, synced', medicos: 'id, user_id, nome, especialidade, synced', farmacias: 'id, user_id, nome, synced', hospitais: 'id, user_id, nome, synced', laboratorios: 'id, user_id, nome, synced', exames: 'id, user_id, person_id, nome, laboratorio_id, medico_id, data, synced', doseLogs: 'id, user_id, medicamento_id, data, horario', credentials: 'id, user_id, vault_id, title, category, synced', cards: 'id, user_id, title, bank_name, type, brand, synced', instituicoes: 'id, user_id, nome, synced', tratamentos: 'id, user_id, person_id, nome, cid_id, status, synced', medicamento_tratamentos: 'id, medicamento_id, tratamento_id', anexos_clinicos: 'id, user_id, person_id, tratamento_id, medicamento_id, tipo, *tags, created_at', cids: 'id, user_id, codigo, descricao, synced', exame_tratamentos: 'id, exame_id, tratamento_id' });
    
    // Versão 17 FINAL E LIMPA
    this.version(17).stores({
      persons: 'id, user_id, name, synced, created_at',
      documents: 'id, user_id, person_id, category_id, type, title, is_favorite, synced, created_at, vault_id',
      syncQueue: 'id, table, operation, created_at, user_id, retry_count, failed',
      medicamentos: 'id, user_id, person_id, document_id, nome, medico_id, farmacia_id, proxima_renovacao, status, tratamento_id',
      renovacoes: 'id, user_id, medicamento_id, data',
      vaults: 'id, user_id, name, synced, created_at',
      vaultMembers: 'id, vault_id, user_id, email, status, synced',
      medicos: 'id, user_id, nome, especialidade, synced',
      farmacias: 'id, user_id, nome, synced',
      hospitais: 'id, user_id, nome, synced',
      locais: 'id, user_id, nome, tipo, synced',
      laboratorios: 'id, user_id, nome, synced',
      exames: 'id, user_id, person_id, nome, laboratorio_id, medico_id, data, synced',
      consultas: 'id, user_id, person_id, data, medico_id, hospital_id, status, synced',
      cirurgias: 'id, user_id, person_id, data, medico_id, hospital_id, status, synced',
      doseLogs: 'id, user_id, medicamento_id, data, horario',
      credentials: 'id, user_id, vault_id, title, category, synced',
      cards: 'id, user_id, title, bank_name, type, brand, synced',
      instituicoes: 'id, user_id, nome, synced',
      tratamentos: 'id, user_id, person_id, nome, cid_id, status, synced',
      medicamento_tratamentos: 'id, medicamento_id, tratamento_id',
      anexos_clinicos: 'id, user_id, person_id, tratamento_id, medicamento_id, tipo, *tags, created_at',
      cids: 'id, user_id, codigo, descricao, synced',
      exame_tratamentos: 'id, exame_id, tratamento_id'
    });
  }
}

export const db = new VaultDB();

function nowIso() { return new Date().toISOString(); }
function triggerSyncProcess() { if (typeof window !== 'undefined') window.dispatchEvent(new Event('sync:process')); }

export async function syncMedicamentoTratamentos(medicamentoId: string, tratamentoIds: string[]): Promise<void> {
  await db.transaction('rw', db.medicamento_tratamentos, async () => {
    await db.medicamento_tratamentos.where('medicamento_id').equals(medicamentoId).delete();
    const novosVinculos = tratamentoIds.map(tId => ({ id: generateId(), medicamento_id: medicamentoId, tratamento_id: tId }));
    if (novosVinculos.length > 0) { await db.medicamento_tratamentos.bulkAdd(novosVinculos); }
  });
}

export async function safeAddLocal(data: Omit<LocalSaude, 'id' | 'created_at' | 'updated_at' | 'synced'>): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();
  const full: LocalSaude = { ...data, id, created_at: timestamp, updated_at: timestamp, synced: false };
  return db.transaction('rw', db.locais, db.syncQueue, async () => {
    await db.locais.add(full);
    await db.syncQueue.add({ id: generateId(), table: 'locais', operation: 'add', payload: { ...full }, created_at: timestamp, retry_count: 0, failed: false });
    triggerSyncProcess();
    return id;
  });
}

export async function safeUpdateLocal(id: string, changes: Partial<LocalSaude>): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.locais, db.syncQueue, async () => {
    await db.locais.update(id, { ...changes, updated_at: timestamp, synced: false });
    const updated = await db.locais.get(id);
    await db.syncQueue.add({ id: generateId(), table: 'locais', operation: 'update', payload: { ...updated }, created_at: timestamp, retry_count: 0, failed: false });
    triggerSyncProcess();
  });
}

export async function safeDeleteLocal(id: string): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.locais, db.syncQueue, async () => {
    await db.locais.delete(id);
    await db.syncQueue.add({ id: generateId(), table: 'locais', operation: 'delete', payload: { id }, created_at: timestamp, retry_count: 0, failed: false });
    triggerSyncProcess();
  });
}

export async function safeAddExame(data: Omit<Exame, 'id' | 'created_at' | 'updated_at' | 'synced'>): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();
  const full: Exame = { ...data, id, created_at: timestamp, updated_at: timestamp, synced: false };
  return db.transaction('rw', db.exames, db.syncQueue, async () => {
    await db.exames.add(full);
    await db.syncQueue.add({ id: generateId(), table: 'exames', operation: 'add', payload: { ...full }, created_at: timestamp, retry_count: 0, failed: false });
    triggerSyncProcess();
    return id;
  });
}

export async function safeUpdateExame(id: string, changes: Partial<Exame>): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.exames, db.syncQueue, async () => {
    await db.exames.update(id, { ...changes, updated_at: timestamp, synced: false });
    const updated = await db.exames.get(id);
    await db.syncQueue.add({ id: generateId(), table: 'exames', operation: 'update', payload: { ...updated }, created_at: timestamp, retry_count: 0, failed: false });
    triggerSyncProcess();
  });
}

export async function safeDeleteExame(id: string): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.exames, db.syncQueue, async () => {
    await db.exames.delete(id);
    await db.syncQueue.add({ id: generateId(), table: 'exames', operation: 'delete', payload: { id }, created_at: timestamp, retry_count: 0, failed: false });
    triggerSyncProcess();
  });
}

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

export async function safeDeleteMedicamento(medicamentoId: string) {
  return await db.transaction(
    "rw",
    [db.medicamentos, db.medicamento_tratamentos, db.syncQueue],
    async () => {
      await db.medicamentos.delete(medicamentoId);

      await db.syncQueue.add({
        id: generateId(),
        table: 'medicamentos',
        operation: 'delete',
        payload: { id: medicamentoId },
        created_at: nowIso(),
        retry_count: 0,
        failed: false,
      });

      const vinculos = await db.medicamento_tratamentos
        .where("medicamento_id")
        .equals(medicamentoId)
        .toArray();

      for (const vinculo of vinculos) {
        await db.medicamento_tratamentos.delete(vinculo.id!);
        
        await db.syncQueue.add({
          id: generateId(),
          table: 'medicamento_tratamentos',
          operation: 'delete',
          payload: { id: vinculo.id! },
          created_at: nowIso(),
          retry_count: 0,
          failed: false,
        });
      }
      triggerSyncProcess();
    }
  );
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

// ============================================================
// safeSetDoseLog CORRIGIDO — Suporta ignorado_em e fuso horário
// ============================================================
export async function safeSetDoseLog(
  data: Omit<DoseLog, 'id' | 'created_at' | 'updated_at' | 'synced'>
): Promise<string> {
  const timestamp = nowIso();
  const targetDate = data.data || getLocalTodayISO();

  const existing = await db.doseLogs
    .where('medicamento_id')
    .equals(data.medicamento_id)
    .filter((l) => l.data === targetDate && l.horario === data.horario)
    .first();

  if (existing) {
    await db.transaction('rw', db.doseLogs, db.syncQueue, async () => {
      await db.doseLogs.update(existing.id!, {
        tomado_em: data.tomado_em,
        ignorado_em: data.ignorado_em, // ✅ SUPORTE AO "IGNORAR" AQUI
        updated_at: timestamp,
        synced: false,
      });
      const updated = await db.doseLogs.get(existing.id!);
      await db.syncQueue.add({
        id: generateId(), table: 'doseLogs', operation: 'update', payload: { ...updated },
        created_at: timestamp, retry_count: 0, failed: false,
      });
      triggerSyncProcess();
    });
    return existing.id!;
  }

  const id = generateId();
  const full: DoseLog = { 
    ...data, 
    data: targetDate, 
    id, 
    created_at: timestamp, 
    updated_at: timestamp, 
    synced: false 
  };
  return db.transaction('rw', db.doseLogs, db.syncQueue, async () => {
    await db.doseLogs.add(full);
    await db.syncQueue.add({
      id: generateId(), table: 'doseLogs', operation: 'add', payload: { ...full },
      created_at: timestamp, retry_count: 0, failed: false,
    });
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

export async function safeAddLaboratorio(data: Omit<Laboratorio, 'id' | 'created_at' | 'updated_at' | 'synced'>): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();
  const full: Laboratorio = { ...data, id, created_at: timestamp, updated_at: timestamp, synced: false };
  return db.transaction('rw', db.laboratorios, db.syncQueue, async () => {
    await db.laboratorios.add(full);
    await db.syncQueue.add({ id: generateId(), table: 'laboratorios', operation: 'add', payload: { ...full }, created_at: timestamp, retry_count: 0, failed: false });
    triggerSyncProcess();
    return id;
  });
}

export async function safeUpdateLaboratorio(id: string, changes: Partial<Laboratorio>): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.laboratorios, db.syncQueue, async () => {
    await db.laboratorios.update(id, { ...changes, updated_at: timestamp, synced: false });
    const updated = await db.laboratorios.get(id);
    await db.syncQueue.add({ id: generateId(), table: 'laboratorios', operation: 'update', payload: { ...updated }, created_at: timestamp, retry_count: 0, failed: false });
    triggerSyncProcess();
  });
}

export async function safeDeleteLaboratorio(id: string): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.laboratorios, db.syncQueue, async () => {
    await db.laboratorios.delete(id);
    await db.syncQueue.add({ id: generateId(), table: 'laboratorios', operation: 'delete', payload: { id }, created_at: timestamp, retry_count: 0, failed: false });
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
  await db.transaction('rw', db.tratamentos, db.medicamento_tratamentos, db.syncQueue, async () => {
    await db.medicamento_tratamentos.where('tratamento_id').equals(id).delete();
    await db.tratamentos.delete(id);
    await db.syncQueue.add({ id: generateId(), table: 'tratamentos', operation: 'delete', payload: { id }, created_at: timestamp, retry_count: 0, failed: false });
    triggerSyncProcess();
  });
}

export async function safeAddCid(data: Omit<Cid, 'id' | 'created_at' | 'updated_at' | 'synced'>): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();
  const full: Cid = { ...data, id, created_at: timestamp, updated_at: timestamp, synced: true };
  return db.transaction('rw', db.cids, async () => {
    await db.cids.add(full);
    return id;
  });
}

export async function safeUpdateCid(id: string, changes: Partial<Cid>): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.cids, async () => {
    await db.cids.update(id, { ...changes, updated_at: timestamp });
  });
}

export async function safeDeleteCid(id: string): Promise<void> {
  await db.transaction('rw', db.cids, async () => {
    await db.cids.delete(id);
  });
}

export async function safeAddConsulta(data: Omit<Consulta, 'id' | 'created_at' | 'updated_at' | 'synced'>): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();
  const full: Consulta = { ...data, id, created_at: timestamp, updated_at: timestamp, synced: false };
  return db.transaction('rw', db.consultas, db.syncQueue, async () => {
    await db.consultas.add(full);
    await db.syncQueue.add({ id: generateId(), table: 'consultas', operation: 'add', payload: { ...full }, created_at: timestamp, retry_count: 0, failed: false });
    triggerSyncProcess();
    return id;
  });
}

export async function safeUpdateConsulta(id: string, changes: Partial<Consulta>): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.consultas, db.syncQueue, async () => {
    await db.consultas.update(id, { ...changes, updated_at: timestamp, synced: false });
    const updated = await db.consultas.get(id);
    await db.syncQueue.add({ id: generateId(), table: 'consultas', operation: 'update', payload: { ...updated }, created_at: timestamp, retry_count: 0, failed: false });
    triggerSyncProcess();
  });
}

export async function safeDeleteConsulta(id: string): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.consultas, db.syncQueue, async () => {
    await db.consultas.delete(id);
    await db.syncQueue.add({ id: generateId(), table: 'consultas', operation: 'delete', payload: { id }, created_at: timestamp, retry_count: 0, failed: false });
    triggerSyncProcess();
  });
}

export async function safeAddCirurgia(data: Omit<Cirurgia, 'id' | 'created_at' | 'updated_at' | 'synced'>): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();
  const full: Cirurgia = { ...data, id, created_at: timestamp, updated_at: timestamp, synced: false };
  return db.transaction('rw', db.cirurgias, db.syncQueue, async () => {
    await db.cirurgias.add(full);
    await db.syncQueue.add({ id: generateId(), table: 'cirurgias', operation: 'add', payload: { ...full }, created_at: timestamp, retry_count: 0, failed: false });
    triggerSyncProcess();
    return id;
  });
}

export async function safeUpdateCirurgia(id: string, changes: Partial<Cirurgia>): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.cirurgias, db.syncQueue, async () => {
    await db.cirurgias.update(id, { ...changes, updated_at: timestamp, synced: false });
    const updated = await db.cirurgias.get(id);
    await db.syncQueue.add({ id: generateId(), table: 'cirurgias', operation: 'update', payload: { ...updated }, created_at: timestamp, retry_count: 0, failed: false });
    triggerSyncProcess();
  });
}

export async function safeDeleteCirurgia(id: string): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.cirurgias, db.syncQueue, async () => {
    await db.cirurgias.delete(id);
    await db.syncQueue.add({ id: generateId(), table: 'cirurgias', operation: 'delete', payload: { id }, created_at: timestamp, retry_count: 0, failed: false });
    triggerSyncProcess();
  });
}

export async function safeAddAnexoClinico(data: Omit<any, 'id' | 'created_at' | 'updated_at' | 'synced'>): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();
  const full = { ...data, id, created_at: timestamp, updated_at: timestamp, synced: false };
  return db.transaction('rw', db.anexos_clinicos, db.syncQueue, async () => {
    await db.anexos_clinicos.add(full);
    await db.syncQueue.add({ id: generateId(), table: 'anexos_clinicos', operation: 'add', payload: { ...full }, created_at: timestamp, retry_count: 0, failed: false });
    triggerSyncProcess();
    return id;
  });
}

export async function safeUpdateAnexoClinico(id: string, changes: Partial<any>): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.anexos_clinicos, db.syncQueue, async () => {
    await db.anexos_clinicos.update(id, { ...changes, updated_at: timestamp, synced: false });
    const updated = await db.anexos_clinicos.get(id);
    await db.syncQueue.add({ id: generateId(), table: 'anexos_clinicos', operation: 'update', payload: { ...updated }, created_at: timestamp, retry_count: 0, failed: false });
    triggerSyncProcess();
  });
}

export async function safeDeleteAnexoClinico(id: string): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.anexos_clinicos, db.syncQueue, async () => {
    await db.anexos_clinicos.delete(id);
    await db.syncQueue.add({ id: generateId(), table: 'anexos_clinicos', operation: 'delete', payload: { id }, created_at: timestamp, retry_count: 0, failed: false });
    triggerSyncProcess();
  });
}
