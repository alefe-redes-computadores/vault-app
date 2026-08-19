import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import type { Person } from "@/lib/types";

export function usePersons() {
  return useLiveQuery<Person[]>(() => db.persons.toArray()) || [];
}

export function usePerson(id?: string) {
  return useLiveQuery<Person | undefined>(() => {
    if (!id) return undefined;
    return db.persons.get(id);
  }, [id]);
}
