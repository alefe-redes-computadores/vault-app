// lib/sync/pull.ts

import { supabase } from '@/lib/supabase/client';
import { db } from '@/lib/db';
import type {
  Person, Document, Medicamento, Renovacao, Vault,
  VaultMember, Medico, Farmacia, Hospital, Credential, BankCard,
  Tratamento, Cid, Exame, Consulta, Cirurgia, DoseLog, InstituicaoEnsino, LocalSaude, AppSettings
} from '@/lib/types';

let isPulling = false;

export async function pullAllData(userId: string): Promise<void> {
  if (isPulling) {
    console.warn('⚠️ Pull já em andamento, ignorando nova chamada');
    return;
  }

  isPulling = true;
  try {
    console.log('🔄 Iniciando pull de dados (merge upsert)...');

    const pendingItems = await db.syncQueue
      .toCollection()
      .filter((item) => !item.failed)
      .toArray();

    const pendingTables = new Map<string, Set<string>>();
    for (const item of pendingItems) {
      const table = item.table;
      const id = item.payload.id as string;
      if (id) {
        if (!pendingTables.has(table)) pendingTables.set(table, new Set());
        pendingTables.get(table)!.add(id);
      }
    }

    console.log(`📌 ${pendingItems.length} itens pendentes na fila, serão preservados`);

    const processTable = async (
      tableName: string,
      localTable: any,
      query: () => Promise<{ data: any[] | null; error: any }>
    ) => {
      try {
        const { data, error } = await query();
        if (error) {
          console.error(`❌ Erro ao buscar ${tableName}:`, error);
          return;
        }
        if (!data || data.length === 0) {
          console.log(`ℹ️ ${tableName}: nenhum dado para sincronizar`);
          return;
        }

        const pendingIds = pendingTables.get(tableName) || new Set();
        
        // 🔥 LER TODOS OS ITENS LOCAIS PARA DEDUPLICAÇÃO LÓGICA
        const localItems = await localTable.toArray();

        const toUpsert = data.filter((item) => {
          if (!item.id) return false;
          
          // 1. Ignora se o exato ID já está na fila de envio (bloqueio padrão)
          if (pendingIds.has(item.id)) return false;

          // 2. 🛡️ BLINDAGEM CONTRA ECO (Fantasma de Sincronização)
          // Se o item da nuvem tiver 'nome', e já existir um registro local aguardando envio (synced: false) 
          // com o mesmo nome exato, bloqueamos o download para não gerar duplicação visual na tela.
          if (item.nome) {
            const hasLocalUnsyncedMatch = localItems.some((local: any) => 
              local.synced === false && 
              local.nome && 
              local.nome.trim().toLowerCase() === item.nome.trim().toLowerCase()
            );
            
            if (hasLocalUnsyncedMatch) {
              console.warn(`🛡️ Fantasma evitado em ${tableName}: '${item.nome}' já existe localmente aguardando sync. Ignorando a versão da nuvem.`);
              return false;
            }
          }

          return true;
        });

        if (toUpsert.length > 0) {
          await db.transaction('rw', localTable, async () => {
            for (const item of toUpsert) {
              // 🔥 Força a flag synced: true para todos os itens da nuvem, resolvendo o status 'undefined'
              await localTable.put({ ...item, synced: true });
            }
          });
        }
        console.log(`✅ ${toUpsert.length} registros de ${tableName} sincronizados (${data.length - toUpsert.length} pendentes/ignorados)`);
      } catch (err) {
        console.error(`❌ Erro ao processar tabela ${tableName}:`, err);
      }
    };

    // ---- Persons ----
    await processTable('persons', db.persons, async () => {
      return await supabase.from('persons').select('*').eq('user_id', userId);
    });

    // ---- Documents ----
    await processTable('documents', db.documents, async () => {
      return await supabase.from('documents').select('*').eq('user_id', userId);
    });

    // ---- Medicamentos ----
    await processTable('medicamentos', db.medicamentos, async () => {
      return await supabase.from('medicamentos').select('*').eq('user_id', userId);
    });

    // ---- Renovacoes ----
    await processTable('renovacoes', db.renovacoes, async () => {
      return await supabase.from('renovacoes').select('*').eq('user_id', userId);
    });

    // ---- Vaults ----
    await processTable('vaults', db.vaults, async () => {
      return await supabase.from('vaults').select('*').eq('user_id', userId);
    });

    // ---- Vault Members ----
    await processTable('vault_members', db.vaultMembers, async () => {
      return await supabase.from('vault_members').select('*').eq('user_id', userId);
    });

    // ---- Medicos ----
    await processTable('medicos', db.medicos, async () => {
      return await supabase.from('medicos').select('*').eq('user_id', userId);
    });

    // ---- Farmacias ----
    await processTable('farmacias', db.farmacias, async () => {
      return await supabase.from('farmacias').select('*').eq('user_id', userId);
    });

    // ---- Hospitais ----
    await processTable('hospitais', db.hospitais, async () => {
      return await supabase.from('hospitais').select('*').eq('user_id', userId);
    });

    // ---- Locais ----
    await processTable('locais', db.locais, async () => {
      return await supabase.from('locais').select('*').eq('user_id', userId);
    });

    // ---- Credentials ----
    await processTable('credentials', db.credentials, async () => {
      return await supabase.from('credentials').select('*').eq('user_id', userId);
    });

    // ---- Cards (Bancos & Cartões) ----
    await processTable('cards', db.bankCards, async () => {
      return await supabase.from('cards').select('*').eq('user_id', userId);
    });

    // ---- Settings ----
    await processTable('settings', db.settings, async () => {
      return await supabase.from('settings').select('*').eq('user_id', userId);
    });

    // ---- TRATAMENTOS ----
    await processTable('tratamentos', db.tratamentos, async () => {
      return await supabase.from('tratamentos').select('*').eq('user_id', userId);
    });

    // ---- CIDs ----
    await processTable('cids', db.cids, async () => {
      return await supabase.from('cids').select('*').eq('user_id', userId);
    });

    // ---- EXAMES ----
    await processTable('exames', db.exames, async () => {
      return await supabase.from('exames').select('*').eq('user_id', userId);
    });

    // ---- CONSULTAS ----
    await processTable('consultas', db.consultas, async () => {
      return await supabase.from('consultas').select('*').eq('user_id', userId);
    });

    // ---- CIRURGIAS ----
    await processTable('cirurgias', db.cirurgias, async () => {
      return await supabase.from('cirurgias').select('*').eq('user_id', userId);
    });

    // ---- DOSE LOGS ----
    await processTable('dose_logs', db.doseLogs, async () => {
      return await supabase.from('dose_logs').select('*').eq('user_id', userId);
    });

    // ---- ANEXOS CLÍNICOS ----
    await processTable('anexos_clinicos', db.anexos_clinicos, async () => {
      return await supabase.from('anexos_clinicos').select('*').eq('user_id', userId);
    });

    // ---- INSTITUIÇÕES ----
    await processTable('instituicoes', db.instituicoes, async () => {
      return await supabase.from('instituicoes').select('*').eq('user_id', userId);
    });

    // 🔥 ---- VERSÍCULOS ----
    await processTable('versiculos', db.versiculos, async () => {
      return await supabase.from('versiculos').select('*').eq('user_id', userId);
    });

    window.dispatchEvent(new Event('sync:end'));
    console.log('✅ Pull de dados concluído com sucesso!');
  } catch (error) {
    console.error('❌ Erro fatal no pull de dados:', error);
    throw error;
  } finally {
    isPulling = false;
  }
}
