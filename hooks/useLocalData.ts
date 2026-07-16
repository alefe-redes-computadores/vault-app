import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';

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

export function useDocuments(profileId?: number, areaId?: string) {
  return useLiveQuery(
    () => {
      let query = db.documents.toCollection();
      if (profileId) query = query.filter(doc => doc.profileId === profileId);
      if (areaId) query = query.filter(doc => doc.areaId === areaId);
      return query.reverse().sortBy('createdAt');
    },
    [profileId, areaId],
    []
  );
}

export function useFavorites(profileId?: number) {
  return useLiveQuery(
    () => {
      let query = db.documents.filter(doc => doc.isFavorite === true);
      if (profileId) query = query.filter(doc => doc.profileId === profileId);
      return query.reverse().sortBy('createdAt');
    },
    [profileId],
    []
  );
}

export function useProfiles() {
  return useLiveQuery(() => db.profiles.toArray(), [], []);
}

export function useDocument(id?: number) {
  return useLiveQuery(
    () => (id ? db.documents.get(id) : undefined),
    [id],
    undefined
  );
}