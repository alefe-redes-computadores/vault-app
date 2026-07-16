import { db } from '@/lib/db';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { VaultDocument } from '@/lib/types';

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
          }
          await db.syncQueue.delete(item.id!);
        } catch (error) {
          console.error('Erro ao sincronizar item:', item, error);
          // Mantém na fila para tentar depois
        }
      }
    } catch (error) {
      console.error('Erro ao processar fila:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const syncDocument = async (item: any) => {
    if (!supabase) return;

    const doc = item.payload as VaultDocument;

    switch (item.operation) {
      case 'add':
        // Upload do arquivo se houver
        if (doc.fileLocalUri) {
          // Implementar upload para Supabase Storage
        }
        await supabase.from('documents').insert({
          id: doc.id,
          profile_id: doc.profileId,
          area_id: doc.areaId,
          category: doc.category,
          title: doc.title,
          notes: doc.notes,
          document_date: doc.documentDate,
          expiry_date: doc.expiryDate,
          file_remote_url: doc.fileRemoteUrl,
          synced: true,
          is_favorite: doc.isFavorite,
          created_at: doc.createdAt,
          updated_at: doc.updatedAt,
        });
        break;

      case 'update':
        await supabase.from('documents')
          .update({
            title: doc.title,
            notes: doc.notes,
            document_date: doc.documentDate,
            expiry_date: doc.expiryDate,
            is_favorite: doc.isFavorite,
            updated_at: doc.updatedAt,
          })
          .eq('id', doc.id);
        break;

      case 'delete':
        await supabase.from('documents')
          .delete()
          .eq('id', item.payload.id);
        break;
    }

    // Marca como sincronizado
    if (item.operation !== 'delete' && doc.id) {
      await db.documents.update(doc.id, { synced: true });
    }
  };

  // Processa a fila automaticamente
  useEffect(() => {
    if (isOnline) {
      processQueue();
    }
  }, [isOnline]);

  return { processQueue, isProcessing, isOnline };
}