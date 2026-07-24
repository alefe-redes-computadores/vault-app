"use client";

import { db } from '@/lib/db';
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Document, Vault, VaultMember, Medico, Farmacia, Hospital } from '@/lib/types';

const MAX_RETRIES = 5;

export function useSyncQueue() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : false
  );
  const [syncLogs, setSyncLogs] = useState<{ time: string; message: string; type: 'info' | 'success' | 'error' }[]>([]);
  const processingRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const addLog = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const time = new Date().toLocaleTimeString();
    setSyncLogs((prev) => {
      const newLogs = [{ time, message, type }, ...prev];
      return newLogs.slice(0, 50);
    });
  }, []);

  const clearLogs = useCallback(() => {
    setSyncLogs([]);
  }, []);

  // ============================================================
  // DETECTAR MUDANÇAS DE CONEXÃO
  // ============================================================
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // ============================================================
  // FUNÇÕES DE SYNC POR TABELA (com checagem de erro detalhada)
  // ============================================================

  const syncPerson = async (item: any) => {
    if (!supabase) return;
    const person = item.payload as any;

    console.log('📤 Enviando person para Supabase:', person);

    switch (item.operation) {
      case 'add': {
        const { data, error } = await supabase.from('persons').insert({
          id: person.id,
          user_id: person.user_id,
          name: person.name,
          email: person.email || null,
          phone: person.phone || null,
          avatar_url: person.avatar_url || null,
          created_at: person.created_at,
          updated_at: person.updated_at,
        });
        if (error) {
          console.error('❌ Erro no insert do person:', error);
          throw new Error(`Persons insert error: ${error.message} (code: ${error.code})`);
        }
        console.log('✅ Person enviado com sucesso:', data);
        break;
      }
      case 'update': {
        const { error } = await supabase.from('persons')
          .update({
            name: person.name,
            email: person.email || null,
            phone: person.phone || null,
            avatar_url: person.avatar_url || null,
            updated_at: person.updated_at,
          })
          .eq('id', person.id);
        if (error) throw new Error(`Persons update error: ${error.message}`);
        break;
      }
      case 'delete': {
        const { error } = await supabase.from('persons').delete().eq('id', item.payload.id);
        if (error) throw new Error(`Persons delete error: ${error.message}`);
        break;
      }
    }

    if (item.operation !== 'delete' && person.id) {
      await db.persons.update(person.id, { synced: true });
    }
  };

  const syncMedicamento = async (item: any) => {
    if (!supabase) return;
    const med = item.payload as any;

    switch (item.operation) {
      case 'add': {
        const { error } = await supabase.from('medicamentos').insert({
          id: med.id,
          document_id: med.document_id || '',
          user_id: med.user_id,
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
        if (error) throw new Error(`Medicamentos insert error: ${error.message}`);
        break;
      }
      case 'update': {
        const { error } = await supabase.from('medicamentos')
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
        if (error) throw new Error(`Medicamentos update error: ${error.message}`);
        break;
      }
      case 'delete': {
        const { error } = await supabase.from('medicamentos').delete().eq('id', item.payload.id);
        if (error) throw new Error(`Medicamentos delete error: ${error.message}`);
        break;
      }
    }

    if (item.operation !== 'delete' && med.id) {
      await db.medicamentos.update(med.id, { synced: true });
    }
  };

  const syncRenovacao = async (item: any) => {
    if (!supabase) return;
    const ren = item.payload as any;

    switch (item.operation) {
      case 'add': {
        const { error } = await supabase.from('renovacoes').insert({
          id: ren.id,
          medicamento_id: ren.medicamento_id,
          user_id: ren.user_id,
          data: ren.data,
          anexo_url: ren.anexo_url || null,
          observacoes: ren.observacoes || null,
          created_at: ren.created_at,
          updated_at: ren.updated_at,
        });
        if (error) throw new Error(`Renovacoes insert error: ${error.message}`);
        break;
      }
      case 'update': {
        const { error } = await supabase.from('renovacoes')
          .update({
            data: ren.data,
            anexo_url: ren.anexo_url || null,
            observacoes: ren.observacoes || null,
            updated_at: ren.updated_at,
          })
          .eq('id', ren.id);
        if (error) throw new Error(`Renovacoes update error: ${error.message}`);
        break;
      }
      case 'delete': {
        const { error } = await supabase.from('renovacoes').delete().eq('id', item.payload.id);
        if (error) throw new Error(`Renovacoes delete error: ${error.message}`);
        break;
      }
    }

    if (item.operation !== 'delete' && ren.id) {
      await db.renovacoes.update(ren.id, { synced: true });
    }
  };

  const syncDocument = async (item: any) => {
    if (!supabase) return;
    const doc = item.payload as Document;

    console.log('📤 Enviando documento para Supabase:', doc);

    if (doc.person_id) {
      const person = await db.persons.get(doc.person_id);
      if (!person) {
        throw new Error(`Pessoa com ID ${doc.person_id} não encontrada localmente`);
      }
    }

    switch (item.operation) {
      case 'add': {
        const { data, error } = await supabase.from('documents').insert({
          id: doc.id,
          user_id: doc.user_id,
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
        if (error) {
          console.error('❌ Erro no insert do documento:', error);
          throw new Error(`Documents insert error: ${error.message} (code: ${error.code})`);
        }
        console.log('✅ Documento enviado com sucesso:', data);
        break;
      }
      case 'update': {
        const { error } = await supabase.from('documents')
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
        if (error) throw new Error(`Documents update error: ${error.message}`);
        break;
      }
      case 'delete': {
        const { error } = await supabase.from('documents')
          .delete()
          .eq('id', item.payload.id);
        if (error) throw new Error(`Documents delete error: ${error.message}`);
        break;
      }
    }

    if (item.operation !== 'delete' && doc.id) {
      await db.documents.update(doc.id, { synced: true });
    }
  };

  const syncVault = async (item: any) => {
    if (!supabase) return;
    const vault = item.payload as Vault;

    switch (item.operation) {
      case 'add': {
        const { error } = await supabase.from('vaults').insert({
          id: vault.id,
          user_id: vault.user_id,
          name: vault.name,
          description: vault.description || null,
          icon: vault.icon,
          color: vault.color,
          created_at: vault.created_at,
          updated_at: vault.updated_at,
        });
        if (error) throw new Error(`Vaults insert error: ${error.message}`);
        break;
      }
      case 'update': {
        const { error } = await supabase.from('vaults')
          .update({
            name: vault.name,
            description: vault.description || null,
            icon: vault.icon,
            color: vault.color,
            updated_at: vault.updated_at,
          })
          .eq('id', vault.id);
        if (error) throw new Error(`Vaults update error: ${error.message}`);
        break;
      }
      case 'delete': {
        const { error } = await supabase.from('vaults')
          .delete()
          .eq('id', item.payload.id);
        if (error) throw new Error(`Vaults delete error: ${error.message}`);
        break;
      }
    }

    if (item.operation !== 'delete' && vault.id) {
      await db.vaults.update(vault.id, { synced: true });
    }
  };

  const syncVaultMember = async (item: any) => {
    if (!supabase) return;
    const member = item.payload as VaultMember;

    switch (item.operation) {
      case 'add': {
        const { error } = await supabase.from('vault_members').insert({
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
        if (error) throw new Error(`Vault_members insert error: ${error.message}`);
        break;
      }
      case 'update': {
        const { error } = await supabase.from('vault_members')
          .update({
            name: member.name || null,
            permission: member.permission,
            status: member.status,
            updated_at: member.updated_at,
          })
          .eq('id', member.id);
        if (error) throw new Error(`Vault_members update error: ${error.message}`);
        break;
      }
      case 'delete': {
        const { error } = await supabase.from('vault_members')
          .delete()
          .eq('id', item.payload.id);
        if (error) throw new Error(`Vault_members delete error: ${error.message}`);
        break;
      }
    }

    if (item.operation !== 'delete' && member.id) {
      await db.vaultMembers.update(member.id, { synced: true });
    }
  };

  const syncMedico = async (item: any) => {
    if (!supabase) return;
    const medico = item.payload as Medico;

    switch (item.operation) {
      case 'add': {
        const { error } = await supabase.from('medicos').insert({
          id: medico.id,
          user_id: medico.user_id,
          nome: medico.nome,
          especialidade: medico.especialidade || null,
          crm: medico.crm || null,
          telefone: medico.telefone || null,
          email: medico.email || null,
          created_at: medico.created_at,
          updated_at: medico.updated_at,
        });
        if (error) throw new Error(`Medicos insert error: ${error.message}`);
        break;
      }
      case 'update': {
        const { error } = await supabase.from('medicos')
          .update({
            nome: medico.nome,
            especialidade: medico.especialidade || null,
            crm: medico.crm || null,
            telefone: medico.telefone || null,
            email: medico.email || null,
            updated_at: medico.updated_at,
          })
          .eq('id', medico.id);
        if (error) throw new Error(`Medicos update error: ${error.message}`);
        break;
      }
      case 'delete': {
        const { error } = await supabase.from('medicos')
          .delete()
          .eq('id', item.payload.id);
        if (error) throw new Error(`Medicos delete error: ${error.message}`);
        break;
      }
    }

    if (item.operation !== 'delete' && medico.id) {
      await db.medicos.update(medico.id, { synced: true });
    }
  };

  const syncFarmacia = async (item: any) => {
    if (!supabase) return;
    const farmacia = item.payload as Farmacia;

    switch (item.operation) {
      case 'add': {
        const { error } = await supabase.from('farmacias').insert({
          id: farmacia.id,
          user_id: farmacia.user_id,
          nome: farmacia.nome,
          endereco: farmacia.endereco || null,
          telefone: farmacia.telefone || null,
          created_at: farmacia.created_at,
          updated_at: farmacia.updated_at,
        });
        if (error) throw new Error(`Farmacias insert error: ${error.message}`);
        break;
      }
      case 'update': {
        const { error } = await supabase.from('farmacias')
          .update({
            nome: farmacia.nome,
            endereco: farmacia.endereco || null,
            telefone: farmacia.telefone || null,
            updated_at: farmacia.updated_at,
          })
          .eq('id', farmacia.id);
        if (error) throw new Error(`Farmacias update error: ${error.message}`);
        break;
      }
      case 'delete': {
        const { error } = await supabase.from('farmacias')
          .delete()
          .eq('id', item.payload.id);
        if (error) throw new Error(`Farmacias delete error: ${error.message}`);
        break;
      }
    }

    if (item.operation !== 'delete' && farmacia.id) {
      await db.farmacias.update(farmacia.id, { synced: true });
    }
  };

  const syncHospital = async (item: any) => {
    if (!supabase) return;
    const hospital = item.payload as Hospital;

    switch (item.operation) {
      case 'add': {
        const { error } = await supabase.from('hospitais').insert({
          id: hospital.id,
          user_id: hospital.user_id,
          nome: hospital.nome,
          endereco: hospital.endereco || null,
          telefone: hospital.telefone || null,
          created_at: hospital.created_at,
          updated_at: hospital.updated_at,
        });
        if (error) throw new Error(`Hospitais insert error: ${error.message}`);
        break;
      }
      case 'update': {
        const { error } = await supabase.from('hospitais')
          .update({
            nome: hospital.nome,
            endereco: hospital.endereco || null,
            telefone: hospital.telefone || null,
            updated_at: hospital.updated_at,
          })
          .eq('id', hospital.id);
        if (error) throw new Error(`Hospitais update error: ${error.message}`);
        break;
      }
      case 'delete': {
        const { error } = await supabase.from('hospitais')
          .delete()
          .eq('id', item.payload.id);
        if (error) throw new Error(`Hospitais delete error: ${error.message}`);
        break;
      }
    }

    if (item.operation !== 'delete' && hospital.id) {
      await db.hospitais.update(hospital.id, { synced: true });
    }
  };

  // ============================================================
  // processQueue
  // ============================================================
  const processQueue = useCallback(async () => {
    if (processingRef.current || !isOnline) {
      addLog('Sync ignorado: já em andamento ou offline', 'info');
      return;
    }

    const count = await db.syncQueue.count();
    if (count === 0) {
      addLog('Fila de sincronização vazia', 'info');
      return;
    }

    processingRef.current = true;
    setIsProcessing(true);
    addLog(`🔒 Iniciando sync: ${count} itens na fila`, 'info');

    try {
      const queue = await db.syncQueue
        .toCollection()
        .filter((item) => item.failed !== true && (item.retry_count || 0) < MAX_RETRIES)
        .toArray();

      if (queue.length === 0) {
        const failedCount = await db.syncQueue
          .toCollection()
          .filter((item) => item.failed === true)
          .count();
        if (failedCount > 0) {
          addLog(`✖️ ${failedCount} itens falharam permanentemente`, 'error');
        }
        return;
      }

      // Reordenar: persons primeiro
      const priorityOrder = ['persons', 'documents', 'medicamentos', 'renovacoes', 'vaults', 'vaultMembers', 'medicos', 'farmacias', 'hospitais'];
      queue.sort((a, b) => {
        const aIndex = priorityOrder.indexOf(a.table);
        const bIndex = priorityOrder.indexOf(b.table);
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
      });

      let successCount = 0;

      for (const item of queue) {
        try {
          if (item.table === 'persons') {
            await syncPerson(item);
          } else if (item.table === 'documents') {
            await syncDocument(item);
          } else if (item.table === 'vaults') {
            await syncVault(item);
          } else if (item.table === 'vaultMembers') {
            await syncVaultMember(item);
          } else if (item.table === 'medicamentos') {
            await syncMedicamento(item);
          } else if (item.table === 'renovacoes') {
            await syncRenovacao(item);
          } else if (item.table === 'medicos') {
            await syncMedico(item);
          } else if (item.table === 'farmacias') {
            await syncFarmacia(item);
          } else if (item.table === 'hospitais') {
            await syncHospital(item);
          }
          await db.syncQueue.delete(item.id!);
          successCount++;
          addLog(`✅ ${item.table} sincronizado`, 'success');
        } catch (error: any) {
          const retryCount = (item.retry_count || 0) + 1;
          const failed = retryCount >= MAX_RETRIES;
          
          // ✅ Mostra o erro detalhado no log
          const errorMessage = error?.message || error?.toString() || 'Erro desconhecido';
          
          await db.syncQueue.update(item.id!, {
            retry_count: retryCount,
            failed: failed,
          });
          
          if (failed) {
            addLog(`✖️ Falha permanente em ${item.table}: ${errorMessage}`, 'error');
          } else {
            addLog(`⚠️ Falha em ${item.table} (tentativa ${retryCount}/${MAX_RETRIES}): ${errorMessage}`, 'error');
          }
        }
      }

      if (successCount > 0) {
        addLog(`✅ ${successCount} itens sincronizados com sucesso!`, 'success');
      }

      const remaining = await db.syncQueue
        .toCollection()
        .filter((item) => item.failed !== true && (item.retry_count || 0) < MAX_RETRIES)
        .count();

      if (remaining > 0) {
        addLog(`⏳ ${remaining} itens pendentes, agendando nova tentativa...`, 'info');
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          processQueue();
        }, 5000);
      }
    } catch (error) {
      addLog(`❌ Erro ao processar fila: ${error}`, 'error');
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  }, [isOnline, addLog]);

  const resetFailedItems = useCallback(async () => {
    const failedItems = await db.syncQueue
      .toCollection()
      .filter((item) => item.failed === true)
      .toArray();

    if (failedItems.length === 0) {
      addLog('Nenhum item com falha para reenviar', 'info');
      return;
    }

    for (const item of failedItems) {
      await db.syncQueue.update(item.id!, {
        failed: false,
        retry_count: 0,
      });
    }

    addLog(`✅ ${failedItems.length} itens redefinidos para reenvio`, 'success');
    processQueue();
  }, [processQueue, addLog]);

  // ============================================================
  // ESCUTA O EVENTO sync:process
  // ============================================================
  useEffect(() => {
    const handleProcess = () => {
      if (isOnline && !processingRef.current) {
        processQueue();
      }
    };
    
    window.addEventListener('sync:process', handleProcess);
    return () => window.removeEventListener('sync:process', handleProcess);
  }, [isOnline, processQueue]);

  // ============================================================
  // PROCESSAR FILA NA MONTAGEM
  // ============================================================
  useEffect(() => {
    if (isOnline) {
      processQueue();
    }
  }, []);

  // ============================================================
  // PROCESSAR FILA QUANDO FICAR ONLINE
  // ============================================================
  useEffect(() => {
    if (isOnline) {
      const timer = setTimeout(() => {
        processQueue();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, processQueue]);

  // ============================================================
  // VERIFICAR FILA PERIODICAMENTE
  // ============================================================
  useEffect(() => {
    if (!isOnline) return;
    
    const checkQueue = async () => {
      const count = await db.syncQueue.count();
      if (count > 0 && !processingRef.current) {
        processQueue();
      }
    };
    
    const interval = setInterval(checkQueue, 10000);
    return () => clearInterval(interval);
  }, [isOnline, processQueue]);

  return {
    processQueue,
    isProcessing,
    isOnline,
    resetFailedItems,
    syncLogs,
    clearLogs,
  };
}