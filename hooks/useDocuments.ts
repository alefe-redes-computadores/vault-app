import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import type { CategoryId } from '@/lib/types';

export function useDocuments(personId?: number, categoryId?: CategoryId) {
  return useLiveQuery(
    () => {
      let query = db.documents.toCollection();
      if (personId) query = query.filter(doc => doc.person_id === personId);
      if (categoryId) query = query.filter(doc => doc.category_id === categoryId);
      return query.reverse().sortBy('created_at');
    },
    [personId, categoryId],
    []
  );
}

export function useFavorites(personId?: number) {
  return useLiveQuery(
    () => {
      let query = db.documents.filter(doc => doc.is_favorite === true);
      if (personId) query = query.filter(doc => doc.person_id === personId);
      return query.reverse().sortBy('created_at');
    },
    [personId],
    []
  );
}

export function useDocument(id?: number) {
  return useLiveQuery(() => (id ? db.documents.get(id) : null), [id], null);
}

export function useDocumentsByType(personId: number, type: string) {
  return useLiveQuery(
    () => db.documents.where({ person_id: personId, type }).toArray(),
    [personId, type],
    []
  );
}