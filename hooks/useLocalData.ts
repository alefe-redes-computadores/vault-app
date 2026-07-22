"use client";

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

// CORRIGIDO: personId agora é string (UUID)
export function useDocuments(personId?: string, categoryId?: CategoryId) {
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

// CORRIGIDO: personId agora é string (UUID)
export function useFavorites(personId?: string) {
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

// CORRIGIDO: id agora é string (UUID)
export function useDocument(id?: string) {
  return useLiveQuery(
    () => (id ? db.documents.get(id) : undefined),
    [id],
    undefined
  );
}

// CORRIGIDO: personId agora é string (UUID)
export function useDocumentsByType(personId: string, type: string) {
  return useLiveQuery(
    () => db.documents.where({ person_id: personId, type }).toArray(),
    [personId, type],
    []
  );
}