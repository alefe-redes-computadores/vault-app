import { supabase } from '@/lib/supabase/client';
import { db } from '@/lib/db';
import type { Person, Document, Medicamento, Renovacao, Vault, VaultMember, Medico, Farmacia, Hospital } from '@/lib/types';

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

    // ============================================================
    // Função auxiliar para processar uma tabela com try/catch
    // ============================================================
    const processTable = async (
      tableName: string,
      localTable: any,
      // ✅ Agora espera uma função assíncrona que retorna { data, error }
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
        // Não relança para não interromper as demais
      }
    };

    // ---- Persons ----
    await processTable('persons', db.persons, async () => {
      const result = await supabase.from('persons').select('*').eq('user_id', userId);
      return result;
    });

    // ---- Documents ----
    await processTable('documents', db.documents, async () => {
      const result = await supabase.from('documents').select('*').eq('user_id', userId);
      return result;
    });

    // ---- Medicamentos ----
    await processTable('medicamentos', db.medicamentos, async () => {
      const result = await supabase.from('medicamentos').select('*').eq('user_id', userId);
      return result;
    });

    // ---- Renovacoes (com fallback se user_id não existir) ----
    try {
      const { data, error } = await supabase
        .from('renovacoes')
        .select('*')
        .eq('user_id', userId);
      if (error) {
        console.warn('⚠️ Tabela renovacoes sem user_id ou erro na consulta:', error.message);
        // Tenta buscar sem filtro user_id (caso a coluna não exista)
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('renovacoes')
          .select('*');
        if (fallbackError) {
          console.error('❌ Erro ao buscar renovacoes sem filtro:', fallbackError);
        } else {
          const pendingIds = pendingTables.get('renovacoes') || new Set();
          const toUpsert = (fallbackData || []).filter((r: any) => {
            if (!r.id) return false;
            return !pendingIds.has(r.id);
          });
          if (toUpsert.length > 0) {
            await db.transaction('rw', db.renovacoes, async () => {
              for (const ren of toUpsert) {
                await db.renovacoes.put(ren);
              }
            });
          }
          console.log(`✅ ${toUpsert.length} renovações sincronizadas (fallback sem user_id)`);
        }
      } else {
        const pendingIds = pendingTables.get('renovacoes') || new Set();
        const toUpsert = (data || []).filter((r: any) => {
          if (!r.id) return false;
          return !pendingIds.has(r.id);
        });
        if (toUpsert.length > 0) {
          await db.transaction('rw', db.renovacoes, async () => {
            for (const ren of toUpsert) {
              await db.renovacoes.put(ren);
            }
          });
        }
        console.log(`✅ ${toUpsert.length} renovações sincronizadas`);
      }
    } catch (err) {
      console.error('❌ Erro inesperado ao processar renovacoes:', err);
    }

    // ---- Vaults ----
    await processTable('vaults', db.vaults, async () => {
      const result = await supabase.from('vaults').select('*').eq('user_id', userId);
      return result;
    });

    // ---- Vault Members ----
    await processTable('vault_members', db.vaultMembers, async () => {
      const result = await supabase.from('vault_members').select('*').eq('user_id', userId);
      return result;
    });

    // ---- Medicos ----
    await processTable('medicos', db.medicos, async () => {
      const result = await supabase.from('medicos').select('*').eq('user_id', userId);
      return result;
    });

    // ---- Farmacias ----
    await processTable('farmacias', db.farmacias, async () => {
      const result = await supabase.from('farmacias').select('*').eq('user_id', userId);
      return result;
    });

    // ---- Hospitais ----
    await processTable('hospitais', db.hospitais, async () => {
      const result = await supabase.from('hospitais').select('*').eq('user_id', userId);
      return result;
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