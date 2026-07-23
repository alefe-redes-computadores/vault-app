import { supabase } from '@/lib/supabase/client';
import { db } from '@/lib/db';
import type { Person, Document, Medicamento, Renovacao, Vault, VaultMember, Medico, Farmacia, Hospital } from '@/lib/types';

// Lock para evitar execução simultânea
let isPulling = false;

/**
 * Puxa todos os dados do Supabase e faz merge no Dexie (upsert)
 * Nunca faz clear() — preserva dados locais pendentes
 */
export async function pullAllData(userId: string): Promise<void> {
  // Evita execução simultânea
  if (isPulling) {
    console.warn('⚠️ Pull já em andamento, ignorando nova chamada');
    return;
  }

  isPulling = true;
  try {
    console.log('🔄 Iniciando pull de dados (merge upsert)...');

    // Buscar itens pendentes na syncQueue (NÃO filtrar por user_id, pois a syncQueue não tem esse campo)
    const pendingItems = await db.syncQueue
      .toCollection()
      .filter((item) => !item.failed)
      .toArray();
    
    const pendingIds = new Set<string>();
    const pendingTables = new Map<string, Set<string>>();
    
    for (const item of pendingItems) {
      const table = item.table;
      const id = item.payload.id as string;
      if (id) {
        pendingIds.add(id);
        if (!pendingTables.has(table)) {
          pendingTables.set(table, new Set());
        }
        pendingTables.get(table)!.add(id);
      }
    }

    console.log(`📌 ${pendingItems.length} itens pendentes na fila, serão preservados`);

    // 1. Puxar pessoas
    const { data: persons, error: personsError } = await supabase
      .from('persons')
      .select('*')
      .eq('user_id', userId);
    
    if (personsError) throw personsError;
    if (persons && persons.length > 0) {
      const pendingIdsForTable = pendingTables.get('persons') || new Set();
      const toUpsert = persons.filter(p => !pendingIdsForTable.has(p.id));
      
      if (toUpsert.length > 0) {
        await db.transaction('rw', db.persons, async () => {
          for (const person of toUpsert) {
            await db.persons.put(person);
          }
        });
      }
      console.log(`✅ ${toUpsert.length} pessoas sincronizadas (${persons.length - toUpsert.length} pendentes preservadas)`);
    }

    // 2. Puxar documentos
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId);
    
    if (docsError) throw docsError;
    if (documents && documents.length > 0) {
      const pendingIdsForTable = pendingTables.get('documents') || new Set();
      const toUpsert = documents.filter(d => !pendingIdsForTable.has(d.id));
      
      if (toUpsert.length > 0) {
        await db.transaction('rw', db.documents, async () => {
          for (const doc of toUpsert) {
            await db.documents.put(doc);
          }
        });
      }
      console.log(`✅ ${toUpsert.length} documentos sincronizados (${documents.length - toUpsert.length} pendentes preservados)`);
    }

    // 3. Puxar medicamentos
    const { data: medicamentos, error: medError } = await supabase
      .from('medicamentos')
      .select('*')
      .eq('user_id', userId);
    
    if (medError) throw medError;
    if (medicamentos && medicamentos.length > 0) {
      const pendingIdsForTable = pendingTables.get('medicamentos') || new Set();
      const toUpsert = medicamentos.filter(m => !pendingIdsForTable.has(m.id));
      
      if (toUpsert.length > 0) {
        await db.transaction('rw', db.medicamentos, async () => {
          for (const med of toUpsert) {
            await db.medicamentos.put(med);
          }
        });
      }
      console.log(`✅ ${toUpsert.length} medicamentos sincronizados (${medicamentos.length - toUpsert.length} pendentes preservados)`);
    }

    // 4. Puxar renovações
    const { data: renovacoes, error: renError } = await supabase
      .from('renovacoes')
      .select('*')
      .eq('user_id', userId);
    
    if (renError) throw renError;
    if (renovacoes && renovacoes.length > 0) {
      const pendingIdsForTable = pendingTables.get('renovacoes') || new Set();
      const toUpsert = renovacoes.filter(r => !pendingIdsForTable.has(r.id));
      
      if (toUpsert.length > 0) {
        await db.transaction('rw', db.renovacoes, async () => {
          for (const ren of toUpsert) {
            await db.renovacoes.put(ren);
          }
        });
      }
      console.log(`✅ ${toUpsert.length} renovações sincronizadas (${renovacoes.length - toUpsert.length} pendentes preservados)`);
    }

    // 5. Puxar cofres
    const { data: vaults, error: vaultError } = await supabase
      .from('vaults')
      .select('*')
      .eq('user_id', userId);
    
    if (vaultError) throw vaultError;
    if (vaults && vaults.length > 0) {
      const pendingIdsForTable = pendingTables.get('vaults') || new Set();
      const toUpsert = vaults.filter(v => !pendingIdsForTable.has(v.id));
      
      if (toUpsert.length > 0) {
        await db.transaction('rw', db.vaults, async () => {
          for (const vault of toUpsert) {
            await db.vaults.put(vault);
          }
        });
      }
      console.log(`✅ ${toUpsert.length} cofres sincronizados (${vaults.length - toUpsert.length} pendentes preservados)`);
    }

    // 6. Puxar membros de cofres
    const { data: members, error: membersError } = await supabase
      .from('vault_members')
      .select('*')
      .eq('user_id', userId);
    
    if (membersError) throw membersError;
    if (members && members.length > 0) {
      const pendingIdsForTable = pendingTables.get('vaultMembers') || new Set();
      const toUpsert = members.filter(m => !pendingIdsForTable.has(m.id));
      
      if (toUpsert.length > 0) {
        await db.transaction('rw', db.vaultMembers, async () => {
          for (const member of toUpsert) {
            await db.vaultMembers.put(member);
          }
        });
      }
      console.log(`✅ ${toUpsert.length} membros sincronizados (${members.length - toUpsert.length} pendentes preservados)`);
    }

    // 7. Puxar médicos
    const { data: medicos, error: medicosError } = await supabase
      .from('medicos')
      .select('*')
      .eq('user_id', userId);
    
    if (medicosError) throw medicosError;
    if (medicos && medicos.length > 0) {
      const pendingIdsForTable = pendingTables.get('medicos') || new Set();
      const toUpsert = medicos.filter(m => !pendingIdsForTable.has(m.id));
      
      if (toUpsert.length > 0) {
        await db.transaction('rw', db.medicos, async () => {
          for (const medico of toUpsert) {
            await db.medicos.put(medico);
          }
        });
      }
      console.log(`✅ ${toUpsert.length} médicos sincronizados (${medicos.length - toUpsert.length} pendentes preservados)`);
    }

    // 8. Puxar farmácias
    const { data: farmacias, error: farmaciasError } = await supabase
      .from('farmacias')
      .select('*')
      .eq('user_id', userId);
    
    if (farmaciasError) throw farmaciasError;
    if (farmacias && farmacias.length > 0) {
      const pendingIdsForTable = pendingTables.get('farmacias') || new Set();
      const toUpsert = farmacias.filter(f => !pendingIdsForTable.has(f.id));
      
      if (toUpsert.length > 0) {
        await db.transaction('rw', db.farmacias, async () => {
          for (const farmacia of toUpsert) {
            await db.farmacias.put(farmacia);
          }
        });
      }
      console.log(`✅ ${toUpsert.length} farmácias sincronizadas (${farmacias.length - toUpsert.length} pendentes preservados)`);
    }

    // 9. Puxar hospitais
    const { data: hospitais, error: hospitaisError } = await supabase
      .from('hospitais')
      .select('*')
      .eq('user_id', userId);
    
    if (hospitaisError) throw hospitaisError;
    if (hospitais && hospitais.length > 0) {
      const pendingIdsForTable = pendingTables.get('hospitais') || new Set();
      const toUpsert = hospitais.filter(h => !pendingIdsForTable.has(h.id));
      
      if (toUpsert.length > 0) {
        await db.transaction('rw', db.hospitais, async () => {
          for (const hospital of toUpsert) {
            await db.hospitais.put(hospital);
          }
        });
      }
      console.log(`✅ ${toUpsert.length} hospitais sincronizados (${hospitais.length - toUpsert.length} pendentes preservados)`);
    }

    // Disparar evento de sync concluído
    window.dispatchEvent(new Event('sync:end'));
    console.log('✅ Pull de dados concluído com sucesso!');

  } catch (error) {
    console.error('❌ Erro no pull de dados:', error);
    throw error;
  } finally {
    isPulling = false;
  }
}