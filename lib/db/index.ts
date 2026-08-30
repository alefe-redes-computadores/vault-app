// lib/db/index.ts

import Dexie, {
  type Table,
  type UpdateSpec,
} from 'dexie';

import type {
  Person,
  Document,
  SyncQueueItem,
  Medicamento,
  UpdateMedicamentoInput,
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
  Versiculo,
  RegistroSaude,
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
// TIPOS INTERNOS PARA MIGRAÇÕES LEGADAS
//
// Os tipos canônicos atuais exigem person_id em Vault,
// Credential e BankCard.
//
// Porém a migration v34 precisa conseguir ler registros criados
// antes dessa obrigatoriedade.
// ============================================================

type LegacyVault = Omit<Vault, 'person_id'> & {
  person_id?: string;
};

type LegacyCredential = Omit<Credential, 'person_id'> & {
  person_id?: string;
};

type LegacyBankCard = Omit<BankCard, 'person_id'> & {
  person_id?: string;
};

type LegacyVaultMember = Omit<VaultMember, 'status'> & {
  status: VaultMember['status'] | 'rejected';
};

type LegacySyncQueueItem = Omit<SyncQueueItem, 'payload'> & {
  payload: Record<string, unknown>;
};

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

  versiculos!: Table<Versiculo, string>;

  registros_saude!: Table<RegistroSaude, string>;

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
      persons: 'id',
      documents: 'id',
      syncQueue: 'id',
      medicamentos: 'id',
      renovacoes: 'id',
      vaults: 'id, user_id, name',
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
        persons: 'id, user_id, name, synced, updated_at',

        documents:
          'id, user_id, person_id, category_id, is_favorite, synced, updated_at, vault_id, hospital_id, medico_id',

        medicamentos:
          'id, user_id, person_id, document_id, medico_id, farmacia_id, estabelecimento_id, status, synced, updated_at, *tratamento_ids',

        renovacoes:
          'id, user_id, person_id, medicamento_id, medico_id, farmacia_id, local_id, synced, updated_at',

        medicos: 'id, user_id, nome, especialidade, synced, updated_at',

        farmacias: 'id, user_id, nome, synced, updated_at',

        hospitais: 'id, user_id, nome, tipo, synced, updated_at',

        locais: 'id, user_id, nome, synced, updated_at',

        laboratorios: 'id, user_id, nome, synced, updated_at',

        exames:
          'id, user_id, person_id, medico_id, laboratorio_id, synced, updated_at, *tratamento_ids',

        consultas:
          'id, user_id, person_id, medico_id, hospital_id, status, synced, updated_at',

        cirurgias:
          'id, user_id, person_id, medico_id, hospital_id, status, synced, updated_at',

        doseLogs:
          'id, user_id, person_id, medicamento_id, data, horario, synced, updated_at',

        credentials: 'id, user_id, vault_id, category, synced, updated_at',

        bankCards: 'id, user_id, type, synced, updated_at',

        instituicoes: 'id, user_id, nome, synced, updated_at',

        tratamentos:
          'id, user_id, person_id, nome, status, synced, updated_at, *cid_ids',

        cids: 'id, user_id, codigo, synced, updated_at',

        anexos_clinicos: 'id, user_id, synced, updated_at',

        syncQueue: 'id, table, operation, created_at, retry_count, failed',
      })
      .upgrade(async (tx) => {
        const medicamentos = await tx.table('medicamentos').toArray();

        const vinculosMedicamentos = await tx
          .table('medicamento_tratamentos')
          .toArray();

        const vinculosPorMedicamento = new Map<string, string[]>();

        for (const vinculo of vinculosMedicamentos) {
          const lista =
            vinculosPorMedicamento.get(vinculo.medicamento_id) ?? [];

          lista.push(vinculo.tratamento_id);

          vinculosPorMedicamento.set(vinculo.medicamento_id, lista);
        }

        for (const med of medicamentos) {
          const medRaw = med as any;

          if (
            Array.isArray(medRaw.tratamento_ids) &&
            medRaw.tratamento_ids.length > 0
          ) {
            continue;
          }

          const ids = vinculosPorMedicamento.get(medRaw.id) ?? [];

          if (ids.length === 0 && medRaw.tratamento_id) {
            ids.push(medRaw.tratamento_id);
          }

          if (ids.length > 0) {
            await tx.table('medicamentos').update(medRaw.id, {
              tratamento_ids: ids,
            });
          }
        }

        const exames = await tx.table('exames').toArray();

        const vinculosExames = await tx
          .table('exame_tratamentos')
          .toArray();

        const vinculosPorExame = new Map<string, string[]>();

        for (const vinculo of vinculosExames) {
          const lista =
            vinculosPorExame.get(vinculo.exame_id) ?? [];

          lista.push(vinculo.tratamento_id);

          vinculosPorExame.set(vinculo.exame_id, lista);
        }

        for (const exame of exames) {
          const exameRaw = exame as any;

          if (
            Array.isArray(exameRaw.tratamento_ids) &&
            exameRaw.tratamento_ids.length > 0
          ) {
            continue;
          }

          const ids = vinculosPorExame.get(exameRaw.id) ?? [];

          if (ids.length > 0) {
            await tx.table('exames').update(exameRaw.id, {
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
        persons: 'id, user_id, name, synced, updated_at',

        documents:
          'id, user_id, person_id, category_id, is_favorite, synced, updated_at, vault_id, hospital_id, medico_id',

        medicamentos:
          'id, user_id, person_id, document_id, medico_id, farmacia_id, estabelecimento_id, status, synced, updated_at, *tratamento_ids',

        renovacoes:
          'id, user_id, person_id, medicamento_id, medico_id, farmacia_id, local_id, synced, updated_at',

        medicos: 'id, user_id, nome, especialidade, synced, updated_at',

        farmacias: 'id, user_id, nome, synced, updated_at',

        hospitais: 'id, user_id, nome, tipo, synced, updated_at',

        locais: 'id, user_id, nome, synced, updated_at',

        laboratorios: 'id, user_id, nome, synced, updated_at',

        exames:
          'id, user_id, person_id, medico_id, laboratorio_id, synced, updated_at, *tratamento_ids',

        consultas:
          'id, user_id, person_id, medico_id, hospital_id, status, synced, updated_at',

        cirurgias:
          'id, user_id, person_id, medico_id, hospital_id, status, synced, updated_at',

        doseLogs:
          'id, user_id, person_id, medicamento_id, data, horario, synced, updated_at',

        credentials: 'id, user_id, vault_id, category, synced, updated_at',

        bankCards: 'id, user_id, type, synced, updated_at',

        instituicoes: 'id, user_id, nome, synced, updated_at',

        tratamentos:
          'id, user_id, person_id, nome, status, synced, updated_at, *cid_ids',

        cids: 'id, user_id, codigo, synced, updated_at',

        anexos_clinicos: 'id, user_id, synced, updated_at',

        syncQueue: 'id, table, operation, created_at, retry_count, failed',
      })
      .upgrade(async (tx) => {
        const tratamentos = await tx.table('tratamentos').toArray();

        for (const tratamento of tratamentos) {
          const tratRaw = tratamento as any;

          if (Array.isArray(tratRaw.cid_ids)) {
            continue;
          }

          const cidIds = tratRaw.cid_id ? [tratRaw.cid_id] : [];

          await tx.table('tratamentos').update(tratRaw.id, {
            cid_ids: cidIds,
          });
        }
      });

    // ==========================================================
    // VERSÃO 20
    // ==========================================================

    this.version(20)
      .stores({
        persons: 'id, user_id, name, synced, updated_at',

        documents:
          'id, user_id, person_id, category_id, is_favorite, synced, updated_at, vault_id, hospital_id, medico_id',

        medicamentos:
          'id, user_id, person_id, document_id, medico_id, farmacia_id, hospital_id, local_id, status, synced, updated_at, *tratamento_ids',

        renovacoes:
          'id, user_id, person_id, medicamento_id, medico_id, farmacia_id, hospital_id, local_id, synced, updated_at',

        medicos: 'id, user_id, nome, especialidade, synced, updated_at',

        farmacias: 'id, user_id, nome, synced, updated_at',

        hospitais: 'id, user_id, nome, tipo, synced, updated_at',

        locais: 'id, user_id, nome, synced, updated_at',

        exames:
          'id, user_id, person_id, medico_id, local_id, synced, updated_at, *tratamento_ids',

        consultas:
          'id, user_id, person_id, medico_id, hospital_id, local_id, status, synced, updated_at',

        cirurgias:
          'id, user_id, person_id, medico_id, hospital_id, local_id, status, synced, updated_at',

        doseLogs:
          'id, user_id, person_id, medicamento_id, data, horario, synced, updated_at',

        credentials: 'id, user_id, vault_id, category, synced, updated_at',

        bankCards: 'id, user_id, type, synced, updated_at',

        instituicoes: 'id, user_id, nome, synced, updated_at',

        tratamentos:
          'id, user_id, person_id, nome, status, synced, updated_at, *cid_ids',

        cids: 'id, user_id, codigo, synced, updated_at',

        anexos_clinicos: 'id, user_id, synced, updated_at',

        syncQueue: 'id, table, operation, created_at, retry_count, failed',

        laboratorios: null,
      })
      .upgrade(async (tx) => {
        const medicamentos = await tx.table('medicamentos').toArray();

        for (const medicamento of medicamentos) {
          const medRaw = medicamento as any;

          if (!medRaw.local_id && medRaw.estabelecimento_id) {
            await tx.table('medicamentos').update(medRaw.id, {
              local_id: medRaw.estabelecimento_id,
            });
          }
        }

        const exames = await tx.table('exames').toArray();

        for (const exame of exames) {
          const exameRaw = exame as any;

          if (!exameRaw.local_id && exameRaw.laboratorio_id) {
            await tx.table('exames').update(exameRaw.id, {
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
      persons: 'id, user_id, name, synced, updated_at',

      documents:
        'id, user_id, person_id, category_id, is_favorite, synced, updated_at, vault_id, hospital_id, medico_id',

      medicamentos:
        'id, user_id, person_id, document_id, medico_id, farmacia_id, hospital_id, local_id, status, synced, updated_at, *tratamento_ids',

      renovacoes:
        'id, user_id, person_id, medicamento_id, medico_id, farmacia_id, hospital_id, local_id, document_id, data, tipo_aquisicao, data_proxima_retirada, exige_nova_receita, synced, updated_at',

      medicos: 'id, user_id, nome, especialidade, synced, updated_at',

      farmacias: 'id, user_id, nome, synced, updated_at',

      hospitais: 'id, user_id, nome, tipo, synced, updated_at',

      locais: 'id, user_id, nome, synced, updated_at',

      exames:
        'id, user_id, person_id, medico_id, local_id, document_id, data, synced, updated_at, *tratamento_ids',

      consultas:
        'id, user_id, person_id, medico_id, hospital_id, local_id, document_id, status, data, synced, updated_at',

      cirurgias:
        'id, user_id, person_id, medico_id, hospital_id, local_id, document_id, status, data, synced, updated_at',

      doseLogs:
        'id, user_id, person_id, medicamento_id, data, horario, synced, updated_at',

      credentials: 'id, user_id, vault_id, category, synced, updated_at',

      bankCards: 'id, user_id, type, synced, updated_at',

      instituicoes: 'id, user_id, nome, synced, updated_at',

      tratamentos:
        'id, user_id, person_id, nome, status, synced, updated_at, *cid_ids',

      cids:
        'id, user_id, person_id, codigo, medico_id, hospital_id, local_id, synced, updated_at',

      anexos_clinicos: 'id, user_id, synced, updated_at',

      syncQueue: 'id, chave, table, operation, created_at, retry_count, failed',

      laboratorios: null,
    });

    // ==========================================================
    // VERSÃO 24
    // ==========================================================

    this.version(24).stores({
      settings: 'id, user_id, default_person_id, updated_at',
    });

    // ==========================================================
    // VERSÃO 25
    // ==========================================================

    (this as any).version(25).stores({
      anexos_clinicos: 'id, user_id, person_id, synced, updated_at',
    });

    // ==========================================================
    // VERSÃO 26
    // ==========================================================

    (this as any).version(26).stores({
      medicos:
        'id, user_id, nome, especialidade, synced, updated_at, *hospital_ids, *tratamento_ids',

      hospitais:
        'id, user_id, nome, tipo, synced, updated_at, *medico_ids, *tratamento_ids',
    });

    // ==========================================================
    // VERSÃO 27
    // ==========================================================

    (this as any).version(27).stores({
      medicos:
        'id, user_id, nome, especialidade, synced, updated_at, *hospital_ids, *tratamento_ids',

      hospitais:
        'id, user_id, nome, tipo, synced, updated_at, *medico_ids, *tratamento_ids',

      versiculos:
        'id, user_id, created_at',
    });

    // ==========================================================
    // VERSÃO 28
    // ==========================================================

    (this as any).version(28).stores({
      renovacoes:
        'id, user_id, person_id, medicamento_id, medico_id, farmacia_id, hospital_id, local_id, document_id, data, tipo_aquisicao, data_proxima_retirada, exige_nova_receita, synced, updated_at',
    });

    // ==========================================================
    // VERSÃO 29
    // ==========================================================

    (this as any).version(29).stores({
      persons:
        'id, user_id, name, synced, updated_at',

      documents:
        'id, user_id, person_id, category_id, is_favorite, synced, updated_at, vault_id, hospital_id, medico_id',

      medicamentos:
        'id, user_id, person_id, document_id, medico_id, farmacia_id, hospital_id, local_id, status, synced, updated_at, *tratamento_ids',

      renovacoes:
        'id, user_id, person_id, medicamento_id, medico_id, farmacia_id, hospital_id, local_id, document_id, data, tipo_aquisicao, data_proxima_retirada, exige_nova_receita, synced, updated_at',

      medicos:
        'id, user_id, person_id, nome, especialidade, synced, updated_at, *hospital_ids, *tratamento_ids',

      farmacias:
        'id, user_id, person_id, nome, synced, updated_at',

      hospitais:
        'id, user_id, person_id, nome, tipo, synced, updated_at, *medico_ids, *tratamento_ids',

      locais:
        'id, user_id, person_id, nome, synced, updated_at',

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
        'id, user_id, person_id, synced, updated_at',

      syncQueue:
        'id, chave, table, operation, created_at, retry_count, failed',

      settings:
        'id, user_id, default_person_id, updated_at',

      versiculos:
        'id, user_id, created_at',
    });

    // ==========================================================
    // VERSÃO 30 — Registros de Saúde
    // ==========================================================

    (this as any).version(30).stores({
      persons:
        'id, user_id, name, synced, updated_at',

      documents:
        'id, user_id, person_id, category_id, is_favorite, synced, updated_at, vault_id, hospital_id, medico_id',

      medicamentos:
        'id, user_id, person_id, document_id, medico_id, farmacia_id, hospital_id, local_id, status, synced, updated_at, *tratamento_ids',

      renovacoes:
        'id, user_id, person_id, medicamento_id, medico_id, farmacia_id, hospital_id, local_id, document_id, data, tipo_aquisicao, data_proxima_retirada, exige_nova_receita, synced, updated_at',

      medicos:
        'id, user_id, person_id, nome, especialidade, synced, updated_at, *hospital_ids, *tratamento_ids',

      farmacias:
        'id, user_id, person_id, nome, synced, updated_at',

      hospitais:
        'id, user_id, person_id, nome, tipo, synced, updated_at, *medico_ids, *tratamento_ids',

      locais:
        'id, user_id, person_id, nome, synced, updated_at',

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
        'id, user_id, person_id, synced, updated_at',

      syncQueue:
        'id, chave, table, operation, created_at, retry_count, failed',

      settings:
        'id, user_id, default_person_id, updated_at',

      versiculos:
        'id, user_id, created_at',

      registros_saude:
        'id, user_id, person_id, data, categoria, tipo, synced',
    });

    // ==========================================================
    // VERSÃO 31 — Correção do Cofre
    // ==========================================================

    (this as any).version(31).stores({
      vaultMembers:
        'id, vault_id, user_id',

      vaults:
        'id, user_id, name',
    });

    // ==========================================================
    // VERSÃO 32 — DocumentManager
    // ==========================================================

    (this as any).version(32).stores({
      documents:
        'id, user_id, person_id, category_id, is_favorite, synced, updated_at, vault_id, hospital_id, medico_id, entidade_tipo, entidade_id, [entidade_tipo+entidade_id]',
    });

    // ==========================================================
    // VERSÃO 33
    // ==========================================================

    this.version(33)
      .stores({
        vaults:
          'id, user_id, person_id, name',

        vaultMembers:
          'id, vault_id, user_id, person_id, email, status, permission, [user_id+person_id], [email+status]',
      })
      .upgrade(async (tx) => {
        const members =
          (await tx
            .table('vaultMembers')
            .toArray()) as LegacyVaultMember[];

        for (const member of members) {
          if (!member.id) {
            continue;
          }

          const changes: Record<string, unknown> = {};

          if (
            typeof member.user_id === 'string' &&
            member.user_id.trim() === ''
          ) {
            changes.user_id = undefined;
          }

          if (!member.created_at) {
            changes.created_at =
              member.invited_at ||
              member.updated_at ||
              nowIso();
          }

          if (Object.keys(changes).length > 0) {
            await tx
              .table('vaultMembers')
              .update(member.id, changes);
          }
        }
      });

    // ==========================================================
    // VERSÃO 34
    // ==========================================================

    this.version(34)
      .stores({
        credentials:
          'id, user_id, person_id, vault_id, category, synced, updated_at',

        bankCards:
          'id, user_id, person_id, type, synced, updated_at',

        vaults:
          'id, user_id, person_id, name',

        vaultMembers:
          'id, vault_id, user_id, person_id, email, status, permission, [user_id+person_id], [email+status]',
      })
      .upgrade(async (tx) => {
        const persons =
          (await tx
            .table('persons')
            .toArray()) as Person[];

        const settings =
          (await tx
            .table('settings')
            .toArray()) as AppSettings[];

        const credentials =
          (await tx
            .table('credentials')
            .toArray()) as LegacyCredential[];

        const cards =
          (await tx
            .table('bankCards')
            .toArray()) as LegacyBankCard[];

        const vaults =
          (await tx
            .table('vaults')
            .toArray()) as LegacyVault[];

        const members =
          (await tx
            .table('vaultMembers')
            .toArray()) as LegacyVaultMember[];

        const queueItems =
          (await tx
            .table('syncQueue')
            .toArray()) as LegacySyncQueueItem[];

        const personsByUser =
          new Map<string, Person[]>();

        for (const person of persons) {
          if (!person.user_id) {
            continue;
          }

          const userPersons =
            personsByUser.get(person.user_id) ?? [];

          userPersons.push(person);

          personsByUser.set(
            person.user_id,
            userPersons
          );
        }

        const settingsByUser =
          new Map<string, AppSettings>();

        for (const setting of settings) {
          if (!setting.user_id) {
            continue;
          }

          settingsByUser.set(
            setting.user_id,
            setting
          );
        }

        const resolvePersonId = (
          userId: string
        ): string | null => {
          if (!userId) {
            return null;
          }

          const userPersons =
            personsByUser.get(userId) ?? [];

          const validPersons =
            userPersons.filter(
              (person): person is Person & { id: string } =>
                typeof person.id === 'string' &&
                person.id.length > 0
            );

          if (validPersons.length === 0) {
            return null;
          }

          const setting =
            settingsByUser.get(userId);

          if (setting?.default_person_id) {
            const settingsPerson =
              validPersons.find(
                (person) =>
                  person.id ===
                  setting.default_person_id
              );

            if (settingsPerson) {
              return settingsPerson.id;
            }
          }

          const defaultPersons =
            validPersons.filter(
              (person) =>
                person.isDefault === true
            );

          if (defaultPersons.length === 1) {
            return defaultPersons[0].id;
          }

          if (validPersons.length === 1) {
            return validPersons[0].id;
          }

          return null;
        };

        const credentialPersonIds =
          new Map<string, string>();

        const cardPersonIds =
          new Map<string, string>();

        const vaultPersonIds =
          new Map<string, string>();

        for (const credential of credentials) {
          if (
            !credential.id ||
            credential.person_id
          ) {
            continue;
          }

          const personId =
            resolvePersonId(
              credential.user_id
            );

          if (!personId) {
            console.warn(
              `⚠️ [Dexie v34] Credencial ${credential.id} permaneceu sem person_id porque não foi possível determinar com segurança a Person correta.`
            );

            continue;
          }

          await tx
            .table('credentials')
            .update(
              credential.id,
              {
                person_id: personId,
              }
            );

          credentialPersonIds.set(
            credential.id,
            personId
          );
        }

        for (const card of cards) {
          if (
            !card.id ||
            card.person_id
          ) {
            continue;
          }

          const personId =
            resolvePersonId(
              card.user_id
            );

          if (!personId) {
            console.warn(
              `⚠️ [Dexie v34] Cartão ${card.id} permaneceu sem person_id porque não foi possível determinar com segurança a Person correta.`
            );

            continue;
          }

          await tx
            .table('bankCards')
            .update(
              card.id,
              {
                person_id: personId,
              }
            );

          cardPersonIds.set(
            card.id,
            personId
          );
        }

        for (const vault of vaults) {
          if (
            !vault.id ||
            vault.person_id
          ) {
            continue;
          }

          const personId =
            resolvePersonId(
              vault.user_id
            );

          if (!personId) {
            console.warn(
              `⚠️ [Dexie v34] Vault ${vault.id} permaneceu sem person_id porque não foi possível determinar com segurança a Person correta.`
            );

            continue;
          }

          await tx
            .table('vaults')
            .update(
              vault.id,
              {
                person_id: personId,
              }
            );

          vaultPersonIds.set(
            vault.id,
            personId
          );
        }

        for (const member of members) {
          if (
            !member.id ||
            member.status !== 'rejected'
          ) {
            continue;
          }

          await tx
            .table('vaultMembers')
            .update(
              member.id,
              {
                status: 'declined',
              }
            );
        }

        for (const queueItem of queueItems) {
          if (!queueItem.id) {
            continue;
          }

          const payload =
            queueItem.payload &&
            typeof queueItem.payload === 'object'
              ? { ...queueItem.payload }
              : {};

          const payloadId =
            typeof payload.id === 'string'
              ? payload.id
              : null;

          let changed = false;

          if (
            queueItem.table === 'vaultMembers' &&
            payload.status === 'rejected'
          ) {
            payload.status = 'declined';
            changed = true;
          }

          if (
            queueItem.table === 'vaults' &&
            payloadId &&
            queueItem.operation !== 'delete'
          ) {
            const personId =
              vaultPersonIds.get(payloadId);

            if (
              personId &&
              payload.person_id !== personId
            ) {
              payload.person_id = personId;
              changed = true;
            }
          }

          if (
            queueItem.table === 'credentials' &&
            payloadId &&
            queueItem.operation !== 'delete'
          ) {
            const personId =
              credentialPersonIds.get(
                payloadId
              );

            if (
              personId &&
              payload.person_id !== personId
            ) {
              payload.person_id = personId;
              changed = true;
            }
          }

          if (
            queueItem.table === 'cards' &&
            payloadId &&
            queueItem.operation !== 'delete'
          ) {
            const personId =
              cardPersonIds.get(payloadId);

            if (
              personId &&
              payload.person_id !== personId
            ) {
              payload.person_id = personId;
              changed = true;
            }
          }

          if (!changed) {
            continue;
          }

          await tx
            .table('syncQueue')
            .update(
              queueItem.id,
              {
                payload,
                updated_at: nowIso(),
                retry_count: 0,
                failed: false,
                next_retry_at: null,
                error: null,
              }
            );
        }
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
  const existing =
    await db.medicamentos.get(
      medicamentoId
    );

  if (!existing) {
    throw new Error(
      'Medicamento não encontrado'
    );
  }

  await db.medicamentos.update(
    medicamentoId,
    {
      tratamento_ids:
        tratamentoIds,

      synced:
        false,
    }
  );
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
  const timestamp =
    nowIso();

  const id =
    generateId();

  const full: Person = {
    ...person,

    id,

    synced:
      false,

    created_at:
      timestamp,

    updated_at:
      timestamp,
  };

  await db.persons.add(
    full
  );

  return id;
}

export async function safeUpdatePerson(
  id: string,
  changes: Partial<Person>
): Promise<void> {
  const existing =
    await db.persons.get(
      id
    );

  if (!existing) {
    throw new Error(
      'Pessoa não encontrada'
    );
  }

  await db.persons.update(
    id,
    {
      ...changes,

      synced:
        false,
    }
  );
}

export async function safeDeletePerson(
  id: string
): Promise<void> {
  await db.persons.delete(
    id
  );
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
  const timestamp =
    nowIso();

  const id =
    generateId();

  const full: Document = {
    ...doc,

    id,

    synced:
      false,

    created_at:
      timestamp,

    updated_at:
      timestamp,
  };

  await db.documents.add(
    full
  );

  return id;
}

export async function safeUpdateDocument(
  id: string,
  changes: Partial<Document>
): Promise<void> {
  const document =
    await db.documents.get(
      id
    );

  if (!document) {
    throw new Error(
      'Documento não encontrado'
    );
  }

  await db.documents.update(
    id,
    {
      ...changes,

      synced:
        false,
    }
  );
}

export async function safeDeleteDocument(
  id: string
): Promise<void> {
  const document =
    await db.documents.get(
      id
    );

  if (!document) {
    throw new Error(
      'Documento não encontrado'
    );
  }

  if (
    document.attachments &&
    document.attachments.length >
      0
  ) {
    for (
      const attachment of
      document.attachments
    ) {
      if (
        attachment.url &&
        !attachment.url.startsWith(
          'blob:'
        )
      ) {
        try {
          await deleteFile(
            attachment.url
          );
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

  await db.documents.delete(
    id
  );
}

export async function toggleFavorite(
  id: string
): Promise<void> {
  const document =
    await db.documents.get(
      id
    );

  if (!document) {
    return;
  }

  await safeUpdateDocument(
    id,
    {
      is_favorite:
        !document.is_favorite,
    }
  );
}

// ============================================================
// MEDICAMENTOS
// ============================================================

export async function safeAddMedicamento(
  med: Omit<
    Medicamento,
    'id' | 'created_at' | 'updated_at' | 'synced'
  > &
    Partial<
      Pick<
        Medicamento,
        'id' | 'created_at' | 'updated_at' | 'synced'
      >
    >
): Promise<string> {
  const timestamp =
    nowIso();

  /*
   * Se o repository já criou o ID do medicamento,
   * esse ID precisa ser preservado.
   *
   * O mesmo UUID será usado no Dexie e na syncQueue,
   * evitando divergência local ↔ Supabase.
   */
  const id =
    med.id ||
    generateId();

  const full:
    Medicamento = {
    ...med,

    id,

    created_at:
      med.created_at ||
      timestamp,

    updated_at:
      med.updated_at ||
      timestamp,

    synced:
      false,
  };

  await db.medicamentos.add(
    full
  );

  return id;
}

export async function safeUpdateMedicamento(
  id: string,
  changes: UpdateMedicamentoInput
): Promise<void> {
  const existing =
    await db.medicamentos.get(
      id
    );

  if (!existing) {
    throw new Error(
      'Medicamento não encontrado'
    );
  }

  /*
   * UpdateMedicamentoInput representa corretamente a semântica
   * da atualização de Medicamento:
   *
   * undefined = não alterar
   * null      = limpar explicitamente
   *
   * A entidade Medicamento continua usando undefined como
   * representação canônica de ausência para leitura.
   *
   * O cast fica isolado nesta fronteira de persistência porque
   * UpdateSpec<Medicamento> é derivado da entidade canônica e,
   * por isso, não conhece os nulls aceitos especificamente pelo
   * contrato de atualização.
   */
  const updateSpec = {
    ...changes,

    synced:
      false,
  } as unknown as UpdateSpec<Medicamento>;

  await db.medicamentos.update(
    id,
    updateSpec
  );
}

export async function safeDeleteMedicamento(
  medicamentoId: string
): Promise<void> {
  await db.medicamentos.delete(
    medicamentoId
  );
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
  const timestamp =
    nowIso();

  const id =
    generateId();

  const full: Renovacao = {
    ...ren,

    id,

    created_at:
      timestamp,

    updated_at:
      timestamp,

    synced:
      false,
  };

  await db.renovacoes.add(
    full
  );

  return id;
}

export async function safeUpdateRenovacao(
  id: string,
  changes: Partial<Renovacao>
): Promise<void> {
  const existing =
    await db.renovacoes.get(
      id
    );

  if (!existing) {
    throw new Error(
      'Renovação não encontrada'
    );
  }

  await db.renovacoes.update(
    id,
    {
      ...changes,

      synced:
        false,
    }
  );
}

export async function safeDeleteRenovacao(
  id: string
): Promise<void> {
  await db.renovacoes.delete(
    id
  );
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
  const timestamp =
    nowIso();

  const personId =
    data.person_id?.trim();

  if (!personId) {
    throw new Error(
      'Pessoa ativa não identificada.'
    );
  }

  const medicamentoId =
    data.medicamento_id?.trim();

  if (!medicamentoId) {
    throw new Error(
      'Medicamento não identificado.'
    );
  }

  const horario =
    data.horario?.trim();

  if (!horario) {
    throw new Error(
      'Horário da dose não identificado.'
    );
  }

  const targetDate =
    data.data ||
    getLocalTodayISO();

  const medicamento =
    await db.medicamentos.get(
      medicamentoId
    );

  if (
    !medicamento ||
    medicamento.person_id !==
      personId
  ) {
    throw new Error(
      'Medicamento não encontrado para a pessoa informada.'
    );
  }

  const existing =
    await db.doseLogs
      .where(
        'medicamento_id'
      )
      .equals(
        medicamentoId
      )
      .filter(
        (log) =>
          log.person_id ===
            personId &&
          log.data ===
            targetDate &&
          log.horario ===
            horario
      )
      .first();

  if (existing) {
    await db.doseLogs.update(
      existing.id!,
      {
        quantidade:
          data.quantidade,

        tomado_em:
          data.tomado_em,

        ignorado_em:
          data.ignorado_em,

        updated_at:
          timestamp,

        synced:
          false,
      }
    );

    return existing.id!;
  }

  const id =
    generateId();

  const full: DoseLog = {
    ...data,

    id,

    person_id:
      personId,

    medicamento_id:
      medicamentoId,

    data:
      targetDate,

    horario,

    created_at:
      timestamp,

    updated_at:
      timestamp,

    synced:
      false,
  };

  await db.doseLogs.add(
    full
  );

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
  const timestamp =
    nowIso();

  const id =
    generateId();

  const full: Vault = {
    ...vault,

    id,

    created_at:
      timestamp,

    updated_at:
      timestamp,

    synced:
      false,
  };

  await db.vaults.add(
    full
  );

  return id;
}

export async function safeAddVaultMember(
  member: Omit<
    VaultMember,
    'id' | 'invited_at' | 'updated_at' | 'synced'
  >
): Promise<string> {
  const timestamp =
    nowIso();

  const id =
    generateId();

  const full:
    VaultMember = {
    ...member,

    id,

    invited_at:
      timestamp,

    updated_at:
      timestamp,

    synced:
      false,
  };

  await db.vaultMembers.add(
    full
  );

  return id;
}

export async function safeUpdateVaultMember(
  id: string,
  changes: Partial<VaultMember>
): Promise<void> {
  const existing =
    await db.vaultMembers.get(
      id
    );

  if (!existing) {
    throw new Error(
      'Membro do vault não encontrado'
    );
  }

  await db.vaultMembers.update(
    id,
    {
      ...changes,

      synced:
        false,
    }
  );
}

export async function shareDocumentWithVault(
  documentId: string,
  vaultId: string
): Promise<void> {
  const document =
    await db.documents.get(
      documentId
    );

  if (!document) {
    throw new Error(
      'Documento não encontrado'
    );
  }

  await db.documents.update(
    documentId,
    {
      vault_id:
        vaultId,

      synced:
        false,
    }
  );
}

export async function getVaultDocuments(
  vaultId: string
): Promise<Document[]> {
  return db.documents
    .where(
      'vault_id'
    )
    .equals(
      vaultId
    )
    .toArray();
}

export async function getVaultMembers(
  vaultId: string
): Promise<VaultMember[]> {
  return db.vaultMembers
    .where(
      'vault_id'
    )
    .equals(
      vaultId
    )
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
  const timestamp =
    nowIso();

  const id =
    generateId();

  const full:
    Medico = {
    ...data,

    id,

    created_at:
      timestamp,

    updated_at:
      timestamp,

    synced:
      false,
  };

  await db.medicos.add(
    full
  );

  return id;
}

export async function safeUpdateMedico(
  id: string,
  changes: Partial<Medico>
): Promise<void> {
  const existing =
    await db.medicos.get(
      id
    );

  if (!existing) {
    throw new Error(
      'Médico não encontrado'
    );
  }

  await db.medicos.update(
    id,
    {
      ...changes,

      synced:
        false,
    }
  );
}

export async function safeDeleteMedico(
  id: string
): Promise<void> {
  await db.medicos.delete(
    id
  );
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
  const timestamp =
    nowIso();

  const id =
    generateId();

  const full:
    Farmacia = {
    ...data,

    id,

    created_at:
      timestamp,

    updated_at:
      timestamp,

    synced:
      false,
  };

  await db.farmacias.add(
    full
  );

  return id;
}

export async function safeUpdateFarmacia(
  id: string,
  changes: Partial<Farmacia>
): Promise<void> {
  const existing =
    await db.farmacias.get(
      id
    );

  if (!existing) {
    throw new Error(
      'Farmácia não encontrada'
    );
  }

  await db.farmacias.update(
    id,
    {
      ...changes,

      synced:
        false,
    }
  );
}

export async function safeDeleteFarmacia(
  id: string
): Promise<void> {
  await db.farmacias.delete(
    id
  );
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
  const timestamp =
    nowIso();

  const id =
    generateId();

  const full:
    Hospital = {
    ...data,

    id,

    created_at:
      timestamp,

    updated_at:
      timestamp,

    synced:
      false,
  };

  await db.hospitais.add(
    full
  );

  return id;
}

export async function safeUpdateHospital(
  id: string,
  changes: Partial<Hospital>
): Promise<void> {
  const existing =
    await db.hospitais.get(
      id
    );

  if (!existing) {
    throw new Error(
      'Hospital não encontrado'
    );
  }

  await db.hospitais.update(
    id,
    {
      ...changes,

      synced:
        false,
    }
  );
}

export async function safeDeleteHospital(
  id: string
): Promise<void> {
  await db.hospitais.delete(
    id
  );
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
  const timestamp =
    nowIso();

  const id =
    generateId();

  const full:
    LocalSaude = {
    ...data,

    id,

    created_at:
      timestamp,

    updated_at:
      timestamp,

    synced:
      false,
  };

  await db.locais.add(
    full
  );

  return id;
}

export async function safeUpdateLocal(
  id: string,
  changes: Partial<LocalSaude>
): Promise<void> {
  const existing =
    await db.locais.get(
      id
    );

  if (!existing) {
    throw new Error(
      'Local não encontrado'
    );
  }

  await db.locais.update(
    id,
    {
      ...changes,

      synced:
        false,
    }
  );
}

export async function safeDeleteLocal(
  id: string
): Promise<void> {
  await db.locais.delete(
    id
  );
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
  const timestamp =
    nowIso();

  const id =
    generateId();

  const full:
    Exame = {
    ...data,

    id,

    created_at:
      timestamp,

    updated_at:
      timestamp,

    synced:
      false,
  };

  await db.exames.add(
    full
  );

  return id;
}

export async function safeUpdateExame(
  id: string,
  changes: Partial<Exame>
): Promise<void> {
  const existing =
    await db.exames.get(
      id
    );

  if (!existing) {
    throw new Error(
      'Exame não encontrado'
    );
  }

  await db.exames.update(
    id,
    {
      ...changes,

      synced:
        false,
    }
  );
}

export async function safeDeleteExame(
  id: string
): Promise<void> {
  await db.exames.delete(
    id
  );
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
  const timestamp =
    nowIso();

  const id =
    generateId();

  const full:
    Consulta = {
    ...data,

    id,

    created_at:
      timestamp,

    updated_at:
      timestamp,

    synced:
      false,
  };

  await db.consultas.add(
    full
  );

  return id;
}

export async function safeUpdateConsulta(
  id: string,
  changes: Partial<Consulta>
): Promise<void> {
  const existing =
    await db.consultas.get(
      id
    );

  if (!existing) {
    throw new Error(
      'Consulta não encontrada'
    );
  }

  await db.consultas.update(
    id,
    {
      ...changes,

      synced:
        false,
    }
  );
}

export async function safeDeleteConsulta(
  id: string
): Promise<void> {
  await db.consultas.delete(
    id
  );
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
  const timestamp =
    nowIso();

  const id =
    generateId();

  const full:
    Cirurgia = {
    ...data,

    id,

    created_at:
      timestamp,

    updated_at:
      timestamp,

    synced:
      false,
  };

  await db.cirurgias.add(
    full
  );

  return id;
}

export async function safeUpdateCirurgia(
  id: string,
  changes: Partial<Cirurgia>
): Promise<void> {
  const existing =
    await db.cirurgias.get(
      id
    );

  if (!existing) {
    throw new Error(
      'Cirurgia não encontrada'
    );
  }

  await db.cirurgias.update(
    id,
    {
      ...changes,

      synced:
        false,
    }
  );
}

export async function safeDeleteCirurgia(
  id: string
): Promise<void> {
  await db.cirurgias.delete(
    id
  );
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
  const timestamp =
    nowIso();

  const id =
    generateId();

  const full:
    Credential = {
    ...cred,

    id,

    created_at:
      timestamp,

    updated_at:
      timestamp,

    synced:
      false,
  };

  await db.credentials.add(
    full
  );

  return id;
}

export async function safeUpdateCredential(
  id: string,
  changes: Partial<Credential>
): Promise<void> {
  const existing =
    await db.credentials.get(
      id
    );

  if (!existing) {
    throw new Error(
      'Credencial não encontrada'
    );
  }

  await db.credentials.update(
    id,
    {
      ...changes,

      synced:
        false,
    }
  );
}

export async function safeDeleteCredential(
  id: string
): Promise<void> {
  await db.credentials.delete(
    id
  );
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
  const timestamp =
    nowIso();

  const id =
    generateId();

  const full:
    BankCard = {
    ...card,

    id,

    created_at:
      timestamp,

    updated_at:
      timestamp,

    synced:
      false,
  };

  await db.bankCards.add(
    full
  );

  return id;
}

export async function safeUpdateBankCard(
  id: string,
  changes: Partial<BankCard>
): Promise<void> {
  const existing =
    await db.bankCards.get(
      id
    );

  if (!existing) {
    throw new Error(
      'Cartão não encontrado'
    );
  }

  await db.bankCards.update(
    id,
    {
      ...changes,

      synced:
        false,
    }
  );
}

export async function safeDeleteBankCard(
  id: string
): Promise<void> {
  await db.bankCards.delete(
    id
  );
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
  const timestamp =
    nowIso();

  const id =
    generateId();

  const full:
    InstituicaoEnsino = {
    ...data,

    id,

    created_at:
      timestamp,

    updated_at:
      timestamp,

    synced:
      false,
  };

  await db.instituicoes.add(
    full
  );

  return id;
}

export async function safeUpdateInstituicao(
  id: string,
  changes: Partial<InstituicaoEnsino>
): Promise<void> {
  const existing =
    await db.instituicoes.get(
      id
    );

  if (!existing) {
    throw new Error(
      'Instituição de ensino não encontrada'
    );
  }

  await db.instituicoes.update(
    id,
    {
      ...changes,

      synced:
        false,
    }
  );
}

export async function safeDeleteInstituicao(
  id: string
): Promise<void> {
  await db.instituicoes.delete(
    id
  );
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
  const timestamp =
    nowIso();

  const id =
    generateId();

  const full:
    Tratamento = {
    ...data,

    id,

    created_at:
      timestamp,

    updated_at:
      timestamp,

    synced:
      false,
  };

  await db.tratamentos.add(
    full
  );

  return id;
}

export async function safeUpdateTratamento(
  id: string,
  changes: Partial<Tratamento>
): Promise<void> {
  const existing =
    await db.tratamentos.get(
      id
    );

  if (!existing) {
    throw new Error(
      'Tratamento não encontrado'
    );
  }

  await db.tratamentos.update(
    id,
    {
      ...changes,

      synced:
        false,
    }
  );
}

export async function safeDeleteTratamento(
  id: string
): Promise<void> {
  const existing =
    await db.tratamentos.get(
      id
    );

  if (!existing) {
    return;
  }

  const medicamentos =
    await db.medicamentos.toArray();

  for (
    const medicamento of
    medicamentos
  ) {
    if (
      medicamento.tratamento_ids?.includes(
        id
      )
    ) {
      const tratamentoIds =
        medicamento.tratamento_ids.filter(
          (
            tratamentoId
          ) =>
            tratamentoId !==
            id
        );

      await db.medicamentos.update(
        medicamento.id!,
        {
          tratamento_ids:
            tratamentoIds,

          synced:
            false,
        }
      );
    }
  }

  const exames =
    await db.exames.toArray();

  for (
    const exame of
    exames
  ) {
    if (
      exame.tratamento_ids?.includes(
        id
      )
    ) {
      const tratamentoIds =
        exame.tratamento_ids.filter(
          (
            tratamentoId
          ) =>
            tratamentoId !==
            id
        );

      await db.exames.update(
        exame.id!,
        {
          tratamento_ids:
            tratamentoIds,

          synced:
            false,
        }
      );
    }
  }

  await db.medicamento_tratamentos
    .filter(
      (
        vinculo
      ) =>
        vinculo.tratamento_id ===
        id
    )
    .delete();

  await db.exame_tratamentos
    .filter(
      (
        vinculo
      ) =>
        vinculo.tratamento_id ===
        id
    )
    .delete();

  await db.tratamentos.delete(
    id
  );
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
  const timestamp =
    nowIso();

  const id =
    generateId();

  const full:
    Cid = {
    ...data,

    id,

    created_at:
      timestamp,

    updated_at:
      timestamp,

    synced:
      false,
  };

  await db.cids.add(
    full
  );

  return id;
}

export async function safeUpdateCid(
  id: string,
  changes: Partial<Cid>
): Promise<void> {
  const existing =
    await db.cids.get(
      id
    );

  if (!existing) {
    throw new Error(
      'CID não encontrado'
    );
  }

  await db.cids.update(
    id,
    {
      ...changes,

      synced:
        false,
    }
  );
}

export async function safeDeleteCid(
  id: string
): Promise<void> {
  const existing =
    await db.cids.get(
      id
    );

  if (!existing) {
    return;
  }

  const tratamentos =
    await db.tratamentos.toArray();

  for (
    const tratamento of
    tratamentos
  ) {
    if (
      tratamento.cid_ids?.includes(
        id
      )
    ) {
      const cidIds =
        tratamento.cid_ids.filter(
          (
            cidId
          ) =>
            cidId !==
            id
        );

      await db.tratamentos.update(
        tratamento.id!,
        {
          cid_ids:
            cidIds,

          synced:
            false,
        }
      );
    }
  }

  await db.cids.delete(
    id
  );
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
  const timestamp =
    nowIso();

  const id =
    generateId();

  const full:
    AnexoClinico = {
    ...data,

    id,

    user_id:
      String(
        data.user_id ||
        ''
      ),

    created_at:
      timestamp,

    updated_at:
      timestamp,

    synced:
      false,
  };

  await db.anexos_clinicos.add(
    full
  );

  return id;
}

export async function safeUpdateAnexoClinico(
  id: string,
  changes: Partial<AnexoClinico>
): Promise<void> {
  const existing =
    await db.anexos_clinicos.get(
      id
    );

  if (!existing) {
    throw new Error(
      'Anexo clínico não encontrado'
    );
  }

  await db.anexos_clinicos.update(
    id,
    {
      ...changes,

      synced:
        false,
    }
  );
}

export async function safeDeleteAnexoClinico(
  id: string
): Promise<void> {
  await db.anexos_clinicos.delete(
    id
  );
}

// ============================================================
// SETTINGS
// ============================================================

export async function safeAddSettings(
  data: Omit<
    AppSettings,
    'id' | 'updated_at' | 'created_at' | 'synced'
  >
): Promise<string> {
  const timestamp =
    nowIso();

  const id =
    generateId();

  const full:
    AppSettings = {
    ...data,

    id,

    created_at:
      timestamp,

    updated_at:
      timestamp,

    synced:
      false,
  };

  await db.settings.add(
    full
  );

  return id;
}

export async function safeUpdateSettings(
  id: string,
  changes: Partial<AppSettings>
): Promise<void> {
  const timestamp =
    nowIso();

  const existing =
    await db.settings.get(
      id
    );

  if (!existing) {
    throw new Error(
      'Configuração não encontrada'
    );
  }

  await db.settings.update(
    id,
    {
      ...changes,

      updated_at:
        timestamp,

      synced:
        false,
    }
  );
}

export async function getDefaultPersonId(
  userId: string
): Promise<string | null> {
  if (!userId) {
    return null;
  }

  const settings =
    await db.settings
      .where(
        'user_id'
      )
      .equals(
        userId
      )
      .first();

  return (
    settings?.default_person_id ||
    null
  );
}

export async function updateDefaultPersonId(
  userId: string,
  personId: string
): Promise<void> {
  if (!userId) {
    throw new Error(
      'User ID é obrigatório'
    );
  }

  const settings =
    await db.settings
      .where(
        'user_id'
      )
      .equals(
        userId
      )
      .first();

  if (!settings) {
    await safeAddSettings({
      user_id:
        userId,

      default_person_id:
        personId,
    });

    return;
  }

  await safeUpdateSettings(
    settings.id!,
    {
      default_person_id:
        personId,
    }
  );
}

export async function getSettings(
  userId: string
): Promise<AppSettings | null> {
  if (!userId) {
    return null;
  }

  return (
    (await db.settings
      .where(
        'user_id'
      )
      .equals(
        userId
      )
      .first()) ??
    null
  );
}

// ============================================================
// VERSÍCULOS
// ============================================================

export async function safeAddVersiculo(
  data: Omit<
    Versiculo,
    'id' | 'created_at' | 'updated_at'
  >
): Promise<string> {
  const timestamp =
    nowIso();

  const id =
    generateId();

  const full:
    Versiculo = {
    ...data,

    id,

    created_at:
      timestamp,

    updated_at:
      timestamp,
  };

  await db.versiculos.add(
    full
  );

  return id;
}

export async function safeUpdateVersiculo(
  id: string,
  changes: Partial<Versiculo>
): Promise<void> {
  const timestamp =
    nowIso();

  const existing =
    await db.versiculos.get(
      id
    );

  if (!existing) {
    throw new Error(
      'Versículo não encontrado'
    );
  }

  await db.versiculos.update(
    id,
    {
      ...changes,

      updated_at:
        timestamp,
    }
  );
}

export async function safeDeleteVersiculo(
  id: string
): Promise<void> {
  await db.versiculos.delete(
    id
  );
}

// ============================================================
// REGISTROS DE SAÚDE
// ============================================================

export async function safeAddRegistroSaude(
  data: Omit<
    RegistroSaude,
    'id' | 'created_at' | 'updated_at' | 'synced'
  >
): Promise<string> {
  const timestamp =
    nowIso();

  const id =
    generateId();

  const full:
    RegistroSaude = {
    ...data,

    id,

    created_at:
      timestamp,

    updated_at:
      timestamp,

    synced:
      false,
  };

  await db.registros_saude.add(
    full
  );

  return id;
}

export async function safeUpdateRegistroSaude(
  id: string,
  changes: Partial<RegistroSaude>
): Promise<void> {
  const existing =
    await db.registros_saude.get(
      id
    );

  if (!existing) {
    throw new Error(
      'Registro de saúde não encontrado'
    );
  }

  await db.registros_saude.update(
    id,
    {
      ...changes,

      synced:
        false,
    }
  );
}

export async function safeDeleteRegistroSaude(
  id: string
): Promise<void> {
  await db.registros_saude.delete(
    id
  );
}