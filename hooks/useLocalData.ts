import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import type { CategoryId, Document } from '@/lib/types';

type TableNames = keyof typeof db;

export function useLocalData<T>(
  table: TableNames,
  filter?: (item: T) => boolean,
  deps: any[] = []
) {
  const data = useLiveQuery(
    () => (db[table] as any).toArray() as Promise<T[]>,
    deps,
    []
  );
  return (data || []).filter(filter || (() => true));
}

export function useDocuments(personId?: number, categoryId?: CategoryId) {
  return useLiveQuery(
    () => {
      let query = db.documents.toCollection();
      if (personId) query = query.filter((doc: Document) => doc.person_id === personId);
      if (categoryId) query = query.filter((doc: Document) => doc.category_id === categoryId);
      return query.reverse().sortBy('created_at');
    },
    [personId, categoryId],
    []
  );
}

export function useFavorites(personId?: number) {
  return useLiveQuery(
    () => {
      let query = db.documents.filter((doc: Document) => doc.is_favorite === true);
      if (personId) query = query.filter((doc: Document) => doc.person_id === personId);
      return query.reverse().sortBy('created_at');
    },
    [personId],
    []
  );
}

export function useProfiles() {
  return useLiveQuery(() => db.persons.toArray(), [], []);
}

export function useDocument(id?: number) {
  return useLiveQuery(
    () => (id ? db.documents.get(id) : undefined),
    [id],
    undefined
  );
}

export function useDocumentsByType(personId: number, type: string) {
  return useLiveQuery(
    () => db.documents.where({ person_id: personId, type }).toArray(),
    [personId, type],
    []
  );
}