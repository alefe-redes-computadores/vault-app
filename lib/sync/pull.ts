import { supabase } from '@/lib/supabase/client';
import { db } from '@/lib/db';
import type { 
  Person, Document, Medicamento, Renovacao, Vault, 
  VaultMember, Medico, Farmacia, Hospital, Credential, BankCard 
} from '@/lib/types';

// Lock para evitar execução simultânea
let isPulling = false;

/**
 * Puxa todos os dados do Supabase e faz merge no Dexie (upsert)
 * Cada tabela é processada individualmente; uma falha não interrompe as demais.
 */
export async function pullAllData(userId: string): Promise<void> {
  if (isPulling) {
    console.warn('⚠️ Pull já em andamento, ignorando nova chamada');
    return;
  }

  isPulling = true;
  try {
    console.log('🔄 Iniciando pull de dados (merge upsert)...');

    // Buscar itens pendentes na syncQueue (para não sobrescrever)
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
        const toUpsert = data.filter((item) => {
          if (!item.id) return false;
          return !pendingIds.has(item.id);
        });

        if (toUpsert.length > 0) {
          await db.transaction('rw', localTable, async () => {
            for (const item of toUpsert) {
              await localTable.put(item);
            }
          });
        }
        console.log(`✅ ${toUpsert.length} registros de ${tableName} sincronizados (${data.length - toUpsert.length} pendentes preservados)`);
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
    try {
      const { data, error } = await supabase.from('renovacoes').select('*').eq('user_id', userId);
      if (error) {
        const { data: fallbackData, error: fallbackError } = await supabase.from('renovacoes').select('*');
        if (!fallbackError && fallbackData) {
          const pendingIds = pendingTables.get('renovacoes') || new Set();
          const toUpsert = fallbackData.filter((r: any) => r.id && !pendingIds.has(r.id));
          if (toUpsert.length > 0) {
            await db.transaction('rw', db.renovacoes, async () => {
              for (const ren of toUpsert) { await db.renovacoes.put(ren); }
            });
          }
        }
      } else if (data) {
        const pendingIds = pendingTables.get('renovacoes') || new Set();
        const toUpsert = data.filter((r: any) => r.id && !pendingIds.has(r.id));
        if (toUpsert.length > 0) {
          await db.transaction('rw', db.renovacoes, async () => {
            for (const ren of toUpsert) { await db.renovacoes.put(ren); }
          });
        }
      }
    } catch (err) {
      console.error('❌ Erro inesperado ao processar renovacoes:', err);
    }

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

    // ---- Credentials ----
    await processTable('credentials', db.credentials, async () => {
      return await supabase.from('credentials').select('*').eq('user_id', userId);
    });

    // ---- Cards (Bancos & Cartões) ✅ NOVO ----
    await processTable('cards', db.cards, async () => {
      return await supabase.from('cards').select('*').eq('user_id', userId);
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
