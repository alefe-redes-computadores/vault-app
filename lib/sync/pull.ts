import { supabase } from '@/lib/supabase/client';
import { db } from '@/lib/db';
import type { Person, Document, Medicamento, Renovacao, Vault, VaultMember, Medico, Farmacia, Hospital } from '@/lib/types';

/**
 * Puxa todos os dados do Supabase e insere no Dexie
 */
export async function pullAllData(userId: string): Promise<void> {
  try {
    // 1. Puxar pessoas
    const { data: persons, error: personsError } = await supabase
      .from('persons')
      .select('*')
      .eq('user_id', userId);
    
    if (personsError) throw personsError;
    if (persons && persons.length > 0) {
      await db.transaction('rw', db.persons, async () => {
        await db.persons.clear();
        await db.persons.bulkAdd(persons);
      });
      console.log(`✅ ${persons.length} pessoas sincronizadas`);
    }

    // 2. Puxar documentos
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId);
    
    if (docsError) throw docsError;
    if (documents && documents.length > 0) {
      await db.transaction('rw', db.documents, async () => {
        await db.documents.clear();
        await db.documents.bulkAdd(documents);
      });
      console.log(`✅ ${documents.length} documentos sincronizados`);
    }

    // 3. Puxar medicamentos
    const { data: medicamentos, error: medError } = await supabase
      .from('medicamentos')
      .select('*')
      .eq('user_id', userId);
    
    if (medError) throw medError;
    if (medicamentos && medicamentos.length > 0) {
      await db.transaction('rw', db.medicamentos, async () => {
        await db.medicamentos.clear();
        await db.medicamentos.bulkAdd(medicamentos);
      });
      console.log(`✅ ${medicamentos.length} medicamentos sincronizados`);
    }

    // 4. Puxar renovações
    const { data: renovacoes, error: renError } = await supabase
      .from('renovacoes')
      .select('*')
      .eq('user_id', userId);
    
    if (renError) throw renError;
    if (renovacoes && renovacoes.length > 0) {
      await db.transaction('rw', db.renovacoes, async () => {
        await db.renovacoes.clear();
        await db.renovacoes.bulkAdd(renovacoes);
      });
      console.log(`✅ ${renovacoes.length} renovações sincronizadas`);
    }

    // 5. Puxar cofres
    const { data: vaults, error: vaultError } = await supabase
      .from('vaults')
      .select('*')
      .eq('user_id', userId);
    
    if (vaultError) throw vaultError;
    if (vaults && vaults.length > 0) {
      await db.transaction('rw', db.vaults, async () => {
        await db.vaults.clear();
        await db.vaults.bulkAdd(vaults);
      });
      console.log(`✅ ${vaults.length} cofres sincronizados`);
    }

    // 6. Puxar membros de cofres
    const { data: members, error: membersError } = await supabase
      .from('vault_members')
      .select('*')
      .eq('user_id', userId);
    
    if (membersError) throw membersError;
    if (members && members.length > 0) {
      await db.transaction('rw', db.vaultMembers, async () => {
        await db.vaultMembers.clear();
        await db.vaultMembers.bulkAdd(members);
      });
      console.log(`✅ ${members.length} membros sincronizados`);
    }

    // ============================================================
    // NOVO: Puxar médicos, farmácias e hospitais
    // ============================================================

    // 7. Puxar médicos
    const { data: medicos, error: medicosError } = await supabase
      .from('medicos')
      .select('*')
      .eq('user_id', userId);
    
    if (medicosError) throw medicosError;
    if (medicos && medicos.length > 0) {
      await db.transaction('rw', db.medicos, async () => {
        await db.medicos.clear();
        await db.medicos.bulkAdd(medicos);
      });
      console.log(`✅ ${medicos.length} médicos sincronizados`);
    }

    // 8. Puxar farmácias
    const { data: farmacias, error: farmaciasError } = await supabase
      .from('farmacias')
      .select('*')
      .eq('user_id', userId);
    
    if (farmaciasError) throw farmaciasError;
    if (farmacias && farmacias.length > 0) {
      await db.transaction('rw', db.farmacias, async () => {
        await db.farmacias.clear();
        await db.farmacias.bulkAdd(farmacias);
      });
      console.log(`✅ ${farmacias.length} farmácias sincronizadas`);
    }

    // 9. Puxar hospitais
    const { data: hospitais, error: hospitaisError } = await supabase
      .from('hospitais')
      .select('*')
      .eq('user_id', userId);
    
    if (hospitaisError) throw hospitaisError;
    if (hospitais && hospitais.length > 0) {
      await db.transaction('rw', db.hospitais, async () => {
        await db.hospitais.clear();
        await db.hospitais.bulkAdd(hospitais);
      });
      console.log(`✅ ${hospitais.length} hospitais sincronizados`);
    }

  } catch (error) {
    console.error('Erro ao puxar dados:', error);
    throw error;
  }
}