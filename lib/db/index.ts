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
  AppSettings,
} from '@/lib/types';
import { deleteFile } from '@/lib/supabase/storage';
import { getLocalTodayISO } from '@/lib/health-utils';

// ============================================================
// HELPERS
// ============================================================

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
    /[xy]/g,
    (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    }
  );
}

function nowIso(): string {
  return new Date().toISOString();
}

// ============================================================
// TIPOS INTERNOS DE RELACIONAMENTOS LEGADOS
// ============================================================

interface MedicamentoTratamento {
  id?: string;
  medicamento_id: string;
  tratamento_id: string;
}

interface ExameTratamento {
  id?: string;
  exame_id: string;
  tratamento_id: string;
}

interface AnexoClinico {
  id?: string;
  user_id: string;
  person_id?: string;
  medicamento_id?: string;
  exame_id?: string;
  consulta_id?: string;
  cirurgia_id?: string;
  tratamento_id?: string;
  tipo?: string;
  nome?: string;
  url?: string;
  thumbnail_url?: string;
  created_at?: string;
  updated_at?: string;
  synced?: boolean;
  [key: string]: unknown;
}

// ============================================================
// DATABASE
// ============================================================

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

  exames!: Table<Exame, string>;
  doseLogs!: Table<DoseLog, string>;

  credentials!: Table<Credential, string>;
  bankCards!: Table<BankCard, string>;

  instituicoes!: Table<InstituicaoEnsino, string>;
  tratamentos!: Table<Tratamento, string>;
  cids!: Table<Cid, string>;

  consultas!: Table<Consulta, string>;
  cirurgias!: Table<Cirurgia, string>;

  anexos_clinicos!: Table<AnexoClinico, string>;

  settings!: Table<AppSettings, string>;

  medicamento_tratamentos!: Table<MedicamentoTratamento, string>;
  exame_tratamentos!: Table<ExameTratamento, string>;

  constructor() {
    super('vault-db');

    // ==========================================================
    // VERSÃO 2
    // ==========================================================

    this.version(2).stores({
      persons: 'id',
      documents: 'id',
      syncQueue: 'id',
    });

    // ==========================================================
    // VERSÃO 3
    // ==========================================================

    this.version(3).stores({
      medicamentos: 'id',
      renovacoes: 'id',
    });

    // ==========================================================
    // VERSÃO 4
    // ==========================================================

    this.version(4).stores({
      vaults: 'id',
      vaultMembers: 'id',
    });

    // ==========================================================
    // VERSÃO 5
    // ==========================================================

    this.version(5).stores({
      medicos: 'id',
      farmacias: 'id',
      hospitais: 'id',
    });

    // ==========================================================
    // VERSÃO 6
    // ==========================================================

    this.version(6).stores({
      documents: 'id',
    });

    // ==========================================================
    // VERSÃO 7
    // ==========================================================

    this.version(7).stores({
      medicamentos: null,
      renovacoes: null,
    });

    // ==========================================================
    // VERSÃO 8
    // ==========================================================

    this.version(8).stores({
      medicamentos: 'id',
      renovacoes: 'id',
    });

    // ==========================================================
    // VERSÃO 9
    // ==========================================================

    this.version(9).stores({
      doseLogs: 'id',
    });

    // ==========================================================
    // VERSÃO 10
    // ==========================================================

    this.version(10).stores({
      credentials: 'id',
    });

    // ==========================================================
    // VERSÃO 11
    // ==========================================================

    this.version(11).stores({
      bankCards: 'id',
    });

    // ==========================================================
    // VERSÃO 12
    // ==========================================================

    this.version(12).stores({
      instituicoes: 'id',
      tratamentos: 'id',
    });

    // ==========================================================
    // VERSÃO 13
    // ==========================================================

    this.version(13).stores({
      laboratorios: 'id',
    });

    // ==========================================================
    // VERSÃO 14
    // ==========================================================

    this.version(14).stores({
      exames: 'id',
    });

    // ==========================================================
    // VERSÃO 15
    // ==========================================================

    this.version(15).stores({
      medicamento_tratamentos: 'id',
      anexos_clinicos: 'id',
    });

    // ==========================================================
    // VERSÃO 16
    // ==========================================================

    this.version(16).stores({
      cids: 'id',
      exame_tratamentos: 'id',
    });

    // ==========================================================
    // VERSÃO 17
    // ==========================================================

    this.version(17).stores({
      locais: 'id',
      consultas: 'id',
      cirurgias: 'id',
    });

    // ==========================================================
    // VERSÃO 18
    // ==========================================================

    this.version(18)
      .stores({
        persons:
          'id, user_id, name, synced, updated_at',

        documents:
          'id, user_id, person_id, category_id, is_favorite, synced, updated_at, vault_id, hospital_id, medico_id',

        medicamentos:
          'id, user_id, person_id, document_id, medico_id, farmacia_id, estabelecimento_id, status, synced, updated_at, *tratamento_ids',

        renovacoes:
          'id, user_id, person_id, medicamento_id, medico_id, farmacia_id, local_id, synced, updated_at',

        medicos:
          'id, user_id, nome, especialidade, synced, updated_at',

        farmacias:
          'id, user_id, nome, synced, updated_at',

        hospitais:
          'id, user_id, nome, tipo, synced, updated_at',

        locais:
          'id, user_id, nome, synced, updated_at',

        laboratorios:
          'id, user_id, nome, synced, updated_at',

        exames:
          'id, user_id, person_id, medico_id, laboratorio_id, synced, updated_at, *tratamento_ids',

        consultas:
          'id, user_id, person_id, medico_id, hospital_id, status, synced, updated_at',

        cirurgias:
          'id, user_id, person_id, medico_id, hospital_id, status, synced, updated_at',

        doseLogs:
          'id, user_id, person_id, medicamento_id, data, horario, synced, updated_at',

        credentials:
          'id, user_id, vault_id, category, synced, updated_at',

        bankCards:
          'id, user_id, type, synced, updated_at',

        instituicoes:
          'id, user_id, nome, synced, updated_at',

        tratamentos:
          'id, user_id, person_id, nome, status, synced, updated_at, *cid_ids',

        cids:
          'id, user_id, codigo, synced, updated_at',

        anexos_clinicos:
          'id, user_id, synced, updated_at',

        syncQueue:
          'id, table, operation, created_at, retry_count, failed',
      })
      .upgrade(async (tx) => {
        const medicamentos = await tx
          .table('medicamentos')
          .toArray();

        const vinculosMedicamentos = await tx
          .table('medicamento_tratamentos')
          .toArray();

        const vinculosPorMedicamento = new Map<
          string,
          string[]
        >();

        for (const vinculo of vinculosMedicamentos) {
          const lista =
            vinculosPorMedicamento.get(
              vinculo.medicamento_id
            ) ?? [];

          lista.push(vinculo.tratamento_id);

          vinculosPorMedicamento.set(
            vinculo.medicamento_id,
            lista
          );
        }

        for (const med of medicamentos) {
          const medRaw = med as any;

          if (
            Array.isArray(medRaw.tratamento_ids) &&
            medRaw.tratamento_ids.length > 0
          ) {
            continue;
          }

          const ids =
            vinculosPorMedicamento.get(medRaw.id) ?? [];

          if (
            ids.length === 0 &&
            medRaw.tratamento_id
          ) {
            ids.push(medRaw.tratamento_id);
          }

          if (ids.length > 0) {
            await tx
              .table('medicamentos')
              .update(medRaw.id, {
                tratamento_ids: ids,
              });
          }
        }

        const exames = await tx
          .table('exames')
          .toArray();

        const vinculosExames = await tx
          .table('exame_tratamentos')
          .toArray();

        const vinculosPorExame = new Map<
          string,
          string[]
        >();

        for (const vinculo of vinculosExames) {
          const lista =
            vinculosPorExame.get(
              vinculo.exame_id
            ) ?? [];

          lista.push(vinculo.tratamento_id);

          vinculosPorExame.set(
            vinculo.exame_id,
            lista
          );
        }

        for (const exame of exames) {
          const exameRaw = exame as any;

          if (
            Array.isArray(exameRaw.tratamento_ids) &&
            exameRaw.tratamento_ids.length > 0
          ) {
            continue;
          }

          const ids =
            vinculosPorExame.get(exameRaw.id) ?? [];

          if (ids.length > 0) {
            await tx
              .table('exames')
              .update(exameRaw.id, {
                tratamento_ids: ids,
              });
          }
        }
      });

    // ==========================================================
    // VERSÃO 19
    // ==========================================================

    this.version(19)
      .stores({
        persons:
          'id, user_id, name, synced, updated_at',

        documents:
          'id, user_id, person_id, category_id, is_favorite, synced, updated_at, vault_id, hospital_id, medico_id',

        medicamentos:
          'id, user_id, person_id, document_id, medico_id, farmacia_id, estabelecimento_id, status, synced, updated_at, *tratamento_ids',

        renovacoes:
          'id, user_id, person_id, medicamento_id, medico_id, farmacia_id, local_id, synced, updated_at',

        medicos:
          'id, user_id, nome, especialidade, synced, updated_at',

        farmacias:
          'id, user_id, nome, synced, updated_at',

        hospitais:
          'id, user_id, nome, tipo, synced, updated_at',

        locais:
          'id, user_id, nome, synced, updated_at',

        laboratorios:
          'id, user_id, nome, synced, updated_at',

        exames:
          'id, user_id, person_id, medico_id, laboratorio_id, synced, updated_at, *tratamento_ids',

        consultas:
          'id, user_id, person_id, medico_id, hospital_id, status, synced, updated_at',

        cirurgias:
          'id, user_id, person_id, medico_id, hospital_id, status, synced, updated_at',

        doseLogs:
          'id, user_id, person_id, medicamento_id, data, horario, synced, updated_at',

        credentials:
          'id, user_id, vault_id, category, synced, updated_at',

        bankCards:
          'id, user_id, type, synced, updated_at',

        instituicoes:
          'id, user_id, nome, synced, updated_at',

        tratamentos:
          'id, user_id, person_id, nome, status, synced, updated_at, *cid_ids',

        cids:
          'id, user_id, codigo, synced, updated_at',

        anexos_clinicos:
          'id, user_id, synced, updated_at',

        syncQueue:
          'id, table, operation, created_at, retry_count, failed',
      })
      .upgrade(async (tx) => {
        const tratamentos = await tx
          .table('tratamentos')
          .toArray();

        for (const tratamento of tratamentos) {
          const tratRaw = tratamento as any;

          if (
            Array.isArray(tratRaw.cid_ids)
          ) {
            continue;
          }

          const cidIds =
            tratRaw.cid_id
              ? [tratRaw.cid_id]
              : [];

          await tx
            .table('tratamentos')
            .update(tratRaw.id, {
              cid_ids: cidIds,
            });
        }
      });

    // ==========================================================
    // VERSÃO 20
    // ==========================================================

    this.version(20)
      .stores({
        persons:
          'id, user_id, name, synced, updated_at',

        documents:
          'id, user_id, person_id, category_id, is_favorite, synced, updated_at, vault_id, hospital_id, medico_id',

        medicamentos:
          'id, user_id, person_id, document_id, medico_id, farmacia_id, hospital_id, local_id, status, synced, updated_at, *tratamento_ids',

        renovacoes:
          'id, user_id, person_id, medicamento_id, medico_id, farmacia_id, hospital_id, local_id, synced, updated_at',

        medicos:
          'id, user_id, nome, especialidade, synced, updated_at',

        farmacias:
          'id, user_id, nome, synced, updated_at',

        hospitais:
          'id, user_id, nome, tipo, synced, updated_at',

        locais:
          'id, user_id, nome, synced, updated_at',

        exames:
          'id, user_id, person_id, medico_id, local_id, synced, updated_at, *tratamento_ids',

        consultas:
          'id, user_id, person_id, medico_id, hospital_id, local_id, status, synced, updated_at',

        cirurgias:
          'id, user_id, person_id, medico_id, hospital_id, local_id, status, synced, updated_at',

        doseLogs:
          'id, user_id, person_id, medicamento_id, data, horario, synced, updated_at',

        credentials:
          'id, user_id, vault_id, category, synced, updated_at',

        bankCards:
          'id, user_id, type, synced, updated_at',

        instituicoes:
          'id, user_id, nome, synced, updated_at',

        tratamentos:
          'id, user_id, person_id, nome, status, synced, updated_at, *cid_ids',

        cids:
          'id, user_id, codigo, synced, updated_at',

        anexos_clinicos:
          'id, user_id, synced, updated_at',

        syncQueue:
          'id, table, operation, created_at, retry_count, failed',

        laboratorios: null,
      })
      .upgrade(async (tx) => {
        const medicamentos = await tx
          .table('medicamentos')
          .toArray();

        for (const medicamento of medicamentos) {
          const medRaw = medicamento as any;

          if (
            !medRaw.local_id &&
            medRaw.estabelecimento_id
          ) {
            await tx
              .table('medicamentos')
              .update(medRaw.id, {
                local_id:
                  medRaw.estabelecimento_id,
              });
          }
        }

        const exames = await tx
          .table('exames')
          .toArray();

        for (const exame of exames) {
          const exameRaw = exame as any;

          if (
            !exameRaw.local_id &&
            exameRaw.laboratorio_id
          ) {
            await tx
              .table('exames')
              .update(exameRaw.id, {
                local_id: exameRaw.laboratorio_id,
              });
          }
        }
      });

    // ==========================================================
    // VERSÃO 21 (PULADA)
    // ==========================================================

    // ==========================================================
    // VERSÃO 22
    // ==========================================================

    this.version(22).stores({
      renovacoes:
        'id, user_id, person_id, medicamento_id, medico_id, farmacia_id, hospital_id, local_id, document_id, data, tipo_aquisicao, data_proxima_retirada, exige_nova_receita, synced, updated_at',
    });

    // ==========================================================
    // VERSÃO 23
    // ==========================================================

    this.version(23).stores({
      persons:
        'id, user_id, name, synced, updated_at',

      documents:
        'id, user_id, person_id, category_id, is_favorite, synced, updated_at, vault_id, hospital_id, medico_id',

      medicamentos:
        'id, user_id, person_id, document_id, medico_id, farmacia_id, hospital_id, local_id, status, synced, updated_at, *tratamento_ids',

      renovacoes:
        'id, user_id, person_id, medicamento_id, medico_id, farmacia_id, hospital_id, local_id, document_id, data, tipo_aquisicao, data_proxima_retirada, exige_nova_receita, synced, updated_at',

      medicos:
        'id, user_id, nome, especialidade, synced, updated_at',

      farmacias:
        'id, user_id, nome, synced, updated_at',

      hospitais:
        'id, user_id, nome, tipo, synced, updated_at',

      locais:
        'id, user_id, nome, synced, updated_at',

      exames:
        'id, user_id, person_id, medico_id, local_id, document_id, data, synced, updated_at, *tratamento_ids',

      consultas:
        'id, user_id, person_id, medico_id, hospital_id, local_id, document_id, status, data, synced, updated_at',

      cirurgias:
        'id, user_id, person_id, medico_id, hospital_id, local_id, document_id, status, data, synced, updated_at',

      doseLogs:
        'id, user_id, person_id, medicamento_id, data, horario, synced, updated_at',

      credentials:
        'id, user_id, vault_id, category, synced, updated_at',

      bankCards:
        'id, user_id, type, synced, updated_at',

      instituicoes:
        'id, user_id, nome, synced, updated_at',

      tratamentos:
        'id, user_id, person_id, nome, status, synced, updated_at, *cid_ids',

      cids:
        'id, user_id, person_id, codigo, medico_id, hospital_id, local_id, synced, updated_at',

      anexos_clinicos:
        'id, user_id, synced, updated_at',

      syncQueue:
        'id, chave, table, operation, created_at, retry_count, failed',

      laboratorios: null,
    });

    // ==========================================================
    // VERSÃO 24
    //
    // Adiciona tabela settings para armazenar preferências do usuário
    // como default_person_id (pessoa padrão) e futuras configurações.
    // ==========================================================

    this.version(24).stores({
      settings: 'id, user_id, default_person_id, updated_at',
    });
  }
}

// ============================================================
// INSTÂNCIA ÚNICA
// ============================================================

export const db = new VaultDB();

// ============================================================
// MEDICAMENTO ↔ TRATAMENTO
// ============================================================

export async function syncMedicamentoTratamentos(
  medicamentoId: string,
  tratamentoIds: string[]
): Promise<void> {
  const timestamp = nowIso();

  const existing =
    await db.medicamentos.get(medicamentoId);

  if (!existing) {
    throw new Error('Medicamento não encontrado');
  }

  await db.medicamentos.update(medicamentoId, {
    tratamento_ids: tratamentoIds,
    synced: false,
  });
}

// ============================================================
// PERSONS
// ============================================================

export async function safeAddPerson(
  person: Omit<
    Person,
    'id' | 'created_at' | 'updated_at' | 'synced'
  >
): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();

  const full: Person = {
    ...person,
    id,
    synced: false,
    created_at: timestamp, updated_at: timestamp,
  };

  await db.persons.add(full);

  return id;
}

export async function safeUpdatePerson(
  id: string,
  changes: Partial<Person>
): Promise<void> {
  const timestamp = nowIso();

  const existing = await db.persons.get(id);

  if (!existing) {
    throw new Error('Pessoa não encontrada');
  }

  await db.persons.update(id, {
    ...changes,
    synced: false,
  });
}

export async function safeDeletePerson(
  id: string
): Promise<void> {
  await db.persons.delete(id);
}

// ============================================================
// DOCUMENTS
// ============================================================

export async function safeAddDocument(
  doc: Omit<
    Document,
    'id' | 'created_at' | 'updated_at' | 'synced'
  >
): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();

  const full: Document = {
    ...doc,
    id,
    synced: false,
    created_at: timestamp, updated_at: timestamp,
  };

  await db.documents.add(full);

  return id;
}

export async function safeUpdateDocument(
  id: string,
  changes: Partial<Document>
): Promise<void> {
  const timestamp = nowIso();

  const document =
    await db.documents.get(id);

  if (!document) {
    throw new Error('Documento não encontrado');
  }

  await db.documents.update(id, {
    ...changes,
    synced: false,
  });
}

export async function safeDeleteDocument(
  id: string
): Promise<void> {
  const document =
    await db.documents.get(id);

  if (!document) {
    throw new Error('Documento não encontrado');
  }

  if (
    document.attachments &&
    document.attachments.length > 0
  ) {
    for (const attachment of document.attachments) {
      if (
        attachment.url &&
        !attachment.url.startsWith('blob:')
      ) {
        try {
          await deleteFile(attachment.url);
        } catch (error) {
          console.error(
            'Erro ao deletar anexo:',
            attachment.url,
            error
          );
        }
      }
    }
  }

  await db.documents.delete(id);
}

export async function toggleFavorite(
  id: string
): Promise<void> {
  const document =
    await db.documents.get(id);

  if (!document) {
    return;
  }

  await safeUpdateDocument(id, {
    is_favorite: !document.is_favorite,
  });
}

// ============================================================
// MEDICAMENTOS
// ============================================================

export async function safeAddMedicamento(
  med: Omit<
    Medicamento,
    'id' | 'created_at' | 'updated_at' | 'synced'
  >
): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();

  const full: Medicamento = {
    ...med,
    id,
    created_at: timestamp, updated_at: timestamp,
    synced: false,
  };

  await db.medicamentos.add(full);

  return id;
}

export async function safeUpdateMedicamento(
  id: string,
  changes: Partial<Medicamento>
): Promise<void> {
  const timestamp = nowIso();

  const existing =
    await db.medicamentos.get(id);

  if (!existing) {
    throw new Error('Medicamento não encontrado');
  }

  await db.medicamentos.update(id, {
    ...changes,
    synced: false,
  });
}

export async function safeDeleteMedicamento(
  medicamentoId: string
): Promise<void> {
  await db.medicamentos.delete(medicamentoId);
}

// ============================================================
// RENOVAÇÕES
// ============================================================

export async function safeAddRenovacao(
  ren: Omit<
    Renovacao,
    'id' | 'created_at' | 'updated_at' | 'synced'
  >
): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();

  const full: Renovacao = {
    ...ren,
    id,
    created_at: timestamp, updated_at: timestamp,
    synced: false,
  };

  await db.renovacoes.add(full);

  return id;
}

export async function safeUpdateRenovacao(
  id: string,
  changes: Partial<Renovacao>
): Promise<void> {
  const timestamp = nowIso();

  const existing =
    await db.renovacoes.get(id);

  if (!existing) {
    throw new Error('Renovação não encontrada');
  }

  await db.renovacoes.update(id, {
    ...changes,
    synced: false,
  });
}

export async function safeDeleteRenovacao(
  id: string
): Promise<void> {
  await db.renovacoes.delete(id);
}

// ============================================================
// DOSE LOGS
// ============================================================

export async function safeSetDoseLog(
  data: Omit<
    DoseLog,
    'id' | 'created_at' | 'updated_at' | 'synced'
  >
): Promise<string> {
  const timestamp = nowIso();

  const targetDate =
    data.data || getLocalTodayISO();

  const existing = await db.doseLogs
    .where('medicamento_id')
    .equals(data.medicamento_id)
    .filter(
      (log) =>
        log.data === targetDate &&
        log.horario === data.horario
    )
    .first();

  if (existing) {
    await db.doseLogs.update(existing.id!, {
      ...data,
      data: targetDate,
      tomado_em: data.tomado_em,
      ignorado_em: data.ignorado_em,
      synced: false,
    });

    return existing.id!;
  }

  const id = generateId();

  const full: DoseLog = {
    ...data,
    data: targetDate,
    id,
    created_at: timestamp, updated_at: timestamp,
    synced: false,
  };

  await db.doseLogs.add(full);

  return id;
}

// ============================================================
// VAULTS
// ============================================================

export async function safeAddVault(
  vault: Omit<
    Vault,
    'id' | 'created_at' | 'updated_at' | 'synced'
  >
): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();

  const full: Vault = {
    ...vault,
    id,
    created_at: timestamp, updated_at: timestamp,
    synced: false,
  };

  await db.vaults.add(full);

  return id;
}

export async function safeAddVaultMember(
  member: Omit<
    VaultMember,
    'id' | 'invited_at' | 'updated_at' | 'synced'
  >
): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();

  const full: VaultMember = {
    ...member,
    id,
    invited_at: timestamp,
    updated_at: new Date().toISOString(),
    synced: false,
  };

  await db.vaultMembers.add(full);

  return id;
}

export async function safeUpdateVaultMember(
  id: string,
  changes: Partial<VaultMember>
): Promise<void> {
  const timestamp = nowIso();

  const existing =
    await db.vaultMembers.get(id);

  if (!existing) {
    throw new Error(
      'Membro do vault não encontrado'
    );
  }

  await db.vaultMembers.update(id, {
    ...changes,
    synced: false,
  });
}

export async function shareDocumentWithVault(
  documentId: string,
  vaultId: string
): Promise<void> {
  const timestamp = nowIso();

  const document =
    await db.documents.get(documentId);

  if (!document) {
    throw new Error('Documento não encontrado');
  }

  await db.documents.update(documentId, {
    vault_id: vaultId,
    synced: false,
  });
}

export async function getVaultDocuments(
  vaultId: string
): Promise<Document[]> {
  return db.documents
    .where('vault_id')
    .equals(vaultId)
    .toArray();
}

export async function getVaultMembers(
  vaultId: string
): Promise<VaultMember[]> {
  return db.vaultMembers
    .where('vault_id')
    .equals(vaultId)
    .toArray();
}

// ============================================================
// MÉDICOS
// ============================================================

export async function safeAddMedico(
  data: Omit<
    Medico,
    'id' | 'created_at' | 'updated_at' | 'synced'
  >
): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();

  const full: Medico = {
    ...data,
    id,
    created_at: timestamp, updated_at: timestamp,
    synced: false,
  };

  await db.medicos.add(full);

  return id;
}

export async function safeUpdateMedico(
  id: string,
  changes: Partial<Medico>
): Promise<void> {
  const timestamp = nowIso();

  const existing =
    await db.medicos.get(id);

  if (!existing) {
    throw new Error('Médico não encontrado');
  }

  await db.medicos.update(id, {
    ...changes,
    synced: false,
  });
}

export async function safeDeleteMedico(
  id: string
): Promise<void> {
  await db.medicos.delete(id);
}

// ============================================================
// FARMÁCIAS
// ============================================================

export async function safeAddFarmacia(
  data: Omit<
    Farmacia,
    'id' | 'created_at' | 'updated_at' | 'synced'
  >
): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();

  const full: Farmacia = {
    ...data,
    id,
    created_at: timestamp, updated_at: timestamp,
    synced: false,
  };

  await db.farmacias.add(full);

  return id;
}

export async function safeUpdateFarmacia(
  id: string,
  changes: Partial<Farmacia>
): Promise<void> {
  const timestamp = nowIso();

  const existing =
    await db.farmacias.get(id);

  if (!existing) {
    throw new Error(
      'Farmácia não encontrada'
    );
  }

  await db.farmacias.update(id, {
    ...changes,
    synced: false,
  });
}

export async function safeDeleteFarmacia(
  id: string
): Promise<void> {
  await db.farmacias.delete(id);
}

// ============================================================
// HOSPITAIS
// ============================================================

export async function safeAddHospital(
  data: Omit<
    Hospital,
    'id' | 'created_at' | 'updated_at' | 'synced'
  >
): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();

  const full: Hospital = {
    ...data,
    id,
    created_at: timestamp, updated_at: timestamp,
    synced: false,
  };

  await db.hospitais.add(full);

  return id;
}

export async function safeUpdateHospital(
  id: string,
  changes: Partial<Hospital>
): Promise<void> {
  const timestamp = nowIso();

  const existing =
    await db.hospitais.get(id);

  if (!existing) {
    throw new Error(
      'Hospital não encontrado'
    );
  }

  await db.hospitais.update(id, {
    ...changes,
    synced: false,
  });
}

export async function safeDeleteHospital(
  id: string
): Promise<void> {
  await db.hospitais.delete(id);
}

// ============================================================
// LOCAIS DE SAÚDE
// ============================================================

export async function safeAddLocal(
  data: Omit<
    LocalSaude,
    'id' | 'created_at' | 'updated_at' | 'synced'
  >
): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();

  const full: LocalSaude = {
    ...data,
    id,
    created_at: timestamp, updated_at: timestamp,
    synced: false,
  };

  await db.locais.add(full);

  return id;
}

export async function safeUpdateLocal(
  id: string,
  changes: Partial<LocalSaude>
): Promise<void> {
  const timestamp = nowIso();

  const existing =
    await db.locais.get(id);

  if (!existing) {
    throw new Error(
      'Local não encontrado'
    );
  }

  await db.locais.update(id, {
    ...changes,
    synced: false,
  });
}

export async function safeDeleteLocal(
  id: string
): Promise<void> {
  await db.locais.delete(id);
}

// ============================================================
// EXAMES
// ============================================================

export async function safeAddExame(
  data: Omit<
    Exame,
    'id' | 'created_at' | 'updated_at' | 'synced'
  >
): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();

  const full: Exame = {
    ...data,
    id,
    created_at: timestamp, updated_at: timestamp,
    synced: false,
  };

  await db.exames.add(full);

  return id;
}

export async function safeUpdateExame(
  id: string,
  changes: Partial<Exame>
): Promise<void> {
  const timestamp = nowIso();

  const existing =
    await db.exames.get(id);

  if (!existing) {
    throw new Error(
      'Exame não encontrado'
    );
  }

  await db.exames.update(id, {
    ...changes,
    synced: false,
  });
}

export async function safeDeleteExame(
  id: string
): Promise<void> {
  await db.exames.delete(id);
}

// ============================================================
// CONSULTAS
// ============================================================

export async function safeAddConsulta(
  data: Omit<
    Consulta,
    'id' | 'created_at' | 'updated_at' | 'synced'
  >
): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();

  const full: Consulta = {
    ...data,
    id,
    created_at: timestamp, updated_at: timestamp,
    synced: false,
  };

  await db.consultas.add(full);

  return id;
}

export async function safeUpdateConsulta(
  id: string,
  changes: Partial<Consulta>
): Promise<void> {
  const timestamp = nowIso();

  const existing =
    await db.consultas.get(id);

  if (!existing) {
    throw new Error(
      'Consulta não encontrada'
    );
  }

  await db.consultas.update(id, {
    ...changes,
    synced: false,
  });
}

export async function safeDeleteConsulta(
  id: string
): Promise<void> {
  await db.consultas.delete(id);
}

// ============================================================
// CIRURGIAS
// ============================================================

export async function safeAddCirurgia(
  data: Omit<
    Cirurgia,
    'id' | 'created_at' | 'updated_at' | 'synced'
  >
): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();

  const full: Cirurgia = {
    ...data,
    id,
    created_at: timestamp, updated_at: timestamp,
    synced: false,
  };

  await db.cirurgias.add(full);

  return id;
}

export async function safeUpdateCirurgia(
  id: string,
  changes: Partial<Cirurgia>
): Promise<void> {
  const timestamp = nowIso();

  const existing =
    await db.cirurgias.get(id);

  if (!existing) {
    throw new Error(
      'Cirurgia não encontrada'
    );
  }

  await db.cirurgias.update(id, {
    ...changes,
    synced: false,
  });
}

export async function safeDeleteCirurgia(
  id: string
): Promise<void> {
  await db.cirurgias.delete(id);
}

// ============================================================
// CREDENTIALS
// ============================================================

export async function safeAddCredential(
  cred: Omit<
    Credential,
    'id' | 'created_at' | 'updated_at' | 'synced'
  >
): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();

  const full: Credential = {
    ...cred,
    id,
    created_at: timestamp, updated_at: timestamp,
    synced: false,
  };

  await db.credentials.add(full);

  return id;
}

export async function safeUpdateCredential(
  id: string,
  changes: Partial<Credential>
): Promise<void> {
  const timestamp = nowIso();

  const existing =
    await db.credentials.get(id);

  if (!existing) {
    throw new Error(
      'Credencial não encontrada'
    );
  }

  await db.credentials.update(id, {
    ...changes,
    synced: false,
  });
}

export async function safeDeleteCredential(
  id: string
): Promise<void> {
  await db.credentials.delete(id);
}

// ============================================================
// CARTÕES (bankCards)
// ============================================================

export async function safeAddBankCard(
  card: Omit<
    BankCard,
    'id' | 'created_at' | 'updated_at' | 'synced'
  >
): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();

  const full: BankCard = {
    ...card,
    id,
    created_at: timestamp, updated_at: timestamp,
    synced: false,
  };

  await db.bankCards.add(full);

  return id;
}

export async function safeUpdateBankCard(
  id: string,
  changes: Partial<BankCard>
): Promise<void> {
  const timestamp = nowIso();

  const existing =
    await db.bankCards.get(id);

  if (!existing) {
    throw new Error(
      'Cartão não encontrado'
    );
  }

  await db.bankCards.update(id, {
    ...changes,
    synced: false,
  });
}

export async function safeDeleteBankCard(
  id: string
): Promise<void> {
  await db.bankCards.delete(id);
}

// ============================================================
// INSTITUIÇÕES
// ============================================================

export async function safeAddInstituicao(
  data: Omit<
    InstituicaoEnsino,
    'id' | 'created_at' | 'updated_at' | 'synced'
  >
): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();

  const full: InstituicaoEnsino = {
    ...data,
    id,
    created_at: timestamp, updated_at: timestamp,
    synced: false,
  };

  await db.instituicoes.add(full);

  return id;
}

export async function safeUpdateInstituicao(
  id: string,
  changes: Partial<InstituicaoEnsino>
): Promise<void> {
  const timestamp = nowIso();

  const existing =
    await db.instituicoes.get(id);

  if (!existing) {
    throw new Error(
      'Instituição de ensino não encontrada'
    );
  }

  await db.instituicoes.update(id, {
    ...changes,
    synced: false,
  });
}

export async function safeDeleteInstituicao(
  id: string
): Promise<void> {
  await db.instituicoes.delete(id);
}

// ============================================================
// TRATAMENTOS
// ============================================================

export async function safeAddTratamento(
  data: Omit<
    Tratamento,
    'id' | 'created_at' | 'updated_at' | 'synced'
  >
): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();

  const full: Tratamento = {
    ...data,
    id,
    created_at: timestamp, updated_at: timestamp,
    synced: false,
  };

  await db.tratamentos.add(full);

  return id;
}

export async function safeUpdateTratamento(
  id: string,
  changes: Partial<Tratamento>
): Promise<void> {
  const timestamp = nowIso();

  const existing =
    await db.tratamentos.get(id);

  if (!existing) {
    throw new Error(
      'Tratamento não encontrado'
    );
  }

  await db.tratamentos.update(id, {
    ...changes,
    synced: false,
  });
}

export async function safeDeleteTratamento(
  id: string
): Promise<void> {
  const timestamp = nowIso();

  const existing =
    await db.tratamentos.get(id);

  if (!existing) {
    return;
  }

  const medicamentos =
    await db.medicamentos.toArray();

  for (const medicamento of medicamentos) {
    if (
      medicamento.tratamento_ids?.includes(id)
    ) {
      const tratamentoIds =
        medicamento.tratamento_ids.filter(
          (tratamentoId) =>
            tratamentoId !== id
        );

      await db.medicamentos.update(
        medicamento.id!,
        {
          tratamento_ids: tratamentoIds,
          synced: false,
        }
      );
    }
  }

  const exames =
    await db.exames.toArray();

  for (const exame of exames) {
    if (
      exame.tratamento_ids?.includes(id)
    ) {
      const tratamentoIds =
        exame.tratamento_ids.filter(
          (tratamentoId) =>
            tratamentoId !== id
        );

      await db.exames.update(
        exame.id!,
        {
          tratamento_ids: tratamentoIds,
          synced: false,
        }
      );
    }
  }

  await db.medicamento_tratamentos
    .where('tratamento_id')
    .equals(id)
    .delete();

  await db.exame_tratamentos
    .where('tratamento_id')
    .equals(id)
    .delete();

  await db.tratamentos.delete(id);
}

// ============================================================
// CIDs
// ============================================================

export async function safeAddCid(
  data: Omit<
    Cid,
    'id' | 'created_at' | 'updated_at' | 'synced'
  >
): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();

  const full: Cid = {
    ...data,
    id,
    created_at: timestamp, updated_at: timestamp,
    synced: false,
  };

  await db.cids.add(full);

  return id;
}

export async function safeUpdateCid(
  id: string,
  changes: Partial<Cid>
): Promise<void> {
  const timestamp = nowIso();

  const existing =
    await db.cids.get(id);

  if (!existing) {
    throw new Error(
      'CID não encontrado'
    );
  }

  await db.cids.update(id, {
    ...changes,
    synced: false,
  });
}

export async function safeDeleteCid(
  id: string
): Promise<void> {
  const timestamp = nowIso();

  const existing =
    await db.cids.get(id);

  if (!existing) {
    return;
  }

  const tratamentos =
    await db.tratamentos.toArray();

  for (const tratamento of tratamentos) {
    if (
      tratamento.cid_ids?.includes(id)
    ) {
      const cidIds =
        tratamento.cid_ids.filter(
          (cidId) => cidId !== id
        );

      await db.tratamentos.update(
        tratamento.id!,
        {
          cid_ids: cidIds,
          synced: false,
        }
      );
    }
  }

  await db.cids.delete(id);
}

// ============================================================
// ANEXOS CLÍNICOS
// ============================================================

export async function safeAddAnexoClinico(
  data: Omit<
    AnexoClinico,
    'id' | 'created_at' | 'updated_at' | 'synced'
  >
): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();

  const full: AnexoClinico = {
    ...data,
    id,
    user_id: String(data.user_id || ""),
    created_at: timestamp, updated_at: timestamp,
    synced: false,
  };

  await db.anexos_clinicos.add(full);

  return id;
}

export async function safeUpdateAnexoClinico(
  id: string,
  changes: Partial<AnexoClinico>
): Promise<void> {
  const timestamp = nowIso();

  const existing =
    await db.anexos_clinicos.get(id);

  if (!existing) {
    throw new Error(
      'Anexo clínico não encontrado'
    );
  }

  await db.anexos_clinicos.update(id, {
    ...changes,
    synced: false,
  });
}

export async function safeDeleteAnexoClinico(
  id: string
): Promise<void> {
  await db.anexos_clinicos.delete(id);
}

// ============================================================
// SETTINGS (CONFIGURAÇÕES DO USUÁRIO)
// ============================================================

export async function safeAddSettings(
  data: Omit<AppSettings, 'id' | 'updated_at' | 'synced'>
): Promise<string> {
  const timestamp = nowIso();
  const id = generateId();

  const full: AppSettings = {
    ...data,
    id,
    synced: false,
  };

  await db.settings.add(full);
  return id;
}

export async function safeUpdateSettings(
  id: string,
  changes: Partial<AppSettings>
): Promise<void> {
  const timestamp = nowIso();

  const existing = await db.settings.get(id);
  if (!existing) {
    throw new Error('Configuração não encontrada');
  }

  await db.settings.update(id, {
    ...changes,
    synced: false,
  });
}

export async function getDefaultPersonId(): Promise<string | null> {
  const settings = await db.settings.toArray();
  if (settings.length === 0) return null;
  return settings[0]?.default_person_id || null;
}

export async function updateDefaultPersonId(personId: string): Promise<void> {
  const settings = await db.settings.toArray();
  const timestamp = nowIso();

  if (settings.length === 0) {
    await safeAddSettings({
      user_id: '',
      default_person_id: personId,
    });
  } else {
    await safeUpdateSettings(settings[0].id!, {
      default_person_id: personId,
      synced: false,
    });
  }
}

export async function getSettings(): Promise<AppSettings | null> {
  const settings = await db.settings.toArray();
  if (settings.length === 0) return null;
  return settings[0];
}