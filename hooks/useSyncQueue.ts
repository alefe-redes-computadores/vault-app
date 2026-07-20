import { db } from '@/lib/db';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Document, Vault, VaultMember } from '@/lib/types';

export function useSyncQueue() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : false
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const processQueue = async () => {
    if (!isOnline || isProcessing) return;

    setIsProcessing(true);
    try {
      const queue = await db.syncQueue.toArray();

      for (const item of queue) {
        try {
          if (item.table === 'documents') {
            await syncDocument(item);
          } else if (item.table === 'vaults') {
            await syncVault(item);
          } else if (item.table === 'vaultMembers') {
            await syncVaultMember(item);
          } else if (item.table === 'persons') {
            await syncPerson(item);
          } else if (item.table === 'medicamentos') {
            await syncMedicamento(item);
          } else if (item.table === 'renovacoes') {
            await syncRenovacao(item);
          }
          await db.syncQueue.delete(item.id!);
        } catch (error) {
          console.error('Erro ao sincronizar item:', item, error);
        }
      }
    } catch (error) {
      console.error('Erro ao processar fila:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const syncPerson = async (item: any) => {
    if (!supabase) return;
    const person = item.payload as any;
    switch (item.operation) {
      case 'add':
        await supabase.from('persons').insert({
          id: person.id,
          user_id: person.user_id,
          name: person.name,
          email: person.email || null,
          phone: person.phone || null,
          avatar_url: person.avatar_url || null,
          created_at: person.created_at,
          updated_at: person.updated_at,
        });
        break;
      case 'update':
        await supabase.from('persons')
          .update({
            name: person.name,
            email: person.email || null,
            phone: person.phone || null,
            avatar_url: person.avatar_url || null,
            updated_at: person.updated_at,
          })
          .eq('id', person.id);
        break;
      case 'delete':
        await supabase.from('persons').delete().eq('id', item.payload.id);
        break;
    }
    if (item.operation !== 'delete' && person.id) {
      await db.persons.update(person.id, { synced: true });
    }
  };

  const syncMedicamento = async (item: any) => {
    if (!supabase) return;
    const med = item.payload as any;
    switch (item.operation) {
      case 'add':
        await supabase.from('medicamentos').insert({
          id: med.id,
          document_id: med.document_id || 0,
          nome: med.nome,
          dosagem: med.dosagem,
          medico: med.medico,
          farmacia: med.farmacia || null,
          data_receita: med.data_receita,
          proxima_renovacao: med.proxima_renovacao,
          observacoes: med.observacoes || null,
          created_at: med.created_at,
          updated_at: med.updated_at,
        });
        break;
      case 'update':
        await supabase.from('medicamentos')
          .update({
            nome: med.nome,
            dosagem: med.dosagem,
            medico: med.medico,
            farmacia: med.farmacia || null,
            data_receita: med.data_receita,
            proxima_renovacao: med.proxima_renovacao,
            observacoes: med.observacoes || null,
            updated_at: med.updated_at,
          })
          .eq('id', med.id);
        break;
      case 'delete':
        await supabase.from('medicamentos').delete().eq('id', item.payload.id);
        break;
    }
    if (item.operation !== 'delete' && med.id) {
      await db.medicamentos.update(med.id, { synced: true });
    }
  };

  const syncRenovacao = async (item: any) => {
    if (!supabase) return;
    const ren = item.payload as any;
    switch (item.operation) {
      case 'add':
        await supabase.from('renovacoes').insert({
          id: ren.id,
          medicamento_id: ren.medicamento_id,
          data: ren.data,
          anexo_url: ren.anexo_url || null,
          observacoes: ren.observacoes || null,
          created_at: ren.created_at,
          updated_at: ren.updated_at,
        });
        break;
      case 'update':
        await supabase.from('renovacoes')
          .update({
            data: ren.data,
            anexo_url: ren.anexo_url || null,
            observacoes: ren.observacoes || null,
            updated_at: ren.updated_at,
          })
          .eq('id', ren.id);
        break;
      case 'delete':
        await supabase.from('renovacoes').delete().eq('id', item.payload.id);
        break;
    }
    if (item.operation !== 'delete' && ren.id) {
      await db.renovacoes.update(ren.id, { synced: true });
    }
  };

  const syncDocument = async (item: any) => {
    if (!supabase) return;

    const doc = item.payload as Document;

    switch (item.operation) {
      case 'add':
        await supabase.from('documents').insert({
          id: doc.id,
          user_id: doc.user_id, // ← ADICIONADO
          person_id: doc.person_id,
          category_id: doc.category_id,
          type: doc.type,
          title: doc.title,
          description: doc.description,
          metadata: doc.metadata,
          attachments: doc.attachments,
          is_favorite: doc.is_favorite,
          vault_id: doc.vault_id || null,
          created_at: doc.created_at,
          updated_at: doc.updated_at,
        });
        break;

      case 'update':
        await supabase.from('documents')
          .update({
            title: doc.title,
            description: doc.description,
            metadata: doc.metadata,
            attachments: doc.attachments,
            is_favorite: doc.is_favorite,
            vault_id: doc.vault_id || null,
            updated_at: doc.updated_at,
          })
          .eq('id', doc.id);
        break;

      case 'delete':
        await supabase.from('documents')
          .delete()
          .eq('id', item.payload.id);
        break;
    }

    if (item.operation !== 'delete' && doc.id) {
      await db.documents.update(doc.id, { synced: true });
    }
  };

  const syncVault = async (item: any) => {
    if (!supabase) return;

    const vault = item.payload as Vault;

    switch (item.operation) {
      case 'add':
        await supabase.from('vaults').insert({
          id: vault.id,
          user_id: vault.user_id,
          name: vault.name,
          description: vault.description || null,
          icon: vault.icon,
          color: vault.color,
          created_at: vault.created_at,
          updated_at: vault.updated_at,
        });
        break;

      case 'update':
        await supabase.from('vaults')
          .update({
            name: vault.name,
            description: vault.description || null,
            icon: vault.icon,
            color: vault.color,
            updated_at: vault.updated_at,
          })
          .eq('id', vault.id);
        break;

      case 'delete':
        await supabase.from('vaults')
          .delete()
          .eq('id', item.payload.id);
        break;
    }

    if (item.operation !== 'delete' && vault.id) {
      await db.vaults.update(vault.id, { synced: true });
    }
  };

  const syncVaultMember = async (item: any) => {
    if (!supabase) return;

    const member = item.payload as VaultMember;

    switch (item.operation) {
      case 'add':
        await supabase.from('vault_members').insert({
          id: member.id,
          vault_id: member.vault_id,
          user_id: member.user_id,
          email: member.email,
          name: member.name || null,
          permission: member.permission,
          invited_by: member.invited_by,
          status: member.status,
          invited_at: member.invited_at,
          updated_at: member.updated_at,
        });
        break;

      case 'update':
        await supabase.from('vault_members')
          .update({
            name: member.name || null,
            permission: member.permission,
            status: member.status,
            updated_at: member.updated_at,
          })
          .eq('id', member.id);
        break;

      case 'delete':
        await supabase.from('vault_members')
          .delete()
          .eq('id', item.payload.id);
        break;
    }

    if (item.operation !== 'delete' && member.id) {
      await db.vaultMembers.update(member.id, { synced: true });
    }
  };

  useEffect(() => {
    if (isOnline) {
      processQueue();
    }
  }, [isOnline]);

  return { processQueue, isProcessing, isOnline };
}