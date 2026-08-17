// lib/db/index.ts

import Dexie, { type Table } from 'dexie';
import type {
  Person,
  Document,
  SyncQueueItem,
  Medicamento,
  Renovacao,
  Vault,
  VaultMember,
  Medico,
  Farmacia,
  Hospital,
  Laboratorio,
  DoseLog,
  Credential,
  BankCard,
  InstituicaoEnsino,
  Tratamento,
  Exame,
  Cid,
  LocalSaude,
  Consulta,
  Cirurgia,
} from '@/lib/types';
import { deleteFile } from '@/lib/supabase/storage';
import { getLocalTodayISO } from '@/lib/health-utils';

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function nowIso(): string {
  return new Date().toISOString();
}

function triggerSyncProcess(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('sync:process'));
  }
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
  cids!: Table<Cid, string>;
  consultas!: Table<Consulta, string>;
  cirurgias!: Table<Cirurgia, string>;
  anexos_clinicos!: Table<any, string>;

  medicamento_tratamentos!: Table<any, string>;
  exame_tratamentos!: Table<any, string>;

  constructor() {
    super('vault-db');

    this.version(2).stores({ persons: 'id', documents: 'id', syncQueue: 'id' });
    this.version(3).stores({ medicamentos: 'id', renovacoes: 'id' });
    this.version(4).stores({ vaults: 'id', vaultMembers: 'id' });
    this.version(5).stores({ medicos: 'id', farmacias: 'id', hospitais: 'id' });
    this.version(6).stores({ documents: 'id' });
    this.version(7).stores({ medicamentos: null, renovacoes: null });
    this.version(8).stores({ medicamentos: 'id', renovacoes: 'id' });
    this.version(9).stores({ doseLogs: 'id' });
    this.version(10).stores({ credentials: 'id' });
    this.version(11).stores({ cards: 'id' });
    this.version(12).stores({ instituicoes: 'id', tratamentos: 'id' });
    this.version(13).stores({ laboratorios: 'id' });
    this.version(14).stores({ exames: 'id' });
    this.version(15).stores({ medicamento_tratamentos: 'id', anexos_clinicos: 'id' });
    this.version(16).stores({ cids: 'id', exame_tratamentos: 'id' });
    this.version(17).stores({ locais: 'id', consultas: 'id', cirurgias: 'id' });

    this.version(18).stores({
      persons: 'id, user_id, name, synced, updated_at',
      documents: 'id, user_id, person_id, category_id, is_favorite, synced, updated_at, vault_id, hospital_id, medico_id',
      medicamentos: 'id, user_id, person_id, document_id, medico_id, farmacia_id, estabelecimento_id, status, synced, updated_at, *tratamento_ids',
      renovacoes: 'id, user_id, person_id, medicamento_id, medico_id, farmacia_id, local_id, synced, updated_at',
      medicos: 'id, user_id, nome, especialidade, synced, updated_at',
      farmacias: 'id, user_id, nome, synced, updated_at',
      hospitais: 'id, user_id, nome, tipo, synced, updated_at',
      locais: 'id, user_id, nome, synced, updated_at',
      laboratorios: 'id, user_id, nome, synced, updated_at',
      exames: 'id, user_id, person_id, medico_id, laboratorio_id, synced, updated_at, *tratamento_ids',
      consultas: 'id, user_id, person_id, medico_id, hospital_id, status, synced, updated_at',
      cirurgias: 'id, user_id, person_id, medico_id, hospital_id, status, synced, updated_at',
      doseLogs: 'id, user_id, person_id, medicamento_id, data, horario, synced, updated_at',
      credentials: 'id, user_id, vault_id, category, synced, updated_at',
      cards: 'id, user_id, type, synced, updated_at',
      instituicoes: 'id, user_id, nome, synced, updated_at',
      tratamentos: 'id, user_id, person_id, nome, status, synced, updated_at',
      cids: 'id, user_id, codigo, synced, updated_at',
      anexos_clinicos: 'id, user_id, synced, updated_at',
      syncQueue: 'id, table, operation, created_at, retry_count, failed',
    }).upgrade(async (tx) => {
      await tx.table('medicamentos').toCollection().modify(async (med) => {
        if (!med.tratamento_ids || med.tratamento_ids.length === 0) {
          const vinculos = await tx.table('medicamento_tratamentos')
            .where('medicamento_id')
            .equals(med.id)
            .toArray();
          const ids = vinculos.map(v => v.tratamento_id);
          if (ids.length === 0 && med.tratamento_id) {
            ids.push(med.tratamento_id);
          }
          if (ids.length > 0) {
            med.tratamento_ids = ids;
          }
        }
      });
      await tx.table('exames').toCollection().modify(async (exame) => {
        if (!exame.tratamento_ids || exame.tratamento_ids.length === 0) {
          const vinculos = await tx.table('exame_tratamentos')
            .where('exame_id')
            .equals(exame.id)
            .toArray();
          const ids = vinculos.map(v => v.tratamento_id);
          if (ids.length > 0) {
            exame.tratamento_ids = ids;
          }
        }
      });
    });

    // 🔧 NOVA VERSÃO 19: suporte a múltiplos CIDs em tratamentos
    this.version(19).stores({
      persons: 'id, user_id, name, synced, updated_at',
      documents: 'id, user_id, person_id, category_id, is_favorite, synced, updated_at, vault_id, hospital_id, medico_id',
      medicamentos: 'id, user_id, person_id, document_id, medico_id, farmacia_id, estabelecimento_id, status, synced, updated_at, *tratamento_ids',
      renovacoes: 'id, user_id, person_id, medicamento_id, medico_id, farmacia_id, local_id, synced, updated_at',
      medicos: 'id, user_id, nome, especialidade, synced, updated_at',
      farmacias: 'id, user_id, nome, synced, updated_at',
      hospitais: 'id, user_id, nome, tipo, synced, updated_at',
      locais: 'id, user_id, nome, synced, updated_at',
      laboratorios: 'id, user_id, nome, synced, updated_at',
      exames: 'id, user_id, person_id, medico_id, laboratorio_id, synced, updated_at, *tratamento_ids',
      consultas: 'id, user_id, person_id, medico_id, hospital_id, status, synced, updated_at',
      cirurgias: 'id, user_id, person_id, medico_id, hospital_id, status, synced, updated_at',
      doseLogs: 'id, user_id, person_id, medicamento_id, data, horario, synced, updated_at',
      credentials: 'id, user_id, vault_id, category, synced, updated_at',
      cards: 'id, user_id, type, synced, updated_at',
      instituicoes: 'id, user_id, nome, synced, updated_at',
      tratamentos: 'id, user_id, person_id, nome, status, synced, updated_at, *cid_ids',
      cids: 'id, user_id, codigo, synced, updated_at',
      anexos_clinicos: 'id, user_id, synced, updated_at',
      syncQueue: 'id, table, operation, created_at, retry_count, failed',
    }).upgrade(async (tx) => {
      // Migrar tratamentos: converter cid_id (singular) para cid_ids (array)
      await tx.table('tratamentos').toCollection().modify(async (trat) => {
        if (trat.cid_id && !trat.cid_ids) {
          trat.cid_ids = [trat.cid_id];
        } else if (!trat.cid_ids) {
          trat.cid_ids = [];
        }
        // Remover campo antigo (opcional, mas mantido por segurança)
        delete trat.cid_id;
      });
    });
  }
}

export const db = new VaultDB();

// ============================================================
// MEDICAMENTO ↔ TRATAMENTO (DEPRECATED)
// ============================================================
export async function syncMedicamentoTratamentos(medicamentoId: string, tratamentoIds: string[]): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.medicamentos, db.syncQueue, async () => {
    await db.medicamentos.update(medicamentoId, { tratamento_ids: tratamentoIds, updated_at: timestamp, synced: false });
    const updated = await db.medicamentos.get(medicamentoId);
    if (updated) {
      await db.syncQueue.add({
        id: generateId(),
        table: 'medicamentos',
        operation: 'update',
        payload: { ...updated },
        created_at: timestamp,
        retry_count: 0,
        failed: false
      });
    }
    triggerSyncProcess();
  });
}

// ============================================================
// FUNÇÕES CRUD (ATUALIZADAS)
// ============================================================

// ---------- PERSONS ----------
export async function safeAddPerson(person: Omit<Person, 'id' | 'created_at' | 'updated_at' | 'synced'>): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();
  const full: Person = { ...person, id, synced: false, created_at: timestamp, updated_at: timestamp };
  return db.transaction('rw', db.persons, db.syncQueue, async () => {
    await db.persons.add(full);
    await db.syncQueue.add({
      id: generateId(),
      table: 'persons',
      operation: 'add',
      payload: { ...full },
      created_at: timestamp,
      retry_count: 0,
      failed: false
    });
    triggerSyncProcess();
    return id;
  });
}

export async function safeUpdatePerson(id: string, changes: Partial<Person>): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.persons, db.syncQueue, async () => {
    const existing = await db.persons.get(id);
    if (!existing) throw new Error('Pessoa não encontrada');
    await db.persons.update(id, { ...changes, updated_at: timestamp, synced: false });
    const updated = await db.persons.get(id);
    if (updated) {
      await db.syncQueue.add({
        id: generateId(),
        table: 'persons',
        operation: 'update',
        payload: { ...updated },
        created_at: timestamp,
        retry_count: 0,
        failed: false
      });
    }
    triggerSyncProcess();
  });
}

export async function safeDeletePerson(id: string): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.persons, db.syncQueue, async () => {
    const existing = await db.persons.get(id);
    if (!existing) return;
    await db.persons.delete(id);
    await db.syncQueue.add({
      id: generateId(),
      table: 'persons',
      operation: 'delete',
      payload: { id },
      created_at: timestamp,
      retry_count: 0,
      failed: false
    });
    triggerSyncProcess();
  });
}

// ---------- DOCUMENTS ----------
export async function safeAddDocument(doc: Omit<Document, 'id' | 'created_at' | 'updated_at' | 'synced'>): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();
  const full: Document = { ...doc, id, synced: false, created_at: timestamp, updated_at: timestamp };
  return db.transaction('rw', db.documents, db.syncQueue, async () => {
    await db.documents.add(full);
    await db.syncQueue.add({
      id: generateId(),
      table: 'documents',
      operation: 'add',
      payload: { ...full },
      created_at: timestamp,
      retry_count: 0,
      failed: false
    });
    triggerSyncProcess();
    return id;
  });
}

export async function safeUpdateDocument(id: string, changes: Partial<Document>): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.documents, db.syncQueue, async () => {
    const doc = await db.documents.get(id);
    if (!doc) throw new Error('Documento não encontrado');
    await db.documents.update(id, { ...changes, updated_at: timestamp, synced: false });
    const updated = await db.documents.get(id);
    if (updated) {
      await db.syncQueue.add({
        id: generateId(),
        table: 'documents',
        operation: 'update',
        payload: { ...updated },
        created_at: timestamp,
        retry_count: 0,
        failed: false
      });
    }
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
      failed: false
    });
    triggerSyncProcess();
  });
}

export async function toggleFavorite(id: string): Promise<void> {
  const doc = await db.documents.get(id);
  if (!doc) return;
  await safeUpdateDocument(id, { is_favorite: !doc.is_favorite });
}

// ---------- MEDICAMENTOS ----------
export async function safeAddMedicamento(med: Omit<Medicamento, 'id' | 'created_at' | 'updated_at' | 'synced'>): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();
  const full: Medicamento = { ...med, id, created_at: timestamp, updated_at: timestamp, synced: false };
  return db.transaction('rw', db.medicamentos, db.syncQueue, async () => {
    await db.medicamentos.add(full);
    await db.syncQueue.add({
      id: generateId(),
      table: 'medicamentos',
      operation: 'add',
      payload: { ...full },
      created_at: timestamp,
      retry_count: 0,
      failed: false
    });
    triggerSyncProcess();
    return id;
  });
}

export async function safeUpdateMedicamento(id: string, changes: Partial<Medicamento>): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.medicamentos, db.syncQueue, async () => {
    const existing = await db.medicamentos.get(id);
    if (!existing) throw new Error('Medicamento não encontrado');
    await db.medicamentos.update(id, { ...changes, updated_at: timestamp, synced: false });
    const updated = await db.medicamentos.get(id);
    if (updated) {
      await db.syncQueue.add({
        id: generateId(),
        table: 'medicamentos',
        operation: 'update',
        payload: { ...updated },
        created_at: timestamp,
        retry_count: 0,
        failed: false
      });
    }
    triggerSyncProcess();
  });
}

export async function safeDeleteMedicamento(medicamentoId: string): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.medicamentos, db.syncQueue, async () => {
    const existing = await db.medicamentos.get(medicamentoId);
    if (!existing) return;
    await db.medicamentos.delete(medicamentoId);
    await db.syncQueue.add({
      id: generateId(),
      table: 'medicamentos',
      operation: 'delete',
      payload: { id: medicamentoId },
      created_at: timestamp,
      retry_count: 0,
      failed: false
    });
    triggerSyncProcess();
  });
}

// ---------- RENOVACOES ----------
export async function safeAddRenovacao(ren: Omit<Renovacao, 'id' | 'created_at' | 'updated_at' | 'synced'>): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();
  const full: Renovacao = { ...ren, id, created_at: timestamp, updated_at: timestamp, synced: false };
  return db.transaction('rw', db.renovacoes, db.syncQueue, async () => {
    await db.renovacoes.add(full);
    await db.syncQueue.add({
      id: generateId(),
      table: 'renovacoes',
      operation: 'add',
      payload: { ...full },
      created_at: timestamp,
      retry_count: 0,
      failed: false
    });
    triggerSyncProcess();
    return id;
  });
}

export async function safeUpdateRenovacao(id: string, changes: Partial<Renovacao>): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.renovacoes, db.syncQueue, async () => {
    const existing = await db.renovacoes.get(id);
    if (!existing) throw new Error('Renovação não encontrada');
    await db.renovacoes.update(id, { ...changes, updated_at: timestamp, synced: false });
    const updated = await db.renovacoes.get(id);
    if (updated) {
      await db.syncQueue.add({
        id: generateId(),
        table: 'renovacoes',
        operation: 'update',
        payload: { ...updated },
        created_at: timestamp,
        retry_count: 0,
        failed: false
      });
    }
    triggerSyncProcess();
  });
}

// ---------- DOSE LOGS ----------
export async function safeSetDoseLog(data: Omit<DoseLog, 'id' | 'created_at' | 'updated_at' | 'synced'>): Promise<string> {
  const timestamp = nowIso();
  const targetDate = data.data || getLocalTodayISO();
  const existing = await db.doseLogs
    .where('medicamento_id')
    .equals(data.medicamento_id)
    .filter((log) => log.data === targetDate && log.horario === data.horario)
    .first();

  if (existing) {
    await db.transaction('rw', db.doseLogs, db.syncQueue, async () => {
      await db.doseLogs.update(existing.id!, {
        ...data,
        data: targetDate,
        tomado_em: data.tomado_em,
        ignorado_em: data.ignorado_em,
        updated_at: timestamp,
        synced: false
      });
      const updated = await db.doseLogs.get(existing.id!);
      if (updated) {
        await db.syncQueue.add({
          id: generateId(),
          table: 'doseLogs',
          operation: 'update',
          payload: { ...updated },
          created_at: timestamp,
          retry_count: 0,
          failed: false
        });
      }
      triggerSyncProcess();
    });
    return existing.id!;
  }

  const id = generateId();
  const full: DoseLog = { ...data, data: targetDate, id, created_at: timestamp, updated_at: timestamp, synced: false };
  return db.transaction('rw', db.doseLogs, db.syncQueue, async () => {
    await db.doseLogs.add(full);
    await db.syncQueue.add({
      id: generateId(),
      table: 'doseLogs',
      operation: 'add',
      payload: { ...full },
      created_at: timestamp,
      retry_count: 0,
      failed: false
    });
    triggerSyncProcess();
    return id;
  });
}

// ---------- VAULTS ----------
export async function safeAddVault(vault: Omit<Vault, 'id' | 'created_at' | 'updated_at' | 'synced'>): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();
  const full: Vault = { ...vault, id, created_at: timestamp, updated_at: timestamp, synced: false };
  return db.transaction('rw', db.vaults, db.syncQueue, async () => {
    await db.vaults.add(full);
    await db.syncQueue.add({
      id: generateId(),
      table: 'vaults',
      operation: 'add',
      payload: { ...full },
      created_at: timestamp,
      retry_count: 0,
      failed: false
    });
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
    await db.syncQueue.add({
      id: generateId(),
      table: 'vaultMembers',
      operation: 'add',
      payload: { ...full },
      created_at: timestamp,
      retry_count: 0,
      failed: false
    });
    triggerSyncProcess();
    return id;
  });
}

export async function safeUpdateVaultMember(id: string, changes: Partial<VaultMember>): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.vaultMembers, db.syncQueue, async () => {
    const existing = await db.vaultMembers.get(id);
    if (!existing) throw new Error('Membro do vault não encontrado');
    await db.vaultMembers.update(id, { ...changes, updated_at: timestamp, synced: false });
    const updated = await db.vaultMembers.get(id);
    if (updated) {
      await db.syncQueue.add({
        id: generateId(),
        table: 'vaultMembers',
        operation: 'update',
        payload: { ...updated },
        created_at: timestamp,
        retry_count: 0,
        failed: false
      });
    }
    triggerSyncProcess();
  });
}

export async function shareDocumentWithVault(documentId: string, vaultId: string): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.documents, db.syncQueue, async () => {
    const document = await db.documents.get(documentId);
    if (!document) throw new Error('Documento não encontrado');
    await db.documents.update(documentId, { vault_id: vaultId, updated_at: timestamp, synced: false });
    const updated = await db.documents.get(documentId);
    if (updated) {
      await db.syncQueue.add({
        id: generateId(),
        table: 'documents',
        operation: 'update',
        payload: { ...updated },
        created_at: timestamp,
        retry_count: 0,
        failed: false
      });
    }
    triggerSyncProcess();
  });
}

export async function getVaultDocuments(vaultId: string): Promise<Document[]> {
  return db.documents.where('vault_id').equals(vaultId).toArray();
}

export async function getVaultMembers(vaultId: string): Promise<VaultMember[]> {
  return db.vaultMembers.where('vault_id').equals(vaultId).toArray();
}

// ---------- MEDICOS ----------
export async function safeAddMedico(data: Omit<Medico, 'id' | 'created_at' | 'updated_at' | 'synced'>): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();
  const full: Medico = { ...data, id, created_at: timestamp, updated_at: timestamp, synced: false };
  return db.transaction('rw', db.medicos, db.syncQueue, async () => {
    await db.medicos.add(full);
    await db.syncQueue.add({
      id: generateId(),
      table: 'medicos',
      operation: 'add',
      payload: { ...full },
      created_at: timestamp,
      retry_count: 0,
      failed: false
    });
    triggerSyncProcess();
    return id;
  });
}

export async function safeUpdateMedico(id: string, changes: Partial<Medico>): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.medicos, db.syncQueue, async () => {
    const existing = await db.medicos.get(id);
    if (!existing) throw new Error('Médico não encontrado');
    await db.medicos.update(id, { ...changes, updated_at: timestamp, synced: false });
    const updated = await db.medicos.get(id);
    if (updated) {
      await db.syncQueue.add({
        id: generateId(),
        table: 'medicos',
        operation: 'update',
        payload: { ...updated },
        created_at: timestamp,
        retry_count: 0,
        failed: false
      });
    }
    triggerSyncProcess();
  });
}

export async function safeDeleteMedico(id: string): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.medicos, db.syncQueue, async () => {
    const existing = await db.medicos.get(id);
    if (!existing) return;
    await db.medicos.delete(id);
    await db.syncQueue.add({
      id: generateId(),
      table: 'medicos',
      operation: 'delete',
      payload: { id },
      created_at: timestamp,
      retry_count: 0,
      failed: false
    });
    triggerSyncProcess();
  });
}

// ---------- FARMACIAS ----------
export async function safeAddFarmacia(data: Omit<Farmacia, 'id' | 'created_at' | 'updated_at' | 'synced'>): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();
  const full: Farmacia = { ...data, id, created_at: timestamp, updated_at: timestamp, synced: false };
  return db.transaction('rw', db.farmacias, db.syncQueue, async () => {
    await db.farmacias.add(full);
    await db.syncQueue.add({
      id: generateId(),
      table: 'farmacias',
      operation: 'add',
      payload: { ...full },
      created_at: timestamp,
      retry_count: 0,
      failed: false
    });
    triggerSyncProcess();
    return id;
  });
}

export async function safeUpdateFarmacia(id: string, changes: Partial<Farmacia>): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.farmacias, db.syncQueue, async () => {
    const existing = await db.farmacias.get(id);
    if (!existing) throw new Error('Farmácia não encontrada');
    await db.farmacias.update(id, { ...changes, updated_at: timestamp, synced: false });
    const updated = await db.farmacias.get(id);
    if (updated) {
      await db.syncQueue.add({
        id: generateId(),
        table: 'farmacias',
        operation: 'update',
        payload: { ...updated },
        created_at: timestamp,
        retry_count: 0,
        failed: false
      });
    }
    triggerSyncProcess();
  });
}

export async function safeDeleteFarmacia(id: string): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.farmacias, db.syncQueue, async () => {
    const existing = await db.farmacias.get(id);
    if (!existing) return;
    await db.farmacias.delete(id);
    await db.syncQueue.add({
      id: generateId(),
      table: 'farmacias',
      operation: 'delete',
      payload: { id },
      created_at: timestamp,
      retry_count: 0,
      failed: false
    });
    triggerSyncProcess();
  });
}

// ---------- HOSPITAIS ----------
export async function safeAddHospital(data: Omit<Hospital, 'id' | 'created_at' | 'updated_at' | 'synced'>): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();
  const full: Hospital = { ...data, id, created_at: timestamp, updated_at: timestamp, synced: false };
  return db.transaction('rw', db.hospitais, db.syncQueue, async () => {
    await db.hospitais.add(full);
    await db.syncQueue.add({
      id: generateId(),
      table: 'hospitais',
      operation: 'add',
      payload: { ...full },
      created_at: timestamp,
      retry_count: 0,
      failed: false
    });
    triggerSyncProcess();
    return id;
  });
}

export async function safeUpdateHospital(id: string, changes: Partial<Hospital>): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.hospitais, db.syncQueue, async () => {
    const existing = await db.hospitais.get(id);
    if (!existing) throw new Error('Hospital não encontrado');
    await db.hospitais.update(id, { ...changes, updated_at: timestamp, synced: false });
    const updated = await db.hospitais.get(id);
    if (updated) {
      await db.syncQueue.add({
        id: generateId(),
        table: 'hospitais',
        operation: 'update',
        payload: { ...updated },
        created_at: timestamp,
        retry_count: 0,
        failed: false
      });
    }
    triggerSyncProcess();
  });
}

export async function safeDeleteHospital(id: string): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.hospitais, db.syncQueue, async () => {
    const existing = await db.hospitais.get(id);
    if (!existing) return;
    await db.hospitais.delete(id);
    await db.syncQueue.add({
      id: generateId(),
      table: 'hospitais',
      operation: 'delete',
      payload: { id },
      created_at: timestamp,
      retry_count: 0,
      failed: false
    });
    triggerSyncProcess();
  });
}

// ---------- LOCAIS ----------
export async function safeAddLocal(data: Omit<LocalSaude, 'id' | 'created_at' | 'updated_at' | 'synced'>): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();
  const full: LocalSaude = { ...data, id, created_at: timestamp, updated_at: timestamp, synced: false };
  return db.transaction('rw', db.locais, db.syncQueue, async () => {
    await db.locais.add(full);
    await db.syncQueue.add({
      id: generateId(),
      table: 'locais',
      operation: 'add',
      payload: { ...full },
      created_at: timestamp,
      retry_count: 0,
      failed: false
    });
    triggerSyncProcess();
    return id;
  });
}

export async function safeUpdateLocal(id: string, changes: Partial<LocalSaude>): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.locais, db.syncQueue, async () => {
    const existing = await db.locais.get(id);
    if (!existing) throw new Error('Local não encontrado');
    await db.locais.update(id, { ...changes, updated_at: timestamp, synced: false });
    const updated = await db.locais.get(id);
    if (updated) {
      await db.syncQueue.add({
        id: generateId(),
        table: 'locais',
        operation: 'update',
        payload: { ...updated },
        created_at: timestamp,
        retry_count: 0,
        failed: false
      });
    }
    triggerSyncProcess();
  });
}

export async function safeDeleteLocal(id: string): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.locais, db.syncQueue, async () => {
    const existing = await db.locais.get(id);
    if (!existing) return;
    await db.locais.delete(id);
    await db.syncQueue.add({
      id: generateId(),
      table: 'locais',
      operation: 'delete',
      payload: { id },
      created_at: timestamp,
      retry_count: 0,
      failed: false
    });
    triggerSyncProcess();
  });
}

// ---------- LABORATORIOS ----------
export async function safeAddLaboratorio(data: Omit<Laboratorio, 'id' | 'created_at' | 'updated_at' | 'synced'>): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();
  const full: Laboratorio = { ...data, id, created_at: timestamp, updated_at: timestamp, synced: false };
  return db.transaction('rw', db.laboratorios, db.syncQueue, async () => {
    await db.laboratorios.add(full);
    await db.syncQueue.add({
      id: generateId(),
      table: 'laboratorios',
      operation: 'add',
      payload: { ...full },
      created_at: timestamp,
      retry_count: 0,
      failed: false
    });
    triggerSyncProcess();
    return id;
  });
}

export async function safeUpdateLaboratorio(id: string, changes: Partial<Laboratorio>): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.laboratorios, db.syncQueue, async () => {
    const existing = await db.laboratorios.get(id);
    if (!existing) throw new Error('Laboratório não encontrado');
    await db.laboratorios.update(id, { ...changes, updated_at: timestamp, synced: false });
    const updated = await db.laboratorios.get(id);
    if (updated) {
      await db.syncQueue.add({
        id: generateId(),
        table: 'laboratorios',
        operation: 'update',
        payload: { ...updated },
        created_at: timestamp,
        retry_count: 0,
        failed: false
      });
    }
    triggerSyncProcess();
  });
}

export async function safeDeleteLaboratorio(id: string): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.laboratorios, db.syncQueue, async () => {
    const existing = await db.laboratorios.get(id);
    if (!existing) return;
    await db.laboratorios.delete(id);
    await db.syncQueue.add({
      id: generateId(),
      table: 'laboratorios',
      operation: 'delete',
      payload: { id },
      created_at: timestamp,
      retry_count: 0,
      failed: false
    });
    triggerSyncProcess();
  });
}

// ---------- EXAMES ----------
export async function safeAddExame(data: Omit<Exame, 'id' | 'created_at' | 'updated_at' | 'synced'>): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();
  const full: Exame = { ...data, id, created_at: timestamp, updated_at: timestamp, synced: false };
  return db.transaction('rw', db.exames, db.syncQueue, async () => {
    await db.exames.add(full);
    await db.syncQueue.add({
      id: generateId(),
      table: 'exames',
      operation: 'add',
      payload: { ...full },
      created_at: timestamp,
      retry_count: 0,
      failed: false
    });
    triggerSyncProcess();
    return id;
  });
}

export async function safeUpdateExame(id: string, changes: Partial<Exame>): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.exames, db.syncQueue, async () => {
    const existing = await db.exames.get(id);
    if (!existing) throw new Error('Exame não encontrado');
    await db.exames.update(id, { ...changes, updated_at: timestamp, synced: false });
    const updated = await db.exames.get(id);
    if (updated) {
      await db.syncQueue.add({
        id: generateId(),
        table: 'exames',
        operation: 'update',
        payload: { ...updated },
        created_at: timestamp,
        retry_count: 0,
        failed: false
      });
    }
    triggerSyncProcess();
  });
}

export async function safeDeleteExame(id: string): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.exames, db.syncQueue, async () => {
    const existing = await db.exames.get(id);
    if (!existing) return;
    await db.exames.delete(id);
    await db.syncQueue.add({
      id: generateId(),
      table: 'exames',
      operation: 'delete',
      payload: { id },
      created_at: timestamp,
      retry_count: 0,
      failed: false
    });
    triggerSyncProcess();
  });
}

// ---------- CONSULTAS ----------
export async function safeAddConsulta(data: Omit<Consulta, 'id' | 'created_at' | 'updated_at' | 'synced'>): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();
  const full: Consulta = { ...data, id, created_at: timestamp, updated_at: timestamp, synced: false };
  return db.transaction('rw', db.consultas, db.syncQueue, async () => {
    await db.consultas.add(full);
    await db.syncQueue.add({
      id: generateId(),
      table: 'consultas',
      operation: 'add',
      payload: { ...full },
      created_at: timestamp,
      retry_count: 0,
      failed: false
    });
    triggerSyncProcess();
    return id;
  });
}

export async function safeUpdateConsulta(id: string, changes: Partial<Consulta>): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.consultas, db.syncQueue, async () => {
    const existing = await db.consultas.get(id);
    if (!existing) throw new Error('Consulta não encontrada');
    await db.consultas.update(id, { ...changes, updated_at: timestamp, synced: false });
    const updated = await db.consultas.get(id);
    if (updated) {
      await db.syncQueue.add({
        id: generateId(),
        table: 'consultas',
        operation: 'update',
        payload: { ...updated },
        created_at: timestamp,
        retry_count: 0,
        failed: false
      });
    }
    triggerSyncProcess();
  });
}

export async function safeDeleteConsulta(id: string): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.consultas, db.syncQueue, async () => {
    const existing = await db.consultas.get(id);
    if (!existing) return;
    await db.consultas.delete(id);
    await db.syncQueue.add({
      id: generateId(),
      table: 'consultas',
      operation: 'delete',
      payload: { id },
      created_at: timestamp,
      retry_count: 0,
      failed: false
    });
    triggerSyncProcess();
  });
}

// ---------- CIRURGIAS ----------
export async function safeAddCirurgia(data: Omit<Cirurgia, 'id' | 'created_at' | 'updated_at' | 'synced'>): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();
  const full: Cirurgia = { ...data, id, created_at: timestamp, updated_at: timestamp, synced: false };
  return db.transaction('rw', db.cirurgias, db.syncQueue, async () => {
    await db.cirurgias.add(full);
    await db.syncQueue.add({
      id: generateId(),
      table: 'cirurgias',
      operation: 'add',
      payload: { ...full },
      created_at: timestamp,
      retry_count: 0,
      failed: false
    });
    triggerSyncProcess();
    return id;
  });
}

export async function safeUpdateCirurgia(id: string, changes: Partial<Cirurgia>): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.cirurgias, db.syncQueue, async () => {
    const existing = await db.cirurgias.get(id);
    if (!existing) throw new Error('Cirurgia não encontrada');
    await db.cirurgias.update(id, { ...changes, updated_at: timestamp, synced: false });
    const updated = await db.cirurgias.get(id);
    if (updated) {
      await db.syncQueue.add({
        id: generateId(),
        table: 'cirurgias',
        operation: 'update',
        payload: { ...updated },
        created_at: timestamp,
        retry_count: 0,
        failed: false
      });
    }
    triggerSyncProcess();
  });
}

export async function safeDeleteCirurgia(id: string): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.cirurgias, db.syncQueue, async () => {
    const existing = await db.cirurgias.get(id);
    if (!existing) return;
    await db.cirurgias.delete(id);
    await db.syncQueue.add({
      id: generateId(),
      table: 'cirurgias',
      operation: 'delete',
      payload: { id },
      created_at: timestamp,
      retry_count: 0,
      failed: false
    });
    triggerSyncProcess();
  });
}

// ---------- CREDENTIALS ----------
export async function safeAddCredential(cred: Omit<Credential, 'id' | 'created_at' | 'updated_at' | 'synced'>): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();
  const full: Credential = { ...cred, id, created_at: timestamp, updated_at: timestamp, synced: false };
  return db.transaction('rw', db.credentials, db.syncQueue, async () => {
    await db.credentials.add(full);
    await db.syncQueue.add({
      id: generateId(),
      table: 'credentials',
      operation: 'add',
      payload: { ...full },
      created_at: timestamp,
      retry_count: 0,
      failed: false
    });
    triggerSyncProcess();
    return id;
  });
}

export async function safeUpdateCredential(id: string, changes: Partial<Credential>): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.credentials, db.syncQueue, async () => {
    const existing = await db.credentials.get(id);
    if (!existing) throw new Error('Credencial não encontrada');
    await db.credentials.update(id, { ...changes, updated_at: timestamp, synced: false });
    const updated = await db.credentials.get(id);
    if (updated) {
      await db.syncQueue.add({
        id: generateId(),
        table: 'credentials',
        operation: 'update',
        payload: { ...updated },
        created_at: timestamp,
        retry_count: 0,
        failed: false
      });
    }
    triggerSyncProcess();
  });
}

export async function safeDeleteCredential(id: string): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.credentials, db.syncQueue, async () => {
    const existing = await db.credentials.get(id);
    if (!existing) return;
    await db.credentials.delete(id);
    await db.syncQueue.add({
      id: generateId(),
      table: 'credentials',
      operation: 'delete',
      payload: { id },
      created_at: timestamp,
      retry_count: 0,
      failed: false
    });
    triggerSyncProcess();
  });
}

// ---------- CARDS ----------
export async function safeAddCard(card: Omit<BankCard, 'id' | 'created_at' | 'updated_at' | 'synced'>): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();
  const full: BankCard = { ...card, id, created_at: timestamp, updated_at: timestamp, synced: false };
  return db.transaction('rw', db.cards, db.syncQueue, async () => {
    await db.cards.add(full);
    await db.syncQueue.add({
      id: generateId(),
      table: 'cards',
      operation: 'add',
      payload: { ...full },
      created_at: timestamp,
      retry_count: 0,
      failed: false
    });
    triggerSyncProcess();
    return id;
  });
}

export async function safeUpdateCard(id: string, changes: Partial<BankCard>): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.cards, db.syncQueue, async () => {
    const existing = await db.cards.get(id);
    if (!existing) throw new Error('Cartão não encontrado');
    await db.cards.update(id, { ...changes, updated_at: timestamp, synced: false });
    const updated = await db.cards.get(id);
    if (updated) {
      await db.syncQueue.add({
        id: generateId(),
        table: 'cards',
        operation: 'update',
        payload: { ...updated },
        created_at: timestamp,
        retry_count: 0,
        failed: false
      });
    }
    triggerSyncProcess();
  });
}

export async function safeDeleteCard(id: string): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.cards, db.syncQueue, async () => {
    const existing = await db.cards.get(id);
    if (!existing) return;
    await db.cards.delete(id);
    await db.syncQueue.add({
      id: generateId(),
      table: 'cards',
      operation: 'delete',
      payload: { id },
      created_at: timestamp,
      retry_count: 0,
      failed: false
    });
    triggerSyncProcess();
  });
}

// ---------- INSTITUICOES ----------
export async function safeAddInstituicao(data: Omit<InstituicaoEnsino, 'id' | 'created_at' | 'updated_at' | 'synced'>): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();
  const full: InstituicaoEnsino = { ...data, id, created_at: timestamp, updated_at: timestamp, synced: false };
  return db.transaction('rw', db.instituicoes, db.syncQueue, async () => {
    await db.instituicoes.add(full);
    await db.syncQueue.add({
      id: generateId(),
      table: 'instituicoes',
      operation: 'add',
      payload: { ...full },
      created_at: timestamp,
      retry_count: 0,
      failed: false
    });
    triggerSyncProcess();
    return id;
  });
}

export async function safeUpdateInstituicao(id: string, changes: Partial<InstituicaoEnsino>): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.instituicoes, db.syncQueue, async () => {
    const existing = await db.instituicoes.get(id);
    if (!existing) throw new Error('Instituição de ensino não encontrada');
    await db.instituicoes.update(id, { ...changes, updated_at: timestamp, synced: false });
    const updated = await db.instituicoes.get(id);
    if (updated) {
      await db.syncQueue.add({
        id: generateId(),
        table: 'instituicoes',
        operation: 'update',
        payload: { ...updated },
        created_at: timestamp,
        retry_count: 0,
        failed: false
      });
    }
    triggerSyncProcess();
  });
}

export async function safeDeleteInstituicao(id: string): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.instituicoes, db.syncQueue, async () => {
    const existing = await db.instituicoes.get(id);
    if (!existing) return;
    await db.instituicoes.delete(id);
    await db.syncQueue.add({
      id: generateId(),
      table: 'instituicoes',
      operation: 'delete',
      payload: { id },
      created_at: timestamp,
      retry_count: 0,
      failed: false
    });
    triggerSyncProcess();
  });
}

// ---------- TRATAMENTOS ----------
export async function safeAddTratamento(data: Omit<Tratamento, 'id' | 'created_at' | 'updated_at' | 'synced'>): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();
  const full: Tratamento = { ...data, id, created_at: timestamp, updated_at: timestamp, synced: false };
  return db.transaction('rw', db.tratamentos, db.syncQueue, async () => {
    await db.tratamentos.add(full);
    await db.syncQueue.add({
      id: generateId(),
      table: 'tratamentos',
      operation: 'add',
      payload: { ...full },
      created_at: timestamp,
      retry_count: 0,
      failed: false
    });
    triggerSyncProcess();
    return id;
  });
}

export async function safeUpdateTratamento(id: string, changes: Partial<Tratamento>): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.tratamentos, db.syncQueue, async () => {
    const existing = await db.tratamentos.get(id);
    if (!existing) throw new Error('Tratamento não encontrado');
    await db.tratamentos.update(id, { ...changes, updated_at: timestamp, synced: false });
    const updated = await db.tratamentos.get(id);
    if (updated) {
      await db.syncQueue.add({
        id: generateId(),
        table: 'tratamentos',
        operation: 'update',
        payload: { ...updated },
        created_at: timestamp,
        retry_count: 0,
        failed: false
      });
    }
    triggerSyncProcess();
  });
}

export async function safeDeleteTratamento(id: string): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.tratamentos, db.medicamentos, db.exames, db.syncQueue, async () => {
    const existing = await db.tratamentos.get(id);
    if (!existing) return;

    // 🔧 LIMPEZA DE REFERÊNCIAS: remover este tratamento de todos os medicamentos
    const medicamentos = await db.medicamentos.toArray();
    for (const med of medicamentos) {
      if (med.tratamento_ids && med.tratamento_ids.includes(id)) {
        med.tratamento_ids = med.tratamento_ids.filter((tid: string) => tid !== id);
        await db.medicamentos.update(med.id!, { tratamento_ids: med.tratamento_ids, updated_at: timestamp, synced: false });
        // Adicionar à syncQueue para sincronizar a atualização
        const updatedMed = await db.medicamentos.get(med.id!);
        if (updatedMed) {
          await db.syncQueue.add({
            id: generateId(),
            table: 'medicamentos',
            operation: 'update',
            payload: { ...updatedMed },
            created_at: timestamp,
            retry_count: 0,
            failed: false
          });
        }
      }
    }

    // 🔧 LIMPEZA DE REFERÊNCIAS: remover este tratamento de todos os exames
    const exames = await db.exames.toArray();
    for (const exame of exames) {
      if (exame.tratamento_ids && exame.tratamento_ids.includes(id)) {
        exame.tratamento_ids = exame.tratamento_ids.filter((tid: string) => tid !== id);
        await db.exames.update(exame.id!, { tratamento_ids: exame.tratamento_ids, updated_at: timestamp, synced: false });
        const updatedExame = await db.exames.get(exame.id!);
        if (updatedExame) {
          await db.syncQueue.add({
            id: generateId(),
            table: 'exames',
            operation: 'update',
            payload: { ...updatedExame },
            created_at: timestamp,
            retry_count: 0,
            failed: false
          });
        }
      }
    }

    // Deletar o tratamento
    await db.tratamentos.delete(id);
    await db.syncQueue.add({
      id: generateId(),
      table: 'tratamentos',
      operation: 'delete',
      payload: { id },
      created_at: timestamp,
      retry_count: 0,
      failed: false
    });
    triggerSyncProcess();
  });
}

// ---------- CIDS ----------
export async function safeAddCid(data: Omit<Cid, 'id' | 'created_at' | 'updated_at' | 'synced'>): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();
  const full: Cid = { ...data, id, created_at: timestamp, updated_at: timestamp, synced: true };
  await db.transaction('rw', db.cids, async () => {
    await db.cids.add(full);
  });
  return id;
}

export async function safeUpdateCid(id: string, changes: Partial<Cid>): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.cids, async () => {
    const existing = await db.cids.get(id);
    if (!existing) throw new Error('CID não encontrado');
    await db.cids.update(id, { ...changes, updated_at: timestamp });
  });
}

export async function safeDeleteCid(id: string): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.cids, db.tratamentos, db.syncQueue, async () => {
    const existing = await db.cids.get(id);
    if (!existing) return;

    // 🔧 LIMPEZA DE REFERÊNCIAS: remover este CID de todos os tratamentos
    const tratamentos = await db.tratamentos.toArray();
    for (const trat of tratamentos) {
      if (trat.cid_ids && trat.cid_ids.includes(id)) {
        trat.cid_ids = trat.cid_ids.filter((cidId: string) => cidId !== id);
        await db.tratamentos.update(trat.id!, { cid_ids: trat.cid_ids, updated_at: timestamp, synced: false });
        const updatedTrat = await db.tratamentos.get(trat.id!);
        if (updatedTrat) {
          await db.syncQueue.add({
            id: generateId(),
            table: 'tratamentos',
            operation: 'update',
            payload: { ...updatedTrat },
            created_at: timestamp,
            retry_count: 0,
            failed: false
          });
        }
      }
    }

    // Deletar o CID
    await db.cids.delete(id);
    // Não precisamos adicionar à syncQueue para delete de CID, pois é uma entidade de domínio que não é sincronizada para Supabase (mas mantemos por consistência)
    triggerSyncProcess();
  });
}

// ---------- ANEXOS CLINICOS ----------
export async function safeAddAnexoClinico(data: Omit<any, 'id' | 'created_at' | 'updated_at' | 'synced'>): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();
  const full = { ...data, id, created_at: timestamp, updated_at: timestamp, synced: false };
  return db.transaction('rw', db.anexos_clinicos, db.syncQueue, async () => {
    await db.anexos_clinicos.add(full);
    await db.syncQueue.add({
      id: generateId(),
      table: 'anexos_clinicos',
      operation: 'add',
      payload: { ...full },
      created_at: timestamp,
      retry_count: 0,
      failed: false
    });
    triggerSyncProcess();
    return id;
  });
}

export async function safeUpdateAnexoClinico(id: string, changes: Partial<any>): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.anexos_clinicos, db.syncQueue, async () => {
    const existing = await db.anexos_clinicos.get(id);
    if (!existing) throw new Error('Anexo clínico não encontrado');
    await db.anexos_clinicos.update(id, { ...changes, updated_at: timestamp, synced: false });
    const updated = await db.anexos_clinicos.get(id);
    if (updated) {
      await db.syncQueue.add({
        id: generateId(),
        table: 'anexos_clinicos',
        operation: 'update',
        payload: { ...updated },
        created_at: timestamp,
        retry_count: 0,
        failed: false
      });
    }
    triggerSyncProcess();
  });
}

export async function safeDeleteAnexoClinico(id: string): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.anexos_clinicos, db.syncQueue, async () => {
    const existing = await db.anexos_clinicos.get(id);
    if (!existing) return;
    await db.anexos_clinicos.delete(id);
    await db.syncQueue.add({
      id: generateId(),
      table: 'anexos_clinicos',
      operation: 'delete',
      payload: { id },
      created_at: timestamp,
      retry_count: 0,
      failed: false
    });
    triggerSyncProcess();
  });
}