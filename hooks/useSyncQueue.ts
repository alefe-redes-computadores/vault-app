import { db } from '@/lib/db';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Document } from '@/lib/types';

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

    const doc = item.payload as Document;

    switch (item.operation) {
      case 'add':
        await supabase.from('documents').insert({
          id: doc.id,
          person_id: doc.person_id,
          category_id: doc.category_id,
          type: doc.type,
          title: doc.title,
          description: doc.description,
          metadata: doc.metadata,
          attachments: doc.attachments,
          is_favorite: doc.is_favorite,
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

  useEffect(() => {
    if (isOnline) {
      processQueue();
    }
  }, [isOnline]);

  return { processQueue, isProcessing, isOnline };
}