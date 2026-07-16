import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import type { Person } from '@/lib/types';

export function usePersons() {
  return useLiveQuery(() => db.persons.toArray(), [], []);
}

export function usePerson(id?: number) {
  return useLiveQuery(
    () => (id ? db.persons.get(id) : undefined),
    [id],
    undefined
  );
}

export function usePersonsByUserId(userId: string) {
  return useLiveQuery(
    () => db.persons.where('user_id').equals(userId).toArray(),
    [userId],
    []
  );
}